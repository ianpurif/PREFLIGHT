import { execFile as execFileCallback } from "node:child_process";
import { createHash } from "node:crypto";
import type { Dirent } from "node:fs";
import { createReadStream } from "node:fs";
import { copyFile, mkdir, mkdtemp, readdir, readFile, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { promisify } from "node:util";
import {
  type BuildProvenanceStatement,
  digestBuildIntegrity,
  parseBuildIntegrityEvidence,
  parseRobotBuildId,
  parseSha256Digest,
  type Sha256Digest,
} from "@rovaulta/domain";
import {
  type BuildRunner,
  BuildRunnerError,
  type BuildRunnerResult,
  type SourceBuildRequest,
} from "./types.js";
import {
  assertLockfileName,
  assertSafeSourceEntries,
  parseAllowedSourceHosts,
  type ValidatedSourceBuildRequest,
  validateSourceBuildRequest,
} from "./validation.js";

const execFile = promisify(execFileCallback);
const MAX_COMMAND_OUTPUT_BYTES = 512 * 1024;
const MAX_PROVENANCE_BYTES = 4 * 1024 * 1024;
const DEFAULT_TIMEOUT_MS = 15 * 60 * 1_000;
const DEFAULT_MEMORY = "1g";
const DEFAULT_CPU_QUOTA = "50000";
const DEFAULT_CPU_PERIOD = "100000";
const DEFAULT_PLATFORM = "linux/amd64";
const DEFAULT_BUN_IMAGE = "oven/bun:1.4.1";
const DEFAULT_NODE_IMAGE = "node:22-bookworm-slim";
const DEFAULT_DOCKERFILE_FRONTEND = "docker/dockerfile:1.7";
const DEFAULT_BUILDKIT_IMAGE = "moby/buildkit:v0.30.0";
const DEFAULT_INSTALL_NETWORK = "none" as const;
const DEFAULT_MAX_CONCURRENT_BUILDS = 2;
const DEFAULT_MAX_SOURCE_ENTRIES = 50_000;
const DEFAULT_MAX_SOURCE_BYTES = 512 * 1024 * 1024;
const BUILDER_ID = "https://rovaulta.dev/builders/rovaulta-buildkit/v1";

interface SnapshotContext {
  readonly root: string;
  readonly contextPath: string;
  readonly sourceSnapshotDigest: Sha256Digest;
  readonly lockfileDigest: Sha256Digest;
  readonly lockfileName: string;
}

interface RunnerOptions {
  readonly dockerBinary: string;
  readonly gitBinary: string;
  readonly tarBinary: string;
  readonly artifactDirectory: string;
  readonly timeoutMs: number;
  readonly memory: string;
  readonly cpuQuota: string;
  readonly cpuPeriod: string;
  readonly platform: string;
  readonly sourceHosts: readonly string[];
  readonly bunImage: string;
  readonly nodeImage: string;
  readonly dockerfileFrontend: string;
  readonly buildkitImage: string;
  readonly installNetwork: "default" | "none";
  readonly maxConcurrentBuilds: number;
  readonly maxSourceEntries: number;
  readonly maxSourceBytes: number;
}

interface ToolFailure extends Error {
  readonly kind: "unavailable" | "timeout" | "failed";
  readonly output: string;
}

function runnerEnvironment(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {
    PATH: process.env.PATH,
    PATHEXT: process.env.PATHEXT,
    SystemRoot: process.env.SystemRoot,
    ComSpec: process.env.ComSpec,
    TMP: process.env.TMP,
    TEMP: process.env.TEMP,
    LANG: "C",
    BUILDX_METADATA_PROVENANCE: "max",
    GIT_TERMINAL_PROMPT: "0",
    GIT_CONFIG_NOSYSTEM: "1",
    GIT_CONFIG_GLOBAL: process.platform === "win32" ? "NUL" : "/dev/null",
  };
  return env;
}

function stringOutput(value: unknown): string {
  if (typeof value === "string") return value.slice(-MAX_COMMAND_OUTPUT_BYTES);
  if (Buffer.isBuffer(value)) return value.toString("utf8").slice(-MAX_COMMAND_OUTPUT_BYTES);
  return "";
}

async function runTool(
  file: string,
  args: readonly string[],
  options: {
    readonly timeoutMs: number;
    readonly failureCode: BuildRunnerError["code"];
    readonly cwd?: string;
    readonly encoding?: "utf8" | "buffer";
  },
): Promise<{ readonly stdout: string | Buffer; readonly stderr: string }> {
  try {
    const result = await execFile(file, [...args], {
      cwd: options.cwd,
      env: runnerEnvironment(),
      timeout: options.timeoutMs,
      windowsHide: true,
      maxBuffer: MAX_COMMAND_OUTPUT_BYTES,
      encoding: options.encoding === "buffer" ? "buffer" : "utf8",
    });
    return { stdout: result.stdout, stderr: stringOutput(result.stderr) };
  } catch (error) {
    const candidate = error as {
      readonly code?: unknown;
      readonly killed?: unknown;
      readonly signal?: unknown;
      readonly stdout?: unknown;
      readonly stderr?: unknown;
      readonly message?: unknown;
    };
    const output = `${stringOutput(candidate.stdout)}\n${stringOutput(candidate.stderr)}`.slice(
      -MAX_COMMAND_OUTPUT_BYTES,
    );
    const kind =
      candidate.code === "ENOENT"
        ? "unavailable"
        : candidate.code === "ETIMEDOUT" ||
            candidate.killed === true ||
            candidate.signal === "SIGTERM"
          ? "timeout"
          : "failed";
    const failure = new Error(
      typeof candidate.message === "string" ? candidate.message : "tool failed",
    ) as ToolFailure;
    Object.defineProperty(failure, "kind", { value: kind });
    Object.defineProperty(failure, "output", { value: output });
    throw failure;
  }
}

function toolError(
  error: unknown,
  fallback: BuildRunnerError["code"],
  message: string,
): BuildRunnerError {
  const failure = error as Partial<ToolFailure>;
  if (failure.kind === "unavailable") {
    return new BuildRunnerError(
      "BUILD_RUNNER_UNAVAILABLE",
      "The configured build tooling is unavailable",
    );
  }
  if (failure.kind === "timeout")
    return new BuildRunnerError("BUILD_TIMEOUT", "The source build timed out");
  return new BuildRunnerError(fallback, message);
}

function sha256Buffer(value: Uint8Array): Sha256Digest {
  return parseSha256Digest(`sha256:${createHash("sha256").update(value).digest("hex")}`);
}

async function hashFile(path: string, maximumBytes: number): Promise<Sha256Digest> {
  const hash = createHash("sha256");
  let size = 0;
  try {
    for await (const chunk of createReadStream(path)) {
      const bytes = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      size += bytes.length;
      if (size > maximumBytes) throw new Error("artifact exceeds configured size limit");
      hash.update(bytes);
    }
  } catch {
    throw new BuildRunnerError(
      "ARTIFACT_DIGEST_FAILED",
      "The produced artifact could not be hashed",
    );
  }
  if (size === 0)
    throw new BuildRunnerError("ARTIFACT_DIGEST_FAILED", "The produced artifact is empty");
  return parseSha256Digest(`sha256:${hash.digest("hex")}`);
}

function treeEntries(tree: Buffer): readonly { readonly mode: string; readonly path: string }[] {
  const entries: { mode: string; path: string }[] = [];
  for (const record of tree.toString("utf8").split("\0")) {
    if (record.length === 0) continue;
    const separator = record.indexOf("\t");
    if (separator < 0)
      throw new BuildRunnerError("INVALID_SOURCE", "Source tree metadata is malformed");
    const header = record.slice(0, separator).split(" ");
    const path = record.slice(separator + 1);
    if (header.length !== 3 || path.length === 0) {
      throw new BuildRunnerError("INVALID_SOURCE", "Source tree metadata is malformed");
    }
    const mode = header[0];
    if (mode === undefined) {
      throw new BuildRunnerError("INVALID_SOURCE", "Source tree metadata is malformed");
    }
    entries.push({ mode, path });
  }
  return Object.freeze(entries);
}

async function readOutputFile(root: string, expectedName: string): Promise<string> {
  const pending = [root];
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    let children: readonly Dirent<string>[];
    try {
      children = await readdir(current, { withFileTypes: true, encoding: "utf8" });
    } catch {
      continue;
    }
    for (const child of children) {
      const path = join(current, child.name);
      if (child.isSymbolicLink()) {
        throw new BuildRunnerError(
          "ARTIFACT_COLLECTION_FAILED",
          "Build output contains an unsafe link",
        );
      }
      if (child.isDirectory()) pending.push(path);
      else if (child.name === expectedName) return path;
    }
  }
  throw new BuildRunnerError(
    "ARTIFACT_COLLECTION_FAILED",
    "The isolated build did not export an artifact",
  );
}

