import { NextResponse } from "next/server";
import { z } from "zod";

import { WorkflowStageError, logWorkflowError } from "@/lib/check-ins/errors";
import { getCheckInById } from "@/lib/check-ins/repository";
import { checkInFieldKeySchema, validateCheckInFields } from "@/lib/check-ins/schema";
import { submitCheckIn } from "@/lib/check-ins/submission";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";

const submitRequestSchema = z.object({
  checkInId: z.string().uuid("Invalid check-in ID."),
  manuallyEditedFields: z
    .array(checkInFieldKeySchema)
    .default([])
    .transform((fieldKeys) => Array.from(new Set(fieldKeys))),
});

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const parsedRequest = submitRequestSchema.safeParse(payload);
    const validatedFields = validateCheckInFields(payload?.fields);

    if (!validatedFields.success) {
      return NextResponse.json(
        {
          error: "Submitted fields failed validation.",
          fieldErrors: validatedFields.fieldErrors,
        },
        { status: 400 },
      );
    }

    if (!parsedRequest.success) {
      return NextResponse.json(
        {
          error: parsedRequest.error.issues[0]?.message ?? "Invalid submit request.",
          fieldErrors: {},
        },
        { status: 400 },
      );
    }

    const result = await submitCheckIn(
      parsedRequest.data.checkInId,
      validatedFields.data,
      parsedRequest.data.manuallyEditedFields,
    );

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof WorkflowStageError) {
      const checkIn = error.checkInId ? await getCheckInById(error.checkInId) : null;

      return NextResponse.json(
        {
          error: error.message,
          stage: error.stage,
          retryable: error.retryable,
          checkInId: error.checkInId,
          details: error.details,
          checkIn: checkIn ?? undefined,
          fieldErrors: {},
        },
        { status: error.statusCode },
      );
    }

    logWorkflowError(
      "Unhandled submit route failure",
      { stage: "submit_route" },
      error,
    );

    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
