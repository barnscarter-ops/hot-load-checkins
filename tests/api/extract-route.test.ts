import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCheckInRecord, makeFields } from "@/tests/helpers/check-in-test-data";

const mockGetServerEnv = vi.fn();
const mockGetCheckInByExtractRequestId = vi.fn();
const mockCreateDraftCheckIn = vi.fn();
const mockUpdateSubmissionArtifacts = vi.fn();
const mockUploadBucketFile = vi.fn();
const mockReplaceDraftImages = vi.fn();
const mockExtractCheckInFromImages = vi.fn();
const mockUpdateExtractionResult = vi.fn();

vi.mock("@/lib/env", () => ({
  getServerEnv: mockGetServerEnv,
}));

vi.mock("@/lib/check-ins/repository", () => ({
  getCheckInByExtractRequestId: mockGetCheckInByExtractRequestId,
  createDraftCheckIn: mockCreateDraftCheckIn,
  updateSubmissionArtifacts: mockUpdateSubmissionArtifacts,
  replaceDraftImages: mockReplaceDraftImages,
  updateExtractionResult: mockUpdateExtractionResult,
}));

vi.mock("@/lib/check-ins/storage", () => ({
  uploadBucketFile: mockUploadBucketFile,
}));

vi.mock("@/lib/ai/extract-check-in", () => ({
  extractCheckInFromImages: mockExtractCheckInFromImages,
}));

const { POST } = await import("@/app/api/check-ins/extract/route");

describe("POST /api/check-ins/extract", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("completes a successful extraction flow and returns the draft payload", async () => {
    const draft = makeCheckInRecord({
      id: "draft-1",
      status: "draft",
      fields: makeFields(),
      images: [],
      extractionStatus: "idle",
      reviewStatus: "idle",
    });
    const extractedRecord = makeCheckInRecord({
      id: "draft-1",
      fields: makeFields({ comments: "Operator note" }),
      reviewStatus: "ready",
      manuallyEditedFields: [],
    });

    mockGetServerEnv.mockReturnValue({
      CHECKIN_STORAGE_BUCKET: "hot-load-check-ins",
      OPENAI_MODEL: "gpt-5.4",
    });
    mockGetCheckInByExtractRequestId.mockResolvedValue(null);
    mockCreateDraftCheckIn.mockResolvedValue(draft);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockReplaceDraftImages.mockResolvedValue(undefined);
    mockExtractCheckInFromImages.mockResolvedValue({
      fields: extractedRecord.fields,
      confidenceByField: extractedRecord.confidenceByField,
      confidenceReasons: extractedRecord.confidenceReasons,
      rawAiResponse: { ok: true },
      aiModel: "gpt-5.4",
    });
    mockUpdateExtractionResult.mockResolvedValue(extractedRecord);

    const formData = new FormData();
    formData.append("extractRequestId", "extract-123");
    formData.append(
      "images",
      new File([Buffer.from("fake-image")], "ticket.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/check-ins/extract", {
        method: "POST",
        body: formData,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mockCreateDraftCheckIn).toHaveBeenCalledWith({
      extractRequestId: "extract-123",
    });
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({
        uploadStatus: "processing",
        extractionStatus: "idle",
        reviewStatus: "idle",
        submissionStatus: "idle",
        exportStatus: "idle",
        errorMessage: null,
      }),
    );
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "draft-1",
      expect.objectContaining({
        uploadStatus: "succeeded",
        extractionStatus: "processing",
        reviewStatus: "idle",
        errorMessage: null,
      }),
    );
    expect(mockUploadBucketFile).toHaveBeenCalledTimes(1);
    expect(mockReplaceDraftImages).toHaveBeenCalledTimes(1);
    expect(mockExtractCheckInFromImages).toHaveBeenCalledTimes(1);
    expect(mockUpdateExtractionResult).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInId: "draft-1",
        aiModel: "gpt-5.4",
      }),
    );
    expect(payload).toMatchObject({
      checkIn: {
        id: "draft-1",
        extractionStatus: "succeeded",
        reviewStatus: "ready",
        submissionStatus: "idle",
        exportStatus: "idle",
        emailStatus: "idle",
      },
      missingRequired: [],
    });
  });

  it("keeps the draft and saved images when OpenAI extraction fails", async () => {
    const draft = makeCheckInRecord({
      id: "draft-failed-extraction",
      status: "draft",
      fields: makeFields(),
      images: [],
      extractionStatus: "idle",
      reviewStatus: "idle",
    });

    mockGetServerEnv.mockReturnValue({
      CHECKIN_STORAGE_BUCKET: "hot-load-check-ins",
      OPENAI_MODEL: "gpt-5.4",
    });
    mockGetCheckInByExtractRequestId.mockResolvedValue(null);
    mockCreateDraftCheckIn.mockResolvedValue(draft);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockReplaceDraftImages.mockResolvedValue(undefined);
    mockExtractCheckInFromImages.mockRejectedValue(new Error("OpenAI timeout"));

    const formData = new FormData();
    formData.append("extractRequestId", "extract-failure-123");
    formData.append(
      "images",
      new File([Buffer.from("fake-image")], "ticket.jpg", { type: "image/jpeg" }),
    );

    const response = await POST(
      new Request("http://localhost:3000/api/check-ins/extract", {
        method: "POST",
        body: formData,
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(mockCreateDraftCheckIn).toHaveBeenCalledWith({
      extractRequestId: "extract-failure-123",
    });
    expect(mockReplaceDraftImages).toHaveBeenCalledTimes(1);
    expect(mockUpdateExtractionResult).not.toHaveBeenCalled();
    expect(mockUpdateSubmissionArtifacts).toHaveBeenNthCalledWith(
      3,
      "draft-failed-extraction",
      expect.objectContaining({
        extractionStatus: "failed",
        errorMessage: "OpenAI timeout",
        submissionError: "OpenAI timeout",
      }),
    );
    expect(payload).toMatchObject({
      stage: "extraction",
      retryable: true,
      draftId: "draft-failed-extraction",
      checkInId: "draft-failed-extraction",
      details: "OpenAI timeout",
    });
  });
});
