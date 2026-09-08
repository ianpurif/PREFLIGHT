"use client";

import {
  DeviceActionStatus,
  type DeviceManagementKit,
  type DeviceSessionId,
  DeviceSessionStateType,
  type TransportIdentifier,
} from "@ledgerhq/device-management-kit";
import {
  type SignerEth,
  SignerEthBuilder,
  type TypedData,
} from "@ledgerhq/device-signer-kit-ethereum";
import {
  buildDeploymentTypedData,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  type PreparedLedgerSigningRequest,
} from "@rovaulta/chain-client";
import { filter, firstValueFrom, lastValueFrom } from "rxjs";
import { type ClearSigningAttempt, GuardedClearSigningContext } from "./clear-signing-context";
import { failLedger, LedgerGateError, normalizeLedgerError } from "./errors";
import { runStrictTypedDataAction, type StrictLedgerSignature } from "./strict-action";
import {
  createLedgerTransportRuntime,
  type LedgerTransportKind,
  type LedgerTransportRuntime,
} from "./transport";

export const DEFAULT_ETHEREUM_DERIVATION_PATH = "44'/60'/0'/0/0" as const;

export interface LedgerSession {
  readonly signerAddress: `0x${string}`;
  readonly deviceModel: string;
  readonly firmwareVersion: string | null;
  readonly ethereumAppVersion: string;
  readonly dmkVersion: string;
  readonly transport: LedgerTransportKind;
  readonly executionEnvironment: "physical-device" | "official-device-simulator";
}

export interface LedgerDeviceApproval extends StrictLedgerSignature {
  readonly signerAddress: `0x${string}`;
  readonly protocolIntentDigest: string;
  readonly typedDataDigest: `0x${string}`;
}

export interface LedgerBrowserDependencies {
  readonly transportKind: LedgerTransportKind;
  readonly transportIdentifier?: TransportIdentifier;
  readonly isTransportSupported: () => boolean;
  readonly createDmk: () => DeviceManagementKit;
  readonly createSigner: (options: {
    readonly dmk: DeviceManagementKit;
    readonly sessionId: DeviceSessionId;
    readonly originToken: string;
  }) => {
    readonly signer: SignerEth;
    readonly clearSigningAttempt: ClearSigningAttempt;
  };
}

type CreateSignerOptions = Parameters<LedgerBrowserDependencies["createSigner"]>[0];

const DEFAULT_WEBHID_RUNTIME = createLedgerTransportRuntime({ kind: "webhid" });

const DEFAULT_BROWSER_DEPENDENCIES: LedgerBrowserDependencies = Object.freeze({
  transportKind: DEFAULT_WEBHID_RUNTIME.kind,
  isTransportSupported: DEFAULT_WEBHID_RUNTIME.isSupported,
  createDmk: DEFAULT_WEBHID_RUNTIME.createDmk,
  createSigner: ({ dmk, sessionId, originToken }: CreateSignerOptions) => {
    const clearSigningContext = new GuardedClearSigningContext(originToken);
    const signer = new SignerEthBuilder({
      dmk,
      sessionId,
      ...(originToken === "" ? {} : { originToken }),
    })
      .withContextModule(clearSigningContext)
      .build();
    return { signer, clearSigningAttempt: clearSigningContext };
  },
});

export function createLedgerBrowserDependencies(
  transport: LedgerTransportRuntime,
): LedgerBrowserDependencies {
  return Object.freeze({
    transportKind: transport.kind,
    ...(transport.identifier === undefined ? {} : { transportIdentifier: transport.identifier }),
    isTransportSupported: transport.isSupported,
    createDmk: transport.createDmk,
    createSigner: DEFAULT_BROWSER_DEPENDENCIES.createSigner,
  });
}

export function parsePreparedLedgerSigningRequest(input: unknown): PreparedLedgerSigningRequest {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failLedger("SIGNING_FAILED", "Prepared signing request is malformed");
  }
  const value = input as Record<string, unknown>;
  const exact = buildDeploymentTypedData(value.intent, String(value.authorizedSigner));
  if (
    value.protocolIntentDigest !== exact.protocolIntentDigest ||
    value.typedDataDigest !== exact.typedDataDigest
  ) {
    return failLedger("SIGNING_FAILED", "Prepared signing request was altered");
  }
  return exact;
}

function cloneTypedData(request: PreparedLedgerSigningRequest): TypedData {
  return {
    domain: { ...request.typedData.domain },
    types: {
      DeploymentIntent: request.typedData.types.DeploymentIntent.map((field) => ({ ...field })),
    },
    primaryType: request.typedData.primaryType,
    message: { ...request.typedData.message },
  };
}

export class LedgerBrowserAdapter {
  readonly #originToken: string;
  readonly #derivationPath: string;
  readonly #dependencies: LedgerBrowserDependencies;
  #dmk: DeviceManagementKit | null = null;
  #sessionId: DeviceSessionId | null = null;
  #signer: SignerEth | null = null;
  #clearSigningAttempt: ClearSigningAttempt | null = null;
  #session: LedgerSession | null = null;
  #busy = false;

  constructor(
    originToken: string,
    derivationPath: string = DEFAULT_ETHEREUM_DERIVATION_PATH,
    dependencies: LedgerBrowserDependencies = DEFAULT_BROWSER_DEPENDENCIES,
  ) {
    this.#originToken = originToken.trim();
    this.#derivationPath = derivationPath;
    this.#dependencies = dependencies;
  }

