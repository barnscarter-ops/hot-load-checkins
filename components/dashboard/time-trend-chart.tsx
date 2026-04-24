import type { DashboardTrendPoint } from "@/lib/dashboard/types";
import { formatDurationMinutes } from "@/lib/dashboard/metrics";

interface TimeTrendChartProps {
  points: DashboardTrendPoint[];
  granularityLabel: string;
}

export function TimeTrendChart({ points, granularityLabel }: TimeTrendChartProps) {
  const validPoints = points.filter((point) => point.averageMinutes !== null);
  const maxValue = validPoints.length > 0 ? Math.max(...validPoints.map((point) => point.averageMinutes as number)) : 0;

  if (validPoints.length === 0) {
    return (
      <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Time On Site Trend</p>
        <p className="mt-3 text-sm leading-6 text-[color:var(--muted)]">
          No valid duration data is available for the current filter range.
        </p>
      </section>
    );
  }

  const width = 640;
  const height = 220;
  const paddingX = 32;
  const paddingY = 24;
  const chartWidth = width - paddingX * 2;
  const chartHeight = height - paddingY * 2;
  const path = validPoints
    .map((point, index) => {
      const x = paddingX + (index / Math.max(validPoints.length - 1, 1)) * chartWidth;
      const y =
        height -
        paddingY -
        ((point.averageMinutes as number) / Math.max(maxValue, 1)) * chartHeight;
      return `${index === 0 ? "M" : "L"} ${x} ${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-[1.8rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-[color:var(--ink)]">Time On Site Trend</p>
        <p className="text-xs text-[color:var(--muted)]">
          Average duration by {granularityLabel}
        </p>
      </div>

      <div className="mt-4 overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="min-w-[620px]">
          <path
            d={path}
            fill="none"
            stroke="var(--color, #1d6f6a)"
            strokeWidth="3"
            style={{ color: "var(--signal)" }}
          />
          {validPoints.map((point, index) => {
            const x = paddingX + (index / Math.max(validPoints.length - 1, 1)) * chartWidth;
            const y =
              height -
              paddingY -
              ((point.averageMinutes as number) / Math.max(maxValue, 1)) * chartHeight;

            return (
              <g key={point.label}>
                <circle cx={x} cy={y} r="4" fill="var(--accent)" />
                <text
                  x={x}
                  y={height - 4}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--muted)"
                >
                  {point.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="mt-4 flex flex-wrap gap-3 text-xs text-[color:var(--muted)]">
        <span>Peak average: {formatDurationMinutes(maxValue)}</span>
        <span>{validPoints.length} plotted points</span>
      </div>
    </section>
  );
}
