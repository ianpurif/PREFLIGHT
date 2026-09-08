import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { relative, resolve } from "node:path";
import {
  CRE_PUBLIC_ERROR_VERSION,
  CRE_PUBLIC_RESULT_VERSION,
  type CrePublicEvaluationResponse,
  makeEvaluationResultCallback,
  parseEvaluationResultCallback,
  parsePublicEvaluationRequest,
} from "@rovaulta/chainlink-cre/protocol";
import { assertEvaluationResultBindings, parseEvaluationRequest } from "@rovaulta/domain";
import {
  createSimulationFixtureFiles,
  type SimulationFixtureFiles,
} from "../../../integrations/chainlink-cre/scripts/simulation-fixtures.js";

const REPOSITORY_ROOT = resolve(import.meta.dir, "../../..");
const WORKFLOW_PATH = "integrations/chainlink-cre";
const TARGET = "staging-settings";
const TRIGGER_INDEX = "0";
const ANSI_ESCAPE_CHARACTER = String.fromCharCode(27);
const MAX_DIAGNOSTIC_TEXT_LENGTH = 32 * 1024;
const SAFE_EXECUTION_ID = /^[A-Za-z0-9._:-]{1,256}$/;
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

interface CliRun {
  readonly stdout: string;
  readonly stderr: string;
  readonly output: string;
  readonly exitCode: number;
}

class WorkflowSimulationError extends Error {
  readonly details: Readonly<Record<string, unknown>>;

  constructor(
    definition: SimulationCaseDefinition,
    args: readonly string[],
    run: CliRun,
    files: SimulationFixtureFiles,
  ) {
    super(`CRE ${definition.name} simulation failed with exit code ${run.exitCode}`);
    const markers = confidentialMarkers(files[definition.environmentPath]);
    this.details = Object.freeze({
      status: "BLOCKED",
      error: this.message,
      command: redactCliText([cliExecutable(), ...args].map(quote).join(" "), markers),
      exitCode: run.exitCode,
      stdout: redactCliText(run.stdout, markers),
      stderr: redactCliText(run.stderr, markers),
      workingDirectory: REPOSITORY_ROOT,
      workflowPath: WORKFLOW_PATH,
      target: TARGET,
      triggerIndex: Number(TRIGGER_INDEX),
    });
  }
}

interface SimulationCaseDefinition {
  readonly name: "unsafe" | "corrected" | "tampered";
  readonly payloadPath: keyof Pick<
    SimulationFixtureFiles,
    "unsafePayloadPath" | "correctedPayloadPath"
  >;
  readonly environmentPath: keyof Pick<
    SimulationFixtureFiles,
    "validEnvironmentPath" | "tamperedEnvironmentPath"
  >;
  readonly expected: "HOLD" | "CLEAR" | "REJECT";
}

const CASES: readonly SimulationCaseDefinition[] = [
  {
    name: "unsafe",
    payloadPath: "unsafePayloadPath",
    environmentPath: "validEnvironmentPath",
    expected: "HOLD",
  },
  {
    name: "corrected",
    payloadPath: "correctedPayloadPath",
    environmentPath: "validEnvironmentPath",
    expected: "CLEAR",
  },
  {
    name: "tampered",
    payloadPath: "unsafePayloadPath",
    environmentPath: "tamperedEnvironmentPath",
    expected: "REJECT",
  },
];

function cliExecutable(): string {
  return process.env.ROVAULTA_CRE_CLI?.trim() || (process.platform === "win32" ? "cre.exe" : "cre");
}

function relativeCliPath(path: string): string {
  const value = relative(REPOSITORY_ROOT, path).replaceAll("\\", "/");
  if (value === ".." || value.startsWith("../")) return path;
  return value.startsWith(".") ? value : `./${value}`;
}

function quote(value: string): string {
  return /[\s]/.test(value) ? `"${value.replaceAll('"', '\\"')}"` : value;
}

