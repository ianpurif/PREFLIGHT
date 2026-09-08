import type { ClearanceRecord } from "@rovaulta/domain";
import { digestClearance, parseClearanceRecord } from "@rovaulta/domain";
import { type Hex, sha256, stringToHex, toBytes } from "viem";

export const VERDICT_CLEAR_BYTES32 = stringToHex("CLEAR", { size: 32 });
export const ZERO_BYTES32 = `0x${"00".repeat(32)}` as const;

export interface ClearanceBindingsTransport {
  readonly clearanceIdHash: Hex;
  readonly evaluationIdHash: Hex;
  readonly siteIdHash: Hex;
  readonly robotIdHash: Hex;
  readonly robotBuildIdHash: Hex;
  readonly robotBuildDigest: Hex;
  readonly safetyEnvelopeIdHash: Hex;
  readonly safetyEnvelopeCommitment: Hex;
  readonly evaluatorVersionHash: Hex;
  readonly evaluationInputsDigest: Hex;
  readonly issuedAt: bigint;
  readonly expiresAt: bigint;
}

export interface ClearanceTransport {
  readonly clearanceDigest: Hex;
  readonly bindings: ClearanceBindingsTransport;
  readonly verdict: Hex;
}

export function protocolDigestToBytes32(value: string): Hex {
  if (!/^sha256:[0-9a-f]{64}$/.test(value)) {
    throw new TypeError("Protocol digest is not canonical SHA-256");
  }
  return `0x${value.slice("sha256:".length)}` as Hex;
}

export function identifierToBytes32(value: string): Hex {
  return sha256(toBytes(value));
}

export function clearanceRecordToTransport(input: unknown): ClearanceTransport {
  const clearance: ClearanceRecord = parseClearanceRecord(input);
  return Object.freeze({
    clearanceDigest: protocolDigestToBytes32(digestClearance(clearance)),
    bindings: Object.freeze({
      clearanceIdHash: identifierToBytes32(clearance.clearanceId),
      evaluationIdHash: identifierToBytes32(clearance.evaluationId),
      siteIdHash: identifierToBytes32(clearance.inputs.siteId),
      robotIdHash: identifierToBytes32(clearance.inputs.robotId),
      robotBuildIdHash: identifierToBytes32(clearance.inputs.robotBuildId),
      robotBuildDigest: protocolDigestToBytes32(clearance.inputs.robotBuildDigest),
      safetyEnvelopeIdHash: identifierToBytes32(clearance.inputs.safetyEnvelopeId),
      safetyEnvelopeCommitment: protocolDigestToBytes32(clearance.inputs.safetyEnvelopeCommitment),
      evaluatorVersionHash: identifierToBytes32(clearance.inputs.evaluatorVersion),
      evaluationInputsDigest: protocolDigestToBytes32(clearance.evaluationInputsDigest),
      issuedAt: BigInt(clearance.issuedAt),
      expiresAt: BigInt(clearance.expiresAt),
    }),
    verdict: VERDICT_CLEAR_BYTES32,
  });
}
