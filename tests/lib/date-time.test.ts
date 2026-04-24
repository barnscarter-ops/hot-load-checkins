import { describe, expect, it } from "vitest";

import {
  computeDurationMinutes,
  formatDateForDisplay,
  formatDateTimeForDisplay,
  normalizeTimeInput,
  parseTimeInput,
  toExcelDallasDateTime,
} from "@/lib/date-time";

describe("date-time helpers", () => {
  it("normalizes 24-hour and AM/PM times into a consistent Dallas display format", () => {
    expect(normalizeTimeInput("13:56")).toBe("1:56 PM");
    expect(normalizeTimeInput("1:56 pm")).toBe("1:56 PM");
    expect(parseTimeInput("15:27")?.normalized24).toBe("15:27");
  });

  it("formats Dallas timestamps consistently for UI display", () => {
    expect(formatDateForDisplay("2026-04-22")).toBe("4/22/2026");
    expect(formatDateTimeForDisplay("2026-04-22T18:30:00.000Z")).toBe("4/22/2026 1:30 PM");
  });

  it("keeps overnight duration math consistent and writes Dallas wall-clock dates for Excel", () => {
    expect(computeDurationMinutes("11:30 PM", "12:30 AM")).toBe(60);

    const excelDate = toExcelDallasDateTime("2026-04-22T18:30:00.000Z") as Date;
    expect(excelDate).toBeInstanceOf(Date);
    expect(excelDate.getFullYear()).toBe(2026);
    expect(excelDate.getMonth()).toBe(3);
    expect(excelDate.getDate()).toBe(22);
    expect(excelDate.getHours()).toBe(13);
    expect(excelDate.getMinutes()).toBe(30);
  });
});
