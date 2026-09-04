import type { EvaluationRequest, EvaluationResult } from "@preflight/domain";

/** Ports only. The deterministic evaluator is intentionally not implemented in the boilerplate. */
export interface ScenarioDescriptor {
  id: string;
  seed: number;
}

export interface SimulationEvaluationRequest {
  request: EvaluationRequest;
  scenario: ScenarioDescriptor;
}

export interface SimulationEngine {
  evaluate(request: SimulationEvaluationRequest): Promise<EvaluationResult>;
}