async function assertContextSize(root: string, maximumBytes: number): Promise<void> {
  const pending = [root];
  let size = 0;
  while (pending.length > 0) {
    const current = pending.pop();
    if (current === undefined) continue;
    const children = await readdir(current, { withFileTypes: true, encoding: "utf8" });
    for (const child of children) {
      const path = join(current, child.name);
      if (child.isSymbolicLink()) {
        throw new BuildRunnerError(
          "SOURCE_CONTAINS_UNSAFE_FILE",
          "Source snapshots containing symlinks are not supported",
        );
      }
      if (child.isDirectory()) {
        pending.push(path);
        continue;
      }
      if (!child.isFile()) {
        throw new BuildRunnerError(
          "INVALID_SOURCE",
          "Source snapshot contains an unsupported file",
        );
      }
      const fileStats = await stat(path);
      size += fileStats.size;
      if (size > maximumBytes) {
        throw new BuildRunnerError("INVALID_SOURCE", "The unpacked source snapshot is too large");
      }
    }
  }
}

function parseImageDigest(image: string, output: string): string {
  const existing = image.match(/@sha256:[0-9a-f]{64}$/i);
  if (existing !== null) return image;
  const digest = output.match(/^Digest:\s+(sha256:[0-9a-f]{64})$/im)?.[1];
  if (digest === undefined) {
    throw new BuildRunnerError("SANDBOX_FAILED", "The runtime image could not be pinned");
  }
  return `${image}@${digest.toLowerCase()}`;
}

