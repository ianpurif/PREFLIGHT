# Decision Log

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-09-05 | Use Chainlink + Ledger only | Both are load-bearing; a third partner would add integration weight without improving the core mechanism. | Active |
| 2026-09-05 | Bun/TypeScript primary stack | Best fit for CRE TypeScript SDK + shared hackathon velocity. | Active |
| 2026-09-05 | Foundry for contracts | Independent EVM verification/fuzzing. | Active |
| 2026-09-05 | Browser-only Ledger DMK boundary | Keeps hardware key out of server and follows current Ledger direction. | Active |
| 2026-09-05 | No LLM verdict authority | Clearance must be deterministic and auditable. | Active |
| 2026-09-05 | Preflight Canonical JSON v1 + SHA-256 | Exact schemas, deterministic UTF-8 bytes, versioned domain separation, and golden vectors prevent cross-runtime digest ambiguity. | Active |
| 2026-09-05 | Prefixed/branded protocol identifiers | Runtime prefixes and compile-time brands prevent identifier-type confusion without adding a schema dependency. | Active |
| 2026-09-05 | Secret-blinded envelope commitments | A 32-byte secret blind prevents low-entropy private safety rules from being exposed to offline dictionary attacks through their public commitment. | Active |
| 2026-09-05 | Decimal Unix-second protocol time | Canonical strings avoid timezone, floating-point, and runtime date-parser differences; wall-clock validity remains a later execution check. | Active |
| 2026-09-05 | Fixed-unit closed-segment evaluator | Bounded integer millimetres, millimetres/second, and grams plus closed point/segment geometry remove floating tolerances and waypoint tunneling from P2 rule decisions. | Active |
| 2026-09-05 | Committed xorshift32 scenario suite | Seed, normalized templates, generator version, rules, and geometry are all inside the blinded envelope commitment; golden vectors lock deterministic generation. | Active |
| 2026-09-05 | P2 `CLEAR`/`HOLD` mapping | Zero violations yields `CLEAR`; any violation yields P1 `HOLD`; P2 never emits `ESCALATE` and never creates clearance. | Active |
| 2026-09-05 | Atomic P3 confidential input | The full private envelope and 32-byte blind are one versioned CRE secret so rotations cannot mix values; the demo payload is capped below 2 KiB. | Active |
| 2026-09-05 | Minimal P3 public projection | Return the unchanged P1 result, exact public behavior-input digest, and synthetic provenance only; omit internal evidence, counts, and private-evidence digests to reduce disclosure/oracle risk. | Active |
| 2026-09-05 | P3 behavior-input digest is not provenance | Domain-separated SHA-256 over P1 canonical bytes binds the result to the exact supplied request/build/traces/time, but remote robot/model attestation remains out of scope. | Active |
| 2026-09-05 | Explicit Nitro + fixed confidential input | Require Nitro/us-west-2, one compile-time fixed `main` secret selector, zero ordinary handler capability calls, and configured authenticated HTTP keys. The optional pre-hook is omitted because CLI v1.32.0 simulation passes it empty config before handler execution. | Active |
| 2026-09-06 | Isolate the captured simulation blind | Generate a fresh random blind into ignored local files, bind the public fixtures once, and capture evidence without publishing the blind. The source-visible P2 blind remains only a deterministic unit-test vector. | Active |
| 2026-09-06 | Owner-managed P4 registrar boundary | The immutable owner manages a minimal registrar set. A registrar attests P1 digest-to-field consistency; P3 simulation does not automatically write onchain. Removed issuers keep revoke-only authority for their own records. | Active |
| 2026-09-06 | P1-to-EVM fixed-size transport | Strip `sha256:` and decode P1 digests into `bytes32`; map exact validated prefixed identifiers to `sha256(UTF8(identifier))` and name those fields `*IdHash`/`*VersionHash`. Solidity does not parse canonical JSON. | Active |
| 2026-09-06 | Immutable single-use P4 clearance | Key by P1 clearance digest, permanently reserve both digest and clearance-ID hash, permit only `CLEAR`, and use strict `block.timestamp < expiresAt` plus monotonic owner/issuer revocation. | Active |
| 2026-09-06 | Preserve P1 evaluation binding without an invented result digest | Store evaluation-ID hash and P1 evaluation-inputs digest. P1 has no evaluation-result digest, and P3 behavior-input digest is distinct provenance/integrity metadata. | Active |
| 2026-09-06 | Version the existing deployment intent for one fixed action | `preflight.deployment-intent/v2` adds only `ACTIVATE_DEPLOYMENT`; chain, contract, and signer stay in the P5 EIP-712 authorization layer rather than creating a competing P1 model. | Active |
| 2026-09-06 | Bind P5 EIP-712 to the deployed P4 registry | Domain `Preflight`/`1`, Sepolia `11155111`, and the verified registry artifact prevent chain, contract, and unrelated-domain reuse. Full typed data also carries every exact release binding and the P1 intent digest. | Active |
| 2026-09-06 | Keep replay authority durable and offchain | One API instance owns a SQLite compare-and-set nonce store and performs exact P4 reads both before signing and before consumption. This is honest single-node replay protection, not an onchain nonce claim. | Active |
| 2026-09-06 | Fail closed on Ledger signer-kit legacy fallback | Current Signer Kit may expose `SIGN_TYPED_DATA_LEGACY` when Clear Signing context is unavailable. P5 observes, cancels, and rejects that state; it never accepts hashed/blind output. | Active |
| 2026-09-07 | Require exact runtime Clear Signing filters | A successful Context Module response is insufficient: P5 requires the exact Sepolia registry, 15-field schema, declared filter count, and every exact display path before full typed-data signing may proceed. Partial or mismatched context fails closed. | Active |
| 2026-09-07 | Keep P5 agent claims evidence-bound | `/release/prepare` is an agent-facing deterministic proposal boundary, while `/p5-ledger` is a manual operator harness. No autonomous/LLM agent runtime or execution evidence is claimed in P5. | Active |
