import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageError } from "@/lib/check-ins/errors";
import {
  makeCheckInRecord,
  makeManualEditFields,
} from "@/tests/helpers/check-in-test-data";

const mockGetCheckInById = vi.fn();
const mockBeginSubmissionAttempt = vi.fn();
const mockFinalizeSubmission = vi.fn();
const mockUpdateSubmissionArtifacts = vi.fn();
const mockUploadBucketFile = vi.fn();
const mockDownloadBucketFile = vi.fn();
const mockBuildSingleCheckInWorkbook = vi.fn();
const mockBuildTruckWorkbookPath = vi.fn();
const mockSendCheckInEmail = vi.fn();

vi.mock("@/lib/check-ins/repository", () => ({
  getCheckInById: mockGetCheckInById,
  beginSubmissionAttempt: mockBeginSubmissionAttempt,
  finalizeSubmission: mockFinalizeSubmission,
  updateSubmissionArtifacts: mockUpdateSubmissionArtifacts,
}));

vi.mock("@/lib/check-ins/storage", () => ({
  uploadBucketFile: mockUploadBucketFile,
  downloadBucketFile: mockDownloadBucketFile,
}));

vi.mock("@/lib/excel/check-in-workbooks", () => ({
  buildSingleCheckInWorkbook: mockBuildSingleCheckInWorkbook,
  buildTruckWorkbookPath: mockBuildTruckWorkbookPath,
}));

vi.mock("@/lib/email/send-check-in-email", () => ({
  sendCheckInEmail: mockSendCheckInEmail,
}));

const { submitCheckIn } = await import("@/lib/check-ins/submission");

