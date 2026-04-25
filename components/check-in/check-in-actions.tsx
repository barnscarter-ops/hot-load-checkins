"use client";

import { useState } from "react";

import { XLSX_MIME_TYPE } from "@/lib/check-ins/constants";
import type { CheckInRecord } from "@/lib/check-ins/types";
import { errorMessage } from "@/lib/utils";

interface CheckInActionsProps {
  checkIn: CheckInRecord;
  onDismiss?: () => void;
}

function buildWorkbookUrl(checkInId: string) {
  return `/api/check-ins/${checkInId}/workbook`;
}

function getShareText(checkIn: CheckInRecord) {
  return `Hot Load Check-In - Ticket ${checkIn.fields.ticketNumber || checkIn.id}`;
}

function parseDownloadFileName(response: Response, fallback: string) {
  const contentDisposition = response.headers.get("content-disposition") ?? "";
  const match = contentDisposition.match(/filename="?([^"]+)"?/i);
  return match?.[1] ?? fallback;
}

export function CheckInActions({ checkIn, onDismiss }: CheckInActionsProps) {
  const [isDownloading, setIsDownloading] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function fetchWorkbookFile() {
    const response = await fetch(buildWorkbookUrl(checkIn.id));

    if (!response.ok) {
      let message = "The workbook could not be generated right now.";

      try {
        const payload = (await response.json()) as { error?: string };
        if (payload.error) {
          message = payload.error;
        }
      } catch {
        // Keep the default user-facing message if the response is not JSON.
      }

      throw new Error(message);
    }

    const blob = await response.blob();
    const fileName = parseDownloadFileName(
      response,
      `hot-load-check-in-ticket-${checkIn.fields.ticketNumber || "check-in"}.xlsx`,
    );

    return { blob, fileName };
  }

  async function handleDownload() {
    setError(null);
    setMessage(null);
    setIsDownloading(true);

    try {
      const { blob, fileName } = await fetchWorkbookFile();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = fileName;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setError(errorMessage(downloadError));
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleShare() {
    setError(null);
    setMessage(null);
    setIsSharing(true);

    const shareTitle = getShareText(checkIn);
    const shareUrl = new URL(buildWorkbookUrl(checkIn.id), window.location.origin).toString();

    try {
      if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
        try {
          const { blob, fileName } = await fetchWorkbookFile();
          const file = new File([blob], fileName, { type: XLSX_MIME_TYPE });

          if (typeof navigator.canShare === "function" && navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: shareTitle,
              text: shareTitle,
              files: [file],
            });
            return;
          }
        } catch (shareFileError) {
          if (
            shareFileError instanceof DOMException &&
            shareFileError.name === "AbortError"
          ) {
            return;
          }
        }

        await navigator.share({
          title: shareTitle,
          text: shareTitle,
          url: shareUrl,
        });
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setMessage("Download link copied");
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === "AbortError") {
        return;
      }

      try {
        await navigator.clipboard.writeText(shareUrl);
        setMessage("Download link copied");
      } catch {
        setError(errorMessage(shareError));
      }
    } finally {
      setIsSharing(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:flex sm:flex-wrap">
        {onDismiss ? (
          <button
            type="button"
            onClick={onDismiss}
            className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--border)] bg-white px-4 text-sm font-semibold text-[color:var(--ink)] transition hover:border-[color:var(--accent)] hover:text-[color:var(--accent)] sm:w-auto"
          >
            Dismiss
          </button>
        ) : null}
        <button
          type="button"
          onClick={handleDownload}
          disabled={isDownloading || isSharing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full bg-[color:var(--ink)] px-5 text-sm font-semibold text-white transition hover:bg-[color:var(--ink-strong)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isDownloading ? "Downloading..." : "Download Excel"}
        </button>
        <button
          type="button"
          onClick={handleShare}
          disabled={isDownloading || isSharing}
          className="inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--panel-soft)] px-5 text-sm font-semibold text-[color:var(--accent)] transition hover:border-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
        >
          {isSharing ? "Sharing..." : "Share"}
        </button>
      </div>

      {message ? (
        <div className="rounded-2xl border border-[color:var(--success)]/25 bg-[color:var(--success-bg)] px-4 py-3 text-sm text-[color:var(--success)]">
          {message}
        </div>
      ) : null}

      {error ? (
        <div className="rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger)]">
          {error}
        </div>
      ) : null}
    </div>
  );
}
