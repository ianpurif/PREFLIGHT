# P4 — Attestation Registry

## Outcome

`PreflightRegistry` records a registrar-attested P1 clearance digest and its minimum public exact bindings, then answers whether that exact clearance exists, is unrevoked, is unexpired, and matches an expected site/robot/build/envelope/evaluator/evaluation context. It records scoped evaluation evidence; it never claims universal or physical robot safety.

## Non-goals

- parsing Preflight Canonical JSON or recomputing P1 SHA-256 clearance digests in Solidity
- automatic Chainlink CRE-to-contract delivery, live DON/Nitro attestation, or proof of evaluator provenance
- P5 Ledger, EIP-712, signer authorization, nonce consumption, or deployment execution
- P6 UI/digital twin, robotics control, tokens, payments, upgradeability, or governance frameworks
- storing private envelope geometry, thresholds, rules, blinds, confidential responses, or internal findings

## Invariants

- Only an owner-authorized registrar may record a clearance; the registrar vouches that the supplied bytes32 values are the exact transport representation of a validated P1 `ClearanceRecord`.
- A stored record is representable only for `CLEAR`; `HOLD`, `REJECT`, and unknown verdict values fail closed.
- The primary key is the P1 clearance digest with the lowercase `sha256:` prefix removed. P1 identifiers use `sha256(UTF8(exact identifier))` only as an onchain transport representation; these rules do not replace P1 canonical semantics.
- Every security-critical bytes32 binding is nonzero and stored: clearance ID, site, robot, build ID/digest, envelope ID/commitment, evaluator version, evaluation ID, and evaluation-inputs digest.
- `issuedAt < expiresAt`, issuance cannot be in the future, and validity is exactly `block.timestamp < expiresAt`; equality is expired.
- A clearance digest or clearance-ID hash is single-use and cannot be overwritten or revived after revocation.
- Only the immutable owner or original issuing registrar may revoke; revocation is permanent and repeated/unknown revocation is explicit.
- Exact-binding verification returns false for any mutated site, robot, build, envelope, evaluator, evaluation, digest, issuance, or expiry field.
- P3 authenticated simulation and P4 manual/authorized registration remain separate evidence levels.

## Change surfaces

- `contracts/src/PreflightRegistry.sol`: minimal owner/registrar authorization, clearance storage, revocation, events, and read/verification interface
- `contracts/test/**`: unit, P1 compatibility, fuzz, and stateful invariant coverage without adding a contract dependency
- `contracts/script/DeployPreflightRegistry.s.sol`: Sepolia-ready deployment using an environment-supplied private key
- `.env.example` and contract documentation: non-secret deployment configuration and commands
- `scripts/verify-scaffold.mjs` / `scripts/scaffold.test.mjs`: positive P4 structural guards while P5/P6 remain deferred
- planning, architecture, security, compliance, verification, and AI-use documentation

## Acceptance checks

- Authorized registration succeeds and emits the exact public bindings; unauthorized, zero-field, malformed-time, non-CLEAR, duplicate-digest, and duplicate-ID attempts revert with typed errors.
- `getClearance`, `isClearanceValid`, and exact-binding verification are stable, bounded reads with no enumeration.
- Correct bindings validate; mutations to each site/robot/build/envelope/evaluator/evaluation/digest/time binding fail.
- Foundry warp tests prove before-expiry validity and equality/after-expiry invalidity.
- Owner/issuer revocation immediately and permanently invalidates; unauthorized and repeated revocation revert.
- Fuzz tests mutate security-critical fields and demonstrate mismatch rejection, no overwrite, and no accidental key collision under intended construction.
- Stateful invariants prove revoked/expired/non-CLEAR records never validate and a changed exact-build binding never preserves validity.
- A hard-coded P1 golden clearance digest and identifier-hash vectors are registered and queried without competing JSON/hash semantics.
- `forge fmt --check`, `forge build`, verbose unit/fuzz/invariant tests, gas report, repository verification, and independent adversarial review all pass.
- Sepolia deployment occurs only if a funded credential is present; otherwise the ready command and exact environment blocker are documented without a fake address.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Read-only specialists inspect the P1 mapping, Foundry/test surface, and final contract diff. The primary agent owns every write in the current worktree; no parallel writer is authorized.

## Risks and rollback

- Registrar forgery: make the authority explicit and minimal; P4 trusts authorized registration and does not claim onchain proof of CRE execution.
- Hash/type confusion: document separate P1 digest versus identifier transport rules, use named struct fields, and lock known vectors in Foundry tests.
- Replay/overwrite: make clearance digest and clearance-ID hash permanently single-use.
- Expiry boundary errors: use explicit uint64 seconds and test immediately before, at, and after expiry.
- Revocation bypass: retain revoked state forever and include it in every validity path.
- Confidential-data leakage: accept only fixed-size public fields and timestamps; no strings, arrays, or opaque report bytes.
- Gas griefing: no loops, enumeration, dynamic storage, upgradeability, or external calls in production code.

