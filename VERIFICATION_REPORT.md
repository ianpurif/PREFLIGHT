# P5 / P5.1 Ledger Release Gate Verification Report

**Date:** 2026-09-07 (implementation and live read began 2026-09-06)

**Scope:** P5 software plus the partial P5.1 Speculos evidence attempt; P1–P4 regression-checked; P6–P8 not implemented

**Status:** Software, official Speculos transport/app/address UI smoke, real pre-sign C, and invalid/unregistered D pass; P5 remains incomplete because authenticated Clear Signing A/B/E/F and physical Ledger evidence are blocked

## Implemented authorization boundary

The existing P1 deployment intent is versioned to `preflight.deployment-intent/v2` with one fixed
`ACTIVATE_DEPLOYMENT` action. P5 builds full EIP-712 typed data under domain `Preflight`, version
`1`, Sepolia `11155111`, and the deployed P4 registry
`0xFB270cc222efa8B5005AA097dD512Be2558dde65`. The deployment artifact is the single address/chain
source.

The message binds protocol/schema, exact site, robot, build ID/digest, clearance ID/digest,
environment, authorized signer, server nonce, integer issuance/expiry, and the canonical P1 intent
digest. Tests lock field order and a golden typed-data digest, and mutate every security field and
domain component.

Before a device request, deterministic API policy validates proposal/clearance identity, the public
signer allowlist, live chain/contract code, and every P4 binding at one explicit block. After
signature recovery it reauthorizes the signer and repeats the exact P4 read. Missing, non-`CLEAR`,
revoked, expired, inexact, wrong-chain/registry, RPC, persistence, malformed, substitution, and
TOCTOU states fail closed.

SQLite is the honest single-node offchain nonce authority. A 128-bit random nonce, canonical intent,
clearance, signer, typed-data digest, and precheck block are persisted under WAL + synchronous
`FULL`; one conditional update atomically consumes `ISSUED` exactly once. Concurrent consumers yield
one authorization. No browser-local or onchain replay claim is made.

## Ledger implementation

Pinned packages:

- `@ledgerhq/context-module` `2.5.0`
- `@ledgerhq/device-management-kit` `1.9.0`
- `@ledgerhq/device-transport-kit-web-hid` `1.2.4`
- `@ledgerhq/device-transport-kit-speculos` `1.2.1`
- `@ledgerhq/device-signer-kit-ethereum` `1.18.0`
- `@ledgerhq/speculos-device-controller` `0.3.0` (test only)
- `rxjs` `7.8.2`

The client-only adapter defaults to explicit WebHID discovery/connect and permits only an opt-in,
loopback Speculos transport in development/test; production configuration rejects it. It checks environment support, confirms the Ethereum address for
chain `11155111`, verifies the active Ethereum app, reconstructs the server-prepared full typed
data, and submits only `signTypedData`. The official
Ethereum Context Module must return the exact chain, registry, 15-field schema, declared filter
count, and every exact display-filter path before the signing command may proceed. Disconnect,
wrong app/browser, missing origin token, signer mismatch, refusal, generic failure, partial/mismatched
context, malformed output, and stale/tampered prepared requests are explicit failures. Physical
device refusal maps to `HUMAN_REJECTED` with no retry.

Signer Kit 1.18.0 exposes a legacy typed-data fallback step when Clear Signing context is
unavailable. P5 observes `SIGN_TYPED_DATA_LEGACY`, cancels immediately, and returns
`CLEAR_SIGNING_UNAVAILABLE`; output from that path is never accepted. The exported strict action
requires the context-resolution guard and a build-context → provide-context → sign-typed-data path,
so callers cannot omit the guard. Source/scaffold/dependency audits find no legacy LedgerJS,
hashed-EIP-712, personal-sign, raw-transaction, private-key, or frontend-boolean fallback.

`POST /release/prepare` is the intentionally small agent-facing/orchestration boundary. The current
browser route is a manual operator evidence harness; no autonomous or LLM agent runtime was
implemented or demonstrated, so the agent half of the intended partner story is not claimed.

## P5.1 Speculos and ERC-7730 result

Ledger Speculos official device simulator `0.27.0` ran the checksum-verified public Ethereum
`1.22.3` Nano S Plus ELF (API level `26`). DMK discovered it through
`SPECULOS_HTTP_TRANSPORT`; the official device controller drove the actual emulator address review
and confirmation screens; the adapter returned a session tagged `speculos` /
`official-device-simulator`. Screenshots and hashes are recorded in
`docs/compliance/evidence/p5-ledger-speculos-partial-2026-09-07.md`.
The committed `evidence:speculos-smoke` script reproduces the DMK/controller address flow and public
session output.

The candidate descriptor was migrated from deprecated ERC-7730 v1 to active v2. Official
`erc7730 1.0.7` lint under CPython `3.12.14` reported one descriptor, no errors, and no warnings.
This is validation only, not registry acceptance or device display evidence.

The official registry Tester wrapper was run from revision
`0318f9a51ec4fc7ba4aed6de5e315c8884d1fe38` and exited `1` with
`Error: GATING_TOKEN environment variable not set`. The implicit direct-tester token, blind-signing
switches, and JavaScript signer mocks were not used as evidence. The Tester also discards its
signature, so Preflight separately lacks an application origin token plus accepted/served
descriptor or another official signature-preserving resolution path. Therefore the structured Clear
Signing display and Speculos A/B/E/F are not complete.

