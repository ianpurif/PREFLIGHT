import { LEGACY_EIP712_NAME } from "@rovaulta/domain";
import { type Address, getAddress } from "viem";
import deploymentArtifact from "../../../contracts/deployments/sepolia.json";
import { failRelease } from "./errors";

export const ROVAULTA_EIP712_NAME = "Rovaulta" as const;
export const ROVAULTA_EIP712_VERSION = "1" as const;
/** EIP-712 display identity retained for signatures created before the rename. */
export const COMPATIBILITY_EIP712_NAME = LEGACY_EIP712_NAME;
export const SEPOLIA_CHAIN_ID = 11_155_111 as const;

export interface RovaultaDeployment {
  readonly chainId: typeof SEPOLIA_CHAIN_ID;
  readonly network: "ethereum-sepolia";
  readonly verifyingContract: Address;
  readonly deploymentBlock: bigint;
  readonly deploymentTransaction: `0x${string}`;
}

function parseDeploymentArtifact(input: unknown): RovaultaDeployment {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    return failRelease("REGISTRY_UNAVAILABLE", "Sepolia deployment metadata is malformed");
  }
  const value = input as Record<string, unknown>;
  if (
    value.chainId !== SEPOLIA_CHAIN_ID ||
    value.network !== "ethereum-sepolia" ||
    typeof value.deploymentBlock !== "number" ||
    !Number.isSafeInteger(value.deploymentBlock) ||
    typeof value.deploymentTransaction !== "string" ||
    !/^0x[0-9a-fA-F]{64}$/.test(value.deploymentTransaction)
  ) {
    return failRelease("REGISTRY_UNAVAILABLE", "Sepolia deployment metadata is inconsistent");
  }

  let verifyingContract: Address;
  try {
    verifyingContract = getAddress(String(value.verifyingContract));
  } catch {
    return failRelease("REGISTRY_UNAVAILABLE", "Sepolia registry address is malformed");
  }
  if (verifyingContract === "0x0000000000000000000000000000000000000000") {
    return failRelease("REGISTRY_UNAVAILABLE", "Sepolia registry address cannot be zero");
  }

  return Object.freeze({
    chainId: SEPOLIA_CHAIN_ID,
    network: "ethereum-sepolia",
    verifyingContract,
    deploymentBlock: BigInt(value.deploymentBlock),
    deploymentTransaction: value.deploymentTransaction as `0x${string}`,
  });
}

/** The checked-in P4 deployment artifact is the sole P5 domain source. */
export const ROVAULTA_SEPOLIA_DEPLOYMENT = parseDeploymentArtifact(deploymentArtifact);
