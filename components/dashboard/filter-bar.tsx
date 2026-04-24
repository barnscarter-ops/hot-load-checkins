import Link from "next/link";

import { buildDashboardHref } from "@/lib/dashboard/metrics";
import type { DashboardFilterOptions, DashboardFilters } from "@/lib/dashboard/types";

interface FilterBarProps {
  filters: DashboardFilters;
  options: DashboardFilterOptions;
}

const PRESETS: Array<{ label: string; preset: DashboardFilters["preset"] }> = [
  { label: "Today", preset: "today" },
  { label: "Last 7 Days", preset: "last7" },
  { label: "Last 30 Days", preset: "last30" },
];

export function FilterBar({ filters, options }: FilterBarProps) {
  const showEmployeeFilter = options.employees.length > 0 || Boolean(filters.employee);

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Filters
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
            Load timing overview
          </h2>
        </div>
        <Link
          href={buildDashboardHref(filters)}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
        >
          Refresh
        </Link>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <Link
            key={preset.preset}
            href={buildDashboardHref(filters, {
              preset: preset.preset,
            })}
            className={
              filters.preset === preset.preset
                ? "inline-flex min-h-10 items-center justify-center rounded-full bg-[color:var(--ink)] px-4 text-sm font-semibold text-white"
                : "inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--muted)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            }
          >
            {preset.label}
          </Link>
        ))}
      </div>

      <form
        action="/dashboard"
        method="get"
        className={`mt-5 grid gap-4 ${showEmployeeFilter ? "xl:grid-cols-[1fr_1fr_1fr_1fr_1fr_auto]" : "xl:grid-cols-[1fr_1fr_1fr_1fr_auto]"}`}
      >
        <input type="hidden" name="preset" value="custom" />

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          <span>Date Range Start</span>
          <input
            type="date"
            name="startDate"
            defaultValue={filters.startDate}
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-[color:var(--ink)] outline-none ring-0 focus:border-[color:var(--accent)]"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          <span>Date Range End</span>
          <input
            type="date"
            name="endDate"
            defaultValue={filters.endDate}
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-[color:var(--ink)] outline-none ring-0 focus:border-[color:var(--accent)]"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          <span>Vendor</span>
          <select
            name="vendor"
            defaultValue={filters.vendor}
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
          >
            <option value="">All vendors</option>
            {options.vendors.map((vendor) => (
              <option key={vendor} value={vendor}>
                {vendor}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          <span>Material</span>
          <select
            name="material"
            defaultValue={filters.material}
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
          >
            <option value="">All materials</option>
            {options.materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </label>

        {showEmployeeFilter ? (
          <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
            <span>Employee</span>
            <select
              name="employee"
              defaultValue={filters.employee}
              className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-[color:var(--ink)] outline-none focus:border-[color:var(--accent)]"
            >
              <option value="">All employees</option>
              {options.employees.map((employee) => (
                <option key={employee} value={employee}>
                  {employee}
                </option>
              ))}
            </select>
          </label>
        ) : null}

        <div className="grid gap-2 self-end">
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--signal)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--signal-strong)]"
          >
            Apply Filters
          </button>
        </div>
      </form>
    </section>
  );
}
