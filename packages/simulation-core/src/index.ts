import type { ClearanceVerdict, PreflightIdentifiers } from "@preflight/domain";

/** Ports only. The deterministic evaluator is intentionally not implemented in the boilerplate. */
export interface ScenarioDescriptor {
  id: string;
  seed: number;
}

export interface EvaluationRequest extends PreflightIdentifiers {
  scenario: ScenarioDescriptor;
}

export interface EvaluationObservation {
  scenarioId: string;
  verdict: ClearanceVerdict;
  publicReasonCode?: string;
}

export interface SimulationEngine {
  evaluate(request: EvaluationRequest): Promise<EvaluationObservation>;
}
