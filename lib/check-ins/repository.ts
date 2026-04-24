import type {
  CheckInFieldKey,
  CheckInFields,
  CheckInImage,
  CheckInRecord,
  ConfidenceMap,
  ConfidenceReasonMap,
  MasterExportRow,
  ReviewStatus,
  WorkflowStepStatus,
} from "@/lib/check-ins/types";
import {
  normalizeConfidenceMap,
  normalizeConfidenceReasons,
  normalizeFields,
  normalizeManuallyEditedFields,
} from "@/lib/check-ins/schema";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

interface StoredImageRow {
  id: string;
  storage_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
  created_at: string;
}

interface StoredCheckInRow {
  id: string;
  status: "draft" | "submitted";
  extract_request_id: string | null;
  date: string | null;
  ticket_number: string | null;
  vendor: string | null;
  material: string | null;
  quantity: string | null;
  truck_number: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  comments: string | null;
  vehicle_number: string | null;
  rad_ticket: string | null;
  harsco_employee: string | null;
  confidence_scores: Partial<Record<keyof CheckInFields, number>> | null;
  confidence_reasons: Partial<Record<keyof CheckInFields, string>> | null;
  manually_edited_fields: CheckInFieldKey[] | null;
  ai_model: string | null;
  upload_status: WorkflowStepStatus;
  upload_error: string | null;
  extraction_status: WorkflowStepStatus;
  extraction_error: string | null;
  review_status: ReviewStatus;
  submission_status: WorkflowStepStatus;
  export_status: WorkflowStepStatus;
  excel_status: WorkflowStepStatus;
  excel_error: string | null;
  email_status: WorkflowStepStatus;
  email_error: string | null;
  excel_file_path: string | null;
  master_log_path: string | null;
  master_log_synced_at: string | null;
  email_sent_at: string | null;
  email_provider: string | null;
  submitted_at: string | null;
  error_message: string | null;
  submission_error: string | null;
  created_at: string;
  updated_at: string;
  check_in_images?: StoredImageRow[];
}

interface StoredSubmittedCheckInRow {
  date: string | null;
  ticket_number: string | null;
  vendor: string | null;
  material: string | null;
  quantity: string | null;
  truck_number: string | null;
  arrival_time: string | null;
  departure_time: string | null;
  comments: string | null;
  vehicle_number: string | null;
  rad_ticket: string | null;
  harsco_employee: string | null;
  submission_status: WorkflowStepStatus;
  export_status: WorkflowStepStatus;
  email_status: WorkflowStepStatus;
  submitted_at: string | null;
}

const CHECK_IN_WITH_IMAGES_SELECT = "*, check_in_images(*)";

function formatRepositoryError(context: string, message: string) {
  const missingColumnMatch =
    message.match(/Could not find the '([^']+)' column/i) ??
    message.match(/column "([^"]+)" does not exist/i);

  if (missingColumnMatch) {
    return `${context}: Database schema is out of date. Run supabase/schema.sql to add the missing "${missingColumnMatch[1]}" column, then retry.`;
  }

  return `${context}: ${message}`;
}

function mapCheckInImage(image: StoredImageRow): CheckInImage {
  return {
    id: image.id,
    storagePath: image.storage_path,
    fileName: image.file_name,
    mimeType: image.mime_type,
    sizeBytes: image.size_bytes,
    createdAt: image.created_at,
  };
}

