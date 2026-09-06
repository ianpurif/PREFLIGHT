# Current State

## Phase
**P1–P4 complete. P3 has official authenticated CRE simulation evidence; P4 is deployed and source-verified on Ethereum Sepolia. P5–P8 intentionally not started.**

## What exists
- all B0 boilerplate/tooling and specialized agentic harness
- canonical prefixed/branded site, robot, build, envelope, evaluator, evaluation, and clearance identifiers
- strict versioned schemas for build, envelope metadata, evaluation inputs/request/result, clearance, and deployment intent
- Preflight Canonical JSON v1 + deterministic UTF-8/SHA-256 domain-separated digests
- secret-blinded safety-envelope commitment semantics
- pure evaluation/clearance/deployment binding assertions and negative/golden-vector tests
- pure fixed-unit warehouse model with closed point/segment geometry
- committed xorshift32 scenario generation with stable ordering
- validated restricted-zone, site/zone speed, and payload-zone rules
- deterministic `CLEAR`/`HOLD` evaluator with structured internal evidence
- synthetic unsafe/corrected build fixtures and boundary/property/golden tests
- CRE SDK 1.19.1 HTTP workflow registered through the real `handlerInTee` path
- Nitro/us-west-2 requirement, one compile-time fixed confidential secret selector, and no ordinary handler capability calls
- versioned public/confidential P3 schemas, canonical behavior-input binding, and redacted failures
- private envelope/blind decoding, commitment verification, and unchanged P2 evaluation inside the TEE callback
- allowlisted public P1 result with no private envelope, internal findings, counts, thresholds, blind, or logs
- successful SDK and CRE CLI WASM compilation of the actual transitive P1/P2 workflow
- official authenticated CRE simulations: unsafe `HOLD`, corrected `CLEAR`, tampered commitment `REJECT`
- redacted execution evidence with binary/config hashes, execution IDs, public results, and zero confidential-marker leakage
- minimal Solidity attestation registry keyed by the exact P1 clearance digest
- owner-managed registrars, immutable issuer attribution, single-use clearance digest/ID, and monotonic revocation
- fixed-size public binding storage for site, robot, build ID/digest, envelope ID/commitment, evaluator version, evaluation ID/input digest, verdict, issuance, and expiry
- exact-context validity reads with `block.timestamp < expiresAt` and Foundry unit/fuzz/stateful-invariant coverage
- P1 golden digest and `sha256(UTF8(exact prefixed identifier))` transport vectors in Solidity tests
- Sepolia chain-guarded deployment script and non-secret environment/verification instructions
- source-verified Sepolia `PreflightRegistry` at `0xFB270cc222efa8B5005AA097dD512Be2558dde65`
- public P5 registry-domain artifact binding chain ID `11155111` to that exact verifying contract
- type-only scaffold consumers aligned to the canonical domain protocol

Detailed decisions and evidence: ADR-0003 through ADR-0006, the P1–P4 execution plans,
`docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md`, and
`docs/compliance/evidence/p4-attestation-registry-local-2026-09-06.md`, and
`docs/compliance/evidence/p4-sepolia-deployment-2026-09-06.md`.

## Next exact task
P5 — implement only the Ledger-backed release gate when explicitly authorized. It must consume the
P4 exact-clearance read interface, bind the P1 deployment intent with EIP-712, enforce replay
protection, and keep signing authority on Ledger hardware.

## Environment status
Bun 1.4.1 and Foundry 1.8.1 are available. `@chainlink/cre-sdk` 1.19.1 and
checksum-verified CRE CLI v1.32.0 compile and simulate the real workflow. The three authenticated
simulations pass with CLI-reported simulation binary hash
`8d8bff9fdfaf67a8db7b2fa81ea46fa351b5e8f6914b2b6ebe21e2ad4310c315`. The runtime commitment
blind was freshly generated into ignored local files; the envelope is source-visible synthetic test
data. This is simulation only; live deployment/private-beta access, hardware TEE execution,
production Vault custody, and DON consensus are not claimed.

P4 passes local Foundry unit, fuzz, and invariant verification. The unchanged registry from source
commit `1929651` was mined on Sepolia in transaction
`0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497`, block `11644462`, and is
verified on Etherscan and Sourcify. Live RPC reads confirm the expected immutable owner, initial
registrar, constants, deployed code, and nonexistent-clearance invalidity. The ignored deployment
credentials and generated Foundry broadcast/cache files remain uncommitted. P4 adds no Ledger,
EIP-712, release-agent, API, UI, or P5+ implementation.

The P3 behavior digest binds the public result to the exact supplied synthetic behavior/request but does not authenticate its physical or software origin. Preflight currently proves only that supplied behavior for an exact declared build was evaluated against the committed private envelope.
