# Task Board

## B0 — Boilerplate
- [x] Specialized repository structure
- [x] Codex context hierarchy
- [x] Codex skills + specialist agents
- [x] Architecture / partner / compliance docs
- [x] App/package/integration/contract shells
- [x] CI + scaffold verification
- [x] Worktree workflow

## P1 — Domain + protocol foundation
- [x] Canonical identifiers and digest strategy
- [x] Clearance/evaluation schemas
- [x] Failure semantics and validation
- [x] Serialization/canonicalization tests

## P2 — Deterministic simulator/evaluator
- [x] Seeded warehouse scenario model
- [x] Restricted-zone/speed/payload rules
- [x] Deterministic verdict engine
- [x] Negative/property tests

## P3 — Chainlink CRE confidential evaluation
- [x] CRE workflow entrypoint
- [x] `handlerInTee` confidential path
- [x] private envelope handling
- [x] minimal public result
- [x] authenticated CRE simulation evidence — unsafe `HOLD`, corrected `CLEAR`, tampered commitment `REJECT`

## P4 — Attestation registry
- [x] minimal clearance registry interface
- [x] exact-build/site/evaluator/expiry binding
- [x] revocation/expiry semantics
- [x] fuzz + invariant tests
- [x] Sepolia deployment, source verification, public RPC readback, and non-secret P5 registry identity

## P5 — Ledger release gate
- [x] align and pin compatible DMK, WebHID transport, context, signer-kit, and RxJS versions
- [x] DMK/WebHID browser adapter with explicit device/app/address lifecycle
- [x] narrow WebHID/Speculos transport selection with shared signer lifecycle and production rejection
- [x] full EIP-712 deployment intent bound to the deployed Sepolia registry
- [x] ERC-7730 v2 candidate validated by official linter plus exact runtime filter-resolution guard and fail-closed legacy/blind-fallback rejection
- [x] actual Ethereum 1.22.3 app under Speculos 0.27.0 with DMK discovery and emulator address UI confirmation
- [ ] authenticated official Clear Signing Tester structured-display evidence — blocked on missing `GATING_TOKEN`
- [ ] Speculos A–F end-to-end evidence — real C and invalid/unregistered D pass; A/B/E/F plus revoked/expired D captures blocked/open
- [ ] Ledger-issued origin token and accepted/served Clear Signing descriptor
- [x] device signing path implemented and mock-verified (physical execution pending)
- [x] deterministic pre/post clearance policy, authorized signer, durable nonce, replay/TOCTOU/mismatch tests
- [ ] physical hardware evidence

## P5.2 — AI deployment-agent closure
- [x] narrow real provider abstraction and OpenAI Responses strict tool-calling adapter
- [x] exact public catalog resolution and immutable site/robot/build binding
- [x] host-owned ordered tool/capability state machine
- [x] live public Sepolia clearance inspection and existing `/release/prepare` authority reuse
- [x] Ledger-required handoff with no agent signing/consumption authority
- [x] exact consumed-P5 authorization status correlation
- [x] structured public/non-secret attempt audit
- [x] unsafe, corrected, mutated, revoked, expired, adversarial, injection, and determinism tests
- [x] finite public request grammar, conflicting-target rejection, raw-text non-disclosure, and provider `store: false`
- [x] local A/B/C agent evidence and live read-only Sepolia blocked-state evidence
- [ ] external OpenAI model execution evidence — environment lacks provider key/model

## P6 — Demo UI / digital twin
- [x] deterministic warehouse scene
- [x] denied build scenario
- [x] corrected build scenario
- [x] visible CRE/attestation state
- [x] Ledger approval UX
- [x] mutated-build blocked scene

## P7 — End-to-end demo reliability
- [x] scripted deterministic demo fixture
- [x] reset/retry path
- [x] offline-safe visual fallback that does not fake partner execution
- [x] 4-minute timing rehearsal (repeatable offline rehearsal path; no live partner execution claimed)

## P8 — Product UI/UX and real lifecycle
- [x] plain-language landing page and account entry
- [x] authenticated onboarding for site, private policy, robot, and exact build
- [x] account-scoped persistence and session isolation
- [x] server-side evaluation through the configured confidential evaluation boundary
- [x] public result UX for `HOLD`, `CLEAR`, `BLOCKED`, and `LEDGER_APPROVAL_REQUIRED`
- [x] truthful release preparation through the existing P5/P5.2 boundary
- [x] explicit development-only P7 fixture route and regression coverage
- [x] responsive, loading, error, disabled, and accessibility states for critical flow

## P9 — Partner bounty qualification slice
- [x] official CRE gateway client boundary with request-scoped site secret binding
- [x] fail-closed CRE request/rejection/pending/network semantics and public-result validation
- [x] Sepolia RovaultaRegistry subgraph schema, manifest, ABI, and event mappings
- [x] server-only The Graph Gateway adapter with exact binding/revocation/expiry checks
- [x] account-backed agent resolution from authenticated evaluation/clearance records
- [x] load-bearing `getGraphContext` step before the existing P5 preparation authority
- [x] normal release preparation routed through the account-backed agent boundary
- [x] negative tests for CRE fallback/network failures, Graph outage/mismatch, account mismatch,
  and agent authority boundaries
- [ ] provision request-scoped CRE secrets and capture a completed account-created CRE result
- [ ] deploy/index the Rovaulta Sepolia subgraph and capture live Graph-provider evidence
- [ ] run a real account-backed Graph `MATCHED` preparation through P5/Ledger handoff
- [ ] obtain external OpenAI model execution evidence (provider key/model unavailable locally)

### Remaining submission evidence
- [ ] partner evidence matrix complete
- [ ] architecture diagram final
- [ ] README judge path
- [ ] AI attribution complete
- [ ] 2–4 minute showcase video
