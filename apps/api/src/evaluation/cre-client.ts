import { createHash, randomUUID } from "node:crypto";
import {
  CRE_PUBLIC_REQUEST_VERSION,
  type CrePublicEvaluationResponse,
  type CrePublicEvaluationSuccess,
  digestBehaviorInput,
} from "@rovaulta/chainlink-cre/protocol";
import {
  assertEvaluationResultBindings,
  canonicalSerialize,
  digestRobotBuild,
  type EvaluationRequest,
  type EvaluationResult,
  PROTOCOL_VERSION,
  parseEvaluationRequest,
  parseEvaluationResult,
  parseRobotBuildDescriptor,
  parseUnixTimestamp,
  type RobotBuildDescriptor,
  type UnixTimestamp,
} from "@rovaulta/domain";
import {
  parseRobotBehaviorTraceSuite,
  type RobotBehaviorTraceSuite,
} from "@rovaulta/simulation-core";

const TRACE_PROVENANCE = "SYNTHETIC_CALLER_SUPPLIED" as const;
const SECRET_PREFIX = "ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_" as const;
const MAX_RESPONSE_BYTES = 256 * 1024;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export interface ConfidentialEvaluationInput {
  readonly request: unknown;
  readonly robotBuild: unknown;
  readonly confidentialEnvelope: unknown;
  readonly envelopeBlindingSecret: Uint8Array;
  readonly behaviorTraces: unknown;
  readonly evaluatedAt: unknown;
}

export interface ConfidentialEvaluationReport {
  readonly result: EvaluationResult;
  readonly scenarioCount: number;
  readonly violationCount: number;
  readonly violations: readonly Readonly<{ readonly type: string }>[];
}

export type ConfidentialEvaluationExecutor = {
  evaluate(input: ConfidentialEvaluationInput): Promise<ConfidentialEvaluationReport>;
};

export type CreEvaluationErrorCode =
  | "CRE_UNAVAILABLE"
  | "CRE_REQUEST_REJECTED"
  | "CRE_EVALUATION_PENDING"
  | "CRE_RESPONSE_INVALID";

export class CreEvaluationError extends Error {
  readonly code: CreEvaluationErrorCode;

  constructor(code: CreEvaluationErrorCode, message: string) {
    super(message);
    this.name = "CreEvaluationError";
    this.code = code;
  }
}

function base64Url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64url");
}

function canonicalBase64(value: unknown): string {
  return base64Url(new TextEncoder().encode(String(canonicalSerialize(value))));
}

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

function siteSecretId(siteId: string): string {
  const suffix = siteId.replace(/[^a-z0-9_-]/gi, "_").toLowerCase();
  if (suffix.length === 0 || suffix.length > 96) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "Site secret reference is malformed");
  }
  return `${SECRET_PREFIX}${suffix}`;
}

function expectRecord(value: unknown, message: string): Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", message);
  }
  return value as Record<string, unknown>;
}

function responseJson(value: unknown): CrePublicEvaluationResponse {
  const record = expectRecord(value, "CRE response is malformed");
  const candidate =
    record.result !== null && typeof record.result === "object" && !Array.isArray(record.result)
      ? record.result
      : record;
  const response = expectRecord(candidate, "CRE response result is malformed");
  if (response.status === "REJECT") {
    if (typeof response.code !== "string") {
      throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE rejection code is malformed");
    }
    return response as unknown as CrePublicEvaluationResponse;
  }
  if (response.status !== "EVALUATED") {
    if (response.status === "ACCEPTED" || response.workflow_execution_id !== undefined) {
      throw new CreEvaluationError(
        "CRE_EVALUATION_PENDING",
        "CRE accepted the workflow but has not returned a completed evaluation",
      );
    }
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE did not return an evaluation");
  }
  return response as unknown as CrePublicEvaluationResponse;
}

