import type { ClearanceDigest } from "./digest-values";
import { digestClearance, digestEvaluationInputs, digestRobotBuild } from "./digests";
import { failProtocol } from "./errors";
import {
  type ClearanceRecord,
  compareUnixTimestamps,
  DEPLOYMENT_ACTION,
  DEPLOYMENT_INTENT_SCHEMA_VERSION,
  type DeploymentIntent,
  type DeploymentNonce,
  type DeploymentTarget,
  type EvaluationInputs,
  type EvaluationResult,
  parseClearanceRecord,
  parseDeploymentIntent,
  parseEvaluationInputs,
  parseEvaluationRequest,
  parseEvaluationResult,
  parseRobotBuildDescriptor,
  parseSafetyEnvelopeMetadata,
  type UnixTimestamp,
} from "./schemas";

function assertBinding(actual: string, expected: string, path: string): void {
  if (actual !== expected) {
    failProtocol("BINDING_MISMATCH", "Protocol binding does not match", path);
  }
}

function assertDigest(actual: string, expected: string, path: string): void {
  if (actual !== expected) {
    failProtocol("DIGEST_MISMATCH", "Protocol digest does not match", path);
  }
}

function assertInputs(actual: EvaluationInputs, expected: EvaluationInputs, path: string): void {
  assertBinding(actual.siteId, expected.siteId, `${path}.siteId`);
  assertBinding(actual.robotId, expected.robotId, `${path}.robotId`);
  assertBinding(actual.robotBuildId, expected.robotBuildId, `${path}.robotBuildId`);
  assertDigest(actual.robotBuildDigest, expected.robotBuildDigest, `${path}.robotBuildDigest`);
  assertBinding(actual.safetyEnvelopeId, expected.safetyEnvelopeId, `${path}.safetyEnvelopeId`);
  assertDigest(
    actual.safetyEnvelopeCommitment,
    expected.safetyEnvelopeCommitment,
    `${path}.safetyEnvelopeCommitment`,
  );
  assertBinding(actual.evaluatorVersion, expected.evaluatorVersion, `${path}.evaluatorVersion`);
}

export function assertEvaluationInputBindings(
  evaluationInputsInput: unknown,
  robotBuildInput: unknown,
  safetyEnvelopeMetadataInput: unknown,
): EvaluationInputs {
  const inputs = parseEvaluationInputs(evaluationInputsInput);
  const robotBuild = parseRobotBuildDescriptor(robotBuildInput);
  const envelope = parseSafetyEnvelopeMetadata(safetyEnvelopeMetadataInput);

  assertBinding(inputs.robotId, robotBuild.robotId, "inputs.robotId");
  assertBinding(inputs.robotBuildId, robotBuild.robotBuildId, "inputs.robotBuildId");
  assertDigest(inputs.robotBuildDigest, digestRobotBuild(robotBuild), "inputs.robotBuildDigest");
  assertBinding(inputs.siteId, envelope.siteId, "inputs.siteId");
  assertBinding(inputs.safetyEnvelopeId, envelope.safetyEnvelopeId, "inputs.safetyEnvelopeId");
  assertDigest(
    inputs.safetyEnvelopeCommitment,
    envelope.safetyEnvelopeCommitment,
    "inputs.safetyEnvelopeCommitment",
  );
  return inputs;
}

export function assertEvaluationResultBindings(
  evaluationResultInput: unknown,
  evaluationRequestInput: unknown,
): EvaluationResult {
  const result = parseEvaluationResult(evaluationResultInput);
  const request = parseEvaluationRequest(evaluationRequestInput);
  assertBinding(result.evaluationId, request.evaluationId, "evaluationId");
  assertInputs(result.inputs, request.inputs, "inputs");
  assertDigest(
    result.evaluationInputsDigest,
    digestEvaluationInputs(request.inputs),
    "evaluationInputsDigest",
  );
  if (compareUnixTimestamps(result.evaluatedAt, request.requestedAt) < 0) {
    failProtocol("BINDING_MISMATCH", "Evaluation cannot precede its request", "evaluatedAt");
  }
  return result;
}

