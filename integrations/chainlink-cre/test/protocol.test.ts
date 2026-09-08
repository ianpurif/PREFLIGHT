import { describe, expect, test } from "bun:test";
import { canonicalSerialize, ProtocolError } from "@rovaulta/domain";
import { evaluateSimulation } from "@rovaulta/simulation-core";
import {
  CRE_PUBLIC_REQUEST_VERSION,
  CRE_PUBLIC_RESULT_VERSION,
  CRE_RESULT_CALLBACK_VERSION,
  CreBoundaryError,
  type CrePublicFailureCode,
  decodePublicPayload,
  digestBehaviorInput,
  makeEvaluationResultCallback,
  parseConfidentialEvaluationInput,
  parseEvaluationResultCallback,
  parsePublicEvaluationRequest,
  serializeEvaluationResultCallback,
  siteSecretId,
} from "../src/protocol.js";
import {
  deepClone,
  encodePublicInput,
  fixture,
  type Mutable,
  makeConfidentialSecret,
  makePublicInput,
} from "./helpers.js";

function expectBoundaryCode(action: () => unknown, code: CrePublicFailureCode): void {
  try {
    action();
    throw new Error("expected action to reject");
  } catch (error) {
    expect(error).toBeInstanceOf(CreBoundaryError);
    expect((error as CreBoundaryError).publicCode).toBe(code);
    expect((error as Error).message).toBe("Confidential evaluation rejected");
  }
}

