import {
  type ClearanceDigest,
  type EvaluationInputsDigest,
  parseClearanceDigest,
  parseEvaluationInputsDigest,
  parseRobotBuildDigest,
  parseSafetyEnvelopeCommitment,
  parseSha256Digest,
  type RobotBuildDigest,
  type SafetyEnvelopeCommitment,
  type Sha256Digest,
} from "./digest-values";
import { failProtocol } from "./errors";
import {
  type ClearanceId,
  type EvaluationId,
  type EvaluatorVersionId,
  parseClearanceId,
  parseEvaluationId,
  parseEvaluatorVersionId,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeId,
  parseSiteId,
  type RobotBuildId,
  type RobotId,
  type SafetyEnvelopeId,
  type SiteId,
} from "./identifiers";

declare const unixTimestampBrand: unique symbol;
declare const deploymentNonceBrand: unique symbol;

export type UnixTimestamp = string & {
  readonly [unixTimestampBrand]: "UnixTimestamp";
};

export type DeploymentNonce = string & {
  readonly [deploymentNonceBrand]: "DeploymentNonce";
};

export const PROTOCOL_VERSION = "rovaulta.protocol/v1" as const;
export const ROBOT_BUILD_SCHEMA_VERSION = "rovaulta.robot-build/v1" as const;
export const SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION =
  "rovaulta.safety-envelope-metadata/v1" as const;
export const EVALUATION_INPUTS_SCHEMA_VERSION = "rovaulta.evaluation-inputs/v1" as const;
export const EVALUATION_REQUEST_SCHEMA_VERSION = "rovaulta.evaluation-request/v1" as const;
export const EVALUATION_RESULT_SCHEMA_VERSION = "rovaulta.evaluation-result/v1" as const;
export const CLEARANCE_RECORD_SCHEMA_VERSION = "rovaulta.clearance-record/v1" as const;
export const DEPLOYMENT_INTENT_SCHEMA_VERSION = "rovaulta.deployment-intent/v2" as const;
export const SAFETY_ENVELOPE_COMMITMENT_SCHEMA_VERSION =
  "rovaulta.safety-envelope-commitment/v1" as const;

export const DEPLOYMENT_TARGETS = Object.freeze(["sepolia"] as const);
export type DeploymentTarget = (typeof DEPLOYMENT_TARGETS)[number];

export const DEPLOYMENT_ACTION = "ACTIVATE_DEPLOYMENT" as const;
export type DeploymentAction = typeof DEPLOYMENT_ACTION;

export const EVALUATION_VERDICTS = Object.freeze(["CLEAR", "HOLD", "ESCALATE"] as const);
export type EvaluationVerdict = (typeof EVALUATION_VERDICTS)[number];
/** Compatibility name retained for existing P2 scaffolding. */
export type ClearanceVerdict = EvaluationVerdict;

export interface RobotBuildDescriptor {
  readonly schemaVersion: typeof ROBOT_BUILD_SCHEMA_VERSION;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly artifactDigest: Sha256Digest;
}

export interface SafetyEnvelopeMetadata {
  readonly schemaVersion: typeof SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION;
  readonly siteId: SiteId;
  readonly safetyEnvelopeId: SafetyEnvelopeId;
  readonly safetyEnvelopeCommitment: SafetyEnvelopeCommitment;
}

export interface EvaluationInputs {
  readonly schemaVersion: typeof EVALUATION_INPUTS_SCHEMA_VERSION;
  readonly siteId: SiteId;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly robotBuildDigest: RobotBuildDigest;
  readonly safetyEnvelopeId: SafetyEnvelopeId;
  readonly safetyEnvelopeCommitment: SafetyEnvelopeCommitment;
  readonly evaluatorVersion: EvaluatorVersionId;
}

export interface EvaluationRequest {
  readonly schemaVersion: typeof EVALUATION_REQUEST_SCHEMA_VERSION;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly requestedAt: UnixTimestamp;
}

export interface EvaluationResult {
  readonly schemaVersion: typeof EVALUATION_RESULT_SCHEMA_VERSION;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly evaluationInputsDigest: EvaluationInputsDigest;
  readonly verdict: EvaluationVerdict;
  readonly evaluatedAt: UnixTimestamp;
}

