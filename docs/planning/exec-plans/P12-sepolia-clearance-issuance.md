# P12 — Account-backed Sepolia clearance issuance

## Outcome

Provide one operator-only, production-correct path from an account-scoped `CLEAR`
evaluation to the existing Sepolia `RovaultaRegistry.recordClearance` call. The
path must reuse the P1 clearance schema and P4 transport mapping, preflight the
authorized registrar and exact bindings, wait for confirmation, verify both
registry events and the stored clearance, and optionally write a public-only
clearance record for the existing P5/P11 flows.

## Non-goals

- No contract, registry, Graph subgraph, P2 evaluator, CRE workflow, Ledger, or UI changes.
- No private safety envelope, blinding secret, policy, credential, or signing key in logs,
  JSON output, browser responses, or evidence.
- No automatic issuance from every evaluation and no backend-held Ledger signing authority.
- No mock account/evaluation or manual Graph entity insertion.

## Invariants

- The account store is the source of the exact site/robot/build/evaluation bindings.
- Only an account-owned evaluation whose public verdict is `CLEAR` can be issued.
- The clearance digest and every bytes32 binding are produced by the existing P1/P4
  `clearanceRecordToTransport` mapping; no parallel hash scheme is permitted.
- The registrar private key is operator-only, never persisted by the API, and never printed.
- The transaction targets the pinned Ethereum Sepolia deployment and is accepted only after
  `ClearanceRecorded` and `ClearanceBindingsRecorded` match the requested public record.

## Change surfaces and order

1. Add a reusable domain/API helper that constructs a validated public clearance from an
   account `PublicEvaluation` plus explicit clearance id and timestamps.
2. Extend the existing chain-client registry ABI with registrar/write/event definitions.
3. Add a fail-closed operator script and package command that reads the account evaluation,
   simulates and submits `recordClearance`, verifies the receipt/events/readback, and emits
   only public confirmation data.
4. Add focused tests for helper binding/expiry/verdict failures and chain ABI/event shape.
5. Document the operator command, required environment, public output, and Graph follow-up;
   preserve the external live-transaction blocker until the command is actually run.
6. Run targeted tests, typecheck/lint, full verification, and an independent read-only review.

## Acceptance checks

- A command with an account-owned `CLEAR` evaluation and authorized registrar reaches a real
  Sepolia transaction without exposing confidential inputs.
- A `HOLD` evaluation, missing account/evaluation, mismatched identifiers, duplicate clearance
  id, unauthorized registrar, wrong chain, wrong registry, invalid expiry, or failed simulation
  stops before broadcast.
- The receipt is confirmed and contains exactly matching `ClearanceRecorded` and
  `ClearanceBindingsRecorded` events; a post-transaction reader confirms exact stored bindings.
- The optional output file is a complete public P4 clearance record and contains no private fields.
- No contract or Graph data is modified by the implementation.

## Risks and rollback

- A missing funded Sepolia registrar, account-created evaluation, RPC, or store key is an
  environment blocker; report it rather than fabricating a transaction.
- Re-running with the same clearance id is rejected before broadcast to avoid accidental duplicate
  attestations. The thematic commits can be reverted independently.

## Verification evidence

- `bun test apps/api/test/clearance-issuance.test.ts packages/chain-client/test/registry.test.ts`:
  8 tests passed, 38 assertions.
- `bun run typecheck`: pass across all 8 workspaces.
- `bun run build`: pass across all 8 workspaces, including Graph codegen/WASM compilation and the
  Next.js production build.
- `bun run contracts:test`: 25 Foundry tests/invariants passed.
- `bun run verify:scaffold`: pass; `git diff --check`: pass.
- `bun run verify`: pass. Biome reports 27 pre-existing CSS specificity warnings and no errors.
- A separate read-only P12 review was requested; the reviewer runtime hit its usage limit before
  returning findings. The implementation was self-reviewed for chain/registrar guards, exact
  binding reuse, receipt/event matching, secret redaction, and pre-broadcast failure behavior.
- Real Sepolia transaction, event topics, receipt, and Graph indexing: pending operator execution;
  this checkout now has one account-owned `CLEAR` produced by the authenticated official CLI
  simulation mode. The operator command still stops before broadcast until its explicit clearance,
  registrar, and confirmation inputs are supplied.
