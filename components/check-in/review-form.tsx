"use client";

import {
  CHECK_IN_FIELD_ORDER,
  FIELD_LABELS,
  FIELD_SECTIONS,
  LOW_CONFIDENCE_THRESHOLD,
} from "@/lib/check-ins/constants";
import type {
  CheckInFieldErrors,
  CheckInFieldKey,
  CheckInFields,
  CheckInRecord,
  ConfidenceMap,
  ConfidenceReasonMap,
} from "@/lib/check-ins/types";

import { FieldRow } from "@/components/check-in/field-row";

interface ReviewFormProps {
  checkIn: CheckInRecord;
  fields: CheckInFields;
  confidenceByField: ConfidenceMap;
  confidenceReasons: ConfidenceReasonMap;
  fieldErrors: CheckInFieldErrors;
  missingRequired: CheckInFieldKey[];
  manuallyEditedFields: CheckInFieldKey[];
  isSubmitting: boolean;
  imageInputId: string;
  submitFailureStage?: "submission" | "excel_generation" | "email_send" | null;
  submitError?:
    | {
        title: string;
        message: string;
        details?: string;
      }
    | null;
  onChange: (fieldKey: CheckInFieldKey, value: string) => void;
  onSubmit: () => void;
}

function getStatusTone(status: string) {
  switch (status) {
    case "succeeded":
    case "reviewed":
    case "ready":
      return "border-[color:var(--success)]/20 bg-[color:var(--success-bg)] text-[color:var(--success)]";
    case "processing":
      return "border-[color:var(--warn-border)] bg-[color:var(--warn-bg)] text-[color:var(--warn)]";
    case "failed":
      return "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-[color:var(--danger)]";
    default:
      return "border-[color:var(--border)] bg-white text-[color:var(--muted)]";
  }
}

function getOperatorStatusMessage(args: {
  fieldErrorCount: number;
  lowConfidenceCount: number;
  submitFailureStage?: "submission" | "excel_generation" | "email_send" | null;
  manualEditCount: number;
}) {
  if (args.fieldErrorCount > 0) {
    return {
      tone: "danger",
      title: "Review still needs attention",
      message:
        "Fix the red required-field errors first, then verify any amber low-confidence fields before submit.",
    } as const;
  }

  if (args.submitFailureStage === "excel_generation") {
    return {
      tone: "warning",
      title: "Approved record saved. Export still needs retry.",
      message:
        "Postgres already has the approved submission. Retry the export step to rebuild the per-truck workbook.",
    } as const;
  }

  if (args.submitFailureStage === "email_send") {
    return {
      tone: "warning",
      title: "Approved record and export saved. Email still needs retry.",
      message:
        "Retry the email step to resend the operator email with the workbook and source images.",
    } as const;
  }

  if (args.submitFailureStage === "submission") {
    return {
      tone: "warning",
      title: "Submit already in progress",
      message:
        "Another request is already processing this check-in. Wait for it to finish before retrying.",
    } as const;
  }

  if (args.lowConfidenceCount > 0) {
    return {
      tone: "warning",
      title: "Review ready with verification flags",
      message:
        "Required fields are valid. Double-check the amber low-confidence fields, then submit when they look right.",
    } as const;
  }

  if (args.manualEditCount > 0) {
    return {
      tone: "success",
      title: "Review ready for submit",
      message:
        "All required fields are valid, and your manual corrections are tracked on the approved record.",
    } as const;
  }

  return {
    tone: "success",
    title: "Review ready for submit",
    message:
      "All required fields are valid. Submit will save the approved record first, then run export and email.",
  } as const;
}

