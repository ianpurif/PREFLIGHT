import { LEGACY_SCHEMA_VERSIONS, type ProtocolDialect, resolveVersion } from "./compatibility";
import {
  type BuildIntegrityDigest,
  type ClearanceDigest,
  type EvaluationInputsDigest,
  parseBuildIntegrityDigest,
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
export const SOURCE_ROBOT_BUILD_SCHEMA_VERSION = "rovaulta.robot-build/v2" as const;
export const BUILD_INTEGRITY_SCHEMA_VERSION = "rovaulta.build-integrity/v1" as const;
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
  readonly schemaVersion:
    | typeof ROBOT_BUILD_SCHEMA_VERSION
    | typeof SOURCE_ROBOT_BUILD_SCHEMA_VERSION
    | string;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly artifactDigest: Sha256Digest;
  readonly buildIntegrityDigest?: BuildIntegrityDigest;
}

export interface BuildProvenanceStatement {
  readonly _type: "https://in-toto.io/Statement/v1";
  readonly subject: readonly [
    {
      readonly name: string;
      readonly digest: Readonly<{ readonly sha256: string }>;
    },
  ];
  readonly predicateType: "https://slsa.dev/provenance/v1";
  readonly predicate: Readonly<{
    readonly buildDefinition: Readonly<{
      readonly buildType: string;
      readonly externalParameters: Readonly<Record<string, string>>;
      readonly resolvedDependencies: readonly Readonly<{
        readonly uri: string;
        readonly digest: Readonly<Record<string, string>>;
      }>[];
    }>;
    readonly runDetails: Readonly<{
      readonly builder: Readonly<{
        readonly id: string;
        readonly version: Readonly<Record<string, string>>;
      }>;
      readonly metadata: Readonly<{
        readonly invocationId: string;
        readonly startedOn: string;
        readonly finishedOn: string;
      }>;
    }>;
  }>;
}

export interface BuildIntegrityEvidence {
  readonly schemaVersion: typeof BUILD_INTEGRITY_SCHEMA_VERSION;
  readonly buildId: RobotBuildId;
  readonly sourceRepository: string;
  readonly sourceRevision: string;
  readonly sourceSnapshotDigest: Sha256Digest;
  readonly artifactDigest: Sha256Digest;
  readonly buildCommand: string;
  readonly lockfileDigest: Sha256Digest;
  readonly builder: Readonly<{ readonly id: string; readonly version: string }>;
  readonly runtime: Readonly<{
    readonly name: "bun" | "node";
    readonly version: string;
    readonly image: string;
  }>;
  readonly buildStatus: "BUILD_SUCCEEDED";
  readonly provenance: BuildProvenanceStatement;
}

export interface SafetyEnvelopeMetadata {
  readonly schemaVersion: string;
  readonly siteId: SiteId;
  readonly safetyEnvelopeId: SafetyEnvelopeId;
  readonly safetyEnvelopeCommitment: SafetyEnvelopeCommitment;
}

export interface EvaluationInputs {
  readonly schemaVersion: string;
  readonly siteId: SiteId;
  readonly robotId: RobotId;
  readonly robotBuildId: RobotBuildId;
  readonly robotBuildDigest: RobotBuildDigest;
  readonly safetyEnvelopeId: SafetyEnvelopeId;
  readonly safetyEnvelopeCommitment: SafetyEnvelopeCommitment;
  readonly evaluatorVersion: EvaluatorVersionId;
}

export interface EvaluationRequest {
  readonly schemaVersion: string;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly requestedAt: UnixTimestamp;
}

export interface EvaluationResult {
  readonly schemaVersion: string;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly evaluationInputsDigest: EvaluationInputsDigest;
  readonly verdict: EvaluationVerdict;
  readonly evaluatedAt: UnixTimestamp;
}

export interface ClearanceRecord {
  readonly schemaVersion: string;
  readonly clearanceId: ClearanceId;
  readonly evaluationId: EvaluationId;
  readonly inputs: EvaluationInputs;
  readonly evaluationInputsDigest: EvaluationInputsDigest;
  readonly verdict: "CLEAR";
  readonly issuedAt: UnixTimestamp;
  readonly expiresAt: UnixTimestamp;
}

