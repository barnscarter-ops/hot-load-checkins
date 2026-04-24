import { afterEach, describe, expect, it, vi } from "vitest";

import { WorkflowStageError } from "@/lib/check-ins/errors";
import { makeCheckInRecord } from "@/tests/helpers/check-in-test-data";

const mockSubmitCheckIn = vi.fn();
const mockGetCheckInById = vi.fn();

vi.mock("@/lib/check-ins/submission", () => ({
  submitCheckIn: mockSubmitCheckIn,
}));

vi.mock("@/lib/check-ins/repository", () => ({
  getCheckInById: mockGetCheckInById,
}));

const { POST } = await import("@/app/api/check-ins/submit/route");

describe("POST /api/check-ins/submit", () => {
  afterEach(() => {
    vi.resetAllMocks();
  });

  it("blocks submit and returns field-level validation errors when required fields are missing", async () => {
    const response = await POST(
      new Request("http://localhost:3000/api/check-ins/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInId: "4f002979-df80-4475-a891-281526a19767",
          manuallyEditedFields: ["comments"],
          fields: {
            date: "   ",
            ticketNumber: "",
            vendor: "  ",
            material: "",
            quantity: "abc",
            truckNumber: "",
            arrivalTime: "25:99",
            departureTime: " ",
            comments: " ",
            vehicleNumber: "",
            radTicket: "",
            harscoEmployee: "",
          },
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(400);
    expect(mockSubmitCheckIn).not.toHaveBeenCalled();
    expect(payload).toMatchObject({
      error: "Submitted fields failed validation.",
      fieldErrors: {
        date: "This field is required.",
        quantity: "Use a numeric quantity.",
        arrivalTime: "Use a valid time like 1:56 PM or 13:56.",
        comments: "This field is required.",
      },
    });
  });

  it("accepts comma-formatted quantity values with optional LB suffixes", async () => {
    const acceptedQuantities = [
      "28000",
      "28,000",
      "28000.5",
      "28,000.5",
      "28000 lb",
      "28,000 lb",
      "28000 lbs",
      "28,000 lbs",
    ];

    mockSubmitCheckIn.mockResolvedValue(
      makeCheckInRecord({
        id: "4f002979-df80-4475-a891-281526a19767",
        status: "submitted",
      }),
    );

    for (const quantity of acceptedQuantities) {
      const response = await POST(
        new Request("http://localhost:3000/api/check-ins/submit", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            checkInId: "4f002979-df80-4475-a891-281526a19767",
            manuallyEditedFields: [],
            fields: {
              date: "2026-04-22",
              ticketNumber: "9731",
              vendor: "Test Metal",
              material: "Steel",
              quantity,
              truckNumber: "1236",
              arrivalTime: "13:56",
              departureTime: "15:27",
              comments: "Ready to submit",
              vehicleNumber: "347",
              radTicket: "RAD-22",
              harscoEmployee: "Matt",
            },
          }),
        }),
      );
      const payload = await response.json();

      expect(response.status, `quantity ${quantity}`).toBe(200);
      expect(payload.fieldErrors?.quantity, `quantity ${quantity}`).toBeUndefined();
    }
  });

  it("returns the persisted failure state when export generation fails after approval", async () => {
    const failedCheckIn = makeCheckInRecord({
      id: "4f002979-df80-4475-a891-281526a19767",
      status: "submitted",
      reviewStatus: "reviewed",
      submissionStatus: "failed",
      exportStatus: "failed",
      excelStatus: "failed",
      emailStatus: "idle",
      errorMessage: "Workbook write failed",
      submissionError: "Workbook write failed",
      submittedAt: "2026-04-22T18:30:00.000Z",
    });

    mockSubmitCheckIn.mockRejectedValue(
      new WorkflowStageError({
        message:
          "The check-in was approved and saved, but the per-truck Excel export failed. Retry submit to rerun the export step.",
        stage: "excel_generation",
        retryable: true,
        checkInId: "4f002979-df80-4475-a891-281526a19767",
        details: "Workbook write failed",
      }),
    );
    mockGetCheckInById.mockResolvedValue(failedCheckIn);

    const response = await POST(
      new Request("http://localhost:3000/api/check-ins/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInId: "4f002979-df80-4475-a891-281526a19767",
          manuallyEditedFields: ["comments"],
          fields: failedCheckIn.fields,
        }),
      }),
    );
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(mockSubmitCheckIn).toHaveBeenCalledWith(
      "4f002979-df80-4475-a891-281526a19767",
      {
        ...failedCheckIn.fields,
        arrivalTime: "1:50 PM",
        departureTime: "3:29 PM",
      },
      ["comments"],
    );
    expect(payload).toMatchObject({
      stage: "excel_generation",
      retryable: true,
      details: "Workbook write failed",
      checkIn: {
        id: "4f002979-df80-4475-a891-281526a19767",
        status: "submitted",
        reviewStatus: "reviewed",
        submissionStatus: "failed",
        exportStatus: "failed",
        emailStatus: "idle",
        errorMessage: "Workbook write failed",
      },
    });
  });
});
