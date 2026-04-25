"use client";

import { formatDurationMinutes, formatSubmittedAt } from "@/lib/dashboard/metrics";
import type { DashboardLoadRecord } from "@/lib/dashboard/types";

interface DateCheckInListProps {
  selectedDate: string;
  rows: DashboardLoadRecord[];
  onSelect: (checkInId: string) => void;
}

export function DateCheckInList({
  selectedDate,
  rows,
  onSelect,
}: DateCheckInListProps) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-[color:var(--ink)]">
            Check-Ins For Selected Date
          </p>
          <p className="mt-1 text-xs text-[color:var(--muted)]">
            Showing records dated or submitted on {selectedDate || "the selected day"}.
          </p>
        </div>
        <span className="rounded-full bg-[color:var(--panel-soft)] px-3 py-1 text-xs font-semibold text-[color:var(--muted)]">
          {rows.length} result{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          No check-ins matched that day. Try another date or widen the dashboard range.
        </p>
      ) : (
        <div className="mt-4 space-y-3">
          {rows.map((row) => (
            <button
              key={row.id}
              type="button"
              onClick={() => onSelect(row.id)}
              className="grid w-full gap-3 rounded-[1.2rem] border border-[color:var(--border)] bg-white px-4 py-4 text-left transition hover:border-[color:var(--accent)] hover:shadow-[0_10px_24px_rgba(12,28,45,0.08)] md:grid-cols-[1fr_1fr_1fr_auto_auto]"
            >
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
                  Ticket Number
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                  {row.ticketNumber || "-"}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
                  Vendor
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">{row.vendorDisplay}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
                  Material
                </p>
                <p className="mt-1 text-sm text-[color:var(--ink)]">{row.materialDisplay}</p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
                  Time On Site
                </p>
                <p className="mt-1 text-sm font-semibold text-[color:var(--ink)]">
                  {formatDurationMinutes(row.durationMinutes)}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
                  Submitted At
                </p>
                <p className="mt-1 text-sm text-[color:var(--muted)]">
                  {formatSubmittedAt(row.submittedAt)}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}
