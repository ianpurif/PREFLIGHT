export const LEDGER_GATE_ERROR_CODES = Object.freeze([
  "UNSUPPORTED_BROWSER",
  "DEVICE_CONNECTION_FAILED",
  "DEVICE_DISCONNECTED",
  "ETHEREUM_APP_UNAVAILABLE",
  "UNAUTHORIZED_SIGNER",
  "CLEAR_SIGNING_UNAVAILABLE",
  "HUMAN_REJECTED",
  "SIGNING_FAILED",
  "MALFORMED_SIGNATURE",
] as const);

export type LedgerGateErrorCode = (typeof LEDGER_GATE_ERROR_CODES)[number];

export class LedgerGateError extends Error {
  readonly code: LedgerGateErrorCode;

  constructor(code: LedgerGateErrorCode, message: string) {
    super(message);
    this.name = "LedgerGateError";
    this.code = code;
  }
}

export function failLedger(code: LedgerGateErrorCode, message: string): never {
  throw new LedgerGateError(code, message);
}

export function normalizeLedgerError(error: unknown): LedgerGateError {
  if (error instanceof LedgerGateError) return error;
  const errorCode =
    error !== null && typeof error === "object" && "errorCode" in error
      ? String(error.errorCode).toLowerCase()
      : "";
  if (["6982", "6985", "5515"].includes(errorCode)) {
    return new LedgerGateError("HUMAN_REJECTED", "The human rejected the request on Ledger");
  }
  return new LedgerGateError("SIGNING_FAILED", "Ledger signing failed closed");
}
