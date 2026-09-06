# P5 Ledger Release Gate Verification Report

**Date:** 2026-09-07 (implementation and live read began 2026-09-06)

**Scope:** P5 only; P1–P4 regression-checked; P6–P8 not implemented

**Status:** Software implementation passes; P5 remains incomplete because physical Ledger evidence is blocked

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
- `@ledgerhq/device-signer-kit-ethereum` `1.18.0`
- `rxjs` `7.8.2`

The client-only adapter performs explicit WebHID discovery/connect, checks environment support,
confirms the Ethereum address on-device for chain `11155111`, verifies the active Ethereum app,
reconstructs the server-prepared full typed data, and submits only `signTypedData`. The official
Ethereum Context Module must return the exact chain, registry, 15-field schema, declared filter
count, and every exact display-filter path before the signing command may proceed. Disconnect,
wrong app/browser, missing origin token, signer mismatch, refusal, generic failure, partial/mismatched
context, malformed output, and stale/tampered prepared requests are explicit failures. Physical
refusal maps to `HUMAN_REJECTED` with no retry.

Signer Kit 1.18.0 exposes a legacy typed-data fallback step when Clear Signing context is
unavailable. P5 observes `SIGN_TYPED_DATA_LEGACY`, cancels immediately, and returns
`CLEAR_SIGNING_UNAVAILABLE`; output from that path is never accepted. The exported strict action
requires the context-resolution guard and a build-context → provide-context → sign-typed-data path,
so callers cannot omit the guard. Source/scaffold/dependency audits find no legacy LedgerJS,
hashed-EIP-712, personal-sign, raw-transaction, private-key, or frontend-boolean fallback.

`POST /release/prepare` is the intentionally small agent-facing/orchestration boundary. The current
browser route is a manual operator evidence harness; no autonomous or LLM agent runtime was
implemented or demonstrated, so the agent half of the intended partner story is not claimed.

## Verification results

- Ledger gate: 15/15 tests, including adapter lifecycle, missing origin token, signer mismatch,
  refusal, failure, malformed output, exact/partial runtime descriptor resolution, required context
  steps, and legacy-fallback cancellation.
- Chain client: 11/11 tests for deployed-domain EIP-712, all field/domain mutations, signature
  recovery, exact P4 transport, positive pinned-block reader/ABI behavior, chain/registry, verdict,
  revocation, and expiry boundaries.
- API: 12/12 tests for pre-sign mismatch/allowlist, signature tampering, Build A/Build B rejection,
  durable reopen, concurrent one-time consumption, replay, TOCTOU, strict request shape, CORS, and
  fail-closed HTTP error mapping.
- Domain: 30/30; simulation core: 60/60; Chainlink CRE: 25/25.
- Full TypeScript total: 153 tests, 2,686 assertions, zero failures.
- `bun run lint`: pass; Biome checks 98 files.
- `bun run typecheck`: pass; 7/7 Turbo tasks.
- `bun run test`: pass; 11/11 Turbo tasks.
- `bun run build`: pass; 7/7 tasks; Next.js production build includes static `/p5-ledger`.
- `bun run contracts:test`: pass; 24 Foundry unit/fuzz tests plus five invariants (128 runs,
  8,192 calls).
- `bun run verify:scaffold`: pass; 4/4 tests with positive P5 assertions and P6 guard intact.
- `bun audit`: pass after top-level compatible `uuid` `11.1.1` and `ws` `8.21.0` overrides; 210
  packages checked, no known vulnerabilities.
- `git diff --check`: pass.
- `bun run verify`: pass after the last implementation, documentation, and review corrections.

The read-only live Sepolia P5 client confirmed chain, registry code, and exact-reader behavior at
block `11645707`; a deliberately unregistered local fixture returned `exists=false` and
`exactMatch=false`. No demo clearance transaction was created. See
`docs/compliance/evidence/p5-ledger-release-gate-software-2026-09-06.md`.

## Physical Ledger results

- A — valid exact clearance + physical approval: **not run**
- B — physical rejection: **not run**
- C — mutated build blocked before Ledger: local deterministic test passes; physical/demo capture pending
- D — invalid/revoked/expired blocked before Ledger: local deterministic tests pass; physical/demo capture pending
- E — consumed physical signature replay: local durable replay test passes; physical artifact pending
- F — physical signed-intent tampering: local signature/binding tests pass; physical artifact pending

No Ledger device model, firmware, Ethereum app version, derived public signer, physical signature,
or signature hash is claimed. `NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN` is unset, and the committed ERC-7730
v1 file is only a candidate—not evidence of Ledger acceptance/serving for this origin. P5 fails
closed without both prerequisites and a real authorized device. Blind signing was not enabled.

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
WebHID evidence harness.

P5 cannot be called complete until the origin/descriptor/device prerequisites exist and physical
cases A–F pass. The intended autonomous-agent story also needs truthful execution evidence; P5
currently provides the proposal API but no agent runtime. Even after hardware closure, SQLite
protects one coordinated API database only. Database loss/split replicas, Sepolia reorgs, and
clearance revocation after authorization but before a future P6 action require operational/finality
policy. P5 does not prove physical robot safety, trace provenance, registrar honesty, or live CRE
delivery.
