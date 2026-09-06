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

test("legacy LedgerJS dependencies are not introduced", async () => {
  const pkg = await readFile(new URL("packages/ledger-gate/package.json", root), "utf8");
  assert.doesNotMatch(pkg, /@ledgerhq\/hw-/);
  assert.match(pkg, /device-management-kit/);
  assert.match(pkg, /device-signer-kit-ethereum/);
});

test("P3 uses the real confidential path while P4 and P5 remain deferred", async () => {
  const workflow = await readFile(
    new URL("integrations/chainlink-cre/src/workflow.ts", root),
    "utf8",
  );
  const confidential = await readFile(
    new URL("integrations/chainlink-cre/src/confidential-evaluation.ts", root),
    "utf8",
  );
  const contract = await readFile(new URL("contracts/src/PreflightRegistry.sol", root), "utf8");
  const ledger = await readFile(new URL("packages/ledger-gate/src/index.ts", root), "utf8");

  assert.match(workflow, /handlerInTee/);
  assert.match(confidential, /getSecret/);
  assert.match(confidential, /CONFIDENTIAL_INPUT_SECRET_ID/);
  assert.match(confidential, /evaluateSimulation/);
  assert.doesNotMatch(confidential, /runtime\.log/);
  assert.match(contract, /Boilerplate shell only/);
  assert.match(ledger, /intentionally deferred/);
});
