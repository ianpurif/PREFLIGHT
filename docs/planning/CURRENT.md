# Current State

## Phase

**P1–P4.1 are complete. P5 software is implemented and locally verified, but P5 remains open because the required physical Ledger evidence cannot yet be produced. P6–P8 are intentionally not started.**

## P5 implementation now present

- `DeploymentIntent` v2 adds the fixed `ACTIVATE_DEPLOYMENT` action without creating a second intent model.
- EIP-712 signs the full exact intent under `Preflight` v1, Sepolia `11155111`, and the deployed registry from `contracts/deployments/sepolia.json`.
- The signed message binds protocol/schema, site, robot, build ID/digest, clearance ID/digest, environment, authorized signer, nonce, issuance, expiry, and the P1 intent digest.
- The API reads the real P4 interface at one explicit block and rejects missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, or wrong-registry clearance state.
- The signer address must be in the operator-controlled `PREFLIGHT_AUTHORIZED_SIGNERS` allowlist before a Ledger request is prepared and again after recovery.
- Nonces are generated server-side, persisted in SQLite, and atomically consumed once. Invalid signatures and failed post-sign checks do not consume them.
- Clearance is checked before signing and again before nonce consumption. Revocation or expiry between checks denies authorization.
- The browser adapter uses pinned Ledger DMK, WebHID Device Transport Kit, Context Module, and Ethereum Device Signer Kit packages. It requires explicit connection, on-device address confirmation, the Ethereum app, and full typed-data signing.
- The runtime Clear Signing guard requires successful resolution for the exact chain, registry, 15-field schema, filter count, and every display path before signing may proceed. Partial/mismatched context and the signer kit's legacy typed-data fallback state are cancelled and rejected. There is no personal-sign, raw-transaction, hashed-EIP-712, backend-key, or frontend-boolean fallback.
- A minimal `/p5-ledger` operator harness exists only for WebHID/hardware evidence capture. It does not activate a robot or implement the P6 digital twin.
- `/release/prepare` is the smallest agent-facing proposal interface, but no autonomous/LLM agent runtime or agent execution evidence is implemented in P5. The current browser flow is manual and must not be presented otherwise.
- Mock tests cover deterministic EIP-712 mutation, the positive exact registry-reader path, API request/error boundaries, authorized signatures, durable/concurrent replay rejection, TOCTOU, build mutation, device lifecycle, refusal, exact/partial descriptor resolution, malformed output, and legacy-fallback cancellation.

## Current blocker

Physical cases A–F have **not** been run. The local environment has no configured Ledger-issued origin token, and the repository's ERC-7730 file is only a candidate descriptor—not evidence that Ledger has accepted/served it for this origin. No physical Ledger model, firmware, Ethereum app, signer address, approval, or rejection result was captured.

P5 therefore does not yet prove a hardware-backed human approval. Full Clear Signing must be enabled with a matching Ledger origin token and accepted descriptor, then a real device and a deliberate demo `CLEAR` record must exercise approval, refusal, build mismatch, invalid clearance, replay, and tampering. Blind signing must remain disabled; if the SDK attempts its legacy fallback, the adapter fails closed.

## Next exact task

Close P5 hardware evidence only:

1. obtain/configure the Ledger-issued origin token and accepted ERC-7730 descriptor;
2. connect an authorized Ledger in Chromium over localhost/HTTPS;
3. create an honestly labeled demo/test P4 `CLEAR` record only if required;
4. run and capture physical cases A–F without secrets;
5. rerun the full verification loop and independent review.

Do not begin P6 until that evidence closes P5.

## Environment status

Bun 1.4.1 and Foundry 1.8.1 are available. P1–P4 regressions remain in scope. A read-only Sepolia P5 client run on 2026-09-06 confirmed chain `11155111`, registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, and live contract access at block `11645707`; the deliberately unregistered local fixture returned `exists=false` and `exactMatch=false`, as expected. This is reader/policy evidence, not a successful release or proof that the registry contains no other clearances.

P3's authenticated CRE runs remain simulation evidence only. P4 remains an authorized registrar attestation, not automatic CRE delivery. Neither Ledger nor Preflight proves physical robot safety.
