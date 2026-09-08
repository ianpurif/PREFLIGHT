import { readFileSync } from "node:fs";
import { createDeploymentAgentFromEnvironment } from "../src/agent/index.js";
import { createApplicationStoreFromEnvironment } from "../src/application/index.js";
import { createReleaseServiceFromEnvironment } from "../src/release/index.js";

const accountId = process.env.ROVAULTA_P11_ACCOUNT_ID?.trim();
const clearancePath = process.env.ROVAULTA_P11_CLEARANCE_PATH?.trim();
const signerAddress = process.env.ROVAULTA_P11_SIGNER_ADDRESS?.trim();

if (accountId === undefined || !/^account:[a-f0-9]{32}$/.test(accountId)) {
  throw new Error("ROVAULTA_P11_ACCOUNT_ID must be an authenticated account identifier");
}
if (clearancePath === undefined || clearancePath.length === 0) {
  throw new Error("ROVAULTA_P11_CLEARANCE_PATH must point to a public clearance JSON record");
}
if (signerAddress === undefined || !/^0x[0-9a-fA-F]{40}$/.test(signerAddress)) {
  throw new Error("ROVAULTA_P11_SIGNER_ADDRESS must be a public Ethereum address");
}

const serialized = readFileSync(clearancePath, "utf8");
if (Buffer.byteLength(serialized, "utf8") > 64 * 1024) {
  throw new Error("The public clearance input exceeds the evidence size bound");
}
const clearance: unknown = JSON.parse(serialized);
const store = createApplicationStoreFromEnvironment();
const releaseService = createReleaseServiceFromEnvironment();
const agent = createDeploymentAgentFromEnvironment(releaseService, process.env, store);

try {
  const context = store.getDeploymentContext(accountId, extractEvaluationId(clearance), clearance);
  const result = await agent.run({
    request: `Deploy ${context.evaluation.robotBuildId} for ${context.evaluation.robotId} to ${context.evaluation.siteId}`,
    signerAddress,
    accountId,
    clearance,
  });
  console.log(
    JSON.stringify(
      {
        label: "The Graph live account-agent qualification",
        execution: "live provider path",
        accountId,
        evaluationId: context.evaluation.evaluationId,
        status: result.status,
        explanation: result.explanation,
        audit: result.audit,
      },
      null,
      2,
    ),
  );
} finally {
  releaseService.close();
  store.close();
}

function extractEvaluationId(input: unknown): string {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("The public clearance JSON is malformed");
  }
  const evaluationId = (input as Record<string, unknown>).evaluationId;
  if (typeof evaluationId !== "string" || evaluationId.length === 0) {
    throw new Error("The public clearance JSON must contain evaluationId");
  }
  return evaluationId;
}
