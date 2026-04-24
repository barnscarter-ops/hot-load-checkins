export type CheckInFieldKey =
  | "date"
  | "ticketNumber"
  | "vendor"
  | "material"
  | "quantity"
  | "truckNumber"
  | "arrivalTime"
  | "departureTime"
  | "comments"
  | "vehicleNumber"
  | "radTicket"
  | "harscoEmployee";

export type CheckInFields = Record<CheckInFieldKey, string>;

export type CheckInFieldErrors = Partial<Record<CheckInFieldKey, string>>;

export interface CheckInFieldSection {
  id: string;
  title: string;
  description: string;
  fieldKeys: CheckInFieldKey[];
}

export type WorkflowStepStatus = "idle" | "processing" | "succeeded" | "failed";
export type ReviewStatus = "idle" | "ready" | "reviewed";

export type WorkflowFailureStage =
  | "configuration"
  | "request_validation"
  | "draft_insert"
  | "image_upload"
  | "extraction"
  | "final_update"
  | "submission"
  | "excel_generation"
  | "email_send"
  | "master_export";

export type ConfidenceMap = Record<CheckInFieldKey, number>;

export type ConfidenceReasonMap = Record<CheckInFieldKey, string>;

export type CheckInStatus = "draft" | "submitted";

export interface CheckInImage {
  id: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

export interface CheckInRecord {
  id: string;
  status: CheckInStatus;
  extractRequestId: string | null;
  fields: CheckInFields;
  confidenceByField: ConfidenceMap;
  confidenceReasons: ConfidenceReasonMap;
  images: CheckInImage[];
  aiModel: string | null;
  uploadStatus: WorkflowStepStatus;
  uploadError: string | null;
  extractionStatus: WorkflowStepStatus;
  extractionError: string | null;
  reviewStatus: ReviewStatus;
  submissionStatus: WorkflowStepStatus;
  exportStatus: WorkflowStepStatus;
  excelStatus: WorkflowStepStatus;
  excelError: string | null;
  emailStatus: WorkflowStepStatus;
  emailError: string | null;
  excelFilePath: string | null;
  masterLogPath: string | null;
  masterLogSyncedAt: string | null;
  emailSentAt: string | null;
  emailProvider: string | null;
  submittedAt: string | null;
  errorMessage: string | null;
  submissionError: string | null;
  manuallyEditedFields: CheckInFieldKey[];
  createdAt: string;
  updatedAt: string;
}

export interface ExtractResponsePayload {
  checkIn: CheckInRecord;
  missingRequired: CheckInFieldKey[];
  lowConfidenceFields: CheckInFieldKey[];
}

export interface SubmitResponsePayload {
  checkInId: string;
  status: CheckInStatus;
  excelFilePath: string | null;
  masterLogPath: string | null;
  emailSentAt: string | null;
  checkIn: CheckInRecord;
}

export interface SingleCheckInWorkbookInput {
  fields: CheckInFields;
  submittedAt: string | null;
  reviewStatus: ReviewStatus;
  manuallyEditedFields: CheckInFieldKey[];
  exportGeneratedAt: string;
}

export interface MasterExportRow {
  fields: CheckInFields;
  submissionStatus: WorkflowStepStatus;
  exportStatus: WorkflowStepStatus;
  emailStatus: WorkflowStepStatus;
  submittedAt: string | null;
}

export interface SubmitValidationErrorResponse {
  error: string;
  fieldErrors: CheckInFieldErrors;
}

export interface WorkflowFailureResponse {
  error: string;
  stage: WorkflowFailureStage;
  retryable: boolean;
  checkInId?: string;
  draftId?: string;
  details?: string;
  step?: string;
  fieldErrors?: CheckInFieldErrors;
  checkIn?: CheckInRecord;
}
