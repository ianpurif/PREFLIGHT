# Current State

## Phase

**P1–P4.1 are complete. P5 software is implemented and locally verified. P5.1 now has the official Speculos transport, actual Ethereum app/address UI smoke evidence, a clean ERC-7730 v2 validator result, real pre-sign C, and invalid/unregistered D. Authenticated Clear Signing cases A/B/E/F remain externally blocked. Physical Ledger evidence is also still open. P6–P8 are intentionally not started.**

## P5 implementation now present

- `DeploymentIntent` v2 adds the fixed `ACTIVATE_DEPLOYMENT` action without creating a second intent model.
- EIP-712 signs the full exact intent under `Preflight` v1, Sepolia `11155111`, and the deployed registry from `contracts/deployments/sepolia.json`.
- The signed message binds protocol/schema, site, robot, build ID/digest, clearance ID/digest, environment, authorized signer, nonce, issuance, expiry, and the P1 intent digest.
- The API reads the real P4 interface at one explicit block and rejects missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, or wrong-registry clearance state.
- The signer address must be in the operator-controlled `PREFLIGHT_AUTHORIZED_SIGNERS` allowlist before a Ledger request is prepared and again after recovery.
- Nonces are generated server-side, persisted in SQLite, and atomically consumed once. Invalid signatures and failed post-sign checks do not consume them.
- Clearance is checked before signing and again before nonce consumption. Revocation or expiry between checks denies authorization.
- The browser adapter uses pinned Ledger DMK, WebHID and Speculos Device Transport Kits, Context Module, and Ethereum Device Signer Kit packages behind an exact `webhid | speculos` selection. Both transports retain one connection/address/context/signing path; Speculos is rejected outside `development`/`test`.
- The runtime Clear Signing guard requires successful resolution for the exact chain, registry, 15-field schema, filter count, and every display path before signing may proceed. Partial/mismatched context and the signer kit's legacy typed-data fallback state are cancelled and rejected. There is no personal-sign, raw-transaction, hashed-EIP-712, backend-key, or frontend-boolean fallback.
- A minimal `/p5-ledger` operator harness defaults to production WebHID and can opt into a loopback Ledger Speculos official device simulator only in development/test. It does not activate a robot or implement the P6 digital twin.
- Speculos `0.27.0` executed the official Ethereum `1.22.3` Nano S Plus ELF. DMK discovery, actual emulator address review/confirmation, and public session identity were captured without a seed or secret.
- The candidate descriptor now uses active ERC-7730 v2 and passes official `erc7730 1.0.7` lint with no issues. This is validation, not Ledger registry acceptance or display evidence.
- `/release/prepare` is the smallest agent-facing proposal interface, but no autonomous/LLM agent runtime or agent execution evidence is implemented in P5. The current browser flow is manual and must not be presented otherwise.
- Mock tests cover deterministic EIP-712 mutation, the positive exact registry-reader path, API request/error boundaries, authorized signatures, durable/concurrent replay rejection, TOCTOU, build mutation, device lifecycle, refusal, exact/partial descriptor resolution, malformed output, and legacy-fallback cancellation.

## Current blocker

The official Clear Signing Tester wrapper was invoked and failed closed with `Error: GATING_TOKEN environment variable not set` (exit `1`). Its direct implicit test-token fallback was not used. The Tester is also a separate display harness that discards the signature: its gating token is not a substitute for Preflight's Ledger origin token/accepted descriptor. Consequently the structured deployment-intent display and Speculos cases A/B/E/F have **not** been run. A deliberate unexpired Sepolia demo `CLEAR` record for the Speculos signer would also be required for Case A; no contract write was made.

Case C and the invalid/unregistered D variant were executed through the real `/release/prepare` boundary using the public Speculos test address. Build substitution returned `403 CLEARANCE_BINDING_MISMATCH`; the deliberately unregistered fixture reached the deployed Sepolia registry and returned `403 CLEARANCE_NOT_FOUND`. Both stopped before device signing. Real revoked/expired D variants remain uncaptured, although deterministic tests cover them.

Physical cases A–F also have **not** been run. The local environment has no configured Ledger-issued origin token and no evidence that Ledger accepted/serves the candidate descriptor for this origin. No physical Ledger model, firmware, approval, or rejection was captured.

P5 therefore does not yet prove either a complete official Speculos Clear Signing flow or hardware-backed human approval. Blind signing remains disabled; missing/partial context or the SDK legacy fallback fails closed.

## Next exact task

Close the remaining P5 evidence only:

1. obtain a legitimate official Clear Signing Tester `GATING_TOKEN` and run the committed explicit-display fixture through the official tester;
2. separately obtain a Ledger-issued application origin token plus an accepted/served descriptor, or an officially documented Speculos descriptor-resolution path that returns the real signature without weakening the guard;
3. register an honestly labeled, unexpired Sepolia demo/test P4 `CLEAR` record for the deterministic Speculos test signer in test-only state;
4. run the remaining Speculos A/B/E/F cases through the shared authorization semantics;
5. capture physical A–F when hardware is available;
6. rerun the full verification loop and independent review.

Do not begin P6 until that evidence closes P5.

## Environment status

Bun 1.4.1 and Foundry 1.8.1 are available. P1–P4 regressions remain in scope. Native WSL2 Speculos `0.27.0`, QEMU, and the verified public Ethereum `1.22.3` Nano S Plus ELF were used for the recorded smoke run. A read-only Sepolia P5 client run on 2026-09-06 confirmed chain `11155111`, registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, and live contract access at block `11645707`; the deliberately unregistered local fixture returned `exists=false` and `exactMatch=false`, as expected. This is reader/policy evidence, not a successful release or proof that the registry contains no other clearances.

P3's authenticated CRE runs remain simulation evidence only. P4 remains an authorized registrar attestation, not automatic CRE delivery. Neither Ledger nor Preflight proves physical robot safety.