function mapCheckIn(row: StoredCheckInRow): CheckInRecord {
  return {
    id: row.id,
    status: row.status,
    extractRequestId: row.extract_request_id,
    fields: normalizeFields({
      date: row.date,
      ticketNumber: row.ticket_number,
      vendor: row.vendor,
      material: row.material,
      quantity: row.quantity,
      truckNumber: row.truck_number,
      arrivalTime: row.arrival_time,
      departureTime: row.departure_time,
      comments: row.comments,
      vehicleNumber: row.vehicle_number,
      radTicket: row.rad_ticket,
      harscoEmployee: row.harsco_employee,
    }),
    confidenceByField: normalizeConfidenceMap(
      row.confidence_scores as Partial<ConfidenceMap> | undefined,
    ),
    confidenceReasons: normalizeConfidenceReasons(
      row.confidence_reasons as Partial<ConfidenceReasonMap> | undefined,
    ),
    images: (row.check_in_images ?? []).map(mapCheckInImage),
    aiModel: row.ai_model,
    uploadStatus: row.upload_status,
    uploadError: row.upload_error,
    extractionStatus: row.extraction_status,
    extractionError: row.extraction_error,
    reviewStatus: row.review_status ?? "idle",
    submissionStatus: row.submission_status ?? "idle",
    exportStatus: row.export_status ?? row.excel_status ?? "idle",
    excelStatus: row.excel_status,
    excelError: row.excel_error,
    emailStatus: row.email_status,
    emailError: row.email_error,
    excelFilePath: row.excel_file_path,
    masterLogPath: row.master_log_path,
    masterLogSyncedAt: row.master_log_synced_at,
    emailSentAt: row.email_sent_at,
    emailProvider: row.email_provider,
    submittedAt: row.submitted_at,
    errorMessage: row.error_message ?? row.submission_error,
    submissionError: row.submission_error,
    manuallyEditedFields: normalizeManuallyEditedFields(row.manually_edited_fields),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapFieldsToDatabase(fields: Partial<CheckInFields>) {
  return {
    date: fields.date ?? null,
    ticket_number: fields.ticketNumber ?? null,
    vendor: fields.vendor ?? null,
    material: fields.material ?? null,
    quantity: fields.quantity ?? null,
    truck_number: fields.truckNumber ?? null,
    arrival_time: fields.arrivalTime ?? null,
    departure_time: fields.departureTime ?? null,
    comments: fields.comments ?? null,
    vehicle_number: fields.vehicleNumber ?? null,
    rad_ticket: fields.radTicket ?? null,
    harsco_employee: fields.harscoEmployee ?? null,
  };
}

export async function createDraftCheckIn(args?: { extractRequestId?: string }) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .insert({
      status: "draft",
      extract_request_id: args?.extractRequestId ?? null,
    })
    .select("*")
    .single();

  if (error) {
    throw new Error(formatRepositoryError("Could not create draft check-in", error.message));
  }

  return mapCheckIn(data as StoredCheckInRow);
}

export async function getCheckInByExtractRequestId(extractRequestId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(CHECK_IN_WITH_IMAGES_SELECT)
    .eq("extract_request_id", extractRequestId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(
      formatRepositoryError(
        "Could not load draft by extract request ID",
        error.message,
      ),
    );
  }

  return mapCheckIn(data as StoredCheckInRow);
}

export async function replaceDraftImages(
  checkInId: string,
  images: Array<{
    storagePath: string;
    fileName: string;
    mimeType: string;
    sizeBytes: number;
  }>,
) {
  const supabase = createSupabaseAdminClient();
  const { error: deleteError } = await supabase
    .from("check_in_images")
    .delete()
    .eq("check_in_id", checkInId);

  if (deleteError) {
    throw new Error(
      formatRepositoryError(
        "Could not clear previous uploaded images",
        deleteError.message,
      ),
    );
  }

  if (images.length === 0) {
    return;
  }

  const { error } = await supabase.from("check_in_images").insert(
    images.map((image) => ({
      check_in_id: checkInId,
      storage_path: image.storagePath,
      file_name: image.fileName,
      mime_type: image.mimeType,
      size_bytes: image.sizeBytes,
    })),
  );

  if (error) {
    throw new Error(formatRepositoryError("Could not save uploaded images", error.message));
  }
}

export async function updateExtractionResult(args: {
  checkInId: string;
  fields: Partial<CheckInFields>;
  confidenceByField: ConfidenceMap;
  confidenceReasons: ConfidenceReasonMap;
  rawAiResponse: unknown;
  aiModel: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .update({
      ...mapFieldsToDatabase(args.fields),
      confidence_scores: args.confidenceByField,
      confidence_reasons: args.confidenceReasons,
      raw_ai_response: args.rawAiResponse,
      ai_model: args.aiModel,
      status: "draft",
      upload_status: "succeeded",
      upload_error: null,
      extraction_status: "succeeded",
      extraction_error: null,
      review_status: "ready",
      submission_status: "idle",
      export_status: "idle",
      excel_status: "idle",
      excel_error: null,
      email_status: "idle",
      email_error: null,
      submitted_at: null,
      error_message: null,
      submission_error: null,
      manually_edited_fields: [],
    })
    .eq("id", args.checkInId)
    .select(CHECK_IN_WITH_IMAGES_SELECT)
    .single();

  if (error) {
    throw new Error(formatRepositoryError("Could not save extraction result", error.message));
  }

  return mapCheckIn(data as StoredCheckInRow);
}

export async function getCheckInById(checkInId: string) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(CHECK_IN_WITH_IMAGES_SELECT)
    .eq("id", checkInId)
    .single();

  if (error) {
    if (error.code === "PGRST116") {
      return null;
    }

    throw new Error(formatRepositoryError("Could not load check-in", error.message));
  }

  return mapCheckIn(data as StoredCheckInRow);
}

export async function beginSubmissionAttempt(args: {
  checkInId: string;
  fields: CheckInFields;
  manuallyEditedFields: CheckInFieldKey[];
  submittedAt: string;
}) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .update({
      ...mapFieldsToDatabase(args.fields),
      status: "submitted",
      review_status: "reviewed",
      submission_status: "processing",
      submitted_at: args.submittedAt,
      manually_edited_fields: args.manuallyEditedFields,
      error_message: null,
      submission_error: null,
    })
    .eq("id", args.checkInId)
    .not("submission_status", "eq", "processing")
    .select(CHECK_IN_WITH_IMAGES_SELECT)
    .maybeSingle();

  if (error) {
    throw new Error(formatRepositoryError("Could not begin submission attempt", error.message));
  }

  if (!data) {
    return null;
  }

  return mapCheckIn(data as StoredCheckInRow);
}