  get session(): LedgerSession | null {
    return this.#session;
  }

  /** WebHID callers must invoke this directly from a human gesture. */
  async connect(): Promise<LedgerSession> {
    if (this.#busy) {
      return failLedger("DEVICE_CONNECTION_FAILED", "A Ledger operation is already running");
    }
    if (!this.#dependencies.isTransportSupported()) {
      return failLedger(
        this.#dependencies.transportKind === "webhid"
          ? "UNSUPPORTED_BROWSER"
          : "DEVICE_CONNECTION_FAILED",
        this.#dependencies.transportKind === "webhid"
          ? "WebHID requires a supported Chromium browser"
          : "Ledger Speculos official device simulator is unavailable",
      );
    }
    this.#busy = true;
    try {
      await this.disconnect();
      const dmk = this.#dependencies.createDmk();
      if (!dmk.isEnvironmentSupported()) {
        dmk.close();
        return failLedger(
          this.#dependencies.transportKind === "webhid"
            ? "UNSUPPORTED_BROWSER"
            : "DEVICE_CONNECTION_FAILED",
          this.#dependencies.transportKind === "webhid"
            ? "Ledger WebHID is unavailable in this browser"
            : "Ledger Speculos official device simulator is unavailable",
        );
      }
      this.#dmk = dmk;
      const discoveredDevice = await firstValueFrom(
        dmk.startDiscovering(
          this.#dependencies.transportIdentifier === undefined
            ? {}
            : { transport: this.#dependencies.transportIdentifier },
        ),
      );
      await dmk.stopDiscovering();
      const sessionId = await dmk.connect({ device: discoveredDevice });
      this.#sessionId = sessionId;
      const { signer, clearSigningAttempt } = this.#dependencies.createSigner({
        dmk,
        sessionId,
        originToken: this.#originToken,
      });
      this.#signer = signer;
      this.#clearSigningAttempt = clearSigningAttempt;
      const addressState = await lastValueFrom(
        signer.getAddress(this.#derivationPath, {
          checkOnDevice: true,
          chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
        }).observable,
      );
      if (addressState.status === DeviceActionStatus.Error) {
        throw normalizeLedgerError(addressState.error);
      }
      if (addressState.status !== DeviceActionStatus.Completed) {
        return failLedger("ETHEREUM_APP_UNAVAILABLE", "Ledger Ethereum app is not ready");
      }
      const deviceState = await firstValueFrom(
        dmk
          .getDeviceSessionState({ sessionId })
          .pipe(filter((state) => state.sessionStateType !== DeviceSessionStateType.Connected)),
      );
      if (deviceState.currentApp.name !== "Ethereum") {
        return failLedger("ETHEREUM_APP_UNAVAILABLE", "Ledger Ethereum app is not active");
      }
      const session = Object.freeze({
        signerAddress: addressState.output.address,
        deviceModel: String(deviceState.deviceModelId),
        firmwareVersion: deviceState.firmwareVersion?.os ?? null,
        ethereumAppVersion: deviceState.currentApp.version,
        dmkVersion: await dmk.getVersion(),
        transport: this.#dependencies.transportKind,
        executionEnvironment:
          this.#dependencies.transportKind === "webhid"
            ? "physical-device"
            : "official-device-simulator",
      });
      this.#session = session;
      return session;
    } catch (error) {
      await this.disconnect();
      if (error instanceof LedgerGateError) throw error;
      throw new LedgerGateError("DEVICE_CONNECTION_FAILED", "Ledger connection failed closed");
    } finally {
      this.#busy = false;
    }
  }

  async sign(input: unknown): Promise<LedgerDeviceApproval> {
    if (this.#busy) return failLedger("SIGNING_FAILED", "A Ledger operation is already running");
    if (this.#originToken === "") {
      return failLedger(
        "CLEAR_SIGNING_UNAVAILABLE",
        "A Ledger-issued origin token is required for Clear Signing",
      );
    }
    const request = parsePreparedLedgerSigningRequest(input);
    if (
      this.#session === null ||
      this.#signer === null ||
      this.#sessionId === null ||
      this.#clearSigningAttempt === null
    ) {
      return failLedger("DEVICE_DISCONNECTED", "Connect and verify Ledger before signing");
    }
    if (this.#session.signerAddress.toLowerCase() !== request.authorizedSigner.toLowerCase()) {
      return failLedger("UNAUTHORIZED_SIGNER", "Connected Ledger signer is not authorized");
    }
    this.#busy = true;
    try {
      this.#clearSigningAttempt.begin();
      const action = this.#signer.signTypedData(this.#derivationPath, cloneTypedData(request));
      const result = await runStrictTypedDataAction(action, this.#clearSigningAttempt);
      return Object.freeze({
        ...result,
        signerAddress: this.#session.signerAddress,
        protocolIntentDigest: request.protocolIntentDigest,
        typedDataDigest: request.typedDataDigest,
      });
    } catch (error) {
      throw normalizeLedgerError(error);
    } finally {
      this.#busy = false;
    }
  }

  async disconnect(): Promise<void> {
    const dmk = this.#dmk;
    const sessionId = this.#sessionId;
    this.#session = null;
    this.#signer = null;
    this.#clearSigningAttempt = null;
    this.#sessionId = null;
    this.#dmk = null;
    if (dmk !== null) {
      try {
        await dmk.stopDiscovering();
        if (sessionId !== null) await dmk.disconnect({ sessionId });
      } finally {
        dmk.close();
      }
    }
  }
}
