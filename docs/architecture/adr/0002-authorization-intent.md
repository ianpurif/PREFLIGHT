# ADR-0002: Human approval should bind an EIP-712 deployment intent

**Status:** Proposed; implementation pending

## Intent
Ledger should not sign an opaque generic message. The final implementation should prefer a human-readable typed deployment intent that binds at least the site commitment, robot/build identifier, clearance reference, target environment, nonce, and expiry.

## Reason
A hardware prompt is only a meaningful trust boundary if the human can approve the actual high-risk action and the signature cannot be replayed for a different build/site.

Exact schema and onchain/offchain verification are intentionally deferred to the implementation task.
