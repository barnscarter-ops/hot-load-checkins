import { NextResponse } from "next/server";

import { extractCheckInFromImages } from "@/lib/ai/extract-check-in";
import {
  WorkflowStageError,
  logWorkflowError,
  logWorkflowEvent,
} from "@/lib/check-ins/errors";
import {
  MAX_IMAGE_COUNT,
  MAX_UPLOAD_TOTAL_BYTES,
} from "@/lib/check-ins/constants";
import {
  createDraftCheckIn,
  getCheckInByExtractRequestId,
  replaceDraftImages,
  updateExtractionResult,
  updateSubmissionArtifacts,
} from "@/lib/check-ins/repository";
import {
  getLowConfidenceFields,
  getMissingRequiredFields,
} from "@/lib/check-ins/schema";
import type { WorkflowFailureStage } from "@/lib/check-ins/types";
import { createSignedBucketUrl, uploadBucketFile } from "@/lib/check-ins/storage";
import { getServerEnv } from "@/lib/env";
import { errorMessage, sanitizeFileName } from "@/lib/utils";

export const runtime = "nodejs";
export const maxDuration = 120;

const EXTRACT_ROUTE = "POST /api/check-ins/extract";

function logExtractEvent(step: string, details: Record<string, unknown> = {}) {
  logWorkflowEvent("Hot Load Check-In extract event", {
    route: EXTRACT_ROUTE,
    step,
    ...details,
  });
}

function createExtractFailureResponse(
  error: unknown,
  fallback: {
    message: string;
    stage: WorkflowFailureStage;
    step: string;
    draftId?: string;
    details?: string;
  },
) {
  if (error instanceof WorkflowStageError) {
    return {
      error: error.message,
      stage: error.stage,
      retryable: error.retryable,
      draftId: error.draftId ?? fallback.draftId,
      checkInId: error.checkInId,
      details: error.details,
      step: fallback.step,
    };
  }

  return {
    error: fallback.message,
    stage: fallback.stage,
    retryable: true,
    draftId: fallback.draftId,
    details: fallback.details ?? errorMessage(error),
    step: fallback.step,
  };
}

async function safeUpdateSubmissionState(
  checkInId: string,
  patch: Parameters<typeof updateSubmissionArtifacts>[1],
  context: Record<string, unknown>,
) {
  try {
    await updateSubmissionArtifacts(checkInId, patch);
  } catch (updateError) {
    logWorkflowError(
      "Hot Load Check-In extract state update failed",
      {
        route: EXTRACT_ROUTE,
        checkInId,
        patch,
        ...context,
      },
      updateError,
    );
  }
}

