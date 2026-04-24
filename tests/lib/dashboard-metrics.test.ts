import { describe, expect, it } from "vitest";

import {
  buildDashboardViewModel,
  computeDurationMinutes,
  formatDurationMinutes,
} from "@/lib/dashboard/metrics";
import type { DashboardFilterOptions, DashboardFilters, DashboardQueryRow } from "@/lib/dashboard/types";

const filters: DashboardFilters = {
  preset: "last7",
  startDate: "2026-04-17",
  endDate: "2026-04-23",
  vendor: "",
  material: "",
  employee: "",
  isSingleDay: false,
  rangeLabel: "2026-04-17 to 2026-04-23",
};

const options: DashboardFilterOptions = {
  vendors: ["Vendor A", "Vendor B"],
  materials: ["Steel", "Iron"],
  employees: ["Matt Jones"],
};

function makeRow(overrides: Partial<DashboardQueryRow> = {}): DashboardQueryRow {
  return {
    id: "row-1",
    ticketNumber: "9731",
    vendor: "Vendor A",
    material: "Steel",
    arrivalTime: "13:00",
    departureTime: "15:30",
    submittedAt: "2026-04-22T18:30:00.000Z",
    submissionStatus: "succeeded",
    exportStatus: "succeeded",
    emailStatus: "succeeded",
    reviewStatus: "reviewed",
    employee: "Matt Jones",
    ...overrides,
  };
}

describe("dashboard metrics", () => {
  it("computes duration safely and wraps overnight values", () => {
    expect(computeDurationMinutes("13:15", "15:45")).toBe(150);
    expect(computeDurationMinutes("1:15 PM", "3:45 PM")).toBe(150);
    expect(computeDurationMinutes("23:30", "00:30")).toBe(60);
    expect(computeDurationMinutes("bad", "00:30")).toBeNull();
    expect(formatDurationMinutes(150)).toBe("2:30");
  });

  it("excludes invalid durations from metrics but still keeps failed loads in problem records", () => {
    const model = buildDashboardViewModel(
      [
        makeRow({ id: "valid-delayed", departureTime: "16:15" }),
        makeRow({
          id: "invalid-but-failed",
          ticketNumber: "9732",
          arrivalTime: "",
          departureTime: "",
          exportStatus: "failed",
        }),
      ],
      options,
      filters,
    );

    expect(model.kpis.totalLoads).toBe(2);
    expect(model.kpis.validDurationCount).toBe(1);
    expect(model.kpis.totalDelayedLoads).toBe(1);
    expect(model.kpis.percentLoadsOverTwoHours).toBe(100);
    expect(model.problemLoads.map((row) => row.id)).toEqual([
      "invalid-but-failed",
      "valid-delayed",
    ]);
  });
});
