import { describe, expect, test } from "bun:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  assertLockfileName,
  assertSafeSourceEntries,
  BuildRunnerError,
  DockerBuildRunner,
  isRuntimeVersion,
  validateSourceBuildRequest,
} from "../src/build-integrity/index.js";

const validRequest = {
  buildId: `robot-build:${"a".repeat(32)}`,
  sourceRepository: "https://github.com/example/robot",
  sourceRevision: "a".repeat(40),
  buildCommand: "bun run build",
  runtime: "bun" as const,
};

describe("source-build boundary validation", () => {
  test("accepts the actual Bun and Node version output formats", () => {
    expect(isRuntimeVersion("bun", "1.4.1")).toBe(true);
    expect(isRuntimeVersion("node", "v22.20.0")).toBe(true);
    expect(isRuntimeVersion("bun", "bun1.4.1")).toBe(false);
  });

  test("accepts an exact Bun source build request", () => {
    const result = validateSourceBuildRequest(validRequest);
    expect(result.sourceUrl.protocol).toBe("https:");
    expect(result.sourceRevision).toBe(validRequest.sourceRevision);
  });

  test.each([
    ["moving branch", { sourceRevision: "main" }],
    ["private host", { sourceRepository: "https://localhost/repo" }],
    ["shell syntax", { buildCommand: "bun run build && cat .env" }],
    ["wrong runtime command", { buildCommand: "npm run build" }],
  ])("rejects %s", (_label, mutation) => {
    expect(() => validateSourceBuildRequest({ ...validRequest, ...mutation })).toThrow(
      BuildRunnerError,
    );
  });

  test("requires the runtime's frozen lockfile", () => {
    expect(() => assertLockfileName("bun", ["package.json"])).toThrow("bun.lock");
    expect(assertLockfileName("bun", ["bun.lock", "package.json"])).toBe("bun.lock");
    expect(assertLockfileName("node", ["package-lock.json"])).toBe("package-lock.json");
  });

  test("rejects links, submodules, and environment files from the build context", () => {
    for (const entry of [
      { mode: "120000", path: "link" },
      { mode: "160000", path: "submodule" },
      { mode: "100644", path: ".env" },
      { mode: "100644", path: "config/.env.production" },
    ]) {
      expect(() => assertSafeSourceEntries([entry])).toThrow(BuildRunnerError);
    }
    expect(() => assertSafeSourceEntries([{ mode: "100644", path: ".env.example" }])).not.toThrow();
  });
});

describe("BuildKit runner availability", () => {
  test("fails closed when the configured source tooling is unavailable", async () => {
    const runner = new DockerBuildRunner({
      gitBinary: "rovaulta-git-command-that-does-not-exist",
      timeoutMs: 5_000,
    });
    await expect(runner.run(validRequest)).rejects.toMatchObject({
      code: "BUILD_RUNNER_UNAVAILABLE",
    });
  });
});

const runRealBuildKitTests = process.env.ROVAULTA_RUN_REAL_BUILDKIT_TESTS === "true";

test.skipIf(!runRealBuildKitTests)(
  "real BuildKit integration builds an exact Bun revision",
  async () => {
    const sourceRepository = process.env.ROVAULTA_REAL_BUILD_REPOSITORY;
    const sourceRevision = process.env.ROVAULTA_REAL_BUILD_REVISION;
    if (sourceRepository === undefined || sourceRevision === undefined) {
      throw new Error(
        "ROVAULTA_REAL_BUILD_REPOSITORY and ROVAULTA_REAL_BUILD_REVISION are required",
      );
    }
    const artifactDirectory = await mkdtemp(join(tmpdir(), "rovaulta-real-artifacts-"));
    try {
      const result = await new DockerBuildRunner({
        artifactDirectory,
        installNetwork:
          process.env.ROVAULTA_REAL_BUILD_INSTALL_NETWORK === "default" ? "default" : "none",
      }).run({
        buildId: `robot-build:${"b".repeat(32)}`,
        sourceRepository,
        sourceRevision,
        buildCommand: process.env.ROVAULTA_REAL_BUILD_COMMAND ?? "bun run build",
        runtime: "bun",
      });
      expect(result.evidence.buildStatus).toBe("BUILD_SUCCEEDED");
      expect(result.evidence.sourceRevision).toBe(sourceRevision);
      expect(result.evidence.runtime.name).toBe("bun");
      expect(result.evidence.artifactDigest).toBe(result.artifactDigest);
      expect(result.evidence.provenance.subject[0].digest.sha256).toBe(
        result.artifactDigest.slice("sha256:".length),
      );
      if (process.env.ROVAULTA_REAL_BUILD_EVIDENCE === "true") {
        console.log(
          JSON.stringify(
            {
              sourceRepository: result.evidence.sourceRepository,
              sourceRevision: result.evidence.sourceRevision,
              sourceSnapshotDigest: result.evidence.sourceSnapshotDigest,
              lockfileDigest: result.evidence.lockfileDigest,
              artifactDigest: result.artifactDigest,
              buildCommand: result.evidence.buildCommand,
              builder: result.evidence.builder,
              runtime: result.evidence.runtime,
              provenanceSubjectDigest: result.evidence.provenance.subject[0].digest.sha256,
              provenancePredicateType: result.evidence.provenance.predicateType,
            },
            null,
            2,
          ),
        );
      }
    } finally {
      await rm(artifactDirectory, { recursive: true, force: true });
    }
  },
  15 * 60_000,
);
