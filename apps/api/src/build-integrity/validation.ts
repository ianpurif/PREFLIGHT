import { BuildRunnerError, type SourceBuildRequest, type SourceBuildRuntime } from "./types.js";

const COMMIT_PATTERN = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/;
const COMMAND_PATTERN = /^(?:bun|node|npm)(?:\s+[A-Za-z0-9_./:@=+-]+)*$/;
const SOURCE_HOSTS_DEFAULT = Object.freeze(["github.com", "gitlab.com"]);

export interface ValidatedSourceBuildRequest extends SourceBuildRequest {
  readonly sourceUrl: URL;
}

function boundedString(value: unknown, label: string, maximum: number): string {
  if (typeof value !== "string")
    throw new BuildRunnerError("INVALID_SOURCE", `${label} is required`);
  const normalized = value.trim();
  if (normalized.length === 0 || normalized.length > maximum) {
    throw new BuildRunnerError("INVALID_SOURCE", `${label} is invalid`);
  }
  return normalized;
}

export function parseAllowedSourceHosts(input: string | undefined): readonly string[] {
  if (input === undefined || input.trim() === "") return SOURCE_HOSTS_DEFAULT;
  const hosts = input
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter((value) => value.length > 0);
  if (hosts.length === 0 || hosts.some((host) => !/^[a-z0-9.-]+$/.test(host))) {
    throw new Error("ROVAULTA_BUILD_SOURCE_HOSTS is invalid");
  }
  return Object.freeze(Array.from(new Set(hosts)));
}

export function validateSourceBuildRequest(
  input: SourceBuildRequest,
  allowedHosts: readonly string[] = SOURCE_HOSTS_DEFAULT,
): ValidatedSourceBuildRequest {
  const buildId = boundedString(input.buildId, "Build id", 128);
  const sourceRepository = boundedString(input.sourceRepository, "Source repository", 2_048);
  let sourceUrl: URL;
  try {
    sourceUrl = new URL(sourceRepository);
  } catch {
    throw new BuildRunnerError("INVALID_SOURCE", "Source repository must be an HTTPS URL");
  }
  if (
    sourceUrl.protocol !== "https:" ||
    sourceUrl.username !== "" ||
    sourceUrl.password !== "" ||
    sourceUrl.search !== "" ||
    sourceUrl.hash !== "" ||
    sourceUrl.hostname === "" ||
    !allowedHosts.includes(sourceUrl.hostname.toLowerCase())
  ) {
    throw new BuildRunnerError("INVALID_SOURCE", "Source repository host is not allowed");
  }
  if (!/^robot-build:[a-f0-9]{32}$/.test(buildId)) {
    throw new BuildRunnerError("INVALID_SOURCE", "Build id is invalid");
  }
  const sourceRevision = boundedString(input.sourceRevision, "Source revision", 64);
  if (!COMMIT_PATTERN.test(sourceRevision)) {
    throw new BuildRunnerError("INVALID_REVISION", "Source revision must be an exact commit SHA");
  }
  if (input.runtime !== "bun" && input.runtime !== "node") {
    throw new BuildRunnerError("INVALID_SOURCE", "Runtime must be bun or node");
  }
  const buildCommand = boundedString(input.buildCommand, "Build command", 200);
  if (!COMMAND_PATTERN.test(buildCommand)) {
    throw new BuildRunnerError("INVALID_SOURCE", "Build command contains unsupported shell syntax");
  }
  const commandRuntime = buildCommand.split(/\s+/, 1)[0];
  if (
    (input.runtime === "bun" && commandRuntime !== "bun") ||
    (input.runtime === "node" && commandRuntime !== "node" && commandRuntime !== "npm")
  ) {
    throw new BuildRunnerError(
      "INVALID_SOURCE",
      "Build command does not match the selected runtime",
    );
  }
  return Object.freeze({
    buildId,
    sourceRepository: sourceUrl.toString().replace(/\/$/, ""),
    sourceRevision,
    buildCommand,
    runtime: input.runtime as SourceBuildRuntime,
    sourceUrl,
  });
}

export function assertLockfileName(runtime: SourceBuildRuntime, files: readonly string[]): string {
  const candidates = runtime === "bun" ? ["bun.lock", "bun.lockb"] : ["package-lock.json"];
  const lockfile = candidates.find((candidate) => files.includes(candidate));
  if (lockfile === undefined) {
    throw new BuildRunnerError(
      "MISSING_LOCKFILE",
      runtime === "bun"
        ? "Bun source builds require bun.lock or bun.lockb"
        : "Node source builds require package-lock.json",
    );
  }
  return lockfile;
}

export function assertSafeSourceEntries(entries: readonly { mode: string; path: string }[]): void {
  for (const entry of entries) {
    if (entry.mode === "120000" || entry.mode === "160000") {
      throw new BuildRunnerError(
        "SOURCE_CONTAINS_UNSAFE_FILE",
        "Source snapshots containing symlinks or submodules are not supported",
      );
    }
    const normalized = entry.path.replaceAll("\\", "/");
    const basename = normalized.slice(normalized.lastIndexOf("/") + 1).toLowerCase();
    if (
      basename === ".env" ||
      (basename.startsWith(".env.") && basename !== ".env.example" && basename !== ".env.test")
    ) {
      throw new BuildRunnerError(
        "SOURCE_CONTAINS_UNSAFE_FILE",
        "Source snapshots containing environment files are not supported",
      );
    }
  }
}
