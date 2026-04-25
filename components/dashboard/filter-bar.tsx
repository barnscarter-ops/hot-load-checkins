"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { buildDashboardHref } from "@/lib/dashboard/metrics";
import type { DashboardFilterOptions, DashboardFilters } from "@/lib/dashboard/types";

interface FilterBarProps {
  filters: DashboardFilters;
  options: DashboardFilterOptions;
}

export function FilterBar({ filters, options }: FilterBarProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [formValues, setFormValues] = useState({
    startDate: filters.startDate,
    endDate: filters.endDate,
    vendor: filters.vendor,
    material: filters.material,
    employee: filters.employee,
  });

  const presetButtons = useMemo(
    () => [
      {
        label: "Today",
        href: buildDashboardHref(filters, {
          preset: "today",
          startDate: filters.endDate,
          endDate: filters.endDate,
        }),
        active: filters.preset === "today",
      },
      {
        label: "Last 7 Days",
        href: buildDashboardHref(filters, { preset: "last7" }),
        active: filters.preset === "last7",
      },
      {
        label: "Last 30 Days",
        href: buildDashboardHref(filters, { preset: "last30" }),
        active: filters.preset === "last30",
      },
    ],
    [filters],
  );

  function navigateTo(href: string) {
    startTransition(() => {
      router.push(href);
    });
  }

  function handleApplyFilters(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    navigateTo(
      buildDashboardHref(filters, {
        preset: "custom",
        startDate: formValues.startDate,
        endDate: formValues.endDate,
        vendor: formValues.vendor,
        material: formValues.material,
        employee: formValues.employee,
      }),
    );
  }

  function handleRefresh() {
    startTransition(() => {
      router.refresh();
    });
  }

  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)] sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
            Filters
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[color:var(--ink)]">
            Dashboard range and grouping
          </h2>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={isPending}
          className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-5 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isPending ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        {presetButtons.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => navigateTo(preset.href)}
            disabled={isPending}
            className={
              preset.active
                ? "inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--ink)] px-4 text-sm font-semibold text-white"
                : "inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            }
          >
            {preset.label}
          </button>
        ))}
      </div>

      <form className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5" onSubmit={handleApplyFilters}>
        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          Start Date
          <input
            type="date"
            value={formValues.startDate}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, startDate: event.target.value }))
            }
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          End Date
          <input
            type="date"
            value={formValues.endDate}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, endDate: event.target.value }))
            }
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
          />
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          Vendor
          <select
            value={formValues.vendor}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, vendor: event.target.value }))
            }
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
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
          Material
          <select
            value={formValues.material}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, material: event.target.value }))
            }
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
          >
            <option value="">All materials</option>
            {options.materials.map((material) => (
              <option key={material} value={material}>
                {material}
              </option>
            ))}
          </select>
        </label>

        <label className="grid gap-2 text-sm font-medium text-[color:var(--ink)]">
          Employee
          <select
            value={formValues.employee}
            onChange={(event) =>
              setFormValues((current) => ({ ...current, employee: event.target.value }))
            }
            className="min-h-11 rounded-2xl border border-[color:var(--border)] bg-white px-4 text-sm text-[color:var(--ink)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]/40"
          >
            <option value="">All employees</option>
            {options.employees.map((employee) => (
              <option key={employee} value={employee}>
                {employee}
              </option>
            ))}
          </select>
        </label>

        <div className="md:col-span-2 xl:col-span-5">
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--signal)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--signal-strong)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? "Applying..." : "Apply Filters"}
          </button>
        </div>
      </form>
    </section>
  );
}
