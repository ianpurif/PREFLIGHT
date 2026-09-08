import { afterEach, describe, expect, test } from "bun:test";
import {
  buildDeploymentTypedData,
  type ClearanceRegistryReader,
  type ClearanceRegistrySnapshot,
  clearanceRecordToTransport,
  ReleaseGateError,
  type ReleaseGateErrorCode,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  VERDICT_CLEAR_BYTES32,
} from "@rovaulta/chain-client";
import {
  CLEARANCE_RECORD_SCHEMA_VERSION,
  type ClearanceRecord,
  digestEvaluationInputs,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  parseClearanceId,
  parseClearanceRecord,
  parseEvaluationId,
  parseEvaluatorVersionId,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeCommitment,
  parseSafetyEnvelopeId,
  parseSiteId,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import { privateKeyToAccount } from "viem/accounts";
import {
  AuthorizedSignerPolicy,
  ReleaseService,
  SqliteReleaseStore,
} from "../src/release/index.js";

const account = privateKeyToAccount(`0x${"01".repeat(32)}`);
const unauthorized = privateKeyToAccount(`0x${"02".repeat(32)}`);
const inputs = {
  schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
  siteId: parseSiteId("site:p5-api"),
  robotId: parseRobotId("robot:p5-api"),
  robotBuildId: parseRobotBuildId("robot-build:p5-api-a"),
  robotBuildDigest: parseRobotBuildDigest(`sha256:${"11".repeat(32)}`),
  safetyEnvelopeId: parseSafetyEnvelopeId("safety-envelope:p5-api"),
  safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(`sha256:${"22".repeat(32)}`),
  evaluatorVersion: parseEvaluatorVersionId("evaluator-version:p5-api"),
} as const;
const clearance = parseClearanceRecord({
  schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
  clearanceId: parseClearanceId("clearance:p5-api"),
  evaluationId: parseEvaluationId("evaluation:p5-api"),
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  issuedAt: parseUnixTimestamp("1788547000"),
  expiresAt: parseUnixTimestamp("1788550800"),
});

function snapshot(
  record: ClearanceRecord = clearance,
  overrides: Partial<ClearanceRegistrySnapshot> = {},
): ClearanceRegistrySnapshot {
  const requested = clearanceRecordToTransport(record);
  return {
    chainId: 11_155_111,
    registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
    blockNumber: 11_700_000n,
    blockHash: `0x${"aa".repeat(32)}`,
    blockTimestamp: parseUnixTimestamp("1788548000"),
    requested,
    stored: {
      ...requested,
      verdict: VERDICT_CLEAR_BYTES32,
      issuer: "0xaA5768d0f2157F8781efb975CDd9aec99e7879E3",
      revoked: false,
      exists: true,
    },
    exactMatch: true,
    ...overrides,
  };
}

function storedSnapshot() {
  const stored = snapshot().stored;
  if (stored === null) throw new Error("Expected the default snapshot to contain a clearance");
  return stored;
}

class ScriptedReader implements ClearanceRegistryReader {
  readonly snapshots: ClearanceRegistrySnapshot[];
  calls = 0;

  constructor(snapshots: ClearanceRegistrySnapshot[]) {
    this.snapshots = snapshots;
  }

  async readExactClearance(): Promise<ClearanceRegistrySnapshot> {
    const index = Math.min(this.calls, this.snapshots.length - 1);
    this.calls += 1;
    const value = this.snapshots[index];
    if (value === undefined) throw new Error("No scripted snapshot");
    return value;
  }
}

const stores: SqliteReleaseStore[] = [];
afterEach(() => {
  while (stores.length > 0) stores.pop()?.close();
});

function service(reader: ScriptedReader) {
  const store = new SqliteReleaseStore(":memory:");
  stores.push(store);
  return new ReleaseService({
    reader,
    store,
    signers: new AuthorizedSignerPolicy([account.address]),
    intentTtlSeconds: 300,
  });
}

function proposal(overrides: Record<string, unknown> = {}) {
  return {
    siteId: clearance.inputs.siteId,
    robotId: clearance.inputs.robotId,
    robotBuildId: clearance.inputs.robotBuildId,
    robotBuildDigest: clearance.inputs.robotBuildDigest,
    clearance,
    signerAddress: account.address,
    ...overrides,
  };
}

async function signPrepared(prepared: Awaited<ReturnType<ReleaseService["prepare"]>>) {
  return account.signTypedData(
    buildDeploymentTypedData(prepared.intent, prepared.authorizedSigner).typedData,
  );
}

async function expectCode(action: () => Promise<unknown>, code: ReleaseGateErrorCode) {
  try {
    await action();
    throw new Error(`Expected ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(ReleaseGateError);
    expect((error as ReleaseGateError).code).toBe(code);
  }
}

describe("deterministic P5 release service", () => {
  test("requires a nonempty, unique, well-formed authorized-signer configuration", () => {
    expect(() => new AuthorizedSignerPolicy([])).toThrow(ReleaseGateError);
    expect(() => new AuthorizedSignerPolicy(["not-an-address"])).toThrow(ReleaseGateError);
    expect(() => new AuthorizedSignerPolicy([account.address, account.address])).toThrow(
      ReleaseGateError,
    );
    expect(
      AuthorizedSignerPolicy.fromEnvironment(account.address).assertAuthorized(account.address),
    ).toBe(account.address);
  });

  test("prepares and consumes one exact authorized Ledger intent", async () => {
    const reader = new ScriptedReader([
      snapshot(),
      snapshot(undefined, { blockNumber: 11_700_001n }),
    ]);
    const gate = service(reader);
    const prepared = await gate.prepare(proposal());
    expect(prepared.intent.action).toBe("ACTIVATE_DEPLOYMENT");
    expect(prepared.intent.siteId).toBe(clearance.inputs.siteId);
    expect(prepared.intent.expiresAt).toBe(parseUnixTimestamp("1788548300"));
    const signature = await signPrepared(prepared);
    const authorization = await gate.consume({ intent: prepared.intent, signature });
    expect(authorization.recoveredSigner).toBe(account.address);
    expect(authorization.chainId).toBe(11_155_111);
    expect(authorization.registry).toBe(ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract);
    expect(authorization.intent.robotBuildDigest).toBe(clearance.inputs.robotBuildDigest);
    expect(reader.calls).toBe(2);
    await expectCode(() => gate.consume({ intent: prepared.intent, signature }), "REPLAY_REJECTED");
  });

  test("blocks build/site/robot and unauthorized-signer proposals before chain or Ledger", async () => {
    const reader = new ScriptedReader([snapshot()]);
    const gate = service(reader);
    await expectCode(
      () => gate.prepare(proposal({ robotBuildDigest: `sha256:${"33".repeat(32)}` })),
      "CLEARANCE_BINDING_MISMATCH",
    );
    await expectCode(
      () => gate.prepare(proposal({ siteId: "site:another" })),
      "CLEARANCE_BINDING_MISMATCH",
    );
    await expectCode(
      () => gate.prepare(proposal({ robotId: "robot:another" })),
      "CLEARANCE_BINDING_MISMATCH",
    );
    await expectCode(
      () => gate.prepare(proposal({ signerAddress: unauthorized.address })),
      "UNAUTHORIZED_SIGNER",
    );
    expect(reader.calls).toBe(0);
  });

  test("blocks missing, revoked, expired, and inexact clearances during precheck", async () => {
    const cases: Array<[Partial<ClearanceRegistrySnapshot>, ReleaseGateErrorCode]> = [
      [{ stored: null }, "CLEARANCE_NOT_FOUND"],
      [{ stored: { ...storedSnapshot(), revoked: true } }, "CLEARANCE_REVOKED"],
      [{ blockTimestamp: parseUnixTimestamp(clearance.expiresAt) }, "CLEARANCE_EXPIRED"],
      [{ exactMatch: false }, "CLEARANCE_BINDING_MISMATCH"],
    ];
    for (const [override, code] of cases) {
      await expectCode(
        () => service(new ScriptedReader([snapshot(undefined, override)])).prepare(proposal()),
        code,
      );
    }
  });

  test("rejects invalid signatures and post-sign tampering without consuming the nonce", async () => {
    const gate = service(new ScriptedReader([snapshot(), snapshot(), snapshot()]));
    const prepared = await gate.prepare(proposal());
    const wrongSignature = await unauthorized.signTypedData(
      buildDeploymentTypedData(prepared.intent, prepared.authorizedSigner).typedData,
    );
    await expectCode(
      () => gate.consume({ intent: prepared.intent, signature: wrongSignature }),
      "SIGNATURE_MISMATCH",
    );
    const signature = await signPrepared(prepared);
    await expectCode(
      () =>
        gate.consume({
          intent: { ...prepared.intent, expiresAt: "1788548299" },
          signature,
        }),
      "SIGNATURE_MISMATCH",
    );
    await expectCode(
      () =>
        gate.consume({
          intent: {
            ...prepared.intent,
            robotBuildId: parseRobotBuildId("robot-build:p5-api-b"),
            robotBuildDigest: parseRobotBuildDigest(`sha256:${"44".repeat(32)}`),
          },
          signature,
        }),
      "SIGNATURE_MISMATCH",
    );
    expect((await gate.consume({ intent: prepared.intent, signature })).recoveredSigner).toBe(
      account.address,
    );
  });

  test("denies every clearance invalidation or time rollback between signing and consumption", async () => {
    const postcheckFailures: Partial<ClearanceRegistrySnapshot>[] = [
      { stored: { ...storedSnapshot(), revoked: true } },
      { stored: null },
      { stored: { ...storedSnapshot(), verdict: `0x${"00".repeat(32)}` } },
      { exactMatch: false },
      { blockTimestamp: parseUnixTimestamp(clearance.expiresAt) },
      { blockNumber: 11_699_999n },
    ];
    for (const failure of postcheckFailures) {
      const gate = service(new ScriptedReader([snapshot(), snapshot(undefined, failure)]));
      const prepared = await gate.prepare(proposal());
      await expectCode(
        async () =>
          gate.consume({ intent: prepared.intent, signature: await signPrepared(prepared) }),
        "CLEARANCE_INVALIDATED",
      );
    }

    const expiryGate = service(
      new ScriptedReader([
        snapshot(),
        snapshot(undefined, {
          blockNumber: 11_700_003n,
          blockTimestamp: parseUnixTimestamp("1788548300"),
        }),
      ]),
    );
    const expiring = await expiryGate.prepare(proposal());
    await expectCode(
      async () =>
        expiryGate.consume({ intent: expiring.intent, signature: await signPrepared(expiring) }),
      "INTENT_EXPIRED",
    );
  });

  test("atomically permits exactly one concurrent consumer", async () => {
    const gate = service(
      new ScriptedReader([
        snapshot(),
        snapshot(undefined, { blockNumber: 11_700_001n }),
        snapshot(undefined, { blockNumber: 11_700_002n }),
      ]),
    );
    const prepared = await gate.prepare(proposal());
    const signature = await signPrepared(prepared);
    const results = await Promise.allSettled([
      gate.consume({ intent: prepared.intent, signature }),
      gate.consume({ intent: prepared.intent, signature }),
    ]);
    expect(results.filter(({ status }) => status === "fulfilled")).toHaveLength(1);
    const rejected = results.filter(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    expect(rejected).toHaveLength(1);
    expect(rejected[0]?.reason).toMatchObject({ code: "REPLAY_REJECTED" });
  });
});
