import { failRelease } from "@rovaulta/chain-client";
import { type Address, getAddress } from "viem";

export class AuthorizedSignerPolicy {
  readonly #signers: ReadonlySet<Address>;

  constructor(inputs: readonly string[]) {
    const normalized = new Set<Address>();
    for (const input of inputs) {
      let address: Address;
      try {
        address = getAddress(input.trim());
      } catch {
        failRelease("UNAUTHORIZED_SIGNER", "Authorized-signer configuration is malformed");
      }
      if (normalized.has(address)) {
        failRelease("UNAUTHORIZED_SIGNER", "Authorized-signer configuration contains duplicates");
      }
      normalized.add(address);
    }
    if (normalized.size === 0) {
      failRelease("UNAUTHORIZED_SIGNER", "At least one authorized Ledger signer is required");
    }
    this.#signers = normalized;
  }

  static fromEnvironment(value: string | undefined): AuthorizedSignerPolicy {
    return new AuthorizedSignerPolicy(
      (value ?? "")
        .split(",")
        .map((part) => part.trim())
        .filter((part) => part !== ""),
    );
  }

  assertAuthorized(input: string): Address {
    let address: Address;
    try {
      address = getAddress(input);
    } catch {
      return failRelease("UNAUTHORIZED_SIGNER", "Connected signer address is malformed");
    }
    if (!this.#signers.has(address)) {
      return failRelease("UNAUTHORIZED_SIGNER", "Connected Ledger signer is not authorized");
    }
    return address;
  }
}
