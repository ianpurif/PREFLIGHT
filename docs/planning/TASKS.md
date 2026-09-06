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
- [x] full EIP-712 deployment intent bound to the deployed Sepolia registry
- [x] local ERC-7730 descriptor candidate plus exact runtime filter-resolution guard and fail-closed legacy/blind-fallback rejection
- [ ] Ledger-issued origin token and accepted/served Clear Signing descriptor
- [x] device signing path implemented and mock-verified (physical execution pending)
- [x] deterministic pre/post clearance policy, authorized signer, durable nonce, replay/TOCTOU/mismatch tests
- [ ] physical hardware evidence

## P6 — Demo UI / digital twin
- [ ] deterministic warehouse scene
- [ ] denied build scenario
- [ ] corrected build scenario
- [ ] visible CRE/attestation state
- [ ] Ledger approval UX
- [ ] mutated-build blocked scene

## P7 — End-to-end demo reliability
- [ ] scripted deterministic demo fixture
- [ ] reset/retry path
- [ ] offline-safe visual fallback that does not fake partner execution
- [ ] 4-minute timing rehearsal

## P8 — Submission evidence
- [ ] partner evidence matrix complete
- [ ] architecture diagram final
- [ ] README judge path
- [ ] AI attribution complete
- [ ] 2–4 minute showcase video
