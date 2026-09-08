import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { ApplicationError } from "./errors.js";
import { ApplicationStore } from "./store.js";

function keyFromEnvironment(environment: NodeJS.ProcessEnv): Uint8Array {
  const configured = environment.ROVAULTA_POLICY_ENCRYPTION_KEY?.trim();
  if (configured !== undefined && configured !== "") {
    if (!/^[a-f0-9]{64}$/i.test(configured)) {
      throw new ApplicationError(
        "POLICY_UNAVAILABLE",
        "ROVAULTA_POLICY_ENCRYPTION_KEY must be 32-byte hex",
      );
    }
    return Uint8Array.from(Buffer.from(configured, "hex"));
  }

  const keyPath = resolve(
    process.cwd(),
    environment.ROVAULTA_POLICY_KEY_PATH || ".data/rovaulta-policy.key",
  );
  try {
    if (existsSync(keyPath)) {
      const stored = readFileSync(keyPath, "utf8").trim();
      if (!/^[a-f0-9]{64}$/i.test(stored)) throw new Error();
      return Uint8Array.from(Buffer.from(stored, "hex"));
    }
    mkdirSync(dirname(keyPath), { recursive: true });
    const key = randomBytes(32);
    writeFileSync(keyPath, key.toString("hex"), { encoding: "utf8", mode: 0o600 });
    return Uint8Array.from(key);
  } catch {
    throw new ApplicationError("POLICY_UNAVAILABLE", "Policy encryption key is unavailable");
  }
}

export function createApplicationStoreFromEnvironment(
  environment: NodeJS.ProcessEnv = process.env,
): ApplicationStore {
  const dbPath = resolve(
    process.cwd(),
    environment.ROVAULTA_APP_DB_PATH || ".data/rovaulta-app.sqlite",
  );
  return new ApplicationStore({ dbPath, policyKey: keyFromEnvironment(environment) });
}

export * from "./errors.js";
export * from "./store.js";
