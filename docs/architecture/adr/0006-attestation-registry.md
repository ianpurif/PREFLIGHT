# ADR-0006: Exact-Binding Attestation Registry

- Status: Accepted
- Date: 2026-09-06

## Context

P4 must make a validated P1 clearance durable without exposing the private safety envelope or
reimplementing Preflight Canonical JSON in Solidity. P3 currently proves only authenticated local
CRE simulation; it does not deliver an attestation to an EVM contract. P5 will later add Ledger-backed
deployment authorization and replay protection, so P4 must remain evidence storage rather than
premature release logic.

## Decision

Use one non-upgradeable `PreflightRegistry` with an immutable owner and owner-managed registrar
mapping. The owner is the initial registrar. Only a registrar may record; `issuer` is always
`msg.sender`. The owner or original issuer may revoke. Removing a registrar stops new records but
preserves revoke-only authority for records it issued.

The primary key is the validated P1 clearance SHA-256 digest decoded to `bytes32` after removing the
`sha256:` prefix. Other P1 object digests use the same direct conversion. Text identifiers cannot fit
losslessly in fixed-size storage, so the transport adapter is
`sha256(UTF8(exact validated prefixed identifier))`; fields are explicitly named `*IdHash` or
`*VersionHash`. The registrar attests that these values correspond to the validated P1 object.

Store the clearance-ID hash, evaluation-ID hash, site-ID hash, robot-ID hash, robot-build-ID hash,
robot-build digest, safety-envelope-ID hash, safety-envelope commitment, evaluator-version hash,
evaluation-inputs digest, `CLEAR`, issuance, expiry, issuer, existence, and revocation. P1 defines no
evaluation-result digest, so P4 does not invent one. P3's behavior-input digest remains distinct and
is not relabeled as a clearance binding.

Reject zero fields, non-`CLEAR` verdicts, future issuance, `issuedAt >= expiresAt`, already-expired
input, and timestamps above P1's `253402300799` maximum. Permanently reserve both clearance digest
and clearance-ID hash. Validity is exactly: exists, `CLEAR`, not revoked, and
`block.timestamp < expiresAt`. Exact verification additionally compares every stored binding,
including issuance and expiry.

Use only fixed-size fields, mappings, and bounded reads. Do not store private envelope data, dynamic
reports, enumerable arrays, token/governance state, or canonical JSON. Emit public record/revocation
events suitable for auditing.

## Consequences

- A clearance cannot silently authorize another site, robot, build, envelope commitment, evaluator,
  evaluation, or time window.
- Revocation is permanent and overwrite cannot revive a record.
- The current registration boundary is manual/authorized and trusts the registrar. It is not live
  DON delivery, hardware TEE attestation, or proof of robot-trace provenance.
- The same P1 clearance digest can be recorded in another chain/registry. P5 must bind deployment
  authorization to chain ID, verifying contract, exact clearance/build, signer, and nonce.
- The contract records scoped evaluation evidence; it does not authorize deployment and does not
  claim physical or universal robot safety.
