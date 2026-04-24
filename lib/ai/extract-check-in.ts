import OpenAI from "openai";
import { zodResponseFormat } from "openai/helpers/zod";
import { z } from "zod";

import { CHECK_IN_FIELD_ORDER } from "@/lib/check-ins/constants";
import type {
  CheckInFieldKey,
  CheckInFields,
  ConfidenceMap,
  ConfidenceReasonMap,
} from "@/lib/check-ins/types";
import {
  normalizeConfidenceMap,
  normalizeConfidenceReasons,
  normalizeFields,
} from "@/lib/check-ins/schema";
import { getServerEnv } from "@/lib/env";

const extractedFieldSchema = z.object({
  value: z.string(),
  confidence: z.number().min(0).max(1),
  rationale: z.string(),
});

const extractionSchema = z.object({
  date: extractedFieldSchema,
  ticketNumber: extractedFieldSchema,
  vendor: extractedFieldSchema,
  material: extractedFieldSchema,
  quantity: extractedFieldSchema,
  truckNumber: extractedFieldSchema,
  arrivalTime: extractedFieldSchema,
  departureTime: extractedFieldSchema,
  comments: extractedFieldSchema,
  vehicleNumber: extractedFieldSchema,
  radTicket: extractedFieldSchema,
  harscoEmployee: extractedFieldSchema,
});

export async function extractCheckInFromImages(
  images: Array<{ buffer: Buffer; mimeType: string }>,
): Promise<{
  fields: CheckInFields;
  confidenceByField: ConfidenceMap;
  confidenceReasons: ConfidenceReasonMap;
  rawAiResponse: unknown;
  aiModel: string;
}> {
  const env = getServerEnv();
  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });

  const completion = await client.chat.completions.parse({
    model: env.OPENAI_MODEL,
    temperature: 0,
    messages: [
      {
        role: "system",
        content:
          "You extract truck paperwork for a steel mill check-in workflow. Never guess. If a field cannot be read confidently, return an empty string and a low confidence score. Normalize dates as YYYY-MM-DD when possible. Normalize times as h:mm AM/PM when possible. If the paperwork uses military time, convert it to standard AM/PM time.",
      },
      {
        role: "user",
        content: [
          {
            type: "text",
            text:
              "Extract the required fields from these truck check-in images. If multiple images contain the same value, pick the clearest one. Keep the exact ticket, vendor, material, quantity, truck number, vehicle number, RAD ticket, and HARSCO employee values found in the paperwork. Use comments for any visible notes that would matter for operations.",
          },
          ...images.map((image) => ({
            type: "image_url" as const,
            image_url: {
              url: `data:${image.mimeType};base64,${image.buffer.toString("base64")}`,
              detail: "high" as const,
            },
          })),
        ],
      },
    ],
    response_format: zodResponseFormat(
      extractionSchema,
      "hot_load_check_in_extraction",
    ),
  });

  const parsed = completion.choices[0]?.message.parsed;

  if (!parsed) {
    throw new Error("OpenAI did not return a structured extraction payload.");
  }

  const fields = normalizeFields(
    CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
      accumulator[fieldKey] = parsed[fieldKey].value;
      return accumulator;
    }, {} as Record<CheckInFieldKey, string>),
  );

  const confidenceByField = normalizeConfidenceMap(
    CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
      accumulator[fieldKey] = parsed[fieldKey].confidence;
      return accumulator;
    }, {} as Record<CheckInFieldKey, number>),
  );

  const confidenceReasons = normalizeConfidenceReasons(
    CHECK_IN_FIELD_ORDER.reduce((accumulator, fieldKey) => {
      accumulator[fieldKey] = parsed[fieldKey].rationale;
      return accumulator;
    }, {} as Record<CheckInFieldKey, string>),
  );

  return {
    fields,
    confidenceByField,
    confidenceReasons,
    rawAiResponse: parsed,
    aiModel: env.OPENAI_MODEL,
  };
}
