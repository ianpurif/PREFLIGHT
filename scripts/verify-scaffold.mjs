import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const required = [
  "AGENTS.md",
  ".codex/config.toml",
  ".agents/skills/preflight-exec-plan/SKILL.md",
  ".agents/skills/preflight-verification-loop/SKILL.md",
  "docs/planning/CURRENT.md",
  "docs/architecture/TRUST_BOUNDARIES.md",
  "docs/partners/CHAINLINK.md",
  "docs/partners/LEDGER.md",
  "apps/web/AGENTS.md",
  "apps/api/AGENTS.md",
  "packages/domain/AGENTS.md",
  "packages/simulation-core/AGENTS.md",
  "packages/ledger-gate/AGENTS.md",
  "integrations/chainlink-cre/AGENTS.md",
  "contracts/AGENTS.md",
  "contracts/README.md",
  "contracts/script/DeployPreflightRegistry.s.sol",
  "contracts/test/PreflightRegistry.t.sol",
  "contracts/test/PreflightRegistryInvariant.t.sol",
  "packages/chain-client/src/eip712.ts",
  "packages/chain-client/src/registry.ts",
  "packages/chain-client/test/eip712.test.ts",
  "packages/ledger-gate/src/browser-adapter.ts",
  "packages/ledger-gate/src/clear-signing-context.ts",
  "packages/ledger-gate/src/strict-action.ts",
  "packages/ledger-gate/test/strict-action.test.ts",
  "packages/ledger-gate/clear-signing/eip712-preflight-deployment-intent.json",
  "apps/api/src/release/release-service.ts",
  "apps/api/src/release/nonce-store.ts",
  "apps/api/src/agent/deployment-agent.ts",
  "apps/api/src/agent/openai-responses-model.ts",
  "apps/api/src/agent/tools.ts",
  "apps/api/test/release-service.test.ts",
  "apps/api/test/deployment-agent.test.ts",
  "apps/api/test/openai-responses-model.test.ts",
  "apps/api/test/server.test.ts",
  "apps/web/src/app/page.tsx",
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
  chainlinkPackage.dependencies?.["@preflight/domain"] !== "workspace:*" ||
  chainlinkPackage.dependencies?.["@preflight/simulation-core"] !== "workspace:*" ||
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
const contract = readFileSync(resolve(root, "contracts/src/PreflightRegistry.sol"), "utf8");
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
const deploymentAgentTools = readFileSync(resolve(root, "apps/api/src/agent/tools.ts"), "utf8");
const deploymentAgentProvider = readFileSync(
  resolve(root, "apps/api/src/agent/openai-responses-model.ts"),
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
  "PREFLIGHT_SEPOLIA_DEPLOYMENT.verifyingContract",
]) {
  if (!clearSigningContext.includes(requiredSurface))
    throw new Error(`P5 exact Clear Signing context guard is missing: ${requiredSurface}`);
}
if (!chainDeployment.includes("contracts/deployments/sepolia.json"))
  throw new Error("P5 must consume the authoritative Sepolia deployment artifact");
for (const requiredSurface of [
  "PREFLIGHT_DEPLOYMENT_INTENT_TYPES",
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
  "formatPublicRequest",
]) {
  if (!deploymentAgent.includes(requiredSurface))
    throw new Error(`P5.2 deterministic controller is missing: ${requiredSurface}`);
}
if (deploymentAgent.includes(".consume("))
  throw new Error("P5.2 model/controller must not receive release-consumption authority");
for (const requiredSurface of [
  "/v1/responses",
  "strict: true",
  "parallel_tool_calls: false",
  "store: false",
]) {
  if (!deploymentAgentProvider.includes(requiredSurface))
    throw new Error(`P5.2 real provider adapter is missing: ${requiredSurface}`);
}
const turbo = JSON.parse(readFileSync(resolve(root, "turbo.json"), "utf8"));
for (const requiredEnvironment of [
  "PREFLIGHT_AUTHORIZED_SIGNERS",
  "PREFLIGHT_RELEASE_DB_PATH",
  "NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN",
  "OPENAI_API_KEY",
  "PREFLIGHT_AGENT_MODEL",
  "PREFLIGHT_AGENT_CATALOG_PATH",
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
const judgeDashboard = readFileSync(resolve(root, "apps/web/src/app/judge-dashboard.tsx"), "utf8");
const digitalTwin = readFileSync(resolve(root, "apps/web/src/app/digital-twin.tsx"), "utf8");
const demoData = readFileSync(resolve(root, "apps/web/src/app/demo-data.ts"), "utf8");
const p6Browser = readFileSync(resolve(root, "tests/e2e/p6-judge-path.spec.ts"), "utf8");
const p7Browser = readFileSync(resolve(root, "tests/e2e/p7-deterministic-demo.spec.ts"), "utf8");
const p7DemoScript = readFileSync(resolve(root, "scripts/p7-demo.mjs"), "utf8");
const p7Fixture = readFileSync(resolve(root, "apps/api/scripts/p7-demo-fixture.ts"), "utf8");
if (!webPage.includes("createDemoPublicData") || !webPage.includes("JudgeDashboard"))
  throw new Error("P6 root route must render the server-side public dashboard projection");
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
console.log("✓ P1-P7 implementation and verification guardrails present");
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
