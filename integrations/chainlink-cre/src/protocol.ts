import { sha256 } from "@noble/hashes/sha2.js";
import {
  canonicalBytes,
  digestRobotBuild,
  type EvaluationRequest,
  type EvaluationResult,
  PROTOCOL_VERSION,
  parseEvaluationRequest,
  parseRobotBuildDescriptor,
  parseSha256Digest,
  parseUnixTimestamp,
  type RobotBuildDescriptor,
  type Sha256Digest,
  type UnixTimestamp,
} from "@preflight/domain";
import {
  type ConfidentialEvaluationEnvelope,
  parseConfidentialEvaluationEnvelope,
  parseRobotBehaviorTraceSuite,
  type RobotBehaviorTraceSuite,
  WAREHOUSE_EVALUATOR_VERSION,
} from "@preflight/simulation-core";

export const CRE_PUBLIC_REQUEST_VERSION = "preflight.cre-public-evaluation-request/v1" as const;
export const CRE_CONFIDENTIAL_INPUT_VERSION =
  "preflight.cre-confidential-evaluation-input/v1" as const;
export const CRE_PUBLIC_RESULT_VERSION = "preflight.cre-public-evaluation-result/v1" as const;
export const CRE_PUBLIC_ERROR_VERSION = "preflight.cre-public-evaluation-error/v1" as const;
export const SYNTHETIC_TRACE_PROVENANCE = "SYNTHETIC_CALLER_SUPPLIED" as const;
export const CONFIDENTIAL_INPUT_SECRET_ID = "PREFLIGHT_CONFIDENTIAL_EVALUATION_INPUT" as const;
export const MAX_PUBLIC_PAYLOAD_BYTES = 128 * 1024;
export const MAX_CONFIDENTIAL_PAYLOAD_BYTES = 2 * 1024;

const BEHAVIOR_INPUT_DIGEST_DOMAIN = "preflight.digest.cre-behavior-input/v1" as const;

export type CrePublicFailureCode =
  | "MALFORMED_PUBLIC_INPUT"
  | "CONFIDENTIAL_INPUT_UNAVAILABLE"
  | "MALFORMED_CONFIDENTIAL_INPUT"
  | "UNSUPPORTED_VERSION"
  | "CONFIDENTIAL_EVALUATION_REJECTED"
  | "CONFIDENTIAL_HANDLER_FAILURE";

export interface CrePublicEvaluationRequest {
  readonly schemaVersion: typeof CRE_PUBLIC_REQUEST_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly behaviorInputDigest: Sha256Digest;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}

export interface CreConfidentialEvaluationInput {
  readonly schemaVersion: typeof CRE_CONFIDENTIAL_INPUT_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly confidentialEnvelope: ConfidentialEvaluationEnvelope;
  readonly envelopeBlindingSecret: Uint8Array;
}

export interface CrePublicEvaluationSuccess {
  readonly schemaVersion: typeof CRE_PUBLIC_RESULT_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly status: "EVALUATED";
  readonly result: EvaluationResult;
  readonly behaviorInputDigest: Sha256Digest;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
}

export interface CrePublicEvaluationFailure {
  readonly schemaVersion: typeof CRE_PUBLIC_ERROR_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly status: "REJECT";
  readonly code: CrePublicFailureCode;
}

export type CrePublicEvaluationResponse = CrePublicEvaluationSuccess | CrePublicEvaluationFailure;

export class CreBoundaryError extends Error {
  readonly publicCode: CrePublicFailureCode;

  constructor(publicCode: CrePublicFailureCode) {
    super("Confidential evaluation rejected");
    this.name = "CreBoundaryError";
    this.publicCode = publicCode;
  }
}

type DataRecord = Record<string, unknown>;

function reject(code: CrePublicFailureCode): never {
  throw new CreBoundaryError(code);
}

function expectExactObject(
  input: unknown,
  allowedKeys: readonly string[],
  failure: CrePublicFailureCode,
): DataRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return reject(failure);
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) return reject(failure);
  const allowed = new Set(allowedKeys);
  for (const key of Reflect.ownKeys(input)) {
    if (typeof key !== "string" || !allowed.has(key)) return reject(failure);
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      return reject(failure);
    }
  }
  for (const key of allowedKeys) {
    if (!Object.hasOwn(input, key)) return reject(failure);
  }
  return input as DataRecord;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function behaviorDigestPayload(input: {
  readonly schemaVersion: typeof CRE_PUBLIC_REQUEST_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}): unknown {
  return input;
}

