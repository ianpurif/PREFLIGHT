import { readFileSync } from "node:fs";
import {
  parseClearanceRecord,
  parseEvaluationId,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSiteId,
} from "@preflight/domain";
import {
  DeploymentAgentError,
  type DeploymentCatalogEntry,
  type DeploymentTarget,
  type PublicEvaluationStatus,
} from "./types.js";

const REFERENCE_PATTERN = /^[a-z0-9][a-z0-9 .:_/-]{0,79}$/i;
const MAX_PUBLIC_DEPLOYMENT_REQUEST_LENGTH = 256;

function normalizePublicDeploymentRequest(input: unknown): string {
  if (typeof input !== "string") {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", "Deployment request is malformed");
  }
  const normalized = input.trim().replace(/\s+/g, " ").toLowerCase();
  if (
    normalized.length === 0 ||
    normalized.length > MAX_PUBLIC_DEPLOYMENT_REQUEST_LENGTH ||
    /[^\x20-\x7e]/.test(normalized)
  ) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", "Deployment request is malformed");
  }
  return normalized.replace(/[.!]$/, "");
}

function publicRequestForms(entry: DeploymentCatalogEntry): readonly string[] {
  const forms: string[] = [];
  for (const site of entry.aliases.site) {
    for (const robot of entry.aliases.robot) {
      for (const build of entry.aliases.build) {
        forms.push(
          `deploy robot ${robot} using build ${build} to ${site}`,
          `deploy ${build} for ${robot} to ${site}`,
          `deploy ${robot} ${build} to ${site}`,
          `prepare ${robot} ${build} for ${site}`,
          `please prepare ${robot} build ${build} for ${site}`,
        );
      }
    }
  }
  return Object.freeze(forms);
}

function expectExactObject(
  input: unknown,
  keys: readonly string[],
  label: string,
): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} is malformed`);
  }
  const record = input as Record<string, unknown>;
  const allowed = new Set(keys);
  if (
    Object.keys(record).some((key) => !allowed.has(key)) ||
    keys.some((key) => !Object.hasOwn(record, key))
  ) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} is malformed`);
  }
  return record;
}

function parseAliases(input: unknown, label: string): readonly string[] {
  if (!Array.isArray(input) || input.length === 0 || input.length > 12) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} aliases are malformed`);
  }
  const values = input.map((value) => normalizeReference(value, label));
  if (new Set(values).size !== values.length) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} aliases must be unique`);
  }
  return Object.freeze(values);
}

