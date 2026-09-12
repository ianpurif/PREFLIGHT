# The Graph integration contract

## Prize target

**Best AI Tooling or AI Use Case with The Graph — From Scratch**.

### Start Fresh / From Scratch eligibility

The project maintainer declares that Rovaulta was started during ETHOnline 2026, that no
project-specific Rovaulta code existed before the event, and that no pre-existing project-specific
work is being submitted. The repository corroborates the origin with first commit `c03c89a`
(`2026-09-05`, `initialize`) followed by the chronological Rovaulta implementation history.

Rovaulta is therefore submitted to the **Start Fresh / From Scratch** pool. The declaration and
repository corroboration are recorded in
[`graph-start-fresh-eligibility-2026-09-11.md`](../compliance/evidence/graph-start-fresh-eligibility-2026-09-11.md).
Git history cannot independently prove the event calendar or work held in another private location,
so the maintainer's event submission record remains the authoritative external eligibility artifact.

### Submission evidence boundary

The official ETHOnline prize also requires a public repository and a two-to-four-minute demo video.
The repository contains the implementation and redacted live evidence, but this audit does not claim
that the required external video has been recorded. A hosted Subgraph Studio provider is the selected
live evidence path; Gateway publication is optional for this path and is not claimed.

Rovaulta uses The Graph as a load-bearing public-context source for its account-backed deployment
agent. The agent does not treat a local catalog or a browser assertion as proof that a release is
eligible. Before it asks the existing P5 release service to prepare a deployment intent, it queries
the public Rovaulta Sepolia registry record for the exact clearance digest and verifies the indexed
bindings, verdict, revocation state, expiry, chain, registry, and block metadata.

## Implementation

- `integrations/the-graph/subgraph/` contains the from-scratch Sepolia subgraph schema, manifest,
  ABI, and event mappings for `RovaultaRegistry`.
- `apps/api/src/graph/provider.ts` is a server-only Graph provider adapter. It sends the exact
  clearance digest as a GraphQL variable and returns only public registry context. It supports the
  production Gateway pair and an explicitly labelled, exact Subgraph Studio query URL for a hosted
  deployment that has not been published to Gateway. It has no fixture fallback and fails closed on
  missing configuration, malformed data, provider errors, stale/expired records, revocation, or
  any binding mismatch.
- `apps/api/src/agent/deployment-agent.ts` exposes `getGraphContext` in the bounded tool sequence.
  An account-backed preparation cannot reach P5 unless the live Graph result is `MATCHED`.
- `apps/api/src/agent/index.ts` resolves the target from authenticated account records, not the
  static P7 catalog. The static catalog remains available only for the explicit development fixture
  route.

The subgraph toolchain is pinned to `@graphprotocol/graph-cli@0.98.1` and
`@graphprotocol/graph-ts@0.38.2`. `bun run --cwd integrations/the-graph build` reproduces codegen
and WASM compilation locally; `integrations/the-graph/scripts/deploy.mjs` is the operator-only
Subgraph Studio deployment path. Generated code and build output are ignored and are not treated as
application source.

The operator has deployed the current manifest as `rovaulta-registry` version `0.1.0` on Ethereum
Sepolia. After the first real account-owned clearance was recorded, the hosted Subgraph Studio
endpoint returned the exact public entity and the API reader validated it as `MATCHED`. This is
Subgraph Studio provider evidence; it is not a Gateway or decentralized-network claim. The redacted
result is recorded in `docs/compliance/evidence/p14-live-bounty-evidence-2026-09-09.md`, and the
model-backed handoff is recorded in the P15 artifact. Gateway publication remains unclaimed.

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

The API reads the Gateway pair (`THE_GRAPH_API_KEY` and `THE_GRAPH_SUBGRAPH_ID`) and optionally
`THE_GRAPH_API_URL` from server environment only. For a hosted Subgraph Studio deployment that has
not been published to the Gateway, the explicit `THE_GRAPH_STUDIO_QUERY_URL` may be used instead;
it must be the exact HTTPS Studio query endpoint and carries no credential. The browser receives
the redacted public context in the agent audit, never the API key or provider URL credentials.

The repository's live proof can use either a configured Graph Gateway or the explicit hosted Studio
query endpoint. A Studio response must be labelled as Subgraph Studio evidence, not Gateway or
decentralized-network evidence. The unit tests intentionally use injected responses and are
labelled as local validation, not provider evidence. The current public proof uses Studio because
the hosted deployment's Gateway subgraph ID is not available in this checkout.

P11 does not add Subgraph MCP or Substreams: the minimal hosted subgraph plus the configured live
provider query is the load-bearing source needed by the deployment agent. The smallest live proof is
one account-created `CLEAR` evaluation with a corresponding public Sepolia registry event, a
`MATCHED` response for the exact clearance digest, and the agent's subsequent
`LEDGER_APPROVAL_REQUIRED` handoff. The provider response and the real Gemini-backed handoff are
captured in the P15 live evidence artifact. This is Subgraph Studio evidence, not Gateway or
decentralized-network publication; the final Ledger handoff still requires a human device action.

## Official references

- [The Graph Subgraph Studio API keys](https://thegraph.com/docs/en/subgraphs/providers/subgraph-studio/managing-api-keys/)
- [The Graph supported networks](https://thegraph.com/docs/en/supported-networks/)
- [The Graph Subgraph MCP](https://thegraph.com/docs/en/subgraphs/tooling/subgraph-mcp/introduction/)
