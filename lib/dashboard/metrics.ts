import type { DashboardFilterOptions, DashboardFilters, DashboardLoadRecord, DashboardQueryRow, DashboardTrendPoint, DashboardViewModel } from "@/lib/dashboard/types";
import {
  computeDurationMinutes as computeNormalizedDurationMinutes,
  DALLAS_TIME_ZONE,
  formatDateForDisplay,
  formatDateRangeForDisplay,
  formatDateTimeForDisplay,
  formatDurationMinutes as formatNormalizedDurationMinutes,
} from "@/lib/date-time";

const DASHBOARD_TIME_ZONE = DALLAS_TIME_ZONE;

function pad(value: number) {
  return value.toString().padStart(2, "0");
}

function getDateParts(date: Date, timeZone = DASHBOARD_TIME_ZONE) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const parts = formatter.formatToParts(date);
  return {
    year: Number(parts.find((part) => part.type === "year")?.value ?? "0"),
    month: Number(parts.find((part) => part.type === "month")?.value ?? "0"),
    day: Number(parts.find((part) => part.type === "day")?.value ?? "0"),
  };
}

function formatDateParts(year: number, month: number, day: number) {
  return `${year}-${pad(month)}-${pad(day)}`;
}

export function getTodayDateString(timeZone = DASHBOARD_TIME_ZONE) {
  const parts = getDateParts(new Date(), timeZone);
  return formatDateParts(parts.year, parts.month, parts.day);
}

export function addDays(dateString: string, delta: number) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day + delta));
  return formatDateParts(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
}

function getOffsetMinutesForDate(dateString: string, timeZone = DASHBOARD_TIME_ZONE) {
  const [year, month, day] = dateString.split("-").map(Number);
  const probe = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
    hour: "2-digit",
  });
  const offsetValue =
    formatter.formatToParts(probe).find((part) => part.type === "timeZoneName")?.value ?? "GMT";
  const match = offsetValue.match(/^GMT([+-])(\d{1,2})(?::?(\d{2}))?$/);
  if (!match) {
    return 0;
  }

  const sign = match[1] === "-" ? -1 : 1;
  const hours = Number(match[2]);
  const minutes = Number(match[3] ?? "0");
  return sign * (hours * 60 + minutes);
}

export function getUtcRangeForLocalDates(startDate: string, endDate: string) {
  const startOffset = getOffsetMinutesForDate(startDate);
  const endExclusiveDate = addDays(endDate, 1);
  const endOffset = getOffsetMinutesForDate(endExclusiveDate);

  const [startYear, startMonth, startDay] = startDate.split("-").map(Number);
  const [endYear, endMonth, endDay] = endExclusiveDate.split("-").map(Number);

  const startUtc = new Date(
    Date.UTC(startYear, startMonth - 1, startDay, 0, 0, 0) - startOffset * 60 * 1000,
  );
  const endUtc = new Date(
    Date.UTC(endYear, endMonth - 1, endDay, 0, 0, 0) - endOffset * 60 * 1000,
  );

  return {
    startUtcIso: startUtc.toISOString(),
    endUtcIso: endUtc.toISOString(),
  };
}

function normalizeParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] ?? "" : value ?? "";
}

export function parseDashboardFilters(searchParams: Record<string, string | string[] | undefined>): DashboardFilters {
  const presetParam = normalizeParam(searchParams.preset);
  const today = getTodayDateString();
  const defaultPreset = presetParam === "today" || presetParam === "last30" || presetParam === "custom"
    ? presetParam
    : "last7";

  let startDate = normalizeParam(searchParams.startDate);
  let endDate = normalizeParam(searchParams.endDate);

  if (!startDate || !endDate || defaultPreset !== "custom") {
    if (defaultPreset === "today") {
      startDate = today;
      endDate = today;
    } else if (defaultPreset === "last30") {
      startDate = addDays(today, -29);
      endDate = today;
    } else {
      startDate = addDays(today, -6);
      endDate = today;
    }
  }

  if (startDate > endDate) {
    [startDate, endDate] = [endDate, startDate];
  }

  const preset =
    startDate === today && endDate === today
      ? "today"
      : startDate === addDays(today, -6) && endDate === today
        ? "last7"
        : startDate === addDays(today, -29) && endDate === today
          ? "last30"
          : "custom";

  return {
    preset,
    startDate,
    endDate,
    vendor: normalizeParam(searchParams.vendor).trim(),
    material: normalizeParam(searchParams.material).trim(),
    employee: normalizeParam(searchParams.employee).trim(),
    isSingleDay: startDate === endDate,
    rangeLabel: formatDateRangeForDisplay(startDate, endDate),
  };
}

