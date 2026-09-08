---
name: rovaulta-partner-compliance
description: Audit a Chainlink CRE or Ledger change for partner-prize eligibility, load-bearing use, and demo evidence. Use whenever partner-facing code or submission evidence changes.
---

# Partner Compliance

Read `docs/partners/CHAINLINK.md`, `docs/partners/LEDGER.md`, and `docs/compliance/EVIDENCE_MATRIX.md`.

For Chainlink:
- confidential handler must perform core product work, not a placeholder
- at least one sensitive input/private parameter/intermediate value remains inside the TEE path
- output must reveal only the minimum clearance artifact
- simulation/deployment evidence must be captured

For Ledger:
- use DMK, current transport, and Ethereum signer kit
- hardware approval must gate deployment of the exact cleared build
- browser/user-gesture constraints must be honored
- backend fallback signing is forbidden for the real demo path

Update evidence status; do not claim qualification before the real end-to-end proof exists.
