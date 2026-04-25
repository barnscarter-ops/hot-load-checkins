"use client";

import { useEffect } from "react";

import type { CheckInRecord } from "@/lib/check-ins/types";

import { CheckInActions } from "@/components/check-in/check-in-actions";
import { CheckInPreviewCard } from "@/components/check-in/check-in-preview-card";

interface CheckInPreviewModalProps {
  open: boolean;
  checkIn: CheckInRecord | null;
  loading?: boolean;
  error?: string | null;
  onDismiss: () => void;
}

export function CheckInPreviewModal({
  open,
  checkIn,
  loading = false,
  error = null,
  onDismiss,
}: CheckInPreviewModalProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onDismiss();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onDismiss]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[rgba(12,28,45,0.56)] px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 sm:items-center sm:p-6">
      <div className="flex max-h-[calc(100dvh-1.5rem-env(safe-area-inset-bottom))] w-full max-w-3xl flex-col overflow-hidden rounded-[2rem] border border-white/20 bg-[color:var(--panel)] shadow-[0_30px_90px_rgba(12,28,45,0.32)] sm:max-h-[calc(100dvh-3rem)]">
        <div className="flex items-start justify-between gap-4 border-b border-[color:var(--border)] px-5 py-4 sm:px-6">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent)]">
              Submitted Check-In
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
              Hot Load Check-In Summary
            </h2>
            <p className="mt-1 text-sm text-[color:var(--muted)]">
              Preview the normalized single-truck form, then download or share the Excel sheet.
            </p>
          </div>
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[color:var(--border)] bg-white text-xl text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)]"
            aria-label="Dismiss preview"
          >
            ×
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6">
          {loading ? (
            <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[color:var(--panel-soft)] px-5 py-8 text-sm text-[color:var(--muted)]">
              Loading submitted check-in preview...
            </div>
          ) : error ? (
            <div className="rounded-[1.6rem] border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-5 py-5 text-sm text-[color:var(--danger)]">
              {error}
            </div>
          ) : checkIn ? (
            <div className="space-y-5 pb-4">
              <CheckInPreviewCard checkIn={checkIn} />
            </div>
          ) : (
            <div className="rounded-[1.6rem] border border-[color:var(--border)] bg-[color:var(--panel-soft)] px-5 py-8 text-sm text-[color:var(--muted)]">
              No submitted check-in is available to preview yet.
            </div>
          )}
        </div>

        {checkIn && !loading && !error ? (
          <div className="sticky bottom-0 border-t border-[color:var(--border)] bg-[linear-gradient(180deg,rgba(247,249,251,0.92),rgba(255,255,255,0.98))] px-5 pb-[calc(env(safe-area-inset-bottom)+1rem)] pt-4 shadow-[0_-16px_32px_rgba(12,28,45,0.08)] backdrop-blur sm:px-6 sm:pb-5">
            <CheckInActions checkIn={checkIn} onDismiss={onDismiss} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