export interface ClearanceRecord {
  readonly schemaVersion: typeof CLEARANCE_RECORD_SCHEMA_VERSION;
  readonly clearanceId: ClearanceId;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly evaluationInputsDigest: EvaluationInputsDigest;
  readonly verdict: "CLEAR";
  readonly issuedAt: UnixTimestamp;
  readonly expiresAt: UnixTimestamp;
}

export interface DeploymentIntent {
  readonly schemaVersion: typeof DEPLOYMENT_INTENT_SCHEMA_VERSION;
  readonly action: DeploymentAction;
  readonly siteId: SiteId;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly robotBuildDigest: RobotBuildDigest;
  readonly clearanceId: ClearanceId;
  readonly clearanceDigest: ClearanceDigest;
  readonly targetEnvironment: DeploymentTarget;
  readonly nonce: DeploymentNonce;
  readonly issuedAt: UnixTimestamp;
  readonly expiresAt: UnixTimestamp;
}

/** Compatibility view retained for existing scaffold consumers. */
export type RovaultaIdentifiers = Omit<EvaluationInputs, "schemaVersion">;

/** Minimal typed clearance reference for ports that do not need the full record. */
export type ClearanceReference = Pick<
  ClearanceRecord,
  "clearanceId" | "inputs" | "verdict" | "expiresAt"
>;

type PlainRecord = Record<string, unknown>;

function expectDataObject(input: unknown, schemaName: string): PlainRecord {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failProtocol("MALFORMED_OBJECT", `${schemaName} must be a plain data object`);
  }
  const prototype = Object.getPrototypeOf(input);
  if (prototype !== Object.prototype && prototype !== null) {
    return failProtocol("MALFORMED_OBJECT", `${schemaName} must be a plain data object`);
  }

  for (const key of Reflect.ownKeys(input)) {
    if (typeof key === "symbol") {
      return failProtocol("MALFORMED_OBJECT", `${schemaName} must not contain symbol keys`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(input, key);
    if (descriptor === undefined || !descriptor.enumerable || !("value" in descriptor)) {
      return failProtocol(
        "MALFORMED_OBJECT",
        `${schemaName} must contain only enumerable data properties`,
      );
    }
  }
  return input as PlainRecord;
}

function expectExactSchema(
  input: unknown,
  schemaName: string,
  schemaVersion: string,
  requiredKeys: readonly string[],
  bindingKeys: ReadonlySet<string>,
): PlainRecord {
  const record = expectDataObject(input, schemaName);
  if (!Object.hasOwn(record, "schemaVersion")) {
    return failProtocol("MALFORMED_OBJECT", `${schemaName} is missing schemaVersion`);
  }
  if (record.schemaVersion !== schemaVersion) {
    return failProtocol("UNSUPPORTED_VERSION", `${schemaName} schemaVersion is unsupported`);
  }

  const allowed = new Set(["schemaVersion", ...requiredKeys]);
  for (const key of Object.keys(record)) {
    if (!allowed.has(key)) {
      return failProtocol("MALFORMED_OBJECT", `${schemaName} contains an unknown field`);
    }
  }
  for (const key of requiredKeys) {
    if (!Object.hasOwn(record, key)) {
      const code = bindingKeys.has(key) ? "MISSING_REQUIRED_BINDING" : "MALFORMED_OBJECT";
      return failProtocol(code, `${schemaName} is missing a required field`, key);
    }
  }
  return record;
}

function parseEvaluationVerdict(input: unknown, path: string): EvaluationVerdict {
  if (typeof input !== "string" || !EVALUATION_VERDICTS.includes(input as EvaluationVerdict)) {
    return failProtocol("MALFORMED_OBJECT", "Evaluation verdict is invalid", path);
  }
  return input as EvaluationVerdict;
}

const UNIX_SECONDS_PATTERN = /^(0|[1-9][0-9]{0,11})$/;
const MAX_UNIX_SECONDS = "253402300799";

export function compareUnixTimestamps(left: UnixTimestamp, right: UnixTimestamp): number {
  if (left.length !== right.length) return left.length < right.length ? -1 : 1;
  if (left === right) return 0;
  return left < right ? -1 : 1;
}

export function parseUnixTimestamp(input: unknown, path = "timestamp"): UnixTimestamp {
  if (
    typeof input !== "string" ||
    !UNIX_SECONDS_PATTERN.test(input) ||
    (input.length === MAX_UNIX_SECONDS.length && input > MAX_UNIX_SECONDS)
  ) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Timestamps must be canonical decimal Unix seconds in the supported range",
      path,
    );
  }
  return input as UnixTimestamp;
}

