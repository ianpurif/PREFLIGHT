import { describe, expect, test } from "bun:test";
import type {
  ContextModule,
  TypedDataClearSignContext,
  TypedDataContext,
} from "@ledgerhq/context-module";
import { DeviceActionStatus, type DeviceManagementKit } from "@ledgerhq/device-management-kit";
import {
  type SignerEth,
  type SignTypedDataDAReturnType,
  type SignTypedDataDAState,
  SignTypedDataDAStateStep,
} from "@ledgerhq/device-signer-kit-ethereum";
import {
  buildDeploymentTypedData,
  PREFLIGHT_DEPLOYMENT_INTENT_TYPES,
  PREFLIGHT_SEPOLIA_DEPLOYMENT,
} from "@preflight/chain-client";
import {
  CLEARANCE_RECORD_SCHEMA_VERSION,
  createDeploymentIntent,
  digestEvaluationInputs,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  parseClearanceId,
  parseClearanceRecord,
  parseDeploymentNonce,
  parseEvaluationId,
  parseEvaluatorVersionId,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeCommitment,
  parseSafetyEnvelopeId,
  parseSiteId,
  parseUnixTimestamp,
} from "@preflight/domain";
import { Observable, of } from "rxjs";
import clearSigningDescriptor from "../clear-signing/eip712-preflight-deployment-intent.json";
import { GuardedClearSigningContext } from "../src/clear-signing-context.js";
import {
  LedgerBrowserAdapter,
  type LedgerBrowserDependencies,
  LedgerGateError,
  parsePreparedLedgerSigningRequest,
} from "../src/index.js";
import { runStrictTypedDataAction } from "../src/strict-action.js";

function makeAction(states: readonly SignTypedDataDAState[]) {
  let cancelled = false;
  const action = {
    observable: new Observable<SignTypedDataDAState>((subscriber) => {
      queueMicrotask(() => {
        for (const state of states) {
          if (cancelled) break;
          subscriber.next(state);
        }
        subscriber.complete();
      });
    }),
    cancel: () => {
      cancelled = true;
    },
  } as SignTypedDataDAReturnType;
  return { action, wasCancelled: () => cancelled };
}

const resolvedClearSigningAttempt = Object.freeze({
  begin: () => undefined,
  assertResolved: () => undefined,
});

const pending = (
  step: Exclude<SignTypedDataDAStateStep, SignTypedDataDAStateStep.WEB3_CHECKS_OPT_IN_RESULT>,
): SignTypedDataDAState => ({
  status: DeviceActionStatus.Pending,
  intermediateValue: {
    step,
    requiredUserInteraction: "none" as never,
  },
});

const inputs = {
  schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
  siteId: parseSiteId("site:ledger-test"),
  robotId: parseRobotId("robot:ledger-test"),
  robotBuildId: parseRobotBuildId("robot-build:ledger-test"),
  robotBuildDigest: parseRobotBuildDigest(`sha256:${"11".repeat(32)}`),
  safetyEnvelopeId: parseSafetyEnvelopeId("safety-envelope:ledger-test"),
  safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(`sha256:${"22".repeat(32)}`),
  evaluatorVersion: parseEvaluatorVersionId("evaluator-version:ledger-test"),
} as const;
const clearance = parseClearanceRecord({
  schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
  clearanceId: parseClearanceId("clearance:ledger-test"),
  evaluationId: parseEvaluationId("evaluation:ledger-test"),
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  issuedAt: "1788547000",
  expiresAt: "1788550800",
});
const intent = createDeploymentIntent(clearance, {
  targetEnvironment: "sepolia",
  nonce: parseDeploymentNonce("ledger_test_nonce_0001"),
  issuedAt: parseUnixTimestamp("1788547100"),
  expiresAt: parseUnixTimestamp("1788549000"),
});
const signer = "0x0000000000000000000000000000000000000001";