export function digestBehaviorInput(input: {
  readonly schemaVersion: typeof CRE_PUBLIC_REQUEST_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}): Sha256Digest {
  const bytes = canonicalBytes({
    domain: BEHAVIOR_INPUT_DIGEST_DOMAIN,
    protocolVersion: PROTOCOL_VERSION,
    payload: behaviorDigestPayload(input),
  });
  return parseSha256Digest(`sha256:${bytesToHex(sha256(bytes))}`);
}

function skipJsonWhitespace(input: string, start: number): number {
  let index = start;
  while (
    input[index] === " " ||
    input[index] === "\n" ||
    input[index] === "\r" ||
    input[index] === "\t"
  ) {
    index += 1;
  }
  return index;
}

function scanJsonString(
  input: string,
  start: number,
  failure: CrePublicFailureCode,
): { readonly end: number; readonly value: string } {
  if (input[start] !== '"') return reject(failure);
  let index = start + 1;
  while (index < input.length) {
    const character = input[index];
    if (character === '"') {
      const end = index + 1;
      try {
        return { end, value: JSON.parse(input.slice(start, end)) as string };
      } catch {
        return reject(failure);
      }
    }
    if (character === "\\") index += input[index + 1] === "u" ? 6 : 2;
    else index += 1;
  }
  return reject(failure);
}

function scanJsonValue(input: string, start: number, failure: CrePublicFailureCode): number {
  let index = skipJsonWhitespace(input, start);
  if (input[index] === "{") {
    index = skipJsonWhitespace(input, index + 1);
    if (input[index] === "}") return index + 1;
    const keys = new Set<string>();
    while (index < input.length) {
      const key = scanJsonString(input, index, failure);
      if (keys.has(key.value)) return reject(failure);
      keys.add(key.value);
      index = skipJsonWhitespace(input, key.end);
      if (input[index] !== ":") return reject(failure);
      index = skipJsonWhitespace(input, scanJsonValue(input, index + 1, failure));
      if (input[index] === "}") return index + 1;
      if (input[index] !== ",") return reject(failure);
      index = skipJsonWhitespace(input, index + 1);
    }
    return reject(failure);
  }
  if (input[index] === "[") {
    index = skipJsonWhitespace(input, index + 1);
    if (input[index] === "]") return index + 1;
    while (index < input.length) {
      index = skipJsonWhitespace(input, scanJsonValue(input, index, failure));
      if (input[index] === "]") return index + 1;
      if (input[index] !== ",") return reject(failure);
      index = skipJsonWhitespace(input, index + 1);
    }
    return reject(failure);
  }
  if (input[index] === '"') return scanJsonString(input, index, failure).end;

  const primitiveStart = index;
  while (
    index < input.length &&
    input[index] !== "," &&
    input[index] !== "]" &&
    input[index] !== "}" &&
    input[index] !== " " &&
    input[index] !== "\n" &&
    input[index] !== "\r" &&
    input[index] !== "\t"
  ) {
    index += 1;
  }
  if (index === primitiveStart) return reject(failure);
  return index;
}

function parseStrictJson(input: string, failure: CrePublicFailureCode): unknown {
  try {
    const end = skipJsonWhitespace(input, scanJsonValue(input, 0, failure));
    if (end !== input.length) return reject(failure);
    return JSON.parse(input) as unknown;
  } catch (error) {
    if (error instanceof CreBoundaryError) throw error;
    return reject(failure);
  }
}

function parseJsonText(input: string, failure: CrePublicFailureCode): unknown {
  if (
    input.length === 0 ||
    new TextEncoder().encode(input).length > MAX_CONFIDENTIAL_PAYLOAD_BYTES
  ) {
    return reject(failure);
  }
  return parseStrictJson(input, failure);
}

