import { describe, expect, test } from "bun:test";
import { digestEvaluationInputs, ProtocolError, parseEvaluationInputs } from "@rovaulta/domain";
import {
  ApplicationError,
  createClearanceRecordFromEvaluation,
  type PublicEvaluation,
} from "../src/application/index.js";

const inputs = parseEvaluationInputs({
  schemaVersion: "rovaulta.evaluation-inputs/v1",
  siteId: "site:warehouse-a",
  robotId: "robot:amr-01",
  robotBuildId: "robot-build:build-001",
  robotBuildDigest: `sha256:${"11".repeat(32)}`,
  safetyEnvelopeId: "safety-envelope:warehouse-a",
  safetyEnvelopeCommitment: `sha256:${"22".repeat(32)}`,
  evaluatorVersion: "evaluator-version:warehouse-v1",
});

const evaluation: PublicEvaluation = {
  id: "evaluation-record:001",
  siteId: inputs.siteId,
  robotId: inputs.robotId,
  buildId: "robot-build-record:001",
  evaluationId: "evaluation:account-001",
  robotBuildId: inputs.robotBuildId,
  verdict: "CLEAR",
  safetyEnvelopeId: inputs.safetyEnvelopeId,
  evaluatorVersion: inputs.evaluatorVersion,
  robotBuildDigest: inputs.robotBuildDigest,
  safetyEnvelopeCommitment: inputs.safetyEnvelopeCommitment,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  scenarioCount: null,
  violationCount: null,
  reasons: [],
  evaluatedAt: "100",
};

describe("account-backed clearance issuance", () => {
  test("copies only the exact public evaluation bindings into a CLEAR record", () => {
    const clearance = createClearanceRecordFromEvaluation(evaluation, {
      clearanceId: "clearance:account-001",
      issuedAt: "100",
      expiresAt: "200",
    });

    expect(clearance.verdict).toBe("CLEAR");
    expect(clearance.evaluationId as string).toBe(evaluation.evaluationId);
    expect(clearance.inputs).toEqual(inputs);
    expect(clearance.evaluationInputsDigest as string).toBe(evaluation.evaluationInputsDigest);
  });

  test("refuses non-CLEAR account evaluations before constructing a record", () => {
    try {
      createClearanceRecordFromEvaluation(
        { ...evaluation, verdict: "HOLD" },
        {
          clearanceId: "clearance:account-001",
          issuedAt: "100",
          expiresAt: "200",
        },
      );
      throw new Error("expected issuance to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(ApplicationError);
      expect((error as ApplicationError).code).toBe("CONFLICT");
    }
  });

  test("refuses an expiry before the evaluation and invalid identifiers", () => {
    expect(() =>
      createClearanceRecordFromEvaluation(evaluation, {
        clearanceId: "clearance:account-001",
        issuedAt: "99",
        expiresAt: "200",
      }),
    ).toThrow(ProtocolError);
    expect(() =>
      createClearanceRecordFromEvaluation(evaluation, {
        clearanceId: "clearance:UPPER",
        issuedAt: "100",
        expiresAt: "200",
      }),
    ).toThrow(ProtocolError);
  });
});
