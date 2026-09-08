# Chainlink CRE Confidential Evaluation

This package is isolated because CRE TypeScript compiles to a constrained WASM/QuickJS runtime.

P3 implements an authenticated HTTP trigger whose callback is registered with the official SDK's `handlerInTee`. The callback fetches one atomic secret containing the private P2 safety envelope and its 32-byte commitment blind, verifies the P1 bindings through the unchanged P2 evaluator, and emits only the P1 result plus a digest binding it to the exact supplied synthetic behavior.

## Boundary

Public input contains the versioned P1 request, build descriptor, synthetic trace suite, explicit evaluation timestamp, provenance label, and `rovaulta.digest.cre-behavior-input/v1` SHA-256 digest over P1 canonical bytes. The HTTP signer configuration is also public. Scenario IDs must be public for exact trace-to-scenario binding; the demo uses readable synthetic names, while production inputs should use opaque IDs if scenario taxonomy is sensitive.

The secret `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT` contains the versioned full private envelope and lowercase 64-hex-character blind. It is fetched only inside the TEE callback from namespace `main`, using a compile-time fixed ID. The handler makes no ordinary capability calls.

Success discloses only the unchanged P1 `EvaluationResult`, behavior-input digest, and `SYNTHETIC_CALLER_SUPPLIED` marker. It omits the envelope, geometry, rules, thresholds, blind, internal scenario evidence, violation details/count, and confidential diagnostics. Errors use fixed redacted codes. The handler has no logging or DON crossover.

## Local verification

```powershell
bun --filter '@rovaulta/chainlink-cre' cre:fixtures
bun --filter '@rovaulta/chainlink-cre' test
bun --filter '@rovaulta/chainlink-cre' typecheck
bun --filter '@rovaulta/chainlink-cre' cre:compile
cre -R . -T staging-settings --non-interactive workflow build .\integrations\chainlink-cre
```

The fixture command creates a fresh random local simulation blind, rebinds two public payloads to its commitment, and writes two ignored local env files. Never commit those env files or replace them with real secrets in source control. Regenerating intentionally changes the public commitment, so evidence must be recaptured after each generation. The synthetic envelope is source-visible test data, not a production secret. Replace the demo-only authorized address in `config.staging.json` before any deployment.

Authenticated simulations are:

```powershell
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\corrected.public.json
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-tampered.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json
```

All three commands completed through the authenticated official simulator: unsafe `HOLD`, corrected `CLEAR`, and tampered commitment `REJECT`. See the [redacted evidence](../../docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md).

These are local, single-node CRE simulations—not deployment, a hardware TEE, live DON consensus, production Vault custody, or remote robot attestation. The behavior digest binds supplied data; it cannot prove which artifact or physical robot produced it.
