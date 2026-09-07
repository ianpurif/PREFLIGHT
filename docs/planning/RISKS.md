# Risk Register

| Risk | Impact | Mitigation target |
|---|---|---|
| CRE account/private-beta access unavailable | High | Authenticated simulation evidence is captured; preserve it and separately prove account/private-beta deployment access before any live-deployment claim. |
| Confidential inputs accidentally logged | Critical | redaction tests + partner review + no ordinary logging in confidential adapters |
| Ledger device unavailable at demo | High | obtain/test hardware early; do not fake hardware evidence; keep video proof if live environment is unstable |
| WebHID browser friction | Medium | Chromium + localhost/HTTPS + explicit user-gesture connection UX |
| Ledger signer-kit/DMK peer mismatch | Medium | Exact compatible versions are pinned and mock/browser builds pass; real device/firmware/app compatibility remains unverified until hardware evidence. |
| Ledger typed-data call lacks complete Clear Signing context | High | The adapter requires exact chain/registry/schema/filter count and every display path, cancels partial context or `SIGN_TYPED_DATA_LEGACY`, and returns `CLEAR_SIGNING_UNAVAILABLE`; obtain a Ledger-issued origin token and accepted ERC-7730 descriptor before physical testing. |
| Digest canonicalization mismatch | Critical | P1 canonical serialization + golden vectors and P4 Solidity transport vectors are complete; registrar tooling must strip `sha256:` only for object digests and hash exact prefixed identifiers for `*IdHash` fields |
| Authorized registrar attests false bindings | Critical | P4 makes the trust explicit, records `msg.sender`, and prevents overwrite; P5/orchestration must verify validated P1/P3 evidence before submitting and minimize registrar-key access |
| Clearance replayed across chains/registries | High | P5 EIP-712 binds chain ID, verifying contract, authorized signer, exact clearance/build fields, action, expiry, and a durable one-time nonce. |
| Offchain nonce database lost or split across API replicas | High | P5 documents single-node SQLite authority, uses FULL synchronous WAL and atomic compare-and-set, and must not run independent stores; move to one transactional shared store before horizontal scale. |
| Clearance changes after the second read or during a reorg | High | P5 records pre/post block evidence and denies known revocation/expiry before consumption; P6 must define finality/execution timing and recheck immediately before any irreversible action. |
| ERC-7730 descriptor not accepted for the application origin | High | The committed file is explicitly a candidate only. Physical evidence is blocked until Ledger serves an accepted descriptor for the configured origin token; no blind fallback is permitted. |
| Official Clear Signing evidence access unavailable | High | ERC-7730 v2 lints cleanly, actual Speculos transport/app/address UI works, and pre-sign C plus invalid/unregistered D pass. Structured display still needs a legitimate Tester `GATING_TOKEN`; Preflight A/B/E/F separately need an application origin token plus accepted/served descriptor or another official signature-preserving descriptor path. Never use the direct tester's implicit token as evidence. |
| Speculos evidence overstated as hardware security | High | Label every run `Ledger Speculos official device simulator`; it proves emulator/app/APDU/UI behavior only, not Secure Element custody, physical buttons/display, firmware compatibility, or WebHID hardware behavior. |
| Deterministic Speculos signer enters production policy | Critical | Production rejects the Speculos transport. Treat its derived address and all related clearances/nonces as public test data; never retain it in a production signer allowlist. |
| Manual harness misrepresented as an autonomous agent | High | P5 docs label `/p5-ledger` as manual and claim only an agent-facing proposal API; require separate real agent execution evidence before using the intended autonomous-agent partner claim. |
| Sepolia owner/registrar credential exposure | High | keep the deployer credential only in ignored local secret storage, never commit raw broadcast/cache output, and minimize use of this testnet authority |
| Envelope commitment dictionary attack | Critical | P1 requires a secret 32-byte blind; P3 simulation generates it only into ignored local input, while deployment must generate and custody it through the CRE confidential-secret workflow. |
| Synthetic trace claimed as real build execution | High | P3 labels traces `SYNTHETIC_CALLER_SUPPLIED` and binds the response to their canonical digest; remote attestation remains out of scope, so stronger provenance claims are prohibited. |
| Internal P2 evidence escapes confidential boundary | Critical | P3 keeps `InternalEvaluationReport` TEE-local and returns a field-by-field allowlist; leakage tests scan known private values. |
| Verdict oracle reveals private rules | High | Authenticated HTTP key, least-privilege TEE restrictions, no counts/findings, fixed errors; later orchestration must add authorization/rate policy. |
| CRE secret exceeds Vault quota | Medium | P3 demo input is 1,506 ASCII characters and capped at 2 KiB; prove ciphertext quota fit with authenticated CRE secret tooling before deployment and do not claim maximum P2 envelopes fit. |
| Point-robot/straight-segment model mistaken for physical validation | High | ADR-0004 documents excluded footprint, dynamics, localization, and physics; preserve exact simulated-envelope wording |
| Evaluator semantics drift under the same version | High | New version identifier + refreshed golden vectors for any geometry, rule, PRNG, ordering, or verdict change |
| Demo depends on network timing | High | deterministic local simulation state + explicit retry; partner calls remain real/evidenced |
| “Safe robot” overclaim | High | enforce precise copy and reviewer check |
| Partner integration looks decorative | High | load-bearing acceptance tests and evidence matrix |
