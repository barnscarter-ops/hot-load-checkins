import { listRecentCheckIns } from "@/lib/check-ins/repository";
import { formatDateTimeForDisplay } from "@/lib/date-time";

export const runtime = "nodejs";

export default async function RecoveryPage() {
  let checkIns: Awaited<ReturnType<typeof listRecentCheckIns>> = [];
  let loadError: string | null = null;

  try {
    checkIns = await listRecentCheckIns(20);
  } catch (error) {
    loadError = error instanceof Error ? error.message : "Unknown recovery view error.";
  }

  return (
    <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col px-4 py-8 sm:px-6 lg:px-8">
      <section className="rounded-[2.5rem] border border-white/50 bg-[linear-gradient(145deg,rgba(255,255,255,0.92),rgba(234,240,245,0.88))] p-6 shadow-[0_26px_90px_rgba(12,28,45,0.18)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
          Recovery View
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[color:var(--ink)] sm:text-4xl">
          Recent Hot Load Check-Ins
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-[color:var(--muted)] sm:text-base">
          Use this page to verify recent draft and submitted records, especially after
          export or email failures. Postgres remains the source of truth.
        </p>
      </section>

      {loadError ? (
        <section className="mt-8 rounded-[2rem] border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] p-6 shadow-[0_18px_48px_rgba(12,28,45,0.14)]">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--danger)]">
            Recovery View Error
          </p>
          <h2 className="mt-3 text-2xl font-semibold text-[color:var(--ink)]">
            We couldn&apos;t load recent check-ins
          </h2>
          <p className="mt-3 text-sm leading-7 text-[color:var(--danger)]">{loadError}</p>
        </section>
      ) : (
        <section className="mt-8 grid gap-4">
          {checkIns.length === 0 ? (
            <div className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 text-sm text-[color:var(--muted)] shadow-[0_18px_48px_rgba(12,28,45,0.14)]">
              No recent check-ins yet.
            </div>
          ) : (
            checkIns.map((checkIn) => (
              <article
                key={checkIn.id}
                className="rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_18px_48px_rgba(12,28,45,0.14)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[color:var(--accent)]">
                      Check-In ID
                    </p>
                    <h2 className="mt-2 break-all text-lg font-semibold text-[color:var(--ink)]">
                      {checkIn.id}
                    </h2>
                  </div>
                  <span className="rounded-full border border-[color:var(--border)] bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--muted)]">
                    {checkIn.status}
                  </span>
                </div>

                <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {[
                    ["Review", checkIn.reviewStatus],
                    ["Submit", checkIn.submissionStatus],
                    ["Export", checkIn.exportStatus],
                    ["Email", checkIn.emailStatus],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-[1.1rem] border border-[color:var(--border)] bg-white px-4 py-3"
                    >
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-soft)]">
                        {label}
                      </p>
                      <p className="mt-2 text-sm font-semibold capitalize text-[color:var(--ink)]">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[1.1rem] border border-[color:var(--border)] bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-soft)]">
                      Error Message
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      {checkIn.errorMessage || "None"}
                    </p>
                  </div>

                  <div className="rounded-[1.1rem] border border-[color:var(--border)] bg-white px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[color:var(--muted-soft)]">
                      Submitted At
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[color:var(--muted)]">
                      {checkIn.submittedAt ? formatDateTimeForDisplay(checkIn.submittedAt) : "Not submitted"}
                    </p>
                  </div>
                </div>

                {checkIn.status === "submitted" ? (
                  <div className="mt-4">
                    <a
                      href={`/api/check-ins/${checkIn.id}/workbook`}
                      className="inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
                    >
                      Download Check-In Sheet
                    </a>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </section>
      )}
    </main>
  );
}
