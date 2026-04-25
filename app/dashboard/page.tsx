import { DashboardView } from "@/components/dashboard/dashboard-view";
import { buildDashboardViewModel, parseDashboardFilters } from "@/lib/dashboard/metrics";
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

      <DashboardView dashboard={dashboard} />
    </main>
  );
}