export interface DeploymentIntent {
  readonly schemaVersion: string;
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
  legacySchemaVersion: string,
  requiredKeys: readonly string[],
  bindingKeys: ReadonlySet<string>,
): { readonly record: PlainRecord; readonly dialect: ProtocolDialect } {
  const record = expectDataObject(input, schemaName);
  if (!Object.hasOwn(record, "schemaVersion")) {
    return failProtocol("MALFORMED_OBJECT", `${schemaName} is missing schemaVersion`);
  }
  const dialect = resolveVersion(record.schemaVersion, schemaVersion, legacySchemaVersion);
  if (dialect === undefined) {
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
  return Object.freeze({ record, dialect });
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

function parseBoundedString(input: unknown, path: string, maximum: number): string {
  if (typeof input !== "string" || input.length === 0 || input.length > maximum) {
    return failProtocol("MALFORMED_OBJECT", "String value is invalid", path);
  }
  return input;
}

function parseSourceRepository(input: unknown, path = "sourceRepository"): string {
  const value = parseBoundedString(input, path, 2_048);
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      url.username !== "" ||
      url.password !== "" ||
      url.search !== "" ||
      url.hash !== "" ||
      url.hostname === ""
    )
      throw new Error();
  } catch {
    return failProtocol("MALFORMED_OBJECT", "Source repository must be an HTTPS URL", path);
  }
  return value;
}

function parseSourceRevision(input: unknown, path = "sourceRevision"): string {
  if (typeof input !== "string" || !/^(?:[0-9a-f]{40}|[0-9a-f]{64})$/.test(input)) {
    return failProtocol("MALFORMED_OBJECT", "Source revision must be an exact commit", path);
  }
  return input;
}

function parseSafeBuildCommand(input: unknown, path = "buildCommand"): string {
  const value = parseBoundedString(input, path, 200);
  if (!/^(?:bun|node|npm)(?:\s+[A-Za-z0-9_./:@=+-]+)*$/.test(value)) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Build command contains unsupported shell syntax",
      path,
    );
  }
  return value;
}

