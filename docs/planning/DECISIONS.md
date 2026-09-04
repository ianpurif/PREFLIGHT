# Decision Log

| Date | Decision | Why | Status |
|---|---|---|---|
| 2026-09-05 | Use Chainlink + Ledger only | Both are load-bearing; a third partner would add integration weight without improving the core mechanism. | Active |
| 2026-09-05 | Bun/TypeScript primary stack | Best fit for CRE TypeScript SDK + shared hackathon velocity. | Active |
| 2026-09-05 | Foundry for contracts | Independent EVM verification/fuzzing. | Active |
| 2026-09-05 | Browser-only Ledger DMK boundary | Keeps hardware key out of server and follows current Ledger direction. | Active |
| 2026-09-05 | No LLM verdict authority | Clearance must be deterministic and auditable. | Active |
| 2026-09-05 | Preflight Canonical JSON v1 + SHA-256 | Exact schemas, deterministic UTF-8 bytes, versioned domain separation, and golden vectors prevent cross-runtime digest ambiguity. | Active |
| 2026-09-05 | Prefixed/branded protocol identifiers | Runtime prefixes and compile-time brands prevent identifier-type confusion without adding a schema dependency. | Active |
| 2026-09-05 | Secret-blinded envelope commitments | A 32-byte secret blind prevents low-entropy private safety rules from being exposed to offline dictionary attacks through their public commitment. | Active |
| 2026-09-05 | Decimal Unix-second protocol time | Canonical strings avoid timezone, floating-point, and runtime date-parser differences; wall-clock validity remains a later execution check. | Active |
