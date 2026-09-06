import { HTTPCapability, type HTTPPayload, handlerInTee, type Workflow } from "@chainlink/cre-sdk";
import { evaluateInTee, type WorkflowConfig } from "./confidential-evaluation.js";
import type { CrePublicEvaluationResponse } from "./protocol.js";

export function initWorkflow(config: WorkflowConfig): Workflow<WorkflowConfig> {
  const httpTrigger = new HTTPCapability().trigger({
    authorizedKeys: [{ type: "KEY_TYPE_ECDSA_EVM", publicKey: config.authorizedEvmAddress }],
  });
  return [
    handlerInTee<HTTPPayload, HTTPPayload, WorkflowConfig, CrePublicEvaluationResponse>(
      httpTrigger,
      evaluateInTee,
      [{ tee: "nitro", regions: ["us-west-2"] }],
    ),
  ];
}