function parseProvenanceStatement(input: unknown): BuildProvenanceStatement {
  const record = expectDataObject(input, "BuildProvenanceStatement");
  const topLevelKeys = new Set(["_type", "subject", "predicateType", "predicate"]);
  if (Object.keys(record).some((key) => !topLevelKeys.has(key))) {
    return failProtocol("MALFORMED_OBJECT", "Provenance contains an unknown field");
  }
  if (record._type !== "https://in-toto.io/Statement/v1") {
    return failProtocol("UNSUPPORTED_VERSION", "Provenance statement type is unsupported", "_type");
  }
  if (record.predicateType !== "https://slsa.dev/provenance/v1") {
    return failProtocol(
      "UNSUPPORTED_VERSION",
      "Provenance predicate type is unsupported",
      "predicateType",
    );
  }
  if (!Array.isArray(record.subject) || record.subject.length !== 1) {
    return failProtocol("MALFORMED_OBJECT", "Provenance must have one subject", "subject");
  }
  const subject = expectDataObject(record.subject[0], "Provenance subject");
  if (Object.keys(subject).some((key) => !["name", "digest"].includes(key))) {
    return failProtocol("MALFORMED_OBJECT", "Provenance subject contains an unknown field");
  }
  const subjectName = parseBoundedString(subject.name, "subject.name", 512);
  const subjectDigest = expectDataObject(subject.digest, "Provenance subject digest");
  if (Object.keys(subjectDigest).some((key) => key !== "sha256")) {
    return failProtocol("MALFORMED_OBJECT", "Provenance subject digest contains an unknown field");
  }
  const subjectSha = parseBoundedString(subjectDigest.sha256, "subject.digest.sha256", 64);
  if (!/^[0-9a-f]{64}$/.test(subjectSha)) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Provenance subject SHA-256 is invalid",
      "subject.digest",
    );
  }

  const predicate = expectDataObject(record.predicate, "Provenance predicate");
  if (Object.keys(predicate).some((key) => !["buildDefinition", "runDetails"].includes(key))) {
    return failProtocol("MALFORMED_OBJECT", "Provenance predicate contains an unknown field");
  }
  const buildDefinition = expectDataObject(predicate.buildDefinition, "Provenance buildDefinition");
  if (
    Object.keys(buildDefinition).some(
      (key) => !["buildType", "externalParameters", "resolvedDependencies"].includes(key),
    )
  ) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Provenance build definition contains an unknown field",
    );
  }
  const buildType = parseBoundedString(
    buildDefinition.buildType,
    "predicate.buildDefinition.buildType",
    512,
  );
  const externalParameters = expectDataObject(
    buildDefinition.externalParameters,
    "Provenance externalParameters",
  );
  const externalKeys = ["repository", "revision", "buildCommand", "runtime"] as const;
  if (
    Object.keys(externalParameters).some(
      (key) => !externalKeys.includes(key as (typeof externalKeys)[number]),
    ) ||
    externalKeys.some((key) => !Object.hasOwn(externalParameters, key))
  ) {
    return failProtocol("MALFORMED_OBJECT", "Provenance external parameters are incomplete");
  }
  const parsedExternalParameters = Object.freeze({
    repository: parseSourceRepository(
      externalParameters.repository,
      "externalParameters.repository",
    ),
    revision: parseSourceRevision(externalParameters.revision, "externalParameters.revision"),
    buildCommand: parseSafeBuildCommand(
      externalParameters.buildCommand,
      "externalParameters.buildCommand",
    ),
    runtime: parseBoundedString(externalParameters.runtime, "externalParameters.runtime", 64),
  });
  if (
    !Array.isArray(buildDefinition.resolvedDependencies) ||
    buildDefinition.resolvedDependencies.length > 16
  ) {
    return failProtocol("MALFORMED_OBJECT", "Provenance dependencies are invalid");
  }
  const resolvedDependencies = buildDefinition.resolvedDependencies.map((dependency, index) => {
    const value = expectDataObject(dependency, `Provenance dependency ${index}`);
    if (Object.keys(value).some((key) => !["uri", "digest"].includes(key))) {
      return failProtocol("MALFORMED_OBJECT", "Provenance dependency contains an unknown field");
    }
    const digest = expectDataObject(value.digest, `resolvedDependencies[${index}].digest`);
    const digestEntries = Object.entries(digest);
    if (
      digestEntries.length === 0 ||
      digestEntries.some(
        ([key, digestValue]) =>
          !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key) ||
          typeof digestValue !== "string" ||
          digestValue.length === 0 ||
          digestValue.length > 256,
      )
    ) {
      return failProtocol("MALFORMED_OBJECT", "Provenance dependency digest is invalid");
    }
    return Object.freeze({
      uri: parseBoundedString(value.uri, `resolvedDependencies[${index}].uri`, 2_048),
      digest: Object.freeze(Object.fromEntries(digestEntries) as Record<string, string>),
    });
  });

  const runDetails = expectDataObject(predicate.runDetails, "Provenance runDetails");
  if (Object.keys(runDetails).some((key) => !["builder", "metadata"].includes(key))) {
    return failProtocol("MALFORMED_OBJECT", "Provenance run details contain an unknown field");
  }
  const builder = expectDataObject(runDetails.builder, "Provenance builder");
  const builderVersion = expectDataObject(builder.version, "Provenance builder version");
  if (
    Object.keys(builder).some((key) => !["id", "version"].includes(key)) ||
    Object.keys(builderVersion).some((key) => !/^[A-Za-z][A-Za-z0-9_-]{0,63}$/.test(key))
  ) {
    return failProtocol("MALFORMED_OBJECT", "Provenance builder is invalid");
  }
  const parsedBuilderVersion = Object.freeze(
    Object.fromEntries(
      Object.entries(builderVersion).map(([key, value]) => [
        key,
        parseBoundedString(value, `builder.version.${key}`, 128),
      ]),
    ) as Record<string, string>,
  );
  const metadata = expectDataObject(runDetails.metadata, "Provenance metadata");
  const metadataKeys = ["invocationId", "startedOn", "finishedOn"] as const;
  if (
    Object.keys(metadata).some(
      (key) => !metadataKeys.includes(key as (typeof metadataKeys)[number]),
    ) ||
    metadataKeys.some((key) => !Object.hasOwn(metadata, key))
  ) {
    return failProtocol("MALFORMED_OBJECT", "Provenance metadata is incomplete");
  }
  const parsedMetadata = Object.freeze({
    invocationId: parseBoundedString(metadata.invocationId, "metadata.invocationId", 256),
    startedOn: parseBoundedString(metadata.startedOn, "metadata.startedOn", 64),
    finishedOn: parseBoundedString(metadata.finishedOn, "metadata.finishedOn", 64),
  });
  return Object.freeze({
    _type: record._type,
    subject: Object.freeze([
      Object.freeze({ name: subjectName, digest: Object.freeze({ sha256: subjectSha }) }),
    ]) as unknown as BuildProvenanceStatement["subject"],
    predicateType: record.predicateType,
    predicate: Object.freeze({
      buildDefinition: Object.freeze({
        buildType,
        externalParameters: parsedExternalParameters,
        resolvedDependencies: Object.freeze(resolvedDependencies),
      }),
      runDetails: Object.freeze({
        builder: Object.freeze({
          id: parseBoundedString(builder.id, "builder.id", 512),
          version: parsedBuilderVersion,
        }),
        metadata: parsedMetadata,
      }),
    }),
  });
}

