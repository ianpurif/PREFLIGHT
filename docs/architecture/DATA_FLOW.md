# Planned Data Flow

This is an architectural contract, not implementation.

1. **Facility configuration** → canonical private envelope → commitment.
2. **Vendor build artifact** → canonical build digest.
3. **Evaluation request** contains public identifiers plus references to confidential inputs.
4. **CRE confidential handler** obtains sensitive values inside the TEE and invokes deterministic evaluation components permitted by the final CRE design.
5. **Minimal evaluation result** leaves confidential execution.
6. **Registry transaction** records a version-bound clearance artifact on Sepolia.
7. **Web app** reads clearance and constructs a human-readable EIP-712 deployment intent.
8. **Ledger** displays/signs the exact deployment intent after user action.
9. **Release gate** checks clearance + intent bindings before enabling the simulated deployment.
10. **Digital twin** renders the resulting state.

No step may silently downgrade to trusting a frontend boolean.
