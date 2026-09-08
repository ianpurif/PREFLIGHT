import { resolve } from "node:path";
import { ViemClearanceRegistryReader } from "@rovaulta/chain-client";
import { readEnvironment } from "../environment.js";
import type { ReleaseService } from "../release/index.js";
import { DeploymentCatalog } from "./catalog.js";
import { DeploymentAgent } from "./deployment-agent.js";
import { OpenAIResponsesDeploymentModel } from "./openai-responses-model.js";
import { DeploymentAgentError } from "./types.js";

export * from "./catalog.js";
export * from "./deployment-agent.js";
export * from "./openai-responses-model.js";
export * from "./tools.js";
export * from "./types.js";

export function createDeploymentAgentFromEnvironment(
  releaseService: ReleaseService,
  environment: NodeJS.ProcessEnv = process.env,
): DeploymentAgent {
  const apiKey = environment.OPENAI_API_KEY;
  const model = readEnvironment(environment, "ROVAULTA_AGENT_MODEL");
  const catalogPath = readEnvironment(environment, "ROVAULTA_AGENT_CATALOG_PATH");
  const rpcUrl = environment.EVM_RPC_URL || environment.SEPOLIA_RPC_URL;
  if (!apiKey || !model || !catalogPath || !rpcUrl) {
    throw new DeploymentAgentError(
      "PROVIDER_UNAVAILABLE",
      "AI provider, public catalog, and Sepolia RPC configuration are required",
    );
  }
  return new DeploymentAgent({
    model: new OpenAIResponsesDeploymentModel({ apiKey, model }),
    catalog: DeploymentCatalog.fromFile(resolve(process.cwd(), catalogPath)),
    reader: new ViemClearanceRegistryReader(rpcUrl),
    releaseService,
  });
}
