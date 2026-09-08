import { sha256 } from "@noble/hashes/sha2.js";
import {
  canonicalBytes,
  canonicalSerialize,
  digestRobotBuild,
  type EvaluationRequest,
  type EvaluationResult,
  isLegacyVersion,
  LEGACY_CONFIDENTIAL_INPUT_SECRET_ID,
  LEGACY_DIGEST_DOMAINS,
  LEGACY_PROTOCOL_VERSION,
  LEGACY_SCHEMA_VERSIONS,
  PROTOCOL_VERSION,
  parseEvaluationId,
  parseEvaluationRequest,
  parseEvaluationResult,
  parseRobotBuildDescriptor,
  parseSha256Digest,
  parseSiteId,
  parseUnixTimestamp,
  type RobotBuildDescriptor,
  type Sha256Digest,
  type UnixTimestamp,
} from "@rovaulta/domain";
import {
  type ConfidentialEvaluationEnvelope,
  parseConfidentialEvaluationEnvelope,
  parseRobotBehaviorTraceSuite,
  type RobotBehaviorTraceSuite,
  WAREHOUSE_EVALUATOR_VERSION,
} from "@rovaulta/simulation-core";

export const CRE_PUBLIC_REQUEST_VERSION = "rovaulta.cre-public-evaluation-request/v1" as const;
export const CRE_CONFIDENTIAL_INPUT_VERSION =
  "rovaulta.cre-confidential-evaluation-input/v1" as const;
export const CRE_PUBLIC_RESULT_VERSION = "rovaulta.cre-public-evaluation-result/v1" as const;
export const CRE_PUBLIC_ERROR_VERSION = "rovaulta.cre-public-evaluation-error/v1" as const;
export const CRE_RESULT_CALLBACK_VERSION = "rovaulta.cre-evaluation-result-callback/v1" as const;
export const CRE_RESULT_CALLBACK_SECRET_ID =
  "ROVAULTA_CONFIDENTIAL_EVALUATION_RESULT_CALLBACK_SECRET" as const;
export const SYNTHETIC_TRACE_PROVENANCE = "SYNTHETIC_CALLER_SUPPLIED" as const;
export const CONFIDENTIAL_INPUT_SECRET_ID = "ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT" as const;
export const COMPATIBILITY_CONFIDENTIAL_INPUT_SECRET_ID = LEGACY_CONFIDENTIAL_INPUT_SECRET_ID;
export const MAX_PUBLIC_PAYLOAD_BYTES = 128 * 1024;
export const MAX_CONFIDENTIAL_PAYLOAD_BYTES = 2 * 1024;

const BEHAVIOR_INPUT_DIGEST_DOMAIN = "rovaulta.digest.cre-behavior-input/v1" as const;
const SITE_SECRET_BASE32_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

function encodeSiteSecretComponent(siteId: string): string {
  const bytes = new TextEncoder().encode(siteId);
  let buffer = 0;
  let bits = 0;
  let output = "";
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      output += SITE_SECRET_BASE32_ALPHABET[(buffer >>> bits) & 31];
      buffer &= bits === 0 ? 0 : (1 << bits) - 1;
    }
  }
  if (bits > 0) {
    output += SITE_SECRET_BASE32_ALPHABET[(buffer << (5 - bits)) & 31];
  }
  return output;
}

export function siteSecretId(siteId: string): string {
  const parsedSiteId = parseSiteId(siteId);
  const encodedSiteId = encodeSiteSecretComponent(parsedSiteId);
  return `${CONFIDENTIAL_INPUT_SECRET_ID}_site_${encodedSiteId}`;
}

export type CrePublicFailureCode =
  | "MALFORMED_PUBLIC_INPUT"
  | "CONFIDENTIAL_INPUT_UNAVAILABLE"
  | "MALFORMED_CONFIDENTIAL_INPUT"
  | "UNSUPPORTED_VERSION"
  | "CONFIDENTIAL_EVALUATION_REJECTED"
  | "CONFIDENTIAL_HANDLER_FAILURE";

const CRE_PUBLIC_FAILURE_CODES = Object.freeze([
  "MALFORMED_PUBLIC_INPUT",
  "CONFIDENTIAL_INPUT_UNAVAILABLE",
  "MALFORMED_CONFIDENTIAL_INPUT",
  "UNSUPPORTED_VERSION",
  "CONFIDENTIAL_EVALUATION_REJECTED",
  "CONFIDENTIAL_HANDLER_FAILURE",
] as const);

export interface CrePublicEvaluationRequest {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  /**
   * Optional request-scoped CRE secret selector.  Production application requests must set this
   * to the site-bound secret provisioned in the CRE secret store.  The legacy fixed selector is
   * retained only for the existing simulation fixtures.
   */
  readonly confidentialInputSecretId?: string;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly behaviorInputDigest: Sha256Digest;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}

