import { NextResponse } from "next/server";

import { listRecentCheckIns } from "@/lib/check-ins/repository";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const limit = Math.min(
      50,
      Math.max(1, Number.parseInt(url.searchParams.get("limit") ?? "12", 10) || 12),
    );

    const checkIns = await listRecentCheckIns(limit);

    return NextResponse.json({
      checkIns: checkIns.map((checkIn) => ({
        id: checkIn.id,
        status: checkIn.status,
        reviewStatus: checkIn.reviewStatus,
        submissionStatus: checkIn.submissionStatus,
        exportStatus: checkIn.exportStatus,
        emailStatus: checkIn.emailStatus,
        errorMessage: checkIn.errorMessage,
        submittedAt: checkIn.submittedAt,
      })),
    });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 500 });
  }
}