export function buildDashboardHref(
  filters: DashboardFilters,
  overrides: Partial<DashboardFilters> = {},
) {
  const nextFilters = { ...filters, ...overrides };
  const params = new URLSearchParams();
  params.set("preset", nextFilters.preset);
  params.set("startDate", nextFilters.startDate);
  params.set("endDate", nextFilters.endDate);

  if (nextFilters.vendor) {
    params.set("vendor", nextFilters.vendor);
  }

  if (nextFilters.material) {
    params.set("material", nextFilters.material);
  }

  if (nextFilters.employee) {
    params.set("employee", nextFilters.employee);
  }

  return `/dashboard?${params.toString()}`;
}

export function computeDurationMinutes(arrivalTime: string, departureTime: string) {
  return computeNormalizedDurationMinutes(arrivalTime, departureTime);
}

export function formatDurationMinutes(minutes: number | null) {
  return formatNormalizedDurationMinutes(minutes);
}

export function formatSubmittedAt(value: string | null) {
  if (!value) {
    return "—";
  }

  return formatDateTimeForDisplay(value);
}

function average(values: number[]) {
  if (values.length === 0) {
    return null;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function normalizeGroupValue(value: string, fallback: string) {
  const trimmed = value.trim();
  return trimmed || fallback;
}

function getHourlyBuckets() {
  return Array.from({ length: 24 }, (_, hour) => {
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    const suffix = hour >= 12 ? "PM" : "AM";
    return {
      key: `${pad(hour)}:00`,
      label: `${displayHour}${suffix}`,
    };
  });
}

function getDateRangeBuckets(startDate: string, endDate: string) {
  const buckets: Array<{ key: string; label: string }> = [];
  let cursor = startDate;
  while (cursor <= endDate) {
    const label = formatDateForDisplay(cursor);
    buckets.push({ key: cursor, label });
    cursor = addDays(cursor, 1);
  }
  return buckets;
}

function getLocalDateKey(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const { year, month, day } = getDateParts(date);
  return formatDateParts(year, month, day);
}

function getLocalHourKey(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return new Intl.DateTimeFormat("en-US", {
    timeZone: DASHBOARD_TIME_ZONE,
    hour: "2-digit",
    hour12: false,
  }).format(date);
}

function buildTrend(records: DashboardLoadRecord[], filters: DashboardFilters): DashboardTrendPoint[] {
  const buckets = filters.isSingleDay ? getHourlyBuckets() : getDateRangeBuckets(filters.startDate, filters.endDate);
  return buckets.map((bucket) => {
    const bucketRecords = records.filter((record) => {
      const key = filters.isSingleDay
        ? `${getLocalHourKey(record.submittedAt) ?? ""}:00`
        : getLocalDateKey(record.submittedAt);
      return key === bucket.key;
    });
    const validDurations = bucketRecords
      .map((record) => record.durationMinutes)
      .filter((value): value is number => value !== null);

    return {
      label: bucket.label,
      averageMinutes: average(validDurations),
      totalLoads: bucketRecords.length,
    };
  });
}

function buildDistribution(records: DashboardLoadRecord[]) {
  const buckets = [
    { label: "0–1 hr", min: 0, max: 60 },
    { label: "1–2 hr", min: 60, max: 120 },
    { label: "2–3 hr", min: 120, max: 180 },
    { label: "3+ hr", min: 180, max: Number.POSITIVE_INFINITY },
  ];

  return buckets.map((bucket) => ({
    label: bucket.label,
    count: records.filter(
      (record) =>
        record.durationMinutes !== null &&
        record.durationMinutes >= bucket.min &&
        record.durationMinutes < bucket.max,
    ).length,
  }));
}

function buildAverageGroups(
  records: DashboardLoadRecord[],
  getLabel: (record: DashboardLoadRecord) => string,
  limit = 10,
) {
  const grouped = new Map<string, number[]>();

  for (const record of records) {
    if (record.durationMinutes === null) {
      continue;
    }

    const label = getLabel(record);
    const current = grouped.get(label) ?? [];
    current.push(record.durationMinutes);
    grouped.set(label, current);
  }

  return Array.from(grouped.entries())
    .map(([label, durations]) => ({
      label,
      averageMinutes: average(durations) ?? 0,
      count: durations.length,
    }))
    .sort((left, right) => {
      if (right.count !== left.count) {
        return right.count - left.count;
      }
      return right.averageMinutes - left.averageMinutes;
    })
    .slice(0, limit)
    .sort((left, right) => right.averageMinutes - left.averageMinutes);
}

function buildProblemLoads(records: DashboardLoadRecord[]) {
  return records
    .filter(
      (record) =>
        record.isDelayed ||
        record.exportStatus === "failed" ||
        record.emailStatus === "failed",
    )
    .sort((left, right) => {
      const leftFailure = left.hasFailedDownstreamAction ? 0 : 1;
      const rightFailure = right.hasFailedDownstreamAction ? 0 : 1;
      if (leftFailure !== rightFailure) {
        return leftFailure - rightFailure;
      }

      const leftSubmittedAt = left.submittedAt ? new Date(left.submittedAt).getTime() : 0;
      const rightSubmittedAt = right.submittedAt ? new Date(right.submittedAt).getTime() : 0;
      if (rightSubmittedAt !== leftSubmittedAt) {
        return rightSubmittedAt - leftSubmittedAt;
      }

      return (right.durationMinutes ?? -1) - (left.durationMinutes ?? -1);
    });
}

export function buildDashboardViewModel(
  rows: DashboardQueryRow[],
  options: DashboardFilterOptions,
  filters: DashboardFilters,
): DashboardViewModel {
  const records: DashboardLoadRecord[] = rows.map((row) => {
    const durationMinutes = computeDurationMinutes(row.arrivalTime, row.departureTime);
    const isDelayed = durationMinutes !== null && durationMinutes > 120;
    const hasFailedDownstreamAction =
      row.exportStatus === "failed" || row.emailStatus === "failed";

    return {
      ...row,
      vendorDisplay: normalizeGroupValue(row.vendor, "Unspecified Vendor"),
      materialDisplay: normalizeGroupValue(row.material, "Unspecified Material"),
      employeeDisplay: normalizeGroupValue(row.employee, "Unspecified Employee"),
      durationMinutes,
      hasValidDuration: durationMinutes !== null,
      isDelayed,
      hasFailedDownstreamAction,
      delayFlag: durationMinutes === null ? "Unknown" : isDelayed ? "Yes" : "No",
    };
  });

  const validDurationRecords = records.filter((record) => record.durationMinutes !== null);
  const durationValues = validDurationRecords.map((record) => record.durationMinutes as number);
  const totalDelayedLoads = validDurationRecords.filter((record) => record.isDelayed).length;
  const averageTimeOnSiteMinutes = average(durationValues);
  const longestLoadTimeMinutes =
    durationValues.length > 0 ? Math.max(...durationValues) : null;

  return {
    filters,
    options,
    records,
    kpis: {
      totalLoads: records.length,
      averageTimeOnSiteMinutes,
      longestLoadTimeMinutes,
      percentLoadsOverTwoHours:
        validDurationRecords.length > 0
          ? (totalDelayedLoads / validDurationRecords.length) * 100
          : null,
      totalDelayedLoads,
      validDurationCount: validDurationRecords.length,
    },
    trend: buildTrend(records, filters),
    distribution: buildDistribution(records),
    avgByVendor: buildAverageGroups(records, (record) => record.vendorDisplay),
    avgByMaterial: buildAverageGroups(records, (record) => record.materialDisplay, 8),
    topSlowLoads: [...validDurationRecords]
      .sort((left, right) => (right.durationMinutes ?? 0) - (left.durationMinutes ?? 0))
      .slice(0, 10),
    problemLoads: buildProblemLoads(records).slice(0, 20),
    hasData: records.length > 0,
    hasValidDurations: validDurationRecords.length > 0,
  };
}