function imageDigest(image: string): string {
  const digest = image.match(/@sha256:([0-9a-f]{64})$/i)?.[1];
  if (digest === undefined)
    throw new BuildRunnerError("SANDBOX_FAILED", "The runtime image is not pinned");
  return digest.toLowerCase();
}

export function isRuntimeVersion(runtime: "bun" | "node", version: string): boolean {
  return runtime === "bun"
    ? /^\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?$/.test(version)
    : /^v\d+\.\d+\.\d+(?:[-+][A-Za-z0-9._-]+)?$/.test(version);
}

function shellDockerfile(
  runtime: "bun" | "node",
  image: string,
  dockerfileFrontend: string,
  installNetwork: "default" | "none",
): string {
  const user = runtime === "bun" ? "bun" : "node";
  const install =
    runtime === "bun"
      ? "bun install --frozen-lockfile --ignore-scripts"
      : "npm ci --ignore-scripts";
  const executable = runtime === "bun" ? "bun" : "node";
  return `# syntax=${dockerfileFrontend}\nFROM ${image} AS build\nUSER ${user}\nWORKDIR /workspace\nCOPY --chown=${user}:${user} . .\nRUN --network=${installNetwork} ${install}\nARG ROVAULTA_BUILD_COMMAND\nRUN --network=none /bin/sh -c "$ROVAULTA_BUILD_COMMAND"\nRUN --network=none ${executable} --version > /tmp/rovaulta-runtime-version\nRUN --network=none mkdir -p /tmp/rovaulta-artifact && tar --sort=name --mtime=@0 --owner=0 --group=0 --numeric-owner -czf /tmp/rovaulta-artifact.tar.gz --exclude=./node_modules --exclude=./.git --exclude=./.next/cache --exclude=./.turbo/cache --exclude=./test-results .\nFROM scratch\nCOPY --from=build /tmp/rovaulta-artifact.tar.gz /rovaulta-artifact.tar.gz\nCOPY --from=build /tmp/rovaulta-runtime-version /rovaulta-runtime-version\n`;
}

