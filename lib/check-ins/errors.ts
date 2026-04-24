import type { WorkflowFailureStage } from "@/lib/check-ins/types";

export class WorkflowStageError extends Error {
  stage: WorkflowFailureStage;
  retryable: boolean;
  checkInId?: string;
  draftId?: string;
  details?: string;
  statusCode: number;
  cause?: unknown;

  constructor(args: {
    message: string;
    stage: WorkflowFailureStage;
    retryable?: boolean;
    checkInId?: string;
    draftId?: string;
    details?: string;
    statusCode?: number;
    cause?: unknown;
  }) {
    super(args.message);
    this.name = "WorkflowStageError";
    this.stage = args.stage;
    this.retryable = args.retryable ?? true;
    this.checkInId = args.checkInId;
    this.draftId = args.draftId;
    this.details = args.details;
    this.statusCode = args.statusCode ?? 500;
    this.cause = args.cause;
  }
}

export function logWorkflowEvent(
  message: string,
  details: Record<string, unknown>,
) {
  console.info(message, details);
}

export function logWorkflowError(
  message: string,
  details: Record<string, unknown>,
  error?: unknown,
) {
  console.error(message, {
    ...details,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : error,
  });
}