export function ReviewForm({
  checkIn,
  fields,
  confidenceByField,
  confidenceReasons,
  fieldErrors,
  missingRequired,
  manuallyEditedFields,
  isSubmitting,
  imageInputId,
  submitFailureStage,
  submitError,
  onChange,
  onSubmit,
}: ReviewFormProps) {
  const lowConfidenceFields = CHECK_IN_FIELD_ORDER.filter(
    (fieldKey) =>
      confidenceByField[fieldKey] < LOW_CONFIDENCE_THRESHOLD && !fieldErrors[fieldKey],
  );
  const fieldErrorCount = Object.keys(fieldErrors).length;
  const lowConfidenceCount = lowConfidenceFields.length;
  const manualEditCount = manuallyEditedFields.length;
  const attentionFieldKeys = [
    ...CHECK_IN_FIELD_ORDER.filter((fieldKey) => fieldErrors[fieldKey]),
    ...lowConfidenceFields,
  ];
  const firstErrorFieldKey = CHECK_IN_FIELD_ORDER.find((fieldKey) => fieldErrors[fieldKey]);
  const reviewReady = fieldErrorCount === 0;
  const statusMessage = getOperatorStatusMessage({
    fieldErrorCount,
    lowConfidenceCount,
    submitFailureStage,
    manualEditCount,
  });
  const statusMessageClassName =
    statusMessage.tone === "danger"
      ? "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] text-[color:var(--danger)]"
      : statusMessage.tone === "warning"
        ? "border-[color:var(--warn-border)] bg-[color:var(--warn-bg)] text-[color:var(--warn)]"
        : "border-[color:var(--success)]/25 bg-[color:var(--success-bg)] text-[color:var(--success)]";

  function scrollToField(fieldKey: CheckInFieldKey) {
    const element = document.getElementById(`field-${fieldKey}`);
    if (!element) {
      return;
    }

    element.scrollIntoView({ behavior: "smooth", block: "center" });
    const input = element.querySelector("input, textarea") as
      | HTMLInputElement
      | HTMLTextAreaElement
      | null;
    input?.focus({ preventScroll: true });
  }

  function handlePrimaryAction() {
    if (fieldErrorCount > 0 && firstErrorFieldKey) {
      scrollToField(firstErrorFieldKey);
      return;
    }

    onSubmit();
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 pb-32 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6 sm:pb-36">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Step 2
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
            Review and edit before submit
          </h2>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.18em]">
          <span className="rounded-full bg-[color:var(--danger-bg)] px-3 py-2 text-[color:var(--danger)]">
            {fieldErrorCount} issues
          </span>
          <span className="rounded-full bg-[color:var(--warn-bg)] px-3 py-2 text-[color:var(--warn)]">
            {lowConfidenceCount} verify
          </span>
          <span className="rounded-full bg-[color:var(--success-bg)] px-3 py-2 text-[color:var(--signal)]">
            {manualEditCount} edited
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: "Extraction", value: checkIn.extractionStatus },
          { label: "Review", value: reviewReady ? "ready" : checkIn.reviewStatus },
          { label: "Submit", value: checkIn.submissionStatus },
          { label: "Export", value: checkIn.exportStatus },
          { label: "Email", value: checkIn.emailStatus },
        ].map((statusCard) => (
          <div
            key={statusCard.label}
            className={`rounded-[1.2rem] border px-4 py-3 ${getStatusTone(statusCard.value)}`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">
              {statusCard.label}
            </p>
            <p className="mt-2 text-sm font-semibold capitalize">{statusCard.value}</p>
          </div>
        ))}
      </div>

      <div className={`mt-5 rounded-[1.4rem] border px-4 py-4 text-sm ${statusMessageClassName}`}>
        <p className="font-semibold">{statusMessage.title}</p>
        <p className="mt-1 leading-6">{statusMessage.message}</p>
      </div>

      <div className="mt-5 rounded-[1.5rem] border border-[color:var(--border)] bg-[color:var(--panel-soft)] p-4">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Fast correction flow</p>
        <p className="mt-1 text-xs leading-5 text-[color:var(--muted)]">
          Red fields must be fixed before submit. Amber fields need verification. Teal fields
          were manually updated after AI extraction.
        </p>

        {attentionFieldKeys.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {attentionFieldKeys.map((fieldKey) => (
              <button
                key={fieldKey}
                type="button"
                onClick={() => scrollToField(fieldKey)}
                className={
                  fieldErrors[fieldKey]
                    ? "inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-3 text-sm font-semibold text-[color:var(--danger)]"
                    : "inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--warn-border)] bg-[color:var(--warn-bg)] px-3 text-sm font-semibold text-[color:var(--warn)]"
                }
              >
                {FIELD_LABELS[fieldKey]}
              </button>
            ))}
          </div>
        ) : (
          <div className="mt-4 rounded-[1rem] border border-[color:var(--success)]/25 bg-[color:var(--success-bg)] px-3 py-2 text-sm font-medium text-[color:var(--success)]">
            Review ready. All required fields are valid for submit.
          </div>
        )}
      </div>

      <div className="mt-5 grid gap-5">
        {FIELD_SECTIONS.map((section) => (
          <section
            key={section.id}
            className="rounded-[1.6rem] border border-[color:var(--border)] bg-white/80 p-4 shadow-[0_10px_28px_rgba(18,38,55,0.08)]"
          >
            <div className="mb-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--accent)]">
                {section.title}
              </p>
              <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
                {section.description}
              </p>
            </div>

            <div className="grid gap-4">
              {section.fieldKeys.map((fieldKey) => (
                <FieldRow
                  key={fieldKey}
                  fieldKey={fieldKey}
                  value={fields[fieldKey]}
                  confidence={confidenceByField[fieldKey]}
                  confidenceReason={confidenceReasons[fieldKey]}
                  error={fieldErrors[fieldKey]}
                  missing={missingRequired.includes(fieldKey)}
                  manuallyEdited={manuallyEditedFields.includes(fieldKey)}
                  onChange={onChange}
                />
              ))}
            </div>
          </section>
        ))}
      </div>

      {submitError ? (
        <div className="mt-5 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger)]">
          <p className="font-semibold">{submitError.title}</p>
          <p className="mt-1">{submitError.message}</p>
          {submitError.details ? (
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[color:var(--danger)]/85">
              Details: {submitError.details}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="sticky bottom-3 z-20 mt-6">
        <div className="rounded-[1.7rem] border border-[color:var(--border)] bg-white/96 p-3 shadow-[0_18px_48px_rgba(12,28,45,0.18)] backdrop-blur">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">
                {fieldErrorCount > 0
                  ? `${fieldErrorCount} field${fieldErrorCount === 1 ? "" : "s"} need attention`
                  : submitFailureStage === "email_send"
                    ? "Retry email send"
                    : submitFailureStage === "excel_generation"
                      ? "Retry export step"
                      : submitFailureStage === "submission"
                        ? "Submission already running"
                        : "Ready to submit"}
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                {fieldErrorCount > 0
                  ? "Tap Fix Fields to jump to the first issue."
                  : submitFailureStage === "email_send"
                    ? "The approved record and export are kept. Retry to resend the email."
                    : submitFailureStage === "excel_generation"
                      ? "The approved record is safe in Postgres. Retry to rebuild the export."
                      : submitFailureStage === "submission"
                        ? "Another request is already processing this check-in."
                        : manualEditCount > 0
                          ? `${manualEditCount} field${manualEditCount === 1 ? "" : "s"} were manually corrected before submit.`
                          : "Use Retake / Reupload if the images need to be replaced."}
              </p>
            </div>
            <label
              htmlFor={imageInputId}
              className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--warn-bg)] px-4 text-sm font-semibold text-[color:var(--accent)]"
            >
              Retake / Reupload
            </label>
          </div>

          <button
            type="button"
            onClick={handlePrimaryAction}
            disabled={isSubmitting || submitFailureStage === "submission"}
            className={
              fieldErrorCount > 0
                ? "inline-flex w-full items-center justify-center rounded-full bg-[color:var(--danger)] px-5 py-3 text-sm font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
                : "inline-flex w-full items-center justify-center rounded-full bg-[color:var(--signal)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-50"
            }
          >
            {isSubmitting
              ? "Submitting..."
              : fieldErrorCount > 0
                ? `Fix ${fieldErrorCount} Field${fieldErrorCount === 1 ? "" : "s"}`
                : submitFailureStage === "email_send"
                  ? "Retry Email Send"
                  : submitFailureStage === "excel_generation"
                    ? "Retry Export Step"
                    : submitFailureStage === "submission"
                      ? "Submission In Progress"
                      : "Submit Check-In"}
          </button>
        </div>
      </div>
    </section>
  );
}
