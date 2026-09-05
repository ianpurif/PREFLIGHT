import { describe, expect, test } from "bun:test";
import {
  assertEvaluationResultBindings,
  canonicalSerialize,
  ProtocolError,
} from "@preflight/domain";
import {
  canonicalizeInternalEvaluationReport,
  createDeterministicDemoFixture,
  evaluateSimulation,
} from "../src/index.js";
import { createMaximumShapeInput } from "./helpers.js";

function expectProtocolCode(action: () => unknown, code: ProtocolError["code"]): void {
  try {
    action();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ProtocolError);
    expect((error as ProtocolError).code).toBe(code);
  }
}

function fnv1a32(value: string): string {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash = Math.imul(hash ^ value.charCodeAt(index), 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function fixtureInput(kind: "unsafe" | "corrected") {
  const fixture = createDeterministicDemoFixture();
  const evaluationCase =
    kind === "unsafe" ? fixture.unsafeFixtureBuild : fixture.correctedFixtureBuild;
  return {
    fixture,
    input: {
      ...evaluationCase,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    },
  };
}

describe("deterministic demo fixture", () => {
  test("unsafe synthetic build holds with one finding for each violated demo rule family", () => {
    const { input } = fixtureInput("unsafe");
    const report = evaluateSimulation(input);
    expect(report.result.verdict).toBe("HOLD");
    expect(report.scenarioCount).toBe(3);
    expect(report.violationCount).toBe(3);
    expect(
      report.violations.map((violation) => [String(violation.scenarioId), violation.type]),
    ).toEqual([
      ["scenario:restricted-route", "restricted-zone"],
      ["scenario:human-zone-speed", "zone-speed-limit"],
      ["scenario:heavy-payload-route", "payload-zone-restriction"],
    ]);
    expect(report.scenarioResults.every((scenario) => scenario.verdict === "HOLD")).toBe(true);
    expect(String(canonicalSerialize(report.violations[0]))).toBe(
      String(
        canonicalSerialize({
          scenarioId: "scenario:restricted-route",
          ruleId: "rule:restricted-f",
          type: "restricted-zone",
          zoneId: "zone:f",
          observation: {
            kind: "segment",
            stepIndex: 1,
            from: { xMm: 1_000, yMm: 8_000 },
            to: { xMm: 9_500, yMm: 8_000 },
          },
          allowedCondition: "zone-entry-prohibited",
        }),
      ),
    );
  });

  test("corrected synthetic build clears the exact same envelope and scenario suite", () => {
    const fixture = createDeterministicDemoFixture();
    const report = evaluateSimulation({
      ...fixture.correctedFixtureBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
    });
    expect(report.result.verdict).toBe("CLEAR");
    expect(report.violationCount).toBe(0);
    expect(report.violations).toEqual([]);
    expect(report.scenarioResults.every((scenario) => scenario.verdict === "CLEAR")).toBe(true);
    expect(fixture.unsafeFixtureBuild.request.inputs.safetyEnvelopeCommitment).toBe(
      fixture.correctedFixtureBuild.request.inputs.safetyEnvelopeCommitment,
    );
    expect(fixture.unsafeFixtureBuild.request.inputs.robotBuildDigest).not.toBe(
      fixture.correctedFixtureBuild.request.inputs.robotBuildDigest,
    );
  });

  test("rejects a trace suite carrying another build's declared metadata", () => {
    const fixture = createDeterministicDemoFixture();
    expectProtocolCode(
      () =>
        evaluateSimulation({
          ...fixture.unsafeFixtureBuild,
          behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
          confidentialEnvelope: fixture.confidentialEnvelope,
          envelopeBlindingSecret: fixture.envelopeBlindingSecret,
        }),
      "BINDING_MISMATCH",
    );
  });
});

describe("pure evaluation representation", () => {
  test("repeated evaluation is byte-for-byte canonical and internally consistent", () => {
    const { input } = fixtureInput("unsafe");
    const expected = String(canonicalizeInternalEvaluationReport(evaluateSimulation(input)));
    for (let iteration = 0; iteration < 250; iteration += 1) {
      const report = evaluateSimulation(input);
      expect(String(canonicalizeInternalEvaluationReport(report))).toBe(expected);
      expect(report.violationCount).toBe(report.violations.length);
      expect(report.scenarioCount).toBe(report.scenarioResults.length);
    }
  });

  test("the maximum accepted v1 shape remains canonically serializable", () => {
    const input = createMaximumShapeInput();
    expect(() => canonicalSerialize(input.behaviorTraces)).not.toThrow();
    const first = evaluateSimulation(input);
    const second = evaluateSimulation(input);
    expect(first.scenarioCount).toBe(16);
    expect(first.violationCount).toBe(256);
    expect(String(canonicalizeInternalEvaluationReport(first))).toBe(
      String(canonicalizeInternalEvaluationReport(second)),
    );
  });

  test("the unsafe fixture report matches its canonical golden digest", () => {
    const { input } = fixtureInput("unsafe");
    const fingerprint = fnv1a32(String(canonicalSerialize(evaluateSimulation(input))));
    expect(fingerprint).toBe("47d968b2");
  });

  test("wire-object key, rule, zone, template, and trace insertion order do not change output", () => {
    const { fixture, input } = fixtureInput("unsafe");
    const envelope = fixture.confidentialEnvelope;
    const reorderedEnvelope = {
      scenarioGeneration: {
        templates: [...envelope.scenarioGeneration.templates].reverse().map((template) => ({
          payloadVariationGrams: template.payloadVariationGrams,
          basePayloadGrams: template.basePayloadGrams,
          scenarioId: template.scenarioId,
        })),
        seed: envelope.scenarioGeneration.seed,
        generatorVersion: envelope.scenarioGeneration.generatorVersion,
      },
      rules: [...envelope.rules].reverse().map((rule) => ({ ...rule })),
      zones: [...envelope.zones].reverse().map((zone) => ({
        bounds: { ...zone.bounds },
        zoneId: zone.zoneId,
      })),
      warehouseBounds: { ...envelope.warehouseBounds },
      safetyEnvelopeId: envelope.safetyEnvelopeId,
      siteId: envelope.siteId,
      schemaVersion: envelope.schemaVersion,
    };
    const request = input.request;
    const reorderedInput = {
      evaluatedAt: input.evaluatedAt,
      behaviorTraces: {
        traces: [...input.behaviorTraces.traces].reverse().map((trace) => ({
          steps: trace.steps.map((step) => ({
            speedMmPerSecond: step.speedMmPerSecond,
            position: { yMm: step.position.yMm, xMm: step.position.xMm },
            stepIndex: step.stepIndex,
          })),
          scenarioId: trace.scenarioId,
        })),
        robotBuildDigest: input.behaviorTraces.robotBuildDigest,
        robotBuildId: input.behaviorTraces.robotBuildId,
        robotId: input.behaviorTraces.robotId,
        schemaVersion: input.behaviorTraces.schemaVersion,
      },
      envelopeBlindingSecret: input.envelopeBlindingSecret,
      confidentialEnvelope: reorderedEnvelope,
      robotBuild: {
        artifactDigest: input.robotBuild.artifactDigest,
        robotBuildId: input.robotBuild.robotBuildId,
        robotId: input.robotBuild.robotId,
        schemaVersion: input.robotBuild.schemaVersion,
      },
      request: {
        requestedAt: request.requestedAt,
        inputs: {
          evaluatorVersion: request.inputs.evaluatorVersion,
          safetyEnvelopeCommitment: request.inputs.safetyEnvelopeCommitment,
          safetyEnvelopeId: request.inputs.safetyEnvelopeId,
          robotBuildDigest: request.inputs.robotBuildDigest,
          robotBuildId: request.inputs.robotBuildId,
          robotId: request.inputs.robotId,
          siteId: request.inputs.siteId,
          schemaVersion: request.inputs.schemaVersion,
        },
        evaluationId: request.evaluationId,
        schemaVersion: request.schemaVersion,
      },
    };
    expect(String(canonicalSerialize(evaluateSimulation(reorderedInput)))).toBe(
      String(canonicalSerialize(evaluateSimulation(input))),
    );
  });

  test("the core does not read the clock, random entropy, or write logs", () => {
    const { input } = fixtureInput("corrected");
    const originalDateNow = Date.now;
    const originalRandom = Math.random;
    const runtimeConsole = (
      globalThis as unknown as {
        console: {
          log: (...values: unknown[]) => void;
          warn: (...values: unknown[]) => void;
          error: (...values: unknown[]) => void;
        };
      }
    ).console;
    const originalLog = runtimeConsole.log;
    const originalWarn = runtimeConsole.warn;
    const originalError = runtimeConsole.error;
    let logCount = 0;
    Date.now = () => {
      throw new Error("clock access forbidden");
    };
    Math.random = () => {
      throw new Error("random access forbidden");
    };
    runtimeConsole.log = () => {
      logCount += 1;
    };
    runtimeConsole.warn = () => {
      logCount += 1;
    };
    runtimeConsole.error = () => {
      logCount += 1;
    };
    let verdict = "";
    try {
      verdict = evaluateSimulation(input).result.verdict;
    } finally {
      Date.now = originalDateNow;
      Math.random = originalRandom;
      runtimeConsole.log = originalLog;
      runtimeConsole.warn = originalWarn;
      runtimeConsole.error = originalError;
    }
    expect(verdict).toBe("CLEAR");
    expect(logCount).toBe(0);
  });

  test("the public-compatible P1 result remains minimal and binding-valid", () => {
    const { input } = fixtureInput("unsafe");
    const report = evaluateSimulation(input);
    expect(Object.keys(report.result).sort()).toEqual([
      "evaluatedAt",
      "evaluationId",
      "evaluationInputsDigest",
      "inputs",
      "schemaVersion",
      "verdict",
    ]);
    expect(assertEvaluationResultBindings(report.result, input.request)).toEqual(report.result);
    expect(JSON.stringify(report.result)).not.toContain("rule:");
    expect(JSON.stringify(report.result)).not.toContain("zone:");
    expect(report.result.verdict).not.toBe("ESCALATE");
  });

  test("validated outputs are deeply frozen against caller mutation", () => {
    const { input } = fixtureInput("unsafe");
    const report = evaluateSimulation(input);
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.violations)).toBe(true);
    expect(report.violations.every((violation) => Object.isFrozen(violation))).toBe(true);
    expect(report.violations.every((violation) => Object.isFrozen(violation.observation))).toBe(
      true,
    );
    expect(() => {
      (report.violations as unknown as unknown[]).push("mutation");
    }).toThrow(TypeError);
    expect(evaluateSimulation(input).violationCount).toBe(3);
  });
});
