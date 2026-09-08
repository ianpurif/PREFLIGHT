# The Graph integration contract

## Prize target

**Best AI Tooling or AI Use Case with The Graph — From Scratch**.

Rovaulta uses The Graph as a load-bearing public-context source for its account-backed deployment
agent. The agent does not treat a local catalog or a browser assertion as proof that a release is
eligible. Before it asks the existing P5 release service to prepare a deployment intent, it queries
the public Rovaulta Sepolia registry record for the exact clearance digest and verifies the indexed
bindings, verdict, revocation state, expiry, chain, registry, and block metadata.

## Implementation

- `integrations/the-graph/subgraph/` contains the from-scratch Sepolia subgraph schema, manifest,
  ABI, and event mappings for `RovaultaRegistry`.
- `apps/api/src/graph/provider.ts` is a server-only Graph Gateway adapter. It sends the exact
  clearance digest as a GraphQL variable and returns only public registry context. It has no fixture
  fallback and fails closed on missing configuration, malformed data, provider errors, stale/expired
  records, revocation, or any binding mismatch.
- `apps/api/src/agent/deployment-agent.ts` exposes `getGraphContext` in the bounded tool sequence.
  An account-backed preparation cannot reach P5 unless the live Graph result is `MATCHED`.
- `apps/api/src/agent/index.ts` resolves the target from authenticated account records, not the
  static P7 catalog. The static catalog remains available only for the explicit development fixture
  route.

The indexed entity contains only public P4 registry fields: exact P1 binding hashes, the verdict,
issuer, timestamps, revocation state, and the indexing block identity. Private safety envelopes,
blinds, rules, thresholds, behavior traces, credentials, and model output are never indexed or sent
to The Graph.

## Data and reasoning

The Graph result is decision-relevant context, not a second authority. `MATCHED` permits the agent
to continue to the direct P5 Sepolia registry read; `NOT_FOUND`, `REVOKED`, `EXPIRED`, `MISMATCH`,
or provider failure blocks preparation. P5 remains the final exact-binding, signer, nonce, and
authorization authority.

The normal judge path must show an authenticated account target, the public clearance digest, a live
Graph context result, and the subsequent P5/Ledger-required boundary. A synthetic unit-test response
or the P7 fixture is not Graph prize evidence.

## Configuration and evidence boundary

The API reads `THE_GRAPH_API_KEY`, `THE_GRAPH_SUBGRAPH_ID`, and optionally `THE_GRAPH_API_URL` from
server environment only. The browser receives the redacted public context in the agent audit, never
the API key or provider URL credentials.

This repository currently contains implementation and unit coverage, but no committed live Graph
response. Qualification evidence remains blocked until an operator deploys/indexes the subgraph,
configures a real Graph Gateway key and subgraph ID, and captures a response for a real Sepolia
registry clearance. The unit tests intentionally use injected responses and are labelled as local
validation, not provider evidence.

## Official references

- [The Graph Subgraph Studio API keys](https://thegraph.com/docs/en/subgraphs/providers/subgraph-studio/managing-api-keys/)
- [The Graph supported networks](https://thegraph.com/docs/en/supported-networks/)
- [The Graph Subgraph MCP](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)
