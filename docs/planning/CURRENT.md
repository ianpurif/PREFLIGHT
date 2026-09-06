# Current State

## Phase
**P1–P3 complete. P3 has official authenticated CRE simulation evidence; P4–P8 intentionally not started.**

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
- type-only scaffold consumers aligned to the canonical domain protocol

Detailed decisions and evidence: ADR-0003, ADR-0004, ADR-0005, the P1/P2/P3 execution plans, and `docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md`.

## Next exact task
P4 — implement only the minimal public attestation registry when explicitly authorized. Preserve the exact P1 result bindings and keep all private envelope data offchain.

## Environment status
Bun 1.4.1 and Foundry 1.8.1 are available. `@chainlink/cre-sdk` 1.19.1 and checksum-verified CRE CLI v1.32.0 compile and simulate the real workflow. The three authenticated simulations pass with CLI-reported simulation binary hash `8d8bff9fdfaf67a8db7b2fa81ea46fa351b5e8f6914b2b6ebe21e2ad4310c315`. The runtime commitment blind was freshly generated into ignored local files; the envelope is source-visible synthetic test data. This is simulation only; live deployment/private-beta access, hardware TEE execution, production Vault custody, and DON consensus are not claimed. P3 adds no contract, Ledger, API, UI, or P4+ implementation.

The P3 behavior digest binds the public result to the exact supplied synthetic behavior/request but does not authenticate its physical or software origin. Preflight currently proves only that supplied behavior for an exact declared build was evaluated against the committed private envelope.
