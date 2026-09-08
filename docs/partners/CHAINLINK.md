# Chainlink CRE Integration Contract

## Prize target
**Best Confidential Workflow** (From Scratch).

## P3 implementation
- CRE SDK 1.19.1 registers an authenticated HTTP trigger with the real TypeScript `handlerInTee` API.
- The handler requires Nitro/us-west-2 and fetches exactly one site-bound `main` secret selected by
  the public request. A request-scoped selector never falls back to another site's secret. The
  normal evaluation path has no outbound capability; when an operator configures result delivery it
  uses only the official HTTP capability to POST the already-minimal public result.
- The full P2 private safety envelope and 32-byte commitment blind are decoded from that secret inside the callback and materially determine the result.
- The callback invokes the existing `@rovaulta/simulation-core` evaluator; it does not duplicate verdict logic.
- The internal report remains TEE-local. Only the P1 result, canonical behavior-input digest, and synthetic-provenance marker leave the callback; errors are fixed and redacted.
- SDK compilation and CRE CLI v1.32.0 `workflow build` succeed. Authenticated `workflow simulate` produces unsafe `HOLD`, corrected `CLEAR`, and tampered commitment `REJECT` with one CLI-reported simulation binary/config identity.

The account-facing API now has an official CRE HTTP JSON-RPC/JWT client boundary in
`apps/api/src/evaluation/cre-client.ts`. It sends only the public request and a site-derived secret
selector; it never sends the envelope or commitment blind. The gateway's production response is
asynchronous (`ACCEPTED` plus an execution ID). `apps/api/src/application/store.ts` persists the
exact pending request, and an optional TEE callback completes it only after a canonical HMAC over
the public result verifies. The callback endpoint checks the exact evaluation/site/robot/build and
behavior digest, is idempotent, and returns no private material. The API never falls back to the
in-process P2 evaluator on the qualifying application path.

## Rovaulta-specific load-bearing role
The facility's private safety envelope is the sensitive input. The public result must reveal the minimum useful clearance artifact, not the envelope.

## Engineering constraints
- Keep CRE code in `integrations/chainlink-cre`.
- The TypeScript CRE environment compiles to WASM/QuickJS; do not assume Node built-ins or browser globals.
- Keep a CRE-specific `tsconfig.json` with `types: []`, `ESNext`, Bundler resolution, strict/noEmit.
- Never route private envelope values through ordinary app logs just to reach the TEE.

## Evidence state
- source/config/tests and exact confidential-handler path: locally verified
- SDK compiler and official CRE CLI build: passed
- unsafe/corrected/tampered CRE simulations: authenticated, executed, and redacted evidence captured
- live workflow deployment, DON/Vault/Nitro execution, and attestation: not claimed

Evidence: [`chainlink-cre-p3-authenticated-simulation-2026-09-06.md`](../compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md).

The trace suite is explicitly synthetic and caller-supplied. Its canonical digest binds output to input but does not authenticate a robot, software artifact, or model execution.

Normal account evaluation therefore has two separate operator requirements: provision each site's
versioned secret in the CRE `main` namespace using the selector emitted by the API, provision the
callback HMAC secret as `ROVAULTA_CONFIDENTIAL_EVALUATION_RESULT_CALLBACK_SECRET`, and configure
the workflow's HTTPS `resultDeliveryUrl` (plus `ROVAULTA_CRE_RESULT_CALLBACK_SECRET` on the API).
The current environment has neither a deployed workflow gateway configuration nor result-delivery
evidence, so the normal account path remains explicitly pending/unavailable rather than claiming a
completed live evaluation.

The captured runtime blind was generated fresh into ignored local files and is not the source-visible P2 unit-test blind. The demo envelope itself is synthetic source-visible test data, so this is confidential-path/non-disclosure evidence rather than proof that repository readers could not know the demo rules.

## Official resources
- https://docs.chain.link/cre
- https://github.com/smartcontractkit/cre-sdk-typescript
- https://github.com/smartcontractkit/chainlink-agent-skills