describe("P3 public protocol", () => {
  test("accepts and normalizes the unsafe and corrected public fixtures", () => {
    for (const demoCase of [fixture.unsafeFixtureBuild, fixture.correctedFixtureBuild]) {
      const input = makePublicInput(demoCase);
      expect(parsePublicEvaluationRequest(input)).toEqual(input);
    }
  });

  test("behavior input digest is deterministic and key-order independent", () => {
    const input = makePublicInput(fixture.unsafeFixtureBuild);
    expect(String(input.behaviorInputDigest)).toBe(
      "sha256:60eba6c223ba61903a46ab0dbe64de1930d98bc80946cbff8cca1e11bb4689c6",
    );
    const { behaviorInputDigest: _, ...payload } = input;
    const reordered = {
      evaluatedAt: payload.evaluatedAt,
      traceProvenance: payload.traceProvenance,
      behaviorTraces: deepClone(payload.behaviorTraces),
      robotBuild: deepClone(payload.robotBuild),
      request: deepClone(payload.request),
      protocolVersion: payload.protocolVersion,
      schemaVersion: payload.schemaVersion,
    };
    expect(digestBehaviorInput(payload)).toBe(digestBehaviorInput(reordered));
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(digestBehaviorInput(deepClone(payload))).toBe(input.behaviorInputDigest);
    }
  });

  test("meaningful public-input mutations change the behavior binding", () => {
    const input = makePublicInput(fixture.unsafeFixtureBuild);
    const { behaviorInputDigest: _, ...payload } = deepClone(input);
    const changed = deepClone(payload);
    const changedStep = changed.behaviorTraces.traces.at(0)?.steps.at(1);
    if (changedStep === undefined) throw new Error("fixture trace step missing");
    (changedStep as unknown as { speedMmPerSecond: number }).speedMmPerSecond += 1;
    expect(digestBehaviorInput(changed)).not.toBe(digestBehaviorInput(payload));
  });

  test("rejects a trace mutation and relabeled trace swap when their digest is stale", () => {
    const unsafe = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
    const unsafeStep = unsafe.behaviorTraces.traces.at(0)?.steps.at(1);
    if (unsafeStep === undefined) throw new Error("fixture trace step missing");
    (unsafeStep as unknown as { speedMmPerSecond: number }).speedMmPerSecond += 1;
    expectBoundaryCode(() => parsePublicEvaluationRequest(unsafe), "MALFORMED_PUBLIC_INPUT");

    const relabeled = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
    relabeled.behaviorTraces.traces = deepClone(
      fixture.correctedFixtureBuild.behaviorTraces.traces,
    );
    expectBoundaryCode(() => parsePublicEvaluationRequest(relabeled), "MALFORMED_PUBLIC_INPUT");
  });

  test("rejects malformed, unknown, missing, and unsupported public input", () => {
    expectBoundaryCode(() => parsePublicEvaluationRequest(null), "MALFORMED_PUBLIC_INPUT");
    expectBoundaryCode(() => parsePublicEvaluationRequest([]), "MALFORMED_PUBLIC_INPUT");

    const unknown = { ...makePublicInput(fixture.unsafeFixtureBuild), privateRules: [] };
    expectBoundaryCode(() => parsePublicEvaluationRequest(unknown), "MALFORMED_PUBLIC_INPUT");

    const missing = deepClone(makePublicInput(fixture.unsafeFixtureBuild)) as Record<
      string,
      unknown
    >;
    delete missing.robotBuild;
    expectBoundaryCode(() => parsePublicEvaluationRequest(missing), "MALFORMED_PUBLIC_INPUT");

    const version = { ...makePublicInput(fixture.unsafeFixtureBuild), schemaVersion: "future/v2" };
    expectBoundaryCode(() => parsePublicEvaluationRequest(version), "UNSUPPORTED_VERSION");
  });

  test("rejects build, robot, evaluator, and behavior digest mismatches", () => {
    const mutations = [
      (input: Mutable<ReturnType<typeof makePublicInput>>) => {
        (input.robotBuild as { robotId: string }).robotId = "robot:other";
      },
      (input: Mutable<ReturnType<typeof makePublicInput>>) => {
        (input.robotBuild as { robotBuildId: string }).robotBuildId = "robot-build:other";
      },
      (input: Mutable<ReturnType<typeof makePublicInput>>) => {
        (input.request.inputs as { evaluatorVersion: string }).evaluatorVersion =
          "evaluator-version:other";
      },
      (input: Mutable<ReturnType<typeof makePublicInput>>) => {
        (input as { behaviorInputDigest: string }).behaviorInputDigest =
          `sha256:${"00".repeat(32)}`;
      },
    ];
    for (const mutate of mutations) {
      const input = deepClone(makePublicInput(fixture.unsafeFixtureBuild));
      mutate(input);
      expectBoundaryCode(() => parsePublicEvaluationRequest(input), "MALFORMED_PUBLIC_INPUT");
    }
  });

  test("decodes bounded JSON bytes and rejects invalid or oversized payloads", () => {
    const input = makePublicInput(fixture.unsafeFixtureBuild);
    expect(decodePublicPayload(encodePublicInput(input))).toEqual(input);
    expectBoundaryCode(() => decodePublicPayload(new Uint8Array()), "MALFORMED_PUBLIC_INPUT");
    expectBoundaryCode(
      () => decodePublicPayload(new TextEncoder().encode("{")),
      "MALFORMED_PUBLIC_INPUT",
    );
    expectBoundaryCode(
      () => decodePublicPayload(new Uint8Array(128 * 1024 + 1)),
      "MALFORMED_PUBLIC_INPUT",
    );
    const duplicateKeyJson = JSON.stringify(input).replace(
      "{",
      `{"schemaVersion":"${CRE_PUBLIC_REQUEST_VERSION}",`,
    );
    expectBoundaryCode(
      () => decodePublicPayload(new TextEncoder().encode(duplicateKeyJson)),
      "MALFORMED_PUBLIC_INPUT",
    );
  });

  test("public request remains valid P1 canonical data", () => {
    expect(() => canonicalSerialize(makePublicInput(fixture.unsafeFixtureBuild))).not.toThrow();
  });

  test("site secret selectors are site-bound and collision-resistant", () => {
    expect(siteSecretId("site:a.b")).not.toBe(siteSecretId("site:a_b"));
    const input = makePublicInput(fixture.unsafeFixtureBuild);
    const { behaviorInputDigest: _, ...payload } = input;
    const siteBound = {
      ...payload,
      confidentialInputSecretId: siteSecretId(input.request.inputs.siteId),
    } as const;
    const withSelector = {
      ...siteBound,
      behaviorInputDigest: digestBehaviorInput(siteBound),
    };
    expect(parsePublicEvaluationRequest(withSelector)).toEqual(withSelector);

    const wrongSite = {
      ...withSelector,
      confidentialInputSecretId: siteSecretId("site:other"),
    } as const;
    expectBoundaryCode(
      () =>
        parsePublicEvaluationRequest({
          ...wrongSite,
          behaviorInputDigest: digestBehaviorInput(wrongSite),
        }),
      "MALFORMED_PUBLIC_INPUT",
    );
    expectBoundaryCode(
      () => parsePublicEvaluationRequest(input, { requireSiteSecretSelector: true }),
      "MALFORMED_PUBLIC_INPUT",
    );
  });
});

