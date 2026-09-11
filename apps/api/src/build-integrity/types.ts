import type { BuildIntegrityEvidence, Sha256Digest } from "@rovaulta/domain";

export type SourceBuildRuntime = "bun" | "node";

export interface SourceBuildRequest {
  readonly buildId: string;
  readonly sourceRepository: string;
  readonly sourceRevision: string;
  readonly buildCommand: string;
  readonly runtime: SourceBuildRuntime;
}

export interface BuildRunnerResult {
  readonly evidence: BuildIntegrityEvidence;
  readonly artifactPath: string;
  readonly artifactDigest: Sha256Digest;
}

export type BuildRunnerErrorCode =
  | "BUILD_RUNNER_UNAVAILABLE"
  | "INVALID_SOURCE"
  | "INVALID_REVISION"
  | "MISSING_LOCKFILE"
  | "SOURCE_CONTAINS_UNSAFE_FILE"
  | "DEPENDENCY_INSTALL_FAILED"
  | "BUILD_COMMAND_FAILED"
  | "BUILD_TIMEOUT"
  | "SANDBOX_FAILED"
  | "ARTIFACT_COLLECTION_FAILED"
  | "ARTIFACT_DIGEST_FAILED";

export class BuildRunnerError extends Error {
  readonly code: BuildRunnerErrorCode;

  constructor(code: BuildRunnerErrorCode, message: string) {
    super(message);
    this.name = "BuildRunnerError";
    this.code = code;
  }
}

export interface BuildRunner {
  run(input: SourceBuildRequest): Promise<BuildRunnerResult>;
}
