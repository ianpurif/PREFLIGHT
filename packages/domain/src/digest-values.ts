import { failProtocol } from "./errors";

declare const sha256DigestBrand: unique symbol;
declare const protocolDigestBrand: unique symbol;

export type Sha256Digest = `sha256:${string}` & {
  readonly [sha256DigestBrand]: "Sha256Digest";
};

type ProtocolDigest<Kind extends string> = Sha256Digest & {
  readonly [protocolDigestBrand]: Kind;
};

export type RobotBuildDigest = ProtocolDigest<"RobotBuildDigest">;
export type BuildIntegrityDigest = ProtocolDigest<"BuildIntegrityDigest">;
export type SafetyEnvelopeCommitment = ProtocolDigest<"SafetyEnvelopeCommitment">;
export type EvaluationInputsDigest = ProtocolDigest<"EvaluationInputsDigest">;
export type ClearanceDigest = ProtocolDigest<"ClearanceDigest">;
export type DeploymentIntentDigest = ProtocolDigest<"DeploymentIntentDigest">;

const SHA256_DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function parseSha256Digest(input: unknown, path = "digest"): Sha256Digest {
  if (typeof input !== "string" || !SHA256_DIGEST_PATTERN.test(input)) {
    return failProtocol(
      "MALFORMED_OBJECT",
      "SHA-256 digests must use sha256: followed by 64 lowercase hexadecimal characters",
      path,
    );
  }
  return input as Sha256Digest;
}

function parseProtocolDigest<Kind extends string>(
  input: unknown,
  path: string,
): ProtocolDigest<Kind> {
  return parseSha256Digest(input, path) as ProtocolDigest<Kind>;
}

export const parseRobotBuildDigest = (input: unknown, path = "robotBuildDigest") =>
  parseProtocolDigest<"RobotBuildDigest">(input, path);

export const parseBuildIntegrityDigest = (input: unknown, path = "buildIntegrityDigest") =>
  parseProtocolDigest<"BuildIntegrityDigest">(input, path);

export const parseSafetyEnvelopeCommitment = (input: unknown, path = "safetyEnvelopeCommitment") =>
  parseProtocolDigest<"SafetyEnvelopeCommitment">(input, path);

export const parseEvaluationInputsDigest = (input: unknown, path = "evaluationInputsDigest") =>
  parseProtocolDigest<"EvaluationInputsDigest">(input, path);

export const parseClearanceDigest = (input: unknown, path = "clearanceDigest") =>
  parseProtocolDigest<"ClearanceDigest">(input, path);

export const parseDeploymentIntentDigest = (input: unknown, path = "deploymentIntentDigest") =>
  parseProtocolDigest<"DeploymentIntentDigest">(input, path);
