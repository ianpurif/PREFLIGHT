import {
  digestRobotBuild,
  digestSafetyEnvelopeCommitment,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  EVALUATION_REQUEST_SCHEMA_VERSION,
  type EvaluationRequest,
  parseEvaluationInputs,
  parseEvaluationRequest,
  parseEvaluatorVersionId,
  parseRobotBuildDescriptor,
  parseSha256Digest,
  ROBOT_BUILD_SCHEMA_VERSION,
  type RobotBuildDescriptor,
} from "@preflight/domain";
import {
  CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
  type ConfidentialEvaluationEnvelope,
  confidentialEnvelopeCommitmentPayload,
  parseConfidentialEvaluationEnvelope,
  parseRobotBehaviorTraceSuite,
  ROBOT_TRACE_SUITE_VERSION,
  type RobotBehaviorTraceSuite,
  SCENARIO_GENERATOR_VERSION,
  type ScenarioSuite,
  WAREHOUSE_EVALUATOR_VERSION,
} from "./model";
import { generateScenarioSuite } from "./scenarios";

export interface DemoEvaluationCase {
  readonly robotBuild: RobotBuildDescriptor;
  readonly request: EvaluationRequest;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly evaluatedAt: string;
}

export interface DeterministicDemoFixture {
  readonly confidentialEnvelope: ConfidentialEvaluationEnvelope;
  readonly envelopeBlindingSecret: Uint8Array;
  readonly scenarioSuite: ScenarioSuite;
  readonly unsafeFixtureBuild: DemoEvaluationCase;
  readonly correctedFixtureBuild: DemoEvaluationCase;
}

function makeTrace(
  scenarioId: string,
  start: { readonly xMm: number; readonly yMm: number },
  end: { readonly xMm: number; readonly yMm: number },
  segmentSpeedMmPerSecond: number,
) {
  return {
    scenarioId,
    steps: [
      { stepIndex: 0, position: start, speedMmPerSecond: 0 },
      { stepIndex: 1, position: end, speedMmPerSecond: segmentSpeedMmPerSecond },
    ],
  };
}

function createBuildAndRequest(
  buildToken: "unsafe-v1" | "corrected-v1",
  evaluationToken: "unsafe-demo" | "corrected-demo",
  envelope: ConfidentialEvaluationEnvelope,
  envelopeBlindingSecret: Uint8Array,
): { readonly robotBuild: RobotBuildDescriptor; readonly request: EvaluationRequest } {
  const robotBuild = parseRobotBuildDescriptor({
    schemaVersion: ROBOT_BUILD_SCHEMA_VERSION,
    robotId: "robot:demo-amr-01",
    robotBuildId: `robot-build:${buildToken}`,
    artifactDigest: parseSha256Digest(
      `sha256:${buildToken === "unsafe-v1" ? "11".repeat(32) : "22".repeat(32)}`,
    ),
  });
  const safetyEnvelopeCommitment = digestSafetyEnvelopeCommitment(
    envelope.siteId,
    envelope.safetyEnvelopeId,
    confidentialEnvelopeCommitmentPayload(envelope),
    envelopeBlindingSecret,
  );
  const inputs = parseEvaluationInputs({
    schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
    siteId: envelope.siteId,
    robotId: robotBuild.robotId,
    robotBuildId: robotBuild.robotBuildId,
    robotBuildDigest: digestRobotBuild(robotBuild),
    safetyEnvelopeId: envelope.safetyEnvelopeId,
    safetyEnvelopeCommitment,
    evaluatorVersion: parseEvaluatorVersionId(WAREHOUSE_EVALUATOR_VERSION),
  });
  return Object.freeze({
    robotBuild,
    request: parseEvaluationRequest({
      schemaVersion: EVALUATION_REQUEST_SCHEMA_VERSION,
      evaluationId: `evaluation:${evaluationToken}`,
      inputs,
      requestedAt: "1788547200",
    }),
  });
}

