# Evidence Matrix

| Requirement | Evidence | Status |
|---|---|---|
| Canonical domain protocol | `packages/domain/src/**`, golden/negative tests, ADR-0003 | P1 complete |
| Deterministic simulated evaluation | `packages/simulation-core/src/**`, 60 boundary/property/fixture tests, ADR-0004 | P2 complete locally; P3 authenticated CRE simulation evidenced below |
| Chainlink CRE workflow exists | `integrations/chainlink-cre/src/main.ts`, `workflow.ts`, `workflow.yaml`, `project.yaml` | P3 implemented; SDK 1.19.1 + CLI v1.32.0 builds pass locally |
| Confidential TEE handler is load-bearing | `confidential-evaluation.ts`: fixed secret fetch + direct P2 call; workflow tests and authenticated simulation evidence | CRE authenticated simulation complete; live Nitro execution not claimed |
| Sensitive input processed by confidential callback | versioned atomic envelope/blind secret; tampered blind changes Case A from evaluated output to redacted rejection | CRE authenticated simulation complete; raw output leakage checks pass |
| Successful CRE simulation/deploy | [`chainlink-cre-p3-authenticated-simulation-2026-09-06.md`](evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md) | Unsafe `HOLD`, corrected `CLEAR`, tampered `REJECT`; simulation only, no deployment claimed |
| Exact-build attestation registry | `contracts/src/PreflightRegistry.sol`, ADR-0006, [`p4-attestation-registry-local-2026-09-06.md`](evidence/p4-attestation-registry-local-2026-09-06.md) | P4 complete locally; authorized `CLEAR` registration, exact reads, expiry, and revocation verified |
| P1/EVM binding compatibility | P1 golden values + `PreflightRegistry.t.sol` identifier/digest transport tests | Direct SHA-256 digest decoding and exact-prefixed identifier hashing pass; registrar mapping trust is explicit |
| Contract adversarial coverage | Foundry unit/fuzz/stateful invariant suite and gas report | 24 unit/fuzz tests + 5 invariants pass locally; independent review recorded in P4 plan/report |
| Sepolia registry deployment | [`p4-sepolia-deployment-2026-09-06.md`](evidence/p4-sepolia-deployment-2026-09-06.md) + [`contracts/deployments/sepolia.json`](../../contracts/deployments/sepolia.json) | Deployed at `0xFB270cc222efa8B5005AA097dD512Be2558dde65`; successful tx/block and live RPC reads captured; Etherscan + Sourcify verified |
| Ledger DMK central to product | source path + hardware demo | Not started |
| Human approves high-risk action | physical device capture | Not started |
| Exact build bound to approval | P1 canonical intent/binding tests + future P5 EIP-712/hardware evidence | P1 foundation complete; P5 not started |
| Public repo + clear README | repository + `README.md` | README current through P4; public remote visibility not verified in this environment |
| Chronological Git history | `git log` | B0, P1, P2, P3, P4, and the P4 deployment-evidence closure are recorded as thematic chronological commits |
| AI use attribution | `docs/ai/**` | Active |
| 2–4 minute demo | video | Not started |
