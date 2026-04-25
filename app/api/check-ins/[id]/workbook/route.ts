import { NextResponse } from "next/server";

import { XLSX_MIME_TYPE } from "@/lib/check-ins/constants";
import { logWorkflowError, logWorkflowEvent } from "@/lib/check-ins/errors";
import { getCheckInById } from "@/lib/check-ins/repository";
import { downloadBucketFile } from "@/lib/check-ins/storage";
import {
  buildSingleCheckInWorkbook,
  buildTruckWorkbookDownloadFileName,
} from "@/lib/excel/check-in-workbooks";
import { errorMessage } from "@/lib/utils";

export const runtime = "nodejs";

function buildWorkbookResponse(buffer: Buffer, fileName: string) {
  return new NextResponse(new Uint8Array(buffer), {
    status: 200,
    headers: {
      "Content-Type": XLSX_MIME_TYPE,
      "Content-Disposition": `attachment; filename="${fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(
  _request: Request,
  context: RouteContext<"/api/check-ins/[id]/workbook">,
) {
  const { id } = await context.params;

  try {
    const checkIn = await getCheckInById(id);

    if (!checkIn) {
      return NextResponse.json({ error: "Check-in not found." }, { status: 404 });
    }

    if (checkIn.status !== "submitted") {
      return NextResponse.json(
        { error: "Workbook download is only available for submitted check-ins." },
        { status: 400 },
      );
    }

    const fileName = buildTruckWorkbookDownloadFileName(checkIn.fields, checkIn.id);

    if (checkIn.excelFilePath) {
      const storedWorkbook = await downloadBucketFile(checkIn.excelFilePath, {
        allowMissing: true,
      });

      if (storedWorkbook) {
        logWorkflowEvent("Hot Load Check-In workbook download", {
          checkInId: checkIn.id,
          source: "storage",
          excelFilePath: checkIn.excelFilePath,
        });

        return buildWorkbookResponse(storedWorkbook, fileName);
      }
    }

    const workbookBuffer = await buildSingleCheckInWorkbook({
      fields: checkIn.fields,
      submittedAt: checkIn.submittedAt,
      reviewStatus: checkIn.reviewStatus,
      manuallyEditedFields: checkIn.manuallyEditedFields,
      exportGeneratedAt: new Date().toISOString(),
    });

    logWorkflowEvent("Hot Load Check-In workbook download", {
      checkInId: checkIn.id,
      source: "regenerated",
    });

    return buildWorkbookResponse(workbookBuffer, fileName);
  } catch (error) {
    logWorkflowError(
      "Hot Load Check-In workbook download failed",
      {
        checkInId: id,
        stage: "excel_generation",
      },
      error,
    );

    return NextResponse.json(
      {
        error:
          "We couldn't build the individual check-in workbook right now. Please try again.",
        details: errorMessage(error),
      },
      { status: 500 },
    );
  }
}
