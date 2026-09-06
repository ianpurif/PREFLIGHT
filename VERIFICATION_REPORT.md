# P4 Attestation Registry Verification Report

**Date:** 2026-09-06
**Scope:** P4 only; P5–P8 remain unimplemented
**Status:** Locally complete and verified; Sepolia deployment pending credentials

## Implemented contract surface

`PreflightRegistry` stores one immutable public record per P1 clearance digest. Every record binds
clearance/evaluation/site/robot/build/envelope/evaluator identities, build/envelope/evaluation
digests or commitments, `CLEAR`, issuance, expiry, `msg.sender` issuer, existence, and revocation.
It exposes bounded getters for raw record retrieval, current validity, clearance-ID lookup, and exact
binding verification.

The immutable owner is the initial registrar and manages a registrar mapping. Only registrars may
record. The owner or original issuer may permanently revoke. Both clearance digest and clearance-ID
hash are permanently single-use, including after revocation.

Validity is exactly: record exists, verdict is `CLEAR`, record is not revoked, and
`block.timestamp < expiresAt`. Exact validation additionally compares all stored P1 transport
fields. Registration rejects every zero critical binding, `HOLD`, `REJECT`, unknown verdicts,
future issuance, `issuedAt >= expiresAt`, already-expired input, duplicate keys, and timestamps over
P1's `253402300799` maximum.

## Trust and privacy boundary

P4 uses fixed-size EVM transport values and intentionally does not parse P1 canonical JSON. An
authorized registrar vouches that the decoded P1 clearance digest matches the submitted scalar
fields. P3 authenticated simulation does not automatically write onchain. P4 is not live DON
delivery, TEE attestation, deployment authorization, Ledger approval, or a physical-safety claim.

No private envelope geometry, threshold, rule, blind, confidential response, or internal violation
report is stored. The production contract has no dynamic strings/bytes, arrays, enumeration,
external calls, token/governance logic, or upgradeability.

## P1 compatibility

- P1 SHA-256 digests: remove `sha256:` and hex-decode directly into `bytes32`.
- P1 identifiers: `sha256(UTF8(exact validated prefixed identifier))`, explicitly named as hashes.
- Golden Solidity tests cover the exact P1 clearance/build/envelope/evaluation values.
- Evaluation identity plus P1 evaluation-inputs digest are stored. No unsupported evaluation-result
  digest or relabeled P3 behavior digest was introduced.

## Foundry verification

- `forge fmt --check` — pass.
- `forge build` — pass with Solidity 0.8.30, Prague, optimizer 200; Foundry 1.8.1. Advisory lint
  diagnostics were reviewed and do not represent test/compile failures.
- `forge test -vvv` — 24 unit/fuzz functions pass and five stateful invariants pass.
- Fuzz — four security properties at 512 runs each.
- Invariants — 128 runs, depth 64, 8,192 handler calls; seeded nonvacuous revoked, expired, and
  long-lived states.
- `forge test --gas-report` — pass; production bytecode 4,561 bytes. Observed maxima:
  `recordClearance` 371,757 gas, `revokeClearance` 29,265 gas, `isClearanceValidFor` 29,284 gas.

Coverage includes authorization, every zero field, non-`CLEAR`, P1 timestamp range, exact binding
mutation/type confusion, expiry before/equal/after, revocation authority/permanence, duplicate
digest/ID overwrite, P1 transport vectors, unauthorized fuzzing, and stateful invalidity properties.

## Repository verification

- `bun run lint` — pass; Biome checked 72 files.
- `bun run typecheck` — pass; 7/7 tasks.
- `bun run test` — pass; 10/10 Turbo tasks, preserving 115 P1–P3 tests/2,404 assertions.
- `bun run build` — pass; 7/7 tasks, including Next.js production build.
- `bun run contracts:test` — pass; 24 unit/fuzz tests + five invariants.
- `bun run verify:scaffold` — pass; 4/4 tests with positive P4 and deferred P5/P6 guards.
- `bun run verify` — pass end to end.
- `git diff --check` — pass, including an explicit tracked/untracked trailing-whitespace scan.

## Independent adversarial review

The required read-only reviewer focused on authorization, replay/overwrite, hash/type confusion,
expiry, revocation, zero values, storage/privacy, gas, Chainlink claims, and P5 scope. Three findings
were fixed: the architecture diagram now routes evidence through the authorized registrar, the two
registration events collectively carry all public exact bindings, and invariant invalid-action
checks are seeded/count attempts and verify expected revert selectors. Re-review found no remaining
security defect. Gas evidence was refreshed after the event change.

## Sepolia status and remaining P5 risks

The deployment script rejects non-Sepolia chain IDs and reads the deployer key only from
`SEPOLIA_DEPLOYER_PRIVATE_KEY`. The environment has no Sepolia deployer key/account, RPC variable,
or Etherscan key; no funded address can be checked. No deployment was attempted and no address is
claimed.

P5 must not treat P4 evidence as authorization. It must verify the exact P1 clearance/build, bind
chain ID and verifying contract, require an authorized Ledger-backed signer, consume a nonce, enforce
intent expiry, and reject blind-signing/different-display paths. Registrar compromise and
cross-registry recording remain explicit P4 trust/replay risks.
