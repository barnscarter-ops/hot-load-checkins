import type { DashboardAverageGroup } from "@/lib/dashboard/types";
import { formatDurationMinutes } from "@/lib/dashboard/metrics";

interface AverageByVendorChartProps {
  groups: DashboardAverageGroup[];
}

export function AverageByVendorChart({ groups }: AverageByVendorChartProps) {
  const maxValue = Math.max(...groups.map((group) => group.averageMinutes), 0);

  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Average Time By Vendor</p>
        <p className="text-xs text-[color:var(--muted)]">Top groups in current range</p>
      </div>

      {groups.length === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          No vendor duration data is available for this range.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {groups.map((group) => (
            <div key={group.label} className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-[color:var(--ink)]">{group.label}</p>
                <p className="text-xs text-[color:var(--muted)]">
                  {formatDurationMinutes(Math.round(group.averageMinutes))} avg | {group.count} loads
                </p>
              </div>
              <div className="h-3 rounded-full bg-[color:var(--panel-soft)]">
                <div
                  className="h-3 rounded-full bg-[linear-gradient(90deg,rgba(29,111,106,0.9),rgba(160,77,31,0.9))]"
                  style={{
                    width: `${Math.max((group.averageMinutes / Math.max(maxValue, 1)) * 100, 8)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
