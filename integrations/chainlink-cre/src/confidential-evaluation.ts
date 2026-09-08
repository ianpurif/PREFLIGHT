import type { TeeRuntime } from "@chainlink/cre-sdk";
import { isLegacyVersion, LEGACY_SCHEMA_VERSIONS, ProtocolError } from "@rovaulta/domain";
import { evaluateSimulation } from "@rovaulta/simulation-core";
import {
  COMPATIBILITY_CONFIDENTIAL_INPUT_SECRET_ID,
  CONFIDENTIAL_INPUT_SECRET_ID,
  CRE_PUBLIC_RESULT_VERSION,
  CreBoundaryError,
  type CrePublicEvaluationRequest,
  type CrePublicEvaluationResponse,
  decodePublicPayload,
  makePublicFailure,
  makePublicFailureForProtocol,
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
  const secretId = publicInput.confidentialInputSecretId;
  try {
    secretValue = runtime
      .getSecret({ id: secretId ?? CONFIDENTIAL_INPUT_SECRET_ID, namespace: "main" })
      .result().value;
  } catch {
    // Never fall back from a request-scoped selector to the legacy fixed secret. That could bind a
    // real account request to a different site's envelope. The compatibility selector is only for
    // old simulation payloads which omit the new field.
    if (secretId !== undefined) {
      return makePublicFailureForProtocol(
        "CONFIDENTIAL_INPUT_UNAVAILABLE",
        publicInput.protocolVersion,
      );
    }
    try {
      secretValue = runtime
        .getSecret({ id: COMPATIBILITY_CONFIDENTIAL_INPUT_SECRET_ID, namespace: "main" })
        .result().value;
    } catch {
      return makePublicFailureForProtocol(
        "CONFIDENTIAL_INPUT_UNAVAILABLE",
        publicInput.protocolVersion,
      );
    }
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
      schemaVersion: isLegacyVersion(publicInput.protocolVersion)
        ? LEGACY_SCHEMA_VERSIONS.crePublicResult
        : CRE_PUBLIC_RESULT_VERSION,
      protocolVersion: publicInput.protocolVersion,
      status: "EVALUATED",
      result: internalReport.result,
      behaviorInputDigest: publicInput.behaviorInputDigest,
      traceProvenance: publicInput.traceProvenance,
    });
  } catch (error) {
    if (error instanceof CreBoundaryError) {
      return makePublicFailureForProtocol(error.publicCode, publicInput.protocolVersion);
    }
    if (error instanceof ProtocolError) {
      if (error.code === "UNSUPPORTED_VERSION") {
        return makePublicFailureForProtocol("UNSUPPORTED_VERSION", publicInput.protocolVersion);
      }
      return makePublicFailureForProtocol(
        "CONFIDENTIAL_EVALUATION_REJECTED",
        publicInput.protocolVersion,
      );
    }
    return makePublicFailureForProtocol(
      "CONFIDENTIAL_HANDLER_FAILURE",
      publicInput.protocolVersion,
    );
  }
}
