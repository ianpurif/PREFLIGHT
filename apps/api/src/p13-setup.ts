import { readFileSync } from "node:fs";
import { resolve } from "node:path";

export type JsonRecord = Record<string, unknown>;

export type P13Setup = {
  readonly site: {
    readonly name: string;
    readonly location: string;
    readonly policy: JsonRecord;
  };
  readonly robot: { readonly name: string };
  readonly build: {
    readonly version: string;
    readonly label: string;
    readonly artifactDigest: string;
    readonly route: JsonRecord;
  };
};

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

export function parseP13Setup(value: unknown): P13Setup {
  const input = record(value, "P13 setup");
  const site = record(input.site, "P13 setup.site");
  const robot = record(input.robot, "P13 setup.robot");
  const build = record(input.build, "P13 setup.build");
  return Object.freeze({
    site: Object.freeze({
      name: text(site.name, "P13 setup.site.name"),
      location: text(site.location, "P13 setup.site.location"),
      policy: Object.freeze(record(site.policy, "P13 setup.site.policy")),
    }),
    robot: Object.freeze({ name: text(robot.name, "P13 setup.robot.name") }),
    build: Object.freeze({
      version: text(build.version, "P13 setup.build.version"),
      label: text(build.label, "P13 setup.build.label"),
      artifactDigest: text(build.artifactDigest, "P13 setup.build.artifactDigest"),
      route: Object.freeze(record(build.route, "P13 setup.build.route")),
    }),
  });
}

export function readP13SetupFile(path: string): P13Setup {
  const target = resolve(process.cwd(), path);
  let source: string;
  try {
    source = readFileSync(target, "utf8");
  } catch {
    throw new Error(
      `P13 setup file could not be read at ${path}; run bun run --cwd apps/api p13:setup-template first`,
    );
  }
  if (source.trim().length === 0) {
    throw new Error(
      `P13 setup file at ${path} is empty; run bun run --cwd apps/api p13:setup-template first`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(source) as unknown;
  } catch {
    throw new Error(`P13 setup file at ${path} must contain valid JSON`);
  }
  try {
    return parseP13Setup(parsed);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `P13 setup file at ${path} is invalid: ${error.message}`
        : `P13 setup file at ${path} is invalid`,
    );
  }
}
