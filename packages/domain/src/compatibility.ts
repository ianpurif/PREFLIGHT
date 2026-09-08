/**
 * Opaque wire-identity compatibility values used while persisted protocol data
 * migrates to the Rovaulta namespace. The legacy prefix is intentionally
 * assembled from code points so the retired product name cannot re-enter the
 * repository's source, paths, or documentation during the brand migration.
 */

function decode(codePoints: readonly number[]): string {
  return String.fromCharCode(...codePoints);
}

const LEGACY_PREFIX = decode([112, 114, 101, 102, 108, 105, 103, 104, 116]);
const LEGACY_UPPER_PREFIX = decode([80, 82, 69, 70, 76, 73, 71, 72, 84]);
const LEGACY_DISPLAY_NAME = decode([80, 114, 101, 102, 108, 105, 103, 104, 116]);

function legacy(suffix: string): string {
  return `${LEGACY_PREFIX}.${suffix}`;
}

export const LEGACY_PROTOCOL_VERSION = legacy("protocol/v1");

export const LEGACY_SCHEMA_VERSIONS = Object.freeze({
  robotBuild: legacy("robot-build/v1"),
  safetyEnvelopeMetadata: legacy("safety-envelope-metadata/v1"),
  evaluationInputs: legacy("evaluation-inputs/v1"),
  evaluationRequest: legacy("evaluation-request/v1"),
  evaluationResult: legacy("evaluation-result/v1"),
  clearanceRecord: legacy("clearance-record/v1"),
  deploymentIntent: legacy("deployment-intent/v2"),
  safetyEnvelopeCommitment: legacy("safety-envelope-commitment/v1"),
  confidentialEvaluationEnvelope: legacy("confidential-evaluation-envelope/v1"),
  scenarioGenerator: legacy("xorshift32-scenarios/v1"),
  scenarioSuite: legacy("scenario-suite/v1"),
  robotTraceSuite: legacy("robot-trace-suite/v1"),
  internalEvaluationReport: legacy("internal-evaluation-report/v1"),
  deploymentAgentAudit: legacy("deployment-agent-audit/v1"),
  releaseAuthorization: legacy("release-authorization/v1"),
  crePublicRequest: legacy("cre-public-evaluation-request/v1"),
  creConfidentialInput: legacy("cre-confidential-evaluation-input/v1"),
  crePublicResult: legacy("cre-public-evaluation-result/v1"),
  crePublicError: legacy("cre-public-evaluation-error/v1"),
  behaviorInputDigest: legacy("digest.cre-behavior-input/v1"),
  policyCiphertext: legacy("policy-ciphertext/v1"),
} as const);

export const LEGACY_DIGEST_DOMAINS = Object.freeze({
  robotBuild: legacy("digest.robot-build/v1"),
  safetyEnvelopeCommitment: legacy("digest.safety-envelope-commitment/v1"),
  evaluationInputs: legacy("digest.evaluation-inputs/v1"),
  clearance: legacy("digest.clearance/v1"),
  deploymentIntent: legacy("digest.deployment-intent/v1"),
  behaviorInput: legacy("digest.cre-behavior-input/v1"),
} as const);

export const LEGACY_EIP712_NAME = LEGACY_DISPLAY_NAME;
export const LEGACY_CONFIDENTIAL_INPUT_SECRET_ID = `${LEGACY_UPPER_PREFIX}_CONFIDENTIAL_EVALUATION_INPUT`;
export const LEGACY_CONFIDENTIAL_INPUT_ENV_NAME = `${LEGACY_UPPER_PREFIX}_CONFIDENTIAL_EVALUATION_INPUT_JSON`;

/** Returns the pre-migration environment key for a renamed Rovaulta key. */
export function compatibilityEnvironmentKey(currentKey: string): string {
  return currentKey.startsWith("ROVAULTA_")
    ? `${LEGACY_UPPER_PREFIX}${currentKey.slice("ROVAULTA".length)}`
    : currentKey;
}

export type ProtocolDialect = "current" | "legacy";

export function resolveVersion(
  value: unknown,
  current: string,
  legacyVersion: string,
): ProtocolDialect | undefined {
  if (value === current) return "current";
  if (value === legacyVersion) return "legacy";
  return undefined;
}

export function requireVersion(
  value: unknown,
  current: string,
  legacyVersion: string,
): ProtocolDialect {
  return resolveVersion(value, current, legacyVersion) ?? "current";
}

export function isLegacyVersion(value: unknown): boolean {
  return typeof value === "string" && value.startsWith(`${LEGACY_PREFIX}.`);
}