export async function updateSubmissionArtifacts(
  checkInId: string,
  patch: {
    status?: "draft" | "submitted" | null;
    uploadStatus?: WorkflowStepStatus | null;
    uploadError?: string | null;
    extractionStatus?: WorkflowStepStatus | null;
    extractionError?: string | null;
    reviewStatus?: ReviewStatus | null;
    submissionStatus?: WorkflowStepStatus | null;
    exportStatus?: WorkflowStepStatus | null;
    excelStatus?: WorkflowStepStatus | null;
    excelError?: string | null;
    emailStatus?: WorkflowStepStatus | null;
    emailError?: string | null;
    excelFilePath?: string | null;
    masterLogPath?: string | null;
    masterLogSyncedAt?: string | null;
    emailSentAt?: string | null;
    emailProvider?: string | null;
    submittedAt?: string | null;
    errorMessage?: string | null;
    submissionError?: string | null;
    manuallyEditedFields?: CheckInFieldKey[] | null;
  },
) {
  const supabase = createSupabaseAdminClient();
  const updatePayload: Record<string, unknown> = {};

  if (patch.status !== undefined) {
    updatePayload.status = patch.status;
  }

  if (patch.uploadStatus !== undefined) {
    updatePayload.upload_status = patch.uploadStatus;
  }

  if (patch.uploadError !== undefined) {
    updatePayload.upload_error = patch.uploadError;
  }

  if (patch.extractionStatus !== undefined) {
    updatePayload.extraction_status = patch.extractionStatus;
  }

  if (patch.extractionError !== undefined) {
    updatePayload.extraction_error = patch.extractionError;
  }

  if (patch.reviewStatus !== undefined) {
    updatePayload.review_status = patch.reviewStatus;
  }

  if (patch.submissionStatus !== undefined) {
    updatePayload.submission_status = patch.submissionStatus;
  }

  if (patch.exportStatus !== undefined) {
    updatePayload.export_status = patch.exportStatus;
  }

  if (patch.excelStatus !== undefined) {
    updatePayload.excel_status = patch.excelStatus;
  }

  if (patch.excelError !== undefined) {
    updatePayload.excel_error = patch.excelError;
  }

  if (patch.emailStatus !== undefined) {
    updatePayload.email_status = patch.emailStatus;
  }

  if (patch.emailError !== undefined) {
    updatePayload.email_error = patch.emailError;
  }

  if (patch.excelFilePath !== undefined) {
    updatePayload.excel_file_path = patch.excelFilePath;
  }

  if (patch.masterLogPath !== undefined) {
    updatePayload.master_log_path = patch.masterLogPath;
  }

  if (patch.masterLogSyncedAt !== undefined) {
    updatePayload.master_log_synced_at = patch.masterLogSyncedAt;
  }

  if (patch.emailSentAt !== undefined) {
    updatePayload.email_sent_at = patch.emailSentAt;
  }

  if (patch.emailProvider !== undefined) {
    updatePayload.email_provider = patch.emailProvider;
  }

  if (patch.submittedAt !== undefined) {
    updatePayload.submitted_at = patch.submittedAt;
  }

  if (patch.errorMessage !== undefined) {
    updatePayload.error_message = patch.errorMessage;
  }

  if (patch.submissionError !== undefined) {
    updatePayload.submission_error = patch.submissionError;
  }

  if (patch.manuallyEditedFields !== undefined) {
    updatePayload.manually_edited_fields = patch.manuallyEditedFields;
  }

  const { error } = await supabase
    .from("check_ins")
    .update(updatePayload)
    .eq("id", checkInId);

  if (error) {
    throw new Error(formatRepositoryError("Could not update submission progress", error.message));
  }
}

