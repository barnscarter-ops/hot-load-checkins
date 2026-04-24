import { afterEach, describe, expect, it, vi } from "vitest";

import { makeFields } from "@/tests/helpers/check-in-test-data";

const mockListSubmittedCheckInFields = vi.fn();
const mockBuildMasterWorkbook = vi.fn();
const mockBuildMasterExportFileName = vi.fn();

vi.mock("@/lib/check-ins/repository", () => ({
  listSubmittedCheckInFields: mockListSubmittedCheckInFields,
}));

vi.mock("@/lib/excel/check-in-workbooks", () => ({
  buildMasterWorkbook: mockBuildMasterWorkbook,
  buildMasterExportFileName: mockBuildMasterExportFileName,
}));

const { GET } = await import("@/app/api/check-ins/master-export/route");

describe("GET /api/check-ins/master-export", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("generates the master workbook from submitted DB records", async () => {
    mockListSubmittedCheckInFields.mockResolvedValue([
      {
        fields: makeFields(),
        submissionStatus: "succeeded",
        exportStatus: "succeeded",
        emailStatus: "succeeded",
        submittedAt: "2026-04-22T18:30:00.000Z",
      },
      {
        fields: makeFields({ ticketNumber: "9732" }),
        submissionStatus: "succeeded",
        exportStatus: "succeeded",
        emailStatus: "failed",
        submittedAt: "2026-04-22T18:45:00.000Z",
      },
    ]);
    mockBuildMasterWorkbook.mockResolvedValue(Buffer.from("xlsx-content"));
    mockBuildMasterExportFileName.mockReturnValue("hot-load-check-in-master.xlsx");

    const response = await GET();
    const body = Buffer.from(await response.arrayBuffer()).toString("utf8");

    expect(response.status).toBe(200);
    expect(mockListSubmittedCheckInFields).toHaveBeenCalledTimes(1);
    expect(mockBuildMasterWorkbook).toHaveBeenCalledWith([
      {
        fields: makeFields(),
        submissionStatus: "succeeded",
        exportStatus: "succeeded",
        emailStatus: "succeeded",
        submittedAt: "2026-04-22T18:30:00.000Z",
      },
      {
        fields: makeFields({ ticketNumber: "9732" }),
        submissionStatus: "succeeded",
        exportStatus: "succeeded",
        emailStatus: "failed",
        submittedAt: "2026-04-22T18:45:00.000Z",
      },
    ]);
    expect(response.headers.get("Content-Disposition")).toContain(
      "hot-load-check-in-master.xlsx",
    );
    expect(body).toBe("xlsx-content");
  });
});
