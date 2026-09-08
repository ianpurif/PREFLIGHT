import {
  type ClearanceRecord,
  compareUnixTimestamps,
  parseClearanceRecord,
  parseUnixTimestamp,
  type UnixTimestamp,
} from "@rovaulta/domain";
import {
  type Address,
  type Chain,
  createPublicClient,
  type Hex,
  http,
  type PublicClient,
  type Transport,
} from "viem";
import { sepolia } from "viem/chains";
import { ROVAULTA_SEPOLIA_DEPLOYMENT } from "./deployment";
import { failRelease, ReleaseGateError } from "./errors";
import {
  type ClearanceBindingsTransport,
  type ClearanceTransport,
  clearanceRecordToTransport,
  VERDICT_CLEAR_BYTES32,
  ZERO_BYTES32,
} from "./transport";

const CLEARANCE_BINDING_COMPONENTS = [
  { name: "clearanceIdHash", type: "bytes32" },
  { name: "evaluationIdHash", type: "bytes32" },
  { name: "siteIdHash", type: "bytes32" },
  { name: "robotIdHash", type: "bytes32" },
  { name: "robotBuildIdHash", type: "bytes32" },
  { name: "robotBuildDigest", type: "bytes32" },
  { name: "safetyEnvelopeIdHash", type: "bytes32" },
  { name: "safetyEnvelopeCommitment", type: "bytes32" },
  { name: "evaluatorVersionHash", type: "bytes32" },
  { name: "evaluationInputsDigest", type: "bytes32" },
  { name: "issuedAt", type: "uint64" },
  { name: "expiresAt", type: "uint64" },
] as const;

