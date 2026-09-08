import { describe, expect, test } from "bun:test";
import { ApplicationStore } from "../src/application/index.js";
import { buildServer } from "../src/server.js";

const KEY = Uint8Array.from({ length: 32 }, (_, index) => index + 1);

function cookie(response: { headers: Record<string, string | string[] | undefined> }): string {
  const value = response.headers["set-cookie"];
  if (Array.isArray(value)) return value[0]?.split(";", 1)[0] ?? "";
  return value?.split(";", 1)[0] ?? "";
}

const policy = {
  warehouseWidthMm: 1_000,
  warehouseHeightMm: 1_000,
  restrictedZone: { minXmm: 400, minYmm: 400, maxXmm: 600, maxYmm: 600 },
  maximumSpeedMmPerSecond: 1_000,
  zoneSpeedLimitMmPerSecond: 600,
  payloadThresholdGrams: 40_000,
};

async function register(app: ReturnType<typeof buildServer>, email: string) {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery staple" },
  });
  expect(response.statusCode).toBe(201);
  return cookie(response);
}

describe("account-scoped product lifecycle", () => {
  test("persists a private policy and evaluates a registered build", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const app = buildServer({ applicationStore: store });
    const session = await register(app, "operator@example.test");

    const siteResponse = await app.inject({
      method: "POST",
      url: "/sites",
      headers: { cookie: session },
      payload: { name: "North dock", location: "Manila", policy },
    });
    expect(siteResponse.statusCode).toBe(201);
    const site = JSON.parse(siteResponse.body).site;
    expect(site).toHaveProperty("safetyEnvelopeCommitment");
    expect(JSON.stringify(site)).not.toContain("warehouseBounds");

    const robotResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/robots`,
      headers: { cookie: session },
      payload: { name: "AMR-01" },
    });
    expect(robotResponse.statusCode).toBe(201);
    const robot = JSON.parse(robotResponse.body).robot;

    const buildResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/builds`,
      headers: { cookie: session },
      payload: {
        robotId: robot.id,
        version: "1.0.0",
        label: "Clear candidate",
        artifactDigest: `sha256:${"ab".repeat(32)}`,
        route: {
          start: { xMm: 100, yMm: 100 },
          end: { xMm: 900, yMm: 100 },
          speedMmPerSecond: 400,
        },
      },
    });
    expect(buildResponse.statusCode).toBe(201);
    const build = JSON.parse(buildResponse.body).build;

    const evaluationResponse = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: { cookie: session },
      payload: { siteId: site.id, robotId: robot.id, buildId: build.id },
    });
    expect(evaluationResponse.statusCode).toBe(201);
    const evaluation = JSON.parse(evaluationResponse.body).evaluation;
    expect(evaluation.verdict).toBe("CLEAR");
    expect(evaluation.robotBuildDigest).toBe(build.robotBuildDigest);
    expect(evaluation.safetyEnvelopeCommitment).toBe(site.safetyEnvelopeCommitment);

    const releaseResponse = await app.inject({
      method: "POST",
      url: "/releases/prepare",
      headers: { cookie: session },
      payload: {
        evaluationId: evaluation.evaluationId,
        signerAddress: "0x0000000000000000000000000000000000000001",
        clearance: null,
      },
    });
    expect(releaseResponse.statusCode).toBe(409);
    expect(JSON.parse(releaseResponse.body).error).toBe("CLEARANCE_NOT_AVAILABLE");
    await app.close();
  });

  test("isolates resources between accounts", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const app = buildServer({ applicationStore: store });
    const first = await register(app, "first@example.test");
    const second = await register(app, "second@example.test");
    const siteResponse = await app.inject({
      method: "POST",
      url: "/sites",
      headers: { cookie: first },
      payload: { name: "Private site", location: "Manila", policy },
    });
    const site = JSON.parse(siteResponse.body).site;

    const hidden = await app.inject({
      method: "GET",
      url: `/sites/${site.id}`,
      headers: { cookie: second },
    });
    expect(hidden.statusCode).toBe(404);
    const hiddenBuild = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: { cookie: second },
      payload: { siteId: site.id, robotId: "robot:missing", buildId: "robot-build:missing" },
    });
    expect(hiddenBuild.statusCode).toBe(404);
    await app.close();
  });

  test("rejects anonymous resource access and malformed account input", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const app = buildServer({ applicationStore: store });
    const anonymous = await app.inject({ method: "GET", url: "/sites" });
    expect(anonymous.statusCode).toBe(401);
    const malformed = await app.inject({
      method: "POST",
      url: "/auth/register",
      payload: { email: "operator@example.test", password: "short" },
    });
    expect(malformed.statusCode).toBe(400);
    await app.close();
  });
});
