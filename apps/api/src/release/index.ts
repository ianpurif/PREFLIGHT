import { resolve } from "node:path";
import { failRelease, ViemClearanceRegistryReader } from "@preflight/chain-client";
import { SqliteReleaseStore } from "./nonce-store.js";
import { ReleaseService } from "./release-service.js";
import { AuthorizedSignerPolicy } from "./signer-policy.js";

export * from "./nonce-store.js";
export * from "./release-service.js";
export * from "./signer-policy.js";

export function createReleaseServiceFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ReleaseService {
  const rpcUrl = environment.EVM_RPC_URL || environment.SEPOLIA_RPC_URL;
  if (rpcUrl === undefined || rpcUrl === "") {
    return failRelease("REGISTRY_UNAVAILABLE", "A Sepolia RPC URL is required for P5");
  }
  const storePath = resolve(
    process.cwd(),
    environment.PREFLIGHT_RELEASE_DB_PATH || ".data/preflight-release.sqlite",
  );
  const ttl = Number(environment.PREFLIGHT_INTENT_TTL_SECONDS || "300");
  return new ReleaseService({
    reader: new ViemClearanceRegistryReader(rpcUrl),
    store: new SqliteReleaseStore(storePath),
    signers: AuthorizedSignerPolicy.fromEnvironment(environment.PREFLIGHT_AUTHORIZED_SIGNERS),
    intentTtlSeconds: ttl,
  });
}