The real P5 `/release/prepare` boundary was executed using the public Speculos test address and
temporary test-only policy/state. C returned HTTP `403 CLEARANCE_BINDING_MISMATCH`; the
invalid/unregistered D variant queried the deployed Sepolia registry and returned HTTP `403
CLEARANCE_NOT_FOUND`. Neither invoked signing. Revoked/expired D remain deterministic test evidence
only.

## Verification results

- Ledger gate: 18/18 tests, including adapter lifecycle, exact transport selection/discovery,
  development/test-only loopback Speculos configuration and production rejection, shared signing path, missing origin token, signer mismatch,
  refusal, failure, malformed output, exact/partial runtime descriptor resolution, required context
  steps, and legacy-fallback cancellation.
- Chain client: 11/11 tests for deployed-domain EIP-712, all field/domain mutations, signature
  recovery, exact P4 transport, positive pinned-block reader/ABI behavior, chain/registry, verdict,
  revocation, and expiry boundaries.
- API: 12/12 tests for pre-sign mismatch/allowlist, signature tampering, Build A/Build B rejection,
  durable reopen, concurrent one-time consumption, replay, TOCTOU, strict request shape, CORS, and
  fail-closed HTTP error mapping.
- Domain: 30/30; simulation core: 60/60; Chainlink CRE: 25/25.
- Full TypeScript total: 156 tests, 2,704 assertions, zero failures.
- `bun run lint`: pass; Biome checks 102 files.
- `bun run typecheck`: pass; 7/7 Turbo tasks.
- `bun run test`: pass; 11/11 Turbo tasks.
- `bun run build`: pass; 7/7 tasks; Next.js production build includes static `/p5-ledger`.
- `bun run contracts:test`: pass; 24 Foundry unit/fuzz tests plus five invariants (128 runs,
  8,192 calls).
- `bun run verify:scaffold`: pass; 4/4 tests with positive P5 assertions and P6 guard intact.
- `bun audit`: pass after top-level compatible `uuid` `11.1.1` and `ws` `8.21.0` overrides; 212
  packages checked, no known vulnerabilities.
- `git diff --check`: pass.
- `bun run verify`: pass after the last implementation and evidence corrections.

The read-only live Sepolia P5 client confirmed chain, registry code, and exact-reader behavior at
block `11645707`; a deliberately unregistered local fixture returned `exists=false` and
`exactMatch=false`. No demo clearance transaction was created. See
`docs/compliance/evidence/p5-ledger-release-gate-software-2026-09-06.md`.

## Speculos A–F and physical Ledger results

- A — valid exact clearance + Speculos/physical approval: **not run**
- B — Speculos/physical rejection: **not run**
- C — mutated build blocked before signer: **pass**, real API HTTP `403 CLEARANCE_BINDING_MISMATCH`
- D — invalid/unregistered clearance blocked before signer: **pass**, live Sepolia HTTP `403 CLEARANCE_NOT_FOUND`
- E — consumed signature replay: local durable replay test passes; Speculos/physical artifact pending
- F — signed-intent tampering: local signature/binding tests pass; Speculos/physical artifact pending

The Speculos evidence identifies only the emulated Nano S Plus, Ethereum app `1.22.3`, and public
derived signer. No physical Ledger model, firmware, signature, approval, or signature hash is
claimed. `NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN` is unset, and the validated ERC-7730 v2 file is only a
candidate—not evidence of Ledger acceptance/serving for this origin. P5 fails closed without the
required context and an authorized signer. Blind signing was not enabled.

The Speculos signer is deterministically derived public test identity, not custody. Production
rejects the Speculos transport, and this address plus any related clearance/nonce state must never
be retained in production policy.

## Dependency and secret review

The final dependency graph contains no `@ledgerhq/hw-app-*` or `@ledgerhq/hw-transport-*` package.
`bun audit fix` could not update SDK-pinned vulnerable transitive versions within their declared
ranges, so compatible top-level Bun overrides were applied and the Ledger tests/browser build were
rerun; `bun audit` then reported zero vulnerabilities.

The tracked/untracked working tree and Git history were scanned without printing candidate values
for seed/recovery phrases, private keys, PIN/credential assignments, Ledger origin tokens, RPC or
Etherscan credentials, CRE secrets, and envelope blinds. No leak was found. `gitleaks` was not
installed, so this result uses filename/history checks, assignment/high-entropy regex checks, Git
ignore verification, and targeted source/dependency scans. `.env`, SQLite data, Foundry output, and
CRE local secrets remain ignored.

## Scope and unresolved risk

No P6 robot activation, digital twin, autonomous execution, Key Ring, new contract, automatic
CRE-to-EVM delivery, or private-key custody was added. The `/p5-ledger` page is only an explicit
WebHID/Speculos evidence harness.

P5 cannot be called complete until legitimate official Tester access plus a signature-preserving
origin/accepted-descriptor path permit Speculos A/B/E/F, and the separate device prerequisites
permit physical A–F. The intended
autonomous-agent story also needs truthful execution evidence; P5
currently provides the proposal API but no agent runtime. Even after hardware closure, SQLite
protects one coordinated API database only. Database loss/split replicas, Sepolia reorgs, and
clearance revocation after authorization but before a future P6 action require operational/finality
policy. P5 does not prove physical robot safety, trace provenance, registrar honesty, or live CRE
delivery.
