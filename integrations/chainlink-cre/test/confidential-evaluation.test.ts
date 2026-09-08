import { describe, expect, test } from "bun:test";
import { canonicalSerialize } from "@rovaulta/domain";
import { evaluateSimulation } from "@rovaulta/simulation-core";
import { evaluateInTee } from "../src/confidential-evaluation.js";
import {
  CRE_PUBLIC_ERROR_VERSION,
  CRE_PUBLIC_RESULT_VERSION,
  CRE_RESULT_CALLBACK_SECRET_ID,
  parseEvaluationResultCallback,
  serializeEvaluationResultCallback,
  type CrePublicEvaluationFailure,
  digestBehaviorInput,
} from "../src/protocol.js";
import {
  deepClone,
  encodePublicInput,
  fixture,
  type Mutable,
  makeConfidentialSecret,
  makePublicInput,
  runtimeWithSecret,
} from "./helpers.js";

function evaluate(demoCase: typeof fixture.unsafeFixtureBuild, secret = makeConfidentialSecret()) {
  return evaluateInTee(runtimeWithSecret(secret), {
    input: encodePublicInput(makePublicInput(demoCase)),
  });
}

function refreshBehaviorDigest(input: Mutable<ReturnType<typeof makePublicInput>>): void {
  const { behaviorInputDigest: _, ...payload } = input;
  input.behaviorInputDigest = digestBehaviorInput(payload);
}

