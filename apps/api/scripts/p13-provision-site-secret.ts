import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createApplicationStoreFromEnvironment } from "../src/application/index.js";

const ACCOUNT_ID_PATTERN = /^account:[a-f0-9]{32}$/;
const SITE_ID_PATTERN = /^site:[a-f0-9]{32}$/;
const TARGET_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function validated(name: string, pattern: RegExp, message: string): string {
  const value = required(name);
  if (!pattern.test(value)) throw new Error(message);
  return value;
}

function redactedError(error: unknown, sensitive: readonly string[]): string {
  const candidate = error instanceof Error ? error.message : "CRE secrets provisioning failed";
  return sensitive.reduce((message, value) => message.replaceAll(value, "[redacted]"), candidate);
}

function run(): void {
  const accountId = validated(
    "ROVAULTA_P13_ACCOUNT_ID",
    ACCOUNT_ID_PATTERN,
    "ROVAULTA_P13_ACCOUNT_ID must be an authenticated account identifier",
  );
  const siteId = validated(
    "ROVAULTA_P13_SITE_ID",
    SITE_ID_PATTERN,
    "ROVAULTA_P13_SITE_ID must be a site identifier",
  );
  const target =
    process.env.ROVAULTA_CRE_TARGET?.trim() ||
    process.env.CHAINLINK_CRE_TARGET?.trim() ||
    "staging-settings";
  if (!TARGET_PATTERN.test(target)) {
    throw new Error("ROVAULTA_CRE_TARGET or CHAINLINK_CRE_TARGET is malformed");
  }

  const store = createApplicationStoreFromEnvironment();
  let secret: ReturnType<typeof store.readConfidentialEvaluationSecretForOperator>;
  try {
    secret = store.readConfidentialEvaluationSecretForOperator(accountId, siteId);
  } finally {
    store.close();
  }

  const temporaryRoot = mkdtempSync(join(tmpdir(), "rovaulta-p13-cre-secrets-"));
  const secretsPath = join(temporaryRoot, "secrets-names.yaml");
  const secretsAuth = process.env.ROVAULTA_CRE_SECRETS_AUTH?.trim();
  try {
    writeFileSync(
      secretsPath,
      `secretsNames:\n  ${JSON.stringify(secret.selector)}:\n    - ROVAULTA_P13_SITE_SECRET_VALUE\n`,
      { encoding: "utf8", mode: 0o600, flag: "wx" },
    );
    const cli =
      process.env.ROVAULTA_CRE_CLI?.trim() || (process.platform === "win32" ? "cre.exe" : "cre");
    const args = ["secrets", "create", secretsPath, "--target", target];
    if (secretsAuth !== undefined && secretsAuth.length > 0) {
      args.push(`--secrets-auth=${secretsAuth}`);
    }
    const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
    execFileSync(cli, args, {
      cwd: repositoryRoot,
      env: { ...process.env, ROVAULTA_P13_SITE_SECRET_VALUE: secret.value },
      encoding: "utf8",
      stdio: "pipe",
    });
    console.log(
      JSON.stringify(
        {
          status: "PROVISIONED",
          target,
          selector: secret.selector,
          secretNamespace: "main",
          accountId,
          siteId,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    throw new Error(redactedError(error, [secret.value, secretsAuth ?? ""]));
  } finally {
    rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

try {
  run();
} catch (error) {
  console.error(
    JSON.stringify(
      {
        status: "BLOCKED",
        error: error instanceof Error ? error.message : "CRE site-secret provisioning failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
}
