# P11 — The Graph Qualification

## Outcome

Make The Graph a real, server-only, load-bearing source of public Sepolia clearance
context for account-backed Rovaulta release preparation. The repository will contain a
reproducible minimal subgraph, a strict Gateway client, an agent decision gate, critical
tests, and honest live-evidence hooks. The final qualification status will distinguish
implemented code from external deployment/provider evidence.

## Non-goals

- No new partner integration, Subgraph MCP, or Substreams work.
- No change to P5 registry authority, Ledger signing, CRE confidentiality, or P2 verdict logic.
- No private safety-envelope data in the subgraph, provider response, browser, or evidence.
- No static/fixture response on the normal account-backed qualification path.
- No fabricated hosted deployment or live Graph response.

## Invariants

- The Graph is public context only; direct P5 Sepolia reads remain authoritative.
- Only exact clearance/build/site/robot bindings can reach P5 preparation.
- `MATCHED` is required before account-backed preparation; missing, stale, revoked, expired,
  mismatched, malformed, or unavailable Graph data fails closed.
- The API key remains server-side and never enters browser/client code or committed evidence.
- The subgraph indexes public registry events only.
- Account ownership remains enforced by the application store.

## Change surfaces

- `integrations/the-graph/subgraph`: manifest, schema, mapping, generated-code/deploy tooling.
- `apps/api/src/graph` and `apps/api/src/agent`: live provider validation and decision path.
- `apps/api/test`: provider, agent, account-isolation, and regression coverage.
- `README.md`, `docs/partners/THE_GRAPH.md`, architecture/ADR, evidence matrix, AI usage,
  CURRENT/TASKS, and redacted evidence artifact.
- Optional operator-only deployment/query evidence script; it must fail closed without credentials.

## Acceptance checks

- A production-quality Sepolia subgraph manifest indexes only the public `RovaultaRegistry`
  clearance and revocation events.
- The server queries The Graph Gateway with the exact clearance digest and validates all public
  bindings, chain/registry identity, verdict, revocation, expiry, and block metadata.
- A normal account-backed agent run calls the Graph gate before P5; `MATCHED` continues and every
  other state blocks. No fixture catalog is used in that path.
- Tests prove live-client request shape, missing/revoked/mismatch/expiry blocking, account
  isolation, and preservation of P5 authority.
- Documentation states the required provider/subgraph environment variables and labels live
  deployment/evidence as blocked until actually captured.
- `bun run verify` and targeted Graph/API tests pass; no secrets are committed.

## Steps

- [x] Explore current P9/P10 Graph provider, subgraph, account resolver, and agent boundary.
- [ ] Implement smallest reproducible subgraph/deployment tooling.
- [ ] Harden/extend live provider and account-agent critical path.
- [ ] Add focused tests and redacted evidence hooks.
- [ ] Run targeted and full verification.
- [ ] Request independent read-only review and resolve findings.
- [ ] Update docs, evidence, CURRENT, TASKS, and AI usage records.

## Parallel work / worktrees

Read-only review can be delegated after implementation. Write changes stay in this worktree to
avoid conflicting edits across the API, subgraph, and documentation surfaces.

## Risks and rollback

- Hosted Graph credentials, subgraph deployment, and a real indexed clearance may be unavailable;
  report this as an external blocker instead of claiming qualification.
- Graph indexing is eventually consistent; the agent must fail closed and expose block metadata.
- New deployment tooling must not run automatically during normal builds or tests.
- Revert thematic commits independently if provider validation or subgraph generation regresses.

## Decisions / deviations

- Use a hosted Sepolia Subgraph Studio/Gateway deployment, not a browser query or a local indexer.
- Keep the existing single `Clearance` entity and public hash fields; do not index private policy,
  envelope, blind, trace, credential, or model data.
- Continue to use the exact clearance digest as the query key; no broad analytics query is needed.

## Verification evidence

To be filled with commit hashes, targeted test counts, `bun run verify`, subgraph compile/deploy
output if credentials exist, and a strict final PASS/PARTIAL/FAIL/BLOCKED qualification table.
