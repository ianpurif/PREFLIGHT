import {
  CLEARANCE_RECORD_SCHEMA_VERSION,
  createDeploymentIntent,
  digestClearance,
  digestEvaluationInputs,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  parseClearanceId,
  parseClearanceRecord,
  parseDeploymentNonce,
  parseEvaluationId,
  parseEvaluatorVersionId,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeCommitment,
  parseSafetyEnvelopeId,
  parseSiteId,
  parseUnixTimestamp,
} from "@rovaulta/domain";

const inputs = {
  schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
  siteId: parseSiteId("site:warehouse-a"),
  robotId: parseRobotId("robot:picker-01"),
  robotBuildId: parseRobotBuildId("robot-build:release-001"),
  robotBuildDigest: parseRobotBuildDigest(`sha256:${"11".repeat(32)}`),
  safetyEnvelopeId: parseSafetyEnvelopeId("safety-envelope:warehouse-a-v1"),
  safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(`sha256:${"22".repeat(32)}`),
  evaluatorVersion: parseEvaluatorVersionId("evaluator-version:deterministic-v1"),
} as const;

export const clearanceFixture = parseClearanceRecord({
  schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
  clearanceId: parseClearanceId("clearance:p5-release-001"),
  evaluationId: parseEvaluationId("evaluation:p5-release-001"),
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  issuedAt: parseUnixTimestamp("1788547220"),
  expiresAt: parseUnixTimestamp("1788550800"),
});

export const intentFixture = createDeploymentIntent(clearanceFixture, {
  targetEnvironment: "sepolia",
  nonce: parseDeploymentNonce("release_nonce_p5_0001"),
  issuedAt: parseUnixTimestamp("1788547230"),
  expiresAt: parseUnixTimestamp("1788549000"),
});

export const clearanceDigestFixture = digestClearance(clearanceFixture);
