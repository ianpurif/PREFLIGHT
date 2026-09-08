import { describe, expect, test } from "bun:test";
import { createHmac } from "node:crypto";
import {
  CRE_PUBLIC_REQUEST_VERSION,
  digestBehaviorInput,
  makeEvaluationResultCallback,
  SYNTHETIC_TRACE_PROVENANCE,
  serializeEvaluationResultCallback,
  siteSecretId,
} from "@rovaulta/chainlink-cre/protocol";
import {
  PROTOCOL_VERSION,
  parseEvaluationRequest,
  parseRobotBuildDescriptor,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import { evaluateSimulation, parseRobotBehaviorTraceSuite } from "@rovaulta/simulation-core";
import { ApplicationStore } from "../src/application/index.js";
import { type ConfidentialEvaluationInput, CreEvaluationError } from "../src/evaluation/index.js";
import { buildServer } from "../src/server.js";

const KEY = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
const CALLBACK_SECRET = "p10-callback-test-secret";

const policy = {
  warehouseWidthMm: 1_000,
  warehouseHeightMm: 1_000,
  restrictedZone: { minXmm: 400, minYmm: 400, maxXmm: 600, maxYmm: 600 },
  maximumSpeedMmPerSecond: 1_000,
  zoneSpeedLimitMmPerSecond: 600,
  payloadThresholdGrams: 40_000,
};

function cookie(response: { headers: Record<string, unknown> }): string {
  const value = response.headers["set-cookie"];
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === "string" ? (first.split(";", 1)[0] ?? "") : "";
  }
  return typeof value === "string" ? (value.split(";", 1)[0] ?? "") : "";
}

function sessionHeaders(value: string) {
  return { cookie: value, origin: "http://localhost:3000" };
}

function signedCallback(callback: unknown) {
  const body = serializeEvaluationResultCallback(callback as never);
  return {
    body,
    headers: {
      "content-type": "application/json",
      "x-rovaulta-cre-signature": `sha256=${createHmac("sha256", CALLBACK_SECRET)
        .update(body, "utf8")
        .digest("hex")}`,
    },
  };
}

function callbackFor(
  input: ConfidentialEvaluationInput,
  behaviorInputDigest = digestBehaviorInput(
    (() => {
      const request = parseEvaluationRequest(input.request);
      return {
        schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
        protocolVersion: PROTOCOL_VERSION,
        confidentialInputSecretId: siteSecretId(request.inputs.siteId),
        request,
        robotBuild: parseRobotBuildDescriptor(input.robotBuild),
        behaviorTraces: parseRobotBehaviorTraceSuite(input.behaviorTraces),
        traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
        evaluatedAt: parseUnixTimestamp(input.evaluatedAt, "evaluatedAt"),
      };
    })(),
  ),
) {
  const report = evaluateSimulation(input);
  const request = parseEvaluationRequest(input.request);
  return makeEvaluationResultCallback(request.evaluationId, {
    schemaVersion: "rovaulta.cre-public-evaluation-result/v1",
    protocolVersion: PROTOCOL_VERSION,
    status: "EVALUATED",
    result: report.result,
    behaviorInputDigest,
    traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
  });
}

