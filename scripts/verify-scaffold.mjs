import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "AGENTS.md",
  ".codex/config.toml",
  ".agents/skills/rovaulta-exec-plan/SKILL.md",
  ".agents/skills/rovaulta-verification-loop/SKILL.md",
  "docs/planning/CURRENT.md",
  "docs/architecture/TRUST_BOUNDARIES.md",
  "docs/partners/CHAINLINK.md",
  "docs/partners/LEDGER.md",
  "docs/partners/THE_GRAPH.md",
  "apps/web/AGENTS.md",
  "apps/api/AGENTS.md",
  "packages/domain/AGENTS.md",
  "packages/simulation-core/AGENTS.md",
  "packages/ledger-gate/AGENTS.md",
  "integrations/chainlink-cre/AGENTS.md",
  "contracts/AGENTS.md",
  "contracts/README.md",
  "contracts/script/DeployRovaultaRegistry.s.sol",
  "contracts/test/RovaultaRegistry.t.sol",
  "contracts/test/RovaultaRegistryInvariant.t.sol",
  "packages/chain-client/src/eip712.ts",
  "packages/chain-client/src/registry.ts",
  "packages/chain-client/test/eip712.test.ts",
  "packages/ledger-gate/src/browser-adapter.ts",
  "packages/ledger-gate/src/clear-signing-context.ts",
  "packages/ledger-gate/src/strict-action.ts",
  "packages/ledger-gate/test/strict-action.test.ts",
  "packages/ledger-gate/clear-signing/eip712-rovaulta-deployment-intent.json",
  "apps/api/src/release/release-service.ts",
  "apps/api/src/release/nonce-store.ts",
  "apps/api/src/agent/deployment-agent.ts",
  "apps/api/src/agent/gemini-model.ts",
  "apps/api/src/agent/tools.ts",
  "apps/api/test/release-service.test.ts",
  "apps/api/test/deployment-agent.test.ts",
  "apps/api/test/gemini-model.test.ts",
  "apps/api/test/server.test.ts",
  "apps/web/src/app/page.tsx",
  "apps/web/src/app/landing-page.tsx",
  "apps/web/src/app/onboarding-flow.tsx",
  "apps/web/src/app/api-client.ts",
  "apps/web/src/app/real-workspace.tsx",
  "apps/web/src/app/dev-fixtures/evaluate/page.tsx",
  "apps/api/src/application/store.ts",
  "apps/api/src/evaluation/cre-client.ts",
  "apps/api/src/graph/provider.ts",
  "apps/api/test/application-lifecycle.test.ts",
  "apps/api/test/cre-client.test.ts",
  "apps/api/test/graph-provider.test.ts",
  "integrations/the-graph/README.md",
  "integrations/the-graph/subgraph/schema.graphql",
  "integrations/the-graph/subgraph/subgraph.yaml",
  "integrations/the-graph/subgraph/abis/RovaultaRegistry.json",
  "integrations/the-graph/subgraph/src/rovaulta-registry.ts",
  "docs/planning/exec-plans/P9-partner-bounty-qualification.md",
  "apps/web/src/app/workspace-context.tsx",
  "apps/web/src/app/product-app.tsx",
  "apps/web/src/app/workspace-views.tsx",
  "apps/web/src/app/release-view.tsx",
  "apps/web/src/app/evidence-view.tsx",
  "apps/web/src/app/app/page.tsx",
  "apps/web/src/app/app/setup/page.tsx",
  "apps/web/src/app/app/builds/page.tsx",
  "apps/web/src/app/app/evaluate/page.tsx",
  "apps/web/src/app/app/releases/page.tsx",
  "apps/web/src/app/app/evidence/page.tsx",
  "apps/web/src/app/judge-dashboard.tsx",
  "apps/web/src/app/digital-twin.tsx",
  "apps/web/src/app/demo-data.ts",
  "tests/e2e/p6-judge-path.spec.ts",
  "tests/e2e/p7-deterministic-demo.spec.ts",
  "scripts/p7-demo.mjs",
  "apps/api/scripts/p7-demo-fixture.ts",
  "apps/api/test/p7-demo-fixture.test.ts",
  "docs/planning/exec-plans/P7-deterministic-demo-reliability.md",
  "docs/compliance/evidence/p7-deterministic-demo-2026-09-07.md",
  "apps/web/src/app/p5-ledger/page.tsx",
  ".github/workflows/ci.yml",
  "docs/codex/TOOLS.md",
  ".worktreeinclude",
];

