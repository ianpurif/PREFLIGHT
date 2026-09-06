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
if (!contract.includes("Boilerplate shell only"))
  throw new Error("Contract scaffold accidentally became product logic");
const ledgerGate = readFileSync(resolve(root, "packages/ledger-gate/src/index.ts"), "utf8");
if (!ledgerGate.includes("intentionally deferred"))
  throw new Error("Ledger P5 guard was removed before its authorized phase");

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
console.log("✓ P1-P3 implementation and P4-P5 phase guardrails present");
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
