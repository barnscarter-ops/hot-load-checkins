import { formatDurationMinutes, formatSubmittedAt } from "@/lib/dashboard/metrics";
import type { DashboardLoadRecord } from "@/lib/dashboard/types";

interface ProblemLoadsTableProps {
  rows: DashboardLoadRecord[];
}

function getStatusClassName(status: string) {
  if (status === "failed") {
    return "bg-[color:var(--danger-bg)] text-[color:var(--danger)]";
  }

  if (status === "processing") {
    return "bg-[color:var(--warn-bg)] text-[color:var(--warn)]";
  }

  return "bg-[color:var(--panel-soft)] text-[color:var(--muted)]";
}

export function ProblemLoadsTable({ rows }: ProblemLoadsTableProps) {
  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Problem Loads</p>
        <p className="text-xs text-[color:var(--muted)]">
          Delays and failed downstream actions
        </p>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          No delayed or failed loads were found for the current filter range.
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0 text-left text-sm">
            <thead>
              <tr className="text-[11px] uppercase tracking-[0.2em] text-[color:var(--muted-soft)]">
                <th className="border-b border-[color:var(--border)] px-3 py-3">Ticket Number</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Vendor</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Time On Site</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Delay Flag</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Export Status</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Email Status</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Submitted At</th>
                <th className="border-b border-[color:var(--border)] px-3 py-3">Sheet</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="text-[color:var(--ink)]">
                  <td className="border-b border-[color:var(--border)] px-3 py-3 font-medium">
                    {row.ticketNumber || "—"}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    {row.vendorDisplay}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3 font-semibold">
                    {formatDurationMinutes(row.durationMinutes)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    <span
                      className={
                        row.delayFlag === "Yes"
                          ? "rounded-full bg-[color:var(--danger-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--danger)]"
                          : row.delayFlag === "Unknown"
                            ? "rounded-full bg-[color:var(--warn-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--warn)]"
                            : "rounded-full bg-[color:var(--success-bg)] px-3 py-1 text-xs font-semibold text-[color:var(--success)]"
                      }
                    >
                      {row.delayFlag}
                    </span>
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(row.exportStatus)}`}>
                      {row.exportStatus}
                    </span>
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusClassName(row.emailStatus)}`}>
                      {row.emailStatus}
                    </span>
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3 text-[color:var(--muted)]">
                    {formatSubmittedAt(row.submittedAt)}
                  </td>
                  <td className="border-b border-[color:var(--border)] px-3 py-3">
                    <a
                      href={`/api/check-ins/${row.id}/workbook`}
                      className="inline-flex min-h-10 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-3 text-xs font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    >
                      Download Sheet
                    </a>
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
