import {
  clearanceRecordToTransport,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  VERDICT_CLEAR_BYTES32,
} from "@rovaulta/chain-client";
import { type ClearanceRecord, parseClearanceRecord } from "@rovaulta/domain";

const DEFAULT_ENDPOINT = "https://gateway.thegraph.com/api";
const MAX_RESPONSE_BYTES = 256 * 1024;

type FetchLike = (input: string | URL | Request, init?: RequestInit) => Promise<Response>;

export type GraphClearanceStatus = "MATCHED" | "NOT_FOUND" | "REVOKED" | "EXPIRED" | "MISMATCH";

export interface GraphClearanceContext {
  readonly source: "the-graph";
  readonly provider: "gateway";
  readonly chainId: 11_155_111;
  readonly registry: `0x${string}`;
  readonly clearanceDigest: `0x${string}`;
  readonly status: GraphClearanceStatus;
  readonly issuer?: `0x${string}`;
  readonly issuedAt?: string;
  readonly expiresAt?: string;
  readonly indexedAtBlock?: string;
  readonly blockHash?: `0x${string}`;
  readonly reason?: string;
}

export type GraphClearanceReader = {
  readClearance(clearance: ClearanceRecord): Promise<GraphClearanceContext>;
};

export type GraphProviderErrorCode = "GRAPH_UNAVAILABLE" | "GRAPH_RESPONSE_INVALID";

export class GraphProviderError extends Error {
  readonly code: GraphProviderErrorCode;

  constructor(code: GraphProviderErrorCode, message: string) {
    super(message);
    this.name = "GraphProviderError";
    this.code = code;
  }
}

const QUERY = `query RovaultaClearance($digest: Bytes!) {
  clearance(id: $digest) {
    id
    clearanceDigest
    clearanceIdHash
    evaluationIdHash
    siteIdHash
    robotIdHash
    robotBuildIdHash
    robotBuildDigest
    safetyEnvelopeIdHash
    safetyEnvelopeCommitment
    evaluatorVersionHash
    evaluationInputsDigest
    verdict
    issuedAt
    expiresAt
    issuer
    revoked
    blockNumber
    blockHash
  }
}` as const;

function record(input: unknown, message: string): Record<string, unknown> {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new GraphProviderError("GRAPH_RESPONSE_INVALID", message);
  }
  return input as Record<string, unknown>;
}

function hex32(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/.test(value)) {
    throw new GraphProviderError("GRAPH_RESPONSE_INVALID", `${label} is malformed`);
  }
  return value.toLowerCase() as `0x${string}`;
}

function address(value: unknown, label: string): `0x${string}` {
  if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(value)) {
    throw new GraphProviderError("GRAPH_RESPONSE_INVALID", `${label} is malformed`);
  }
  return value.toLowerCase() as `0x${string}`;
}

function decimal(value: unknown, label: string): string {
  if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/.test(value)) {
    throw new GraphProviderError("GRAPH_RESPONSE_INVALID", `${label} is malformed`);
  }
  return value;
}

export class TheGraphClearanceReader implements GraphClearanceReader {
  readonly #apiKey: string | undefined;
  readonly #subgraphId: string | undefined;
  readonly #endpoint: string;
  readonly #fetch: FetchLike;
  readonly #now: () => number;

  constructor(options: {
    readonly apiKey?: string;
    readonly subgraphId?: string;
    readonly endpoint?: string;
    readonly fetch?: FetchLike;
    readonly now?: () => number;
  }) {
    this.#apiKey = options.apiKey?.trim() || undefined;
    this.#subgraphId = options.subgraphId?.trim() || undefined;
    this.#endpoint = options.endpoint?.trim() || DEFAULT_ENDPOINT;
    this.#fetch = options.fetch ?? fetch;
    this.#now = options.now ?? (() => Math.floor(Date.now() / 1000));
  }