function provenanceStatement(input: {
  readonly request: ValidatedSourceBuildRequest;
  readonly artifactDigest: Sha256Digest;
  readonly sourceSnapshotDigest: Sha256Digest;
  readonly lockfileDigest: Sha256Digest;
  readonly lockfileName: string;
  readonly resolvedImage: string;
  readonly resolvedDockerfileFrontend: string;
  readonly resolvedBuildkitImage: string;
  readonly platform: string;
  readonly buildxVersion: string;
  readonly runtimeVersion: string;
  readonly buildkitProvenanceDigest: Sha256Digest;
  readonly startedOn: string;
  readonly finishedOn: string;
}): BuildProvenanceStatement {
  const request = input.request;
  return {
    _type: "https://in-toto.io/Statement/v1",
    subject: [
      {
        name: `rovaulta/${request.buildId}/artifact.tar.gz`,
        digest: { sha256: input.artifactDigest.slice("sha256:".length) },
      },
    ],
    predicateType: "https://slsa.dev/provenance/v1",
    predicate: {
      buildDefinition: {
        buildType: "https://rovaulta.dev/build-types/docker-buildx/v1",
        externalParameters: {
          repository: request.sourceRepository,
          revision: request.sourceRevision,
          buildCommand: request.buildCommand,
          runtime: request.runtime,
        },
        resolvedDependencies: [
          {
            uri: `git+${request.sourceRepository}@${request.sourceRevision}`,
            digest: { gitCommit: request.sourceRevision },
          },
          {
            uri: `source-snapshot:${input.sourceSnapshotDigest}`,
            digest: { sha256: input.sourceSnapshotDigest.slice("sha256:".length) },
          },
          {
            uri: `lockfile:${input.lockfileName}`,
            digest: { sha256: input.lockfileDigest.slice("sha256:".length) },
          },
          {
            uri: `docker-image:${input.resolvedImage}`,
            digest: { sha256: imageDigest(input.resolvedImage) },
          },
          {
            uri: `dockerfile-frontend:${input.resolvedDockerfileFrontend}`,
            digest: { sha256: imageDigest(input.resolvedDockerfileFrontend) },
          },
          {
            uri: `buildkit-image:${input.resolvedBuildkitImage}`,
            digest: { sha256: imageDigest(input.resolvedBuildkitImage) },
          },
          {
            uri: "urn:rovaulta:buildkit-provenance",
            digest: { sha256: input.buildkitProvenanceDigest.slice("sha256:".length) },
          },
        ],
      },
      runDetails: {
        builder: {
          id: BUILDER_ID,
          version: {
            buildx: input.buildxVersion,
            platform: input.platform,
          },
        },
        metadata: {
          invocationId: request.buildId,
          startedOn: input.startedOn,
          finishedOn: input.finishedOn,
        },
      },
    },
  };
}

export class DockerBuildRunner implements BuildRunner {
  readonly #options: RunnerOptions;
  #activeJobs = 0;

