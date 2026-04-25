"use client";

import { useMemo, useState } from "react";

import type { CheckInRecord } from "@/lib/check-ins/types";
import type { DashboardLoadRecord, DashboardViewModel } from "@/lib/dashboard/types";
import { formatDateForDisplay, DALLAS_TIME_ZONE } from "@/lib/date-time";
import { errorMessage } from "@/lib/utils";

import { CheckInPreviewModal } from "@/components/check-in/check-in-preview-modal";
import { AverageByMaterialChart } from "@/components/dashboard/avg-by-material-chart";
import { AverageByVendorChart } from "@/components/dashboard/avg-by-vendor-chart";
import { DateCheckInList } from "@/components/dashboard/date-check-in-list";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProblemLoadsTable } from "@/components/dashboard/problem-loads-table";
import { TimeTrendChart } from "@/components/dashboard/time-trend-chart";
import { TopSlowLoadsTable } from "@/components/dashboard/top-slow-loads-table";
import { formatDurationMinutes } from "@/lib/dashboard/metrics";

interface DashboardViewProps {
  dashboard: DashboardViewModel;
}

function getLocalSubmittedDate(value: string | null) {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: DALLAS_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "";
  const month = parts.find((part) => part.type === "month")?.value ?? "";
  const day = parts.find((part) => part.type === "day")?.value ?? "";

  return `${year}-${month}-${day}`;
}

function DashboardDateLookupPanel({
  initialDate,
  rows,
  onSelect,
}: {
  initialDate: string;
  rows: DashboardLoadRecord[];
  onSelect: (checkInId: string) => void;
}) {
  const [selectedLookupDate, setSelectedLookupDate] = useState(initialDate);

  const dateLookupRows = useMemo(
    () =>
      rows.filter((record) => {
        const submittedDate = getLocalSubmittedDate(record.submittedAt);
        return record.date === selectedLookupDate || submittedDate === selectedLookupDate;
      }),
    [rows, selectedLookupDate],
  );

  return (
    <section className="mt-8 rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ink)]">
            Daily Check-In Lookup
          </p>
          <p className="mt-1 text-sm leading-6 text-[color:var(--muted)]">
            Choose a day to find submitted loads quickly, preview the single-truck summary,
            and then download or share the Excel sheet.
          </p>
        </div>
        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          Lookup Date
          <input
            type="date"
            value={selectedLookupDate}
            onChange={(event) => setSelectedLookupDate(event.target.value)}
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
          />
        </label>
      </div>

      <div className="mt-5">
        <DateCheckInList
          selectedDate={formatDateForDisplay(selectedLookupDate)}
          rows={dateLookupRows}
          onSelect={onSelect}
        />
      </div>
    </section>
  );
}

export function DashboardView({ dashboard }: DashboardViewProps) {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedCheckIn, setSelectedCheckIn] = useState<CheckInRecord | null>(null);

  async function handlePreview(checkInId: string) {
    setPreviewOpen(true);
    setPreviewLoading(true);
    setPreviewError(null);
    setSelectedCheckIn(null);

    try {
      const response = await fetch(`/api/check-ins/${checkInId}`);
      const payload = (await response.json()) as { checkIn?: CheckInRecord; error?: string };

      if (!response.ok || !payload.checkIn) {
        throw new Error(payload.error || "The selected check-in could not be loaded.");
      }

      setSelectedCheckIn(payload.checkIn);
    } catch (previewLoadError) {
      setSelectedCheckIn(null);
      setPreviewError(errorMessage(previewLoadError));
    } finally {
      setPreviewLoading(false);
    }
  }

  function closePreview() {
    setPreviewOpen(false);
    setPreviewLoading(false);
    setPreviewError(null);
    setSelectedCheckIn(null);
  }

  return (
    <>
      <section className="mt-8">
        <FilterBar
          key={`${dashboard.filters.preset}|${dashboard.filters.startDate}|${dashboard.filters.endDate}|${dashboard.filters.vendor}|${dashboard.filters.material}|${dashboard.filters.employee}`}
          filters={dashboard.filters}
          options={dashboard.options}
        />
      </section>

      <section className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <KpiCard
          label="Total Loads"
          value={dashboard.kpis.totalLoads.toString()}
          detail="Submitted records in the current range."
        />
        <KpiCard
          label="Average Time On Site"
          value={formatDurationMinutes(
            dashboard.kpis.averageTimeOnSiteMinutes === null
              ? null
              : Math.round(dashboard.kpis.averageTimeOnSiteMinutes),
          )}
          detail={
            dashboard.kpis.validDurationCount > 0
              ? `${dashboard.kpis.validDurationCount} valid duration records`
              : "No valid duration records"
          }
        />
        <KpiCard
          label="Longest Load Time"
          value={formatDurationMinutes(dashboard.kpis.longestLoadTimeMinutes)}
          detail="Maximum computed time on site."
        />
        <KpiCard
          label="Percent Loads Over 2 Hours"
          value={
            dashboard.kpis.percentLoadsOverTwoHours === null
              ? "-"
              : `${dashboard.kpis.percentLoadsOverTwoHours.toFixed(1)}%`
          }
          detail="Only valid durations are counted in the percentage."
        />
        <KpiCard
          label="Total Delayed Loads"
          value={dashboard.kpis.totalDelayedLoads.toString()}
          detail="Computed as durations greater than 2 hours."
        />
      </section>

      {!dashboard.hasData ? (
        <section className="mt-8 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-8 text-center shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
          <p className="text-lg font-semibold text-[color:var(--ink)]">No submitted loads found</p>
          <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
            Try widening the date range or clearing the vendor, material, or employee
            filters.
          </p>
        </section>
      ) : (
        <>
          <DashboardDateLookupPanel
            key={`${dashboard.filters.startDate}|${dashboard.filters.endDate}|${dashboard.filters.vendor}|${dashboard.filters.material}|${dashboard.filters.employee}`}
            initialDate={dashboard.filters.endDate}
            rows={dashboard.records}
            onSelect={handlePreview}
          />

          <section className="mt-8 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
            <TimeTrendChart
              points={dashboard.trend}
              granularityLabel={dashboard.filters.isSingleDay ? "hour" : "day"}
            />
            <DistributionChart buckets={dashboard.distribution} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <AverageByVendorChart groups={dashboard.avgByVendor} />
            <AverageByMaterialChart groups={dashboard.avgByMaterial} />
          </section>

          <section className="mt-6 grid gap-6 xl:grid-cols-2">
            <TopSlowLoadsTable rows={dashboard.topSlowLoads} onPreview={handlePreview} />
            <ProblemLoadsTable rows={dashboard.problemLoads} onPreview={handlePreview} />
          </section>
        </>
      )}

      <CheckInPreviewModal
        open={previewOpen}
        checkIn={selectedCheckIn}
        loading={previewLoading}
        error={previewError}
        onDismiss={closePreview}
      />
    </>
  );
}
