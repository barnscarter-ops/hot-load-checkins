"use client";

import { useEffect, useId, useMemo, useState } from "react";

import {
  APP_NAME,
  BLANK_CHECK_IN_FIELDS,
  CHECK_IN_FIELD_ORDER,
  MASTER_EXPORT_ROUTE,
} from "@/lib/check-ins/constants";
import {
  getCheckInFieldErrors,
  getLowConfidenceFields,
  getMissingRequiredFields,
} from "@/lib/check-ins/schema";
import { normalizeTimeInput } from "@/lib/date-time";
import type {
  CheckInFieldErrors,
  CheckInFieldKey,
  CheckInFields,
  CheckInRecord,
  ExtractResponsePayload,
  SubmitResponsePayload,
  SubmitValidationErrorResponse,
  WorkflowFailureResponse,
  WorkflowFailureStage,
} from "@/lib/check-ins/types";
import { errorMessage } from "@/lib/utils";

import { ImagePicker } from "@/components/check-in/image-picker";
import { ReviewForm } from "@/components/check-in/review-form";
import { SummaryCard } from "@/components/check-in/summary-card";

interface ExtractErrorState {
  title: string;
  message: string;
  details?: string;
}

interface SubmitErrorState {
  title: string;
  message: string;
  details?: string;
}

function getExtractSuccessMessage(payload: ExtractResponsePayload | null) {
  if (!payload) {
    return null;
  }

  const missingCount = payload.missingRequired.length;
  const lowConfidenceCount = payload.lowConfidenceFields.length;

  if (missingCount > 0) {
    return `${missingCount} required field${missingCount === 1 ? "" : "s"} still need confirmation before submit.`;
  }

  if (lowConfidenceCount > 0) {
    return `${lowConfidenceCount} field${lowConfidenceCount === 1 ? "" : "s"} came back low-confidence and should be verified.`;
  }

  return "Draft saved to Supabase and ready for final review.";
}

function getExtractActionLabel(stage: WorkflowFailureStage | null, hasFiles: boolean) {
  if (!hasFiles) {
    return "Run AI Extraction";
  }

  if (
    stage === "configuration" ||
    stage === "request_validation" ||
    stage === "draft_insert" ||
    stage === "image_upload" ||
    stage === "final_update"
  ) {
    return "Retry Upload & Extract";
  }

  if (stage === "extraction") {
    return "Retry Extraction";
  }

  return "Run / Refresh AI Extraction";
}

function getExtractFailureTitle(
  stage: WorkflowFailureStage | null,
  details?: string,
) {
  if (details?.includes("Database schema is out of date")) {
    return "Database schema update required";
  }

  switch (stage) {
    case "configuration":
      return "Server configuration issue";
    case "request_validation":
      return "Upload request issue";
    case "draft_insert":
      return "Draft save failed";
    case "image_upload":
      return "Image upload failed";
    case "extraction":
      return "AI extraction failed";
    case "final_update":
      return "Saving extracted data failed";
    default:
      return "Upload and extraction failed";
  }
}

function getSubmitFailureTitle(
  stage: WorkflowFailureStage | null,
  details?: string,
) {
  if (details?.includes("Database schema is out of date")) {
    return "Database schema update required";
  }

  switch (stage) {
    case "submission":
      return "Submission already running";
    case "excel_generation":
      return "Export step failed";
    case "email_send":
      return "Email step failed";
    default:
      return "Submit failed";
  }
}

function buildDraftPayload(checkIn: CheckInRecord): ExtractResponsePayload {
  return {
    checkIn,
    missingRequired: getMissingRequiredFields(checkIn.fields),
    lowConfidenceFields: getLowConfidenceFields(checkIn.confidenceByField),
  };
}

