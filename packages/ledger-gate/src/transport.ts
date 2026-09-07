"use client";

import {
  type DeviceManagementKit,
  DeviceManagementKitBuilder,
  DeviceModelId,
  type TransportIdentifier,
} from "@ledgerhq/device-management-kit";
import {
  speculosIdentifier,
  speculosTransportFactory,
} from "@ledgerhq/device-transport-kit-speculos";
import { webHidTransportFactory } from "@ledgerhq/device-transport-kit-web-hid";
import { failLedger } from "./errors";

export type LedgerTransportKind = "webhid" | "speculos";

export type LedgerTransportConfig =
  | Readonly<{ kind: "webhid" }>
  | Readonly<{ kind: "speculos"; url: string }>;

export interface LedgerTransportRuntime {
  readonly kind: LedgerTransportKind;
  readonly identifier?: TransportIdentifier;
  readonly isSupported: () => boolean;
  readonly createDmk: () => DeviceManagementKit;
}

export const DEFAULT_SPECULOS_URL = "http://127.0.0.1:5000" as const;

function parseLoopbackSpeculosUrl(input: string): string {
  let url: URL;
  try {
    url = new URL(input);
  } catch {
    return failLedger("DEVICE_CONNECTION_FAILED", "Speculos URL is malformed");
  }
  if (
    url.protocol !== "http:" ||
    (url.hostname !== "127.0.0.1" && url.hostname !== "localhost") ||
    url.username !== "" ||
    url.password !== "" ||
    (url.pathname !== "/" && url.pathname !== "") ||
    url.search !== "" ||
    url.hash !== ""
  ) {
    return failLedger(
      "DEVICE_CONNECTION_FAILED",
      "Speculos transport is restricted to a local HTTP endpoint",
    );
  }
  return url.origin;
}

function assertSpeculosTestEnvironment(runtimeEnvironment: string | undefined): void {
  if (runtimeEnvironment !== "development" && runtimeEnvironment !== "test") {
    failLedger(
      "DEVICE_CONNECTION_FAILED",
      "Speculos transport is restricted to development and test environments",
    );
  }
}

export function parseLedgerTransportConfig(
  kind: string | undefined,
  speculosUrl: string | undefined,
  runtimeEnvironment: string | undefined = "production",
): LedgerTransportConfig {
  const normalizedKind = kind?.trim().toLowerCase() || "webhid";
  if (normalizedKind === "webhid") return Object.freeze({ kind: "webhid" });
  if (normalizedKind === "speculos") {
    assertSpeculosTestEnvironment(runtimeEnvironment);
    return Object.freeze({
      kind: "speculos",
      url: parseLoopbackSpeculosUrl(speculosUrl?.trim() || DEFAULT_SPECULOS_URL),
    });
  }
  return failLedger(
    "DEVICE_CONNECTION_FAILED",
    "Ledger transport must be exactly webhid or speculos",
  );
}

export function createLedgerTransportRuntime(
  config: LedgerTransportConfig,
  runtimeEnvironment: string | undefined = "production",
): LedgerTransportRuntime {
  if (config.kind === "speculos") {
    assertSpeculosTestEnvironment(runtimeEnvironment);
    const url = parseLoopbackSpeculosUrl(config.url);
    return Object.freeze({
      kind: "speculos",
      identifier: speculosIdentifier,
      isSupported: () => true,
      createDmk: () =>
        new DeviceManagementKitBuilder()
          .addTransport(speculosTransportFactory(url, false, DeviceModelId.NANO_SP))
          .build(),
    });
  }
  return Object.freeze({
    kind: "webhid",
    isSupported: () => typeof navigator !== "undefined" && "hid" in navigator,
    createDmk: () => new DeviceManagementKitBuilder().addTransport(webHidTransportFactory).build(),
  });
}