export function parseBuildIntegrityEvidence(input: unknown): BuildIntegrityEvidence {
  const record = expectExactSchema(
    input,
    "BuildIntegrityEvidence",
    BUILD_INTEGRITY_SCHEMA_VERSION,
    BUILD_INTEGRITY_SCHEMA_VERSION,
    [
      "buildId",
      "sourceRepository",
      "sourceRevision",
      "sourceSnapshotDigest",
      "artifactDigest",
      "buildCommand",
      "lockfileDigest",
      "builder",
      "runtime",
      "buildStatus",
      "provenance",
    ],
    new Set(["buildId", "sourceRevision", "sourceSnapshotDigest", "artifactDigest"]),
  );
  const builder = expectDataObject(record.record.builder, "builder");
  if (Object.keys(builder).some((key) => !["id", "version"].includes(key))) {
    return failProtocol("MALFORMED_OBJECT", "Builder contains an unknown field", "builder");
  }
  const runtime = expectDataObject(record.record.runtime, "runtime");
  if (Object.keys(runtime).some((key) => !["name", "version", "image"].includes(key))) {
    return failProtocol("MALFORMED_OBJECT", "Runtime contains an unknown field", "runtime");
  }
  if (record.record.buildStatus !== "BUILD_SUCCEEDED") {
    return failProtocol(
      "MALFORMED_OBJECT",
      "Build integrity evidence is not successful",
      "buildStatus",
    );
  }
  const parsed: BuildIntegrityEvidence = Object.freeze({
    schemaVersion: BUILD_INTEGRITY_SCHEMA_VERSION,
    buildId: parseRobotBuildId(record.record.buildId),
    sourceRepository: parseSourceRepository(record.record.sourceRepository),
    sourceRevision: parseSourceRevision(record.record.sourceRevision),
    sourceSnapshotDigest: parseSha256Digest(
      record.record.sourceSnapshotDigest,
      "sourceSnapshotDigest",
    ),
    artifactDigest: parseSha256Digest(record.record.artifactDigest, "artifactDigest"),
    buildCommand: parseSafeBuildCommand(record.record.buildCommand),
    lockfileDigest: parseSha256Digest(record.record.lockfileDigest, "lockfileDigest"),
    builder: Object.freeze({
      id: parseBoundedString(builder.id, "builder.id", 512),
      version: parseBoundedString(builder.version, "builder.version", 128),
    }),
    runtime: Object.freeze({
      name:
        runtime.name === "bun" || runtime.name === "node"
          ? runtime.name
          : failProtocol("MALFORMED_OBJECT", "Runtime name is invalid", "runtime.name"),
      version: parseBoundedString(runtime.version, "runtime.version", 128),
      image: parseBoundedString(runtime.image, "runtime.image", 512),
    }),
    buildStatus: "BUILD_SUCCEEDED",
    provenance: parseProvenanceStatement(record.record.provenance),
  });
  if (
    parsed.provenance.subject[0].digest.sha256 !== parsed.artifactDigest.slice("sha256:".length)
  ) {
    return failProtocol(
      "DIGEST_MISMATCH",
      "Provenance subject does not match artifact",
      "provenance",
    );
  }
  if (
    parsed.provenance.predicate.buildDefinition.externalParameters.revision !==
    parsed.sourceRevision
  ) {
    return failProtocol(
      "BINDING_MISMATCH",
      "Provenance source revision does not match evidence",
      "provenance",
    );
  }
  if (
    parsed.provenance.predicate.buildDefinition.externalParameters.repository !==
    parsed.sourceRepository
  ) {
    return failProtocol(
      "BINDING_MISMATCH",
      "Provenance source repository does not match evidence",
      "provenance",
    );
  }
  return parsed;
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
  const candidate = expectDataObject(input, "RobotBuildDescriptor");
  if (candidate.schemaVersion === SOURCE_ROBOT_BUILD_SCHEMA_VERSION) {
    const record = expectExactSchema(
      candidate,
      "RobotBuildDescriptor",
      SOURCE_ROBOT_BUILD_SCHEMA_VERSION,
      SOURCE_ROBOT_BUILD_SCHEMA_VERSION,
      ["robotId", "robotBuildId", "artifactDigest", "buildIntegrityDigest"],
      new Set(["robotId", "robotBuildId", "artifactDigest", "buildIntegrityDigest"]),
    );
    return Object.freeze({
      schemaVersion: SOURCE_ROBOT_BUILD_SCHEMA_VERSION,
      robotId: parseRobotId(record.record.robotId),
      robotBuildId: parseRobotBuildId(record.record.robotBuildId),
      artifactDigest: parseSha256Digest(record.record.artifactDigest, "artifactDigest"),
      buildIntegrityDigest: parseBuildIntegrityDigest(record.record.buildIntegrityDigest),
    });
  }
  const record = expectExactSchema(
    input,
    "RobotBuildDescriptor",
    ROBOT_BUILD_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSIONS.robotBuild,
    ["robotId", "robotBuildId", "artifactDigest"],
    new Set(["robotId", "robotBuildId", "artifactDigest"]),
  );
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy" ? LEGACY_SCHEMA_VERSIONS.robotBuild : ROBOT_BUILD_SCHEMA_VERSION,
    robotId: parseRobotId(record.record.robotId),
    robotBuildId: parseRobotBuildId(record.record.robotBuildId),
    artifactDigest: parseSha256Digest(record.record.artifactDigest, "artifactDigest"),
  });
}

