const apiKey = process.env.THE_GRAPH_API_KEY?.trim();
const subgraphId = process.env.THE_GRAPH_SUBGRAPH_ID?.trim();
const endpoint = (
  process.env.THE_GRAPH_API_URL?.trim() || "https://gateway.thegraph.com/api"
).replace(/\/$/u, "");
const clearanceDigest = process.env.ROVAULTA_P11_CLEARANCE_DIGEST?.trim();

if (apiKey === undefined || apiKey.length === 0) {
  throw new Error("THE_GRAPH_API_KEY is required; no live evidence was collected");
}
if (subgraphId === undefined || !/^[A-Za-z0-9_-]{8,256}$/.test(subgraphId)) {
  throw new Error("THE_GRAPH_SUBGRAPH_ID is required and must be a Graph subgraph ID");
}
if (clearanceDigest === undefined || !/^0x[0-9a-fA-F]{64}$/.test(clearanceDigest)) {
  throw new Error("ROVAULTA_P11_CLEARANCE_DIGEST must be a 32-byte public clearance digest");
}
if (!/^https:\/\//u.test(endpoint)) throw new Error("THE_GRAPH_API_URL must use HTTPS");

const query = `query RovaultaClearance($digest: Bytes!) {
  clearance(id: $digest) {
    id
    clearanceDigest
    robotBuildDigest
    siteIdHash
    robotIdHash
    robotBuildIdHash
    evaluatorVersionHash
    verdict
    issuer
    issuedAt
    expiresAt
    revoked
    blockNumber
    blockHash
  }
}`;
const response = await fetch(`${endpoint}/${apiKey}/subgraphs/id/${subgraphId}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ query, variables: { digest: clearanceDigest.toLowerCase() } }),
});
const text = await response.text();
if (!response.ok) throw new Error(`The Graph provider returned HTTP ${response.status}`);
let body;
try {
  body = JSON.parse(text);
} catch {
  throw new Error("The Graph provider returned non-JSON output");
}
if (body?.errors !== undefined) throw new Error("The Graph query failed");
const entity = body?.data?.clearance;
if (entity === null || entity === undefined) {
  console.log(
    JSON.stringify(
      {
        label: "The Graph live provider query",
        source: "the-graph-gateway",
        subgraphId,
        clearanceDigest: clearanceDigest.toLowerCase(),
        status: "NOT_FOUND",
      },
      null,
      2,
    ),
  );
  process.exitCode = 2;
} else {
  // Emit only public indexed fields; the API key, private application data, and request headers
  // never enter the evidence output.
  console.log(
    JSON.stringify(
      {
        label: "The Graph live provider query",
        source: "the-graph-gateway",
        subgraphId,
        clearanceDigest: clearanceDigest.toLowerCase(),
        status: "FOUND",
        publicResult: entity,
      },
      null,
      2,
    ),
  );
}
