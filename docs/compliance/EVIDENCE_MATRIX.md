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
| Ledger DMK central to product | `packages/ledger-gate`, ADR-0007, [`p5-ledger-release-gate-software-2026-09-06.md`](evidence/p5-ledger-release-gate-software-2026-09-06.md), [`p5-ledger-speculos-partial-2026-09-07.md`](evidence/p5-ledger-speculos-partial-2026-09-07.md) | Shared DMK WebHID/Speculos path implemented; actual Ethereum app/address UI smoke, pre-sign C, and invalid/unregistered D captured; authenticated Clear Signing A/B/E/F and physical evidence blocked |
| Agent-facing proposal boundary | `POST /release/prepare`, deterministic release service, manual `/p5-ledger` harness | API boundary exists; no autonomous/LLM agent runtime or agent-execution evidence is claimed in P5 |
| Human approves high-risk action | official Tester display + Speculos A/B/E/F + later physical-device capture | Not proven; Tester `GATING_TOKEN`, application origin/accepted descriptor, A/B/E/F, and physical cases remain pending |
| Exact build bound to approval | P1 intent v2, P5 EIP-712 golden/mutation tests, API build-mismatch tests | Software complete: exact site/robot/build/clearance/domain/signer/nonce/time bindings; physical signature evidence pending |
| Replay-safe release authorization | SQLite persistence/concurrency/reopen tests and pre/post registry policy | Single-node offchain atomic consumption passes locally; no onchain nonce claim |
| No blind/legacy signing fallback | exact runtime descriptor/filter guard + partial/mismatch tests + `SIGN_TYPED_DATA_LEGACY` cancellation + ERC-7730 v2 official lint | Software gate and descriptor lint pass; official Tester display remains blocked by missing `GATING_TOKEN`, and Preflight signing lacks origin/accepted-descriptor resolution; no implicit test token or blind fallback was used |
| Ledger developer-experience feedback | [`LEDGER_DX_FEEDBACK.md`](../partners/LEDGER_DX_FEEDBACK.md) | Specific DMK, Signer Kit, WebHID, Speculos, ERC-7730, Tester, and origin-token onboarding feedback captured |
| Public repo + clear README | repository + `README.md` | README current through P4; public remote visibility not verified in this environment |
| Chronological Git history | `git log` | B0, P1, P2, P3, P4, and the P4 deployment-evidence closure are recorded as thematic chronological commits |
| AI use attribution | `docs/ai/**` | Active |
| 2–4 minute demo | video | Not started |