export function parseSafetyEnvelopeMetadata(input: unknown): SafetyEnvelopeMetadata {
  const record = expectExactSchema(
    input,
    "SafetyEnvelopeMetadata",
    SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSIONS.safetyEnvelopeMetadata,
    ["siteId", "safetyEnvelopeId", "safetyEnvelopeCommitment"],
    new Set(["siteId", "safetyEnvelopeId", "safetyEnvelopeCommitment"]),
  );
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.safetyEnvelopeMetadata
        : SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
    siteId: parseSiteId(record.record.siteId),
    safetyEnvelopeId: parseSafetyEnvelopeId(record.record.safetyEnvelopeId),
    safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(
      record.record.safetyEnvelopeCommitment,
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
    LEGACY_SCHEMA_VERSIONS.evaluationInputs,
    bindings,
    new Set(bindings),
  );
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.evaluationInputs
        : EVALUATION_INPUTS_SCHEMA_VERSION,
    siteId: parseSiteId(record.record.siteId),
    robotId: parseRobotId(record.record.robotId),
    robotBuildId: parseRobotBuildId(record.record.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(record.record.robotBuildDigest),
    safetyEnvelopeId: parseSafetyEnvelopeId(record.record.safetyEnvelopeId),
    safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(record.record.safetyEnvelopeCommitment),
    evaluatorVersion: parseEvaluatorVersionId(record.record.evaluatorVersion),
  });
}

