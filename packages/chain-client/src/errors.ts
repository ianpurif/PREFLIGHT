export const RELEASE_GATE_ERROR_CODES = Object.freeze([
  "MALFORMED_REQUEST",
  "WRONG_CHAIN",
  "REGISTRY_UNAVAILABLE",
  "CLEARANCE_NOT_FOUND",
  "CLEARANCE_NOT_CLEAR",
  "CLEARANCE_REVOKED",
  "CLEARANCE_EXPIRED",
  "CLEARANCE_BINDING_MISMATCH",
  "UNAUTHORIZED_SIGNER",
  "NONCE_NOT_FOUND",
  "REPLAY_REJECTED",
  "INTENT_EXPIRED",
  "MALFORMED_SIGNATURE",
  "SIGNATURE_MISMATCH",
  "CLEARANCE_INVALIDATED",
  "PERSISTENCE_UNAVAILABLE",
] as const);

export type ReleaseGateErrorCode = (typeof RELEASE_GATE_ERROR_CODES)[number];

/** Stable, redacted failure for the deterministic P5 release boundary. */
export class ReleaseGateError extends Error {
  readonly code: ReleaseGateErrorCode;

  constructor(code: ReleaseGateErrorCode, message: string) {
    super(message);
    this.name = "ReleaseGateError";
    this.code = code;
  }
}

export function failRelease(code: ReleaseGateErrorCode, message: string): never {
  throw new ReleaseGateError(code, message);
}
