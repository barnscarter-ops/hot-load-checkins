"use client";

interface SummaryCardProps {
  title: string;
  eyebrow: string;
  items: Array<{ label: string; value: string }>;
}

export function SummaryCard({ title, eyebrow, items }: SummaryCardProps) {
  return (
    <section className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6">
      <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">{title}</h2>
      <dl className="mt-5 grid gap-3">
        {items.map((item) => (
          <div
            key={item.label}
            className="rounded-[1.2rem] border border-[color:var(--border)] bg-white px-4 py-3"
          >
            <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--muted-soft)]">
              {item.label}
            </dt>
            <dd className="mt-1 text-sm font-medium text-[color:var(--ink)]">{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
