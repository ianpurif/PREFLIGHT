# ADR-0007: Ledger-backed one-time release authorization

- Status: Accepted for P5 software; physical evidence pending
- Date: 2026-09-06

## Context

P4 proves that an authorized registrar recorded a public `CLEAR` attestation for exact P1 bindings. It does not authorize deployment. P5 must expose a proposal boundary usable by a future deployment agent while preventing any orchestration client, browser, or backend from becoming the human release authority. P5 does not implement an autonomous/LLM agent runtime.

## Decision

Use the existing P1 `DeploymentIntent`, advanced to `preflight.deployment-intent/v2` only to add fixed action `ACTIVATE_DEPLOYMENT`. The intent remains chain-neutral canonical protocol data. P5 wraps it in full EIP-712 typed data whose domain is `Preflight`, version `1`, Sepolia chain ID `11155111`, and the deployed `PreflightRegistry` address loaded from the P4 artifact.

The message repeats every human/security binding: protocol/schema, action, site, robot, build ID/digest, clearance ID/digest, target environment, authorized signer, nonce, integer issuance/expiry, and P1 deployment-intent digest. This redundancy makes the device display meaningful while cryptographically preserving the canonical P1 relationship.

The browser is the only Ledger boundary. It uses DMK + WebHID + Ethereum Device Signer Kit, confirms the address on-device, requires a Ledger origin token, and submits the full typed data. The official Ethereum Context Module must resolve the exact chain, registry, 15-field schema, filter count, and every exact display path before the signing command may proceed. Partial/mismatched context and any `SIGN_TYPED_DATA_LEGACY` state are cancelled and rejected. Device refusal is a normal `HUMAN_REJECTED` result and is never retried.

The API is deterministic policy and offchain replay authority. Before preparation it validates exact proposal/clearance bindings, authorized signer, chain/contract/code, and the full P4 record at one explicit block. It generates a 128-bit random nonce and stores the exact canonical request in SQLite. After signing it reconstructs the typed data, recovers and reauthorizes the signer, repeats the P4 read, enforces strict expiry, and atomically changes the nonce from `ISSUED` to `CONSUMED`. Only then does it emit a public `ReleaseAuthorization`.

## Consequences

- Chain, registry, signer, clearance, build, action, and time substitution invalidate the signature.
- Revocation/expiry observed between the two reads denies authorization even with a valid signature.
- Invalid signatures and failed postchecks leave the nonce available for the original exact request; exactly one valid concurrent consumer succeeds.
- Replay protection is durable but single-node/offchain. Independent databases or database loss are outside this guarantee and must not be presented as onchain enforcement.
- P5 produces authorization only. P6 must define activation-time finality/recheck and may not treat an old receipt as perpetual authority.
- The committed ERC-7730 descriptor is only a candidate until accepted for the application origin. Physical Clear Signing evidence remains a completion requirement.
- The prepare API is agent-facing, but an autonomous-agent execution claim requires separate truthful evidence; the P5 harness is manual.

## Rejected alternatives

- Backend/private-key signing: violates the Ledger authority boundary.
- Legacy LedgerJS or hashed EIP-712: hides the exact human-approved fields and is prohibited.
- Blind/personal/raw signing fallback: fails the Clear Signing requirement.
- Browser-local nonce state: not durable or race-safe.
- A new P5 smart contract: unnecessary scope for the smallest P5 authorization boundary.
- Generic arbitrary actions or free-form text: ambiguous and unsafe.