function parseExpiry(input: unknown, issuedAt: UnixTimestamp, path: string): UnixTimestamp {
  let expiresAt: UnixTimestamp;
  try {
    expiresAt = parseUnixTimestamp(input, path);
  } catch {
    return failProtocol("INVALID_EXPIRY", "Expiry must be canonical Unix seconds", path);
  }
  if (compareUnixTimestamps(expiresAt, issuedAt) <= 0) {
    return failProtocol("INVALID_EXPIRY", "Expiry must be strictly after issuance", path);
  }
  return expiresAt;
}

export function parseDeploymentNonce(input: unknown, path = "nonce"): DeploymentNonce {
  if (typeof input !== "string" || !/^[A-Za-z0-9_-]{16,128}$/.test(input)) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Deployment nonce must be 16-128 unambiguous ASCII characters",
      path,
    );
  }
  return input as DeploymentNonce;
}

export function parseRobotBuildDescriptor(input: unknown): RobotBuildDescriptor {
  const record = expectExactSchema(
    input,
    "RobotBuildDescriptor",
    ROBOT_BUILD_SCHEMA_VERSION,
    ["robotId", "robotBuildId", "artifactDigest"],
    new Set(["robotId", "robotBuildId", "artifactDigest"]),
  );
  return Object.freeze({
    schemaVersion: ROBOT_BUILD_SCHEMA_VERSION,
    robotId: parseRobotId(record.robotId),
    robotBuildId: parseRobotBuildId(record.robotBuildId),
    artifactDigest: parseSha256Digest(record.artifactDigest, "artifactDigest"),
  });
}

export function parseSafetyEnvelopeMetadata(input: unknown): SafetyEnvelopeMetadata {
  const record = expectExactSchema(
    input,
    "SafetyEnvelopeMetadata",
    SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
    ["siteId", "safetyEnvelopeId", "safetyEnvelopeCommitment"],
    new Set(["siteId", "safetyEnvelopeId", "safetyEnvelopeCommitment"]),
  );
  return Object.freeze({
    schemaVersion: SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
    siteId: parseSiteId(record.siteId),
    safetyEnvelopeId: parseSafetyEnvelopeId(record.safetyEnvelopeId),
    safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(
      record.safetyEnvelopeCommitment,
      "safetyEnvelopeCommitment",
    ),
  });
}

