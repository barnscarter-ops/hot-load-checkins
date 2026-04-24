import Link from "next/link";

import { HotLoadCheckInApp } from "@/components/check-in/hot-load-check-in-app";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="relative overflow-hidden rounded-[2.5rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(234,240,245,0.88))] p-6 shadow-[0_26px_90px_rgba(12,28,45,0.18)] sm:p-8">
        <div className="absolute inset-x-0 top-0 h-40 bg-[radial-gradient(circle_at_top_right,rgba(201,109,43,0.18),transparent_42%),radial-gradient(circle_at_top_left,rgba(32,74,110,0.14),transparent_38%)]" />
        <div className="relative">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full bg-[color:var(--panel-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Internal Operations App
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
              Web-first
            </span>
            <span className="rounded-full border border-[color:var(--border)] bg-white/80 px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
              Multi-image AI extraction
            </span>
          </div>

          <div className="mt-6 max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-tight text-[color:var(--ink)] sm:text-5xl">
              Hot Load Check-In
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-7 text-[color:var(--muted)] sm:text-lg">
              Replace the manual truck paperwork workflow with a mobile-friendly app
              that captures images, extracts structured data with AI, requires review
              before submit, and then writes Excel, updates the master log, and emails
              everything out.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                href="/dashboard"
                className="inline-flex min-h-11 items-center justify-center rounded-full bg-[color:var(--ink)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--ink-strong)]"
              >
                Open Dashboard
              </Link>
              <Link
                href="/recovery"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white/85 px-5 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
              >
                Open Recovery View
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-8">
        <HotLoadCheckInApp />
      </section>
    </main>
  );
}
