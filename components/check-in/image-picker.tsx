"use client";

import { MAX_IMAGE_COUNT } from "@/lib/check-ins/constants";
import { cn } from "@/lib/utils";

interface ImagePickerProps {
  cameraInputId: string;
  uploadInputId: string;
  previews: string[];
  disabled?: boolean;
  isExtracting: boolean;
  error?: {
    title: string;
    message: string;
    details?: string;
  } | null;
  actionLabel?: string;
  onFilesSelected: (files: File[]) => void;
  onExtract: () => void;
}

export function ImagePicker({
  cameraInputId,
  uploadInputId,
  previews,
  disabled,
  isExtracting,
  error,
  actionLabel,
  onFilesSelected,
  onExtract,
}: ImagePickerProps) {
  function handleFileSelection(fileList: FileList | null, resetInput: () => void) {
    const nextFiles = Array.from(fileList ?? []);
    onFilesSelected(nextFiles.slice(0, MAX_IMAGE_COUNT));
    resetInput();
  }

  return (
    <section
      id="image-capture"
      className="rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--panel)] p-5 shadow-[0_22px_60px_rgba(12,28,45,0.14)] sm:p-6"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[color:var(--accent)]">
            Step 1
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--ink)]">
            Capture the truck paperwork
          </h2>
        </div>
        <span className="rounded-full bg-[color:var(--panel-soft)] px-3 py-1 text-xs font-medium text-[color:var(--muted)]">
          Samsung S25 friendly
        </span>
      </div>

      <div
        className={cn(
          "mt-5 flex min-h-44 flex-col items-center justify-center rounded-[1.5rem] border border-dashed border-[color:var(--accent-soft)] bg-[color:var(--panel-soft)] px-5 text-center",
          disabled && "opacity-60",
        )}
      >
        <input
          id={cameraInputId}
          className="hidden"
          type="file"
          accept="image/*"
          capture="environment"
          disabled={disabled}
          onChange={(event) => {
            handleFileSelection(event.target.files, () => {
              event.currentTarget.value = "";
            });
          }}
        />
        <input
          id={uploadInputId}
          className="hidden"
          type="file"
          accept="image/*"
          multiple
          disabled={disabled}
          onChange={(event) => {
            handleFileSelection(event.target.files, () => {
              event.currentTarget.value = "";
            });
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-3">
          <label
            htmlFor={cameraInputId}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full bg-white px-4 py-2 text-sm font-semibold text-[color:var(--accent)] shadow-sm transition hover:border-[color:var(--accent)] hover:bg-[color:var(--panel)]",
              disabled && "pointer-events-none",
            )}
          >
            Take Photo
          </label>
          <label
            htmlFor={uploadInputId}
            className={cn(
              "inline-flex min-h-11 cursor-pointer items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-white px-4 py-2 text-sm font-semibold text-[color:var(--accent)] shadow-sm transition hover:border-[color:var(--accent)] hover:bg-[color:var(--panel)]",
              disabled && "pointer-events-none",
            )}
          >
            Upload From Gallery
          </label>
        </div>
        <p className="mt-4 max-w-sm text-sm leading-6 text-[color:var(--muted)]">
          Take a new paperwork photo or pick one or more existing images from the phone
          gallery or files.
        </p>
        <p className="mt-2 text-xs uppercase tracking-[0.24em] text-[color:var(--muted-soft)]">
          Camera + Gallery Upload
        </p>
        <p className="mt-1 text-xs uppercase tracking-[0.24em] text-[color:var(--muted-soft)]">
          Up to {MAX_IMAGE_COUNT} images from gallery where supported
        </p>
      </div>

      {previews.length > 0 ? (
        <>
          <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[1.25rem] border border-[color:var(--border)] bg-white px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-[color:var(--ink)]">
                {previews.length} image{previews.length === 1 ? "" : "s"} ready
              </p>
              <p className="text-xs text-[color:var(--muted)]">
                Retake or replace from here without leaving the screen.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <label
                htmlFor={cameraInputId}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--warn-bg)] px-4 text-sm font-semibold text-[color:var(--accent)] transition hover:border-[color:var(--accent)] hover:bg-white",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                Take Photo
              </label>
              <label
                htmlFor={uploadInputId}
                className={cn(
                  "inline-flex min-h-11 items-center justify-center rounded-full border border-[color:var(--accent-soft)] bg-[color:var(--warn-bg)] px-4 text-sm font-semibold text-[color:var(--accent)] transition hover:border-[color:var(--accent)] hover:bg-white",
                  disabled && "pointer-events-none opacity-60",
                )}
              >
                Upload More
              </label>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {previews.map((preview, index) => (
              <div
                key={preview}
                className="overflow-hidden rounded-[1.2rem] border border-[color:var(--border)] bg-white"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt={`Check-in upload preview ${index + 1}`}
                  className="h-32 w-full object-cover"
                />
                <div className="px-3 py-2 text-xs font-medium text-[color:var(--muted)]">
                  Image {index + 1}
                </div>
              </div>
            ))}
          </div>
        </>
      ) : null}

      {error ? (
        <div className="mt-4 rounded-2xl border border-[color:var(--danger-border)] bg-[color:var(--danger-bg)] px-4 py-3 text-sm text-[color:var(--danger)]">
          <p className="font-semibold">{error.title}</p>
          <p className="mt-1">{error.message}</p>
          {error.details ? (
            <p className="mt-2 whitespace-pre-line text-xs leading-5 text-[color:var(--danger)]/85">
              Details: {error.details}
            </p>
          ) : null}
        </div>
      ) : null}

      <button
        type="button"
        onClick={onExtract}
        disabled={disabled || previews.length === 0 || isExtracting}
        className="mt-5 inline-flex w-full items-center justify-center rounded-full bg-[color:var(--ink)] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[color:var(--ink-strong)] disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isExtracting ? "Extracting with AI..." : actionLabel || "Run / Refresh AI Extraction"}
      </button>
    </section>
  );
}
