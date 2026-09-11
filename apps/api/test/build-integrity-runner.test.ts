import { describe, expect, test } from "bun:test";
import {
  assertLockfileName,
  assertSafeSourceEntries,
  BuildRunnerError,
  DockerBuildRunner,
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

test.skipIf(!runRealBuildKitTests)("real BuildKit integration is enabled explicitly", () => {
  expect(runRealBuildKitTests).toBe(true);
});
