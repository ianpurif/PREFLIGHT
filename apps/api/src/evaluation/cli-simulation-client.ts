import { spawnSync } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import {
  CRE_CONFIDENTIAL_INPUT_VERSION,
  CRE_PUBLIC_ERROR_VERSION,
  CRE_PUBLIC_REQUEST_VERSION,
  CRE_PUBLIC_RESULT_VERSION,
  type CrePublicEvaluationResponse,
  digestBehaviorInput,
  makeEvaluationResultCallback,
  parseConfidentialEvaluationInput,
  parseEvaluationResultCallback,
  parsePublicEvaluationRequest,
  SYNTHETIC_TRACE_PROVENANCE,
  siteSecretId,
} from "@rovaulta/chainlink-cre/protocol";
import {
  assertEvaluationResultBindings,
  canonicalSerialize,
  type EvaluationRequest,
  LEGACY_CONFIDENTIAL_INPUT_ENV_NAME,
  PROTOCOL_VERSION,
  parseEvaluationRequest,
  parseRobotBuildDescriptor,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import {
  parseRobotBehaviorTraceSuite,
  type RobotBehaviorTraceSuite,
} from "@rovaulta/simulation-core";
import {
  type ConfidentialEvaluationInput,
  type ConfidentialEvaluationReport,
  CreEvaluationError,
} from "./cre-client.js";

function repositoryRoot(): string {
  const candidates: string[] = [];
  for (const start of [import.meta.dir, process.cwd()]) {
    let candidate = resolve(start);
    for (let depth = 0; depth < 10; depth += 1) {
      candidates.push(candidate);
      const parent = resolve(candidate, "..");
      if (parent === candidate) break;
      candidate = parent;
    }
  }
  const root = candidates.find((candidate) =>
    existsSync(join(candidate, "integrations/chainlink-cre/workflow.yaml")),
  );
  if (root === undefined) throw new Error("Rovaulta repository root could not be located");
  return root;
}

const REPOSITORY_ROOT = repositoryRoot();
const DEFAULT_WORKFLOW_PATH = "integrations/chainlink-cre";
const DEFAULT_TARGET = "staging-settings";
const DEFAULT_TRIGGER_INDEX = "0";
const MAX_OUTPUT_BYTES = 256 * 1024;
const MAX_FAILURE_DIAGNOSTIC_BYTES = 8 * 1024;
const SAFE_VERSION = /\bv?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\b/;
const TARGET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const ANSI_ESCAPE_PATTERN = new RegExp(`${String.fromCharCode(27)}\\[[0-?]*[ -/]*[@-~]`, "gu");
const CONFIDENTIAL_OUTPUT_MARKERS = Object.freeze([
  "confidentialEnvelope",
  "envelopeBlindingSecret",
  "envelopeBlindingSecretHex",
  "warehouseBounds",
  "minXmm",
  "minYmm",
  "maxXmm",
  "maxYmm",
  '"zones"',
  '"rules"',
  '"bounds"',
  "scenarioGeneration",
  "maximumMmPerSecond",
  "payloadGreaterThanGrams",
  "restricted-zone",
  "zone-speed-limit",
  "payload-zone-restriction",
]);

type JsonRecord = { readonly [key: string]: unknown };

export interface CliProcessResult {
  readonly status: number | null;
  readonly stdout: string;
  readonly stderr: string;
  readonly error?: unknown;
}

export type CliProcessRunner = (
  executable: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
) => CliProcessResult;

function defaultCliProcessRunner(
  executable: string,
  args: readonly string[],
  options: { readonly cwd: string; readonly env: NodeJS.ProcessEnv },
): CliProcessResult {
  const result = spawnSync(executable, [...args], {
    cwd: options.cwd,
    env: options.env,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  return {
    status: result.status,
    stdout: typeof result.stdout === "string" ? result.stdout : "",
    stderr: typeof result.stderr === "string" ? result.stderr : "",
    ...(result.error === undefined ? {} : { error: result.error }),
  };
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function publicPayload(input: ConfidentialEvaluationInput) {
  let request: EvaluationRequest;
  let robotBuild: ReturnType<typeof parseRobotBuildDescriptor>;
  let behaviorTraces: RobotBehaviorTraceSuite;
  let evaluatedAt: ReturnType<typeof parseUnixTimestamp>;
  try {
    request = parseEvaluationRequest(input.request);
    robotBuild = parseRobotBuildDescriptor(input.robotBuild);
    behaviorTraces = parseRobotBehaviorTraceSuite(input.behaviorTraces);
    evaluatedAt = parseUnixTimestamp(input.evaluatedAt, "evaluatedAt");
  } catch {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation input is malformed");
  }
  if (robotBuild.robotBuildId !== request.inputs.robotBuildId) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation build binding is invalid");
  }
  if (behaviorTraces.robotId !== request.inputs.robotId) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation trace binding is invalid");
  }
  if (
    behaviorTraces.robotBuildId !== request.inputs.robotBuildId ||
    behaviorTraces.robotBuildDigest !== request.inputs.robotBuildDigest
  ) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation trace binding is invalid");
  }
  const payload = {
    schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialInputSecretId: siteSecretId(request.inputs.siteId),
    request,
    robotBuild,
    behaviorTraces,
    traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
    evaluatedAt,
  } as const;
  try {
    return parsePublicEvaluationRequest(
      {
        ...payload,
        behaviorInputDigest: digestBehaviorInput(payload),
      },
      { requireSiteSecretSelector: true },
    );
  } catch {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation input binding is invalid");
  }
}

function confidentialSecret(input: ConfidentialEvaluationInput): string {
  if (!(input.envelopeBlindingSecret instanceof Uint8Array)) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation blind is malformed");
  }
  let secret: string;
  try {
    secret = canonicalSerialize({
      schemaVersion: CRE_CONFIDENTIAL_INPUT_VERSION,
      protocolVersion: PROTOCOL_VERSION,
      confidentialEnvelope: input.confidentialEnvelope,
      envelopeBlindingSecretHex: bytesToHex(input.envelopeBlindingSecret),
    });
  } catch {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation secret is malformed");
  }
  try {
    parseConfidentialEvaluationInput(secret);
  } catch {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation secret is malformed");
  }
  return secret;
}

