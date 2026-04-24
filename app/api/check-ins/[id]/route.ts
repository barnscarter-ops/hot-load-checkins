import { NextResponse } from "next/server";

import { getCheckInById } from "@/lib/check-ins/repository";
import {
  getLowConfidenceFields,
  getMissingRequiredFields,
} from "@/lib/check-ins/schema";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: RouteContext<"/api/check-ins/[id]">,
) {
  try {
    const { id } = await context.params;
    const checkIn = await getCheckInById(id);

    if (!checkIn) {
      return NextResponse.json({ error: "Check-in not found." }, { status: 404 });
    }

    return NextResponse.json({
      checkIn,
      missingRequired: getMissingRequiredFields(checkIn.fields),
      lowConfidenceFields: getLowConfidenceFields(checkIn.confidenceByField),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