export function normalizeReference(input: unknown, label: string): string {
  if (typeof input !== "string") {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} reference is malformed`);
  }
  const normalized = input.trim().replace(/\s+/g, " ").toLowerCase();
  if (!REFERENCE_PATTERN.test(normalized) || /[^\x20-\x7e]/.test(normalized)) {
    throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", `${label} reference is malformed`);
  }
  return normalized;
}

export function parseDeploymentCatalogEntry(input: unknown): DeploymentCatalogEntry {
  const record = expectExactObject(
    input,
    ["key", "aliases", "target", "evaluation", "clearance"],
    "Deployment catalog entry",
  );
  const key = normalizeReference(record.key, "catalog key");
  const aliases = expectExactObject(record.aliases, ["site", "robot", "build"], "Aliases");
  const targetInput = expectExactObject(
    record.target,
    ["siteId", "robotId", "robotBuildId", "robotBuildDigest"],
    "Target",
  );
  const target: DeploymentTarget = Object.freeze({
    siteId: parseSiteId(targetInput.siteId),
    robotId: parseRobotId(targetInput.robotId),
    robotBuildId: parseRobotBuildId(targetInput.robotBuildId),
    robotBuildDigest: parseRobotBuildDigest(targetInput.robotBuildDigest),
  });
  const evaluationInput = expectExactObject(
    record.evaluation,
    ["evaluationId", "verdict"],
    "Evaluation",
  );
  const evaluation: PublicEvaluationStatus = Object.freeze({
    evaluationId: parseEvaluationId(evaluationInput.evaluationId),
    verdict:
      evaluationInput.verdict === "CLEAR" || evaluationInput.verdict === "HOLD"
        ? evaluationInput.verdict
        : (() => {
            throw new DeploymentAgentError(
              "MALFORMED_AGENT_REQUEST",
              "Evaluation verdict is malformed",
            );
          })(),
  });
  return Object.freeze({
    key,
    aliases: Object.freeze({
      site: parseAliases(aliases.site, "site"),
      robot: parseAliases(aliases.robot, "robot"),
      build: parseAliases(aliases.build, "build"),
    }),
    target,
    evaluation,
    clearance: record.clearance === null ? null : parseClearanceRecord(record.clearance),
  });
}

export class DeploymentCatalog {
  readonly #entries: readonly DeploymentCatalogEntry[];
  readonly #publicRequestForms: ReadonlyMap<string, readonly DeploymentCatalogEntry[]>;

  constructor(entries: readonly unknown[]) {
    if (entries.length === 0 || entries.length > 100) {
      throw new DeploymentAgentError("MALFORMED_AGENT_REQUEST", "Deployment catalog is malformed");
    }
    this.#entries = Object.freeze(entries.map(parseDeploymentCatalogEntry));
    if (new Set(this.#entries.map((entry) => entry.key)).size !== this.#entries.length) {
      throw new DeploymentAgentError(
        "MALFORMED_AGENT_REQUEST",
        "Deployment catalog keys must be unique",
      );
    }
    const requestForms = new Map<string, DeploymentCatalogEntry[]>();
    for (const entry of this.#entries) {
      for (const form of publicRequestForms(entry)) {
        const matchingEntries = requestForms.get(form) ?? [];
        matchingEntries.push(entry);
        requestForms.set(form, matchingEntries);
      }
    }
    this.#publicRequestForms = new Map(
      Array.from(requestForms, ([form, matchingEntries]) => [
        form,
        Object.freeze([...matchingEntries]),
      ]),
    );
  }

  static fromFile(path: string): DeploymentCatalog {
    try {
      const input: unknown = JSON.parse(readFileSync(path, "utf8"));
      if (!Array.isArray(input)) throw new Error();
      return new DeploymentCatalog(input);
    } catch (error) {
      if (error instanceof DeploymentAgentError) throw error;
      throw new DeploymentAgentError(
        "MALFORMED_AGENT_REQUEST",
        "Deployment catalog is unavailable",
      );
    }
  }

  resolve(input: {
    siteRef: unknown;
    robotRef: unknown;
    buildRef: unknown;
  }): DeploymentCatalogEntry {
    const site = normalizeReference(input.siteRef, "site");
    const robot = normalizeReference(input.robotRef, "robot");
    const build = normalizeReference(input.buildRef, "build");
    const matches = this.#entries.filter(
      (entry) =>
        entry.aliases.site.includes(site) &&
        entry.aliases.robot.includes(robot) &&
        entry.aliases.build.includes(build),
    );
    if (matches.length === 0) {
      throw new DeploymentAgentError("TARGET_NOT_FOUND", "No exact deployment target matched");
    }
    if (matches.length !== 1) {
      throw new DeploymentAgentError("TARGET_AMBIGUOUS", "Deployment target is ambiguous");
    }
    const match = matches[0];
    if (match === undefined) throw new DeploymentAgentError("TARGET_NOT_FOUND", "Target missing");
    return match;
  }

  resolvePublicRequest(input: unknown): DeploymentCatalogEntry {
    const normalized = normalizePublicDeploymentRequest(input);
    const matches = this.#publicRequestForms.get(normalized) ?? [];
    if (matches.length === 0) {
      throw new DeploymentAgentError(
        "MALFORMED_AGENT_REQUEST",
        "Deployment request must use an approved public target form",
      );
    }
    const uniqueMatches = new Map(matches.map((entry) => [entry.key, entry]));
    if (uniqueMatches.size !== 1) {
      throw new DeploymentAgentError("TARGET_AMBIGUOUS", "Deployment target is ambiguous");
    }
    const entry = Array.from(uniqueMatches.values())[0];
    if (entry === undefined) throw new DeploymentAgentError("TARGET_NOT_FOUND", "Target missing");
    return entry;
  }

  formatPublicRequest(entry: DeploymentCatalogEntry): string {
    return `Deploy ${entry.aliases.build[0]} for ${entry.aliases.robot[0]} to ${entry.aliases.site[0]}`;
  }
}