describe("strict Ledger typed-data action", () => {
  test("accepts a completed full typed-data path and returns canonical signature", async () => {
    const { action, wasCancelled } = makeAction([
      pending(SignTypedDataDAStateStep.BUILD_CONTEXT),
      pending(SignTypedDataDAStateStep.PROVIDE_CONTEXT),
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
      pending(SignTypedDataDAStateStep.DETECT_BLIND_SIGNING),
      {
        status: DeviceActionStatus.Completed,
        output: { r: `0x${"11".repeat(32)}`, s: `0x${"22".repeat(32)}`, v: 27 },
      },
    ]);
    const result = await runStrictTypedDataAction(action, resolvedClearSigningAttempt);
    expect(result.signature).toBe(`0x${"11".repeat(32)}${"22".repeat(32)}1b`);
    expect(result.steps).toContain(SignTypedDataDAStateStep.SIGN_TYPED_DATA);
    expect(wasCancelled()).toBe(false);
  });

  test("cancels and rejects the signer-kit legacy fallback before accepting output", async () => {
    const { action, wasCancelled } = makeAction([
      pending(SignTypedDataDAStateStep.BUILD_CONTEXT),
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA_LEGACY),
      {
        status: DeviceActionStatus.Completed,
        output: { r: `0x${"11".repeat(32)}`, s: `0x${"22".repeat(32)}`, v: 27 },
      },
    ]);
    await expect(
      runStrictTypedDataAction(action, resolvedClearSigningAttempt),
    ).rejects.toMatchObject({
      code: "CLEAR_SIGNING_UNAVAILABLE",
    });
    expect(wasCancelled()).toBe(true);
  });

  test("rejects human refusal without retry", async () => {
    const { action, wasCancelled } = makeAction([
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
      {
        status: DeviceActionStatus.Error,
        error: { errorCode: "6982" } as never,
      },
    ]);
    await expect(
      runStrictTypedDataAction(action, resolvedClearSigningAttempt),
    ).rejects.toMatchObject({
      code: "HUMAN_REJECTED",
    });
    expect(wasCancelled()).toBe(false);
  });

  test("rejects malformed or non-full-path signer responses", async () => {
    const malformed = makeAction([
      pending(SignTypedDataDAStateStep.BUILD_CONTEXT),
      pending(SignTypedDataDAStateStep.PROVIDE_CONTEXT),
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
      {
        status: DeviceActionStatus.Completed,
        output: { r: "0x12", s: `0x${"22".repeat(32)}`, v: 27 },
      },
    ]);
    await expect(
      runStrictTypedDataAction(malformed.action, resolvedClearSigningAttempt),
    ).rejects.toMatchObject({ code: "MALFORMED_SIGNATURE" });
    const skipped = makeAction([
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
      {
        status: DeviceActionStatus.Completed,
        output: { r: `0x${"11".repeat(32)}`, s: `0x${"22".repeat(32)}`, v: 27 },
      },
    ]);
    await expect(
      runStrictTypedDataAction(skipped.action, resolvedClearSigningAttempt),
    ).rejects.toMatchObject({ code: "CLEAR_SIGNING_UNAVAILABLE" });
  });

  test("reconstructs prepared requests and rejects tampered digests", () => {
    const prepared = buildDeploymentTypedData(intent, signer);
    expect(parsePreparedLedgerSigningRequest(prepared)).toEqual(prepared);
    expect(() =>
      parsePreparedLedgerSigningRequest({
        ...prepared,
        typedDataDigest: `0x${"00".repeat(32)}`,
      }),
    ).toThrow(LedgerGateError);
  });
});

function adapterHarness(
  options: {
    appName?: string;
    descriptorResolved?: boolean;
    signStates?: readonly SignTypedDataDAState[];
    webHid?: boolean;
  } = {},
) {
  const events: string[] = [];
  const signAction = makeAction(
    options.signStates ?? [
      pending(SignTypedDataDAStateStep.BUILD_CONTEXT),
      pending(SignTypedDataDAStateStep.PROVIDE_CONTEXT),
      pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
      {
        status: DeviceActionStatus.Completed,
        output: { r: `0x${"11".repeat(32)}`, s: `0x${"22".repeat(32)}`, v: 27 },
      },
    ],
  );
  const signer = {
    getAddress: (_path: string, request: { checkOnDevice: boolean; chainId: number }) => {
      events.push(`address:${request.checkOnDevice}:${request.chainId}`);
      return {
        observable: of({
          status: DeviceActionStatus.Completed,
          output: { address: signerAddress },
        }),
      };
    },
    signTypedData: () => {
      events.push("sign");
      return signAction.action;
    },
  } as unknown as SignerEth;
  const dmk = {
    isEnvironmentSupported: () => true,
    startDiscovering: () => {
      events.push("discover");
      return of({ id: "device" });
    },
    stopDiscovering: async () => {
      events.push("stop-discovery");
    },
    connect: async () => {
      events.push("connect");
      return "session:test";
    },
    getDeviceSessionState: () =>
      of(
        {
          sessionStateType: 0,
        },
        {
          sessionStateType: 1,
          deviceModelId: "nanoSPlus",
          firmwareVersion: { os: "1.1.0" },
          currentApp: { name: options.appName ?? "Ethereum", version: "1.14.0" },
        },
      ),
    getVersion: async () => "1.9.0",
    disconnect: async () => {
      events.push("disconnect");
    },
    close: () => {
      events.push("close");
    },
  } as unknown as DeviceManagementKit;
  const dependencies: LedgerBrowserDependencies = {
    hasWebHid: () => options.webHid ?? true,
    createDmk: () => dmk,
    createSigner: () => ({
      signer,
      clearSigningAttempt: {
        begin: () => events.push("clear-signing-begin"),
        assertResolved: () => {
          if (options.descriptorResolved === false) {
            throw new LedgerGateError(
              "CLEAR_SIGNING_UNAVAILABLE",
              "Mock descriptor was not resolved",
            );
          }
        },
      },
    }),
  };
  return { dependencies, events, wasSignCancelled: signAction.wasCancelled };
}

