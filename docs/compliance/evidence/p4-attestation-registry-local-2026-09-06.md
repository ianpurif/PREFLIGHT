# P4 Attestation Registry — Local Verification Evidence

**Date:** 2026-09-06
**Evidence class:** Local Foundry implementation and verification
**Network status:** Sepolia-ready; not deployed

## Scope and evidence boundary

This evidence covers the P4 `PreflightRegistry` implementation and local Foundry execution. The
registry records an authorized registrar's public attestation that a validated P1 clearance digest
corresponds to exact public fields. It does not prove automatic Chainlink delivery, live DON/Nitro
execution, robot-trace provenance, Ledger approval, deployment authorization, or physical robot
safety.

The production contract stores only fixed-size identifier hashes, object digests/commitments,
`CLEAR`, timestamps, issuer, existence, and revocation state. Source/scaffold leakage checks reject
private envelope field names and dynamic storage. No private geometry, thresholds, rule values,
commitment blind, confidential runtime payload, or internal violation report is present.

## P1 compatibility

- P1 SHA-256 object digests map to `bytes32` by removing `sha256:` and decoding the 64 hex digits.
- Text identifiers map only for EVM transport as `sha256(UTF8(exact validated prefixed
  identifier))`; fields are named `*IdHash`/`*VersionHash`.
- The hard-coded P1 clearance, build, envelope-commitment, and evaluation-input digests pass in
  Foundry alongside identifier-hash vectors computed with Solidity's SHA-256 precompile.
- P1 has no evaluation-result digest. P4 stores evaluation-ID hash plus P1 evaluation-inputs digest
  and does not relabel P3's separate behavior-input digest.
- The authorized registrar remains responsible for digest-to-scalar consistency because Solidity
  deliberately does not parse canonical JSON.

## Contract behavior exercised

- immutable owner; owner-managed registrar authorization; `issuer = msg.sender`
- authorized `CLEAR` registration and events; owner as initial registrar
- zero critical fields, future/malformed/out-of-range time, unauthorized caller, `HOLD`, `REJECT`,
  and unknown verdict rejection
- permanent single use of clearance digest and clearance-ID hash, with immutable stored fields
- every exact binding mutation and deliberate type swap fails verification
- strict before/at/after expiry behavior using `block.timestamp < expiresAt`
- immediate, permanent owner/original-issuer revocation; unrelated and repeated attempts reject
- removed issuer keeps revoke-only authority and cannot register new records
- P1 year-9999 timestamp maximum

## Foundry evidence

Tool identity:

- Foundry/Forge 1.8.1
- commit `982849d3140c01fd3b72905759581a132df7aa98`
- Solidity 0.8.30, Prague EVM, optimizer enabled at 200 runs

Commands executed from `contracts/`:

```text
forge fmt --check
forge build
forge test -vvv
forge test --gas-report
```

Results:

- 24 unit/fuzz test functions passed; four fuzz properties executed 512 runs each.
- Five stateful invariants passed over 128 runs and 8,192 handler calls with zero unhandled handler
  reverts.
- Seeded invariant state ensures successful, revoked, expired, and long-lived records exist before
  fuzz actions; non-`CLEAR` acceptance and overwrite counters remain zero.
- Production deployed bytecode reported at 4,561 bytes.
- Maximum observed production calls in the gas report: registration 371,757 gas, revocation 29,265
  gas, exact-binding read 29,284 gas. Failed fuzz calls make aggregate averages unsuitable as a
  successful-registration estimate.

Foundry's advisory linter also reports style/test-harness diagnostics and intentional timestamp-use
warnings during `forge build`; compilation and every required test pass. Timestamp comparisons are
load-bearing P4 expiry semantics and are covered at the equality boundary.

## Repository verification

Commands executed from the repository root:

```text
bun run lint
bun run typecheck
bun run test
bun run build
bun run contracts:test
bun run verify:scaffold
bun run verify
```

Results:

- Biome 2.5.12: 72 files checked, no fixes required.
- Typecheck: 7/7 workspace tasks passed.
- TypeScript tests: 10/10 Turbo tasks passed; 115 P1–P3 tests and 2,404 assertions remain green.
- Build: 7/7 workspace tasks passed, including the Next.js production build.
- Contracts: all 24 unit/fuzz tests and all five stateful invariants passed.
- Scaffold: 4/4 tests passed with positive P4 and deferred P5/P6 assertions.
- Full `bun run verify`: passed end to end.
- Independent adversarial review findings on registrar-boundary depiction, complete public event
  fields, and nonvacuous invalid-action invariants were fixed. Re-review found no remaining security
  defect; the final invariant run had zero unhandled handler reverts.
- `git diff --check` and an explicit tracked/untracked trailing-whitespace scan passed.

## Sepolia deployment status

The chain-guarded deployment script and verification command are ready. Environment inspection found
no `SEPOLIA_DEPLOYER_PRIVATE_KEY`, `SEPOLIA_RPC_URL`, `EVM_RPC_URL`, or `ETHERSCAN_API_KEY`, and
`cast wallet list` returned no configured account. No deployer address exists to check for funding.
Therefore no broadcast or explorer verification was attempted, and no contract address,
transaction, or block is claimed.
