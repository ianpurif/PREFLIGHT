import {
  type DEPLOYMENT_ACTION,
  type DeploymentIntent,
  digestDeploymentIntent,
  PROTOCOL_VERSION,
  parseDeploymentIntent,
} from "@rovaulta/domain";
import {
  type Address,
  getAddress,
  type Hex,
  hashTypedData,
  isHex,
  keccak256,
  recoverTypedDataAddress,
} from "viem";
import {
  ROVAULTA_EIP712_NAME,
  ROVAULTA_EIP712_VERSION,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
} from "./deployment";
import { failRelease } from "./errors";
import { protocolDigestToBytes32 } from "./transport";

export const ROVAULTA_DEPLOYMENT_INTENT_TYPES = Object.freeze({
  DeploymentIntent: Object.freeze([
    Object.freeze({ name: "protocolVersion", type: "string" }),
    Object.freeze({ name: "schemaVersion", type: "string" }),
    Object.freeze({ name: "action", type: "string" }),
    Object.freeze({ name: "siteId", type: "string" }),
    Object.freeze({ name: "robotId", type: "string" }),
    Object.freeze({ name: "robotBuildId", type: "string" }),
    Object.freeze({ name: "robotBuildDigest", type: "bytes32" }),
    Object.freeze({ name: "clearanceId", type: "string" }),
    Object.freeze({ name: "clearanceDigest", type: "bytes32" }),
    Object.freeze({ name: "targetEnvironment", type: "string" }),
    Object.freeze({ name: "authorizedSigner", type: "address" }),
    Object.freeze({ name: "nonce", type: "string" }),
    Object.freeze({ name: "issuedAt", type: "uint64" }),
    Object.freeze({ name: "expiresAt", type: "uint64" }),
    Object.freeze({ name: "protocolIntentDigest", type: "bytes32" }),
  ]),
} as const);

export interface PreparedDeploymentTypedData {
  readonly domain: {
    readonly name: typeof ROVAULTA_EIP712_NAME;
    readonly version: typeof ROVAULTA_EIP712_VERSION;
    readonly chainId: 11_155_111;
    readonly verifyingContract: Address;
  };
  readonly types: typeof ROVAULTA_DEPLOYMENT_INTENT_TYPES;
  readonly primaryType: "DeploymentIntent";
  readonly message: {
    readonly protocolVersion: typeof PROTOCOL_VERSION;
    readonly schemaVersion: string;
    readonly action: typeof DEPLOYMENT_ACTION;
    readonly siteId: string;
    readonly robotId: string;
    readonly robotBuildId: string;
    readonly robotBuildDigest: Hex;
    readonly clearanceId: string;
    readonly clearanceDigest: Hex;
    readonly targetEnvironment: "sepolia";
    readonly authorizedSigner: Address;
    readonly nonce: string;
    readonly issuedAt: bigint;
    readonly expiresAt: bigint;
    readonly protocolIntentDigest: Hex;
  };
}

export interface PreparedLedgerSigningRequest {
  readonly intent: DeploymentIntent;
  readonly protocolIntentDigest: string;
  readonly authorizedSigner: Address;
  readonly typedData: PreparedDeploymentTypedData;
  readonly typedDataDigest: Hex;
}

export function buildDeploymentTypedData(
  intentInput: unknown,
  authorizedSignerInput: string,
): PreparedLedgerSigningRequest {
  const intent = parseDeploymentIntent(intentInput);
  let authorizedSigner: Address;
  try {
    authorizedSigner = getAddress(authorizedSignerInput);
  } catch {
    return failRelease("UNAUTHORIZED_SIGNER", "Authorized signer address is malformed");
  }
  const protocolIntentDigest = digestDeploymentIntent(intent);
  const typedData: PreparedDeploymentTypedData = Object.freeze({
    domain: Object.freeze({
      name: ROVAULTA_EIP712_NAME,
      version: ROVAULTA_EIP712_VERSION,
      chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
      verifyingContract: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
    }),
    types: ROVAULTA_DEPLOYMENT_INTENT_TYPES,
    primaryType: "DeploymentIntent",
    message: Object.freeze({
      protocolVersion: PROTOCOL_VERSION,
      schemaVersion: intent.schemaVersion,
      action: intent.action,
      siteId: intent.siteId,
      robotId: intent.robotId,
      robotBuildId: intent.robotBuildId,
      robotBuildDigest: protocolDigestToBytes32(intent.robotBuildDigest),
      clearanceId: intent.clearanceId,
      clearanceDigest: protocolDigestToBytes32(intent.clearanceDigest),
      targetEnvironment: intent.targetEnvironment,
      authorizedSigner,
      nonce: intent.nonce,
      issuedAt: BigInt(intent.issuedAt),
      expiresAt: BigInt(intent.expiresAt),
      protocolIntentDigest: protocolDigestToBytes32(protocolIntentDigest),
    }),
  });
  return Object.freeze({
    intent,
    protocolIntentDigest,
    authorizedSigner,
    typedData,
    typedDataDigest: hashTypedData(typedData),
  });
}

export function assertCanonicalSignature(signature: unknown): Hex {
  if (typeof signature !== "string" || !isHex(signature) || signature.length !== 132) {
    return failRelease("MALFORMED_SIGNATURE", "Ledger signature must be canonical 65-byte hex");
  }
  return signature;
}

export function hashReleaseSignature(signatureInput: unknown): Hex {
  return keccak256(assertCanonicalSignature(signatureInput));
}

export async function recoverDeploymentIntentSigner(
  request: PreparedLedgerSigningRequest,
  signatureInput: unknown,
): Promise<Address> {
  const signature = assertCanonicalSignature(signatureInput);
  try {
    return getAddress(await recoverTypedDataAddress({ ...request.typedData, signature }));
  } catch {
    return failRelease("MALFORMED_SIGNATURE", "Ledger signature could not be recovered");
  }
}

export async function assertDeploymentIntentSignature(
  request: PreparedLedgerSigningRequest,
  signatureInput: unknown,
): Promise<Address> {
  const recovered = await recoverDeploymentIntentSigner(request, signatureInput);
  if (recovered !== request.authorizedSigner) {
    return failRelease("SIGNATURE_MISMATCH", "Signature does not match the authorized signer");
  }
  return recovered;
}
