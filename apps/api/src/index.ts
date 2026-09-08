import { createDeploymentAgentFromEnvironment } from "./agent/index.js";
import { createApplicationStoreFromEnvironment } from "./application/index.js";
import { createCreEvaluationClientFromEnvironment } from "./evaluation/index.js";
import { readEnvironment } from "./environment.js";
import { createReleaseServiceFromEnvironment } from "./release/index.js";
import { buildServer } from "./server";

const hasRegistryRpc = Boolean(process.env.EVM_RPC_URL || process.env.SEPOLIA_RPC_URL);
// The judge-facing web fixture is intentionally usable without live provider credentials.
// Keep the real release/agent authorities enabled whenever their configuration is present;
// otherwise expose an explicit unavailable API instead of failing the development server at
// startup. This is not a production fallback and never fabricates a release result.
const releaseService = hasRegistryRpc ? createReleaseServiceFromEnvironment() : undefined;
const applicationStore = createApplicationStoreFromEnvironment();
const agentEnvironmentConfigured =
  (process.env.OPENAI_API_KEY ?? "").trim() !== "" ||
  (readEnvironment(process.env, "ROVAULTA_AGENT_MODEL") ?? "").trim() !== "";
const deploymentAgent =
  releaseService !== undefined && agentEnvironmentConfigured
    ? createDeploymentAgentFromEnvironment(releaseService, process.env, applicationStore)
    : undefined;
const evaluationExecutor = createCreEvaluationClientFromEnvironment();
const app = buildServer({
  ...(releaseService === undefined ? {} : { releaseService }),
  ...(deploymentAgent === undefined ? {} : { deploymentAgent }),
  applicationStore,
  evaluationExecutor,
});
const port = Number(process.env.PORT ?? 4000);

await app.listen({ host: "0.0.0.0", port });