  constructor(options: Partial<RunnerOptions> = {}) {
    this.#options = {
      dockerBinary: options.dockerBinary ?? "docker",
      gitBinary: options.gitBinary ?? "git",
      tarBinary: options.tarBinary ?? "tar",
      artifactDirectory:
        options.artifactDirectory ?? resolve(process.cwd(), ".data/rovaulta-build-artifacts"),
      timeoutMs: options.timeoutMs ?? DEFAULT_TIMEOUT_MS,
      memory: options.memory ?? DEFAULT_MEMORY,
      cpuQuota: options.cpuQuota ?? DEFAULT_CPU_QUOTA,
      cpuPeriod: options.cpuPeriod ?? DEFAULT_CPU_PERIOD,
      platform: options.platform ?? DEFAULT_PLATFORM,
      sourceHosts: options.sourceHosts ?? parseAllowedSourceHosts(undefined),
      bunImage: options.bunImage ?? DEFAULT_BUN_IMAGE,
      nodeImage: options.nodeImage ?? DEFAULT_NODE_IMAGE,
      dockerfileFrontend: options.dockerfileFrontend ?? DEFAULT_DOCKERFILE_FRONTEND,
      buildkitImage: options.buildkitImage ?? DEFAULT_BUILDKIT_IMAGE,
      installNetwork: options.installNetwork ?? DEFAULT_INSTALL_NETWORK,
      maxConcurrentBuilds: options.maxConcurrentBuilds ?? DEFAULT_MAX_CONCURRENT_BUILDS,
      maxSourceEntries: options.maxSourceEntries ?? DEFAULT_MAX_SOURCE_ENTRIES,
      maxSourceBytes: options.maxSourceBytes ?? DEFAULT_MAX_SOURCE_BYTES,
    };
  }

  async run(input: SourceBuildRequest): Promise<BuildRunnerResult> {
    const request = validateSourceBuildRequest(input, this.#options.sourceHosts);
    if (this.#activeJobs >= this.#options.maxConcurrentBuilds) {
      throw new BuildRunnerError(
        "BUILD_RUNNER_UNAVAILABLE",
        "The source build runner is at capacity",
      );
    }
    this.#activeJobs += 1;
    const startedOn = new Date().toISOString();
    let snapshot: SnapshotContext | undefined;
    let temporaryRoot: string | undefined;
    let builderName: string | undefined;
    let persistentArtifactPath: string | undefined;
    let succeeded = false;
    try {
      snapshot = await this.#materializeSnapshot(request);
      temporaryRoot = snapshot.root;
      await mkdir(this.#options.artifactDirectory, { recursive: true });
      const resolvedImage = await this.#resolveRuntimeImage(
        request.runtime === "bun" ? this.#options.bunImage : this.#options.nodeImage,
      );
      const resolvedDockerfileFrontend = await this.#resolveRuntimeImage(
        this.#options.dockerfileFrontend,
      );
      const resolvedBuildkitImage = await this.#resolveRuntimeImage(this.#options.buildkitImage);
      const buildxVersion = await this.#buildxVersion();
      builderName = `rovaulta-${request.buildId.slice(-20)}`;
      const outputDirectory = join(temporaryRoot, "output");
      const dockerfilePath = join(temporaryRoot, "Dockerfile");
      const buildMetadataPath = join(temporaryRoot, "build-metadata.json");
      await mkdir(outputDirectory, { recursive: true });
      await writeFile(
        dockerfilePath,
        shellDockerfile(
          request.runtime,
          resolvedImage,
          resolvedDockerfileFrontend,
          this.#options.installNetwork,
        ),
        "utf8",
      );
      await this.#createBuilder(builderName, resolvedBuildkitImage);
      await this.#runBuild({
        builderName,
        dockerfilePath,
        contextPath: snapshot.contextPath,
        outputDirectory,
        buildMetadataPath,
        request,
      });
      const artifactOutputPath = await readOutputFile(outputDirectory, "rovaulta-artifact.tar.gz");
      const runtimeVersionPath = await readOutputFile(outputDirectory, "rovaulta-runtime-version");
      const runtimeVersion = (await readFile(runtimeVersionPath, "utf8")).trim();
      if (!isRuntimeVersion(request.runtime, runtimeVersion)) {
        throw new BuildRunnerError(
          "ARTIFACT_COLLECTION_FAILED",
          "The runtime version was not recorded",
        );
      }
      const buildkitProvenance = await readFile(buildMetadataPath);
      if (buildkitProvenance.length === 0 || buildkitProvenance.length > MAX_PROVENANCE_BYTES) {
        throw new BuildRunnerError("ARTIFACT_COLLECTION_FAILED", "BuildKit provenance is invalid");
      }
      try {
        const parsed = JSON.parse(buildkitProvenance.toString("utf8")) as unknown;
        if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed))
          throw new Error();
      } catch {
        throw new BuildRunnerError(
          "ARTIFACT_COLLECTION_FAILED",
          "BuildKit provenance is malformed",
        );
      }
      const artifactDigest = await hashFile(artifactOutputPath, 512 * 1024 * 1024);
      persistentArtifactPath = join(
        this.#options.artifactDirectory,
        `${request.buildId.slice("robot-build:".length)}.tar.gz`,
      );
      await copyFile(artifactOutputPath, persistentArtifactPath);
      const persistedDigest = await hashFile(persistentArtifactPath, 512 * 1024 * 1024);
      if (persistedDigest !== artifactDigest) {
        throw new BuildRunnerError("ARTIFACT_DIGEST_FAILED", "Artifact changed while being stored");
      }
      const finishedOn = new Date().toISOString();
      const provenance = provenanceStatement({
        request,
        artifactDigest,
        sourceSnapshotDigest: snapshot.sourceSnapshotDigest,
        lockfileDigest: snapshot.lockfileDigest,
        lockfileName: snapshot.lockfileName,
        resolvedImage,
        resolvedDockerfileFrontend,
        resolvedBuildkitImage,
        platform: this.#options.platform,
        buildxVersion,
        runtimeVersion,
        buildkitProvenanceDigest: sha256Buffer(buildkitProvenance),
        startedOn,
        finishedOn,
      });
      const evidence = parseBuildIntegrityEvidence({
        schemaVersion: "rovaulta.build-integrity/v1",
        buildId: parseRobotBuildId(request.buildId),
        sourceRepository: request.sourceRepository,
        sourceRevision: request.sourceRevision,
        sourceSnapshotDigest: snapshot.sourceSnapshotDigest,
        artifactDigest,
        buildCommand: request.buildCommand,
        lockfileDigest: snapshot.lockfileDigest,
        builder: { id: BUILDER_ID, version: buildxVersion },
        runtime: { name: request.runtime, version: runtimeVersion, image: resolvedImage },
        buildStatus: "BUILD_SUCCEEDED",
        provenance,
      });
      digestBuildIntegrity(evidence);
      succeeded = true;
      return Object.freeze({ evidence, artifactPath: persistentArtifactPath, artifactDigest });
    } catch (error) {
      if (error instanceof BuildRunnerError) throw error;
      throw toolError(error, "SANDBOX_FAILED", "The isolated source build failed");
    } finally {
      if (builderName !== undefined) await this.#removeBuilder(builderName);
      if (!succeeded && persistentArtifactPath !== undefined) {
        await rm(persistentArtifactPath, { force: true }).catch(() => undefined);
      }
      if (temporaryRoot !== undefined) {
        await rm(temporaryRoot, { recursive: true, force: true }).catch(() => undefined);
      }
      this.#activeJobs -= 1;
    }
  }

  async #materializeSnapshot(request: ValidatedSourceBuildRequest): Promise<SnapshotContext> {
    let root: string | undefined;
    try {
      root = await mkdtemp(join(tmpdir(), "rovaulta-build-"));
      const repositoryPath = join(root, "repository");
      const archivePath = join(root, "source.tar");
      const contextPath = join(root, "context");
      await mkdir(contextPath);
      try {
        await runTool(
          this.#options.gitBinary,
          [
            "-c",
            "credential.helper=",
            "-c",
            "core.askPass=",
            "clone",
            "--no-checkout",
            "--filter=blob:none",
            "--depth=1",
            "--no-tags",
            "--quiet",
            request.sourceRepository,
            repositoryPath,
          ],
          { timeoutMs: this.#options.timeoutMs, failureCode: "INVALID_SOURCE" },
        );
        await runTool(
          this.#options.gitBinary,
          [
            "-C",
            repositoryPath,
            "fetch",
            "--filter=blob:none",
            "--depth=1",
            "origin",
            request.sourceRevision,
          ],
          { timeoutMs: this.#options.timeoutMs, failureCode: "INVALID_REVISION" },
        );
        const resolved = await runTool(
          this.#options.gitBinary,
          ["-C", repositoryPath, "rev-parse", "--verify", `${request.sourceRevision}^{commit}`],
          { timeoutMs: this.#options.timeoutMs, failureCode: "INVALID_REVISION" },
        );
        if (stringOutput(resolved.stdout).trim() !== request.sourceRevision) {
          throw new BuildRunnerError("INVALID_REVISION", "Source revision did not resolve exactly");
        }
        const tree = await runTool(
          this.#options.gitBinary,
          ["-C", repositoryPath, "ls-tree", "--full-tree", "-r", "-z", request.sourceRevision],
          { timeoutMs: this.#options.timeoutMs, failureCode: "INVALID_SOURCE", encoding: "buffer" },
        );
        const treeBuffer = Buffer.isBuffer(tree.stdout) ? tree.stdout : Buffer.from(tree.stdout);
        const entries = treeEntries(treeBuffer);
        if (entries.length > this.#options.maxSourceEntries) {
          throw new BuildRunnerError(
            "INVALID_SOURCE",
            "The source snapshot contains too many files",
          );
        }
        assertSafeSourceEntries(entries);
        const files = entries
          .filter((entry) => entry.mode === "100644" || entry.mode === "100755")
          .map((entry) => entry.path);
        const lockfileName = assertLockfileName(request.runtime, files);
        const lockfile = await runTool(
          this.#options.gitBinary,
          ["-C", repositoryPath, "show", `${request.sourceRevision}:${lockfileName}`],
          {
            timeoutMs: this.#options.timeoutMs,
            failureCode: "MISSING_LOCKFILE",
            encoding: "buffer",
          },
        );
        const lockfileBuffer = Buffer.isBuffer(lockfile.stdout)
          ? lockfile.stdout
          : Buffer.from(lockfile.stdout);
        await runTool(
          this.#options.gitBinary,
          [
            "-C",
            repositoryPath,
            "archive",
            "--format=tar",
            "--output",
            archivePath,
            request.sourceRevision,
          ],
          { timeoutMs: this.#options.timeoutMs, failureCode: "INVALID_SOURCE" },
        );
        const archiveStats = await stat(archivePath);
        if (archiveStats.size > this.#options.maxSourceBytes) {
          throw new BuildRunnerError("INVALID_SOURCE", "The source snapshot is too large");
        }
        try {
          await runTool(this.#options.tarBinary, ["-xf", archivePath, "-C", contextPath], {
            timeoutMs: this.#options.timeoutMs,
            failureCode: "INVALID_SOURCE",
          });
          await assertContextSize(contextPath, this.#options.maxSourceBytes);
        } catch (error) {
          if (error instanceof BuildRunnerError) throw error;
          throw toolError(error, "INVALID_SOURCE", "The source snapshot could not be unpacked");
        }
        return Object.freeze({
          root,
          contextPath,
          sourceSnapshotDigest: sha256Buffer(treeBuffer),
          lockfileDigest: sha256Buffer(lockfileBuffer),
          lockfileName,
        });
      } catch (error) {
        if (error instanceof BuildRunnerError) throw error;
        throw toolError(error, "INVALID_SOURCE", "The source snapshot could not be prepared");
      }
    } catch (error) {
      if (root !== undefined)
        await rm(root, { recursive: true, force: true }).catch(() => undefined);
      throw error;
    }
  }

  async #resolveRuntimeImage(image: string): Promise<string> {
    if (/@sha256:[0-9a-f]{64}$/i.test(image)) return image;
    try {
      const result = await runTool(
        this.#options.dockerBinary,
        ["buildx", "imagetools", "inspect", image],
        { timeoutMs: this.#options.timeoutMs, failureCode: "SANDBOX_FAILED" },
      );
      return parseImageDigest(image, stringOutput(result.stdout));
    } catch (error) {
      if (error instanceof BuildRunnerError) throw error;
      throw toolError(error, "SANDBOX_FAILED", "The runtime image could not be resolved");
    }
  }

  async #buildxVersion(): Promise<string> {
    try {
      const result = await runTool(this.#options.dockerBinary, ["buildx", "version"], {
        timeoutMs: 30_000,
        failureCode: "BUILD_RUNNER_UNAVAILABLE",
      });
      const version = stringOutput(result.stdout).trim();
      if (version.length === 0 || version.length > 512) throw new Error();
      return version;
    } catch (error) {
      if (error instanceof BuildRunnerError) throw error;
      throw toolError(error, "BUILD_RUNNER_UNAVAILABLE", "Docker buildx is unavailable");
    }
  }

  async #createBuilder(builderName: string, buildkitImage: string): Promise<void> {
    try {
      await runTool(
        this.#options.dockerBinary,
        [
          "buildx",
          "create",
          "--name",
          builderName,
          "--driver",
          "docker-container",
          "--driver-opt",
          `image=${buildkitImage}`,
          "--bootstrap",
        ],
        { timeoutMs: this.#options.timeoutMs, failureCode: "SANDBOX_FAILED" },
      );
    } catch (error) {
      if (error instanceof BuildRunnerError) throw error;
      throw toolError(error, "SANDBOX_FAILED", "The isolated BuildKit builder could not start");
    }
  }

  async #runBuild(input: {
    readonly builderName: string;
    readonly dockerfilePath: string;
    readonly contextPath: string;
    readonly outputDirectory: string;
    readonly buildMetadataPath: string;
    readonly request: ValidatedSourceBuildRequest;
  }): Promise<void> {
    try {
      await runTool(
        this.#options.dockerBinary,
        [
          "buildx",
          "build",
          "--builder",
          input.builderName,
          "--file",
          input.dockerfilePath,
          "--platform",
          this.#options.platform,
          "--progress",
          "plain",
          "--no-cache",
          "--provenance=mode=max,version=v1",
          "--output",
          `type=local,dest=${input.outputDirectory}`,
          "--metadata-file",
          input.buildMetadataPath,
          "--build-arg",
          `ROVAULTA_BUILD_COMMAND=${input.request.buildCommand}`,
          "--resource",
          `memory=${this.#options.memory}`,
          "--resource",
          `cpu-quota=${this.#options.cpuQuota}`,
          "--resource",
          `cpu-period=${this.#options.cpuPeriod}`,
          input.contextPath,
        ],
        { timeoutMs: this.#options.timeoutMs, failureCode: "SANDBOX_FAILED" },
      );
    } catch (error) {
      if (error instanceof BuildRunnerError) throw error;
      const output = (error as Partial<ToolFailure>).output ?? "";
      if (/bun install --frozen-lockfile|npm ci/i.test(output)) {
        throw new BuildRunnerError(
          "DEPENDENCY_INSTALL_FAILED",
          "Frozen dependency installation failed",
        );
      }
      if (/ROVAULTA_BUILD_COMMAND|build command/i.test(output)) {
        throw new BuildRunnerError("BUILD_COMMAND_FAILED", "The requested build command failed");
      }
      throw toolError(error, "SANDBOX_FAILED", "The isolated BuildKit build failed");
    }
  }

  async #removeBuilder(builderName: string): Promise<void> {
    await runTool(this.#options.dockerBinary, ["buildx", "rm", "--force", builderName], {
      timeoutMs: 60_000,
      failureCode: "SANDBOX_FAILED",
    }).catch(() => undefined);
  }
}