export function HotLoadCheckInApp() {
  const imageUploadInputId = useId();
  const imageCameraInputId = useId();
  const [files, setFiles] = useState<File[]>([]);
  const [extractRequestId, setExtractRequestId] = useState(() => crypto.randomUUID());
  const [extractError, setExtractError] = useState<ExtractErrorState | null>(null);
  const [extractFailureStage, setExtractFailureStage] =
    useState<WorkflowFailureStage | null>(null);
  const [submitError, setSubmitError] = useState<SubmitErrorState | null>(null);
  const [submitFailureStage, setSubmitFailureStage] =
    useState<WorkflowFailureStage | null>(null);
  const [masterExportError, setMasterExportError] = useState<string | null>(null);
  const [exportingMaster, setExportingMaster] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [draft, setDraft] = useState<ExtractResponsePayload | null>(null);
  const [submitResult, setSubmitResult] = useState<SubmitResponsePayload | null>(null);
  const [fields, setFields] = useState<CheckInFields>(BLANK_CHECK_IN_FIELDS);
  const [reviewBaselineFields, setReviewBaselineFields] =
    useState<CheckInFields>(BLANK_CHECK_IN_FIELDS);
  const [submitFieldErrors, setSubmitFieldErrors] = useState<CheckInFieldErrors>({});

  const previews = useMemo(() => files.map((file) => URL.createObjectURL(file)), [files]);

  useEffect(() => {
    return () => {
      previews.forEach((preview) => URL.revokeObjectURL(preview));
    };
  }, [previews]);

  const missingRequired = useMemo(() => getMissingRequiredFields(fields), [fields]);
  const clientFieldErrors = useMemo(() => getCheckInFieldErrors(fields), [fields]);
  const fieldErrors = useMemo(
    () => ({
      ...submitFieldErrors,
      ...clientFieldErrors,
    }),
    [clientFieldErrors, submitFieldErrors],
  );
  const manuallyEditedFields = useMemo(
    () =>
      draft
        ? CHECK_IN_FIELD_ORDER.filter(
            (fieldKey) => fields[fieldKey].trim() !== reviewBaselineFields[fieldKey].trim(),
          )
        : [],
    [draft, fields, reviewBaselineFields],
  );

  function syncDraftCheckIn(checkIn: CheckInRecord) {
    setDraft(buildDraftPayload(checkIn));
  }

  async function handleExtract() {
    if (files.length === 0) {
      setExtractError({
        title: "No images selected",
        message: "Select at least one image before running extraction.",
      });
      setExtractFailureStage(null);
      return;
    }

    setExtractError(null);
    setExtractFailureStage(null);
    setSubmitError(null);
    setSubmitFailureStage(null);
    setSubmitFieldErrors({});
    setSubmitResult(null);
    setExtracting(true);

    try {
      const formData = new FormData();
      formData.append("extractRequestId", extractRequestId);
      files.forEach((file) => formData.append("images", file));

      const response = await fetch("/api/check-ins/extract", {
        method: "POST",
        body: formData,
      });

      const payload = (await response.json()) as
        | ExtractResponsePayload
        | WorkflowFailureResponse
        | { error?: string };

      if (!response.ok) {
        const failureStage = "stage" in payload ? payload.stage : null;
        const failureDetails = "details" in payload ? payload.details : undefined;
        setExtractFailureStage(failureStage);
        setExtractError({
          title: getExtractFailureTitle(failureStage, failureDetails),
          message:
            "error" in payload && payload.error
              ? payload.error
              : "Extraction failed. Please try again.",
          details: failureDetails,
        });
        return;
      }

      const successPayload = payload as ExtractResponsePayload;
      setDraft(successPayload);
      setFields(successPayload.checkIn.fields);
      setReviewBaselineFields(successPayload.checkIn.fields);
      setSubmitFieldErrors({});
      setExtractFailureStage(null);
      setExtractError(null);
    } catch (error) {
      setExtractError({
        title: "Upload request failed",
        message: "The browser could not reach the extract API.",
        details: errorMessage(error),
      });
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!draft || submitting) {
      return;
    }

    setSubmitError(null);
    setSubmitFailureStage(null);
    setSubmitFieldErrors({});
    setSubmitting(true);

    if (Object.keys(clientFieldErrors).length > 0) {
      setSubmitFieldErrors(clientFieldErrors);
      setSubmitError({
        title: "Review required fields",
        message: "Fix the highlighted field errors before submitting.",
      });
      setSubmitting(false);
      return;
    }

    try {
      const response = await fetch("/api/check-ins/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInId: draft.checkIn.id,
          fields,
          manuallyEditedFields,
        }),
      });

      const payload = (await response.json()) as
        | SubmitResponsePayload
        | (SubmitValidationErrorResponse & { fieldErrors: CheckInFieldErrors })
        | WorkflowFailureResponse
        | { error?: string };

      if (!response.ok) {
        const fieldErrorsFromApi =
          "fieldErrors" in payload && payload.fieldErrors ? payload.fieldErrors : {};
        const errorFromApi = "error" in payload ? payload.error : undefined;
        const errorDetails = "details" in payload ? payload.details : undefined;
        const failureStage = "stage" in payload ? payload.stage : null;
        const latestCheckIn = "checkIn" in payload ? payload.checkIn : undefined;

        if (Object.keys(fieldErrorsFromApi).length > 0) {
          setSubmitFieldErrors(fieldErrorsFromApi);
        }

        if (latestCheckIn) {
          syncDraftCheckIn(latestCheckIn);
        }

        setSubmitFailureStage(failureStage);
        setSubmitError({
          title: getSubmitFailureTitle(failureStage, errorDetails),
          message: errorFromApi || "Submission failed.",
          details: errorDetails,
        });
        return;
      }

      const successPayload = payload as SubmitResponsePayload;
      syncDraftCheckIn(successPayload.checkIn);
      setSubmitFieldErrors({});
      setSubmitFailureStage(null);
      setSubmitError(null);
      setSubmitResult(successPayload);
    } catch (error) {
      setSubmitError({
        title: "Submit request failed",
        message: "The browser could not reach the submit API.",
        details: errorMessage(error),
      });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDownloadMasterExport() {
    setMasterExportError(null);
    setExportingMaster(true);

    try {
      const response = await fetch(MASTER_EXPORT_ROUTE);
      if (!response.ok) {
        const payload = (await response.json()) as WorkflowFailureResponse | { error?: string };
        throw new Error(
          "error" in payload && payload.error
            ? payload.error
            : "Master export failed. Please try again.",
        );
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "hot-load-check-in-master.xlsx";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setMasterExportError(errorMessage(error));
    } finally {
      setExportingMaster(false);
    }
  }

  function handleFieldChange(fieldKey: CheckInFieldKey, value: string) {
    const normalizedValue =
      fieldKey === "arrivalTime" || fieldKey === "departureTime"
        ? normalizeTimeInput(value)
        : value;

    setFields((current) => ({
      ...current,
      [fieldKey]: normalizedValue,
    }));
    setSubmitFieldErrors((current) => {
      if (!current[fieldKey]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[fieldKey];
      return nextErrors;
    });
  }

  function resetFlow() {
    setFiles([]);
    setExtractRequestId(crypto.randomUUID());
    setDraft(null);
    setFields(BLANK_CHECK_IN_FIELDS);
    setReviewBaselineFields(BLANK_CHECK_IN_FIELDS);
    setExtractError(null);
    setExtractFailureStage(null);
    setSubmitError(null);
    setSubmitFailureStage(null);
    setMasterExportError(null);
    setSubmitFieldErrors({});
    setSubmitResult(null);
  }

  const rightPanel = submitResult ? (
    <div className="space-y-6">
      <SummaryCard
        eyebrow="Step 3"
        title="Submission complete"
        items={[
          { label: "Submission", value: submitResult.checkIn.submissionStatus },
          { label: "Review", value: submitResult.checkIn.reviewStatus },
          { label: "Export", value: submitResult.checkIn.exportStatus },
          { label: "Email", value: submitResult.checkIn.emailStatus },
        ]}
      />

      <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
          Master Export
        </p>
        <h3 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
          Download the latest DB-backed log
        </h3>
        <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
          This export is generated fresh from submitted Postgres records each time you
          request it.
        </p>

        {masterExportError ? (
          <div className="mt-4 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger)]">
            {masterExportError}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleDownloadMasterExport}
          disabled={exportingMaster}
          className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--ink-strong)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {exportingMaster ? "Building Master Export..." : "Download Master Export"}
        </button>
      </section>
    </div>
  ) : draft ? (
    <ReviewForm
      checkIn={draft.checkIn}
      fields={fields}
      confidenceByField={draft.checkIn.confidenceByField}
      confidenceReasons={draft.checkIn.confidenceReasons}
      fieldErrors={fieldErrors}
      missingRequired={missingRequired}
      manuallyEditedFields={manuallyEditedFields}
      isSubmitting={submitting}
      imageInputId={imageUploadInputId}
      submitFailureStage={
        submitFailureStage === "excel_generation" ||
        submitFailureStage === "email_send" ||
        submitFailureStage === "submission"
          ? submitFailureStage
          : null
      }
      submitError={submitError}
      onChange={handleFieldChange}
      onSubmit={handleSubmit}
    />
  ) : (
    <SummaryCard
      eyebrow="Workflow"
      title={APP_NAME}
      items={[
        { label: "1", value: "Capture one or more truck paperwork images." },
        { label: "2", value: "AI extracts structured values and confidence scores." },
        { label: "3", value: "Matt reviews required fields and fixes anything flagged." },
        {
          label: "4",
          value:
            "Submit saves the approved record first, then runs export and email safely.",
        },
      ]}
    />
  );

  return (
    <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
      <div className="space-y-6">
        <ImagePicker
          cameraInputId={imageCameraInputId}
          uploadInputId={imageUploadInputId}
          previews={previews}
          disabled={extracting || submitting}
          isExtracting={extracting}
          error={extractError}
          actionLabel={getExtractActionLabel(extractFailureStage, files.length > 0)}
          onFilesSelected={setFiles}
          onExtract={handleExtract}
        />

        {draft && !extractError && !submitResult ? (
          <section className="rounded-[1.6rem] border border-[color:var(--success)]/25 bg-[color:var(--success-bg)] px-4 py-4 text-sm text-[color:var(--success)] shadow-[0_16px_38px_rgba(12,28,45,0.1)]">
            <p className="font-semibold">Extraction complete</p>
            <p className="mt-1 leading-6">{getExtractSuccessMessage(draft)}</p>
            <p className="mt-2 text-xs leading-5 text-[color:var(--success)]/85">
              Draft ID: {draft.checkIn.id}
            </p>
          </section>
        ) : null}

        {(draft || submitResult) && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={resetFlow}
              className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            >
              Start New Check-In
            </button>
            {draft ? (
              <span className="rounded-full bg-[color:var(--panel-soft)] px-4 py-2 text-sm font-medium text-[color:var(--muted)]">
                Check-In ID: {draft.checkIn.id}
              </span>
            ) : null}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {rightPanel}

        <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Failure Safety
          </p>
          <ul className="mt-4 space-y-3 text-sm leading-6 text-[color:var(--muted)]">
            <li>The approved check-in is saved in Postgres before export and email side effects run.</li>
            <li>Manual edits are tracked so Matt can see what changed from AI extraction.</li>
            <li>Submit retries reuse the same record and only rerun the downstream step that failed.</li>
            <li>Master export is still generated on demand from Postgres, not from a shared workbook file.</li>
          </ul>
        </section>
      </div>
    </div>
  );
}