export async function finalizeSubmission(checkInId: string) {
  const supabase = createSupabaseAdminClient();
  const { error } = await supabase
    .from("check_ins")
    .update({
      status: "submitted",
      review_status: "reviewed",
      submission_status: "succeeded",
      error_message: null,
      submission_error: null,
    })
    .eq("id", checkInId);

  if (error) {
    throw new Error(formatRepositoryError("Could not finalize submission", error.message));
  }
}

export async function listSubmittedCheckInFields() {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select(
      [
        "date",
        "ticket_number",
        "vendor",
        "material",
        "quantity",
        "truck_number",
        "arrival_time",
        "departure_time",
        "comments",
        "vehicle_number",
        "rad_ticket",
        "harsco_employee",
        "submission_status",
        "export_status",
        "email_status",
        "submitted_at",
      ].join(","),
    )
    .eq("status", "submitted")
    .order("submitted_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) {
    throw new Error(
      formatRepositoryError(
        "Could not load submitted check-ins for export",
        error.message,
      ),
    );
  }

  return (data as unknown as StoredSubmittedCheckInRow[]).map(
    (row): MasterExportRow => ({
      fields: normalizeFields({
        date: row.date,
        ticketNumber: row.ticket_number,
        vendor: row.vendor,
        material: row.material,
        quantity: row.quantity,
        truckNumber: row.truck_number,
        arrivalTime: row.arrival_time,
        departureTime: row.departure_time,
        comments: row.comments,
        vehicleNumber: row.vehicle_number,
        radTicket: row.rad_ticket,
        harscoEmployee: row.harsco_employee,
      }),
      submissionStatus: row.submission_status ?? "idle",
      exportStatus: row.export_status ?? "idle",
      emailStatus: row.email_status ?? "idle",
      submittedAt: row.submitted_at,
    }),
  );
}

export async function listRecentCheckIns(limit = 12) {
  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase
    .from("check_ins")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(formatRepositoryError("Could not load recent check-ins", error.message));
  }

  return (data as StoredCheckInRow[]).map((row) => mapCheckIn(row));
}