export function assertClearanceBindings(
  clearanceInput: unknown,
  evaluationResultInput: unknown,
): ClearanceRecord {
  const clearance = parseClearanceRecord(clearanceInput);
  const result = parseEvaluationResult(evaluationResultInput);
  assertDigest(
    result.evaluationInputsDigest,
    digestEvaluationInputs(result.inputs),
    "evaluationResult.evaluationInputsDigest",
  );
  assertDigest(
    clearance.evaluationInputsDigest,
    digestEvaluationInputs(clearance.inputs),
    "clearance.evaluationInputsDigest",
  );
  assertBinding(clearance.evaluationId, result.evaluationId, "evaluationId");
  assertInputs(clearance.inputs, result.inputs, "inputs");
  assertDigest(
    clearance.evaluationInputsDigest,
    result.evaluationInputsDigest,
    "evaluationInputsDigest",
  );
  assertBinding(clearance.verdict, result.verdict, "verdict");
  if (compareUnixTimestamps(clearance.issuedAt, result.evaluatedAt) < 0) {
    failProtocol("BINDING_MISMATCH", "Clearance cannot precede its evaluation", "issuedAt");
  }
  return clearance;
}

export interface DeploymentIntentParameters {
  readonly targetEnvironment: DeploymentTarget;
  readonly nonce: DeploymentNonce;
  readonly issuedAt: UnixTimestamp;
  readonly expiresAt: UnixTimestamp;
}

export function createDeploymentIntent(
  clearanceInput: unknown,
  parameters: DeploymentIntentParameters,
): DeploymentIntent {
  const clearance = parseClearanceRecord(clearanceInput);
  const clearanceDigest: ClearanceDigest = digestClearance(clearance);
  const intent = parseDeploymentIntent({
    schemaVersion: DEPLOYMENT_INTENT_SCHEMA_VERSION,
    action: DEPLOYMENT_ACTION,
    siteId: clearance.inputs.siteId,
    robotId: clearance.inputs.robotId,
    robotBuildId: clearance.inputs.robotBuildId,
    robotBuildDigest: clearance.inputs.robotBuildDigest,
    clearanceId: clearance.clearanceId,
    clearanceDigest,
    targetEnvironment: parameters.targetEnvironment,
    nonce: parameters.nonce,
    issuedAt: parameters.issuedAt,
    expiresAt: parameters.expiresAt,
  });
  return assertDeploymentIntentBindings(intent, clearance);
}

export function assertDeploymentIntentBindings(
  deploymentIntentInput: unknown,
  clearanceInput: unknown,
): DeploymentIntent {
  const intent = parseDeploymentIntent(deploymentIntentInput);
  const clearance = parseClearanceRecord(clearanceInput);
  assertBinding(intent.siteId, clearance.inputs.siteId, "siteId");
  assertBinding(intent.robotId, clearance.inputs.robotId, "robotId");
  assertBinding(intent.robotBuildId, clearance.inputs.robotBuildId, "robotBuildId");
  assertDigest(intent.robotBuildDigest, clearance.inputs.robotBuildDigest, "robotBuildDigest");
  assertBinding(intent.clearanceId, clearance.clearanceId, "clearanceId");
  assertDigest(intent.clearanceDigest, digestClearance(clearance), "clearanceDigest");
  if (compareUnixTimestamps(intent.issuedAt, clearance.issuedAt) < 0) {
    failProtocol("BINDING_MISMATCH", "Deployment intent cannot predate clearance", "issuedAt");
  }
  if (compareUnixTimestamps(intent.expiresAt, clearance.expiresAt) > 0) {
    failProtocol("INVALID_EXPIRY", "Deployment intent cannot outlive clearance", "expiresAt");
  }
  return intent;
}
