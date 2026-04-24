import path from "node:path";

import { MASTER_EXPORT_ROUTE, XLSX_MIME_TYPE } from "@/lib/check-ins/constants";
import {
  WorkflowStageError,
  logWorkflowError,
  logWorkflowEvent,
} from "@/lib/check-ins/errors";
import {
  beginSubmissionAttempt,
  finalizeSubmission,
  getCheckInById,
  updateSubmissionArtifacts,
} from "@/lib/check-ins/repository";
import { downloadBucketFile, uploadBucketFile } from "@/lib/check-ins/storage";
import type {
  CheckInFieldKey,
  CheckInFields,
  SubmitResponsePayload,
} from "@/lib/check-ins/types";
import {
  buildSingleCheckInWorkbook,
  buildTruckWorkbookPath,
} from "@/lib/excel/check-in-workbooks";
import {
  sendCheckInEmail,
  type EmailAttachment,
} from "@/lib/email/send-check-in-email";
import { errorMessage } from "@/lib/utils";

function buildSubmitResult(checkIn: NonNullable<Awaited<ReturnType<typeof getCheckInById>>>): SubmitResponsePayload {
  return {
    checkInId: checkIn.id,
    status: checkIn.status,
    excelFilePath: checkIn.excelFilePath,
    masterLogPath: checkIn.masterLogPath ?? MASTER_EXPORT_ROUTE,
    emailSentAt: checkIn.emailSentAt,
    checkIn,
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
      "Hot Load Check-In submit state update failed",
      {
        checkInId,
        patch,
        ...context,
      },
      updateError,
    );
  }
}