for (const path of required) {
  if (!existsSync(resolve(root, path))) throw new Error(`Missing required scaffold file: ${path}`);
}

for (const path of [
  "package.json",
  "apps/web/package.json",
  "apps/api/package.json",
  "integrations/chainlink-cre/package.json",
]) {
  JSON.parse(readFileSync(resolve(root, path), "utf8"));
}

const chainlinkMain = readFileSync(resolve(root, "integrations/chainlink-cre/src/main.ts"), "utf8");
const chainlinkWorkflow = readFileSync(
  resolve(root, "integrations/chainlink-cre/src/workflow.ts"),
  "utf8",
);
const confidentialEvaluation = readFileSync(
  resolve(root, "integrations/chainlink-cre/src/confidential-evaluation.ts"),
  "utf8",
);
const creClient = readFileSync(resolve(root, "apps/api/src/evaluation/cre-client.ts"), "utf8");
const graphProvider = readFileSync(resolve(root, "apps/api/src/graph/provider.ts"), "utf8");
const deploymentAgentSource = readFileSync(
  resolve(root, "apps/api/src/agent/deployment-agent.ts"),
  "utf8",
);
const chainlinkPackage = JSON.parse(
  readFileSync(resolve(root, "integrations/chainlink-cre/package.json"), "utf8"),
);
if (chainlinkMain.includes("NOT_IMPLEMENTED"))
  throw new Error("P3 CRE workflow still carries the obsolete boilerplate marker");
if (!chainlinkMain.includes("Runner.newRunner") || !chainlinkWorkflow.includes("handlerInTee"))
  throw new Error("P3 must use the official CRE runner and confidential TEE handler");
if (!chainlinkWorkflow.includes("authorizedKeys") || !chainlinkWorkflow.includes('tee: "nitro"'))
  throw new Error("P3 CRE trigger/TEE restrictions are incomplete");
if (
  !confidentialEvaluation.includes("runtime") ||
  !confidentialEvaluation.includes("getSecret") ||
  !confidentialEvaluation.includes("CONFIDENTIAL_INPUT_SECRET_ID") ||
  !confidentialEvaluation.includes("evaluateSimulation")
)
  throw new Error("P3 confidential handler must fetch private input and reuse P2");
if (confidentialEvaluation.includes("runtime.log"))
  throw new Error("P3 confidential handler must not log from inside the TEE");
if (
  !creClient.includes("workflows.execute") ||
  !creClient.includes("CRE_EVALUATION_PENDING") ||
  !creClient.includes("confidentialInputSecretId")
)
  throw new Error("P9 application evaluation must use the official CRE boundary and fail closed");
if (
  !graphProvider.includes("TheGraphClearanceReader") ||
  !graphProvider.includes("GRAPH_UNAVAILABLE") ||
  !graphProvider.includes("expiresAt")
)
  throw new Error("P9 agent context must use exact, server-only The Graph data");
if (!deploymentAgentSource.includes("getGraphContext"))
  throw new Error("P9 deployment preparation must require Graph context before P5");
if (
  chainlinkPackage.dependencies?.["@rovaulta/domain"] !== "workspace:*" ||
  chainlinkPackage.dependencies?.["@rovaulta/simulation-core"] !== "workspace:*" ||
  chainlinkPackage.dependencies?.["@chainlink/cre-sdk"] !== "1.19.1"
)
  throw new Error("P3 CRE package dependencies are not pinned to the shared protocol/evaluator");
