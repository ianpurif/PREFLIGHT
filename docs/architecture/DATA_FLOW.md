# Planned Data Flow

This is an architectural contract, not implementation.

1. **Facility configuration** → canonical private envelope + secret 32-byte blind → site/envelope-bound commitment.
2. **Vendor build descriptor** binds robot/build IDs + artifact digest → canonical robot-build digest.
3. **Evaluation request** binds the exact public identifiers, build digest, envelope commitment, evaluator version, and request time.
4. **CRE confidential handler** obtains sensitive values inside the TEE and invokes deterministic evaluation components permitted by the final CRE design.
5. **Minimal evaluation result** repeats the exact evaluation inputs + input digest; private envelope values and the blind do not leave confidential execution.
6. **Registry transaction** records a version-bound clearance artifact on Sepolia.
7. **Web app** reads clearance and constructs a human-readable EIP-712 deployment intent.
8. **Ledger** displays/signs the exact deployment intent after user action.
9. **Release gate** checks clearance + intent bindings before enabling the simulated deployment.
10. **Digital twin** renders the resulting state.

Canonical schema and digest rules are defined in `docs/architecture/adr/0003-canonical-protocol.md`. No step may silently downgrade to trusting a frontend boolean.
