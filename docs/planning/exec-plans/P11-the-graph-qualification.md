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
- [x] Implement smallest reproducible subgraph/deployment tooling.
- [x] Harden/extend live provider and account-agent critical path.
- [x] Add focused tests and redacted evidence hooks.
- [x] Run targeted and full verification.
- [x] Request independent read-only review and resolve findings.
- [x] Update docs, evidence, CURRENT, TASKS, and AI usage records.

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

- Implementation commits: `0f6536d`, `d1b09f3`, `2958f86`, `d394008`, `df3e79a`, `f0cd22a`,
  `17eeff7`.
- `bun run --cwd integrations/the-graph build`: pass; pinned Graph CLI code generation and
  AssemblyScript/WASM compilation completed.
- `bun test apps/api/test/graph-provider.test.ts apps/api/test/deployment-agent.test.ts`: pass;
  18 tests and 116 assertions.
- `bun run test`: pass; 204 tests, 2,958 assertions, zero failures across 12 Turbo tasks.
- `bun run verify`: pass; lint, typecheck, package tests, all builds (including the Graph
  subgraph), Foundry contracts, and scaffold verification completed successfully.
- `bun run --cwd integrations/the-graph evidence:live`: expected fail-closed blocker because
  `THE_GRAPH_API_KEY` is unset; no live response was collected.
- The hosted Subgraph Studio deployment is live on Sepolia and the first real account-owned
  clearance is indexed. The direct Studio query and server provider both return `MATCHED` for the
  exact public digest; this is labelled Studio evidence, not Gateway or decentralized-network
  evidence. A live Gateway subgraph ID, model-backed agent handoff, and Start Fresh pool
  eligibility remain external/unverified. The qualification artifact preserves those as
  `PARTIAL`/`BLOCKED`, not as evidence.

## Independent review resolution

- The read-only review found no authority, privacy, or fixture-fallback regression. The focused
  account-agent test now asserts that the Graph read occurs before every direct P5 registry read.
- The Fastify route intentionally accepts an injected `DeploymentAgent`; it forwards the
  authenticated account id and exact public clearance to that agent. The environment-wired
  constructor is exercised by `apps/api evidence:p11-graph` when live configuration exists, so a
  second test that replaces the production constructor would not add independent authority
  coverage. The live provider/account trace remains externally blocked rather than mocked.
- The evidence helper now rejects malformed/oversized responses and emits only an allowlisted,
  validated public entity projection.
