import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const slug = process.env.GRAPH_SUBGRAPH_SLUG?.trim();
const deployKey = process.env.GRAPH_DEPLOY_KEY?.trim();
const versionLabel = process.env.GRAPH_VERSION_LABEL?.trim() || "0.1.0";

if (slug === undefined || slug.length === 0) {
  throw new Error("GRAPH_SUBGRAPH_SLUG is required (for example account/rovaulta-registry)");
}
if (deployKey === undefined || deployKey.length === 0) {
  throw new Error("GRAPH_DEPLOY_KEY is required; do not commit or print it");
}
if (!/^[0-9A-Za-z][0-9A-Za-z._-]{0,63}$/.test(versionLabel)) {
  throw new Error("GRAPH_VERSION_LABEL is malformed");
}

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const command = resolve(
  packageRoot,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "graph.exe" : "graph",
);
if (!existsSync(command)) {
  throw new Error(`Pinned Graph CLI binary was not found at ${command}; run bun install first`);
}

function runCli(args, stdio) {
  try {
    execFileSync(command, args, { cwd: packageRoot, stdio });
  } catch (error) {
    const detail =
      error instanceof Error
        ? error.message.replaceAll(deployKey, "[redacted]")
        : "unknown Graph CLI failure";
    throw new Error(`Graph CLI ${args[0] ?? "command"} failed: ${detail}`);
  }
}

// Authenticate without echoing the deploy key. The deploy command itself only receives the
// public slug and version label; all output is safe to retain as deployment evidence.
runCli(["auth", deployKey], "ignore");
runCli(["deploy", slug, "subgraph/subgraph.yaml", "--version-label", versionLabel], "inherit");