export function decodePublicPayload(input: Uint8Array): unknown {
  if (
    !(input instanceof Uint8Array) ||
    input.length === 0 ||
    input.length > MAX_PUBLIC_PAYLOAD_BYTES
  ) {
    return reject("MALFORMED_PUBLIC_INPUT");
  }
  try {
    return parseStrictJson(new TextDecoder().decode(input), "MALFORMED_PUBLIC_INPUT");
  } catch {
    return reject("MALFORMED_PUBLIC_INPUT");
  }
}

export function parsePublicEvaluationRequest(input: unknown): CrePublicEvaluationRequest {
  const record = expectExactObject(
    input,
    [
      "schemaVersion",
      "protocolVersion",
      "request",
      "robotBuild",
      "behaviorTraces",
      "behaviorInputDigest",
      "traceProvenance",
      "evaluatedAt",
    ],
    "MALFORMED_PUBLIC_INPUT",
  );
  if (
    record.schemaVersion !== CRE_PUBLIC_REQUEST_VERSION ||
    record.protocolVersion !== PROTOCOL_VERSION
  ) {
    return reject("UNSUPPORTED_VERSION");
  }

  try {
    const request = parseEvaluationRequest(record.request);
    const robotBuild = parseRobotBuildDescriptor(record.robotBuild);
    const behaviorTraces = parseRobotBehaviorTraceSuite(record.behaviorTraces);
    const behaviorInputDigest = parseSha256Digest(
      record.behaviorInputDigest,
      "behaviorInputDigest",
    );
    const evaluatedAt = parseUnixTimestamp(record.evaluatedAt, "evaluatedAt");

    if (record.traceProvenance !== SYNTHETIC_TRACE_PROVENANCE) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (request.inputs.evaluatorVersion !== WAREHOUSE_EVALUATOR_VERSION) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (robotBuild.robotId !== request.inputs.robotId) return reject("MALFORMED_PUBLIC_INPUT");
    if (robotBuild.robotBuildId !== request.inputs.robotBuildId) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (digestRobotBuild(robotBuild) !== request.inputs.robotBuildDigest) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (behaviorTraces.robotId !== request.inputs.robotId) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (
      behaviorTraces.robotBuildId !== request.inputs.robotBuildId ||
      behaviorTraces.robotBuildDigest !== request.inputs.robotBuildDigest
    ) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }

    const normalized = Object.freeze({
      schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      request,
      robotBuild,
      behaviorTraces,
      traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
      evaluatedAt,
    });
    if (digestBehaviorInput(normalized) !== behaviorInputDigest) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }

    return Object.freeze({ ...normalized, behaviorInputDigest });
  } catch (error) {
    if (error instanceof CreBoundaryError) throw error;
    return reject("MALFORMED_PUBLIC_INPUT");
  }
}

function parseBlindingSecretHex(input: unknown): Uint8Array {
  if (typeof input !== "string" || !/^[0-9a-f]{64}$/.test(input)) {
    return reject("MALFORMED_CONFIDENTIAL_INPUT");
  }
  const bytes = new Uint8Array(32);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(input.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

export function parseConfidentialEvaluationInput(
  secretValue: string,
): CreConfidentialEvaluationInput {
  const record = expectExactObject(
    parseJsonText(secretValue, "MALFORMED_CONFIDENTIAL_INPUT"),
    ["schemaVersion", "protocolVersion", "confidentialEnvelope", "envelopeBlindingSecretHex"],
    "MALFORMED_CONFIDENTIAL_INPUT",
  );
  if (
    record.schemaVersion !== CRE_CONFIDENTIAL_INPUT_VERSION ||
    record.protocolVersion !== PROTOCOL_VERSION
  ) {
    return reject("UNSUPPORTED_VERSION");
  }
  try {
    return Object.freeze({
      schemaVersion: CRE_CONFIDENTIAL_INPUT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      confidentialEnvelope: parseConfidentialEvaluationEnvelope(record.confidentialEnvelope),
      envelopeBlindingSecret: parseBlindingSecretHex(record.envelopeBlindingSecretHex),
    });
  } catch (error) {
    if (error instanceof CreBoundaryError) throw error;
    return reject("MALFORMED_CONFIDENTIAL_INPUT");
  }
}

export function makePublicFailure(code: CrePublicFailureCode): CrePublicEvaluationFailure {
  return Object.freeze({
    schemaVersion: CRE_PUBLIC_ERROR_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    status: "REJECT",
    code,
  });
}