  async readClearance(input: ClearanceRecord): Promise<GraphClearanceContext> {
    const clearance = parseClearanceRecord(input);
    if (this.#apiKey === undefined || this.#subgraphId === undefined) {
      throw new GraphProviderError(
        "GRAPH_UNAVAILABLE",
        "The Graph API key and Rovaulta subgraph ID are required",
      );
    }
    if (!/^https:\/\//.test(this.#endpoint) || !/^[A-Za-z0-9_-]{8,256}$/.test(this.#subgraphId)) {
      throw new GraphProviderError(
        "GRAPH_UNAVAILABLE",
        "The Graph provider configuration is malformed",
      );
    }
    const requested = clearanceRecordToTransport(clearance);
    const digest = requested.clearanceDigest;
    let response: Response;
    try {
      response = await this.#fetch(
        `${this.#endpoint}/${this.#apiKey}/subgraphs/id/${this.#subgraphId}`,
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ query: QUERY, variables: { digest } }),
        },
      );
    } catch {
      throw new GraphProviderError("GRAPH_UNAVAILABLE", "The Graph provider is unreachable");
    }
    let text: string;
    try {
      text = await response.text();
    } catch {
      throw new GraphProviderError(
        "GRAPH_UNAVAILABLE",
        "The Graph provider response could not be read",
      );
    }
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new GraphProviderError(
        "GRAPH_RESPONSE_INVALID",
        "The Graph response exceeded its size bound",
      );
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new GraphProviderError("GRAPH_RESPONSE_INVALID", "The Graph response was not JSON");
    }
    if (!response.ok)
      throw new GraphProviderError("GRAPH_UNAVAILABLE", "The Graph provider rejected the query");
    const root = record(parsed, "The Graph response is malformed");
    if (root.errors !== undefined) {
      throw new GraphProviderError("GRAPH_UNAVAILABLE", "The Graph query failed");
    }
    const data = record(root.data, "The Graph response data is malformed");
    const entity = data.clearance;
    if (entity === null || entity === undefined) {
      return Object.freeze({
        source: "the-graph",
        provider: "gateway",
        chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
        registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
        clearanceDigest: digest,
        status: "NOT_FOUND",
        reason: "CLEARANCE_NOT_INDEXED",
      });
    }
    const stored = record(entity, "The Graph clearance entity is malformed");
    const entityId = hex32(stored.id, "id");
    const actualDigest = hex32(stored.clearanceDigest, "clearanceDigest");
    const bindings = [
      [stored.clearanceIdHash, requested.bindings.clearanceIdHash],
      [stored.evaluationIdHash, requested.bindings.evaluationIdHash],
      [stored.siteIdHash, requested.bindings.siteIdHash],
      [stored.robotIdHash, requested.bindings.robotIdHash],
      [stored.robotBuildIdHash, requested.bindings.robotBuildIdHash],
      [stored.robotBuildDigest, requested.bindings.robotBuildDigest],
      [stored.safetyEnvelopeIdHash, requested.bindings.safetyEnvelopeIdHash],
      [stored.safetyEnvelopeCommitment, requested.bindings.safetyEnvelopeCommitment],
      [stored.evaluatorVersionHash, requested.bindings.evaluatorVersionHash],
      [stored.evaluationInputsDigest, requested.bindings.evaluationInputsDigest],
    ] as const;
    const blockNumber = decimal(stored.blockNumber, "blockNumber");
    const blockHash = hex32(stored.blockHash, "blockHash");
    const issuedAt = decimal(stored.issuedAt, "issuedAt");
    const expiresAt = decimal(stored.expiresAt, "expiresAt");
    const issuer = address(stored.issuer, "issuer");
    const exact =
      entityId === digest &&
      actualDigest === digest &&
      bindings.every(([actual, expected]) => hex32(actual, "binding") === expected.toLowerCase()) &&
      issuedAt === requested.bindings.issuedAt.toString() &&
      expiresAt === requested.bindings.expiresAt.toString() &&
      typeof stored.verdict === "string" &&
      stored.verdict.toLowerCase() === VERDICT_CLEAR_BYTES32 &&
      typeof stored.revoked === "boolean";
    const base = {
      source: "the-graph" as const,
      provider: "gateway" as const,
      chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
      clearanceDigest: digest,
      issuer,
      issuedAt,
      expiresAt,
      indexedAtBlock: blockNumber,
      blockHash,
    };
    if (!exact)
      return Object.freeze({ ...base, status: "MISMATCH", reason: "CLEARANCE_BINDING_MISMATCH" });
    if (stored.revoked === true)
      return Object.freeze({ ...base, status: "REVOKED", reason: "CLEARANCE_REVOKED" });
    const expiresAtNumber = Number(expiresAt);
    if (!Number.isSafeInteger(expiresAtNumber) || expiresAtNumber <= this.#now()) {
      return Object.freeze({ ...base, status: "EXPIRED", reason: "CLEARANCE_EXPIRED" });
    }
    return Object.freeze({ ...base, status: "MATCHED" });
  }
}

export function createGraphReaderFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): TheGraphClearanceReader {
  const options: { apiKey?: string; subgraphId?: string; endpoint?: string } = {};
  if (environment.THE_GRAPH_API_KEY !== undefined) options.apiKey = environment.THE_GRAPH_API_KEY;
  if (environment.THE_GRAPH_SUBGRAPH_ID !== undefined)
    options.subgraphId = environment.THE_GRAPH_SUBGRAPH_ID;
  if (environment.THE_GRAPH_API_URL !== undefined) options.endpoint = environment.THE_GRAPH_API_URL;
  return new TheGraphClearanceReader(options);
}
