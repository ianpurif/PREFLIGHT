import { describe, expect, test } from "bun:test";
import {
  type BuildIntegrityEvidence,
  parseBuildIntegrityEvidence,
  parseSha256Digest,
} from "@rovaulta/domain";
import { evaluateSimulation } from "@rovaulta/simulation-core";
import { ApplicationStore, type PublicBuild } from "../src/application/index.js";
import type { BuildRunner, BuildRunnerResult } from "../src/build-integrity/index.js";
import { BuildRunnerError } from "../src/build-integrity/index.js";
import { buildServer } from "../src/server.js";

const KEY = Uint8Array.from({ length: 32 }, (_, index) => index + 1);
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

function resultFor(input: {
  readonly buildId: string;
  readonly sourceRepository: string;
  readonly sourceRevision: string;
  readonly buildCommand: string;
  readonly artifactHex: string;
}): BuildRunnerResult {
  const artifactDigest = parseSha256Digest(`sha256:${input.artifactHex}`);
  const evidence: BuildIntegrityEvidence = parseBuildIntegrityEvidence({
    schemaVersion: "rovaulta.build-integrity/v1",
    buildId: input.buildId,
    sourceRepository: input.sourceRepository,
    sourceRevision: input.sourceRevision,
    sourceSnapshotDigest: `sha256:${"cd".repeat(32)}`,
    artifactDigest,
    buildCommand: input.buildCommand,
    lockfileDigest: `sha256:${"ef".repeat(32)}`,
    builder: {
      id: "https://rovaulta.dev/builders/rovaulta-buildkit/v1",
      version: "buildx-test",
    },
    runtime: {
      name: "bun",
      version: "1.4.1",
      image: `oven/bun:1.4.1@sha256:${"aa".repeat(32)}`,
    },
    buildStatus: "BUILD_SUCCEEDED",
    provenance: {
      _type: "https://in-toto.io/Statement/v1",
      subject: [{ name: `artifact:${input.buildId}`, digest: { sha256: input.artifactHex } }],
      predicateType: "https://slsa.dev/provenance/v1",
      predicate: {
        buildDefinition: {
          buildType: "https://rovaulta.dev/builders/rovaulta-buildkit/v1",
          externalParameters: {
            repository: input.sourceRepository,
            revision: input.sourceRevision,
            buildCommand: input.buildCommand,
            runtime: "bun",
          },
          resolvedDependencies: [
            {
              uri: input.sourceRepository,
              digest: { sha256: input.sourceRevision },
            },
          ],
        },
        runDetails: {
          builder: {
            id: "https://rovaulta.dev/builders/rovaulta-buildkit/v1",
            version: { buildx: "test" },
          },
          metadata: {
            invocationId: input.buildId,
            startedOn: "2026-09-12T00:00:00.000Z",
            finishedOn: "2026-09-12T00:00:01.000Z",
          },
        },
      },
    },
  });
  return { evidence, artifactPath: `.data/test-artifacts/${input.buildId}.tar.gz`, artifactDigest };
}

async function register(app: ReturnType<typeof buildServer>, email: string): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/auth/register",
    payload: { email, password: "correct horse battery staple" },
  });
  expect(response.statusCode).toBe(201);
  return cookie(response);
}

async function target(app: ReturnType<typeof buildServer>, session: string) {
  const siteResponse = await app.inject({
    method: "POST",
    url: "/sites",
    headers: sessionHeaders(session),
    payload: { name: "North dock", location: "Manila", policy },
  });
  const site = JSON.parse(siteResponse.body).site as { id: string };
  const robotResponse = await app.inject({
    method: "POST",
    url: `/sites/${site.id}/robots`,
    headers: sessionHeaders(session),
    payload: { name: "AMR-01" },
  });
  const robot = JSON.parse(robotResponse.body).robot as { id: string };
  return { site, robot };
}

const buildPayload = (robotId: string) => ({
  robotId,
  version: "2026.09.12",
  label: "Source candidate",
  sourceRepository: "https://github.com/example/warehouse-robot",
  sourceRevision: "ab".repeat(20),
  buildCommand: "bun run build",
  runtime: "bun",
  route: {
    start: { xMm: 100, yMm: 100 },
    end: { xMm: 900, yMm: 100 },
    speedMmPerSecond: 400,
  },
});

