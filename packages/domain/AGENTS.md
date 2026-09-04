# Domain Scope Instructions

Applies to `packages/domain/**`.

- This package is the stable language shared across surfaces.
- Keep it free of React, Fastify, Chainlink, Ledger, viem, and environment access.
- Prefer explicit branded identifiers and canonical serialization over plain ambiguous strings once implemented.
- Domain types may describe `CLEAR/HOLD/ESCALATE`; they must not imply “safe.”
- Protocol changes require tests and review of contract/CRE/Ledger consumers.