function publicRequest(input: ConfidentialEvaluationInput): {
  readonly request: EvaluationRequest;
  readonly robotBuild: RobotBuildDescriptor;
  readonly behaviorTraces: RobotBehaviorTraceSuite;
  readonly evaluatedAt: UnixTimestamp;
  readonly payload: Record<string, unknown>;
} {
  const request = parseEvaluationRequest(input.request);
  const robotBuild = parseRobotBuildDescriptor(input.robotBuild);
  const behaviorTraces = parseRobotBehaviorTraceSuite(input.behaviorTraces);
  const evaluatedAt = parseUnixTimestamp(input.evaluatedAt, "evaluatedAt");
  if (robotBuild.robotBuildId !== request.inputs.robotBuildId) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE request build binding is invalid");
  }
  if (digestRobotBuild(robotBuild) !== request.inputs.robotBuildDigest) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE request build digest is invalid");
  }
  const digestPayload = {
    schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialInputSecretId: siteSecretId(request.inputs.siteId),
    includePublicSummary: true,
    request,
    robotBuild,
    behaviorTraces,
    traceProvenance: TRACE_PROVENANCE,
    evaluatedAt,
  } as const;
  return {
    request,
    robotBuild,
    behaviorTraces,
    evaluatedAt,
    payload: {
      ...digestPayload,
      behaviorInputDigest: digestBehaviorInput(digestPayload),
    },
  };
}

function assertCompletedResult(
  response: CrePublicEvaluationSuccess,
  input: ReturnType<typeof publicRequest>,
): ConfidentialEvaluationReport {
  if (response.protocolVersion !== input.payload.protocolVersion) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE protocol version changed");
  }
  if (response.behaviorInputDigest !== input.payload.behaviorInputDigest) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE behavior binding changed");
  }
  const result = assertEvaluationResultBindings(
    parseEvaluationResult(response.result),
    input.request,
  );
  if (result.inputs.robotBuildDigest !== input.request.inputs.robotBuildDigest) {
    throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE result build binding changed");
  }
  const summary = response.publicSummary;
  if (
    summary === undefined ||
    !Number.isSafeInteger(summary.scenarioCount) ||
    summary.scenarioCount < 0 ||
    !Number.isSafeInteger(summary.violationCount) ||
    summary.violationCount < 0 ||
    !Array.isArray(summary.reasons) ||
    summary.reasons.some((reason) => typeof reason !== "string")
  ) {
    throw new CreEvaluationError(
      "CRE_RESPONSE_INVALID",
      "CRE did not return the required allowlisted public summary",
    );
  }
  return Object.freeze({
    result,
    scenarioCount: summary.scenarioCount,
    violationCount: summary.violationCount,
    violations: Object.freeze(
      Array.from(new Set(summary.reasons)).map((type) => Object.freeze({ type })),
    ),
  });
}

export class CreHttpEvaluationClient implements ConfidentialEvaluationExecutor {
  readonly #gatewayUrl: string | undefined;
  readonly #workflowId: string | undefined;
  readonly #privateKey: `0x${string}` | undefined;
  readonly #fetch: FetchLike;
  readonly #now: () => number;
  readonly #idFactory: () => string;

