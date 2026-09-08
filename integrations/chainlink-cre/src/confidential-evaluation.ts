import { HTTPClient, type TeeRuntime } from "@chainlink/cre-sdk";
import { hmac } from "@noble/hashes/hmac.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { isLegacyVersion, LEGACY_SCHEMA_VERSIONS, ProtocolError } from "@rovaulta/domain";
import { evaluateSimulation } from "@rovaulta/simulation-core";
import {
  COMPATIBILITY_CONFIDENTIAL_INPUT_SECRET_ID,
  CONFIDENTIAL_INPUT_SECRET_ID,
  CRE_PUBLIC_RESULT_VERSION,
  CRE_RESULT_CALLBACK_SECRET_ID,
  CreBoundaryError,
  type CrePublicEvaluationRequest,
  type CrePublicEvaluationResponse,
  decodePublicPayload,
  makeEvaluationResultCallback,
  makePublicFailure,
  makePublicFailureForProtocol,
  parseConfidentialEvaluationInput,
  parsePublicEvaluationRequest,
  serializeEvaluationResultCallback,
} from "./protocol.js";

export interface WorkflowConfig {
  readonly authorizedEvmAddress: string;
  /** Optional HTTPS endpoint that receives only the minimal public result. */
  readonly resultDeliveryUrl?: string;
  /** CRE secret selector for the callback HMAC key. */
  readonly resultDeliverySecretId?: string;
}

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

function deliverPublicResult(
  runtime: TeeRuntime<WorkflowConfig>,
  evaluationId: string,
  response: CrePublicEvaluationResponse,
): CrePublicEvaluationResponse {
  const deliveryUrl = runtime.config?.resultDeliveryUrl;
  if (deliveryUrl === undefined) return response;
  const secretId = runtime.config?.resultDeliverySecretId ?? CRE_RESULT_CALLBACK_SECRET_ID;
  try {
    const secret = runtime.getSecret({ id: secretId, namespace: "main" }).result().value;
    if (typeof secret !== "string" || secret.length === 0) throw new Error("missing callback key");
    const callback = makeEvaluationResultCallback(evaluationId, response);
    const body = serializeEvaluationResultCallback(callback);
    const signature = bytesToHex(
      hmac(sha256, new TextEncoder().encode(secret), new TextEncoder().encode(body)),
    );
    const delivery = new HTTPClient()
      .sendRequest(runtime, {
        url: deliveryUrl,
        method: "POST",
        multiHeaders: {
          "content-type": { values: ["application/json"] },
          "x-rovaulta-cre-signature": { values: [`sha256=${signature}`] },
        },
        body: new TextEncoder().encode(body),
      })
      .result();
    if (delivery.statusCode < 200 || delivery.statusCode >= 300)
      throw new Error("delivery rejected");
    return response;
  } catch {
    return makePublicFailureForProtocol("CONFIDENTIAL_HANDLER_FAILURE", response.protocolVersion);
  }
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
      return deliverPublicResult(
        runtime,
        publicInput.request.evaluationId,
        makePublicFailureForProtocol("CONFIDENTIAL_INPUT_UNAVAILABLE", publicInput.protocolVersion),
      );
    }
    try {
      secretValue = runtime
        .getSecret({ id: COMPATIBILITY_CONFIDENTIAL_INPUT_SECRET_ID, namespace: "main" })
        .result().value;
    } catch {
      return deliverPublicResult(
        runtime,
        publicInput.request.evaluationId,
        makePublicFailureForProtocol("CONFIDENTIAL_INPUT_UNAVAILABLE", publicInput.protocolVersion),
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

    return deliverPublicResult(
      runtime,
      publicInput.request.evaluationId,
      Object.freeze({
        schemaVersion: isLegacyVersion(publicInput.protocolVersion)
          ? LEGACY_SCHEMA_VERSIONS.crePublicResult
          : CRE_PUBLIC_RESULT_VERSION,
        protocolVersion: publicInput.protocolVersion,
        status: "EVALUATED",
        result: internalReport.result,
        behaviorInputDigest: publicInput.behaviorInputDigest,
        traceProvenance: publicInput.traceProvenance,
      }),
    );
  } catch (error) {
    if (error instanceof CreBoundaryError) {
      return deliverPublicResult(
        runtime,
        publicInput.request.evaluationId,
        makePublicFailureForProtocol(error.publicCode, publicInput.protocolVersion),
      );
    }
    if (error instanceof ProtocolError) {
      if (error.code === "UNSUPPORTED_VERSION") {
        return deliverPublicResult(
          runtime,
          publicInput.request.evaluationId,
          makePublicFailureForProtocol("UNSUPPORTED_VERSION", publicInput.protocolVersion),
        );
      }
      return deliverPublicResult(
        runtime,
        publicInput.request.evaluationId,
        makePublicFailureForProtocol(
          "CONFIDENTIAL_EVALUATION_REJECTED",
          publicInput.protocolVersion,
        ),
      );
    }
    return deliverPublicResult(
      runtime,
      publicInput.request.evaluationId,
      makePublicFailureForProtocol("CONFIDENTIAL_HANDLER_FAILURE", publicInput.protocolVersion),
    );
  }
}