export function parseEvaluationInputs(input: unknown): EvaluationInputs {
  const bindings = [
    "siteId",
    "robotId",
    "robotBuildId",
    "robotBuildDigest",
    "safetyEnvelopeId",
    "safetyEnvelopeCommitment",
    "evaluatorVersion",
  ] as const;
  const record = expectExactSchema(
    input,
    "EvaluationInputs",
    EVALUATION_INPUTS_SCHEMA_VERSION,
    bindings,
    new Set(bindings),
  );
  return Object.freeze({
    schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
    siteId: parseSiteId(record.siteId),
    robotId: parseRobotId(record.robotId),
    robotBuildId: parseRobotBuildId(record.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(record.robotBuildDigest),
    safetyEnvelopeId: parseSafetyEnvelopeId(record.safetyEnvelopeId),
    safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(record.safetyEnvelopeCommitment),
    evaluatorVersion: parseEvaluatorVersionId(record.evaluatorVersion),
  });
}

export function parseEvaluationRequest(input: unknown): EvaluationRequest {
  const record = expectExactSchema(
    input,
    "EvaluationRequest",
    EVALUATION_REQUEST_SCHEMA_VERSION,
    ["evaluationId", "inputs", "requestedAt"],
    new Set(["evaluationId", "inputs"]),
  );
  return Object.freeze({
    schemaVersion: EVALUATION_REQUEST_SCHEMA_VERSION,
    evaluationId: parseEvaluationId(record.evaluationId),
    inputs: parseEvaluationInputs(record.inputs),
    requestedAt: parseUnixTimestamp(record.requestedAt, "requestedAt"),
  });
}

export function parseEvaluationResult(input: unknown): EvaluationResult {
  const record = expectExactSchema(
    input,
    "EvaluationResult",
    EVALUATION_RESULT_SCHEMA_VERSION,
    ["evaluationId", "inputs", "evaluationInputsDigest", "verdict", "evaluatedAt"],
    new Set(["evaluationId", "inputs", "evaluationInputsDigest", "verdict"]),
  );
  return Object.freeze({
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    evaluationId: parseEvaluationId(record.evaluationId),
    inputs: parseEvaluationInputs(record.inputs),
    evaluationInputsDigest: parseEvaluationInputsDigest(record.evaluationInputsDigest),
    verdict: parseEvaluationVerdict(record.verdict, "verdict"),
    evaluatedAt: parseUnixTimestamp(record.evaluatedAt, "evaluatedAt"),
  });
}

export function parseClearanceRecord(input: unknown): ClearanceRecord {
  const record = expectExactSchema(
    input,
    "ClearanceRecord",
    CLEARANCE_RECORD_SCHEMA_VERSION,
    [
      "clearanceId",
      "evaluationId",
      "inputs",
      "evaluationInputsDigest",
      "verdict",
      "issuedAt",
      "expiresAt",
    ],
    new Set([
      "clearanceId",
      "evaluationId",
      "inputs",
      "evaluationInputsDigest",
      "verdict",
      "expiresAt",
    ]),
  );
  if (record.verdict !== "CLEAR") {
    return failProtocol("MALFORMED_OBJECT", "ClearanceRecord verdict must be CLEAR", "verdict");
  }
  const issuedAt = parseUnixTimestamp(record.issuedAt, "issuedAt");
  return Object.freeze({
    schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
    clearanceId: parseClearanceId(record.clearanceId),
    evaluationId: parseEvaluationId(record.evaluationId),
    inputs: parseEvaluationInputs(record.inputs),
    evaluationInputsDigest: parseEvaluationInputsDigest(record.evaluationInputsDigest),
    verdict: "CLEAR",
    issuedAt,
    expiresAt: parseExpiry(record.expiresAt, issuedAt, "expiresAt"),
  });
}

export function parseDeploymentIntent(input: unknown): DeploymentIntent {
  const bindingKeys = [
    "action",
    "siteId",
    "robotId",
    "robotBuildId",
    "robotBuildDigest",
    "clearanceId",
    "clearanceDigest",
  ] as const;
  const record = expectExactSchema(
    input,
    "DeploymentIntent",
    DEPLOYMENT_INTENT_SCHEMA_VERSION,
    [...bindingKeys, "targetEnvironment", "nonce", "issuedAt", "expiresAt"],
    new Set(bindingKeys),
  );
  if (record.action !== DEPLOYMENT_ACTION) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "DeploymentIntent action must be ACTIVATE_DEPLOYMENT",
      "action",
    );
  }
  if (record.targetEnvironment !== "sepolia") {
    return failProtocol(
      "MALFORMED_OBJECT",
      "DeploymentIntent targetEnvironment must be sepolia in protocol v1",
      "targetEnvironment",
    );
  }
  const issuedAt = parseUnixTimestamp(record.issuedAt, "issuedAt");
  return Object.freeze({
    schemaVersion: DEPLOYMENT_INTENT_SCHEMA_VERSION,
    action: DEPLOYMENT_ACTION,
    siteId: parseSiteId(record.siteId),
    robotId: parseRobotId(record.robotId),
    robotBuildId: parseRobotBuildId(record.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(record.robotBuildDigest),
    clearanceId: parseClearanceId(record.clearanceId),
    clearanceDigest: parseClearanceDigest(record.clearanceDigest),
    targetEnvironment: "sepolia",
    nonce: parseDeploymentNonce(record.nonce),
    issuedAt,
    expiresAt: parseExpiry(record.expiresAt, issuedAt, "expiresAt"),
  });
}
