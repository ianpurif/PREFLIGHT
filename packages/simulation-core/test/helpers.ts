import {
  digestRobotBuild,
  digestSafetyEnvelopeCommitment,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  EVALUATION_REQUEST_SCHEMA_VERSION,
  parseEvaluationInputs,
  parseEvaluationRequest,
  parseEvaluatorVersionId,
  parseRobotBuildDescriptor,
  parseSha256Digest,
  ROBOT_BUILD_SCHEMA_VERSION,
} from "@rovaulta/domain";
import {
  CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
  confidentialEnvelopeCommitmentPayload,
  parseConfidentialEvaluationEnvelope,
  parseRobotBehaviorTraceSuite,
  ROBOT_TRACE_SUITE_VERSION,
  SCENARIO_GENERATOR_VERSION,
  WAREHOUSE_EVALUATOR_VERSION,
} from "../src/index.js";

export interface SingleScenarioOptions {
  readonly rules: readonly Record<string, unknown>[];
  readonly payloadGrams?: number;
  readonly start?: Readonly<{ xMm: number; yMm: number }>;
  readonly end?: Readonly<{ xMm: number; yMm: number }>;
  readonly speedMmPerSecond?: number;
}

export function createSingleScenarioInput(options: SingleScenarioOptions) {
  const blind = new Uint8Array(32).fill(7);
  const confidentialEnvelope = parseConfidentialEvaluationEnvelope({
    schemaVersion: CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
    siteId: "site:test-warehouse",
    safetyEnvelopeId: "safety-envelope:test-v1",
    warehouseBounds: { minXmm: 0, minYmm: 0, maxXmm: 1_000, maxYmm: 1_000 },
    zones: [
      {
        zoneId: "zone:target",
        bounds: { minXmm: 400, minYmm: 400, maxXmm: 600, maxYmm: 600 },
      },
    ],
    rules: options.rules,
    scenarioGeneration: {
      generatorVersion: SCENARIO_GENERATOR_VERSION,
      seed: 1,
      templates: [
        {
          scenarioId: "scenario:single",
          basePayloadGrams: options.payloadGrams ?? 0,
          payloadVariationGrams: 0,
        },
      ],
    },
  });
  const traceData = [
    {
      scenarioId: "scenario:single",
      steps: [
        {
          stepIndex: 0,
          position: options.start ?? { xMm: 100, yMm: 500 },
          speedMmPerSecond: 0,
        },
        {
          stepIndex: 1,
          position: options.end ?? { xMm: 900, yMm: 500 },
          speedMmPerSecond: options.speedMmPerSecond ?? 0,
        },
      ],
    },
  ];
  const robotBuild = parseRobotBuildDescriptor({
    schemaVersion: ROBOT_BUILD_SCHEMA_VERSION,
    robotId: "robot:test-amr",
    robotBuildId: "robot-build:test-v1",
    artifactDigest: parseSha256Digest(`sha256:${"44".repeat(32)}`),
  });
  const commitment = digestSafetyEnvelopeCommitment(
    confidentialEnvelope.siteId,
    confidentialEnvelope.safetyEnvelopeId,
    confidentialEnvelopeCommitmentPayload(confidentialEnvelope),
    blind,
  );
  const inputs = parseEvaluationInputs({
    schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
    siteId: confidentialEnvelope.siteId,
    robotId: robotBuild.robotId,
    robotBuildId: robotBuild.robotBuildId,
    robotBuildDigest: digestRobotBuild(robotBuild),
    safetyEnvelopeId: confidentialEnvelope.safetyEnvelopeId,
    safetyEnvelopeCommitment: commitment,
    evaluatorVersion: parseEvaluatorVersionId(WAREHOUSE_EVALUATOR_VERSION),
  });
  const request = parseEvaluationRequest({
    schemaVersion: EVALUATION_REQUEST_SCHEMA_VERSION,
    evaluationId: "evaluation:single",
    inputs,
    requestedAt: "1788547200",
  });
  const behaviorTraces = parseRobotBehaviorTraceSuite({
    schemaVersion: ROBOT_TRACE_SUITE_VERSION,
    robotId: robotBuild.robotId,
    robotBuildId: robotBuild.robotBuildId,
    robotBuildDigest: digestRobotBuild(robotBuild),
    traces: traceData,
  });
  return {
    request,
    robotBuild,
    confidentialEnvelope,
    envelopeBlindingSecret: blind,
    behaviorTraces,
    evaluatedAt: "1788547210",
  };
}

export function createMaximumShapeInput() {
  const base = createSingleScenarioInput({
    rules: [{ ruleId: "rule:base", type: "restricted-zone", zoneId: "zone:target" }],
  });
  const traces = Array.from({ length: 16 }, (_, index) => ({
    scenarioId: `scenario:max-${String(index).padStart(2, "0")}`,
    steps: Array.from({ length: 32 }, (_, stepIndex) => ({
      stepIndex,
      position: stepIndex === 0 ? { xMm: 100, yMm: 500 } : { xMm: 900, yMm: 500 },
      speedMmPerSecond: stepIndex === 0 ? 0 : 100,
    })),
  }));
  const confidentialEnvelope = parseConfidentialEvaluationEnvelope({
    ...base.confidentialEnvelope,
    rules: Array.from({ length: 16 }, (_, index) => ({
      ruleId: `rule:max-${String(index).padStart(2, "0")}`,
      type: "restricted-zone",
      zoneId: "zone:target",
    })),
    scenarioGeneration: {
      generatorVersion: SCENARIO_GENERATOR_VERSION,
      seed: 1,
      templates: traces.map((trace) => ({
        scenarioId: trace.scenarioId,
        basePayloadGrams: 0,
        payloadVariationGrams: 0,
      })),
    },
  });
  const robotBuild = base.robotBuild;
  const commitment = digestSafetyEnvelopeCommitment(
    confidentialEnvelope.siteId,
    confidentialEnvelope.safetyEnvelopeId,
    confidentialEnvelopeCommitmentPayload(confidentialEnvelope),
    base.envelopeBlindingSecret,
  );
  const inputs = parseEvaluationInputs({
    ...base.request.inputs,
    robotBuildDigest: digestRobotBuild(robotBuild),
    safetyEnvelopeCommitment: commitment,
  });
  const request = parseEvaluationRequest({
    ...base.request,
    inputs,
  });
  const behaviorTraces = parseRobotBehaviorTraceSuite({
    schemaVersion: ROBOT_TRACE_SUITE_VERSION,
    robotId: robotBuild.robotId,
    robotBuildId: robotBuild.robotBuildId,
    robotBuildDigest: digestRobotBuild(robotBuild),
    traces,
  });
  return {
    request,
    robotBuild,
    confidentialEnvelope,
    envelopeBlindingSecret: base.envelopeBlindingSecret,
    behaviorTraces,
    evaluatedAt: base.evaluatedAt,
  };
}
