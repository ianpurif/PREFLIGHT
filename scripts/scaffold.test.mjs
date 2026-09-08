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

test("P3-P8 are load-bearing and the product boundary remains non-authoritative", async () => {
  const workflow = await readFile(
    new URL("integrations/chainlink-cre/src/workflow.ts", root),
    "utf8",
  );
  const confidential = await readFile(
    new URL("integrations/chainlink-cre/src/confidential-evaluation.ts", root),
    "utf8",
  );
  const contract = await readFile(new URL("contracts/src/RovaultaRegistry.sol", root), "utf8");
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
  const agent = await readFile(new URL("apps/api/src/agent/deployment-agent.ts", root), "utf8");
  const agentProvider = await readFile(
    new URL("apps/api/src/agent/openai-responses-model.ts", root),
    "utf8",
  );
  const tools = await readFile(new URL("apps/api/src/agent/tools.ts", root), "utf8");
  const web = await readFile(new URL("apps/web/src/app/page.tsx", root), "utf8");
  const landing = await readFile(new URL("apps/web/src/app/landing-page.tsx", root), "utf8");
  const onboarding = await readFile(new URL("apps/web/src/app/onboarding-flow.tsx", root), "utf8");
  const apiClient = await readFile(new URL("apps/web/src/app/api-client.ts", root), "utf8");
  const ledgerPage = await readFile(new URL("apps/web/src/app/p5-ledger/page.tsx", root), "utf8");
  const realWorkspace = await readFile(
    new URL("apps/web/src/app/real-workspace.tsx", root),
    "utf8",
  );
  const fixtureRoute = await readFile(
    new URL("apps/web/src/app/dev-fixtures/evaluate/page.tsx", root),
    "utf8",
  );
  const applicationStore = await readFile(
    new URL("apps/api/src/application/store.ts", root),
    "utf8",
  );
  const applicationLifecycle = await readFile(
    new URL("apps/api/test/application-lifecycle.test.ts", root),
    "utf8",
  );
  const productApp = await readFile(new URL("apps/web/src/app/product-app.tsx", root), "utf8");
  const evaluatePage = await readFile(
    new URL("apps/web/src/app/app/evaluate/page.tsx", root),
    "utf8",
  );
  const judge = await readFile(new URL("apps/web/src/app/judge-dashboard.tsx", root), "utf8");
  const twin = await readFile(new URL("apps/web/src/app/digital-twin.tsx", root), "utf8");
  const p6Browser = await readFile(new URL("tests/e2e/p6-judge-path.spec.ts", root), "utf8");
  const p7Browser = await readFile(
    new URL("tests/e2e/p7-deterministic-demo.spec.ts", root),
    "utf8",
  );
  const p7Demo = await readFile(new URL("scripts/p7-demo.mjs", root), "utf8");
  const p7Fixture = await readFile(new URL("apps/api/scripts/p7-demo-fixture.ts", root), "utf8");
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
  assert.match(agent, /this\.#releaseService\.prepare/);
  assert.match(agent, /LEDGER_APPROVAL_REQUIRED/);
  assert.match(agent, /resolvePublicRequest/);
  assert.match(agent, /formatPublicRequest/);
  assert.match(agentProvider, /store: false/);
  assert.doesNotMatch(agent, /this\.#releaseService\.consume/);
  for (const name of [
    "resolveDeploymentTarget",
    "getDeploymentContext",
    "getEvaluationStatus",
    "getClearance",
    "prepareDeploymentIntent",
    "getLedgerAuthorizationStatus",
  ]) {
    assert.match(tools, new RegExp(name));
  }
  assert.doesNotMatch(tools, /recordClearance|revokeClearance|release\/consume|signTypedData/);
  assert.doesNotMatch(
    `${ledger}\n${ledgerTransport}\n${strictAction}\n${release}`,
    /@ledgerhq\/hw-|personal_sign/,
  );
  assert.match(web, /LandingPage/);
  assert.match(landing, /Get started/);
  assert.match(onboarding, /auth\/register/);
  assert.match(apiClient, /credentials: "include"/);
  assert.match(ledgerPage, /credentials: "include"/);
  const connectBlock =
    ledgerPage.match(
      /async function connect\(\) \{[\s\S]*?\n\x20{2}\}\n\n\x20{2}async function prepare/,
    )?.[0] ?? "";
  assert.doesNotMatch(connectBlock, /setPrepared\(null\)/);
  assert.ok(realWorkspace.includes("/releases/prepare"));
  assert.doesNotMatch(realWorkspace, /createDemoPublicData|JudgeDashboard/);
  assert.match(fixtureRoute, /ROVAULTA_ENABLE_DEMO_ROUTES/);
  assert.match(fixtureRoute, /NODE_ENV === "production"/);
  assert.match(applicationStore, /createCipheriv/);
  assert.match(applicationStore, /account_id/);
  assert.match(applicationLifecycle, /isolates resources between accounts/);
  assert.match(productApp, /ProductApp/);
  assert.match(evaluatePage, /ProductApp/);
  assert.match(judge, /CLEARANCE_BINDING_MISMATCH/);
  assert.match(judge, /Physical device: not demonstrated/);
  assert.match(judge, /CRE authenticated simulation evidence/);
  assert.match(twin, /public behavior points/);
  assert.match(p6Browser, /hands an actual prepared response/);
  assert.match(p7Browser, /clean startup/);
  assert.match(p7Browser, /late prepared response/);
  assert.match(p7Demo, /demo:setup/);
  assert.match(p7Demo, /demo:reset/);
  assert.match(p7Fixture, /nonceFactory/);
  assert.match(p7Fixture, /CLEARANCE_BINDING_MISMATCH/);
  assert.doesNotMatch(judge, /envelopeBlindingSecret|warehouseBounds|payloadGreaterThanGrams/);
  assert.doesNotMatch(p5Web, /Canvas|digital.?twin|activateRobot|robotActivation/);
});
