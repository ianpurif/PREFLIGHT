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
- SDK compilation and CRE CLI v1.32.0 `workflow build` succeed. The current-source authenticated
  `workflow simulate` artifact records unsafe `HOLD`, corrected `CLEAR`, and tampered commitment
  `REJECT` with the mandatory site-bound selector. The non-verbose run did not report a simulation
  binary/config identity; it did return process success for all three workflow executions.

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
- historical unsafe/corrected/tampered CRE simulations: authenticated, executed, and redacted evidence captured
- current-source unsafe/corrected/tampered CRE simulations: authenticated, executed, and redacted
  evidence captured by the P13 runner
- `apps/api/scripts/cre-simulation-evidence.ts` reproduces those three cases, validates only the
  current selector-bound public result with Rovaulta's strict parser, and fails closed when the
  CLI/auth context is absent
- a real private-registry deployment is now recorded, but the first enterprise-gateway trigger
  returned a workflow-lookup error before execution; no live DON/Vault/Nitro verdict or callback is
  claimed

Evidence: [`chainlink-cre-p13-current-authenticated-simulation-2026-09-09.md`](../compliance/evidence/chainlink-cre-p13-current-authenticated-simulation-2026-09-09.md), plus the historical [`chainlink-cre-p3-authenticated-simulation-2026-09-06.md`](../compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md).

The trace suite is explicitly synthetic and caller-supplied. Its canonical digest binds output to input but does not authenticate a robot, software artifact, or model execution.

The selected Chainlink qualification path is the authenticated official CRE CLI simulation. It runs
the real `handlerInTee` workflow against the Rovaulta unsafe, corrected, and tampered protected-input
cases, then validates the public response through the same versioned protocol boundary used by the
application. The committed evidence records `HOLD`, `CLEAR`, and `REJECT` without private envelope,
blind, credentials, or internal report data. Live deployment is not required and is not claimed.

The normal account gateway remains a separate optional upgrade. It requires each site's versioned
secret in CRE `main`, the callback HMAC secret, an HTTPS result-delivery URL, and API gateway/workflow
signer configuration. Missing live configuration keeps that path explicitly unavailable; it does not
weaken or block the simulation qualification path.

### P16 live deployment boundary

On 2026-09-11 the existing workflow was deployed to the Chainlink-hosted private registry with the
official CRE CLI v1.32.0. The deployment is `ACTIVE` under workflow ID
`0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144`. A normal account evaluation was
then sent to the documented private enterprise gateway. The gateway returned HTTP 400 / JSON-RPC
`-32600` (`Workflow not found`) before creating an execution, and `cre execution list` remained
empty. This is recorded as a deployment pass plus a live-execution blocker, not as live CRE evidence.
The exact redacted command/result is in
[`chainlink-cre-p16-live-deployment-2026-09-11.md`](../compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md).

The API now includes bounded public gateway diagnostics (HTTP status, provider code, and a capped
provider message) while continuing to fail closed; signed request material and confidential inputs
are never returned. The simulation executor and P13 evidence remain unchanged.

The follow-up control-plane check with CRE CLI v1.33.0 returned the same `ACTIVE` private workflow
and exact ID. Hashing the tracked staging configuration reproduced the deployed binary hash
`e3b7053930fc7f38b7214e503c4bc411c27f1e7b50d98d93651193c59bb8004e`, config hash
`1977468021a54d7aba103f15adfb1873479a60acaa4bb84e3830249162e92478`, and workflow ID. The
derived trigger signer matched the public authorized key. A separate minimal signed request to
`https://01.enterprise-gateway.zone-a.cre.chain.link/` still returned HTTP 400 / JSON-RPC
`-32600` (`Workflow not found`) and no execution ID; this rules out local workflow-ID/config drift
but does not establish live CRE execution. The current site-bound Vault selector still requires
interactive private-registry authorization, and the deployed config has no HTTPS result callback;
neither secret provisioning nor live callback completion is claimed.

### Account-owned official CLI simulation mode

The normal API can also run with `ROVAULTA_CRE_EXECUTION_MODE=simulation` when an operator needs a
real account-owned evaluation without a deployed CRE gateway. This is not a second evaluator: the
route constructs the public request from persisted account records, invokes the unchanged official
CLI workflow and `handlerInTee`, and accepts the result only after the existing public callback
parser, behavior-input digest check, and exact P1 binding validation succeed. The executor creates
a short-lived workflow configuration with a `secretsNames` entry for the exact site selector and
supplies the encrypted policy's versioned envelope/blind through the CLI `-e` file. Temporary
workflow, mapping, payload, and secret files are deleted after the command. The stored evaluation
records `official-cre-cli-simulation` and the CLI version so P12 can distinguish this provenance
from live CRE/DON execution. The executor checks `cre -v` and `cre whoami` before simulation and
fails closed if the authenticated CLI session is unavailable. One account-owned simulated `CLEAR`
has now been persisted through this path; no live gateway result, Sepolia clearance, or Graph match
is claimed.

P13 adds a two-phase operator path. First, `bun run --cwd apps/api p13:account-evaluation` with
`ROVAULTA_P13_SETUP_ONLY=true` uses only the normal authenticated HTTP routes and prints public
account/site/robot/build IDs. Then `bun run --cwd apps/api p13:provision-site-secret` reads the
encrypted policy through the local application store, creates a temporary `secretsNames` mapping,
and supplies the exact versioned site envelope/blind to the official CRE CLI in memory. The value
is never sent over HTTP, logged, or written to evidence; the temporary mapping is removed. The
final account-evaluation run reuses those IDs, submits the existing CRE-backed route, and writes
an allowlisted public result only if the signed callback completes. It does not create a second
evaluation authority. This account path is not used as Chainlink prize evidence; the authenticated
CLI simulation artifact above is the qualification record.

The captured runtime blind was generated fresh into ignored local files and is not the source-visible P2 unit-test blind. The demo envelope itself is synthetic source-visible test data, so this is confidential-path/non-disclosure evidence rather than proof that repository readers could not know the demo rules.

## Official resources
- https://docs.chain.link/cre
- https://github.com/smartcontractkit/cre-sdk-typescript
- https://github.com/smartcontractkit/chainlink-agent-skills
