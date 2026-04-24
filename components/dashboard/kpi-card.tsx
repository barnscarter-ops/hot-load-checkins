interface KpiCardProps {
  label: string;
  value: string;
  detail: string;
}

export function KpiCard({ label, value, detail }: KpiCardProps) {
  return (
    <article className="rounded-[1.7rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.12)]">
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
        {label}
      </p>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--ink)]">
        {value}
      </p>
      <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">{detail}</p>
    </article>
  );
}
