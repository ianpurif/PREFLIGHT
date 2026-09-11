# Chainlink CRE Confidential Evaluation

This package is isolated because CRE TypeScript compiles to a constrained WASM/QuickJS runtime.

P3 implements an authenticated HTTP trigger whose callback is registered with the official SDK's `handlerInTee`. The callback fetches one atomic, site-bound secret containing the private P2 safety envelope and its 32-byte commitment blind, verifies the P1 bindings through the unchanged P2 evaluator, and emits only the P1 result plus a digest binding it to the exact supplied synthetic behavior.

## Boundary

Public input contains the versioned P1 request, build descriptor, synthetic trace suite, explicit evaluation timestamp, provenance label, and `rovaulta.digest.cre-behavior-input/v1` SHA-256 digest over P1 canonical bytes. The HTTP signer configuration is also public. Scenario IDs must be public for exact trace-to-scenario binding; the demo uses readable synthetic names, while production inputs should use opaque IDs if scenario taxonomy is sensitive.

The secret selector is a request-scoped value of the form `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_<base32-site-id>`, where the lowercase unpadded base32 component is an injective encoding of the canonical site identifier. Each selector must be provisioned by the operator in the CRE `main` namespace with the versioned full private envelope and lowercase 64-hex-character blind. Deployed workflow configuration requires the selector and verifies it against the request's exact site; the legacy fixed selector is retained only for old simulation payloads that omit the new field. It is fetched only inside the TEE callback. A request-scoped lookup never falls back to another selector. The handler makes no outbound capability call during evaluation unless the optional HTTPS result-delivery URL is configured; that delivery contains only the minimal public result.

Success discloses only the unchanged P1 `EvaluationResult`, behavior-input digest, and `SYNTHETIC_CALLER_SUPPLIED` marker. It omits the envelope, geometry, rules, thresholds, blind, internal scenario evidence, violation details/count, and confidential diagnostics. Errors use fixed redacted codes. The handler has no logging or DON crossover.

## Local verification

```powershell
bun --filter '@rovaulta/chainlink-cre' cre:fixtures
bun --filter '@rovaulta/chainlink-cre' test
bun --filter '@rovaulta/chainlink-cre' typecheck
bun --filter '@rovaulta/chainlink-cre' cre:compile
cre -R . -T staging-settings --non-interactive workflow build .\integrations\chainlink-cre
```

The fixture command creates a fresh random local simulation blind, rebinds two public payloads to its commitment, includes the exact site-bound selector, and writes two ignored local env files. Never commit those env files or replace them with real secrets in source control. Regenerating intentionally changes the public commitment, so evidence must be recaptured after each generation. The synthetic envelope is source-visible test data, not a production secret.

Authenticated simulations are:

```powershell
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\corrected.public.json
cre -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-tampered.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json
```

The current-source runner records all three commands completing through the authenticated official
simulator: unsafe `HOLD`, corrected `CLEAR`, and tampered commitment `REJECT`. See the
[current redacted evidence](../../docs/compliance/evidence/chainlink-cre-p13-current-authenticated-simulation-2026-09-09.md)
and the [historical evidence](../../docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md).
Both are explicitly simulation-only; the current artifact includes the exact site-bound selector.

These are local, single-node CRE simulations—not deployment, a hardware TEE, live DON consensus, production Vault custody, or remote robot attestation. The behavior digest binds supplied data; it cannot prove which artifact or physical robot produced it.

### Reproducible redacted evidence runner

The operator runner regenerates ignored payloads/secrets, runs the same workflow three times, extracts only the public response from each real CLI execution, validates it through the Rovaulta request/callback parsers and exact P1 bindings, and writes a redacted `evidence.json`. It never stores raw CLI output or confidential values. The official CLI must already be installed and authenticated with `cre login`; missing CLI/authentication fails closed.

```powershell
bun run --cwd apps/api evidence:cre-simulation
```

The runner records the command, CLI version, execution identifier and workflow/binary identity when the CLI reports them, public bindings, `HOLD`/`CLEAR`/`REJECT`, and the validation projection. Its default artifact is under ignored `.data/cre-simulation/`; set `ROVAULTA_CRE_SIMULATION_OUTPUT_DIR` to an explicitly reviewed path when preparing a submission artifact. Confidential environment files are created in a private temporary directory outside that artifact and deleted after the run. Do not copy generated env files or raw terminal output into Git.

## Account application boundary

`apps/api/src/evaluation/cre-client.ts` is the server-side application adapter. It signs the
official `workflows.execute` JSON-RPC request, sends only public request data plus the site selector,
and rejects an asynchronous `ACCEPTED` response as `CRE_EVALUATION_PENDING` rather than pretending
that an evaluation is complete. The API persists that exact pending request and accepts a completed
result only through `/internal/cre/evaluation-result`, authenticated with the HMAC shared by
`ROVAULTA_CONFIDENTIAL_EVALUATION_RESULT_CALLBACK_SECRET` in CRE and
`ROVAULTA_CRE_RESULT_CALLBACK_SECRET` on the API. Configure `ROVAULTA_CRE_GATEWAY_URL`,
`CHAINLINK_CRE_WORKFLOW_ID`, and `CHAINLINK_CRE_TRIGGER_PRIVATE_KEY` only on the API server. The
current implementation intentionally has no local-evaluator fallback when these settings, the
request-scoped site secret, or the HTTPS callback transport are missing.

This account-facing gateway path is an optional live upgrade; it is not required for the Chainlink
prize because the authenticated CRE CLI simulation path above is the selected qualification path.

On 2026-09-11 the existing workflow was deployed to the Chainlink-hosted private registry with CRE
CLI v1.32.0 and reached `ACTIVE` under workflow ID
`0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144`. The first signed request sent
through the enterprise gateway returned HTTP 400 / JSON-RPC `-32600` (`Workflow not found`) before
an execution was created. This is a deployment record, not live execution evidence. The exact
redacted result is recorded in
[`chainlink-cre-p16-live-deployment-2026-09-11.md`](../../docs/compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md).

For a real account-created evaluation, the account API first creates the site and returns only its
public identifier/commitment. The facility operator must provision the matching private envelope
and blind under the exact selector emitted by `siteSecretId(siteId)` using the approved CRE Vault
process; the repository does not expose a policy-export route. The callback URL must be reachable
from CRE, and the HMAC value in `ROVAULTA_CONFIDENTIAL_EVALUATION_RESULT_CALLBACK_SECRET` must
match the API's `ROVAULTA_CRE_RESULT_CALLBACK_SECRET`. A missing selector, callback, workflow ID,
or trigger signer blocks only this optional live account path, never the selected simulation
qualification path and never a reason to use the local P2 evaluator for production requests.