for (const path of [
  "project.yaml",
  "secrets.yaml",
  "integrations/chainlink-cre/workflow.yaml",
  "integrations/chainlink-cre/config.staging.json",
  "integrations/chainlink-cre/test/workflow.test.ts",
]) {
  if (!existsSync(resolve(root, path))) throw new Error(`Missing P3 CRE artifact: ${path}`);
}
const contract = readFileSync(resolve(root, "contracts/src/RovaultaRegistry.sol"), "utf8");
for (const requiredSurface of [
  "struct ClearanceBindings",
  "recordClearance",
  "revokeClearance",
  "getClearance",
  "isClearanceValid",
  "isClearanceValidFor",
  "RegistrarAuthorizationUpdated",
  "ClearanceRecorded",
  "ClearanceBindingsRecorded",
  "ClearanceRevoked",
  "block.timestamp < clearance.bindings.expiresAt",
]) {
  if (!contract.includes(requiredSurface))
    throw new Error(`P4 registry is missing required structural surface: ${requiredSurface}`);
}
for (const confidentialField of [
  "restrictedZones",
  "maxPayloadKg",
  "speedLimitMmPerSecond",
  "commitmentBlind",
]) {
  if (contract.includes(confidentialField))
    throw new Error(`P4 registry must not contain confidential field: ${confidentialField}`);
}
if (/\bstring\b|\bbytes\s+(?:public|private|internal)\b|\[\]/.test(contract))
  throw new Error("P4 production registry must use bounded fixed-size storage only");
const ledgerPackage = JSON.parse(
  readFileSync(resolve(root, "packages/ledger-gate/package.json"), "utf8"),
);
const expectedLedgerDependencies = {
  "@ledgerhq/context-module": "2.5.0",
  "@ledgerhq/device-management-kit": "1.9.0",
  "@ledgerhq/device-signer-kit-ethereum": "1.18.0",
  "@ledgerhq/device-transport-kit-speculos": "1.2.1",
  "@ledgerhq/device-transport-kit-web-hid": "1.2.4",
  rxjs: "7.8.2",
};
for (const [name, version] of Object.entries(expectedLedgerDependencies)) {
  if (ledgerPackage.dependencies?.[name] !== version)
    throw new Error(`P5 Ledger dependency ${name} must be pinned to ${version}`);
}
if (ledgerPackage.devDependencies?.["@ledgerhq/speculos-device-controller"] !== "0.3.0")
  throw new Error("P5.1 Speculos device controller must be pinned to 0.3.0");
if (ledgerPackage.scripts?.test?.includes("pass-with-no-tests"))
  throw new Error("P5 Ledger tests must not permit an empty test suite");
const ledgerAdapter = readFileSync(
  resolve(root, "packages/ledger-gate/src/browser-adapter.ts"),
  "utf8",
);
const ledgerTransport = readFileSync(
  resolve(root, "packages/ledger-gate/src/transport.ts"),
  "utf8",
);
const strictLedgerAction = readFileSync(
  resolve(root, "packages/ledger-gate/src/strict-action.ts"),
  "utf8",
);
const clearSigningContext = readFileSync(
  resolve(root, "packages/ledger-gate/src/clear-signing-context.ts"),
  "utf8",
);
const chainDeployment = readFileSync(
  resolve(root, "packages/chain-client/src/deployment.ts"),
  "utf8",
);
const eip712 = readFileSync(resolve(root, "packages/chain-client/src/eip712.ts"), "utf8");
const releaseService = readFileSync(
  resolve(root, "apps/api/src/release/release-service.ts"),
  "utf8",
);
const nonceStore = readFileSync(resolve(root, "apps/api/src/release/nonce-store.ts"), "utf8");
const deploymentAgent = readFileSync(
  resolve(root, "apps/api/src/agent/deployment-agent.ts"),
  "utf8",
);
const deploymentCatalog = readFileSync(resolve(root, "apps/api/src/agent/catalog.ts"), "utf8");
const deploymentAgentTools = readFileSync(resolve(root, "apps/api/src/agent/tools.ts"), "utf8");
const deploymentAgentProvider = readFileSync(
  resolve(root, "apps/api/src/agent/gemini-model.ts"),
  "utf8",
);
for (const requiredSurface of ["SignerEthBuilder", "signTypedData"]) {
  if (!ledgerAdapter.includes(requiredSurface))
    throw new Error(`P5 browser adapter is missing current Ledger surface: ${requiredSurface}`);
}
for (const requiredSurface of [
  "DeviceManagementKitBuilder",
  "webHidTransportFactory",
  "speculosTransportFactory",
  "speculosIdentifier",
]) {
  if (!ledgerTransport.includes(requiredSurface))
    throw new Error(`P5.1 transport abstraction is missing Ledger surface: ${requiredSurface}`);
}
if (
  !strictLedgerAction.includes("SIGN_TYPED_DATA_LEGACY") ||
  !strictLedgerAction.includes("CLEAR_SIGNING_UNAVAILABLE") ||
  !strictLedgerAction.includes("action.cancel()") ||
  !strictLedgerAction.includes("clearSigningAttempt: ClearSigningAttempt")
)
  throw new Error("P5 must cancel and reject the signer kit's legacy typed-data fallback state");