  constructor(options: {
    readonly gatewayUrl?: string;
    readonly workflowId?: string;
    readonly privateKey?: string;
    readonly fetch?: FetchLike;
    readonly now?: () => number;
    readonly idFactory?: () => string;
  }) {
    this.#gatewayUrl = options.gatewayUrl?.trim() || undefined;
    this.#workflowId = options.workflowId?.trim() || undefined;
    this.#privateKey =
      options.privateKey !== undefined && /^0x[0-9a-fA-F]{64}$/.test(options.privateKey)
        ? (options.privateKey as `0x${string}`)
        : undefined;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => Math.floor(Date.now() / 1000));
    this.#idFactory = options.idFactory ?? randomUUID;
  }

  async evaluate(input: ConfidentialEvaluationInput): Promise<ConfidentialEvaluationReport> {
    if (
      this.#gatewayUrl === undefined ||
      this.#workflowId === undefined ||
      this.#privateKey === undefined
    ) {
      throw new CreEvaluationError(
        "CRE_UNAVAILABLE",
        "A deployed CRE gateway, workflow ID, and authorized signing key are required",
      );
    }
    if (!/^https:\/\//.test(this.#gatewayUrl) || !/^[0-9a-fA-F]{64}$/.test(this.#workflowId)) {
      throw new CreEvaluationError("CRE_UNAVAILABLE", "CRE gateway configuration is malformed");
    }
    const normalized = publicRequest(input);
    const id = this.#idFactory();
    const body = {
      id,
      jsonrpc: "2.0",
      method: "workflows.execute",
      params: {
        input: normalized.payload,
        workflow: { workflowID: this.#workflowId },
      },
    } as const;
    const bodyText = String(canonicalSerialize(body));
    const issuedAt = this.#now();
    const header = canonicalBase64({ alg: "ETH", typ: "JWT" });
    const payload = canonicalBase64({
      digest: `0x${sha256Hex(bodyText)}`,
      iss: await this.#issuerAddress(),
      iat: issuedAt,
      exp: issuedAt + 300,
      jti: id,
    });
    const signature = await this.#sign(`${header}.${payload}`);
    let response: Response;
    try {
      response = await this.#fetch(this.#gatewayUrl, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${header}.${payload}.${signature}`,
        },
        body: bodyText,
      });
    } catch {
      throw new CreEvaluationError("CRE_UNAVAILABLE", "The CRE gateway is unreachable");
    }
    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new CreEvaluationError("CRE_UNAVAILABLE", "The CRE gateway response could not be read");
    }
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE response exceeded its size bound");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new CreEvaluationError("CRE_RESPONSE_INVALID", "CRE response was not JSON");
    }
    if (!response.ok) {
      throw new CreEvaluationError("CRE_REQUEST_REJECTED", "CRE gateway rejected the request");
    }
    const result = responseJson(parsed);
    if (result.status === "REJECT") {
      throw new CreEvaluationError(
        "CRE_REQUEST_REJECTED",
        "CRE rejected the confidential evaluation",
      );
    }
    return assertCompletedResult(result, normalized);
  }

  async #issuerAddress(): Promise<`0x${string}`> {
    const { privateKeyToAccount } = await import("viem/accounts");
    return privateKeyToAccount(this.#privateKey as `0x${string}`).address;
  }

  async #sign(message: string): Promise<string> {
    const { privateKeyToAccount } = await import("viem/accounts");
    const { parseSignature } = await import("viem");
    const account = privateKeyToAccount(this.#privateKey as `0x${string}`);
    const signature = await account.signMessage({ message });
    const { r, s, v, yParity } = parseSignature(signature);
    const recoveryId = v === undefined ? yParity : v >= 27n ? v - 27n : v;
    if (recoveryId === undefined || (recoveryId !== 0n && recoveryId !== 1n)) {
      throw new CreEvaluationError(
        "CRE_UNAVAILABLE",
        "CRE signing returned an invalid recovery ID",
      );
    }
    const signatureBytes = Buffer.concat([
      Buffer.from(r.slice(2).padStart(64, "0"), "hex"),
      Buffer.from(s.slice(2).padStart(64, "0"), "hex"),
      Buffer.from([Number(recoveryId)]),
    ]);
    return base64Url(Uint8Array.from(signatureBytes));
  }
}

export function createCreEvaluationClientFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): CreHttpEvaluationClient {
  const options: {
    gatewayUrl?: string;
    workflowId?: string;
    privateKey?: string;
  } = {};
  if (environment.ROVAULTA_CRE_GATEWAY_URL !== undefined)
    options.gatewayUrl = environment.ROVAULTA_CRE_GATEWAY_URL;
  if (environment.CHAINLINK_CRE_WORKFLOW_ID !== undefined)
    options.workflowId = environment.CHAINLINK_CRE_WORKFLOW_ID;
  if (environment.CHAINLINK_CRE_TRIGGER_PRIVATE_KEY !== undefined)
    options.privateKey = environment.CHAINLINK_CRE_TRIGGER_PRIVATE_KEY;
  return new CreHttpEvaluationClient(options);
}