export async function POST(request: Request) {
  let draftId: string | undefined;
  let extractRequestId = "";

  logExtractEvent("request_received", {
    method: request.method,
  });

  try {
    let env: ReturnType<typeof getServerEnv>;

    try {
      env = getServerEnv();
      logExtractEvent("configuration_check_success", {
        bucket: env.CHECKIN_STORAGE_BUCKET,
        model: env.OPENAI_MODEL,
      });
    } catch (error) {
      logWorkflowError(
        "Hot Load Check-In extract configuration failed",
        {
          route: EXTRACT_ROUTE,
          stage: "configuration",
        },
        error,
      );
      throw new WorkflowStageError({
        message:
          "Upload and extraction are not configured correctly on the server. Fix the Supabase or OpenAI environment values and retry.",
        stage: "configuration",
        retryable: true,
        details: errorMessage(error),
        cause: error,
      });
    }

    let formData: FormData;

    try {
      logExtractEvent("file_parse_start");
      formData = await request.formData();
      logExtractEvent("file_parse_success");
    } catch (error) {
      logWorkflowError(
        "Hot Load Check-In extract multipart parse failed",
        {
          route: EXTRACT_ROUTE,
          stage: "request_validation",
        },
        error,
      );
      throw new WorkflowStageError({
        message:
          "We couldn't read the uploaded files from the request. Please reselect the images and try again.",
        stage: "request_validation",
        retryable: true,
        details: errorMessage(error),
        statusCode: 400,
        cause: error,
      });
    }

    extractRequestId = String(formData.get("extractRequestId") ?? "").trim();
    const files = formData
      .getAll("images")
      .filter((entry): entry is File => entry instanceof File);

    if (!extractRequestId) {
      logExtractEvent("request_validation_failed", {
        reason: "missing_extract_request_id",
      });
      return NextResponse.json(
        {
          error: "Missing extraction request ID.",
          stage: "request_validation",
          retryable: true,
          details:
            "The request did not include extractRequestId, so the draft could not be reused safely.",
          step: "request_validation",
        },
        { status: 400 },
      );
    }

    if (files.length === 0) {
      logExtractEvent("request_validation_failed", {
        extractRequestId,
        reason: "missing_images",
      });
      return NextResponse.json(
        {
          error: "Upload at least one image to start a check-in.",
          stage: "request_validation",
          retryable: true,
          details: "No files were received in the multipart form data.",
          step: "request_validation",
        },
        { status: 400 },
      );
    }

    if (files.length > MAX_IMAGE_COUNT) {
      logExtractEvent("request_validation_failed", {
        extractRequestId,
        fileCount: files.length,
        maxImageCount: MAX_IMAGE_COUNT,
        reason: "too_many_images",
      });
      return NextResponse.json(
        {
          error: `Upload ${MAX_IMAGE_COUNT} images or fewer per check-in.`,
          stage: "request_validation",
          retryable: true,
          details: `The request included ${files.length} images.`,
          step: "request_validation",
        },
        { status: 400 },
      );
    }

    const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
    if (totalBytes > MAX_UPLOAD_TOTAL_BYTES) {
      logExtractEvent("request_validation_failed", {
        extractRequestId,
        fileCount: files.length,
        totalBytes,
        maxTotalBytes: MAX_UPLOAD_TOTAL_BYTES,
        reason: "total_upload_size_exceeded",
      });
      return NextResponse.json(
        {
          error: "Upload payload is too large. Retake lower-resolution photos or choose fewer images.",
          stage: "request_validation",
          retryable: true,
          details: `Upload total was ${totalBytes} bytes and exceeds the ${MAX_UPLOAD_TOTAL_BYTES} byte limit.`,
          step: "request_validation",
        },
        { status: 400 },
      );
    }

    logExtractEvent("request_validation_success", {
      extractRequestId,
      fileCount: files.length,
      bucket: env.CHECKIN_STORAGE_BUCKET,
    });

    const draft = await (async () => {
      try {
        logExtractEvent("draft_insert_start", {
          extractRequestId,
        });
        const existingDraft = await getCheckInByExtractRequestId(extractRequestId);

        if (existingDraft) {
          logExtractEvent("draft_insert_success", {
            extractRequestId,
            draftId: existingDraft.id,
            reused: true,
          });
          return existingDraft;
        }

        const createdDraft = await createDraftCheckIn({
          extractRequestId,
        });

        logExtractEvent("draft_insert_success", {
          extractRequestId,
          draftId: createdDraft.id,
          reused: false,
        });

        return createdDraft;
      } catch (error) {
        logWorkflowError(
          "Hot Load Check-In draft load/create failed",
          {
            route: EXTRACT_ROUTE,
            stage: "draft_insert",
            extractRequestId,
          },
          error,
        );
        throw new WorkflowStageError({
          message:
            "We couldn't create the draft check-in in Supabase. Verify the database connection and service-role access, then retry.",
          stage: "draft_insert",
          retryable: true,
          details: errorMessage(error),
          cause: error,
        });
      }
    })();

    draftId = draft.id;

    await safeUpdateSubmissionState(
      draft.id,
      {
        uploadStatus: "processing",
        uploadError: null,
        extractionStatus: "idle",
        extractionError: null,
        reviewStatus: "idle",
        submissionStatus: "idle",
        exportStatus: "idle",
        errorMessage: null,
        submissionError: null,
      },
      {
        stage: "draft_insert",
        extractRequestId,
      },
    );

    let preparedFiles: Array<{
      buffer: Buffer;
      fileName: string;
      mimeType: string;
      sizeBytes: number;
      storagePath: string;
    }>;

    try {
      logExtractEvent("storage_upload_start", {
        draftId: draft.id,
        extractRequestId,
        fileCount: files.length,
        bucket: env.CHECKIN_STORAGE_BUCKET,
      });

      preparedFiles = await Promise.all(
        files.map(async (file, index) => {
          const fileName = sanitizeFileName(file.name || `capture-${index + 1}.jpg`);
          const storagePath = `check-ins/${draft.id}/source/${Date.now()}-${index + 1}-${fileName}`;

          logExtractEvent("storage_upload_file_start", {
            draftId: draft.id,
            extractRequestId,
            fileIndex: index + 1,
            fileName,
            sizeBytes: file.size,
          });

          const buffer = Buffer.from(await file.arrayBuffer());

          await uploadBucketFile(storagePath, buffer, file.type || "image/jpeg");

          logExtractEvent("storage_upload_file_success", {
            draftId: draft.id,
            extractRequestId,
            fileIndex: index + 1,
            fileName,
            storagePath,
          });

          return {
            buffer,
            fileName,
            mimeType: file.type || "image/jpeg",
            sizeBytes: file.size,
            storagePath,
          };
        }),
      );

      await replaceDraftImages(
        draft.id,
        preparedFiles.map((file) => ({
          storagePath: file.storagePath,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.sizeBytes,
        })),
      );

      logExtractEvent("storage_upload_success", {
        draftId: draft.id,
        extractRequestId,
        fileCount: preparedFiles.length,
      });

      await safeUpdateSubmissionState(
        draft.id,
        {
          uploadStatus: "succeeded",
          uploadError: null,
          extractionStatus: "processing",
          extractionError: null,
          reviewStatus: "idle",
          errorMessage: null,
          submissionError: null,
        },
        {
          stage: "image_upload",
          extractRequestId,
        },
      );
    } catch (error) {
      logWorkflowError(
        "Hot Load Check-In storage upload failed",
        {
          route: EXTRACT_ROUTE,
          stage: "image_upload",
          draftId: draft.id,
          extractRequestId,
          bucket: env.CHECKIN_STORAGE_BUCKET,
        },
        error,
      );

      await safeUpdateSubmissionState(
        draft.id,
        {
          uploadStatus: "failed",
          uploadError: errorMessage(error),
          extractionStatus: "idle",
          extractionError: null,
          errorMessage: errorMessage(error),
          submissionError: errorMessage(error),
        },
        {
          stage: "image_upload",
          extractRequestId,
        },
      );

      throw new WorkflowStageError({
        message:
          "We couldn't upload the images to Supabase Storage. Check the bucket name, service-role access, and connection, then retry.",
        stage: "image_upload",
        retryable: true,
        draftId: draft.id,
        checkInId: draft.id,
        details: errorMessage(error),
        cause: error,
      });
    }

    const extraction = await (async () => {
      try {
        const signedImageUrls = await Promise.all(
          preparedFiles.map((file) => createSignedBucketUrl(file.storagePath)),
        );

        logExtractEvent("openai_call_start", {
          draftId: draft.id,
          extractRequestId,
          imageCount: preparedFiles.length,
          model: env.OPENAI_MODEL,
        });

        const result = await extractCheckInFromImages(
          signedImageUrls.map((url) => ({ url })),
        );

        logExtractEvent("openai_call_success", {
          draftId: draft.id,
          extractRequestId,
          model: result.aiModel,
        });

        return result;
      } catch (error) {
        logWorkflowError(
          "Hot Load Check-In OpenAI extraction failed",
          {
            route: EXTRACT_ROUTE,
            stage: "extraction",
            draftId: draft.id,
            extractRequestId,
            model: env.OPENAI_MODEL,
          },
          error,
        );

        await safeUpdateSubmissionState(
          draft.id,
          {
            extractionStatus: "failed",
            extractionError: errorMessage(error),
            errorMessage: errorMessage(error),
            submissionError: errorMessage(error),
          },
          {
            stage: "extraction",
            extractRequestId,
          },
        );

        throw new WorkflowStageError({
          message:
            "The images uploaded, but OpenAI could not finish the extraction. Retry extraction after checking the OpenAI API key, model, and request limits.",
          stage: "extraction",
          retryable: true,
          draftId: draft.id,
          checkInId: draft.id,
          details: errorMessage(error),
          cause: error,
        });
      }
    })();

    try {
      logExtractEvent("final_update_start", {
        draftId: draft.id,
        extractRequestId,
      });

      const checkIn = await updateExtractionResult({
        checkInId: draft.id,
        fields: extraction.fields,
        confidenceByField: extraction.confidenceByField,
        confidenceReasons: extraction.confidenceReasons,
        rawAiResponse: extraction.rawAiResponse,
        aiModel: extraction.aiModel,
      });

      const missingRequired = getMissingRequiredFields(checkIn.fields);
      const lowConfidenceFields = getLowConfidenceFields(checkIn.confidenceByField);

      logExtractEvent("final_update_success", {
        draftId: draft.id,
        extractRequestId,
        missingRequiredCount: missingRequired.length,
        lowConfidenceCount: lowConfidenceFields.length,
      });

      return NextResponse.json({
        checkIn,
        missingRequired,
        lowConfidenceFields,
      });
    } catch (error) {
      logWorkflowError(
        "Hot Load Check-In final extraction save failed",
        {
          route: EXTRACT_ROUTE,
          stage: "final_update",
          draftId: draft.id,
          extractRequestId,
        },
        error,
      );

      await safeUpdateSubmissionState(
        draft.id,
        {
          extractionStatus: "failed",
          extractionError: errorMessage(error),
          errorMessage: errorMessage(error),
          submissionError: errorMessage(error),
        },
        {
          stage: "final_update",
          extractRequestId,
        },
      );

      throw new WorkflowStageError({
        message:
          "AI extraction finished, but saving the extracted values back to Supabase failed. The draft and images were kept, so you can retry safely.",
        stage: "final_update",
        retryable: true,
        draftId: draft.id,
        checkInId: draft.id,
        details: errorMessage(error),
        cause: error,
      });
    }
  } catch (error) {
    const failure = createExtractFailureResponse(error, {
      message: "We couldn't process the upload right now. Please try again.",
      stage: draftId ? "image_upload" : "draft_insert",
      draftId,
      details: errorMessage(error),
      step: "unexpected_failure",
    });

    logWorkflowError(
      "Hot Load Check-In extract request failed",
      {
        route: EXTRACT_ROUTE,
        stage: failure.stage,
        step: failure.step,
        draftId: failure.draftId,
        checkInId: failure.checkInId,
        extractRequestId,
      },
      error,
    );

    return NextResponse.json(failure, {
      status: error instanceof WorkflowStageError ? error.statusCode : 500,
    });
  }
}
