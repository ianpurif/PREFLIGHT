import { execFileSync } from "node:child_process";

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

const command = process.platform === "win32" ? "graph.cmd" : "graph";

// Authenticate without echoing the deploy key. The deploy command itself only receives the
// public slug and version label; all output is safe to retain as deployment evidence.
execFileSync(command, ["auth", deployKey], { stdio: "ignore" });
execFileSync(command, ["deploy", slug, "--version-label", versionLabel], { stdio: "inherit" });
