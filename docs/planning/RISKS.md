# Risk Register

| Risk | Impact | Mitigation target |
|---|---|---|
| CRE account/private-beta access unavailable | High | Authenticated simulation evidence is captured; preserve it and separately prove account/private-beta deployment access before any live-deployment claim. |
| Confidential inputs accidentally logged | Critical | redaction tests + partner review + no ordinary logging in confidential adapters |
| Ledger device unavailable at demo | High | obtain/test hardware early; do not fake hardware evidence; keep video proof if live environment is unstable |
| WebHID browser friction | Medium | Chromium + localhost/HTTPS + explicit user-gesture connection UX |
| Ledger signer-kit/DMK peer mismatch | Medium | P5 must align and runtime-test the SDK versions before implementing the hardware path |
| Ledger typed-data call falls back to blind signing | High | P5 must configure Clear Signing metadata/origin token and fail closed for the judged release path |
| Digest canonicalization mismatch | Critical | P1 canonical serialization + golden vectors and P4 Solidity transport vectors are complete; registrar tooling must strip `sha256:` only for object digests and hash exact prefixed identifiers for `*IdHash` fields |
| Authorized registrar attests false bindings | Critical | P4 makes the trust explicit, records `msg.sender`, and prevents overwrite; P5/orchestration must verify validated P1/P3 evidence before submitting and minimize registrar-key access |
| Clearance replayed across chains/registries | High | P4 records evidence only; P5 must domain-separate deployment authorization by chain ID, verifying contract, signer, and nonce |
| Sepolia deployment credential unavailable | Medium | chain-guarded script and instructions are ready; do not claim deployment until a funded deployer and explorer credential produce verifiable evidence |
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