/** Synthetic data policies only; these do not execute a real robot build or prove physical safety. */
export function createDeterministicDemoFixture(): DeterministicDemoFixture {
  const envelopeBlindingSecret = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
  const confidentialEnvelope = parseConfidentialEvaluationEnvelope({
    schemaVersion: CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
    siteId: "site:demo-warehouse",
    safetyEnvelopeId: "safety-envelope:demo-v1",
    warehouseBounds: { minXmm: 0, minYmm: 0, maxXmm: 10_000, maxYmm: 10_000 },
    zones: [
      {
        zoneId: "zone:f",
        bounds: { minXmm: 7_000, minYmm: 7_000, maxXmm: 9_000, maxYmm: 9_000 },
      },
      {
        zoneId: "zone:c",
        bounds: { minXmm: 3_000, minYmm: 3_000, maxXmm: 5_000, maxYmm: 5_000 },
      },
      {
        zoneId: "zone:b",
        bounds: { minXmm: 6_000, minYmm: 1_000, maxXmm: 8_000, maxYmm: 2_500 },
      },
    ],
    rules: [
      { ruleId: "rule:restricted-f", type: "restricted-zone", zoneId: "zone:f" },
      {
        ruleId: "rule:human-zone-c-speed",
        type: "zone-speed-limit",
        zoneId: "zone:c",
        maximumMmPerSecond: 600,
      },
      {
        ruleId: "rule:heavy-payload-zone-b",
        type: "payload-zone-restriction",
        zoneId: "zone:b",
        payloadGreaterThanGrams: 40_000,
      },
      {
        ruleId: "rule:site-speed",
        type: "site-speed-limit",
        maximumMmPerSecond: 2_000,
      },
    ],
    scenarioGeneration: {
      generatorVersion: SCENARIO_GENERATOR_VERSION,
      seed: 0x5eed1234,
      templates: [
        {
          scenarioId: "scenario:restricted-route",
          basePayloadGrams: 20_000,
          payloadVariationGrams: 500,
        },
        {
          scenarioId: "scenario:human-zone-speed",
          basePayloadGrams: 25_000,
          payloadVariationGrams: 500,
        },
        {
          scenarioId: "scenario:heavy-payload-route",
          basePayloadGrams: 50_000,
          payloadVariationGrams: 500,
        },
      ],
    },
  });
  const scenarioSuite = generateScenarioSuite(confidentialEnvelope.scenarioGeneration);
  const unsafeTraces = [
    makeTrace(
      "scenario:restricted-route",
      { xMm: 1_000, yMm: 8_000 },
      { xMm: 9_500, yMm: 8_000 },
      500,
    ),
    makeTrace(
      "scenario:human-zone-speed",
      { xMm: 2_000, yMm: 4_000 },
      { xMm: 6_000, yMm: 4_000 },
      820,
    ),
    makeTrace(
      "scenario:heavy-payload-route",
      { xMm: 5_000, yMm: 1_800 },
      { xMm: 9_000, yMm: 1_800 },
      500,
    ),
  ];
  const correctedTraces = [
    makeTrace(
      "scenario:restricted-route",
      { xMm: 1_000, yMm: 6_000 },
      { xMm: 9_500, yMm: 6_000 },
      500,
    ),
    makeTrace(
      "scenario:human-zone-speed",
      { xMm: 2_000, yMm: 4_000 },
      { xMm: 6_000, yMm: 4_000 },
      600,
    ),
    makeTrace(
      "scenario:heavy-payload-route",
      { xMm: 5_000, yMm: 3_000 },
      { xMm: 9_000, yMm: 3_000 },
      500,
    ),
  ];
  const unsafeFixture = createBuildAndRequest(
    "unsafe-v1",
    "unsafe-demo",
    confidentialEnvelope,
    envelopeBlindingSecret,
  );
  const correctedFixture = createBuildAndRequest(
    "corrected-v1",
    "corrected-demo",
    confidentialEnvelope,
    envelopeBlindingSecret,
  );

  const unsafeFixtureBuild: DemoEvaluationCase = Object.freeze({
    ...unsafeFixture,
    behaviorTraces: parseRobotBehaviorTraceSuite({
      schemaVersion: ROBOT_TRACE_SUITE_VERSION,
      robotId: unsafeFixture.robotBuild.robotId,
      robotBuildId: unsafeFixture.robotBuild.robotBuildId,
      robotBuildDigest: digestRobotBuild(unsafeFixture.robotBuild),
      traces: unsafeTraces,
    }),
    evaluatedAt: "1788547210",
  });
  const correctedFixtureBuild: DemoEvaluationCase = Object.freeze({
    ...correctedFixture,
    behaviorTraces: parseRobotBehaviorTraceSuite({
      schemaVersion: ROBOT_TRACE_SUITE_VERSION,
      robotId: correctedFixture.robotBuild.robotId,
      robotBuildId: correctedFixture.robotBuild.robotBuildId,
      robotBuildDigest: digestRobotBuild(correctedFixture.robotBuild),
      traces: correctedTraces,
    }),
    evaluatedAt: "1788547210",
  });

  return Object.freeze({
    confidentialEnvelope,
    envelopeBlindingSecret,
    scenarioSuite,
    unsafeFixtureBuild,
    correctedFixtureBuild,
  });
}
