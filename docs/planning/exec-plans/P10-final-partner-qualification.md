# P10 — Final Partner Qualification

## Outcome

Close the smallest remaining technical gaps for the normal account-backed Rovaulta flow while
keeping partner evidence truthful: a completed CRE result can return through a signed, public-only
callback; the Graph path remains load-bearing when configured; Ledger remains a human-controlled
release boundary with hardware evidence called out separately.

## Non-goals

- No P11/P12 product features, robot control, payments, Key Ring, Substreams, Subgraph MCP, or UI redesign.
- No fabricated live CRE, Graph, OpenAI, Speculos, or physical Ledger evidence.
- No confidential envelope, blind, policy, credentials, or internal evaluation diagnostics in an API
  callback or browser response.

## Invariants

- P2 remains the deterministic safety authority; CRE executes it in the TEE for normal account evaluations.
- A callback may contain only the minimal public P1 result and exact request binding.
- Callback authentication, idempotency, account scoping, and exact site/robot/build/evaluation bindings
  fail closed.
- Ledger signing remains an explicit browser/device action over the exact prepared intent.
- Graph data remains public registry context only and cannot authorize a release by itself.
- External proof is reported as blocked until credentials, deployment, and/or hardware are actually available.

## Change surfaces and order

1. Add a versioned, HMAC-authenticated CRE result callback protocol.
2. Persist account evaluation requests while CRE execution is asynchronous and complete them only from
   a verified callback.
3. Deliver the minimal result from the TEE through the official HTTP capability when configured.
4. Add narrow callback, idempotency, binding, and pending-state tests.
5. Update partner/planning/evidence documentation and the final qualification audit.
6. Run the full verification loop and record environment blockers.

## Acceptance checks

- Account `POST /evaluations` returns a pending identifier for a valid asynchronous CRE acceptance and
  never runs the local evaluator in production.
- A valid signed callback creates exactly one public evaluation visible only to its owning account.
- Replaying the same callback is idempotent; a conflicting or mis-bound callback is rejected.
- Callback payloads and CRE public results contain no private envelope, blind, policy, secret, or report data.
- Missing callback secret/configuration fails closed.
- Existing Graph and Ledger boundaries remain unchanged and no partner evidence is overstated.
- Targeted tests, full tests, lint, typecheck, build, Foundry, scaffold verification, `bun run verify`,
  and `git diff --check` pass where the environment supports them.

## External blockers

- Official CRE CLI/gateway credentials and a deployed workflow/result callback are not configured in the
  current environment.
- The Graph API key, hosted subgraph ID, and live account-created clearance response are not configured.
- OpenAI credentials/model evidence is unavailable.
- Ledger official Tester access and physical/Clear Signing evidence remain unavailable.
- Start Fresh versus Continuity prize-pool eligibility still depends on event-start evidence and track
  selection; implementation alone cannot establish it.

## Decisions

- Use a callback rather than polling because the official `workflows.execute` gateway response is
  asynchronous and supplies an execution identifier, not a documented result endpoint.
- Authenticate callback bytes with an operator-provisioned HMAC secret fetched inside the TEE. The
  callback body is canonical JSON and includes only the public result; the HMAC is never returned to the
  browser or included in evidence.

## Local verification

The completed local loop on 2026-09-09 passed `bun run verify` (lint, typecheck, package tests,
build, Foundry contracts, and scaffold verification), with 198 TypeScript tests and 2,918
assertions passing. Biome reported 27 pre-existing CSS specificity warnings and no errors. The
CRE workflow also compiled with `bun run --filter '@rovaulta/chainlink-cre' cre:compile`, and
`git diff --check` passed. This does not substitute for the still-blocked deployed CRE callback,
live Graph provider, external model, or Ledger hardware evidence.
