# P9 — Partner bounty qualification vertical slice

## Outcome

Make the normal Rovaulta lifecycle carry the partner-critical paths without introducing a
bounty-only product mode:

`account → site → robot → build → CRE-backed evaluation → public clearance context → bounded AI preparation → Ledger handoff`

The Chainlink confidential handler must be the evaluation boundary for at least one real
account-created request. The AI deployment agent must consume live public registry context from The
Graph while P5 remains the final exact-binding and authorization authority.

## Non-goals

- no robot activation or physical-safety claim
- no new Ledger Key Ring/payment direction
- no replacement of P5 RPC/nonce/signature authority with The Graph
- no private-envelope indexing, Graph client-side secrets, or raw model output in public audit
- no Substreams one-prompt challenge unless separately authorized
- no live CRE/DON deployment claim; authenticated CLI simulation remains valid evidence
- no removal of the explicit P7 fixture route
- no broad persistence migration or UI redesign

## Invariants

- P2 remains the deterministic verdict authority; CRE wraps the same evaluator.
- Private policy/envelope/blind material stays inside the confidential evaluation boundary and API
  private boundary; the browser and Graph never receive it.
- Graph data is public context only. Missing, stale, conflicting, or unavailable Graph data must
  fail closed for the AI preparation path, while direct P5 exact registry checks remain final.
- Agent tools cannot sign, consume authorization, write registry state, invent bindings, or bypass
  Ledger human approval.
- Account-created targets remain account-scoped; fixture catalogs cannot serve as normal product
  data.
- A changed build digest invalidates any previous clearance and prepared release.
- Evidence labels must distinguish live Graph/provider data, CRE simulation, emulator, fixture, and
  unavailable external hardware/provider access.

## Change surfaces

1. Chainlink adapter boundary used by the authenticated application evaluation path.
2. `RovaultaRegistry` public event indexing schema and Graph provider adapter.
3. Account-backed deployment-agent target resolution and Graph context tool/state transition.
4. Normal release UX handoff and public evidence projection.
5. Targeted tests, partner evidence, planning state, README, and AI usage records.

## Acceptance checks

- An authenticated account-created evaluation invokes the CRE-backed evaluator boundary and returns
  only the existing public evaluation projection; CRE failure is explicit and does not silently
  fall back to a second verdict path in qualifying mode.
- The authenticated CRE simulation evidence remains green for unsafe `HOLD`, corrected `CLEAR`,
  and tampered `REJECT`.
- A real deployed Sepolia registry event is queried through a live Graph provider with a
  server-side API key; no fixture or static Graph response is used for evidence.
- The bounded agent receives Graph-derived public clearance context for an account-created target;
  missing/revoked/mismatched Graph state blocks preparation, while a matching record permits the
  existing P5 exact check to decide the next state.
- Normal P8 routes can prepare the same account-created target through the bounded agent without
  relying on the static catalog or `/dev-fixtures/evaluate`.
- Graph outage, stale index, account mismatch, build mutation, malformed model calls, and agent
  authority attempts fail closed.
- Existing P7 fixture tests, account isolation tests, Ledger authority tests, and CRE tests remain
  green.
- Evidence and README identify live/provider/simulation/emulator/fixture boundaries truthfully.

## Steps

- [x] Explore current architecture, partner requirements, and evidence gaps
- [x] Add the smallest CRE application adapter and targeted account-path tests
- [x] Add the minimal RovaultaRegistry Sepolia Subgraph artifacts and live provider adapter
- [x] Add account-backed Graph context to the bounded agent
- [x] Route normal release preparation through the account-backed agent boundary
- [x] Add negative tests for missing/revoked/mismatched Graph state and authority attempts
- [ ] Capture live Graph evidence and update partner documentation
- [x] Run targeted verification for the implemented boundaries
- [ ] Run the full verification loop
- [ ] Obtain independent read-only review and resolve findings
- [x] Update task state, evidence matrix, README, and partner/architecture documentation
- [ ] Capture a completed account-created CRE result and a live Graph `MATCHED` result

## Parallel work / worktrees

Read-only architecture and partner reviews may run in parallel. Write work stays in this worktree
and is sequenced by dependency: protocol/adapters → Graph provider/subgraph → agent/API → UI/docs.

## Risks and rollback

- CRE SDK/runtime constraints may prevent a direct server-side call. Preserve the existing workflow
  and stop with an explicit unavailable state rather than adding an unsupported bridge.
- Graph Studio deployment, API key, or Sepolia indexing may be unavailable. Keep the adapter
  disabled until configured and record the external blocker; never substitute fixtures.
- Graph indexing lag can disagree with the registry. Fail closed for the agent and always retain
  direct P5 checks as final authority.
- If the normal product cannot safely expose agent preparation for account data in this iteration,
  keep `/dev-fixtures/evaluate` unchanged and document the qualification blocker rather than
  claiming completion.

## Decisions / deviations

- Direct GraphQL Subgraph queries are preferred over Subgraph MCP or Substreams because the target
  is an existing custom Sepolia registry and the main prize does not require a featured challenge.
- The Graph indexes only public registry events and never private safety material.
- A live Graph result is an agent context prerequisite, not a replacement for P5 security checks.

## Verification evidence

Targeted local validation currently passes:

```text
bun --cwd apps/api typecheck
bun --cwd apps/api test test/application-lifecycle.test.ts test/server.test.ts test/deployment-agent.test.ts test/graph-provider.test.ts test/cre-client.test.ts
```

The P3 authenticated CRE simulation evidence remains in
`docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md`. A live Graph
query identity, a completed account-created CRE result, and the full `bun run verify` result remain
open. The current environment has no CRE gateway/workflow/private key, Graph API key/subgraph ID,
RPC, or OpenAI provider/model configuration; no live partner claim is made.
