import nodemailer from "nodemailer";
import { Resend } from "resend";

import { FIELD_LABELS } from "@/lib/check-ins/constants";
import type { CheckInFields } from "@/lib/check-ins/types";
import { getEmailEnv } from "@/lib/env";

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType: string;
}

function buildSummaryHtml(fields: CheckInFields) {
  const rows = Object.entries(fields)
    .map(([fieldKey, value]) => {
      const label = FIELD_LABELS[fieldKey as keyof CheckInFields];
      return `<tr><td style="padding:8px 12px;font-weight:600;border-bottom:1px solid #d7dee7;">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #d7dee7;">${value}</td></tr>`;
    })
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#17324a;">
      <h2 style="margin-bottom:8px;">Hot Load Check-In Summary</h2>
      <p style="margin-top:0;">Truck paperwork has been captured, reviewed, and submitted.</p>
      <table style="border-collapse:collapse;width:100%;max-width:720px;background:#ffffff;border:1px solid #d7dee7;">
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function buildSummaryText(fields: CheckInFields) {
  return Object.entries(fields)
    .map(
      ([fieldKey, value]) =>
        `${FIELD_LABELS[fieldKey as keyof CheckInFields]}: ${value}`,
    )
    .join("\n");
}

export async function sendCheckInEmail(args: {
  fields: CheckInFields;
  attachments: EmailAttachment[];
}) {
  const env = getEmailEnv();
  const subject = `Truck Check-In – ${args.fields.ticketNumber} – ${args.fields.vendor}`;
  const html = buildSummaryHtml(args.fields);
  const text = buildSummaryText(args.fields);
  const recipients = env.CHECKIN_EMAIL_TO.split(",")
    .map((email) => email.trim())
    .filter(Boolean);

  if (env.RESEND_API_KEY) {
    const resend = new Resend(env.RESEND_API_KEY);
    const result = await resend.emails.send({
      from: env.CHECKIN_EMAIL_FROM,
      to: recipients,
      subject,
      html,
      text,
      attachments: args.attachments.map((attachment) => ({
        filename: attachment.filename,
        content: attachment.content,
        contentType: attachment.contentType,
      })),
    });

    if (result.error) {
      throw new Error(`Resend email failed: ${result.error.message}`);
    }

    return { provider: "resend" as const };
  }

  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? false,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transport.sendMail({
    from: env.CHECKIN_EMAIL_FROM,
    to: recipients.join(", "),
    subject,
    html,
    text,
    attachments: args.attachments.map((attachment) => ({
      filename: attachment.filename,
      content: attachment.content,
      contentType: attachment.contentType,
    })),
  });

  return { provider: "smtp" as const };
}
