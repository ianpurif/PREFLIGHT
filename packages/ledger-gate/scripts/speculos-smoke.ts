import { deviceControllerClientFactory } from "@ledgerhq/speculos-device-controller";
import {
  createLedgerBrowserDependencies,
  createLedgerTransportRuntime,
  LedgerBrowserAdapter,
  parseLedgerTransportConfig,
} from "../src/index.js";

const speculosUrl = process.env.ROVAULTA_SPECULOS_URL || "http://127.0.0.1:5000";
const transport = createLedgerTransportRuntime(
  parseLedgerTransportConfig("speculos", speculosUrl, "test"),
  "test",
);
const adapter = new LedgerBrowserAdapter(
  "",
  process.env.NEXT_PUBLIC_LEDGER_DERIVATION_PATH || "44'/60'/0'/0/0",
  createLedgerBrowserDependencies(transport),
);
const controller = deviceControllerClientFactory(speculosUrl, {
  clientHeader: "rovaulta-p5-speculos-smoke",
  timeoutMs: 5_000,
});

try {
  const connecting = adapter.connect();
  await Bun.sleep(2_500);
  await controller.buttonFactory().pressSequence(["right", "right", "both"], 350);
  const session = await connecting;
  process.stdout.write(`${JSON.stringify(session, null, 2)}\n`);
} finally {
  await adapter.disconnect();
}

// DMK transports may retain background timers after a closed test session.
process.exit(0);
