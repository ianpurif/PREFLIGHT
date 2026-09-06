import type { TeeRuntime } from "@chainlink/cre-sdk";
import { ProtocolError } from "@preflight/domain";
import { evaluateSimulation } from "@preflight/simulation-core";
import {
  CONFIDENTIAL_INPUT_SECRET_ID,
  CRE_PUBLIC_RESULT_VERSION,
  CreBoundaryError,
  type CrePublicEvaluationRequest,
  type CrePublicEvaluationResponse,
  decodePublicPayload,
  makePublicFailure,
  parseConfidentialEvaluationInput,
  parsePublicEvaluationRequest,
} from "./protocol.js";

export interface WorkflowConfig {
  readonly authorizedEvmAddress: string;
}

/**
 * Confidential callback for the official CRE `handlerInTee` wrapper.
 * It performs no logging and releases only an explicit allowlist from the P2 report.
 */
export function evaluateInTee(
  runtime: TeeRuntime<WorkflowConfig>,
  triggerOutput: { readonly input: Uint8Array },
): CrePublicEvaluationResponse {
  let publicInput: CrePublicEvaluationRequest;
  try {
    publicInput = parsePublicEvaluationRequest(decodePublicPayload(triggerOutput.input));
  } catch (error) {
    return makePublicFailure(
      error instanceof CreBoundaryError ? error.publicCode : "MALFORMED_PUBLIC_INPUT",
    );
  }

  let secretValue: string;
  try {
    secretValue = runtime
      .getSecret({ id: CONFIDENTIAL_INPUT_SECRET_ID, namespace: "main" })
      .result().value;
  } catch {
    return makePublicFailure("CONFIDENTIAL_INPUT_UNAVAILABLE");
  }

  try {
    const confidentialInput = parseConfidentialEvaluationInput(secretValue);
    const internalReport = evaluateSimulation({
      request: publicInput.request,
      robotBuild: publicInput.robotBuild,
      confidentialEnvelope: confidentialInput.confidentialEnvelope,
      envelopeBlindingSecret: confidentialInput.envelopeBlindingSecret,
      behaviorTraces: publicInput.behaviorTraces,
      evaluatedAt: publicInput.evaluatedAt,
    });

    return Object.freeze({
      schemaVersion: CRE_PUBLIC_RESULT_VERSION,
      protocolVersion: publicInput.protocolVersion,
      status: "EVALUATED",
      result: internalReport.result,
      behaviorInputDigest: publicInput.behaviorInputDigest,
      traceProvenance: publicInput.traceProvenance,
    });
  } catch (error) {
    if (error instanceof CreBoundaryError) return makePublicFailure(error.publicCode);
    if (error instanceof ProtocolError) {
      if (error.code === "UNSUPPORTED_VERSION") return makePublicFailure("UNSUPPORTED_VERSION");
      return makePublicFailure("CONFIDENTIAL_EVALUATION_REJECTED");
    }
    return makePublicFailure("CONFIDENTIAL_HANDLER_FAILURE");
  }
}
