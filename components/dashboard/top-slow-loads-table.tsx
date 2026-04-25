"use client";

import { formatDurationMinutes, formatSubmittedAt } from "@/lib/dashboard/metrics";
import type { DashboardLoadRecord } from "@/lib/dashboard/types";

interface TopSlowLoadsTableProps {
  rows: DashboardLoadRecord[];
  onPreview?: (checkInId: string) => void;
}

export function TopSlowLoadsTable({ rows, onPreview }: TopSlowLoadsTableProps) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Top Slow Loads</p>
        <p className="text-xs text-[color:var(--muted)]">Sorted by longest time on site</p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          No valid duration records are available for the current filter range.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-soft)]">
                <th className="border-b border-[color:var(--border)] px-3 py-3">Ticket Number</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Vendor</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Material</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Time On Site</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Submitted At</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-[color:var(--ink)]">
                  <td className="border-b border-[color:var(--border)] px-3 py-3 font-medium">
                    {row.ticketNumber || "-"}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    {row.vendorDisplay}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    {row.materialDisplay}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3 font-semibold">
                    {formatDurationMinutes(row.durationMinutes)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3 text-[color:var(--muted)]">
                    {formatSubmittedAt(row.submittedAt)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    <div className="flex flex-wrap gap-2">
                      {onPreview ? (
                        <button
                          type="button"
                          onClick={() => onPreview(row.id)}
                          className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--panel-soft)] px-3 text-xs font-semibold text-[color:var(--accent)] transition hover:border-[color:var(--accent)]"
                        >
                          Preview
                        </button>
                      ) : null}
                      <a
                        href={`/api/check-ins/${row.id}/workbook`}
                        className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-3 text-xs font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                      >
                        Download Sheet
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
