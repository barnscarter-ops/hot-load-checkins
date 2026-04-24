import { buildMasterExportFileName, buildMasterWorkbook } from "@/lib/excel/check-in-workbooks";
import { WorkflowStageError, logWorkflowError } from "@/lib/check-ins/errors";
import { listSubmittedCheckInFields } from "@/lib/check-ins/repository";
import { XLSX_MIME_TYPE } from "@/lib/check-ins/constants";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await listSubmittedCheckInFields();
    const workbook = await buildMasterWorkbook(rows);
    const fileName = buildMasterExportFileName();

    return new Response(workbook, {
      status: 200,
      headers: {
        "Content-Type": XLSX_MIME_TYPE,
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    logWorkflowError(
      "Master export generation failed",
      { stage: "master_export" },
      error,
    );

    const workflowError =
      error instanceof WorkflowStageError
        ? error
        : new WorkflowStageError({
            message:
              "We couldn't build the master export right now. Please try again.",
            stage: "master_export",
            retryable: true,
            cause: error,
          });

    return Response.json(
      {
        error: workflowError.message,
        stage: workflowError.stage,
        retryable: workflowError.retryable,
      },
      { status: workflowError.statusCode },
    );
  }
}
