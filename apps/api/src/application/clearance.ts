import {
  assertClearanceBindings,
  CLEARANCE_RECORD_SCHEMA_VERSION,
  type ClearanceRecord,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  EVALUATION_RESULT_SCHEMA_VERSION,
  parseClearanceRecord,
  parseEvaluationResult,
} from "@rovaulta/domain";
import { ApplicationError } from "./errors.js";
import type { PublicEvaluation } from "./store.js";

/**
 * Creates the public P1 clearance record that corresponds to one account-owned
 * evaluation. The caller supplies only the operator's clearance id and
 * timestamps; every site, robot, build, envelope commitment, evaluator, and
 * evaluation digest binding comes from the stored evaluation.
 */
export function createClearanceRecordFromEvaluation(
  evaluation: PublicEvaluation,
  input: {
    readonly clearanceId: string;
    readonly issuedAt: string;
    readonly expiresAt: string;
  },
): ClearanceRecord {
  if (evaluation.verdict !== "CLEAR") {
    throw new ApplicationError(
      "CONFLICT",
      "Only an account evaluation with a CLEAR verdict can produce a clearance",
    );
  }

  const result = parseEvaluationResult({
    schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
    evaluationId: evaluation.evaluationId,
    inputs: {
      schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
      siteId: evaluation.siteId,
      robotId: evaluation.robotId,
      robotBuildId: evaluation.robotBuildId,
      robotBuildDigest: evaluation.robotBuildDigest,
      safetyEnvelopeId: evaluation.safetyEnvelopeId,
      safetyEnvelopeCommitment: evaluation.safetyEnvelopeCommitment,
      evaluatorVersion: evaluation.evaluatorVersion,
    },
    evaluationInputsDigest: evaluation.evaluationInputsDigest,
    verdict: evaluation.verdict,
    evaluatedAt: evaluation.evaluatedAt,
  });

  const clearance = parseClearanceRecord({
    schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
    clearanceId: input.clearanceId,
    evaluationId: result.evaluationId,
    inputs: result.inputs,
    evaluationInputsDigest: result.evaluationInputsDigest,
    verdict: "CLEAR",
    issuedAt: input.issuedAt,
    expiresAt: input.expiresAt,
  });

  return assertClearanceBindings(clearance, result);
}
