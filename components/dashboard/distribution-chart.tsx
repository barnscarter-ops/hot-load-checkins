import type { DashboardDistributionBucket } from "@/lib/dashboard/types";

interface DistributionChartProps {
  buckets: DashboardDistributionBucket[];
}

export function DistributionChart({ buckets }: DistributionChartProps) {
  const maxCount = Math.max(...buckets.map((bucket) => bucket.count), 0);

  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Time On Site Distribution</p>
        <p className="text-xs text-[color:var(--muted)]">Counts by duration bucket</p>
      </div>

      {maxCount === 0 ? (
        <p className="mt-4 text-sm leading-6 text-[color:var(--muted)]">
          No valid duration data is available for the current filter range.
        </p>
      ) : (
        <div className="mt-6 flex min-h-56 items-end gap-4">
          {buckets.map((bucket) => (
            <div key={bucket.label} className="flex flex-1 flex-col items-center gap-3">
              <div className="text-sm font-semibold text-[color:var(--ink)]">{bucket.count}</div>
              <div className="flex h-40 w-full items-end rounded-t-[1.2rem] bg-[color:var(--panel-soft)] px-2 pb-2">
                <div
                  className="w-full rounded-[0.9rem] bg-[linear-gradient(180deg,rgba(29,111,106,0.85),rgba(23,50,74,0.95))]"
                  style={{
                    height: `${Math.max((bucket.count / Math.max(maxCount, 1)) * 100, 10)}%`,
                  }}
                />
              </div>
              <div className="text-center text-xs font-medium text-[color:var(--muted)]">
                {bucket.label}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
