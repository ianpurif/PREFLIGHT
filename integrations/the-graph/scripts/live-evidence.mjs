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
    clearanceIdHash
    evaluationIdHash
    siteIdHash
    robotIdHash
    robotBuildIdHash
    robotBuildDigest
    safetyEnvelopeIdHash
    safetyEnvelopeCommitment
    evaluatorVersionHash
    evaluationInputsDigest
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
if (new TextEncoder().encode(text).byteLength > 256 * 1024) {
  throw new Error("The Graph provider response exceeded its size bound");
}
if (!response.ok) throw new Error(`The Graph provider returned HTTP ${response.status}`);
let body;
try {
  body = JSON.parse(text);
} catch {
  throw new Error("The Graph provider returned non-JSON output");
}
if (body === null || typeof body !== "object" || Array.isArray(body)) {
  throw new Error("The Graph provider returned malformed output");
}
if (body.errors !== undefined) throw new Error("The Graph query failed");
if (body.data === null || typeof body.data !== "object" || Array.isArray(body.data)) {
  throw new Error("The Graph provider returned malformed data");
}
if (!Object.hasOwn(body.data, "clearance")) {
  throw new Error("The Graph provider returned no clearance field");
}
const entity = body.data.clearance;
if (entity === null) {
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
  if (entity === undefined || typeof entity !== "object" || Array.isArray(entity)) {
    throw new Error("The Graph provider returned a malformed clearance");
  }
  const hex32 = (value, label) => {
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]{64}$/u.test(value)) {
      throw new Error(`The Graph clearance ${label} is malformed`);
    }
    return value.toLowerCase();
  };
  const address = (value, label) => {
    if (typeof value !== "string" || !/^0x[0-9a-fA-F]{40}$/u.test(value)) {
      throw new Error(`The Graph clearance ${label} is malformed`);
    }
    return value.toLowerCase();
  };
  const decimal = (value, label) => {
    if (typeof value !== "string" || !/^(0|[1-9][0-9]*)$/u.test(value)) {
      throw new Error(`The Graph clearance ${label} is malformed`);
    }
    return value;
  };
  const publicResult = {
    id: hex32(entity.id, "id"),
    clearanceDigest: hex32(entity.clearanceDigest, "clearanceDigest"),
    clearanceIdHash: hex32(entity.clearanceIdHash, "clearanceIdHash"),
    evaluationIdHash: hex32(entity.evaluationIdHash, "evaluationIdHash"),
    siteIdHash: hex32(entity.siteIdHash, "siteIdHash"),
    robotIdHash: hex32(entity.robotIdHash, "robotIdHash"),
    robotBuildIdHash: hex32(entity.robotBuildIdHash, "robotBuildIdHash"),
    robotBuildDigest: hex32(entity.robotBuildDigest, "robotBuildDigest"),
    safetyEnvelopeIdHash: hex32(entity.safetyEnvelopeIdHash, "safetyEnvelopeIdHash"),
    safetyEnvelopeCommitment: hex32(entity.safetyEnvelopeCommitment, "safetyEnvelopeCommitment"),
    evaluatorVersionHash: hex32(entity.evaluatorVersionHash, "evaluatorVersionHash"),
    evaluationInputsDigest: hex32(entity.evaluationInputsDigest, "evaluationInputsDigest"),
    verdict: hex32(entity.verdict, "verdict"),
    issuer: address(entity.issuer, "issuer"),
    issuedAt: decimal(entity.issuedAt, "issuedAt"),
    expiresAt: decimal(entity.expiresAt, "expiresAt"),
    revoked: entity.revoked,
    blockNumber: decimal(entity.blockNumber, "blockNumber"),
    blockHash: hex32(entity.blockHash, "blockHash"),
  };
  if (typeof publicResult.revoked !== "boolean") {
    throw new Error("The Graph clearance revoked flag is malformed");
  }
  if (publicResult.id !== clearanceDigest.toLowerCase()) {
    throw new Error("The Graph clearance id does not match the requested digest");
  }
  if (publicResult.clearanceDigest !== clearanceDigest.toLowerCase()) {
    throw new Error("The Graph clearance digest does not match the requested digest");
  }
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
        publicResult,
      },
      null,
      2,
    ),
  );
}
