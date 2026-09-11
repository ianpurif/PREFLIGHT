export type ApplicationErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "DUPLICATE_ACCOUNT"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "BUILD_NOT_READY"
  | "BUILD_FAILED"
  | "POLICY_UNAVAILABLE"
  | "EVALUATION_UNAVAILABLE"
  | "PERSISTENCE_UNAVAILABLE";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}