for (const requiredSurface of [
  "GuardedClearSigningContext",
  "getTypedDataFilters",
  "hasExactDisplayFilters",
  "messageInfo.filtersCount",
  "assertResolved",
  "setChain(ContextModuleChainID.Ethereum)",
  "ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract",
]) {
  if (!clearSigningContext.includes(requiredSurface))
    throw new Error(`P5 exact Clear Signing context guard is missing: ${requiredSurface}`);
}
if (!chainDeployment.includes("contracts/deployments/sepolia.json"))
  throw new Error("P5 must consume the authoritative Sepolia deployment artifact");
for (const requiredSurface of [
  "ROVAULTA_DEPLOYMENT_INTENT_TYPES",
  "hashTypedData",
  "recoverTypedDataAddress",
  "authorizedSigner",
]) {
  if (!eip712.includes(requiredSurface))
    throw new Error(`P5 EIP-712 implementation is missing: ${requiredSurface}`);
}
for (const requiredSurface of [
  "assertClearanceSnapshotEligible",
  "assertDeploymentIntentSignature",
  "readExactClearance",
  "CLEARANCE_INVALIDATED",
]) {
  if (!releaseService.includes(requiredSurface))
    throw new Error(`P5 deterministic release policy is missing: ${requiredSurface}`);
}
if (!nonceStore.includes("WHERE nonce = ? AND state = 'ISSUED'"))
  throw new Error("P5 nonce consumption must be an atomic one-way transition");
for (const requiredSurface of [
  "resolveDeploymentTarget",
  "getDeploymentContext",
  "getEvaluationStatus",
  "getClearance",
  "prepareDeploymentIntent",
  "getLedgerAuthorizationStatus",
]) {
  if (!deploymentAgentTools.includes(requiredSurface))
    throw new Error(`P5.2 deployment agent tool boundary is missing: ${requiredSurface}`);
}
for (const requiredSurface of [
  "ReleaseService",
  ".prepare(",
  "assertClearanceSnapshotEligible",
  "LEDGER_APPROVAL_REQUIRED",
  "P5_AUTHORIZATION_VERIFIED",
  "resolvePublicRequest",
]) {
  if (!deploymentAgent.includes(requiredSurface))
    throw new Error(`P5.2 deterministic controller is missing: ${requiredSurface}`);
}
if (!deploymentCatalog.includes("formatPublicDeploymentRequest"))
  throw new Error("P5.2 deterministic controller is missing: formatPublicDeploymentRequest");
if (deploymentAgent.includes(".consume("))
  throw new Error("P5.2 model/controller must not receive release-consumption authority");
