import { FIELD_LABELS } from "@/lib/check-ins/constants";
import { normalizeQuantityInput } from "@/lib/check-ins/schema";
import {
  computeDurationMinutes,
  formatDateForDisplay,
  formatDateTimeForDisplay,
  formatDurationMinutes,
  formatTimeForDisplay,
} from "@/lib/date-time";
import type { CheckInFieldKey, CheckInFields } from "@/lib/check-ins/types";

export function formatQuantityForDisplay(value: string) {
  const trimmed = value.trim();
  if (!trimmed) {
    return "";
  }

  const normalized = normalizeQuantityInput(trimmed);
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) {
    return trimmed;
  }

  const numericValue = Number(normalized);
  const hasDecimal = normalized.includes(".");
  const formattedValue = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: hasDecimal ? 2 : 0,
    maximumFractionDigits: hasDecimal ? 2 : 2,
  }).format(numericValue);

  return `${formattedValue} LB`;
}

export function getManualEditsDisplay(fieldKeys: CheckInFieldKey[]) {
  if (fieldKeys.length === 0) {
    return "No manual edits";
  }

  return `Edited: ${fieldKeys.map((fieldKey) => FIELD_LABELS[fieldKey]).join(", ")}`;
}

export function getTimeOnSiteMinutes(fields: CheckInFields) {
  return computeDurationMinutes(fields.arrivalTime, fields.departureTime);
}

export function getTimeOnSiteDisplay(fields: CheckInFields) {
  return formatDurationMinutes(getTimeOnSiteMinutes(fields));
}

export function getDelayFlag(fields: CheckInFields) {
  const minutes = getTimeOnSiteMinutes(fields);
  if (minutes === null) {
    return "Unknown";
  }

  return minutes > 120 ? "Yes" : "No";
}

export function formatCheckInFieldValue(
  fieldKey: CheckInFieldKey,
  value: string,
) {
  switch (fieldKey) {
    case "date":
      return formatDateForDisplay(value);
    case "arrivalTime":
    case "departureTime":
      return formatTimeForDisplay(value);
    case "quantity":
      return formatQuantityForDisplay(value);
    default:
      return value.trim() || "—";
  }
}

export function formatSubmittedAtForDisplay(value: string | null) {
  return formatDateTimeForDisplay(value);
}