export const ROVAULTA_REGISTRY_ABI = [
  {
    type: "function",
    name: "clearanceDigestByIdHash",
    stateMutability: "view",
    inputs: [{ name: "clearanceIdHash", type: "bytes32" }],
    outputs: [{ name: "clearanceDigest", type: "bytes32" }],
  },
  {
    type: "function",
    name: "getClearance",
    stateMutability: "view",
    inputs: [{ name: "clearanceDigest", type: "bytes32" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "clearanceDigest", type: "bytes32" },
          { name: "bindings", type: "tuple", components: CLEARANCE_BINDING_COMPONENTS },
          { name: "verdict", type: "bytes32" },
          { name: "issuer", type: "address" },
          { name: "revoked", type: "bool" },
          { name: "exists", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "isClearanceValidFor",
    stateMutability: "view",
    inputs: [
      { name: "clearanceDigest", type: "bytes32" },
      { name: "expected", type: "tuple", components: CLEARANCE_BINDING_COMPONENTS },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export interface StoredClearanceTransport extends ClearanceTransport {
  readonly issuer: Address;
  readonly revoked: boolean;
  readonly exists: boolean;
}

export interface ClearanceRegistrySnapshot {
  readonly chainId: 11_155_111;
  readonly registry: Address;
  readonly blockNumber: bigint;
  readonly blockHash: Hex;
  readonly blockTimestamp: UnixTimestamp;
  readonly requested: ClearanceTransport;
  readonly stored: StoredClearanceTransport | null;
  readonly exactMatch: boolean;
}

export interface ClearanceRegistryReader {
  readExactClearance(clearance: ClearanceRecord): Promise<ClearanceRegistrySnapshot>;
}

type SepoliaClient = PublicClient<Transport, Chain>;

function sameBindings(
  left: ClearanceBindingsTransport,
  right: ClearanceBindingsTransport,
): boolean {
  return (
    left.clearanceIdHash === right.clearanceIdHash &&
    left.evaluationIdHash === right.evaluationIdHash &&
    left.siteIdHash === right.siteIdHash &&
    left.robotIdHash === right.robotIdHash &&
    left.robotBuildIdHash === right.robotBuildIdHash &&
    left.robotBuildDigest === right.robotBuildDigest &&
    left.safetyEnvelopeIdHash === right.safetyEnvelopeIdHash &&
    left.safetyEnvelopeCommitment === right.safetyEnvelopeCommitment &&
    left.evaluatorVersionHash === right.evaluatorVersionHash &&
    left.evaluationInputsDigest === right.evaluationInputsDigest &&
    left.issuedAt === right.issuedAt &&
    left.expiresAt === right.expiresAt
  );
}

export class ViemClearanceRegistryReader implements ClearanceRegistryReader {
  readonly #client: SepoliaClient;

  constructor(rpcUrl: string, client?: SepoliaClient) {
    if (!/^https?:\/\//.test(rpcUrl)) {
      failRelease("REGISTRY_UNAVAILABLE", "A valid Sepolia RPC URL is required");
    }
    this.#client = client ?? createPublicClient({ chain: sepolia, transport: http(rpcUrl) });
  }

  async readExactClearance(clearanceInput: ClearanceRecord): Promise<ClearanceRegistrySnapshot> {
    const clearance = parseClearanceRecord(clearanceInput);
    const requested = clearanceRecordToTransport(clearance);
    try {
      const chainId = await this.#client.getChainId();
      if (chainId !== ROVAULTA_SEPOLIA_DEPLOYMENT.chainId) {
        return failRelease("WRONG_CHAIN", "Registry RPC is connected to the wrong chain");
      }
      const blockNumber = await this.#client.getBlockNumber();
      const [block, code] = await Promise.all([
        this.#client.getBlock({ blockNumber }),
        this.#client.getCode({
          address: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
          blockNumber,
        }),
      ]);
      if (code === undefined || code === "0x") {
        return failRelease("REGISTRY_UNAVAILABLE", "Rovaulta registry bytecode is unavailable");
      }
      const registeredDigest = await this.#client.readContract({
        address: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
        abi: ROVAULTA_REGISTRY_ABI,
        functionName: "clearanceDigestByIdHash",
        args: [requested.bindings.clearanceIdHash],
        blockNumber,
      });
      const common = {
        chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
        registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
        blockNumber,
        blockHash: block.hash,
        blockTimestamp: parseUnixTimestamp(block.timestamp.toString(), "blockTimestamp"),
        requested,
      } as const;
      if (registeredDigest === ZERO_BYTES32 || registeredDigest !== requested.clearanceDigest) {
        return Object.freeze({ ...common, stored: null, exactMatch: false });
      }

      const [rawStored, exactMatch] = await Promise.all([
        this.#client.readContract({
          address: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
          abi: ROVAULTA_REGISTRY_ABI,
          functionName: "getClearance",
          args: [requested.clearanceDigest],
          blockNumber,
        }),
        this.#client.readContract({
          address: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
          abi: ROVAULTA_REGISTRY_ABI,
          functionName: "isClearanceValidFor",
          args: [requested.clearanceDigest, requested.bindings],
          blockNumber,
        }),
      ]);
      const stored = rawStored as StoredClearanceTransport;
      const independentlyExact =
        stored.exists &&
        stored.clearanceDigest === requested.clearanceDigest &&
        stored.verdict === VERDICT_CLEAR_BYTES32 &&
        sameBindings(stored.bindings, requested.bindings);
      return Object.freeze({
        ...common,
        stored: Object.freeze({ ...stored, bindings: Object.freeze({ ...stored.bindings }) }),
        exactMatch: exactMatch && independentlyExact,
      });
    } catch (error) {
      if (error instanceof ReleaseGateError) throw error;
      return failRelease("REGISTRY_UNAVAILABLE", "Sepolia registry read failed closed");
    }
  }
}

export function assertClearanceSnapshotEligible(
  snapshot: ClearanceRegistrySnapshot,
): ClearanceRegistrySnapshot {
  if (snapshot.chainId !== ROVAULTA_SEPOLIA_DEPLOYMENT.chainId) {
    return failRelease("WRONG_CHAIN", "Clearance snapshot is from the wrong chain");
  }
  if (snapshot.registry !== ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract) {
    return failRelease("REGISTRY_UNAVAILABLE", "Clearance snapshot is from another registry");
  }
  if (snapshot.stored === null) {
    return failRelease("CLEARANCE_NOT_FOUND", "Clearance is not registered");
  }
  if (snapshot.stored.verdict !== VERDICT_CLEAR_BYTES32) {
    return failRelease("CLEARANCE_NOT_CLEAR", "Registered verdict is not CLEAR");
  }
  if (snapshot.stored.revoked) {
    return failRelease("CLEARANCE_REVOKED", "Clearance has been revoked");
  }
  const storedExpiry = parseUnixTimestamp(snapshot.stored.bindings.expiresAt.toString());
  if (compareUnixTimestamps(snapshot.blockTimestamp, storedExpiry) >= 0) {
    return failRelease("CLEARANCE_EXPIRED", "Clearance has expired");
  }
  if (!snapshot.exactMatch) {
    return failRelease("CLEARANCE_BINDING_MISMATCH", "Clearance bindings do not match exactly");
  }
  return snapshot;
}
