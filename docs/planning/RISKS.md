# Risk Register

| Risk | Impact | Mitigation target |
|---|---|---|
| CRE deployment access unavailable | High | Ensure CRE simulation is a first-class judged proof; capture exact CLI evidence. |
| Confidential inputs accidentally logged | Critical | redaction tests + partner review + no ordinary logging in confidential adapters |
| Ledger device unavailable at demo | High | obtain/test hardware early; do not fake hardware evidence; keep video proof if live environment is unstable |
| WebHID browser friction | Medium | Chromium + localhost/HTTPS + explicit user-gesture connection UX |
| Ledger signer-kit/DMK peer mismatch | Medium | P5 must align and runtime-test the SDK versions before implementing the hardware path |
| Ledger typed-data call falls back to blind signing | High | P5 must configure Clear Signing metadata/origin token and fail closed for the judged release path |
| Digest canonicalization mismatch | Critical | P1 canonical serialization + golden vectors complete; P4 must reproduce the agreed bytes/values in contract tests |
| Envelope commitment dictionary attack | Critical | P1 requires a secret 32-byte blind; P3 must generate/custody it inside the confidential boundary |
| Synthetic trace claimed as real build execution | High | P2 labels traces as fixture/materialized data only; P3/later trusted execution must establish provenance before stronger claims |
| Internal P2 evidence escapes confidential boundary | Critical | P3 must keep `InternalEvaluationReport` in the TEE and explicitly construct a minimal public result; never forward it wholesale |
| Point-robot/straight-segment model mistaken for physical validation | High | ADR-0004 documents excluded footprint, dynamics, localization, and physics; preserve exact simulated-envelope wording |
| Evaluator semantics drift under the same version | High | New version identifier + refreshed golden vectors for any geometry, rule, PRNG, ordering, or verdict change |
| Demo depends on network timing | High | deterministic local simulation state + explicit retry; partner calls remain real/evidenced |
| “Safe robot” overclaim | High | enforce precise copy and reviewer check |
| Partner integration looks decorative | High | load-bearing acceptance tests and evidence matrix |
