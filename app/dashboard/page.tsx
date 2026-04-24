import { AverageByMaterialChart } from "@/components/dashboard/avg-by-material-chart";
import { AverageByVendorChart } from "@/components/dashboard/avg-by-vendor-chart";
import { DistributionChart } from "@/components/dashboard/distribution-chart";
import { FilterBar } from "@/components/dashboard/filter-bar";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { ProblemLoadsTable } from "@/components/dashboard/problem-loads-table";
import { TimeTrendChart } from "@/components/dashboard/time-trend-chart";
import { TopSlowLoadsTable } from "@/components/dashboard/top-slow-loads-table";
import {
  buildDashboardViewModel,
  formatDurationMinutes,
  parseDashboardFilters,
} from "@/lib/dashboard/metrics";
import { getDashboardFilterOptions, getDashboardRows } from "@/lib/dashboard/queries";

export default async function DashboardPage({
  searchParams,
}: PageProps<"/dashboard">) {
  const resolvedSearchParams = await searchParams;
  const filters = parseDashboardFilters(resolvedSearchParams);
  const [rows, options] = await Promise.all([
    getDashboardRows(filters),
    getDashboardFilterOptions(filters),
  ]);
  const dashboard = buildDashboardViewModel(rows, options, filters);

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.94),rgba(234,240,245,0.88))] p-6 shadow-[0_26px_90px_rgba(12,28,45,0.18)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,rgba(29,111,106,0.14),transparent_36%),radial-gradient(circle_at_top_left,rgba(160,77,31,0.14),transparent_38%)]" />
        <div className="relative">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Phase 1 Dashboard
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-[color:var(--ink)] sm:text-5xl">
            Hot Load Check-In Dashboard
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-[color:var(--muted)] sm:text-lg">
            Fast visibility into load timing, delays, and failed downstream actions using
            submitted check-in records from {dashboard.filters.rangeLabel}.
          </p>
        </div>
      </section>

      <section className="mt-8">
        <FilterBar filters={dashboard.filters} options={dashboard.options} />
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
              ? "—"
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
            <TopSlowLoadsTable rows={dashboard.topSlowLoads} />
            <ProblemLoadsTable rows={dashboard.problemLoads} />
          </section>
        </>
      )}
    </main>
  );
}
