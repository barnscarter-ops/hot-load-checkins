import { z } from "zod";

import {
  BLANK_CHECK_IN_FIELDS,
  CHECK_IN_FIELD_ORDER,
  EMPTY_CONFIDENCE_MAP,
  EMPTY_CONFIDENCE_REASON_MAP,
  LOW_CONFIDENCE_THRESHOLD,
  REQUIRED_FIELDS,
} from "@/lib/check-ins/constants";
import {
  normalizeDateInput,
  normalizeTimeInput,
  parseDateInput,
  parseTimeInput,
} from "@/lib/date-time";
import type {
  CheckInFieldErrors,
  CheckInFieldKey,
  CheckInFields,
  ConfidenceMap,
  ConfidenceReasonMap,
} from "@/lib/check-ins/types";

export const checkInFieldKeySchema = z.enum(
  CHECK_IN_FIELD_ORDER as [CheckInFieldKey, ...CheckInFieldKey[]],
);

const requiredText = z.preprocess(
  (value) => (value === null || value === undefined ? "" : value),
  z.string().trim().min(1, "This field is required."),
);

function isIsoDate(value: string) {
  return parseDateInput(value) !== null;
}

const dateFieldSchema = requiredText
  .refine(isIsoDate, "Use a valid date like 4/22/2026.")
  .transform((value) => normalizeDateInput(value));
const timeFieldSchema = requiredText
  .refine((value) => parseTimeInput(value) !== null, "Use a valid time like 1:56 PM or 13:56.")
  .transform((value) => normalizeTimeInput(value));

export function normalizeQuantityInput(value: string) {
  return value.trim().replace(/,/g, "").replace(/\s*(lb|lbs)\s*$/i, "").trim();
}

const quantityFieldSchema = requiredText.refine(
  (value) => /^-?\d+(\.\d+)?$/.test(normalizeQuantityInput(value)),
  "Use a numeric quantity.",
);

export const checkInFieldSchemas: {
  [Key in CheckInFieldKey]: z.ZodType<string>;
} = {
  date: dateFieldSchema,
  ticketNumber: requiredText,
  vendor: requiredText,
  material: requiredText,
  quantity: quantityFieldSchema,
  truckNumber: requiredText,
  arrivalTime: timeFieldSchema,
  departureTime: timeFieldSchema,
  comments: requiredText,
  vehicleNumber: requiredText,
  radTicket: requiredText,
  harscoEmployee: requiredText,
};

export const checkInFieldsSchema = z.object({
  date: checkInFieldSchemas.date,
  ticketNumber: checkInFieldSchemas.ticketNumber,
  vendor: checkInFieldSchemas.vendor,
  material: checkInFieldSchemas.material,
  quantity: checkInFieldSchemas.quantity,
  truckNumber: checkInFieldSchemas.truckNumber,
  arrivalTime: checkInFieldSchemas.arrivalTime,
  departureTime: checkInFieldSchemas.departureTime,
  comments: checkInFieldSchemas.comments,
  vehicleNumber: checkInFieldSchemas.vehicleNumber,
  radTicket: checkInFieldSchemas.radTicket,
  harscoEmployee: checkInFieldSchemas.harscoEmployee,
});

export const submitCheckInSchema = z.object({
  checkInId: z.string().uuid(),
  fields: checkInFieldsSchema,
  manuallyEditedFields: z
    .array(checkInFieldKeySchema)
    .default([])
    .transform((fieldKeys) => Array.from(new Set(fieldKeys))),
});

export function normalizeFields(
  fields?: Partial<Record<CheckInFieldKey, string | null | undefined>>,
): CheckInFields {
  return CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
    const trimmed = fields?.[fieldKey]?.trim() ?? BLANK_CHECK_IN_FIELDS[fieldKey];
    accumulator[fieldKey] =
      fieldKey === "date"
        ? normalizeDateInput(trimmed)
        : fieldKey === "arrivalTime" || fieldKey === "departureTime"
          ? normalizeTimeInput(trimmed)
          : trimmed;
    return accumulator;
  }, { ...BLANK_CHECK_IN_FIELDS });
}

export function normalizeConfidenceMap(
  confidence?: Partial<Record<CheckInFieldKey, number | null | undefined>>,
): ConfidenceMap {
  return CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
    const value = confidence?.[fieldKey];
    accumulator[fieldKey] =
      typeof value === "number" && Number.isFinite(value)
        ? Math.max(0, Math.min(1, value))
        : EMPTY_CONFIDENCE_MAP[fieldKey];
    return accumulator;
  }, { ...EMPTY_CONFIDENCE_MAP });
}

export function normalizeConfidenceReasons(
  reasons?: Partial<Record<CheckInFieldKey, string | null | undefined>>,
): ConfidenceReasonMap {
  return CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
    accumulator[fieldKey] = reasons?.[fieldKey]?.trim() ?? EMPTY_CONFIDENCE_REASON_MAP[fieldKey];
    return accumulator;
  }, { ...EMPTY_CONFIDENCE_REASON_MAP });
}

export function normalizeManuallyEditedFields(fieldKeys?: unknown): CheckInFieldKey[] {
  if (!Array.isArray(fieldKeys)) {
    return [];
  }

  const normalized = fieldKeys.flatMap((fieldKey) => {
    const parsed = checkInFieldKeySchema.safeParse(fieldKey);
    return parsed.success ? [parsed.data] : [];
  });

  return Array.from(new Set(normalized));
}

export function getMissingRequiredFields(
  fields: Partial<Record<CheckInFieldKey, string | null | undefined>>,
) {
  return REQUIRED_FIELDS.filter((fieldKey) => !(fields[fieldKey] ?? "").trim());
}

export function getCheckInFieldErrors(fields: unknown): CheckInFieldErrors {
  const fieldValues =
    typeof fields === "object" && fields !== null ? (fields as Record<string, unknown>) : {};

  return CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
    const result = checkInFieldSchemas[fieldKey].safeParse(fieldValues[fieldKey]);

    if (!result.success) {
      accumulator[fieldKey] = result.error.issues[0]?.message ?? "Invalid value.";
    }

    return accumulator;
  }, {} as CheckInFieldErrors);
}

export function validateCheckInFields(fields: unknown) {
  const fieldErrors = getCheckInFieldErrors(fields);

  if (Object.keys(fieldErrors).length > 0) {
    return {
      success: false as const,
      fieldErrors,
    };
  }

  return {
    success: true as const,
    data: checkInFieldsSchema.parse(fields),
    fieldErrors: {} as CheckInFieldErrors,
  };
}

export function getLowConfidenceFields(confidence: ConfidenceMap) {
  return CHECK_IN_FIELD_ORDER.filter(
    (fieldKey) => confidence[fieldKey] < LOW_CONFIDENCE_THRESHOLD,
  );
}