export async function submitCheckIn(
  checkInId: string,
  fields: CheckInFields,
  manuallyEditedFields: CheckInFieldKey[],
): Promise<SubmitResponsePayload> {
  const existing = await getCheckInById(checkInId);

  if (!existing) {
    throw new Error("Check-in draft not found.");
  }

  if (existing.images.length === 0) {
    throw new Error("At least one image must be attached before submission.");
  }

  if (
    existing.status === "submitted" &&
    existing.submissionStatus === "succeeded" &&
    existing.exportStatus === "succeeded" &&
    existing.emailStatus === "succeeded"
  ) {
    return buildSubmitResult(existing);
  }

  if (existing.submissionStatus === "processing") {
    throw new WorkflowStageError({
      message:
        "This check-in is already being submitted. Wait for the current attempt to finish before retrying.",
      stage: "submission",
      retryable: true,
      checkInId,
      statusCode: 409,
    });
  }

  const submittedAt = existing.submittedAt ?? new Date().toISOString();
  const approvedRecord = await beginSubmissionAttempt({
    checkInId,
    fields,
    manuallyEditedFields,
    submittedAt,
  });

  if (!approvedRecord) {
    throw new WorkflowStageError({
      message:
        "Another submit attempt is already processing this check-in. Wait a moment, then refresh or retry if needed.",
      stage: "submission",
      retryable: true,
      checkInId,
      statusCode: 409,
    });
  }

  logWorkflowEvent("Hot Load Check-In submit event", {
    checkInId,
    step: "submission_started",
    manuallyEditedCount: manuallyEditedFields.length,
  });

  const workbookPath =
    approvedRecord.excelFilePath ?? buildTruckWorkbookPath(checkInId, fields);
  let workbookBuffer = await (async () => {
    if (approvedRecord.exportStatus !== "succeeded" || !approvedRecord.excelFilePath) {
      return null;
    }

    try {
      const existingWorkbook = await downloadBucketFile(approvedRecord.excelFilePath, {
        allowMissing: true,
      });

      if (existingWorkbook) {
        logWorkflowEvent("Hot Load Check-In submit event", {
          checkInId,
          step: "export_reused",
          workbookPath: approvedRecord.excelFilePath,
        });
      }

      return existingWorkbook;
    } catch (error) {
      logWorkflowError(
        "Failed to reuse existing check-in export during submit retry",
        { checkInId, workbookPath: approvedRecord.excelFilePath, stage: "excel_generation" },
        error,
      );
      return null;
    }
  })();

  if (!workbookBuffer) {
    await safeUpdateSubmissionState(
      checkInId,
      {
        submissionStatus: "processing",
        exportStatus: "processing",
        excelStatus: "processing",
        excelError: null,
        errorMessage: null,
        submissionError: null,
      },
      {
        stage: "excel_generation",
      },
    );

    try {
      workbookBuffer = await buildSingleCheckInWorkbook({
        fields,
        submittedAt: approvedRecord.submittedAt,
        reviewStatus: approvedRecord.reviewStatus,
        manuallyEditedFields,
        exportGeneratedAt: new Date().toISOString(),
      });
      await uploadBucketFile(workbookPath, workbookBuffer, XLSX_MIME_TYPE);

      await updateSubmissionArtifacts(checkInId, {
        exportStatus: "succeeded",
        excelStatus: "succeeded",
        excelError: null,
        excelFilePath: workbookPath,
        masterLogPath: MASTER_EXPORT_ROUTE,
        errorMessage: null,
        submissionError: null,
      });

      logWorkflowEvent("Hot Load Check-In submit event", {
        checkInId,
        step: "export_succeeded",
        workbookPath,
      });
    } catch (error) {
      const failureMessage = errorMessage(error);
      await safeUpdateSubmissionState(
        checkInId,
        {
          submissionStatus: "failed",
          exportStatus: "failed",
          excelStatus: "failed",
          excelError: failureMessage,
          errorMessage: failureMessage,
          submissionError: failureMessage,
        },
        {
          stage: "excel_generation",
        },
      );

      logWorkflowError(
        "Excel generation failed for check-in submission",
        { checkInId, workbookPath, stage: "excel_generation" },
        error,
      );
      throw new WorkflowStageError({
        message:
          "The check-in was approved and saved, but the per-truck Excel export failed. Retry submit to rerun the export step.",
        stage: "excel_generation",
        retryable: true,
        checkInId,
        details: failureMessage,
        cause: error,
      });
    }
  }

  if (!approvedRecord.emailSentAt) {
    await safeUpdateSubmissionState(
      checkInId,
      {
        submissionStatus: "processing",
        emailStatus: "processing",
        emailError: null,
        errorMessage: null,
        submissionError: null,
      },
      {
        stage: "email_send",
      },
    );

    try {
      const attachments: EmailAttachment[] = [
        {
          filename: path.basename(workbookPath),
          content: workbookBuffer,
          contentType: XLSX_MIME_TYPE,
        },
      ];

      for (const image of approvedRecord.images) {
        const buffer = await downloadBucketFile(image.storagePath);

        if (!buffer) {
          throw new Error(`Image attachment missing in storage: ${image.fileName}`);
        }

        attachments.push({
          filename: image.fileName,
          content: buffer,
          contentType: image.mimeType,
        });
      }

      const emailResult = await sendCheckInEmail({
        fields,
        attachments,
      });

      await updateSubmissionArtifacts(checkInId, {
        emailStatus: "succeeded",
        emailError: null,
        emailProvider: emailResult.provider,
        emailSentAt: new Date().toISOString(),
        errorMessage: null,
        submissionError: null,
      });

      logWorkflowEvent("Hot Load Check-In submit event", {
        checkInId,
        step: "email_succeeded",
        provider: emailResult.provider,
      });
    } catch (error) {
      const failureMessage = errorMessage(error);
      await safeUpdateSubmissionState(
        checkInId,
        {
          submissionStatus: "failed",
          emailStatus: "failed",
          emailError: failureMessage,
          errorMessage: failureMessage,
          submissionError: failureMessage,
        },
        {
          stage: "email_send",
        },
      );

      logWorkflowError(
        "Email send failed for check-in submission",
        { checkInId, stage: "email_send" },
        error,
      );
      throw new WorkflowStageError({
        message:
          "The check-in was approved and the export was saved, but the email could not be sent. Retry submit to rerun only the email step.",
        stage: "email_send",
        retryable: true,
        checkInId,
        details: failureMessage,
        cause: error,
      });
    }
  }

  await finalizeSubmission(checkInId);

  const completed = await getCheckInById(checkInId);

  if (!completed) {
    throw new Error("Submitted check-in could not be reloaded.");
  }

  return buildSubmitResult(completed);
}