describe("CRE account result callback", () => {
  test("completes a pending account evaluation and is idempotent", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    let captured: ConfidentialEvaluationInput | undefined;
    const app = buildServer({
      applicationStore: store,
      environment: { NODE_ENV: "test", ROVAULTA_CRE_RESULT_CALLBACK_SECRET: CALLBACK_SECRET },
      evaluationExecutor: {
        evaluate: async (input) => {
          captured = input;
          throw new CreEvaluationError("CRE_EVALUATION_PENDING", "accepted");
        },
      },
    });
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "callback@example.test", password: "correct horse battery staple" },
    });
    const session = cookie(registration);
    const site = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: "/sites",
          headers: sessionHeaders(session),
          payload: { name: "Callback site", location: "Manila", policy },
        })
      ).body,
    ).site;
    const robot = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: `/sites/${site.id}/robots`,
          headers: sessionHeaders(session),
          payload: { name: "AMR-callback" },
        })
      ).body,
    ).robot;
    const build = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: `/sites/${site.id}/builds`,
          headers: sessionHeaders(session),
          payload: {
            robotId: robot.id,
            version: "1.0.0",
            label: "Callback candidate",
            artifactDigest: `sha256:${"ab".repeat(32)}`,
            route: {
              start: { xMm: 100, yMm: 100 },
              end: { xMm: 900, yMm: 100 },
              speedMmPerSecond: 400,
            },
          },
        })
      ).body,
    ).build;
    const pending = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: sessionHeaders(session),
      payload: { siteId: site.id, robotId: robot.id, buildId: build.id },
    });
    expect(pending.statusCode).toBe(202);
    const evaluationId = JSON.parse(pending.body).evaluationId as string;
    expect(
      JSON.parse(
        (
          await app.inject({
            method: "GET",
            url: `/evaluations/${evaluationId}`,
            headers: sessionHeaders(session),
          })
        ).body,
      ).status,
    ).toBe("PENDING");
    if (captured === undefined) throw new Error("evaluation input was not captured");

    const callback = callbackFor(captured);
    const request = signedCallback(callback);
    const completed = await app.inject({
      method: "POST",
      url: "/internal/cre/evaluation-result",
      headers: request.headers,
      payload: request.body,
    });
    expect(completed.statusCode).toBe(200);
    expect(JSON.parse(completed.body).status).toBe("COMPLETED");
    const evaluation = await app.inject({
      method: "GET",
      url: `/evaluations/${evaluationId}`,
      headers: sessionHeaders(session),
    });
    expect(evaluation.statusCode).toBe(200);
    expect(JSON.parse(evaluation.body).evaluation.verdict).toBe("CLEAR");

    const replay = await app.inject({
      method: "POST",
      url: "/internal/cre/evaluation-result",
      headers: request.headers,
      payload: request.body,
    });
    expect(replay.statusCode).toBe(200);
    expect(JSON.parse(replay.body).status).toBe("ALREADY_COMPLETED");
    const badSignature = await app.inject({
      method: "POST",
      url: "/internal/cre/evaluation-result",
      headers: { ...request.headers, "x-rovaulta-cre-signature": `sha256=${"00".repeat(32)}` },
      payload: request.body,
    });
    expect(badSignature.statusCode).toBe(401);
    await app.close();
  });

  test("rejects a signed callback whose behavior binding changed", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    let captured: ConfidentialEvaluationInput | undefined;
    const app = buildServer({
      applicationStore: store,
      environment: { NODE_ENV: "test", ROVAULTA_CRE_RESULT_CALLBACK_SECRET: CALLBACK_SECRET },
      evaluationExecutor: {
        evaluate: async (input) => {
          captured = input;
          throw new CreEvaluationError("CRE_EVALUATION_PENDING", "accepted");
        },
      },
    });
    const registration = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "binding@example.test", password: "correct horse battery staple" },
    });
    const session = cookie(registration);
    const site = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: "/sites",
          headers: sessionHeaders(session),
          payload: { name: "Binding site", location: "Manila", policy },
        })
      ).body,
    ).site;
    const robot = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: `/sites/${site.id}/robots`,
          headers: sessionHeaders(session),
          payload: { name: "AMR-binding" },
        })
      ).body,
    ).robot;
    const build = JSON.parse(
      (
        await app.inject({
          method: "POST",
          url: `/sites/${site.id}/builds`,
          headers: sessionHeaders(session),
          payload: {
            robotId: robot.id,
            version: "1.0.0",
            label: "Binding candidate",
            artifactDigest: `sha256:${"cd".repeat(32)}`,
            route: {
              start: { xMm: 100, yMm: 100 },
              end: { xMm: 900, yMm: 100 },
              speedMmPerSecond: 400,
            },
          },
        })
      ).body,
    ).build;
    const pending = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: sessionHeaders(session),
      payload: { siteId: site.id, robotId: robot.id, buildId: build.id },
    });
    expect(pending.statusCode).toBe(202);
    if (captured === undefined) throw new Error("evaluation input was not captured");
    const callback = callbackFor(captured, `sha256:${"00".repeat(32)}` as never);
    const request = signedCallback(callback);
    const response = await app.inject({
      method: "POST",
      url: "/internal/cre/evaluation-result",
      headers: request.headers,
      payload: request.body,
    });
    expect(response.statusCode).toBe(409);
    expect(JSON.parse(response.body).error).toBe("CONFLICT");
    await app.close();
  });

  test("reject callbacks are terminal and idempotent", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const account = store.registerAccount({
      email: "reject@example.test",
      password: "correct horse battery staple",
    }).account;
    const site = store.createSite(account.id, {
      name: "Reject site",
      location: "Manila",
      policy,
    });
    const robot = store.createRobot(account.id, site.id, { name: "AMR-reject" });
    const build = store.createBuild(account.id, site.id, {
      robotId: robot.id,
      version: "1.0.0",
      label: "Reject candidate",
      artifactDigest: `sha256:${"ef".repeat(32)}`,
      route: {
        start: { xMm: 100, yMm: 100 },
        end: { xMm: 900, yMm: 100 },
        speedMmPerSecond: 400,
      },
    });
    const evaluationId = "evaluation:reject-callback-test";
    await expect(
      store.evaluateBuild(account.id, {
        siteId: site.id,
        robotId: robot.id,
        buildId: build.id,
        evaluationId,
        requestedAt: "1000",
        evaluatedAt: "1000",
        evaluate: async () => {
          throw new CreEvaluationError("CRE_EVALUATION_PENDING", "accepted");
        },
      }),
    ).rejects.toMatchObject({ code: "CRE_EVALUATION_PENDING" });

    const callback = makeEvaluationResultCallback(evaluationId, {
      schemaVersion: "rovaulta.cre-public-evaluation-error/v1",
      protocolVersion: PROTOCOL_VERSION,
      status: "REJECT",
      code: "CONFIDENTIAL_INPUT_UNAVAILABLE",
    });
    expect(store.completeCreEvaluation(callback)).toEqual({
      status: "REJECTED",
      code: "CONFIDENTIAL_INPUT_UNAVAILABLE",
    });
    expect(store.completeCreEvaluation(callback)).toEqual({
      status: "REJECTED",
      code: "CONFIDENTIAL_INPUT_UNAVAILABLE",
    });
  });
});