function runCli(args: readonly string[]): CliRun {
  const result = spawnSync(cliExecutable(), [...args], {
    cwd: REPOSITORY_ROOT,
    env: process.env,
    encoding: "utf8",
    windowsHide: true,
    stdio: ["ignore", "pipe", "pipe"],
  });
  if (result.error !== undefined) {
    throw new Error(
      "the official CRE CLI could not be started; install it and authenticate with cre login",
    );
  }
  const stdout = typeof result.stdout === "string" ? result.stdout : "";
  const stderr = typeof result.stderr === "string" ? result.stderr : "";
  return Object.freeze({
    stdout: stdout.replaceAll(ANSI_ESCAPE_CHARACTER, ""),
    stderr: stderr.replaceAll(ANSI_ESCAPE_CHARACTER, ""),
    output: `${stdout}\n${stderr}`.replaceAll(ANSI_ESCAPE_CHARACTER, ""),
    exitCode: result.status ?? 1,
  });
}

function versionFromOutput(output: string): string {
  const match = output.match(/\bv?\d+\.\d+\.\d+(?:[-+][A-Za-z0-9.-]+)?\b/);
  if (match === null) throw new Error("the CRE CLI did not report a semantic version");
  return match[0].replace(/^v/, "");
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
        // Continue scanning later JSON boundaries; CLI logs may contain braces in text.
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

export function extractPublicResponse(output: string): CrePublicEvaluationResponse {
  for (const value of balancedJsonValues(output)) {
    const response = findPublicResponse(value);
    if (response !== undefined) return response;
  }
  throw new Error("the CRE CLI output did not contain a public evaluation result");
}

function findStringField(value: unknown, names: readonly string[], depth = 0): string | undefined {
  if (depth > 8 || value === null || typeof value !== "object") return undefined;
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findStringField(item, names, depth + 1);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  const record = value as JsonRecord;
  for (const name of names) {
    const candidate = record[name];
    if (typeof candidate === "string" && candidate.length > 0) return candidate;
  }
  for (const child of Object.values(record)) {
    const found = findStringField(child, names, depth + 1);
    if (found !== undefined) return found;
  }
  return undefined;
}

function labeledHash(output: string, label: string): string | null {
  const match = output.match(new RegExp(`${label}[^a-f0-9]{0,32}([a-f0-9]{64})`, "i"));
  return match?.[1] ?? null;
}

function executionId(output: string, jsonValues: readonly unknown[]): string | null {
  const textual = output.match(
    /workflow execution (?:id|identifier)\s*[:=]\s*([A-Za-z0-9._:-]{1,256})/i,
  );
  const candidate =
    textual?.[1] ??
    findStringField(jsonValues, ["workflow_execution_id", "workflowExecutionId", "executionId"]);
  if (candidate === undefined) return null;
  if (!SAFE_EXECUTION_ID.test(candidate)) {
    throw new Error("the CRE workflow execution identifier was malformed");
  }
  return candidate;
}

function confidentialSecretValue(environmentPath: string): string {
  const environment = readFileSync(environmentPath, "utf8").trim();
  const line = environment
    .split(/\r?\n/)
    .find((candidate) => candidate.startsWith("ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON="));
  if (line === undefined) {
    throw new Error("the generated CRE confidential environment file was malformed");
  }
  const rawValue = line.slice("ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON=".length);
  if (rawValue.startsWith("'") && rawValue.endsWith("'")) {
    return rawValue.slice(1, -1);
  }
  try {
    const parsed = JSON.parse(rawValue) as unknown;
    if (typeof parsed === "string") return parsed;
  } catch {
    // Fall through to the redacted malformed-file error below.
  }
  throw new Error("the generated CRE confidential environment file was malformed");
}

function confidentialMarkers(environmentPath: string): readonly string[] {
  const serializedSecret = confidentialSecretValue(environmentPath);
  let confidentialInput: unknown;
  try {
    confidentialInput = JSON.parse(serializedSecret) as unknown;
  } catch {
    throw new Error("the generated CRE confidential environment was not valid JSON");
  }
  const markers = new Set<string>([...CONFIDENTIAL_OUTPUT_MARKERS, serializedSecret]);
  if (confidentialInput !== null && typeof confidentialInput === "object") {
    const inputRecord = confidentialInput as JsonRecord;
    const blind = inputRecord.envelopeBlindingSecretHex;
    if (typeof blind === "string" && blind.length > 0) markers.add(blind);

    const envelope = inputRecord.confidentialEnvelope;
    if (envelope !== null && typeof envelope === "object") {
      for (const privateField of ["warehouseBounds", "zones", "rules", "scenarioGeneration"]) {
        addStringLeafMarkers((envelope as JsonRecord)[privateField], markers);
      }
    }
  }
  return [...markers];
}

function addStringLeafMarkers(value: unknown, markers: Set<string>): void {
  if (typeof value === "string") {
    if (value.length > 0) markers.add(value);
    return;
  }
  if (value === null || typeof value !== "object") return;
  for (const child of Array.isArray(value) ? value : Object.values(value as JsonRecord)) {
    addStringLeafMarkers(child, markers);
  }
}

function redactCliText(text: string, markers: readonly string[]): string {
  const redacted = text
    .split(/\r?\n/)
    .map((line) =>
      markers.some((marker) => marker.length > 0 && line.includes(marker))
        ? "[REDACTED confidential CLI output]"
        : line,
    )
    .join("\n");
  if (redacted.length <= MAX_DIAGNOSTIC_TEXT_LENGTH) return redacted;
  return `${redacted.slice(0, MAX_DIAGNOSTIC_TEXT_LENGTH)}\n[diagnostic output truncated]`;
}

function assertNoConfidentialOutput(
  output: string,
  environmentPath: string,
  secretValue: string,
): void {
  const markers = [...confidentialMarkers(environmentPath), secretValue];
  if (markers.some((marker) => output.includes(marker))) {
    throw new Error("the CRE CLI output contained confidential input markers");
  }
}

function publicBinding(request: ReturnType<typeof parsePublicEvaluationRequest>) {
  return {
    evaluationId: request.request.evaluationId,
    siteId: request.request.inputs.siteId,
    robotId: request.request.inputs.robotId,
    robotBuildId: request.request.inputs.robotBuildId,
    robotBuildDigest: request.request.inputs.robotBuildDigest,
    safetyEnvelopeId: request.request.inputs.safetyEnvelopeId,
    safetyEnvelopeCommitment: request.request.inputs.safetyEnvelopeCommitment,
    evaluatorVersion: request.request.inputs.evaluatorVersion,
    behaviorInputDigest: request.behaviorInputDigest,
    traceProvenance: request.traceProvenance,
  } as const;
}

function validatePublicResponse(
  response: CrePublicEvaluationResponse,
  request: ReturnType<typeof parsePublicEvaluationRequest>,
  expected: SimulationCaseDefinition["expected"],
) {
  const callback = parseEvaluationResultCallback(
    makeEvaluationResultCallback(request.request.evaluationId, response),
  );
  if (callback.response.status === "REJECT") {
    if (expected !== "REJECT") throw new Error("CRE returned rejection for an evaluation case");
    return Object.freeze({
      status: "REJECT" as const,
      code: callback.response.code,
      applicationProjection: "REJECT" as const,
    });
  }
  if (expected === "REJECT") throw new Error("tampered CRE input unexpectedly evaluated");
  if (callback.response.behaviorInputDigest !== request.behaviorInputDigest) {
    throw new Error("CRE behavior binding changed");
  }
  const result = assertEvaluationResultBindings(
    callback.response.result,
    parseEvaluationRequest(request.request),
  );
  if (result.verdict !== expected)
    throw new Error(`CRE returned unexpected verdict: ${result.verdict}`);
  return Object.freeze({
    status: "EVALUATED" as const,
    verdict: result.verdict,
    applicationProjection: result.verdict,
    evaluationInputsDigest: result.evaluationInputsDigest,
  });
}

function commandFor(
  definition: SimulationCaseDefinition,
  files: SimulationFixtureFiles,
): readonly string[] {
  return [
    "-R",
    ".",
    "-T",
    TARGET,
    "-e",
    relativeCliPath(files[definition.environmentPath]),
    "--non-interactive",
    "workflow",
    "simulate",
    WORKFLOW_PATH,
    "--trigger-index",
    TRIGGER_INDEX,
    "--http-payload",
    relativeCliPath(files[definition.payloadPath]),
  ];
}

async function main(): Promise<void> {
  const outputRoot = resolve(
    REPOSITORY_ROOT,
    process.env.ROVAULTA_CRE_SIMULATION_OUTPUT_DIR?.trim() ||
      `.data/cre-simulation/${new Date().toISOString().replaceAll(/[^0-9]/g, "")}-${randomUUID().slice(0, 8)}`,
  );
  mkdirSync(resolve(outputRoot, "fixtures"), { recursive: true });
  const confidentialRoot = mkdtempSync(resolve(tmpdir(), "rovaulta-cre-simulation-"));
  try {
    const files = await createSimulationFixtureFiles(outputRoot, {
      confidentialOutputRoot: confidentialRoot,
    });
    const versionRun = runCli(["-v"]);
    if (versionRun.exitCode !== 0)
      throw new Error("the CRE CLI version check failed; authenticate with cre login");
    const cliVersion = versionFromOutput(versionRun.output);
    const results: Array<Record<string, unknown>> = [];

    for (const definition of CASES) {
      const args = commandFor(definition, files);
      const run = runCli(args);
      if (run.exitCode !== 0) {
        throw new WorkflowSimulationError(definition, args, run, files);
      }
      assertNoConfidentialOutput(run.output, files[definition.environmentPath], files.secretValue);
      const publicInput = JSON.parse(
        readFileSync(files[definition.payloadPath], "utf8"),
      ) as unknown;
      const request = parsePublicEvaluationRequest(publicInput, {
        requireSiteSecretSelector: true,
      });
      const response = extractPublicResponse(run.output);
      const validation = validatePublicResponse(response, request, definition.expected);
      const jsonValues = balancedJsonValues(run.output);
      results.push({
        case: definition.name,
        command: [cliExecutable(), ...args].map(quote).join(" "),
        executionId: executionId(run.output, jsonValues),
        engineStatus: "SUCCESS",
        processExitCode: run.exitCode,
        publicBinding: publicBinding(request),
        result: validation,
        simulationBinaryHash: labeledHash(run.output, "simulation(?: binary)? hash"),
        workflowConfigHash: labeledHash(run.output, "workflow config hash"),
        confidentialFieldsAbsent: true,
        rawCliOutputStored: false,
      });
    }

    const evidence = {
      evidenceClass: "CRE authenticated simulation",
      capturedAt: new Date().toISOString(),
      executionMode: "official CRE CLI simulation",
      liveDeploymentClaimed: false,
      cliVersion,
      target: TARGET,
      workflowPath: WORKFLOW_PATH,
      triggerIndex: Number(TRIGGER_INDEX),
      validationBoundary:
        "Rovaulta public request parser, callback parser, and exact binding checks",
      cases: results,
      confidentiality: {
        privateEnvelopeStored: false,
        blindStored: false,
        credentialsStored: false,
        rawCliOutputStored: false,
        publicResultOnly: true,
      },
    };
    const evidencePath = resolve(outputRoot, "evidence.json");
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`, "utf8");
    console.log(
      JSON.stringify(
        {
          status: "PASS",
          evidenceClass: evidence.evidenceClass,
          cliVersion,
          cases: results.map((result) => ({ case: result.case, result: result.result })),
          evidencePath: relative(REPOSITORY_ROOT, evidencePath).replaceAll("\\", "/"),
        },
        null,
        2,
      ),
    );
  } finally {
    rmSync(confidentialRoot, { recursive: true, force: true });
  }
}

if (import.meta.main) {
  try {
    await main();
  } catch (error) {
    console.error(
      JSON.stringify(
        error instanceof WorkflowSimulationError
          ? error.details
          : {
              status: "BLOCKED",
              error: error instanceof Error ? error.message : "CRE simulation evidence failed",
            },
        null,
        2,
      ),
    );
    process.exitCode = 1;
  }
}