function positiveIntegerEnvironment(
  environment: NodeJS.ProcessEnv,
  name: string,
  fallback: number,
  minimum: number,
  maximum: number,
): number {
  const raw = environment[name]?.trim();
  if (raw === undefined || raw === "") return fallback;
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < minimum || parsed > maximum) {
    throw new Error(`${name} is invalid`);
  }
  return parsed;
}

function environmentValue(environment: NodeJS.ProcessEnv, name: string, fallback: string): string {
  const value = environment[name]?.trim();
  return value === undefined || value === "" ? fallback : value;
}

export function createBuildRunnerFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): BuildRunner {
  const timeoutSeconds = positiveIntegerEnvironment(
    environment,
    "ROVAULTA_BUILD_TIMEOUT_SECONDS",
    900,
    30,
    3_600,
  );
  const memory = environmentValue(environment, "ROVAULTA_BUILD_MEMORY", DEFAULT_MEMORY);
  if (!/^[1-9][0-9]*(?:m|g)$/.test(memory)) throw new Error("ROVAULTA_BUILD_MEMORY is invalid");
  const cpuQuota = environmentValue(environment, "ROVAULTA_BUILD_CPU_QUOTA", DEFAULT_CPU_QUOTA);
  if (!/^[1-9][0-9]*$/.test(cpuQuota)) throw new Error("ROVAULTA_BUILD_CPU_QUOTA is invalid");
  const cpuPeriod = environmentValue(environment, "ROVAULTA_BUILD_CPU_PERIOD", DEFAULT_CPU_PERIOD);
  if (!/^[1-9][0-9]*$/.test(cpuPeriod)) throw new Error("ROVAULTA_BUILD_CPU_PERIOD is invalid");
  const platform = environmentValue(environment, "ROVAULTA_BUILD_PLATFORM", DEFAULT_PLATFORM);
  if (!/^[a-z0-9._/-]+$/.test(platform)) throw new Error("ROVAULTA_BUILD_PLATFORM is invalid");
  const installNetwork = environmentValue(
    environment,
    "ROVAULTA_BUILD_INSTALL_NETWORK",
    DEFAULT_INSTALL_NETWORK,
  );
  if (installNetwork !== "default" && installNetwork !== "none") {
    throw new Error("ROVAULTA_BUILD_INSTALL_NETWORK must be default or none");
  }
  const maxConcurrentBuilds = positiveIntegerEnvironment(
    environment,
    "ROVAULTA_BUILD_MAX_CONCURRENT",
    DEFAULT_MAX_CONCURRENT_BUILDS,
    1,
    8,
  );
  const maxSourceEntries = positiveIntegerEnvironment(
    environment,
    "ROVAULTA_BUILD_MAX_SOURCE_ENTRIES",
    DEFAULT_MAX_SOURCE_ENTRIES,
    100,
    200_000,
  );
  const maxSourceBytes = positiveIntegerEnvironment(
    environment,
    "ROVAULTA_BUILD_MAX_SOURCE_BYTES",
    DEFAULT_MAX_SOURCE_BYTES,
    1 * 1024 * 1024,
    4 * 1024 * 1024 * 1024,
  );
  return new DockerBuildRunner({
    timeoutMs: timeoutSeconds * 1_000,
    memory,
    cpuQuota,
    cpuPeriod,
    platform,
    sourceHosts: parseAllowedSourceHosts(environment.ROVAULTA_BUILD_SOURCE_HOSTS),
    artifactDirectory: resolve(
      process.cwd(),
      environmentValue(
        environment,
        "ROVAULTA_BUILD_ARTIFACT_DIR",
        ".data/rovaulta-build-artifacts",
      ),
    ),
    bunImage: environmentValue(environment, "ROVAULTA_BUILD_BUN_IMAGE", DEFAULT_BUN_IMAGE),
    nodeImage: environmentValue(environment, "ROVAULTA_BUILD_NODE_IMAGE", DEFAULT_NODE_IMAGE),
    dockerfileFrontend: environmentValue(
      environment,
      "ROVAULTA_BUILD_DOCKERFILE_FRONTEND",
      DEFAULT_DOCKERFILE_FRONTEND,
    ),
    buildkitImage: environmentValue(
      environment,
      "ROVAULTA_BUILD_BUILDKIT_IMAGE",
      DEFAULT_BUILDKIT_IMAGE,
    ),
    installNetwork,
    maxConcurrentBuilds,
    maxSourceEntries,
    maxSourceBytes,
  });
}

export { digestBuildIntegrity };