export function parseEvaluationRequest(input: unknown): EvaluationRequest {
  const record = expectExactSchema(
    input,
    "EvaluationRequest",
    EVALUATION_REQUEST_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSIONS.evaluationRequest,
    ["evaluationId", "inputs", "requestedAt"],
    new Set(["evaluationId", "inputs"]),
  );
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.evaluationRequest
        : EVALUATION_REQUEST_SCHEMA_VERSION,
    evaluationId: parseEvaluationId(record.record.evaluationId),
    inputs: parseEvaluationInputs(record.record.inputs),
    requestedAt: parseUnixTimestamp(record.record.requestedAt, "requestedAt"),
  });
}

export function parseEvaluationResult(input: unknown): EvaluationResult {
  const record = expectExactSchema(
    input,
    "EvaluationResult",
    EVALUATION_RESULT_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSIONS.evaluationResult,
    ["evaluationId", "inputs", "evaluationInputsDigest", "verdict", "evaluatedAt"],
    new Set(["evaluationId", "inputs", "evaluationInputsDigest", "verdict"]),
  );
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.evaluationResult
        : EVALUATION_RESULT_SCHEMA_VERSION,
    evaluationId: parseEvaluationId(record.record.evaluationId),
    inputs: parseEvaluationInputs(record.record.inputs),
    evaluationInputsDigest: parseEvaluationInputsDigest(record.record.evaluationInputsDigest),
    verdict: parseEvaluationVerdict(record.record.verdict, "verdict"),
    evaluatedAt: parseUnixTimestamp(record.record.evaluatedAt, "evaluatedAt"),
  });
}

export function parseClearanceRecord(input: unknown): ClearanceRecord {
  const record = expectExactSchema(
    input,
    "ClearanceRecord",
    CLEARANCE_RECORD_SCHEMA_VERSION,
    LEGACY_SCHEMA_VERSIONS.clearanceRecord,
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
  if (record.record.verdict !== "CLEAR") {
    return failProtocol("MALFORMED_OBJECT", "ClearanceRecord verdict must be CLEAR", "verdict");
  }
  const issuedAt = parseUnixTimestamp(record.record.issuedAt, "issuedAt");
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.clearanceRecord
        : CLEARANCE_RECORD_SCHEMA_VERSION,
    clearanceId: parseClearanceId(record.record.clearanceId),
    evaluationId: parseEvaluationId(record.record.evaluationId),
    inputs: parseEvaluationInputs(record.record.inputs),
    evaluationInputsDigest: parseEvaluationInputsDigest(record.record.evaluationInputsDigest),
    verdict: "CLEAR",
    issuedAt,
    expiresAt: parseExpiry(record.record.expiresAt, issuedAt, "expiresAt"),
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
    LEGACY_SCHEMA_VERSIONS.deploymentIntent,
    [...bindingKeys, "targetEnvironment", "nonce", "issuedAt", "expiresAt"],
    new Set(bindingKeys),
  );
  if (record.record.action !== DEPLOYMENT_ACTION) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "DeploymentIntent action must be ACTIVATE_DEPLOYMENT",
      "action",
    );
  }
  if (record.record.targetEnvironment !== "sepolia") {
    return failProtocol(
      "MALFORMED_OBJECT",
      "DeploymentIntent targetEnvironment must be sepolia in protocol v1",
      "targetEnvironment",
    );
  }
  const issuedAt = parseUnixTimestamp(record.record.issuedAt, "issuedAt");
  return Object.freeze({
    schemaVersion:
      record.dialect === "legacy"
        ? LEGACY_SCHEMA_VERSIONS.deploymentIntent
        : DEPLOYMENT_INTENT_SCHEMA_VERSION,
    action: DEPLOYMENT_ACTION,
    siteId: parseSiteId(record.record.siteId),
    robotId: parseRobotId(record.record.robotId),
    robotBuildId: parseRobotBuildId(record.record.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(record.record.robotBuildDigest),
    clearanceId: parseClearanceId(record.record.clearanceId),
    clearanceDigest: parseClearanceDigest(record.record.clearanceDigest),
    targetEnvironment: "sepolia",
    nonce: parseDeploymentNonce(record.record.nonce),
    issuedAt,
    expiresAt: parseExpiry(record.record.expiresAt, issuedAt, "expiresAt"),
  });
}