describe("P3 confidential protocol", () => {
  test("accepts the versioned envelope and exact 32-byte blind", () => {
    const parsed = parseConfidentialEvaluationInput(makeConfidentialSecret());
    expect(parsed.confidentialEnvelope).toEqual(fixture.confidentialEnvelope);
    expect(parsed.envelopeBlindingSecret).toEqual(fixture.envelopeBlindingSecret);
  });

  test("rejects malformed JSON, unsupported versions, unknown fields, and invalid blinds", () => {
    expectBoundaryCode(() => parseConfidentialEvaluationInput("{"), "MALFORMED_CONFIDENTIAL_INPUT");
    expectBoundaryCode(
      () =>
        parseConfidentialEvaluationInput(
          makeConfidentialSecret().replace(
            "rovaulta.cre-confidential-evaluation-input/v1",
            "future/v2",
          ),
        ),
      "UNSUPPORTED_VERSION",
    );
    const extra = JSON.parse(makeConfidentialSecret()) as Record<string, unknown>;
    extra.debug = "private";
    expectBoundaryCode(
      () => parseConfidentialEvaluationInput(JSON.stringify(extra)),
      "MALFORMED_CONFIDENTIAL_INPUT",
    );
    for (const blind of ["", "aa", "GG".repeat(32), "AA".repeat(32), "0".repeat(63)]) {
      expectBoundaryCode(
        () => parseConfidentialEvaluationInput(makeConfidentialSecret(undefined, blind)),
        "MALFORMED_CONFIDENTIAL_INPUT",
      );
    }
    expectBoundaryCode(
      () =>
        parseConfidentialEvaluationInput(
          makeConfidentialSecret().replace("{", '{"protocolVersion":"rovaulta.protocol/v1",'),
        ),
      "MALFORMED_CONFIDENTIAL_INPUT",
    );
  });

  test("redacts nested confidential parser failures", () => {
    const envelope = deepClone(fixture.confidentialEnvelope);
    const firstRule = envelope.rules.at(0);
    if (firstRule === undefined) throw new Error("fixture rule missing");
    envelope.rules[0] = { ...firstRule, secretThreshold: 123 } as never;
    expectBoundaryCode(
      () => parseConfidentialEvaluationInput(makeConfidentialSecret(envelope)),
      "MALFORMED_CONFIDENTIAL_INPUT",
    );
  });

  test("P1 canonical failures cannot escape the public boundary helper", () => {
    expect(() => canonicalSerialize({ bad: undefined })).toThrow(ProtocolError);
  });
});

describe("P10 CRE result callback protocol", () => {
  test("canonicalizes a minimal evaluated callback and rejects private fields", () => {
    const demoCase = fixture.correctedFixtureBuild;
    const result = evaluateSimulation({
      request: demoCase.request,
      robotBuild: demoCase.robotBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
      behaviorTraces: demoCase.behaviorTraces,
      evaluatedAt: demoCase.evaluatedAt,
    }).result;
    const publicInput = makePublicInput(demoCase);
    const response = {
      schemaVersion: CRE_PUBLIC_RESULT_VERSION,
      protocolVersion: "rovaulta.protocol/v1",
      status: "EVALUATED" as const,
      result,
      behaviorInputDigest: publicInput.behaviorInputDigest,
      traceProvenance: "SYNTHETIC_CALLER_SUPPLIED" as const,
    };
    const callback = makeEvaluationResultCallback(result.evaluationId, response);
    expect(callback.schemaVersion).toBe(CRE_RESULT_CALLBACK_VERSION);
    const reordered = {
      response,
      evaluationId: callback.evaluationId,
      protocolVersion: callback.protocolVersion,
      schemaVersion: callback.schemaVersion,
    };
    expect(serializeEvaluationResultCallback(callback)).toBe(
      serializeEvaluationResultCallback(reordered),
    );
    expect(
      parseEvaluationResultCallback(JSON.parse(serializeEvaluationResultCallback(callback))),
    ).toEqual(callback);
    expect(() =>
      parseEvaluationResultCallback({ ...callback, privateEnvelope: "never-public" }),
    ).toThrow(CreBoundaryError);
  });

  test("reject callbacks are versioned and bounded to known failure codes", () => {
    const callback = makeEvaluationResultCallback(fixture.unsafeFixtureBuild.request.evaluationId, {
      schemaVersion: "rovaulta.cre-public-evaluation-error/v1",
      protocolVersion: "rovaulta.protocol/v1",
      status: "REJECT",
      code: "CONFIDENTIAL_EVALUATION_REJECTED",
    });
    expect(parseEvaluationResultCallback(callback).response.status).toBe("REJECT");
    expect(() =>
      parseEvaluationResultCallback({
        ...callback,
        response: { ...callback.response, code: "private-detail" },
      }),
    ).toThrow(CreBoundaryError);
  });
});
