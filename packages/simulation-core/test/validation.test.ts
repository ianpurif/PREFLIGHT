import { describe, expect, test } from "bun:test";
import { type ProtocolError, parseSha256Digest } from "@preflight/domain";
import {
  CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
  createDeterministicDemoFixture,
  evaluateSimulation,
  parseConfidentialEvaluationEnvelope,
  parseRectangleMm,
  parseRobotBehaviorTraceSuite,
  parseScenarioGenerationConfig,
  ROBOT_TRACE_SUITE_VERSION,
} from "../src/index.js";

function expectProtocolCode(action: () => unknown, code: ProtocolError["code"]): void {
  try {
    action();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect((error as ProtocolError).code).toBe(code);
  }
}

describe("fixed-unit and model validation", () => {
  test.each([
    [{ minXmm: 0.5, minYmm: 0, maxXmm: 10, maxYmm: 10 }],
    [{ minXmm: -0, minYmm: 0, maxXmm: 10, maxYmm: 10 }],
    [{ minXmm: 0, minYmm: 0, maxXmm: Number.MAX_SAFE_INTEGER, maxYmm: 10 }],
    [{ minXmm: 10, minYmm: 0, maxXmm: 10, maxYmm: 10 }],
    [{ minXmm: 11, minYmm: 0, maxXmm: 10, maxYmm: 10 }],
  ])("rejects ambiguous, out-of-range, or degenerate rectangles", (rectangle) => {
    expectProtocolCode(() => parseRectangleMm(rectangle), "MALFORMED_OBJECT");
  });

  test.each([0, -1, 1.5, 0x1_0000_0000])("rejects unsupported PRNG seed %p", (seed) => {
    expectProtocolCode(
      () =>
        parseScenarioGenerationConfig({
          generatorVersion: "preflight.xorshift32-scenarios/v1",
          seed,
          templates: [
            {
              scenarioId: "scenario:one",
              basePayloadGrams: 10,
              payloadVariationGrams: 0,
            },
          ],
        }),
      "MALFORMED_OBJECT",
    );
  });

  test("rejects duplicate scenario IDs and out-of-range payload variation", () => {
    const base = {
      generatorVersion: "preflight.xorshift32-scenarios/v1",
      seed: 1,
      templates: [{ scenarioId: "scenario:one", basePayloadGrams: 10, payloadVariationGrams: 0 }],
    };
    expectProtocolCode(
      () =>
        parseScenarioGenerationConfig({
          ...base,
          templates: [...base.templates, ...base.templates],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseScenarioGenerationConfig({
          ...base,
          templates: [
            { scenarioId: "scenario:one", basePayloadGrams: 10, payloadVariationGrams: 11 },
          ],
        }),
      "MALFORMED_OBJECT",
    );
  });

  test("rejects fractional or negative speed and payload values", () => {
    const fixture = createDeterministicDemoFixture();
    const envelope = fixture.confidentialEnvelope;
    for (const invalidSpeed of [-1, -0, 0.5]) {
      expectProtocolCode(
        () =>
          parseConfidentialEvaluationEnvelope({
            ...envelope,
            rules: [
              {
                ruleId: "rule:invalid-speed",
                type: "site-speed-limit",
                maximumMmPerSecond: invalidSpeed,
              },
            ],
          }),
        "MALFORMED_OBJECT",
      );
    }
    for (const invalidPayload of [-1, -0, 0.5]) {
      expectProtocolCode(
        () =>
          parseConfidentialEvaluationEnvelope({
            ...envelope,
            scenarioGeneration: {
              ...envelope.scenarioGeneration,
              templates: [
                {
                  scenarioId: "scenario:invalid-payload",
                  basePayloadGrams: invalidPayload,
                  payloadVariationGrams: 0,
                },
              ],
            },
          }),
        "MALFORMED_OBJECT",
      );
    }
  });

  test("rejects duplicate zones/rules, dangling references, and zones outside bounds", () => {
    const fixture = createDeterministicDemoFixture();
    const envelope = fixture.confidentialEnvelope;
    expectProtocolCode(
      () =>
        parseConfidentialEvaluationEnvelope({
          ...envelope,
          zones: [envelope.zones[0], envelope.zones[0]],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseConfidentialEvaluationEnvelope({
          ...envelope,
          rules: [envelope.rules[0], envelope.rules[0]],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseConfidentialEvaluationEnvelope({
          ...envelope,
          rules: [{ ruleId: "rule:dangling", type: "restricted-zone", zoneId: "zone:missing" }],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseConfidentialEvaluationEnvelope({
          ...envelope,
          zones: [
            {
              zoneId: "zone:outside",
              bounds: { minXmm: 9_000, minYmm: 9_000, maxXmm: 11_000, maxYmm: 11_000 },
            },
          ],
          rules: [{ ruleId: "rule:outside", type: "restricted-zone", zoneId: "zone:outside" }],
        }),
      "MALFORMED_OBJECT",
    );
  });

  test("rejects unknown fields and unsupported local versions", () => {
    const envelope = createDeterministicDemoFixture().confidentialEnvelope;
    expectProtocolCode(
      () => parseConfidentialEvaluationEnvelope({ ...envelope, ignored: true }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseConfidentialEvaluationEnvelope({
          ...envelope,
          schemaVersion: "preflight.confidential-evaluation-envelope/v2",
        }),
      "UNSUPPORTED_VERSION",
    );
    expect(envelope.schemaVersion).toBe(CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION);
  });
});

describe("trace and exact binding validation", () => {
  test("rejects empty, non-contiguous, duplicate, and malformed trace suites", () => {
    const fixture = createDeterministicDemoFixture();
    const suite = fixture.unsafeFixtureBuild.behaviorTraces;
    expectProtocolCode(
      () => parseRobotBehaviorTraceSuite({ ...suite, traces: [] }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseRobotBehaviorTraceSuite({
          ...suite,
          traces: [suite.traces[0], suite.traces[0]],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseRobotBehaviorTraceSuite({
          ...suite,
          traces: suite.traces.map((entry, index) =>
            index === 0
              ? {
                  ...entry,
                  steps: Array.from({ length: 33 }, (_, stepIndex) => ({
                    stepIndex,
                    position: { xMm: 100, yMm: 100 },
                    speedMmPerSecond: 0,
                  })),
                }
              : entry,
          ),
        }),
      "MALFORMED_OBJECT",
    );
    const trace = suite.traces[0];
    expect(trace).toBeDefined();
    expectProtocolCode(
      () =>
        parseRobotBehaviorTraceSuite({
          ...suite,
          traces: [
            {
              ...trace,
              steps: trace?.steps.map((step, index) =>
                index === 1 ? { ...step, stepIndex: 3 } : step,
              ),
            },
          ],
        }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () =>
        parseRobotBehaviorTraceSuite({
          ...suite,
          schemaVersion: ROBOT_TRACE_SUITE_VERSION,
          extra: true,
        }),
      "MALFORMED_OBJECT",
    );
  });

  test("rejects wrong blind and changed committed rules/scenarios before evaluation", () => {
    const fixture = createDeterministicDemoFixture();
    const base = {
      ...fixture.correctedFixtureBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    };
    const wrongBlind = Uint8Array.from(fixture.envelopeBlindingSecret);
    wrongBlind[0] = 255;
    expectProtocolCode(
      () => evaluateSimulation({ ...base, envelopeBlindingSecret: wrongBlind }),
      "DIGEST_MISMATCH",
    );
    const changedRule = fixture.confidentialEnvelope.rules.map((rule) =>
      rule.type === "zone-speed-limit" ? { ...rule, maximumMmPerSecond: 601 } : rule,
    );
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          confidentialEnvelope: { ...fixture.confidentialEnvelope, rules: changedRule },
        }),
      "DIGEST_MISMATCH",
    );
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          confidentialEnvelope: {
            ...fixture.confidentialEnvelope,
            scenarioGeneration: {
              ...fixture.confidentialEnvelope.scenarioGeneration,
              seed: 2,
            },
          },
        }),
      "DIGEST_MISMATCH",
    );
  });

  test("rejects changed envelope IDs and build descriptors", () => {
    const fixture = createDeterministicDemoFixture();
    const base = {
      ...fixture.correctedFixtureBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    };
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          confidentialEnvelope: {
            ...fixture.confidentialEnvelope,
            safetyEnvelopeId: "safety-envelope:other-v1",
          },
        }),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          robotBuild: {
            ...base.robotBuild,
            artifactDigest: parseSha256Digest(`sha256:${"ee".repeat(32)}`),
          },
        }),
      "DIGEST_MISMATCH",
    );
  });

  test("rejects unsupported evaluator and every behavior build-binding mismatch", () => {
    const fixture = createDeterministicDemoFixture();
    const base = {
      ...fixture.correctedFixtureBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    };
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          request: {
            ...base.request,
            inputs: { ...base.request.inputs, evaluatorVersion: "evaluator-version:other-v1" },
          },
        }),
      "UNSUPPORTED_VERSION",
    );
    for (const behaviorTraces of [
      { ...base.behaviorTraces, robotId: "robot:other" },
      { ...base.behaviorTraces, robotBuildId: "robot-build:other" },
      {
        ...base.behaviorTraces,
        robotBuildDigest: parseSha256Digest(`sha256:${"ff".repeat(32)}`),
      },
    ]) {
      expectProtocolCode(
        () => evaluateSimulation({ ...base, behaviorTraces }),
        behaviorTraces.robotBuildDigest === base.behaviorTraces.robotBuildDigest
          ? "BINDING_MISMATCH"
          : "DIGEST_MISMATCH",
      );
    }
  });

  test("rejects missing, extra, unknown, and out-of-bounds scenario traces", () => {
    const fixture = createDeterministicDemoFixture();
    const base = {
      ...fixture.correctedFixtureBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    };
    const traces = base.behaviorTraces.traces;
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          behaviorTraces: { ...base.behaviorTraces, traces: traces.slice(1) },
        }),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          behaviorTraces: {
            ...base.behaviorTraces,
            traces: traces.map((trace, index) =>
              index === 0 ? { ...trace, scenarioId: "scenario:unknown" } : trace,
            ),
          },
        }),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...base,
          behaviorTraces: {
            ...base.behaviorTraces,
            traces: traces.map((trace, index) =>
              index === 0
                ? {
                    ...trace,
                    steps: trace.steps.map((step, stepIndex) =>
                      stepIndex === 0 ? { ...step, position: { xMm: 20_000, yMm: 0 } } : step,
                    ),
                  }
                : trace,
            ),
          },
        }),
      "MALFORMED_OBJECT",
    );
  });

  test("rejects evaluation time before request time", () => {
    const fixture = createDeterministicDemoFixture();
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...fixture.correctedFixtureBuild,
          confidentialEnvelope: fixture.confidentialEnvelope,
          envelopeBlindingSecret: fixture.envelopeBlindingSecret,
          evaluatedAt: "1788547199",
        }),
      "BINDING_MISMATCH",
    );
  });

  test("confidential validation failures do not echo private values", () => {
    const fixture = createDeterministicDemoFixture();
    const sentinel = "DO_NOT_EXPOSE_PRIVATE_RULE_91f7";
    try {
      evaluateSimulation({
        ...fixture.correctedFixtureBuild,
        confidentialEnvelope: { ...fixture.confidentialEnvelope, [sentinel]: true },
        envelopeBlindingSecret: fixture.envelopeBlindingSecret,
      });
      throw new Error("Expected validation failure");
    } catch (error) {
      expect(String((error as Error).message)).not.toContain(sentinel);
      expect(JSON.stringify(error)).not.toContain(sentinel);
    }
  });
});