export interface CreConfidentialEvaluationInput {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  readonly confidentialEnvelope: ConfidentialEvaluationEnvelope;
  readonly envelopeBlindingSecret: Uint8Array;
}

export interface CrePublicEvaluationSuccess {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  readonly status: "EVALUATED";
  readonly result: EvaluationResult;
  readonly behaviorInputDigest: Sha256Digest;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
}

export interface CrePublicEvaluationFailure {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  readonly status: "REJECT";
  readonly code: CrePublicFailureCode;
}

/**
 * The only payload allowed to leave the confidential handler for account completion. It is
 * deliberately a wrapper around the already-minimal public CRE response; private envelope data,
 * blinds, policy contents, and internal reports have no representation here.
 */
export interface CreEvaluationResultCallback {
  readonly schemaVersion: typeof CRE_RESULT_CALLBACK_VERSION;
  readonly protocolVersion: typeof PROTOCOL_VERSION;
  readonly evaluationId: string;
  readonly response: CrePublicEvaluationResponse;
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
  optionalKeys: readonly string[] = [],
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
  const optional = new Set(optionalKeys);
  for (const key of allowedKeys) {
    if (!optional.has(key) && !Object.hasOwn(input, key)) return reject(failure);
  }
  return input as DataRecord;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function behaviorDigestPayload(input: {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  readonly confidentialInputSecretId?: string;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}): unknown {
  return input;
}

export function digestBehaviorInput(input: {
  readonly schemaVersion: string;
  readonly protocolVersion: string;
  readonly confidentialInputSecretId?: string;
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly traceProvenance: typeof SYNTHETIC_TRACE_PROVENANCE;
  readonly evaluatedAt: UnixTimestamp;
}): Sha256Digest {
  const bytes = canonicalBytes({
    domain: isLegacyVersion(input.schemaVersion)
      ? LEGACY_DIGEST_DOMAINS.behaviorInput
      : BEHAVIOR_INPUT_DIGEST_DOMAIN,
    protocolVersion: isLegacyVersion(input.protocolVersion)
      ? LEGACY_PROTOCOL_VERSION
      : PROTOCOL_VERSION,
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

export function parsePublicEvaluationRequest(
  input: unknown,
  options: { readonly requireSiteSecretSelector?: boolean } = {},
): CrePublicEvaluationRequest {
  const record = expectExactObject(
    input,
    [
      "schemaVersion",
      "protocolVersion",
      "confidentialInputSecretId",
      "request",
      "robotBuild",
      "behaviorTraces",
      "behaviorInputDigest",
      "traceProvenance",
      "evaluatedAt",
    ],
    "MALFORMED_PUBLIC_INPUT",
    ["confidentialInputSecretId"],
  );
  if (
    !(
      (record.schemaVersion === CRE_PUBLIC_REQUEST_VERSION &&
        record.protocolVersion === PROTOCOL_VERSION) ||
      (record.schemaVersion === LEGACY_SCHEMA_VERSIONS.crePublicRequest &&
        record.protocolVersion === LEGACY_PROTOCOL_VERSION)
    )
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

    const confidentialInputSecretId = record.confidentialInputSecretId;
    if (
      confidentialInputSecretId !== undefined &&
      (typeof confidentialInputSecretId !== "string" ||
        !/^ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_[a-z2-7]{1,160}$/.test(
          confidentialInputSecretId,
        ))
    ) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (
      confidentialInputSecretId !== undefined &&
      confidentialInputSecretId !== siteSecretId(request.inputs.siteId)
    ) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    if (options.requireSiteSecretSelector === true && confidentialInputSecretId === undefined) {
      return reject("MALFORMED_PUBLIC_INPUT");
    }
    const normalized = Object.freeze({
      schemaVersion: String(record.schemaVersion),
      protocolVersion: String(record.protocolVersion),
      ...(confidentialInputSecretId === undefined ? {} : { confidentialInputSecretId }),
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
    !(
      (record.schemaVersion === CRE_CONFIDENTIAL_INPUT_VERSION &&
        record.protocolVersion === PROTOCOL_VERSION) ||
      (record.schemaVersion === LEGACY_SCHEMA_VERSIONS.creConfidentialInput &&
        record.protocolVersion === LEGACY_PROTOCOL_VERSION)
    )
  ) {
    return reject("UNSUPPORTED_VERSION");
  }
  try {
    return Object.freeze({
      schemaVersion: String(record.schemaVersion),
      protocolVersion: String(record.protocolVersion),
      confidentialEnvelope: parseConfidentialEvaluationEnvelope(record.confidentialEnvelope),
      envelopeBlindingSecret: parseBlindingSecretHex(record.envelopeBlindingSecretHex),
    });
  } catch (error) {
    if (error instanceof CreBoundaryError) throw error;
    return reject("MALFORMED_CONFIDENTIAL_INPUT");
  }
}

export function makePublicFailure(code: CrePublicFailureCode): CrePublicEvaluationFailure {
  return makePublicFailureForProtocol(code, PROTOCOL_VERSION);
}

export function makePublicFailureForProtocol(
  code: CrePublicFailureCode,
  protocolVersion: string,
): CrePublicEvaluationFailure {
  const legacy = isLegacyVersion(protocolVersion);
  return Object.freeze({
    schemaVersion: legacy ? LEGACY_SCHEMA_VERSIONS.crePublicError : CRE_PUBLIC_ERROR_VERSION,
    protocolVersion: legacy ? LEGACY_PROTOCOL_VERSION : PROTOCOL_VERSION,
    status: "REJECT",
    code,
  });
}

export function makeEvaluationResultCallback(
  evaluationId: string,
  response: CrePublicEvaluationResponse,
): CreEvaluationResultCallback {
  return Object.freeze({
    schemaVersion: CRE_RESULT_CALLBACK_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    evaluationId: parseEvaluationId(evaluationId),
    response,
  });
}

/** Canonical bytes signed by the TEE callback HMAC and verified by the account API. */
export function serializeEvaluationResultCallback(input: CreEvaluationResultCallback): string {
  return canonicalSerialize(parseEvaluationResultCallback(input));
}

export function parseEvaluationResultCallback(input: unknown): CreEvaluationResultCallback {
  const record = expectExactObject(
    input,
    ["schemaVersion", "protocolVersion", "evaluationId", "response"],
    "MALFORMED_PUBLIC_INPUT",
  );
  if (
    record.schemaVersion !== CRE_RESULT_CALLBACK_VERSION ||
    record.protocolVersion !== PROTOCOL_VERSION
  ) {
    return reject("UNSUPPORTED_VERSION");
  }
  try {
    const evaluationId = parseEvaluationId(record.evaluationId);
    const responseRecord = expectExactObject(
      record.response,
      [
        "schemaVersion",
        "protocolVersion",
        "status",
        "result",
        "behaviorInputDigest",
        "traceProvenance",
        "code",
      ],
      "MALFORMED_PUBLIC_INPUT",
      ["result", "behaviorInputDigest", "traceProvenance", "code"],
    );
    if (responseRecord.status === "EVALUATED") {
      const responseKeys = [
        "schemaVersion",
        "protocolVersion",
        "status",
        "result",
        "behaviorInputDigest",
        "traceProvenance",
      ] as const;
      if (
        Object.keys(responseRecord).some(
          (key) => !responseKeys.includes(key as (typeof responseKeys)[number]),
        ) ||
        responseKeys.some((key) => !Object.hasOwn(responseRecord, key))
      ) {
        return reject("MALFORMED_PUBLIC_INPUT");
      }
      if (
        responseRecord.schemaVersion !== CRE_PUBLIC_RESULT_VERSION ||
        responseRecord.protocolVersion !== PROTOCOL_VERSION ||
        responseRecord.traceProvenance !== SYNTHETIC_TRACE_PROVENANCE
      ) {
        return reject("MALFORMED_PUBLIC_INPUT");
      }
      const result = parseEvaluationResult(responseRecord.result);
      if (result.evaluationId !== evaluationId) return reject("MALFORMED_PUBLIC_INPUT");
      const behaviorInputDigest = parseSha256Digest(
        responseRecord.behaviorInputDigest,
        "behaviorInputDigest",
      );
      return Object.freeze({
        schemaVersion: CRE_RESULT_CALLBACK_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        evaluationId,
        response: Object.freeze({
          schemaVersion: CRE_PUBLIC_RESULT_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          status: "EVALUATED",
          result,
          behaviorInputDigest,
          traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
        }),
      });
    }
    if (responseRecord.status === "REJECT") {
      const responseKeys = ["schemaVersion", "protocolVersion", "status", "code"] as const;
      if (
        Object.keys(responseRecord).some(
          (key) => !responseKeys.includes(key as (typeof responseKeys)[number]),
        ) ||
        responseKeys.some((key) => !Object.hasOwn(responseRecord, key))
      ) {
        return reject("MALFORMED_PUBLIC_INPUT");
      }
      if (
        responseRecord.schemaVersion !== CRE_PUBLIC_ERROR_VERSION ||
        responseRecord.protocolVersion !== PROTOCOL_VERSION ||
        typeof responseRecord.code !== "string" ||
        !CRE_PUBLIC_FAILURE_CODES.includes(responseRecord.code as CrePublicFailureCode)
      ) {
        return reject("MALFORMED_PUBLIC_INPUT");
      }
      return Object.freeze({
        schemaVersion: CRE_RESULT_CALLBACK_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        evaluationId,
        response: Object.freeze({
          schemaVersion: CRE_PUBLIC_ERROR_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          status: "REJECT",
          code: responseRecord.code as CrePublicFailureCode,
        }),
      });
    }
    return reject("MALFORMED_PUBLIC_INPUT");
  } catch (error) {
    if (error instanceof CreBoundaryError) throw error;
    return reject("MALFORMED_PUBLIC_INPUT");
  }
}
