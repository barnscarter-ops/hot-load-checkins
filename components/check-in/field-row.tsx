"use client";

import {
  FIELD_HELP_TEXT,
  FIELD_INPUT_TYPES,
  FIELD_LABELS,
  LOW_CONFIDENCE_THRESHOLD,
} from "@/lib/check-ins/constants";
import type { CheckInFieldKey } from "@/lib/check-ins/types";
import { cn } from "@/lib/utils";

interface FieldRowProps {
  fieldKey: CheckInFieldKey;
  value: string;
  confidence: number;
  confidenceReason: string;
  error?: string;
  missing: boolean;
  manuallyEdited: boolean;
  onChange: (fieldKey: CheckInFieldKey, value: string) => void;
}

export function FieldRow({
  fieldKey,
  value,
  confidence,
  confidenceReason,
  error,
  missing,
  manuallyEdited,
  onChange,
}: FieldRowProps) {
  const inputType = FIELD_INPUT_TYPES[fieldKey];
  const isLowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD;
  const hasError = Boolean(error);
  const isMissing = missing || error === "This field is required.";
  const containerTone = hasError
    ? "border-[color:var(--danger-border)] bg-[color:var(--danger-bg)]/45"
    : manuallyEdited
      ? "border-[color:var(--signal)] bg-[color:var(--success-bg)]/55"
      : isLowConfidence
        ? "border-[color:var(--warn-border)] bg-[color:var(--warn-bg)]/55"
        : "border-[color:var(--border)] bg-white";
  const inputTone = hasError
    ? "border-[color:var(--danger-border)]"
    : manuallyEdited
      ? "border-[color:var(--signal)]"
      : isLowConfidence
        ? "border-[color:var(--warn-border)]"
        : "border-[color:var(--border)]";

  const helperText = hasError
    ? error
    : manuallyEdited && isLowConfidence
      ? `Manually updated after extraction. ${confidenceReason || "AI confidence was low here, so verify the edit."}`
      : manuallyEdited
        ? confidenceReason
          ? `Manually updated after extraction. ${confidenceReason}`
          : "Manually updated after extraction."
        : isLowConfidence
          ? confidenceReason || "AI confidence is low here. Please verify manually."
          : confidenceReason || FIELD_HELP_TEXT[fieldKey];

  const badges = [
    {
      label: hasError ? (isMissing ? "Required" : "Format") : `AI ${Math.round(confidence * 100)}%`,
      className: hasError
        ? "bg-[color:var(--danger-bg)] text-[color:var(--danger)]"
        : isLowConfidence
          ? "bg-[color:var(--warn-bg)] text-[color:var(--warn)]"
          : "bg-[color:var(--success-bg)] text-[color:var(--success)]",
    },
    ...(manuallyEdited
      ? [
          {
            label: "Edited",
            className: "bg-[color:var(--success-bg)] text-[color:var(--signal)]",
          },
        ]
      : []),
  ];

  return (
    <label
      id={`field-${fieldKey}`}
      className={cn(
        "block scroll-mt-28 rounded-[1.5rem] border p-4 shadow-[0_8px_24px_rgba(18,38,55,0.06)] transition",
        containerTone,
      )}
    >
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <span className="text-base font-semibold text-[color:var(--ink)]">
            {FIELD_LABELS[fieldKey]}
          </span>
          <span className="ml-2 text-xs uppercase tracking-[0.22em] text-[color:var(--muted-soft)]">
            required
          </span>
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          {badges.map((badge) => (
            <span
              key={badge.label}
              className={cn(
                "rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                badge.className,
              )}
            >
              {badge.label}
            </span>
          ))}
        </div>
      </div>

      {inputType === "textarea" ? (
        <textarea
          value={value}
          rows={4}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className={cn(
            "w-full rounded-[1.2rem] border bg-white px-4 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--muted-soft)] focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-ring)]",
            inputTone,
          )}
          placeholder={FIELD_HELP_TEXT[fieldKey]}
        />
      ) : (
        <input
          type={inputType}
          value={value}
          onChange={(event) => onChange(fieldKey, event.target.value)}
          className={cn(
            "w-full rounded-[1.2rem] border bg-white px-4 py-3 text-base text-[color:var(--ink)] outline-none transition placeholder:text-[color:var(--muted-soft)] focus:border-[color:var(--accent)] focus:ring-4 focus:ring-[color:var(--accent-ring)]",
            inputTone,
          )}
          placeholder={FIELD_HELP_TEXT[fieldKey]}
        />
      )}

      <p
        className={cn(
          "mt-2 text-xs leading-5",
          hasError ? "text-[color:var(--danger)]" : "text-[color:var(--muted)]",
        )}
      >
        {helperText}
      </p>
    </label>
  );
}