async function waitForBuild(
  store: ApplicationStore,
  accountId: string,
  buildId: string,
): Promise<PublicBuild> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const build = store.listAllBuilds(accountId).find((candidate) => candidate.id === buildId);
    if (build !== undefined && build.buildStatus !== "BUILDING") return build;
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  throw new Error("source build did not settle");
}

describe("optional source build lifecycle", () => {
  test("keeps existing build flow and promotes a real runner result into exact evaluation", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const runner: BuildRunner = {
      run: async (input) =>
        resultFor({
          ...input,
          artifactHex: "12".repeat(32),
        }),
    };
    const app = buildServer({
      applicationStore: store,
      buildRunner: runner,
      evaluationExecutor: { evaluate: async (input) => evaluateSimulation(input) },
    });
    const session = await register(app, "source@example.test");
    const account = store.accountForSession(ApplicationStore.readSessionCookie(session));
    if (account === null) throw new Error("test account was not found");
    const { site, robot } = await target(app, session);

    const existingResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/builds`,
      headers: sessionHeaders(session),
      payload: {
        robotId: robot.id,
        version: "legacy-2026.09.12",
        label: "Existing build",
        artifactDigest: `sha256:${"34".repeat(32)}`,
        route: buildPayload(robot.id).route,
      },
    });
    expect(existingResponse.statusCode).toBe(201);
    expect(JSON.parse(existingResponse.body).build.buildMode).toBe("EXISTING");

    const sourceResponse = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/source-builds`,
      headers: sessionHeaders(session),
      payload: buildPayload(robot.id),
    });
    expect(sourceResponse.statusCode).toBe(202);
    const queued = JSON.parse(sourceResponse.body).build as PublicBuild;
    expect(queued.buildStatus).toBe("BUILDING");
    expect(queued.artifactDigest).toBeNull();

    const completed = await waitForBuild(store, account.id, queued.id);
    expect(completed.buildStatus).toBe("BUILD_SUCCEEDED");
    expect(completed.buildMode).toBe("SOURCE");
    expect(completed.artifactDigest).toBe(`sha256:${"12".repeat(32)}`);
    expect(completed.sourceRevision).toBe("ab".repeat(20));
    expect(completed.provenance?.predicateType).toBe("https://slsa.dev/provenance/v1");

    const evaluationResponse = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: sessionHeaders(session),
      payload: { siteId: site.id, robotId: robot.id, buildId: queued.id },
    });
    expect(evaluationResponse.statusCode).toBe(201);
    expect(JSON.parse(evaluationResponse.body).evaluation.robotBuildDigest).toBe(
      completed.robotBuildDigest,
    );
    await app.close();
  });

  test("keeps a failed source build distinct from a safety REJECT and isolates accounts", async () => {
    const store = new ApplicationStore({ dbPath: ":memory:", policyKey: KEY });
    const runner: BuildRunner = {
      run: async () => {
        throw new BuildRunnerError("BUILD_COMMAND_FAILED", "The build command failed");
      },
    };
    const app = buildServer({ applicationStore: store, buildRunner: runner });
    const first = await register(app, "failed-source@example.test");
    const second = await register(app, "other-source@example.test");
    const { site, robot } = await target(app, first);
    const response = await app.inject({
      method: "POST",
      url: `/sites/${site.id}/source-builds`,
      headers: sessionHeaders(first),
      payload: buildPayload(robot.id),
    });
    const queued = JSON.parse(response.body).build as PublicBuild;
    const failed = await waitForBuild(
      store,
      store.accountForSession(ApplicationStore.readSessionCookie(first))?.id ?? "",
      queued.id,
    );
    expect(failed.buildStatus).toBe("BUILD_FAILED");
    expect(failed.buildErrorCode).toBe("BUILD_COMMAND_FAILED");
    const blocked = await app.inject({
      method: "POST",
      url: "/evaluations",
      headers: sessionHeaders(first),
      payload: { siteId: site.id, robotId: robot.id, buildId: queued.id },
    });
    expect(blocked.statusCode).toBe(409);
    expect(JSON.parse(blocked.body).error).toBe("BUILD_FAILED");
    const hidden = await app.inject({
      method: "GET",
      url: `/sites/${site.id}/builds`,
      headers: sessionHeaders(second),
    });
    expect(hidden.statusCode).toBe(404);
    await app.close();
  });
});
