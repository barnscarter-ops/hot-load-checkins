import { BLANK_CHECK_IN_FIELDS, EMPTY_CONFIDENCE_MAP, EMPTY_CONFIDENCE_REASON_MAP } from "@/lib/check-ins/constants";
import type {
  CheckInFieldKey,
  CheckInFields,
  CheckInImage,
  CheckInRecord,
} from "@/lib/check-ins/types";

export const VALID_FIELDS: CheckInFields = {
  date: "2026-04-22",
  ticketNumber: "9731",
  vendor: "Test Metal",
  material: "Steel",
  quantity: "28000",
  truckNumber: "1286",
  arrivalTime: "13:50",
  departureTime: "15:29",
  comments: "All clear",
  vehicleNumber: "347",
  radTicket: "RAD-55",
  harscoEmployee: "Matt Jones",
};

export function makeFields(overrides: Partial<CheckInFields> = {}): CheckInFields {
  return {
    ...VALID_FIELDS,
    ...overrides,
  };
}

export function makeImage(overrides: Partial<CheckInImage> = {}): CheckInImage {
  return {
    id: "image-1",
    storagePath: "check-ins/check-in-1/source/image-1.jpg",
    fileName: "image-1.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 12345,
    createdAt: "2026-04-22T18:00:00.000Z",
    ...overrides,
  };
}

export function makeCheckInRecord(overrides: Partial<CheckInRecord> = {}): CheckInRecord {
  const fields = overrides.fields ?? VALID_FIELDS;
  const confidenceByField = {
    ...EMPTY_CONFIDENCE_MAP,
    ...Object.fromEntries(
      Object.keys(fields).map((fieldKey) => [fieldKey, 0.95]),
    ),
    ...(overrides.confidenceByField ?? {}),
  } as CheckInRecord["confidenceByField"];
  const confidenceReasons = {
    ...EMPTY_CONFIDENCE_REASON_MAP,
    ...(overrides.confidenceReasons ?? {}),
  };

  return {
    id: "check-in-1",
    status: "draft",
    extractRequestId: "extract-1",
    fields,
    confidenceByField,
    confidenceReasons,
    images: [makeImage()],
    aiModel: "gpt-5.4",
    uploadStatus: "succeeded",
    uploadError: null,
    extractionStatus: "succeeded",
    extractionError: null,
    reviewStatus: "ready",
    submissionStatus: "idle",
    exportStatus: "idle",
    excelStatus: "idle",
    excelError: null,
    emailStatus: "idle",
    emailError: null,
    excelFilePath: null,
    masterLogPath: null,
    masterLogSyncedAt: null,
    emailSentAt: null,
    emailProvider: null,
    submittedAt: null,
    errorMessage: null,
    submissionError: null,
    manuallyEditedFields: [],
    createdAt: "2026-04-22T18:00:00.000Z",
    updatedAt: "2026-04-22T18:00:00.000Z",
    ...overrides,
  };
}

export function makeManualEditFields(...fieldKeys: CheckInFieldKey[]) {
  return fieldKeys;
}

export const BLANK_FIELDS = BLANK_CHECK_IN_FIELDS;
