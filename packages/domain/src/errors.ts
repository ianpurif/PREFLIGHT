export const PROTOCOL_ERROR_CODES = Object.freeze([
  "INVALID_IDENTIFIER",
  "MALFORMED_OBJECT",
  "UNSUPPORTED_VERSION",
  "CANONICALIZATION_FAILURE",
  "DIGEST_MISMATCH",
  "INVALID_EXPIRY",
  "MISSING_REQUIRED_BINDING",
  "BINDING_MISMATCH",
] as const);

export type ProtocolErrorCode = (typeof PROTOCOL_ERROR_CODES)[number];

/** A stable, value-redacted failure raised at a protocol boundary. */
export class ProtocolError extends Error {
  readonly code: ProtocolErrorCode;
  readonly path?: string;

  constructor(code: ProtocolErrorCode, message: string, path?: string) {
    super(message);
    this.name = "ProtocolError";
    this.code = code;
    if (path !== undefined) this.path = path;
  }
}

export function failProtocol(code: ProtocolErrorCode, message: string, path?: string): never {
  throw new ProtocolError(code, message, path);
}
