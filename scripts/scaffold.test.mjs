import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("selected partners stay limited to Chainlink and Ledger", async () => {
  const brief = await readFile(new URL("docs/product/BRIEF.md", root), "utf8");
  const decisions = await readFile(new URL("docs/planning/DECISIONS.md", root), "utf8");
  assert.match(decisions, /Chainlink \+ Ledger only/);
  assert.doesNotMatch(brief, /Uniswap|Privy|1inch|Hedera|World ID/);
});

test("critical safety language is preserved", async () => {
  const agents = await readFile(new URL("AGENTS.md", root), "utf8");
  assert.match(agents, /Never claim a simulation\/evaluation pass proves real-world robot safety/);
  assert.match(agents, /LLMs may explain\/orchestrate, never decide clearance/);
});

test("P5 uses pinned current Ledger packages without legacy LedgerJS", async () => {
  const pkg = await readFile(new URL("packages/ledger-gate/package.json", root), "utf8");
  assert.doesNotMatch(pkg, /@ledgerhq\/hw-/);
  const parsed = JSON.parse(pkg);
  assert.equal(parsed.dependencies["@ledgerhq/device-management-kit"], "1.9.0");
  assert.equal(parsed.dependencies["@ledgerhq/device-signer-kit-ethereum"], "1.18.0");
  assert.equal(parsed.dependencies["@ledgerhq/device-transport-kit-speculos"], "1.2.1");
  assert.equal(parsed.dependencies["@ledgerhq/device-transport-kit-web-hid"], "1.2.4");
  assert.equal(parsed.devDependencies["@ledgerhq/speculos-device-controller"], "0.3.0");
  assert.doesNotMatch(parsed.scripts.test, /pass-with-no-tests/);
});

test("P3-P5 are load-bearing while P6 remains deferred", async () => {
  const workflow = await readFile(
    new URL("integrations/chainlink-cre/src/workflow.ts", root),
    "utf8",
  );
  const confidential = await readFile(
    new URL("integrations/chainlink-cre/src/confidential-evaluation.ts", root),
    "utf8",
  );
  const contract = await readFile(new URL("contracts/src/PreflightRegistry.sol", root), "utf8");
  const ledger = await readFile(
    new URL("packages/ledger-gate/src/browser-adapter.ts", root),
    "utf8",
  );
  const ledgerTransport = await readFile(
    new URL("packages/ledger-gate/src/transport.ts", root),
    "utf8",
  );
  const strictAction = await readFile(
    new URL("packages/ledger-gate/src/strict-action.ts", root),
    "utf8",
  );
  const eip712 = await readFile(new URL("packages/chain-client/src/eip712.ts", root), "utf8");
  const release = await readFile(new URL("apps/api/src/release/release-service.ts", root), "utf8");
  const web = await readFile(new URL("apps/web/src/app/page.tsx", root), "utf8");
  const p5Web = await readFile(new URL("apps/web/src/app/p5-ledger/page.tsx", root), "utf8");

  assert.match(workflow, /handlerInTee/);
  assert.match(confidential, /getSecret/);
  assert.match(confidential, /CONFIDENTIAL_INPUT_SECRET_ID/);
  assert.match(confidential, /evaluateSimulation/);
  assert.doesNotMatch(confidential, /runtime\.log/);
  assert.match(contract, /recordClearance/);
  assert.match(contract, /isClearanceValidFor/);
  assert.match(contract, /revokeClearance/);
  assert.doesNotMatch(contract, /restrictedZones|commitmentBlind/);
  assert.match(ledgerTransport, /DeviceManagementKitBuilder/);
  assert.match(ledgerTransport, /webHidTransportFactory/);
  assert.match(ledgerTransport, /speculosTransportFactory/);
  assert.match(ledgerTransport, /speculosIdentifier/);
  assert.match(ledgerTransport, /127\.0\.0\.1/);
  assert.match(ledger, /\.signTypedData\(/);
  assert.match(strictAction, /SIGN_TYPED_DATA_LEGACY/);
  assert.match(strictAction, /action\.cancel\(\)/);
  assert.match(eip712, /recoverTypedDataAddress/);
  assert.match(release, /assertDeploymentIntentSignature/);
  assert.match(release, /CLEARANCE_INVALIDATED/);
  assert.doesNotMatch(
    `${ledger}\n${ledgerTransport}\n${strictAction}\n${release}`,
    /@ledgerhq\/hw-|personal_sign/,
  );
  assert.match(web, /Product behavior is intentionally not implemented/);
  assert.doesNotMatch(p5Web, /Canvas|digital.?twin|activateRobot|robotActivation/);
});
