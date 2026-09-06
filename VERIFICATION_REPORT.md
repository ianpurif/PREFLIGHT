# P3 Authenticated Simulation Verification Report

**Date:** 2026-09-06
**Scope:** P3 Chainlink CRE confidential-evaluation evidence closure only; P4–P8 remain unimplemented.

## Official CRE authenticated simulations

The checksum-verified official CRE CLI v1.32.0 authenticated successfully, compiled the actual `preflight-confidential-evaluation-staging` workflow with SDK 1.19.1, and executed each case separately in the local single-node simulator.

Common workflow identity:

- CLI-reported simulation binary hash: `8d8bff9fdfaf67a8db7b2fa81ea46fa351b5e8f6914b2b6ebe21e2ad4310c315`
- CLI-reported workflow config hash: `4cda450a9d236d49ccd0e3f01285ba26b15c16b0202d35c091c076b6095a3e12`
- requested runtime: AWS Nitro, `us-west-2`
- evidence class: **CRE authenticated simulation**; not a live DON deployment or hardware TEE execution

| Case | Captured (UTC) | Execution ID | Public outcome | Engine/process |
|---|---|---|---|---|
| Unsafe fixture | 2026-09-06T08:27:22Z | `060441b006d255fb46dc35619a8ac30f919b769902a0515e74a32d76f105e6fb` | `EVALUATED` / `HOLD` | `SUCCESS` / 0 |
| Corrected fixture | 2026-09-06T08:28:29Z | `f4ecd7cdcc3d34f084417dbec1e42c5b32e530e6aeab4a70768c21e2f1efb583` | `EVALUATED` / `CLEAR` | `SUCCESS` / 0 |
| Tampered confidential blind | 2026-09-06T08:29:19Z | `5ea39cec749810a316d75eee77b0fb84249276e8fce776b893b284858ca0c887` | `REJECT`; no verdict | `SUCCESS` / 0 |

The tampered case used the same unsafe public request and declared commitment as the evaluated unsafe case. Changing only the ignored local confidential input produced a redacted rejection before normal evaluation, demonstrating that commitment reconstruction is load-bearing.

The runtime commitment blind was freshly generated into ignored local files and is distinct from the public P2 unit-test blind. The envelope remains an intentionally source-visible synthetic demo fixture, so this evidence proves confidential-path use and output non-disclosure rather than secrecy from repository readers.

Full redacted commands, results, and execution metadata are recorded in [`docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md`](docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md).

## Simulator compatibility repair

- Added the required Sepolia RPC target used by CRE CLI v1.32.0 project loading.
- Passed public fixture paths directly to `--http-payload`, matching the current CLI contract.
- Removed the optional confidential pre-hook because CLI v1.32.0 supplied empty configuration to that phase and failed before handler execution. The current official confidential TypeScript template also registers `handlerInTee` without that optional hook.
- Preserved the actual confidential handler, fixed compile-time secret selector, Nitro request, absence of ordinary handler capability calls, P1/P2 validation and evaluation, and redacted public projection.

## Leakage and negative evidence

All three cases were rerun through a raw-output checker. Each expected result was present; the exact confidential secret was absent; and zero markers matched private envelope fields, blind fields/values, warehouse bounds, rule thresholds/IDs, or private zone IDs.

The stored evidence contains no API key, authentication token, private envelope, commitment blind, private rule value, restricted geometry, internal violation details, or confidential runtime payload. Public commitments, identifiers, digests, and the redacted error code are intentionally retained as protocol evidence.

## Verification results

- `@preflight/chainlink-cre` tests — **25 passed, 0 failed, 343 assertions**.
- `@preflight/domain` tests — **30 passed, 0 failed, 676 assertions**.
- `@preflight/simulation-core` tests — **60 passed, 0 failed, 1,385 assertions**.
- `bun run lint` — pass; Biome 2.5.12 checked **72 files**.
- `bun run typecheck` — **7/7 workspace tasks pass**.
- `bun run test` — **10/10 Turbo tasks pass**; 115 substantive tests and 2,404 assertions across P1–P3.
- `bun run build` — **7/7 workspace tasks pass**, including the Next.js production build.
- `bun run contracts:test` — pass with Foundry 1.8.1; the pre-P4 contract scaffold correctly reports no tests.
- `bun run verify:scaffold` — **4/4 scaffold tests pass**.
- `bun run verify` — pass end to end after the evidence updates.
- `git diff --check` — pass, including an explicit trailing-whitespace scan over tracked and untracked text files.

## Remaining evidence boundary

There is no remaining blocker for the requested P3 authenticated-simulation evidence. Live deployment/private-beta access, production Vault custody, hardware TEE execution, DON consensus, remote attestation, and authentic robot trace provenance remain unproven and are not implied by this simulation. No P4 contract product logic was added.