const signerAddress = "0x0000000000000000000000000000000000000001";

describe("Ledger browser adapter lifecycle", () => {
  test("connects with explicit on-device address confirmation and disconnects cleanly", async () => {
    const { dependencies, events } = adapterHarness();
    const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
    const session = await adapter.connect();
    expect(session).toMatchObject({
      signerAddress,
      ethereumAppVersion: "1.14.0",
      dmkVersion: "1.9.0",
    });
    expect(events).toContain("address:true:11155111");
    await adapter.disconnect();
    expect(adapter.session).toBeNull();
    expect(events).toContain("disconnect");
    expect(events).toContain("close");
  });

  test("rejects unsupported transport without constructing a DMK", async () => {
    const { dependencies, events } = adapterHarness({ webHid: false });
    const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
    await expect(adapter.connect()).rejects.toMatchObject({ code: "UNSUPPORTED_BROWSER" });
    expect(events).toEqual([]);
  });

  test("requires an issued origin token and an authorized connected signer before device signing", async () => {
    const emptyTokenHarness = adapterHarness();
    const emptyToken = new LedgerBrowserAdapter("", undefined, emptyTokenHarness.dependencies);
    await emptyToken.connect();
    await expect(
      emptyToken.sign(buildDeploymentTypedData(intent, signerAddress)),
    ).rejects.toMatchObject({ code: "CLEAR_SIGNING_UNAVAILABLE" });
    expect(emptyTokenHarness.events).not.toContain("sign");
    await emptyToken.disconnect();

    const mismatchHarness = adapterHarness();
    const mismatch = new LedgerBrowserAdapter(
      "ledger-origin-token",
      undefined,
      mismatchHarness.dependencies,
    );
    await mismatch.connect();
    await expect(
      mismatch.sign(buildDeploymentTypedData(intent, "0x0000000000000000000000000000000000000002")),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED_SIGNER" });
    expect(mismatchHarness.events).not.toContain("sign");
    await mismatch.disconnect();
  });

  test("fails closed and cleans up when the Ethereum app is unavailable", async () => {
    const { dependencies, events } = adapterHarness({ appName: "Bitcoin" });
    const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
    await expect(adapter.connect()).rejects.toMatchObject({ code: "ETHEREUM_APP_UNAVAILABLE" });
    expect(events).toContain("disconnect");
    expect(events).toContain("close");
  });

  test("maps physical rejection and generic signing failure without retry", async () => {
    for (const [errorCode, expected] of [
      ["6985", "HUMAN_REJECTED"],
      ["6a80", "SIGNING_FAILED"],
    ] as const) {
      const { dependencies, events } = adapterHarness({
        signStates: [
          pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
          { status: DeviceActionStatus.Error, error: { errorCode } as never },
        ],
      });
      const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
      await adapter.connect();
      await expect(
        adapter.sign(buildDeploymentTypedData(intent, signerAddress)),
      ).rejects.toMatchObject({
        code: expected,
      });
      expect(events.filter((event) => event === "sign")).toHaveLength(1);
      await adapter.disconnect();
    }
  });

  test("rejects a malformed device signature response", async () => {
    const { dependencies } = adapterHarness({
      signStates: [
        pending(SignTypedDataDAStateStep.BUILD_CONTEXT),
        pending(SignTypedDataDAStateStep.PROVIDE_CONTEXT),
        pending(SignTypedDataDAStateStep.SIGN_TYPED_DATA),
        {
          status: DeviceActionStatus.Completed,
          output: { r: "0x12", s: `0x${"22".repeat(32)}`, v: 27 },
        },
      ],
    });
    const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
    await adapter.connect();
    await expect(
      adapter.sign(buildDeploymentTypedData(intent, signerAddress)),
    ).rejects.toMatchObject({
      code: "MALFORMED_SIGNATURE",
    });
    await adapter.disconnect();
  });

  test("cancels before signing when the exact Clear Signing descriptor is unresolved", async () => {
    const { dependencies, wasSignCancelled } = adapterHarness({ descriptorResolved: false });
    const adapter = new LedgerBrowserAdapter("ledger-origin-token", undefined, dependencies);
    await adapter.connect();
    await expect(
      adapter.sign(buildDeploymentTypedData(intent, signerAddress)),
    ).rejects.toMatchObject({
      code: "CLEAR_SIGNING_UNAVAILABLE",
    });
    expect(wasSignCancelled()).toBe(true);
    await adapter.disconnect();
  });
});

describe("Ledger Clear Signing descriptor candidate", () => {
  test("constructs the official context module for Ethereum", () => {
    expect(() => new GuardedClearSigningContext("ledger-origin-token")).not.toThrow();
  });

  test("matches the exact EIP-712 domain, schema, and required display fields", () => {
    const schema = clearSigningDescriptor.context.eip712.schemas[0];
    expect(clearSigningDescriptor.context.eip712.domain).toEqual({
      name: "Preflight",
      version: "1",
      chainId: PREFLIGHT_SEPOLIA_DEPLOYMENT.chainId,
      verifyingContract: PREFLIGHT_SEPOLIA_DEPLOYMENT.verifyingContract,
    });
    expect(schema?.primaryType).toBe("DeploymentIntent");
    expect(schema?.types.DeploymentIntent).toEqual(
      PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map((field) => ({ ...field })),
    );
    expect(clearSigningDescriptor.display.formats.DeploymentIntent.required).toEqual(
      PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map((field) => field.name),
    );
  });

  test("resolves only an exact runtime descriptor with all display filters", async () => {
    const paths = PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map((field) => field.name);
    const success: Extract<TypedDataClearSignContext, { type: "success" }> = {
      type: "success",
      messageInfo: {
        displayName: "Preflight deployment",
        filtersCount: paths.length,
        signature: "00",
      },
      filters: Object.fromEntries(
        paths.map((path) => [path, { type: "raw", displayName: path, path, signature: "00" }]),
      ),
      trustedNamesAddresses: {},
      tokens: {},
      calldatas: {},
    };
    const context = {
      deviceModelId: "nanoSPlus",
      verifyingContract: PREFLIGHT_SEPOLIA_DEPLOYMENT.verifyingContract,
      chainId: PREFLIGHT_SEPOLIA_DEPLOYMENT.chainId,
      version: "v1",
      schema: {
        DeploymentIntent: PREFLIGHT_DEPLOYMENT_INTENT_TYPES.DeploymentIntent.map((field) => ({
          ...field,
        })),
      },
      fieldsValues: [],
    } as unknown as TypedDataContext;
    const delegate = {
      getTypedDataFilters: async () => success,
    } as unknown as ContextModule;
    const guarded = new GuardedClearSigningContext("ledger-origin-token", delegate);
    guarded.begin();
    await guarded.getTypedDataFilters(context);
    expect(() => guarded.assertResolved()).not.toThrow();

    const partial = {
      ...success,
      messageInfo: { ...success.messageInfo, filtersCount: paths.length - 1 },
      filters: Object.fromEntries(Object.entries(success.filters).slice(0, -1)),
    } as TypedDataClearSignContext;
    const partialGuard = new GuardedClearSigningContext("ledger-origin-token", {
      getTypedDataFilters: async () => partial,
    } as unknown as ContextModule);
    partialGuard.begin();
    await partialGuard.getTypedDataFilters(context);
    expect(() => partialGuard.assertResolved()).toThrow(LedgerGateError);

    const mismatched = {
      ...success,
      filters: {
        ...success.filters,
        expiresAt: { ...success.filters.expiresAt, path: "issuedAt" },
      },
    } as TypedDataClearSignContext;
    const mismatchedGuard = new GuardedClearSigningContext("ledger-origin-token", {
      getTypedDataFilters: async () => mismatched,
    } as unknown as ContextModule);
    mismatchedGuard.begin();
    await mismatchedGuard.getTypedDataFilters(context);
    expect(() => mismatchedGuard.assertResolved()).toThrow(LedgerGateError);
  });
});
