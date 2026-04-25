import { afterEach, describe, expect, it, vi } from "vitest";

import { makeCheckInRecord } from "@/tests/helpers/check-in-test-data";

const mockGetCheckInById = vi.fn();
const mockDownloadBucketFile = vi.fn();
const mockBuildSingleCheckInWorkbook = vi.fn();
const mockBuildTruckWorkbookDownloadFileName = vi.fn();

vi.mock("@/lib/check-ins/repository", () => ({
  getCheckInById: mockGetCheckInById,
}));

vi.mock("@/lib/check-ins/storage", () => ({
  downloadBucketFile: mockDownloadBucketFile,
}));

vi.mock("@/lib/excel/check-in-workbooks", () => ({
  buildSingleCheckInWorkbook: mockBuildSingleCheckInWorkbook,
  buildTruckWorkbookDownloadFileName: mockBuildTruckWorkbookDownloadFileName,
}));

const { GET } = await import("@/app/api/check-ins/[id]/workbook/route");

describe("GET /api/check-ins/[id]/workbook", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("downloads the stored workbook when one already exists", async () => {
    const checkIn = makeCheckInRecord({
      id: "check-in-1",
      status: "submitted",
      excelFilePath: "exports/check-ins/check-in-1/9731-test-metal.xlsx",
      submittedAt: "2026-04-22T18:30:00.000Z",
    });

    mockGetCheckInById.mockResolvedValue(checkIn);
    mockDownloadBucketFile.mockResolvedValue(Buffer.from("stored-workbook"));
    mockBuildTruckWorkbookDownloadFileName.mockReturnValue("hot-load-check-in-ticket-9731.xlsx");

    const response = await GET(
      new Request("http://localhost:3000/api/check-ins/check-in-1/workbook"),
      { params: Promise.resolve({ id: "check-in-1" }) } as RouteContext<"/api/check-ins/[id]/workbook">,
    );

    const body = Buffer.from(await response.arrayBuffer()).toString("utf8");

    expect(response.status).toBe(200);
    expect(mockDownloadBucketFile).toHaveBeenCalledWith(
      "exports/check-ins/check-in-1/9731-test-metal.xlsx",
      { allowMissing: true },
    );
    expect(mockBuildSingleCheckInWorkbook).not.toHaveBeenCalled();
    expect(response.headers.get("Content-Disposition")).toContain(
      "hot-load-check-in-ticket-9731.xlsx",
    );
    expect(body).toBe("stored-workbook");
  });

  it("regenerates the workbook from the submitted record when storage is missing", async () => {
    const checkIn = makeCheckInRecord({
      id: "check-in-2",
      status: "submitted",
      reviewStatus: "reviewed",
      excelFilePath: "exports/check-ins/check-in-2/9732-test-metal.xlsx",
      submittedAt: "2026-04-22T18:30:00.000Z",
      manuallyEditedFields: ["comments"],
    });

    mockGetCheckInById.mockResolvedValue(checkIn);
    mockDownloadBucketFile.mockResolvedValue(null);
    mockBuildSingleCheckInWorkbook.mockResolvedValue(Buffer.from("regenerated-workbook"));
    mockBuildTruckWorkbookDownloadFileName.mockReturnValue("hot-load-check-in-ticket-9732.xlsx");

    const response = await GET(
      new Request("http://localhost:3000/api/check-ins/check-in-2/workbook"),
      { params: Promise.resolve({ id: "check-in-2" }) } as RouteContext<"/api/check-ins/[id]/workbook">,
    );

    const body = Buffer.from(await response.arrayBuffer()).toString("utf8");

    expect(response.status).toBe(200);
    expect(mockBuildSingleCheckInWorkbook).toHaveBeenCalledWith({
      fields: checkIn.fields,
      submittedAt: checkIn.submittedAt,
      reviewStatus: checkIn.reviewStatus,
      manuallyEditedFields: checkIn.manuallyEditedFields,
      exportGeneratedAt: expect.any(String),
    });
    expect(body).toBe("regenerated-workbook");
  });
});
