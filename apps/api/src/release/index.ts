import { resolve } from "node:path";
import { failRelease, ViemClearanceRegistryReader } from "@rovaulta/chain-client";
import { readEnvironment } from "../environment.js";
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
    readEnvironment(environment, "ROVAULTA_RELEASE_DB_PATH") || ".data/rovaulta-release.sqlite",
  );
  const ttl = Number(readEnvironment(environment, "ROVAULTA_INTENT_TTL_SECONDS") || "300");
  return new ReleaseService({
    reader: new ViemClearanceRegistryReader(rpcUrl),
    store: new SqliteReleaseStore(storePath),
    signers: AuthorizedSignerPolicy.fromEnvironment(
      readEnvironment(environment, "ROVAULTA_AUTHORIZED_SIGNERS"),
    ),
    intentTtlSeconds: ttl,
  });
}
