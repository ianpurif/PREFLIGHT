import { describe, expect, test } from "bun:test";
import { parseUnixTimestamp } from "@rovaulta/domain";
import { decodeFunctionResult, encodeFunctionResult } from "viem";
import {
  assertClearanceSnapshotEligible,
  type ClearanceRegistrySnapshot,
  clearanceRecordToTransport,
  identifierToBytes32,
  protocolDigestToBytes32,
  ReleaseGateError,
  type ReleaseGateErrorCode,
  ROVAULTA_REGISTRY_ABI,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  VERDICT_CLEAR_BYTES32,
  ViemClearanceRegistryReader,
} from "../src/index.js";
import { clearanceFixture } from "./fixtures.js";

function exactSnapshot(): ClearanceRegistrySnapshot {
  const requested = clearanceRecordToTransport(clearanceFixture);
  return {
    chainId: 11_155_111,
    registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
    blockNumber: 11_700_000n,
    blockHash: `0x${"aa".repeat(32)}`,
    blockTimestamp: parseUnixTimestamp("1788548000"),
    requested,
    stored: {
      ...requested,
      issuer: "0xaA5768d0f2157F8781efb975CDd9aec99e7879E3",
      revoked: false,
      exists: true,
    },
    exactMatch: true,
  };
}

function storedExactSnapshot() {
  const stored = exactSnapshot().stored;
  if (stored === null) throw new Error("Expected the exact snapshot to contain a clearance");
  return stored;
}

function expectCode(snapshot: ClearanceRegistrySnapshot, code: ReleaseGateErrorCode): void {
  try {
    assertClearanceSnapshotEligible(snapshot);
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReleaseGateError);
    expect((error as ReleaseGateError).code).toBe(code);
  }
}

describe("P4 exact-binding transport and policy", () => {
  test("reproduces P4 digest and identifier transport rules", () => {
    const transport = clearanceRecordToTransport(clearanceFixture);
    expect(transport.clearanceDigest).toBe(
      "0xdb55bd4b99d18606e9b22f6c088a5610f5535f13bcb2c179503357f8adcc3843",
    );
    expect(transport.bindings.siteIdHash).toBe(identifierToBytes32(clearanceFixture.inputs.siteId));
    expect(protocolDigestToBytes32(clearanceFixture.inputs.robotBuildDigest)).toBe(
      transport.bindings.robotBuildDigest,
    );
    expect(transport.verdict).toBe(VERDICT_CLEAR_BYTES32);
  });

  test("accepts only an exact live CLEAR snapshot", () => {
    expect(assertClearanceSnapshotEligible(exactSnapshot())).toEqual(exactSnapshot());
    expectCode({ ...exactSnapshot(), stored: null }, "CLEARANCE_NOT_FOUND");
    expectCode(
      {
        ...exactSnapshot(),
        stored: { ...storedExactSnapshot(), verdict: `0x${"00".repeat(32)}` },
      },
      "CLEARANCE_NOT_CLEAR",
    );
    expectCode(
      { ...exactSnapshot(), stored: { ...storedExactSnapshot(), revoked: true } },
      "CLEARANCE_REVOKED",
    );
    expectCode(
      { ...exactSnapshot(), blockTimestamp: parseUnixTimestamp(clearanceFixture.expiresAt) },
      "CLEARANCE_EXPIRED",
    );
    expectCode({ ...exactSnapshot(), exactMatch: false }, "CLEARANCE_BINDING_MISMATCH");
  });

  test("rejects wrong chain and registry snapshots", () => {
    expectCode({ ...exactSnapshot(), chainId: 1 as 11_155_111 }, "WRONG_CHAIN");
    expectCode(
      {
        ...exactSnapshot(),
        registry: "0x0000000000000000000000000000000000000001",
      },
      "REGISTRY_UNAVAILABLE",
    );
  });

  test("uses strict before-expiry semantics", () => {
    expect(() =>
      assertClearanceSnapshotEligible({
        ...exactSnapshot(),
        blockTimestamp: parseUnixTimestamp("1788550799"),
      }),
    ).not.toThrow();
    expectCode(
      { ...exactSnapshot(), blockTimestamp: parseUnixTimestamp("1788550800") },
      "CLEARANCE_EXPIRED",
    );
    expectCode(
      { ...exactSnapshot(), blockTimestamp: parseUnixTimestamp("1788550801") },
      "CLEARANCE_EXPIRED",
    );
  });

  test("reads and independently verifies the positive registry path at one pinned block", async () => {
    const requested = clearanceRecordToTransport(clearanceFixture);
    const stored = storedExactSnapshot();
    const calls: Array<{ functionName: string; blockNumber: bigint }> = [];
    const client = {
      getChainId: async () => ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      getBlockNumber: async () => 11_700_000n,
      getBlock: async ({ blockNumber }: { blockNumber: bigint }) => ({
        hash: `0x${"aa".repeat(32)}`,
        timestamp: 1_788_548_000n,
        number: blockNumber,
      }),
      getCode: async ({ blockNumber }: { blockNumber: bigint }) => {
        expect(blockNumber).toBe(11_700_000n);
        return "0x6000";
      },
      readContract: async (request: { functionName: string; blockNumber: bigint }) => {
        calls.push(request);
        if (request.functionName === "clearanceDigestByIdHash") return requested.clearanceDigest;
        if (request.functionName === "getClearance") return stored;
        if (request.functionName === "isClearanceValidFor") return true;
        throw new Error(`Unexpected function ${request.functionName}`);
      },
    };
    const result = await new ViemClearanceRegistryReader(
      "https://rpc.test.invalid",
      client as never,
    ).readExactClearance(clearanceFixture);
    expect(result.exactMatch).toBe(true);
    expect(result.stored).toEqual(stored);
    expect(calls.map((call) => call.functionName)).toEqual([
      "clearanceDigestByIdHash",
      "getClearance",
      "isClearanceValidFor",
    ]);
    expect(calls.every((call) => call.blockNumber === 11_700_000n)).toBe(true);

    const encoded = encodeFunctionResult({
      abi: ROVAULTA_REGISTRY_ABI,
      functionName: "getClearance",
      result: stored,
    });
    expect(
      decodeFunctionResult({
        abi: ROVAULTA_REGISTRY_ABI,
        functionName: "getClearance",
        data: encoded,
      }),
    ).toEqual(stored);
  });
});
