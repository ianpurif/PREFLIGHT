# P14 — Live Bounty Evidence Closure

## Outcome

Complete every locally and externally authorized proof step that remains for the selected
Chainlink, The Graph, and Ledger submission paths. The first step is a real account-owned
authenticated CRE-simulation `CLEAR` recorded through the existing P12 Sepolia operator path.
The next step is to consume the resulting public registry entity through the already deployed
Rovaulta Subgraph Studio endpoint and drive the existing account-agent Graph gate. Ledger remains
the final human authorization boundary; no physical-device result is inferred.

## Non-goals

- No live CRE/DON deployment, Deploy Access, callback provisioning, or P13 redesign.
- No new contract logic, registry deployment, subgraph schema, safety evaluator, or Ledger signer.
- No fake Graph entities, fixture substitution on the live path, fake AI output, or physical-device claim.
- No backend signing or automatic Ledger authorization.

## Invariants

- The Sepolia clearance must come from the persisted account-owned `CLEAR` and exact P1/P4 bindings.
- The Graph response is public context only; direct P5 Sepolia reads remain authoritative.
- Only an exact `MATCHED` Graph context can reach `ReleaseService.prepare()`.
- Confidential CRE inputs, credentials, keys, policies, and model payloads never enter evidence.
- `LEDGER_APPROVAL_REQUIRED` remains the successful agent boundary; `AUTHORIZED` requires a real
  Ledger-backed signature and nonce consumption.

## Change surfaces and order

1. Audit tool/runtime/configuration availability and verify the persisted account evaluation.
2. Run the existing P12 operator command with a unique clearance id and capture public confirmation.
3. Query the exact clearance through the deployed Graph provider. If the deployed endpoint is
   Subgraph Studio rather than Gateway, add only an explicit server-side direct-query configuration
   path while preserving the existing Gateway path and strict response validation.
4. Run the account-backed agent gate with live Graph context. Use only a real configured model; if
   provider credentials are absent, capture the live Graph proof and leave model execution blocked.
5. Run available Ledger/Speculos software evidence and record physical/Tester limitations honestly.
6. Update redacted evidence, sponsor matrix, planning state, AI usage, and runbook commands.
7. Run targeted tests, partner checks, full verification, and an independent read-only review.

## Acceptance checks

- A real Sepolia transaction confirms both registry events and exact readback for the account-owned
  simulation `CLEAR`.
- The deployed Graph endpoint returns the same public clearance digest and bindings from live indexed
  data; no manual entity insertion is used.
- The normal agent path consumes that live Graph context and either reaches
  `LEDGER_APPROVAL_REQUIRED` or fails closed for a truthful external provider reason.
- Ledger software/emulator evidence remains distinct from physical hardware and official Tester
  evidence.
- All evidence artifacts are public-only and identify simulation, on-chain, Graph, and Ledger
  provenance separately.

## Risks and blockers

- Sepolia funding/registrar authorization can block only the live transaction; do not retry with a
  different account or fabricate a record.
- Studio query endpoints are rate-limited testing endpoints; a Gateway subgraph ID may be required
  for production-like provider evidence.
- An absent external model key blocks live provider reasoning but does not justify a fake model call.
- Physical Ledger evidence requires the actual device and official Tester access.

## Verification evidence

- 2026-09-09: the persisted account-owned `CLEAR` evaluation was recorded through the existing
  P12 command on Ethereum Sepolia. The receipt confirmed `ClearanceRecorded` and
  `ClearanceBindingsRecorded`, exact registry readback, and public output was captured in the
  redacted P14 artifact.
- 2026-09-09: the deployed `rovaulta-registry` v0.1.0 Subgraph Studio endpoint returned the exact
  clearance entity. The strict API reader returned `MATCHED`; indexing metadata reported no
  indexing errors. This is live Studio evidence and is not labelled Gateway/decentralized evidence.
- 2026-09-09: the live-account agent command was attempted with the exact account clearance and
  Studio provider. It failed closed before model execution because `GEMINI_API_KEY` is absent. No
  model, Ledger signature, or authorization is claimed.
- 2026-09-09: Graph provider tests cover the direct Studio endpoint and malformed URL rejection;
  existing Ledger software tests pass. Physical Ledger and official Clear Signing Tester access
  remain external blockers.

## Independent review

- A fresh read-only review checked the provider trust boundary, evidence redaction, and planning
  terminology. It identified that the query-only helper did not perform the production reader's
  full binding policy; the evidence wording and helper comments now state that boundary explicitly.
  No remaining actionable findings were reported.

## Follow-up evidence captured 2026-09-10

The previously external model step was rerun without changing the Chainlink, Graph, or Ledger
architecture. With the existing account-owned Sepolia clearance and hosted Studio endpoint, the
official Gemini SDK completed all seven host-selected calls and reached `LEDGER_APPROVAL_REQUIRED`
after `prepareDeploymentIntent`. The run used the explicit server-side `GEMINI_MODEL=gemini-3.5-flash`
override because the configured key rejects `gemini-2.5-flash` for new users. Public-only details
are recorded in `p15-live-gemini-graph-ledger-boundary-2026-09-10.md`; no physical Ledger use or
authorization is claimed.