Rollback is confined to P4 contract source/tests/script, P4-positive scaffold checks, and corresponding documentation. P1–P3 semantics and P5+ shells remain unchanged.

## Decisions / deviations

- The P1 clearance digest is the primary key after direct `sha256:` removal/hex decoding. Textual
  P1 identifiers use `sha256(UTF8(exact validated prefixed identifier))` strictly as an EVM
  transport adapter and are named `*IdHash`/`*VersionHash`.
- P1 has no evaluation-result digest. P4 stores the evaluation-ID hash and P1
  evaluation-inputs digest; it does not mislabel P3's distinct behavior-input digest.
- Only `bytes32("CLEAR")` is accepted. P1 `HOLD`, P3 `REJECT`, and all unknown values fail with
  `UnsupportedVerdict` before storage.
- P1's decimal timestamp maximum (`253402300799`) is preserved in addition to strict live-expiry
  checks.
- Revocation is owner/original-issuer only and monotonic. A removed registrar retains revoke-only
  authority for already-issued records so owner removal does not strand an issuer's emergency
  revocation path.
- No `forge-std` dependency was added. A small local cheatcode/assertion surface keeps the contract
  workspace dependency-free while exercising Foundry's configured fuzz and invariant runner.
- The later P4.1 evidence closure deployed this unchanged source to Sepolia; public deployment
  identity and verification evidence are recorded below without altering P4 semantics.

## Verification evidence

- `forge fmt --check` and `forge build` pass with Solidity 0.8.30/Foundry 1.8.1.
- `forge test -vvv`: 24 unit/fuzz tests pass (four fuzz properties at 512 runs each) and five
  stateful invariants pass across 128 runs/8,192 handler calls with zero unhandled handler reverts.
- `forge test --gas-report`: deployment-size metric 4,561 bytes; successful registration max
  observed 371,757 gas, revocation max 29,265 gas, exact read max 29,284 gas. The later live Sepolia
  readback reports 4,263 bytes of runtime code.
- P1 golden clearance/build/envelope/evaluation digests and exact identifier-hash vectors pass.
- `bun run verify` passes end to end: Biome, 7/7 typechecks, 10/10 Turbo test tasks,
  7/7 builds, all Foundry tests/invariants, and 4/4 scaffold tests.
- Independent adversarial review found and resolved: a misleading direct CRE-to-registry diagram,
  incomplete exact-binding event evidence, and potentially vacuous invalid-action invariants. The
  re-review found no remaining security defect; gas evidence was refreshed after the event change.
- `git diff --check` and an explicit trailing-whitespace scan pass before handoff.

## P4.1 — Sepolia deployment evidence closure

### Outcome and non-goals

Deploy the unchanged `PreflightRegistry` bytecode from commit `1929651` to Ethereum Sepolia, verify
its public owner/registrar/read state through RPC, publish only non-secret deployment metadata, and
make the resulting `chainId + verifyingContract` available to later P5 work. This does not register
a clearance, automate CRE delivery, add EIP-712, implement Ledger signing, or begin P5.

### Deployment invariants

- Refuse to broadcast unless the RPC reports chain ID `11155111`, the derived deployer is funded,
  and every pre-deployment verification gate passes.
- The deployer address is the constructor's immutable owner and initial registrar; no proxy,
  upgradeability, governance, token, or semantic contract change is introduced.
- Never print, copy, commit, or preserve the private key, RPC credential, explorer token, `.env`
  contents, CRE secret, or confidential envelope blind.
- Treat source verification failure as an external evidence blocker, not a reason to redeploy a
  correctly mined contract.
- Do not write a demo clearance solely for deployment closure; public view calls are sufficient.

### Acceptance and steps

- [x] Preflight: clean P4 commit, ignored `.env`, Sepolia chain ID, derived address/balance, Foundry
  identity, `forge fmt --check`, build/tests, and full repository verification
- [x] Broadcast unchanged deployment script exactly once and capture public receipt metadata
- [x] Verify source when explorer credentials/API permit; do not redeploy on verifier failure
- [x] RPC-check owner, initial registrar, constants, and nonexistent-clearance invalidity
- [x] Create machine-readable public deployment artifact and curated compliance evidence
- [x] Run post-deployment verification, secret-leak audit, Git diff check, and independent review
- [x] Update planning/evidence/handoff records and commit the P4.1 evidence closure

### Deployment result

- Ethereum Sepolia chain ID `11155111`, contract
  `0xFB270cc222efa8B5005AA097dD512Be2558dde65`
- successful transaction `0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497`,
  block `11644462`, timestamp `2026-09-06T02:48:00Z`
- immutable owner and initial registrar `0xaA5768d0f2157F8781efb975CDd9aec99e7879E3`
- Solidity `0.8.30+commit.73712a01`, Prague, optimizer 200; Foundry `1.8.1`
- source verified on Etherscan and Sourcify; live public readback matches constructor/interface
- no clearance write, contract semantic change, confidential-data publication, or P5 implementation
- independent re-review confirmed chain/source/artifact consistency and found no remaining
  correctness, security, leakage, or scope issue after stale-status and evidence-detail fixes
