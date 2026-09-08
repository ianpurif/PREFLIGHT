export type ApplicationErrorCode =
  | "AUTH_REQUIRED"
  | "INVALID_CREDENTIALS"
  | "DUPLICATE_ACCOUNT"
  | "INVALID_INPUT"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "CONFLICT"
  | "POLICY_UNAVAILABLE"
  | "PERSISTENCE_UNAVAILABLE";

export class ApplicationError extends Error {
  readonly code: ApplicationErrorCode;

  constructor(code: ApplicationErrorCode, message: string) {
    super(message);
    this.name = "ApplicationError";
    this.code = code;
  }
}
