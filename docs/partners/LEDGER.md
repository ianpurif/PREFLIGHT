# Ledger Integration Contract

## Prize direction and precise claim

**Intended AI Agents x Ledger direction: human-in-the-loop autonomous-agent authorization.**

> An orchestration client can prepare an exact robot release request, but release authorization requires a cryptographically valid, one-time Ledger-backed human approval bound to the exact cleared build and deployed Preflight registry.

P5 exposes the smallest agent-facing API boundary, but the current `/p5-ledger` route is a manual operator evidence harness. No autonomous or LLM agent runtime is implemented or demonstrated in P5, so the agent half of the intended partner story remains unproven alongside the physical Ledger cases. Ledger does not evaluate safety, run Chainlink CRE, certify an industrial system, or activate a physical robot.

## Load-bearing authority flow

```text
Operator/orchestration client proposes
      ↓
Preflight deterministic policy filters
      ↓
Human reviews and approves on device
      ↓
Ledger signer enforces key custody
      ↓
API verifies, rechecks clearance, consumes nonce once
```

- The proposal API accepts exact public fields and returns deterministic denials. A future agent may call it, but no agent runtime is claimed in P5; any such client has no key or approval authority.
- Deterministic policy queries the deployed P4 registry and decides whether Ledger may be prompted.
- The software requires Ledger's returned descriptor to cover every signed field before the signing command may proceed. Physical display/review remains unverified until hardware evidence is captured.
- Ledger keeps the private key on hardware and produces the only acceptable signature.
- The API reconstructs the message, recovers the signer, repeats the P4 check, and atomically consumes the nonce.

## Current packages

Exact versions are pinned for demo stability:

| Package | Version | Purpose |
|---|---:|---|
| `@ledgerhq/context-module` | `2.5.0` | Clear Signing context dependency |
| `@ledgerhq/device-management-kit` | `1.9.0` | device discovery/session management |
| `@ledgerhq/device-transport-kit-web-hid` | `1.2.4` | browser WebHID transport |
| `@ledgerhq/device-signer-kit-ethereum` | `1.18.0` | Ethereum address and full EIP-712 signing |
| `rxjs` | `7.8.2` | device-action observables |

Deprecated `@ledgerhq/hw-app-*` and `@ledgerhq/hw-transport-*` packages are prohibited and absent. P5 does not use Key Ring because it needs physical human approval, not agent/VPS secret brokerage.

## Exact authorization

The domain is `Preflight`, version `1`, chain ID `11155111`, verifying contract `0xFB270cc222efa8B5005AA097dD512Be2558dde65`. The address and chain come from `contracts/deployments/sepolia.json`.

`DeploymentIntent` signs protocol/schema version, fixed `ACTIVATE_DEPLOYMENT`, exact site, robot, build ID/digest, clearance ID/digest, `sepolia`, authorized signer, server nonce, integer `issuedAt`/`expiresAt`, and the P1 canonical intent digest. Any field or domain change invalidates the signature.

Authorized signers are a strict public-address allowlist controlled by the API operator through `PREFLIGHT_AUTHORIZED_SIGNERS`. The connected device address is confirmed on-device and checked before signing; recovered signer authorization is checked again during consumption. The backend never receives a private key.

## Replay and TOCTOU boundaries

P5's nonce authority is offchain and single-node: Bun SQLite with WAL, synchronous `FULL`, and one atomic `UPDATE ... WHERE state = 'ISSUED'`. It persists the exact canonical intent, clearance, typed-data digest, signer, and precheck block evidence. Browser state is never treated as replay protection.

The same exact P4 clearance is read at one explicit Sepolia block before preparation and again after signature recovery. Missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, wrong-contract, RPC, or persistence state fails closed. Validity is strict `now < expiresAt`; equality rejects.

## Clear Signing and refusal

The browser route uses an explicit user gesture, WebHID, on-device address confirmation, and an active Ethereum app. A Ledger-issued origin token is mandatory for signing. The local ERC-7730 v1 file is a **candidate descriptor only** until Ledger accepts and serves it for the application origin.

The official Context Module is fixed to Ethereum. Before `SIGN_TYPED_DATA` may continue, the runtime guard requires a successful descriptor response for the exact chain, registry, 15-field `DeploymentIntent` schema, declared filter count, and exact display-filter paths. Missing, partial, extra, or mismatched filters fail closed. Signer Kit 1.18.0 can also enter its public `SIGN_TYPED_DATA_LEGACY` action step when full context cannot be built; the adapter cancels that action immediately and returns `CLEAR_SIGNING_UNAVAILABLE`. It never accepts hashed EIP-712, blind signing, personal signing, raw transaction signing, or a backend/frontend fallback. A device refusal maps to `HUMAN_REJECTED` and is not retried.

## Hardware evidence status

Not captured. This environment lacks a configured Ledger-issued origin token and has no evidence of an accepted descriptor or connected physical device. Device model, firmware, Ethereum app version, derived signer, physical approval/refusal, replay, and tampering results must not be inferred from mocks.

Required closure cases are: valid approval; physical refusal; Build B blocked before Ledger; missing/revoked/expired clearance blocked before Ledger; consumed-signature replay rejected; and post-sign field tampering rejected. Evidence may include only public fields/signature hash and must never expose PIN, recovery phrase, private key, origin token, or credentials.

## Official resources used

- https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth
- https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/migrations/signers/eth/hw_app_eth_to_dmk
- https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/how_to/transports
- https://developers.ledger.com/docs/clear-signing/for-wallets
- https://developers.ledger.com/docs/clear-signing/reference/erc7730-reference
- https://github.com/LedgerHQ/agent-skills
