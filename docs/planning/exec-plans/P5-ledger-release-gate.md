# P5 — Ledger Release Gate

## Outcome

The agent-facing proposal API allows an operator or future autonomous deployment client to prepare
an exact robot release request, but a release authorization exists only after deterministic policy
validates the exact live Sepolia clearance, an explicitly authorized human approves the full
EIP-712 intent on a Ledger device, the server cryptographically verifies the signature and repeats
the live clearance check, and a durable nonce is atomically consumed exactly once. P5 does not
claim an autonomous-agent runtime or execution demonstration.

## Non-goals

- P6 robot activation, digital-twin UI, visualization, or autonomous execution
- private-key custody, backend signing, Ledger Key Ring, headless signing, or a general agent framework
- legacy LedgerJS, hashed EIP-712, blind signing, personal signing, raw transaction signing, or fallback signing
- changing P4 contract state/authorization semantics or claiming Ledger/Rovaulta proves physical robot safety
- replacing P1 canonical serialization/digests or creating a competing deployment-intent model

## Invariants

- The exact action is fixed to `ACTIVATE_DEPLOYMENT`; callers cannot supply arbitrary actions.
- The signable message binds protocol/schema version, exact site/robot/build/build digest,
  clearance ID/digest, Sepolia target, authorized signer, nonce, issuance, expiry, and the canonical
  P1 deployment-intent digest.
- The EIP-712 domain is exactly `Rovaulta`, version `1`, chain ID `11155111`, and the deployed
  `RovaultaRegistry` address read from `contracts/deployments/sepolia.json`.
- The deterministic policy, not an AI agent or frontend boolean, decides whether Ledger may be
  prompted. Any RPC, chain, contract, clearance, expiry, signer, persistence, or binding failure
  blocks before hardware.
- Ledger access exists only in an explicit browser/WebHID user gesture through current DMK,
  WebHID Device Transport Kit, and Ethereum Device Signer Kit packages.
- Full EIP-712 Clear Signing is mandatory. Any legacy/hashed/blind/personal/raw fallback state is
  cancelled and fails closed; a physical rejection is `HUMAN_REJECTED` and is never retried.
- The API never signs and never receives a private key. It reconstructs typed data from its stored
  exact intent, recovers the signer, rechecks the current authorized-signer set, and repeats the
  live P4 exact-binding check before authorizing.
- Nonces are generated server-side with at least 128 random bits, persisted in SQLite, and consumed
  with one atomic `ISSUED -> CONSUMED` compare-and-set. No memory or browser fallback exists.
- Validity is `issuedAt <= now < expiresAt`; equality at expiry rejects. Live policy time is the
  timestamp of the exact Sepolia block used for the registry snapshot.
- A clearance for Build A never permits an intent or signed authorization for Build B.

## Change surfaces

- `packages/domain`: smallest P5-compatible evolution of the existing DeploymentIntent and its
  deterministic/negative regression vectors
- `packages/chain-client`: authoritative deployment metadata, exact consistent-block P4 reader,
  P1-to-P4 transport mapping, deterministic EIP-712 construction/digest/recovery, and release policy
- `apps/api`: deterministic prepare/consume service and routes, explicit signer configuration,
  durable SQLite nonce/authorization authority, logging redaction
- `packages/ledger-gate`: browser-only DMK/WebHID/Ethereum signer lifecycle, strict request parsing,
  full-typed-data-only enforcement, normalized failures
- `apps/web`: minimal P5 operator/hardware evidence harness requiring an explicit user gesture;
  no P6 activation or digital twin
- `scripts/verify-scaffold.mjs` and `scripts/scaffold.test.mjs`: positive P5 structure/forbidden-path
  assertions while retaining the P6 deferred guard
- planning, architecture, security, partner, compliance, verification, and AI-use documentation

## Acceptance checks

- A real exact `CLEAR`, unrevoked, unexpired P4 record permits preparation only for its complete P1
  bindings and an authorized connected Ledger signer.
- Missing, `HOLD`/non-CLEAR, revoked, expired, wrong-site/robot/build/envelope/evaluator/evaluation,
  wrong-chain, wrong-contract, RPC, or persistence states block before any device call.
- EIP-712 construction is deterministic and golden-tested; every security-critical field or domain
  mutation changes the digest and invalidates the original signature.