describe("submitCheckIn", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("completes a successful approved submission", async () => {
    const draft = makeCheckInRecord({
      id: "check-in-success",
      status: "draft",
      submissionStatus: "idle",
      exportStatus: "idle",
      emailStatus: "idle",
      excelFilePath: null,
    });
    const approved = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "processing",
    });
    const completed = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      excelStatus: "succeeded",
      emailStatus: "succeeded",
      excelFilePath: "exports/check-ins/check-in-success/9731-test-metal.xlsx",
      masterLogPath: "/api/check-ins/master-export",
      emailSentAt: "2026-04-22T18:30:00.000Z",
    });

    mockGetCheckInById.mockResolvedValueOnce(draft).mockResolvedValueOnce(completed);
    mockBeginSubmissionAttempt.mockResolvedValue(approved);
    mockBuildTruckWorkbookPath.mockReturnValue(
      "exports/check-ins/check-in-success/9731-test-metal.xlsx",
    );
    mockBuildSingleCheckInWorkbook.mockResolvedValue(Buffer.from("workbook"));
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockDownloadBucketFile.mockResolvedValue(Buffer.from("image"));
    mockSendCheckInEmail.mockResolvedValue({ provider: "resend" });
    mockFinalizeSubmission.mockResolvedValue(undefined);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);

    const result = await submitCheckIn(
      draft.id,
      draft.fields,
      makeManualEditFields("comments", "vehicleNumber"),
    );

    expect(mockBeginSubmissionAttempt).toHaveBeenCalledWith(
      expect.objectContaining({
        checkInId: "check-in-success",
        manuallyEditedFields: ["comments", "vehicleNumber"],
      }),
    );
    expect(mockBuildSingleCheckInWorkbook).toHaveBeenCalledWith({
      fields: draft.fields,
      submittedAt: approved.submittedAt,
      reviewStatus: approved.reviewStatus,
      manuallyEditedFields: ["comments", "vehicleNumber"],
      exportGeneratedAt: expect.any(String),
    });
    expect(mockUploadBucketFile).toHaveBeenCalledWith(
      "exports/check-ins/check-in-success/9731-test-metal.xlsx",
      expect.any(Buffer),
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    expect(mockSendCheckInEmail).toHaveBeenCalledTimes(1);
    expect(mockFinalizeSubmission).toHaveBeenCalledWith("check-in-success");
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-success",
      expect.objectContaining({
        submissionStatus: "processing",
        exportStatus: "processing",
        excelStatus: "processing",
      }),
    );
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-success",
      expect.objectContaining({
        exportStatus: "succeeded",
        excelStatus: "succeeded",
        errorMessage: null,
      }),
    );
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-success",
      expect.objectContaining({
        submissionStatus: "processing",
        emailStatus: "processing",
      }),
    );
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-success",
      expect.objectContaining({
        emailStatus: "succeeded",
        errorMessage: null,
      }),
    );
    expect(result).toMatchObject({
      checkInId: "check-in-success",
      checkIn: {
        status: "submitted",
        reviewStatus: "reviewed",
        submissionStatus: "succeeded",
        exportStatus: "succeeded",
        emailStatus: "succeeded",
        errorMessage: null,
      },
    });
  });

  it("preserves the approved record when email fails after export succeeds", async () => {
    const draft = makeCheckInRecord({
      id: "check-in-email-fail",
      status: "draft",
    });
    const approved = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "processing",
    });

    mockGetCheckInById.mockResolvedValueOnce(draft);
    mockBeginSubmissionAttempt.mockResolvedValue(approved);
    mockBuildTruckWorkbookPath.mockReturnValue(
      "exports/check-ins/check-in-email-fail/9731-test-metal.xlsx",
    );
    mockBuildSingleCheckInWorkbook.mockResolvedValue(Buffer.from("workbook"));
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockDownloadBucketFile.mockResolvedValue(Buffer.from("image"));
    mockSendCheckInEmail.mockRejectedValue(new Error("SMTP unavailable"));
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);

    await expect(
      submitCheckIn(draft.id, draft.fields, makeManualEditFields("comments")),
    ).rejects.toMatchObject<Partial<WorkflowStageError>>({
      stage: "email_send",
      retryable: true,
      checkInId: "check-in-email-fail",
    });

    expect(mockFinalizeSubmission).not.toHaveBeenCalled();
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-email-fail",
      expect.objectContaining({
        exportStatus: "succeeded",
        excelStatus: "succeeded",
        errorMessage: null,
      }),
    );
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-email-fail",
      expect.objectContaining({
        submissionStatus: "failed",
        emailStatus: "failed",
        emailError: "SMTP unavailable",
        errorMessage: "SMTP unavailable",
      }),
    );
  });

  it("fails export after approval without losing submission state, and retry reruns export once", async () => {
    const draft = makeCheckInRecord({
      id: "check-in-export-fail",
      status: "draft",
      submissionStatus: "idle",
      exportStatus: "idle",
      emailStatus: "idle",
      excelFilePath: null,
    });
    const approved = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "processing",
    });
    const failedAfterExport = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "failed",
      exportStatus: "failed",
      excelStatus: "failed",
      emailStatus: "idle",
      errorMessage: "Workbook write failed",
      submissionError: "Workbook write failed",
      submittedAt: "2026-04-22T18:40:00.000Z",
    });
    const retryApproved = makeCheckInRecord({
      ...failedAfterExport,
      submissionStatus: "processing",
    });
    const completedRetry = makeCheckInRecord({
      ...failedAfterExport,
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      excelStatus: "succeeded",
      emailStatus: "succeeded",
      errorMessage: null,
      submissionError: null,
      excelFilePath: "exports/check-ins/check-in-export-fail/9731-test-metal.xlsx",
      emailSentAt: "2026-04-22T18:50:00.000Z",
    });

    mockBuildTruckWorkbookPath.mockReturnValue(
      "exports/check-ins/check-in-export-fail/9731-test-metal.xlsx",
    );
    mockGetCheckInById
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(failedAfterExport)
      .mockResolvedValueOnce(completedRetry);
    mockBeginSubmissionAttempt.mockResolvedValueOnce(approved).mockResolvedValueOnce(retryApproved);
    mockBuildSingleCheckInWorkbook
      .mockRejectedValueOnce(new Error("Workbook write failed"))
      .mockResolvedValueOnce(Buffer.from("retry-workbook"));
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockDownloadBucketFile.mockResolvedValue(Buffer.from("image"));
    mockSendCheckInEmail.mockResolvedValue({ provider: "resend" });
    mockFinalizeSubmission.mockResolvedValue(undefined);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);

    await expect(
      submitCheckIn(draft.id, draft.fields, makeManualEditFields("comments")),
    ).rejects.toMatchObject<Partial<WorkflowStageError>>({
      stage: "excel_generation",
      retryable: true,
      checkInId: "check-in-export-fail",
      details: "Workbook write failed",
    });

    expect(mockUpdateSubmissionArtifacts).toHaveBeenNthCalledWith(
      2,
      "check-in-export-fail",
      expect.objectContaining({
        submissionStatus: "failed",
        exportStatus: "failed",
        excelStatus: "failed",
        errorMessage: "Workbook write failed",
      }),
    );
    expect(mockSendCheckInEmail).not.toHaveBeenCalled();

    const retryResult = await submitCheckIn(
      failedAfterExport.id,
      failedAfterExport.fields,
      makeManualEditFields("comments"),
    );

    expect(mockBuildSingleCheckInWorkbook).toHaveBeenCalledTimes(2);
    expect(mockUploadBucketFile).toHaveBeenCalledTimes(1);
    expect(mockSendCheckInEmail).toHaveBeenCalledTimes(1);
    expect(mockFinalizeSubmission).toHaveBeenCalledWith("check-in-export-fail");
    expect(retryResult.checkIn).toMatchObject({
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      emailStatus: "succeeded",
      errorMessage: null,
    });
  });

  it("retries safely by reusing the saved export and rerunning only the email step", async () => {
    const submittedWithFailedEmail = makeCheckInRecord({
      id: "check-in-retry",
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "failed",
      exportStatus: "succeeded",
      excelStatus: "succeeded",
      emailStatus: "failed",
      excelFilePath: "exports/check-ins/check-in-retry/9731-test-metal.xlsx",
      masterLogPath: "/api/check-ins/master-export",
    });
    const approvedRetry = makeCheckInRecord({
      ...submittedWithFailedEmail,
      submissionStatus: "processing",
    });
    const completedRetry = makeCheckInRecord({
      ...submittedWithFailedEmail,
      submissionStatus: "succeeded",
      emailStatus: "succeeded",
      emailSentAt: "2026-04-22T19:00:00.000Z",
    });

    mockGetCheckInById
      .mockResolvedValueOnce(submittedWithFailedEmail)
      .mockResolvedValueOnce(completedRetry);
    mockBeginSubmissionAttempt.mockResolvedValue(approvedRetry);
    mockDownloadBucketFile
      .mockResolvedValueOnce(Buffer.from("saved-workbook"))
      .mockResolvedValueOnce(Buffer.from("image"));
    mockSendCheckInEmail.mockResolvedValue({ provider: "resend" });
    mockFinalizeSubmission.mockResolvedValue(undefined);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);

    const result = await submitCheckIn(
      submittedWithFailedEmail.id,
      submittedWithFailedEmail.fields,
      makeManualEditFields("comments"),
    );

    expect(mockBuildSingleCheckInWorkbook).not.toHaveBeenCalled();
    expect(mockUploadBucketFile).not.toHaveBeenCalled();
    expect(mockSendCheckInEmail).toHaveBeenCalledTimes(1);
    expect(mockFinalizeSubmission).toHaveBeenCalledWith("check-in-retry");
    expect(result.checkIn).toMatchObject({
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      emailStatus: "succeeded",
      errorMessage: null,
    });
  });

  it("protects against double submit and triggers export/email only once", async () => {
    const draft = makeCheckInRecord({
      id: "check-in-double-submit",
      status: "draft",
      submissionStatus: "idle",
      exportStatus: "idle",
      emailStatus: "idle",
      excelFilePath: null,
    });
    const approved = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "processing",
    });
    const completed = makeCheckInRecord({
      ...draft,
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "succeeded",
      exportStatus: "succeeded",
      excelStatus: "succeeded",
      emailStatus: "succeeded",
      excelFilePath: "exports/check-ins/check-in-double-submit/9731-test-metal.xlsx",
      emailSentAt: "2026-04-22T19:10:00.000Z",
      errorMessage: null,
    });

    let resolveFirstBegin: ((value: typeof approved) => void) | null = null;
    const firstBegin = new Promise<typeof approved>((resolve) => {
      resolveFirstBegin = resolve;
    });

    mockGetCheckInById
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(draft)
      .mockResolvedValueOnce(completed);
    mockBeginSubmissionAttempt
      .mockImplementationOnce(() => firstBegin)
      .mockResolvedValueOnce(null);
    mockBuildTruckWorkbookPath.mockReturnValue(
      "exports/check-ins/check-in-double-submit/9731-test-metal.xlsx",
    );
    mockBuildSingleCheckInWorkbook.mockResolvedValue(Buffer.from("workbook"));
    mockUploadBucketFile.mockResolvedValue(undefined);
    mockDownloadBucketFile.mockResolvedValue(Buffer.from("image"));
    mockSendCheckInEmail.mockResolvedValue({ provider: "resend" });
    mockFinalizeSubmission.mockResolvedValue(undefined);
    mockUpdateSubmissionArtifacts.mockResolvedValue(undefined);

    const first = submitCheckIn(
      draft.id,
      draft.fields,
      makeManualEditFields("comments"),
    );
    await Promise.resolve();
    const second = submitCheckIn(
      draft.id,
      draft.fields,
      makeManualEditFields("comments"),
    );
    resolveFirstBegin?.(approved);

    const [firstResult, secondResult] = await Promise.allSettled([first, second]);

    expect(firstResult.status).toBe("fulfilled");
    expect(secondResult.status).toBe("rejected");
    if (secondResult.status === "rejected") {
      expect(secondResult.reason).toMatchObject<Partial<WorkflowStageError>>({
        stage: "submission",
        retryable: true,
        checkInId: "check-in-double-submit",
      });
    }
    expect(mockBuildSingleCheckInWorkbook).toHaveBeenCalledTimes(1);
    expect(mockUploadBucketFile).toHaveBeenCalledTimes(1);
    expect(mockSendCheckInEmail).toHaveBeenCalledTimes(1);
    expect(mockFinalizeSubmission).toHaveBeenCalledTimes(1);
    expect(mockUpdateSubmissionArtifacts).toHaveBeenCalledWith(
      "check-in-double-submit",
      expect.objectContaining({
        submissionStatus: "processing",
        exportStatus: "processing",
        excelStatus: "processing",
      }),
    );
  });
});
