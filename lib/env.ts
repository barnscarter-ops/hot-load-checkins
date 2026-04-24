import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  CHECKIN_STORAGE_BUCKET: z.string().min(1).default("hot-load-check-ins"),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().min(1).default("gpt-4.1-mini"),
  CHECKIN_EMAIL_FROM: z.string().email().optional(),
  CHECKIN_EMAIL_TO: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z
    .string()
    .optional()
    .transform((value) => (value ? Number(value) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z
    .string()
    .optional()
    .transform((value) => value === "true"),
});

function decodeJwtPayload(token: string) {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const base64Value = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padding = base64Value.length % 4 ? "=".repeat(4 - (base64Value.length % 4)) : "";

    return JSON.parse(Buffer.from(`${base64Value}${padding}`, "base64").toString("utf8")) as {
      ref?: string;
    };
  } catch {
    return null;
  }
}

export function getServerEnv() {
  const env = serverEnvSchema.parse(process.env);

  if (env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const payload = decodeJwtPayload(env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    const expectedProjectRef = payload?.ref;
    const configuredProjectRef = new URL(env.NEXT_PUBLIC_SUPABASE_URL).hostname.split(".")[0];

    if (expectedProjectRef && configuredProjectRef !== expectedProjectRef) {
      throw new Error(
        `NEXT_PUBLIC_SUPABASE_URL host "${configuredProjectRef}" does not match the Supabase project ref "${expectedProjectRef}" embedded in NEXT_PUBLIC_SUPABASE_ANON_KEY.`,
      );
    }
  }

  return env;
}

export function getEmailEnv() {
  const env = getServerEnv();
  const hasResend = Boolean(env.RESEND_API_KEY);
  const hasSmtp =
    Boolean(env.SMTP_HOST) &&
    typeof env.SMTP_PORT === "number" &&
    Boolean(env.SMTP_USER) &&
    Boolean(env.SMTP_PASS);

  if (!env.CHECKIN_EMAIL_FROM || !env.CHECKIN_EMAIL_TO) {
    throw new Error("Set CHECKIN_EMAIL_FROM and CHECKIN_EMAIL_TO before sending email.");
  }

  if (!hasResend && !hasSmtp) {
    throw new Error("Configure either Resend or SMTP for outgoing email.");
  }

  return env as typeof env & {
    CHECKIN_EMAIL_FROM: string;
    CHECKIN_EMAIL_TO: string;
  };
}