for (const requiredSurface of [
  "@google/genai",
  "FunctionCallingConfigMode.ANY",
  "parametersJsonSchema",
  "allowedFunctionNames",
]) {
  if (!deploymentAgentProvider.includes(requiredSurface))
    throw new Error(`P5.2 real provider adapter is missing: ${requiredSurface}`);
}
const turbo = JSON.parse(readFileSync(resolve(root, "turbo.json"), "utf8"));
for (const requiredEnvironment of [
  "ROVAULTA_AUTHORIZED_SIGNERS",
  "ROVAULTA_RELEASE_DB_PATH",
  "NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN",
  "GEMINI_API_KEY",
  "GEMINI_MODEL",
  "ROVAULTA_AGENT_CATALOG_PATH",
]) {
  if (!turbo.tasks?.dev?.env?.includes(requiredEnvironment))
    throw new Error(`P5 Turbo dev environment is missing: ${requiredEnvironment}`);
}
const p5Source = [ledgerAdapter, strictLedgerAction, eip712, releaseService].join("\n");
for (const forbidden of [
  /@ledgerhq\/hw-/,
  /signEIP712HashedMessage/,
  /\.signMessage\(/,
  /personal_sign/,
  /\.signTransaction\(/,
  /ledgerApproved/,
]) {
  if (forbidden.test(p5Source)) throw new Error(`Forbidden P5 signing path found: ${forbidden}`);
}
const webPage = readFileSync(resolve(root, "apps/web/src/app/page.tsx"), "utf8");
const landingPage = readFileSync(resolve(root, "apps/web/src/app/landing-page.tsx"), "utf8");
const onboarding = readFileSync(resolve(root, "apps/web/src/app/onboarding-flow.tsx"), "utf8");
const apiClient = readFileSync(resolve(root, "apps/web/src/app/api-client.ts"), "utf8");
const ledgerPage = readFileSync(resolve(root, "apps/web/src/app/p5-ledger/page.tsx"), "utf8");
const realWorkspace = readFileSync(resolve(root, "apps/web/src/app/real-workspace.tsx"), "utf8");
const fixtureRoute = readFileSync(
  resolve(root, "apps/web/src/app/dev-fixtures/evaluate/page.tsx"),
  "utf8",
);
const applicationStore = readFileSync(resolve(root, "apps/api/src/application/store.ts"), "utf8");
const applicationLifecycle = readFileSync(
  resolve(root, "apps/api/test/application-lifecycle.test.ts"),
  "utf8",
);
const productApp = readFileSync(resolve(root, "apps/web/src/app/product-app.tsx"), "utf8");
const evaluatePage = readFileSync(resolve(root, "apps/web/src/app/app/evaluate/page.tsx"), "utf8");
const judgeDashboard = readFileSync(resolve(root, "apps/web/src/app/judge-dashboard.tsx"), "utf8");
const digitalTwin = readFileSync(resolve(root, "apps/web/src/app/digital-twin.tsx"), "utf8");
const demoData = readFileSync(resolve(root, "apps/web/src/app/demo-data.ts"), "utf8");
const p6Browser = readFileSync(resolve(root, "tests/e2e/p6-judge-path.spec.ts"), "utf8");
const p7Browser = readFileSync(resolve(root, "tests/e2e/p7-deterministic-demo.spec.ts"), "utf8");
const p7DemoScript = readFileSync(resolve(root, "scripts/p7-demo.mjs"), "utf8");
const p7Fixture = readFileSync(resolve(root, "apps/api/scripts/p7-demo-fixture.ts"), "utf8");
if (!webPage.includes("LandingPage") || !landingPage.includes("Get started"))
  throw new Error("P8 root route must render the product landing page");
if (!onboarding.includes("auth/register") || !apiClient.includes('credentials: "include"'))
  throw new Error("P8 account entry must use authenticated API sessions");
const connectBlock =
  ledgerPage.match(
    /async function connect\(\) \{[\s\S]*?\n\x20{2}\}\n\n\x20{2}async function prepare/,
  )?.[0] ?? "";
if (!ledgerPage.includes('credentials: "include"') || /setPrepared\(null\)/.test(connectBlock))
  throw new Error("P5 Ledger handoff must preserve the prepared request across connect");
if (
  !realWorkspace.includes("/releases/prepare") ||
  /createDemoPublicData|JudgeDashboard/.test(realWorkspace)
)
  throw new Error("P8 normal workspace must use persisted data, not the fixture dashboard");
if (
  !fixtureRoute.includes("ROVAULTA_ENABLE_DEMO_ROUTES") ||
  !fixtureRoute.includes('NODE_ENV === "production"')
)
  throw new Error("P7 fixture route must remain explicitly environment-gated");
if (!applicationStore.includes("createCipheriv") || !applicationStore.includes("account_id"))
  throw new Error("P8 application store must encrypt policy data and scope records by account");
if (!applicationLifecycle.includes("isolates resources between accounts"))
  throw new Error("P8 lifecycle tests must cover account isolation");
if (!productApp.includes("ProductApp") || !evaluatePage.includes("ProductApp"))
  throw new Error("P8 evaluator page must remain inside the authenticated product workspace");
for (const requiredSurface of [
  "CLEARANCE_BINDING_MISMATCH",
  "CRE authenticated simulation evidence",
  "LEDGER_APPROVAL_REQUIRED",
  "Physical device: not demonstrated",
]) {
  if (!judgeDashboard.includes(requiredSurface))
    throw new Error(`P6 dashboard safety/partner surface is missing: ${requiredSurface}`);
}
for (const requiredSurface of ["Reset demo", "sessionStorage.removeItem", "requestGeneration"]) {
  if (!judgeDashboard.includes(requiredSurface))
    throw new Error(`P7 dashboard reliability guard is missing: ${requiredSurface}`);
}
for (const requiredSurface of [
  "demo:setup",
  "demo:reset",
  "demo:run",
  "P7 offline deterministic demo rehearsal",
]) {
  if (!p7DemoScript.includes(requiredSurface))
    throw new Error(`P7 deterministic command surface is missing: ${requiredSurface}`);
}
for (const requiredSurface of [
  "createDeterministicDemoFixture",
  "evaluateSimulation",
  "nonceFactory",
  "CLEARANCE_BINDING_MISMATCH",
  "LEDGER_APPROVAL_REQUIRED",
]) {
  if (!p7Fixture.includes(requiredSurface))
    throw new Error(`P7 rehearsal fixture is missing: ${requiredSurface}`);
}
for (const requiredSurface of [
  "clean startup",
  "Reset demo",
  "LEDGER_APPROVAL_REQUIRED",
  "CLEARANCE_BINDING_MISMATCH",
  "late prepared response",
]) {
  if (!p7Browser.includes(requiredSurface))
    throw new Error(`P7 browser coverage is missing: ${requiredSurface}`);
}
if (!digitalTwin.includes("Canvas") || !digitalTwin.includes("public behavior points"))
  throw new Error("P6 digital twin must remain a deterministic explanatory projection");
if (!demoData.includes("envelopeBlindingSecret") || !demoData.includes("evaluateSimulation"))
  throw new Error("P6 server projection must consume the existing evaluator server-side");
for (const requiredSurface of [
  "starts with an unsafe Build A hold",
  "switches to corrected Build B",
  "mutating Build B",
  "hands an actual prepared response",
]) {
  if (!p6Browser.includes(requiredSurface))
    throw new Error(`P6 browser coverage is missing: ${requiredSurface}`);
}

const env = readFileSync(resolve(root, ".env.example"), "utf8");
const obviousSecretPatterns = [/0x[a-fA-F0-9]{64}/, /sk-[A-Za-z0-9_-]{20,}/, /BEGIN PRIVATE KEY/];
for (const pattern of obviousSecretPatterns) {
  if (pattern.test(env))
    throw new Error(`Potential secret-like value found in .env.example: ${pattern}`);
}

const rootAgentsBytes = Buffer.byteLength(readFileSync(resolve(root, "AGENTS.md"), "utf8"));
if (rootAgentsBytes > 16 * 1024)
  throw new Error("Root AGENTS.md is too large for efficient context loading");

console.log("✓ scaffold structure present");
console.log("✓ JSON manifests parse");
console.log("✓ P1-P9 implementation and verification guardrails present");
console.log("✓ .env.example has no obvious secret material");
console.log("✓ root AGENTS.md remains context-efficient");

const instructionChains = [
  ["AGENTS.md", "apps/web/AGENTS.md"],
  ["AGENTS.md", "apps/api/AGENTS.md"],
  ["AGENTS.md", "packages/simulation-core/AGENTS.md"],
  ["AGENTS.md", "packages/ledger-gate/AGENTS.md"],
  ["AGENTS.md", "integrations/chainlink-cre/AGENTS.md"],
  ["AGENTS.md", "contracts/AGENTS.md"],
];
for (const chain of instructionChains) {
  const total = chain.reduce(
    (sum, path) => sum + Buffer.byteLength(readFileSync(resolve(root, path), "utf8")),
    0,
  );
  if (total > 32 * 1024)
    throw new Error(`Codex instruction chain exceeds 32 KiB: ${chain.join(" -> ")}`);
}
console.log("✓ scoped AGENTS instruction chains stay below 32 KiB");
