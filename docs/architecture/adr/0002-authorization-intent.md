# ADR-0002: Human approval should bind an EIP-712 deployment intent

**Status:** Proposed; implementation pending

## Intent
Ledger should not sign an opaque generic message. The canonical P1 deployment intent binds the site ID, robot ID, robot-build ID and digest, clearance ID and digest, target environment, nonce, issuance, and expiry. P5 should map those exact fields into human-readable typed data without changing their meaning.

## Reason
A hardware prompt is only a meaningful trust boundary if the human can approve the actual high-risk action and the signature cannot be replayed for a different build/site.

The canonical schema and digest are defined by ADR-0003. EIP-712 domain fields, signer authorization, nonce consumption, hardware interaction, and onchain/offchain signature verification remain intentionally deferred to P5.