function balancedJsonValues(output: string): readonly unknown[] {
  const values: unknown[] = [];
  for (let start = 0; start < output.length; start += 1) {
    if (output[start] !== "{") continue;
    let depth = 0;
    let inString = false;
    let escaped = false;
    for (let end = start; end < output.length; end += 1) {
      const character = output[end];
      if (inString) {
        if (escaped) escaped = false;
        else if (character === "\\") escaped = true;
        else if (character === '"') inString = false;
        continue;
      }
      if (character === '"') {
        inString = true;
        continue;
      }
      if (character === "{") depth += 1;
      if (character === "}") depth -= 1;
      if (depth !== 0) continue;
      try {
        values.push(JSON.parse(output.slice(start, end + 1)) as unknown);
      } catch {
        // CLI logs may contain non-JSON braces; continue scanning.
      }
      break;
    }
  }
  return values;
}

function findPublicResponse(value: unknown, depth = 0): CrePublicEvaluationResponse | undefined {
  if (depth > 8 || value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findPublicResponse(item, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as JsonRecord;
  if (
    record.status === "EVALUATED" &&
    record.schemaVersion === CRE_PUBLIC_RESULT_VERSION &&
    Object.hasOwn(record, "result")
  ) {
    return record as unknown as CrePublicEvaluationResponse;
  }
  if (
    record.status === "REJECT" &&
    record.schemaVersion === CRE_PUBLIC_ERROR_VERSION &&
    typeof record.code === "string"
  ) {
    return record as unknown as CrePublicEvaluationResponse;
  }
  for (const child of Object.values(record)) {
    const found = findPublicResponse(child, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function extractPublicResponse(output: string): CrePublicEvaluationResponse {
  for (const value of balancedJsonValues(output)) {
    const response = findPublicResponse(value);
    if (response !== undefined) return response;
  }
  throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation returned no public result");
}

function leafMarkers(value: unknown, markers: Set<string>): void {
  if (typeof value === "string") {
    if (value.length > 0) markers.add(value);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const child of Array.isArray(value) ? value : Object.values(value as JsonRecord)) {
    leafMarkers(child, markers);
  }
}

function assertNoConfidentialOutput(output: string, secret: string, envelope: unknown): void {
  const markers = new Set([...CONFIDENTIAL_OUTPUT_MARKERS, secret]);
  if (envelope !== null && typeof envelope === "object" && !Array.isArray(envelope)) {
    const record = envelope as JsonRecord;
    for (const field of ["warehouseBounds", "zones", "rules", "scenarioGeneration"]) {
      leafMarkers(record[field], markers);
    }
  }
  const blind = (() => {
    try {
      const parsed = JSON.parse(secret) as JsonRecord;
      return typeof parsed.envelopeBlindingSecretHex === "string"
        ? parsed.envelopeBlindingSecretHex
        : undefined;
    } catch {
      return undefined;
    }
  })();
  if (blind !== undefined) markers.add(blind);
  if ([...markers].some((marker) => marker.length > 0 && output.includes(marker))) {
    throw new CreEvaluationError(
      "CRE_RESPONSE_INVALID",
      "CRE simulation output contained confidential data",
    );
  }
}

function redactCliDiagnostic(
  value: unknown,
  secret: string,
  environment: NodeJS.ProcessEnv,
): string {
  let diagnostic = value instanceof Error ? value.message : String(value ?? "");
  diagnostic = diagnostic.replace(ANSI_ESCAPE_PATTERN, "").replace(/\r\n?/gu, "\n");
  for (const sensitiveValue of [secret, environment.CRE_API_KEY].filter(
    (candidate): candidate is string => candidate !== undefined && candidate.length > 0,
  )) {
    diagnostic = diagnostic.split(sensitiveValue).join("[REDACTED]");
  }
  diagnostic = diagnostic
    .replace(/(Bearer\s+)[^\s\r\n]+/giu, "$1[REDACTED]")
    .replace(/((?:api[-_ ]?key|authorization)\s*[:=]\s*)[^\s,\r\n]+/giu, "$1[REDACTED]")
    .replace(
      /(\b(?:[A-Z][A-Z0-9]*_)?CONFIDENTIAL_EVALUATION_INPUT_JSON\s*=\s*)[^\s\r\n]+/gu,
      "$1[REDACTED]",
    )
    .trim();
  const encodedLength = new TextEncoder().encode(diagnostic).byteLength;
  if (encodedLength <= MAX_FAILURE_DIAGNOSTIC_BYTES) return diagnostic;
  const suffix = "\n[diagnostic truncated]";
  const encoder = new TextEncoder();
  const availableBytes = MAX_FAILURE_DIAGNOSTIC_BYTES - encoder.encode(suffix).byteLength;
  let output = "";
  let outputBytes = 0;
  for (const character of diagnostic) {
    const characterBytes = encoder.encode(character).byteLength;
    if (outputBytes + characterBytes > availableBytes) break;
    output += character;
    outputBytes += characterBytes;
  }
  return `${output}${suffix}`;
}

function simulationFailureMessage(
  executable: string,
  args: readonly string[],
  run: CliProcessResult,
  options: {
    readonly cwd: string;
    readonly workflowRoot: string;
    readonly sourceWorkflowPath: string;
    readonly target: string;
    readonly triggerIndex: string;
    readonly secret: string;
    readonly environment: NodeJS.ProcessEnv;
  },
): string {
  const safeArgs = args.map((argument, index) =>
    args[index - 1] === "-e" ? "[temporary env file]" : argument,
  );
  const command = [executable, ...safeArgs].join(" ");
  const exitCode = run.error === undefined ? String(run.status) : "process-start";
  const details = [
    `command: ${command}`,
    `cwd: ${options.cwd}`,
    `workflow root: ${options.workflowRoot}`,
    `workflow source: ${options.sourceWorkflowPath}`,
    `target: ${options.target}`,
    `trigger index: ${options.triggerIndex}`,
    `exit code: ${exitCode}`,
    run.stdout.length === 0
      ? undefined
      : `stdout:\n${redactCliDiagnostic(run.stdout, options.secret, options.environment)}`,
    run.stderr.length === 0
      ? undefined
      : `stderr:\n${redactCliDiagnostic(run.stderr, options.secret, options.environment)}`,
    run.error === undefined
      ? undefined
      : `process error: ${redactCliDiagnostic(run.error, options.secret, options.environment)}`,
  ].filter((detail): detail is string => detail !== undefined);
  return `The official CRE simulation failed\n${details.join("\n")}`;
}

function cliVersion(output: string): string {
  const match = output.match(SAFE_VERSION);
  if (match === null) {
    throw new CreEvaluationError(
      "CRE_UNAVAILABLE",
      "The CRE CLI did not report a semantic version",
    );
  }
  return match[0].replace(/^v/u, "");
}

function safeCliEnvironment(environment: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  const allowed = new Set([
    "PATH",
    "Path",
    "HOME",
    "USERPROFILE",
    "APPDATA",
    "LOCALAPPDATA",
    "XDG_CONFIG_HOME",
    "XDG_CACHE_HOME",
    "XDG_DATA_HOME",
    "SystemRoot",
    "ComSpec",
    "TEMP",
    "TMP",
    "SHELL",
    "TERM",
    "LANG",
    "CI",
    "NO_COLOR",
    // Official CRE non-interactive authentication; never log or persist this value.
    "CRE_API_KEY",
    "ROVAULTA_CRE_TARGET",
    "CHAINLINK_CRE_TARGET",
    "ROVAULTA_CRE_CLI",
  ]);
  return Object.fromEntries(Object.entries(environment).filter(([name]) => allowed.has(name)));
}

function relativePath(path: string): string {
  const value = relative(REPOSITORY_ROOT, path).replaceAll("\\", "/");
  if (value === ".." || value.startsWith("../")) return path;
  return value.startsWith(".") ? value : `./${value}`;
}

function workflowPathValue(path: string): string {
  return path.replaceAll("\\", "/");
}

function createTemporaryWorkflow(
  workflowRoot: string,
  target: string,
  sourceWorkflowPath: string,
  secretSelector: string,
): void {
  if (!TARGET_PATTERN.test(target)) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE simulation target is malformed");
  }
  const sourceDirectory = resolve(REPOSITORY_ROOT, sourceWorkflowPath);
  const sourceEntry = resolve(sourceDirectory, "src/main.ts");
  const sourceConfig = resolve(sourceDirectory, "config.staging.json");
  // CRE resolves workflow artifacts relative to the directory containing workflow.yaml, not the
  // repository root passed with -R. Keep the existing source/config files authoritative while
  // making their paths valid from this short-lived workflow directory.
  const relativeEntry = workflowPathValue(relative(workflowRoot, sourceEntry));
  const relativeConfig = workflowPathValue(relative(workflowRoot, sourceConfig));
  writeFileSync(
    join(workflowRoot, "workflow.yaml"),
    [
      `${target}:`,
      "  user-workflow:",
      '    workflow-name: "rovaulta-confidential-evaluation-account-simulation"',
      "  workflow-artifacts:",
      `    workflow-path: ${JSON.stringify(relativeEntry)}`,
      `    config-path: ${JSON.stringify(relativeConfig)}`,
      '    secrets-path: "./secrets.yaml"',
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
  writeFileSync(
    join(workflowRoot, "secrets.yaml"),
    [
      "secretsNames:",
      `  ${JSON.stringify(secretSelector)}:`,
      "    - ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON",
      "",
    ].join("\n"),
    { encoding: "utf8", mode: 0o600, flag: "wx" },
  );
}

export class CreCliSimulationEvaluationClient {
  readonly #cli: string;
  readonly #target: string;
  readonly #workflowPath: string;
  readonly #triggerIndex: string;
  readonly #environment: NodeJS.ProcessEnv;
  readonly #run: CliProcessRunner;

  constructor(
    options: {
      readonly cli?: string;
      readonly target?: string;
      readonly workflowPath?: string;
      readonly triggerIndex?: string;
      readonly environment?: NodeJS.ProcessEnv;
      readonly run?: CliProcessRunner;
    } = {},
  ) {
    this.#cli = options.cli?.trim() || (process.platform === "win32" ? "cre.exe" : "cre");
    this.#target = options.target?.trim() || DEFAULT_TARGET;
    this.#workflowPath = options.workflowPath?.trim() || DEFAULT_WORKFLOW_PATH;
    this.#triggerIndex = options.triggerIndex?.trim() || DEFAULT_TRIGGER_INDEX;
    this.#environment = safeCliEnvironment(options.environment ?? process.env);
    this.#run = options.run ?? defaultCliProcessRunner;
  }

  async evaluate(input: ConfidentialEvaluationInput): Promise<ConfidentialEvaluationReport> {
    const request = publicPayload(input);
    const secret = confidentialSecret(input);
    const dataRoot = join(REPOSITORY_ROOT, ".data");
    mkdirSync(dataRoot, { recursive: true });
    const confidentialRoot = mkdtempSync(join(dataRoot, "rovaulta-account-cre-simulation-"));
    const payloadPath = join(confidentialRoot, "public.json");
    const environmentPath = join(confidentialRoot, ".env.cre-account.local");
    try {
      writeFileSync(payloadPath, `${JSON.stringify(request, null, 2)}\n`, {
        encoding: "utf8",
        mode: 0o600,
      });
      const serializedSecret = JSON.stringify(secret);
      writeFileSync(
        environmentPath,
        `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON=${serializedSecret}\n${LEGACY_CONFIDENTIAL_INPUT_ENV_NAME}=${serializedSecret}\n`,
        { encoding: "utf8", mode: 0o600 },
      );
      const secretSelector = request.confidentialInputSecretId;
      if (secretSelector === undefined) {
        throw new CreEvaluationError(
          "CRE_RESPONSE_INVALID",
          "CRE simulation site secret selector is missing",
        );
      }
      createTemporaryWorkflow(confidentialRoot, this.#target, this.#workflowPath, secretSelector);

      const versionRun = this.#run(this.#cli, ["-v"], {
        cwd: REPOSITORY_ROOT,
        env: this.#environment,
      });
      if (versionRun.error !== undefined || versionRun.status !== 0) {
        throw new CreEvaluationError(
          "CRE_UNAVAILABLE",
          "The official CRE CLI could not be started",
        );
      }
      const version = cliVersion(`${versionRun.stdout}\n${versionRun.stderr}`);
      const authRun = this.#run(this.#cli, ["whoami"], {
        cwd: REPOSITORY_ROOT,
        env: this.#environment,
      });
      if (authRun.error !== undefined || authRun.status !== 0) {
        throw new CreEvaluationError(
          "CRE_UNAVAILABLE",
          "The official CRE CLI is not authenticated",
        );
      }
      const args = [
        "-R",
        ".",
        "-T",
        this.#target,
        "-e",
        relativePath(environmentPath),
        "--non-interactive",
        "workflow",
        "simulate",
        relativePath(confidentialRoot),
        "--trigger-index",
        this.#triggerIndex,
        "--http-payload",
        relativePath(payloadPath),
      ] as const;
      const run = this.#run(this.#cli, args, {
        cwd: REPOSITORY_ROOT,
        env: this.#environment,
      });
      const output = `${run.stdout}\n${run.stderr}`;
      assertNoConfidentialOutput(output, secret, input.confidentialEnvelope);
      if (run.error !== undefined || run.status !== 0) {
        throw new CreEvaluationError(
          "CRE_RESPONSE_INVALID",
          simulationFailureMessage(this.#cli, args, run, {
            cwd: REPOSITORY_ROOT,
            workflowRoot: relativePath(confidentialRoot),
            sourceWorkflowPath: this.#workflowPath,
            target: this.#target,
            triggerIndex: this.#triggerIndex,
            secret,
            environment: this.#environment,
          }),
        );
      }
      if (new TextEncoder().encode(output).byteLength > MAX_OUTPUT_BYTES) {
        throw new CreEvaluationError(
          "CRE_RESPONSE_INVALID",
          "The CRE simulation output was too large",
        );
      }
      const response = extractPublicResponse(output);
      let callback: ReturnType<typeof parseEvaluationResultCallback>;
      try {
        callback = parseEvaluationResultCallback(
          makeEvaluationResultCallback(request.request.evaluationId, response),
        );
      } catch {
        throw new CreEvaluationError(
          "CRE_RESPONSE_INVALID",
          "The CRE simulation result was malformed",
        );
      }
      if (callback.response.status === "REJECT") {
        throw new CreEvaluationError(
          "CRE_REQUEST_REJECTED",
          "The CRE simulation rejected the evaluation",
        );
      }
      if (callback.response.behaviorInputDigest !== request.behaviorInputDigest) {
        throw new CreEvaluationError(
          "CRE_RESPONSE_INVALID",
          "The CRE simulation behavior binding changed",
        );
      }
      const result = assertEvaluationResultBindings(callback.response.result, request.request);
      return Object.freeze({
        result,
        executionMode: "official-cre-cli-simulation" as const,
        creCliVersion: version,
      });
    } finally {
      rmSync(confidentialRoot, { recursive: true, force: true });
    }
  }
}

export function createCreCliSimulationEvaluationClientFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): CreCliSimulationEvaluationClient {
  const cli = environment.ROVAULTA_CRE_CLI?.trim();
  const target = (environment.ROVAULTA_CRE_TARGET ?? environment.CHAINLINK_CRE_TARGET)?.trim();
  return new CreCliSimulationEvaluationClient({
    ...(cli === undefined || cli.length === 0 ? {} : { cli }),
    ...(target === undefined || target.length === 0 ? {} : { target }),
    environment,
  });
}