- Authorized signatures verify; unauthorized, malformed, cross-domain/chain/registry, replayed,
  expired, or altered-intent signatures fail without producing an authorization.
- Concurrent nonce consumption permits exactly one success, persists across process/store reopen,
  and does not consume on invalid signature or failed post-sign clearance check.
- Revocation/expiry between preparation and consumption denies release; the post-check block/hash
  is recorded as explicit TOCTOU evidence.
- Ledger adapter tests cover connect/disconnect, session/address checks, unavailable transport/app,
  human rejection, signing failure, malformed response, and cancellation on any legacy fallback state.
- Physical evidence demonstrates cases A–F: approval, human rejection, build mismatch blocked before
  Ledger, invalid clearance blocked before Ledger, replay rejection, and post-sign tampering rejection.
- No private key, recovery phrase, PIN, credential, confidential envelope, blind, or secret appears
  in source, logs, or evidence.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence
- [x] Handoff

## Parallel work / worktrees

Read-only specialists audit the domain correction, current Ledger API/partner compliance, release
architecture, and test/scaffold gaps. The primary agent owns all writes in this working tree. A
separate read-only reviewer will inspect the final diff after implementation.

## Risks and rollback

- The Ethereum signer kit can enter a documented legacy/hash-based fallback when context is
  unavailable. The adapter must observe that public state, cancel immediately, return
  `CLEAR_SIGNING_UNAVAILABLE`, and prove this in tests; it may never return such a signature.
- A Ledger origin token and registered EIP-712 Clear Signing descriptor may be external prerequisites
  for physical evidence. Missing access is a fail-closed environment blocker, not permission to use
  blind signing or mark P5 complete.
- SQLite replay enforcement is single-node/offchain. Database loss, multiple uncoordinated API
  instances, a latest-block reorg, or revocation mined after authorization remain explicit risks;
  no P6 activation is authorized by P5.
- P4 trusts its registrar's P1-to-bytes32 mapping. P5 independently reproduces and checks the exact
  public bindings but does not upgrade that trust model.
- Rollback is confined to P5 code/tests/scaffold/docs plus the minimal versioned DeploymentIntent
  correction; P1–P4 behavior and P6 remain unchanged.

## Decisions / deviations

- `DeploymentIntent` advances to `rovaulta.deployment-intent/v2` only to add the fixed canonical
  action. Chain ID, registry, and authorized signer remain EIP-712/application authorization
  bindings derived from authoritative deployment and policy data, rather than contaminating P1's
  chain-neutral identifiers.
- The API is the offchain nonce and ReleaseAuthorization authority. The browser is a device adapter,
  never a policy or replay authority.
- The exact live P4 record and `isClearanceValidFor` result are read at one explicit block so fields,
  validity, and time cannot come from inconsistent chain snapshots.
- A minimal P5-only browser operator route is allowed solely because WebHID discovery/signing needs
  an explicit human gesture. It does not implement P6 product UI or robot activation.

## Verification evidence

Targeted local verification passes for domain (30), chain-client (11), Ledger gate (18), and API
(12) tests. Mock coverage includes exact field/domain mutation, build substitution, positive
pinned-block registry-reader/ABI behavior, strict API requests/error mapping, authorized and
unauthorized signatures, durable/concurrent replay, TOCTOU revocation/expiry, adapter lifecycle,
physical-refusal error mapping, exact/partial runtime descriptor filters, malformed output, and
legacy-fallback cancellation. A live read-only Sepolia call at block `11645707` confirmed the
expected chain/registry and rejected an unregistered fixture.

Physical A–F evidence remains blocked: `NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN` is unset, the committed
ERC-7730 v2 file is only a validated candidate rather than an accepted/served descriptor, and no
physical device is available to identify or exercise. P5.1 additionally proved official Speculos
transport/app/address UI smoke plus actual pre-sign C and invalid/unregistered D. The official
Tester exited on missing `GATING_TOKEN` before Clear Signing display, and the separate application
origin/accepted-descriptor path is also unavailable for A/B/E/F. The final full verification,
secret audit, reviewer result, and
hardware blocker are recorded in `VERIFICATION_REPORT.md` and
`docs/compliance/evidence/p5-ledger-release-gate-software-2026-09-06.md`.

The API is the smallest agent-facing proposal boundary, but the current browser harness is manual.
No autonomous/LLM agent runtime or agent-execution evidence is part of P5, and partner claims must
remain explicit about that limitation.
