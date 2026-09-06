import type { TeeRuntime } from "@chainlink/cre-sdk";
import { PROTOCOL_VERSION, parseUnixTimestamp } from "@preflight/domain";
import {
  createDeterministicDemoFixture,
  type DemoEvaluationCase,
} from "@preflight/simulation-core";
import type { WorkflowConfig } from "../src/confidential-evaluation.js";
import {
  CONFIDENTIAL_INPUT_SECRET_ID,
  CRE_CONFIDENTIAL_INPUT_VERSION,
  CRE_PUBLIC_REQUEST_VERSION,
  type CrePublicEvaluationRequest,
  digestBehaviorInput,
  SYNTHETIC_TRACE_PROVENANCE,
} from "../src/protocol.js";

export const fixture = createDeterministicDemoFixture();

function bytesToHex(bytes: Uint8Array): string {
  let output = "";
  for (const byte of bytes) output += byte.toString(16).padStart(2, "0");
  return output;
}

export function makePublicInput(demoCase: DemoEvaluationCase): CrePublicEvaluationRequest {
  const digestPayload = {
    schemaVersion: CRE_PUBLIC_REQUEST_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    request: demoCase.request,
    robotBuild: demoCase.robotBuild,
    behaviorTraces: demoCase.behaviorTraces,
    traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
    evaluatedAt: parseUnixTimestamp(demoCase.evaluatedAt, "evaluatedAt"),
  } as const;
  return {
    ...digestPayload,
    behaviorInputDigest: digestBehaviorInput(digestPayload),
  } as const;
}

export function makeConfidentialSecret(
  envelope: unknown = fixture.confidentialEnvelope,
  blindHex = bytesToHex(fixture.envelopeBlindingSecret),
): string {
  return JSON.stringify({
    schemaVersion: CRE_CONFIDENTIAL_INPUT_VERSION,
    protocolVersion: PROTOCOL_VERSION,
    confidentialEnvelope: envelope,
    envelopeBlindingSecretHex: blindHex,
  });
}

export function encodePublicInput(input: unknown): Uint8Array {
  return new TextEncoder().encode(JSON.stringify(input));
}

export function runtimeWithSecret(secretValue: string): TeeRuntime<WorkflowConfig> {
  return {
    getSecret(request: { readonly id?: string; readonly namespace?: string }) {
      if (request.id !== CONFIDENTIAL_INPUT_SECRET_ID || request.namespace !== "main") {
        throw new Error("unexpected secret selector");
      }
      return {
        result: () => ({ value: secretValue }),
      };
    },
  } as unknown as TeeRuntime<WorkflowConfig>;
}

export type Mutable<T> = T extends string | number | boolean | bigint | symbol | null | undefined
  ? T
  : T extends readonly (infer Item)[]
    ? Mutable<Item>[]
    : T extends object
      ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
      : T;

export function deepClone<T>(value: T): Mutable<T> {
  return JSON.parse(JSON.stringify(value)) as Mutable<T>;
}
