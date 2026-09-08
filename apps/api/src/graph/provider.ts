import {
  clearanceRecordToTransport,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  VERDICT_CLEAR_BYTES32,
} from "@rovaulta/chain-client";
import { parseClearanceRecord, type ClearanceRecord } from "@rovaulta/domain";

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

function requiredString(value: unknown, label: string): string {
  if (typeof value !== "string" || value.length === 0) {
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
      throw new GraphProviderError("GRAPH_UNAVAILABLE", "The Graph provider configuration is malformed");
    }
    const requested = clearanceRecordToTransport(clearance);
    const digest = requested.clearanceDigest;
    const response = await this.#fetch(`${this.#endpoint}/${this.#apiKey}/subgraphs/id/${this.#subgraphId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ query: QUERY, variables: { digest } }),
    });
    const text = await response.text();
    if (new TextEncoder().encode(text).byteLength > MAX_RESPONSE_BYTES) {
      throw new GraphProviderError("GRAPH_RESPONSE_INVALID", "The Graph response exceeded its size bound");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(text) as unknown;
    } catch {
      throw new GraphProviderError("GRAPH_RESPONSE_INVALID", "The Graph response was not JSON");
    }
    if (!response.ok) throw new GraphProviderError("GRAPH_UNAVAILABLE", "The Graph provider rejected the query");
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
    const exact =
      actualDigest === digest &&
      bindings.every(([actual, expected]) => hex32(actual, "binding") === expected.toLowerCase()) &&
      stored.verdict === VERDICT_CLEAR_BYTES32 &&
      typeof stored.revoked === "boolean";
    const base = {
      source: "the-graph" as const,
      provider: "gateway" as const,
      chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
      clearanceDigest: digest,
      ...(stored.blockNumber === undefined ? {} : { indexedAtBlock: requiredString(stored.blockNumber, "blockNumber") }),
      ...(stored.blockHash === undefined ? {} : { blockHash: hex32(stored.blockHash, "blockHash") }),
    };
    if (!exact) return Object.freeze({ ...base, status: "MISMATCH", reason: "CLEARANCE_BINDING_MISMATCH" });
    if (stored.revoked === true) return Object.freeze({ ...base, status: "REVOKED", reason: "CLEARANCE_REVOKED" });
    const expiresAt = Number(requiredString(stored.expiresAt, "expiresAt"));
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= this.#now()) {
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
