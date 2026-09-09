export * from "./cli-simulation-client.js";
export * from "./cre-client.js";

import { createCreCliSimulationEvaluationClientFromEnvironment } from "./cli-simulation-client.js";
import type { ConfidentialEvaluationExecutor } from "./cre-client.js";
import { createCreEvaluationClientFromEnvironment } from "./cre-client.js";

/**
 * Selects the normal application evaluator. Gateway mode remains the default; CLI simulation is an
 * explicit operator-selected mode and never acts as an implicit fallback.
 */
export function createEvaluationExecutorFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ConfidentialEvaluationExecutor {
  const mode = environment.ROVAULTA_CRE_EXECUTION_MODE?.trim().toLowerCase() || "gateway";
  if (mode === "gateway") return createCreEvaluationClientFromEnvironment(environment);
  if (mode === "simulation") {
    return createCreCliSimulationEvaluationClientFromEnvironment(environment);
  }
  throw new Error("ROVAULTA_CRE_EXECUTION_MODE must be gateway or simulation");
}
