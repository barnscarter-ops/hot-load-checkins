"use client";

import type { ReactNode } from "react";

import { getManualEditsDisplay, getTimeOnSiteDisplay, getDelayFlag, formatCheckInFieldValue, formatSubmittedAtForDisplay } from "@/lib/check-ins/formatters";
import type { CheckInRecord } from "@/lib/check-ins/types";

interface CheckInPreviewCardProps {
  checkIn: CheckInRecord;
}

function PreviewRow({
  label,
  value,
  emphasized = false,
  wrap = false,
  tone = "default",
}: {
  label: string;
  value: string;
  emphasized?: boolean;
  wrap?: boolean;
  tone?: "default" | "success" | "warning" | "danger";
}) {
  const toneClassName =
    tone === "danger"
      ? "bg-[color:var(--danger-bg)] text-[color:var(--danger)]"
      : tone === "warning"
        ? "bg-[color:var(--warn-bg)] text-[color:var(--warn)]"
        : tone === "success"
          ? "bg-[color:var(--success-bg)] text-[color:var(--success)]"
          : "bg-white text-[color:var(--ink)]";

  return (
    <div className="grid grid-cols-[minmax(0,11rem)_minmax(0,1fr)] rounded-xl border border-[color:var(--border)] overflow-hidden">
      <div className="bg-[color:var(--panel-soft)] px-4 py-3 text-sm font-semibold text-[color:var(--ink)]">
        {label}
      </div>
      <div
        className={`px-4 py-3 text-sm ${toneClassName} ${emphasized ? "font-semibold" : "font-medium"} ${wrap ? "whitespace-pre-wrap break-words" : ""}`}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function PreviewSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-3">
      <div className="rounded-xl bg-[color:var(--ink)] px-4 py-3 text-center text-sm font-semibold uppercase tracking-[0.2em] text-white">
        {title}
      </div>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function CheckInPreviewCard({ checkIn }: CheckInPreviewCardProps) {
  const { fields } = checkIn;
  const timeOnSite = getTimeOnSiteDisplay(fields);
  const delayFlag = getDelayFlag(fields);
  const delayTone =
    delayFlag === "Yes" ? "danger" : delayFlag === "Unknown" ? "warning" : "success";

  return (
    <div className="rounded-[1.8rem] border border-[color:var(--border)] bg-[linear-gradient(145deg,rgba(255,255,255,0.98),rgba(239,243,247,0.95))] p-4 shadow-[0_18px_48px_rgba(12,28,45,0.14)] sm:p-5">
      <div className="border-b border-[color:var(--border)] pb-4 text-center">
        <p className="text-xl font-semibold tracking-[0.04em] text-[color:var(--ink)] sm:text-2xl">
          HOT LOAD CHECK-IN
        </p>
        <p className="mt-1 text-sm italic text-[color:var(--muted)]">Gerdau - Manager</p>
      </div>

      <div className="mt-5 space-y-5">
        <PreviewSection title="Load Details">
          <PreviewRow label="Ticket Number" value={formatCheckInFieldValue("ticketNumber", fields.ticketNumber)} />
          <PreviewRow label="Date" value={formatCheckInFieldValue("date", fields.date)} />
          <PreviewRow label="Vendor" value={formatCheckInFieldValue("vendor", fields.vendor)} />
          <PreviewRow label="Employee" value={formatCheckInFieldValue("harscoEmployee", fields.harscoEmployee)} />
          <PreviewRow label="Material" value={formatCheckInFieldValue("material", fields.material)} />
          <PreviewRow label="Load Weight" value={formatCheckInFieldValue("quantity", fields.quantity)} emphasized />
        </PreviewSection>

        <PreviewSection title="Vehicle Details">
          <PreviewRow label="Truck Number" value={formatCheckInFieldValue("truckNumber", fields.truckNumber)} />
          <PreviewRow label="Vehicle Number" value={formatCheckInFieldValue("vehicleNumber", fields.vehicleNumber)} />
          <PreviewRow label="RAD Ticket" value={formatCheckInFieldValue("radTicket", fields.radTicket)} />
        </PreviewSection>

        <PreviewSection title="Timing">
          <PreviewRow label="Arrival Time" value={formatCheckInFieldValue("arrivalTime", fields.arrivalTime)} />
          <PreviewRow label="Departure Time" value={formatCheckInFieldValue("departureTime", fields.departureTime)} />
          <PreviewRow label="Time On Site" value={timeOnSite} emphasized tone={delayTone} />
          <PreviewRow label="Delay Flag" value={delayFlag} emphasized tone={delayTone} />
        </PreviewSection>

        <PreviewSection title="Notes">
          <PreviewRow label="Comments" value={fields.comments.trim() || "—"} wrap />
        </PreviewSection>

        <PreviewSection title="System Info">
          <PreviewRow label="Submitted At" value={formatSubmittedAtForDisplay(checkIn.submittedAt)} />
          <PreviewRow label="Review Status" value={checkIn.reviewStatus} />
          <PreviewRow label="Manual Edits" value={getManualEditsDisplay(checkIn.manuallyEditedFields)} wrap />
        </PreviewSection>
      </div>
    </div>
  );
}
