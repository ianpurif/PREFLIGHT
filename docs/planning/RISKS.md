# Risk Register

| Risk | Impact | Mitigation target |
|---|---|---|
| CRE deployment access unavailable | High | Ensure CRE simulation is a first-class judged proof; capture exact CLI evidence. |
| Confidential inputs accidentally logged | Critical | redaction tests + partner review + no ordinary logging in confidential adapters |
| Ledger device unavailable at demo | High | obtain/test hardware early; do not fake hardware evidence; keep video proof if live environment is unstable |
| WebHID browser friction | Medium | Chromium + localhost/HTTPS + explicit user-gesture connection UX |
| Digest canonicalization mismatch | Critical | canonical serialization + golden vectors across packages/contract |
| Demo depends on network timing | High | deterministic local simulation state + explicit retry; partner calls remain real/evidenced |
| “Safe robot” overclaim | High | enforce precise copy and reviewer check |
| Partner integration looks decorative | High | load-bearing acceptance tests and evidence matrix |
