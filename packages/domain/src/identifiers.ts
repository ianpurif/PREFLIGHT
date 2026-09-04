import { failProtocol } from "./errors.js";

declare const identifierBrand: unique symbol;

type Identifier<Kind extends string> = string & {
  readonly [identifierBrand]: Kind;
};

export type SiteId = Identifier<"SiteId">;
export type RobotId = Identifier<"RobotId">;
export type RobotBuildId = Identifier<"RobotBuildId">;
export type RobotSoftwareBuildId = RobotBuildId;
export type SafetyEnvelopeId = Identifier<"SafetyEnvelopeId">;
export type EvaluatorVersionId = Identifier<"EvaluatorVersionId">;
export type EvaluationId = Identifier<"EvaluationId">;
export type ClearanceId = Identifier<"ClearanceId">;

const IDENTIFIER_TOKEN = /^[a-z0-9](?:[a-z0-9._-]{0,62}[a-z0-9])?$/;

function parseIdentifier<Kind extends string>(
  input: unknown,
  prefix: string,
  kind: Kind,
): Identifier<Kind> {
  if (typeof input !== "string") {
    return failProtocol("INVALID_IDENTIFIER", `${kind} must be a string`);
  }

  const separatorIndex = input.indexOf(":");
  const actualPrefix = separatorIndex === -1 ? "" : input.slice(0, separatorIndex);
  const token = separatorIndex === -1 ? "" : input.slice(separatorIndex + 1);
  if (actualPrefix !== prefix || !IDENTIFIER_TOKEN.test(token)) {
    return failProtocol(
      "INVALID_IDENTIFIER",
      `${kind} must use the ${prefix}: prefix and a 1-64 character lowercase ASCII token`,
    );
  }

  return input as Identifier<Kind>;
}

export const parseSiteId = (input: unknown): SiteId => parseIdentifier(input, "site", "SiteId");

export const parseRobotId = (input: unknown): RobotId => parseIdentifier(input, "robot", "RobotId");

export const parseRobotBuildId = (input: unknown): RobotBuildId =>
  parseIdentifier(input, "robot-build", "RobotBuildId");

export const parseRobotSoftwareBuildId = parseRobotBuildId;

export const parseSafetyEnvelopeId = (input: unknown): SafetyEnvelopeId =>
  parseIdentifier(input, "safety-envelope", "SafetyEnvelopeId");

export const parseEvaluatorVersionId = (input: unknown): EvaluatorVersionId =>
  parseIdentifier(input, "evaluator-version", "EvaluatorVersionId");

export const parseEvaluationId = (input: unknown): EvaluationId =>
  parseIdentifier(input, "evaluation", "EvaluationId");

export const parseClearanceId = (input: unknown): ClearanceId =>
  parseIdentifier(input, "clearance", "ClearanceId");