describe("confidential evaluation", () => {
  test("unsafe supplied behavior returns minimal HOLD", () => {
    const response = evaluate(fixture.unsafeFixtureBuild);
    expect(response.schemaVersion).toBe(CRE_PUBLIC_RESULT_VERSION);
    expect(response.status).toBe("EVALUATED");
    if (response.status !== "EVALUATED") throw new Error("expected evaluated result");
    expect(response.result.verdict).toBe("HOLD");
    expect(Object.keys(response).sort()).toEqual([
      "behaviorInputDigest",
      "protocolVersion",
      "result",
      "schemaVersion",
      "status",
      "traceProvenance",
    ]);
  });

  test("corrected supplied behavior returns minimal CLEAR", () => {
    const response = evaluate(fixture.correctedFixtureBuild);
    expect(response.status).toBe("EVALUATED");
    if (response.status !== "EVALUATED") throw new Error("expected evaluated result");
    expect(response.result.verdict).toBe("CLEAR");
  });

  test("wrapper preserves the exact unchanged P1 result produced by P2", () => {
    const demoCase = fixture.unsafeFixtureBuild;
    const response = evaluate(demoCase);
    if (response.status !== "EVALUATED") throw new Error("expected evaluated result");
    const direct = evaluateSimulation({
      request: demoCase.request,
      robotBuild: demoCase.robotBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
      behaviorTraces: demoCase.behaviorTraces,
      evaluatedAt: demoCase.evaluatedAt,
    });
    expect(response.result).toEqual(direct.result);
  });

  test("tampered blind or envelope commitment rejects closed", () => {
    const wrongBlind = makeConfidentialSecret(undefined, "ff".repeat(32));
    expect(evaluate(fixture.unsafeFixtureBuild, wrongBlind)).toEqual({
      schemaVersion: CRE_PUBLIC_ERROR_VERSION,
      protocolVersion: "rovaulta.protocol/v1",
      status: "REJECT",
      code: "CONFIDENTIAL_EVALUATION_REJECTED",
    });

    const changedEnvelope = deepClone(fixture.confidentialEnvelope);
    const speedRule = changedEnvelope.rules.find((rule) => rule.type === "site-speed-limit");
    if (speedRule?.type !== "site-speed-limit") throw new Error("fixture speed rule missing");
    (speedRule as unknown as { maximumMmPerSecond: number }).maximumMmPerSecond += 1;
    expect(evaluate(fixture.unsafeFixtureBuild, makeConfidentialSecret(changedEnvelope))).toEqual({
      schemaVersion: CRE_PUBLIC_ERROR_VERSION,
      protocolVersion: "rovaulta.protocol/v1",
      status: "REJECT",
      code: "CONFIDENTIAL_EVALUATION_REJECTED",
    });
  });

  test("site, envelope, robot, build, evaluator, scenario, and trace failures are redacted", () => {
    const mutations: Array<(input: Mutable<ReturnType<typeof makePublicInput>>) => void> = [
      (input) => {
        (input.request.inputs as { siteId: string }).siteId = "site:other";
      },
      (input) => {
        (input.request.inputs as { safetyEnvelopeId: string }).safetyEnvelopeId =
          "safety-envelope:other";
      },
      (input) => {
        (input.request.inputs as { robotId: string }).robotId = "robot:other";
      },
      (input) => {
        (input.request.inputs as { robotBuildId: string }).robotBuildId = "robot-build:other";
      },
      (input) => {
        (input.request.inputs as { evaluatorVersion: string }).evaluatorVersion =
          "evaluator-version:other";
      },
      (input) => {
        input.behaviorTraces.traces.pop();
      },
      (input) => {
        const step = input.behaviorTraces.traces.at(0)?.steps.at(0);
        if (step === undefined) throw new Error("fixture trace step missing");
        step.stepIndex = 2;
      },
    ];

    for (const mutate of mutations) {
      const input = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
      mutate(input);
      const response = evaluateInTee(runtimeWithSecret(makeConfidentialSecret()), {
        input: encodePublicInput(input),
      });
      expect(response.status).toBe("REJECT");
      expect(Object.keys(response).sort()).toEqual([
        "code",
        "protocolVersion",
        "schemaVersion",
        "status",
      ]);
    }
  });

  test("validly re-digested private site, envelope, and scenario mismatches fail closed", () => {
    const mutations: Array<(input: Mutable<ReturnType<typeof makePublicInput>>) => void> = [
      (input) => {
        (input.request.inputs as { siteId: string }).siteId = "site:other";
      },
      (input) => {
        (input.request.inputs as { safetyEnvelopeId: string }).safetyEnvelopeId =
          "safety-envelope:other";
      },
      (input) => {
        const trace = input.behaviorTraces.traces.at(0);
        if (trace === undefined) throw new Error("fixture trace missing");
        (trace as { scenarioId: string }).scenarioId = "scenario:a-unknown";
      },
    ];

    for (const mutate of mutations) {
      const input = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
      mutate(input);
      refreshBehaviorDigest(input);
      expect(
        evaluateInTee(runtimeWithSecret(makeConfidentialSecret()), {
          input: encodePublicInput(input),
        }),
      ).toEqual({
        schemaVersion: CRE_PUBLIC_ERROR_VERSION,
        protocolVersion: "rovaulta.protocol/v1",
        status: "REJECT",
        code: "CONFIDENTIAL_EVALUATION_REJECTED",
      });
    }
  });

  test("re-digested trace substitution stays explicitly caller-supplied, not attested", () => {
    const input = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
    input.behaviorTraces.traces = deepClone(fixture.correctedFixtureBuild.behaviorTraces.traces);
    refreshBehaviorDigest(input);

    const response = evaluateInTee(runtimeWithSecret(makeConfidentialSecret()), {
      input: encodePublicInput(input),
    });
    expect(response.status).toBe("EVALUATED");
    if (response.status !== "EVALUATED") throw new Error("expected evaluated result");
    expect(response.result.verdict).toBe("CLEAR");
    expect(response.traceProvenance).toBe("SYNTHETIC_CALLER_SUPPLIED");
  });

  test("private envelope, blind, rules, geometry, and violations never enter public output", () => {
    const serialized = JSON.stringify(evaluate(fixture.unsafeFixtureBuild));
    const forbidden = [
      "confidentialEnvelope",
      "envelopeBlindingSecret",
      "warehouseBounds",
      "scenarioResults",
      "violations",
      "rule:restricted-f",
      "rule:site-speed",
      "zone:f",
      "payloadGreaterThanGrams",
      "maximumMmPerSecond",
      "0102030405060708090a0b0c0d0e0f101112131415161718191a1b1c1d1e1f20",
      '"maxXmm":10000',
      '"maximumMmPerSecond":2000',
      '"payloadGreaterThanGrams":40000',
    ];
    for (const value of forbidden) expect(serialized).not.toContain(value);
  });

  test("safe errors do not serialize confidential diagnostics", () => {
    const malformedSecret = JSON.stringify({ privateThreshold: 424242, blind: "do-not-leak" });
    const response = evaluate(fixture.unsafeFixtureBuild, malformedSecret);
    expect(response).toEqual({
      schemaVersion: CRE_PUBLIC_ERROR_VERSION,
      protocolVersion: "rovaulta.protocol/v1",
      status: "REJECT",
      code: "MALFORMED_CONFIDENTIAL_INPUT",
    } satisfies CrePublicEvaluationFailure);
    expect(JSON.stringify(response)).not.toContain("424242");
    expect(JSON.stringify(response)).not.toContain("do-not-leak");
  });

  test("missing secret and malformed public bytes reject without fallback", () => {
    const unavailable = evaluateInTee(
      {
        getSecret: () => ({
          result: () => {
            throw new Error("vault private detail");
          },
        }),
      } as never,
      { input: encodePublicInput(makePublicInput(fixture.unsafeFixtureBuild)) },
    );
    expect(unavailable.status).toBe("REJECT");
    expect(unavailable).toHaveProperty("code", "CONFIDENTIAL_INPUT_UNAVAILABLE");

    const malformed = evaluateInTee(
      {
        getSecret: () => {
          throw new Error("must not run");
        },
      } as never,
      {
        input: new TextEncoder().encode("{"),
      },
    );
    expect(malformed).toHaveProperty("code", "MALFORMED_PUBLIC_INPUT");
  });

  test("public result is canonically deterministic across repeated TEE adapter runs", () => {
    const first = evaluate(fixture.unsafeFixtureBuild);
    const expected = canonicalSerialize(first);
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(canonicalSerialize(evaluate(fixture.unsafeFixtureBuild))).toBe(expected);
    }
  });

  test("optional callback sends only the signed minimal public result through HTTP capability", () => {
    let capabilityCall:
      | {
          readonly payload: {
            readonly body?: Uint8Array;
            readonly multiHeaders?: unknown;
          };
        }
      | undefined;
    const runtime = {
      config: {
        authorizedEvmAddress: `0x${"12".repeat(20)}`,
        resultDeliveryUrl: "https://api.example.test/internal/cre/evaluation-result",
      },
      getSecret(request: { readonly id?: string; readonly namespace?: string }) {
        if (request.namespace !== "main") throw new Error("unexpected namespace");
        if (request.id === CRE_RESULT_CALLBACK_SECRET_ID) {
          return { result: () => ({ value: "callback-only-test-secret" }) };
        }
        if (request.id === "ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT") {
          return { result: () => ({ value: makeConfidentialSecret() }) };
        }
        throw new Error("unexpected secret selector");
      },
      callCapability(params: {
        readonly payload: {
          readonly body?: Uint8Array;
          readonly multiHeaders?: unknown;
        };
      }) {
        capabilityCall = params;
        return { result: () => ({ statusCode: 204, body: new Uint8Array() }) };
      },
    } as never;
    const response = evaluateInTee(runtime, {
      input: encodePublicInput(makePublicInput(fixture.correctedFixtureBuild)),
    });
    expect(response.status).toBe("EVALUATED");
    expect(capabilityCall).toBeDefined();
    const bodyBytes = capabilityCall?.payload.body;
    if (bodyBytes === undefined) throw new Error("callback body missing");
    const body = new TextDecoder().decode(bodyBytes);
    const callback = parseEvaluationResultCallback(JSON.parse(body));
    expect(serializeEvaluationResultCallback(callback)).toBe(body);
    expect(body).not.toContain("confidentialEnvelope");
    expect(body).not.toContain("callback-only-test-secret");
    expect(body).not.toContain("warehouseBounds");
  });
});
