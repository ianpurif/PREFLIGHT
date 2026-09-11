# P5–P10 Ledger, Partner Agent + Product Qualification Verification Report

**Date:** 2026-09-09 (P9 implementation began 2026-09-08; earlier evidence dates remain attached to their artifacts)

**Scope:** P5 software, partial P5.1 Speculos evidence, P5.2 AI deployment-agent closure, P6
judge-facing digital twin, P7 deterministic demo reliability, P8 account product flow, P9
Chainlink boundaries, P10 asynchronous CRE result completion, P11 The Graph qualification, and P13
authenticated CRE simulation qualification; P1–P4 regression-checked.

**Status:** The Chainlink qualification path is complete through committed authenticated CRE CLI
simulation evidence. The normal account gateway still fails closed unless deployed CRE gateway/
result transport and request-scoped secrets are configured. P13.1 now adds an explicit account-owned
official CLI simulation mode. The clean-checkout setup-only path was exercised with a newly generated
test account and created valid account/site/robot/build records. The explicit authenticated CRE CLI
simulation mode then persisted one account-owned `CLEAR`; no live gateway result, Sepolia
transaction, Graph match, or Ledger approval is claimed from this checkout. The Graph live response,
external model execution, authenticated Clear Signing A/B/E/F, and physical Ledger evidence remain
unclaimed.

## P6 judge-facing dashboard result

The root web route now provides one deterministic judge flow over the existing P2 fixture:

- Build A renders `HOLD`, three public violation reasons, and a route projected from the
  caller-supplied behavior trace.
- Build B renders `CLEAR`, the brief-required `487 scenarios` public headline, and `0 critical
  violations`. The dashboard explicitly states that the authoritative bounded P2 report contains
  three committed templates; the headline is a judge-facing brief metric, not a change to P2's
  evaluator or a live facility claim.
- Mutating Build B recomputes its canonical build digest and renders `BLOCKED` /
  `CLEARANCE_BINDING_MISMATCH`. The CRE panel says `NOT RUN / BINDING MISMATCH`; no Ledger request
  is offered.
- The Chainlink card uses the committed P3 authenticated-simulation outcomes as a recorded public
  evidence projection and states that no browser CRE execution or live DON deployment is claimed.
  Private envelope values, blind, rules, thresholds, geometry, and internal reports are absent from
  the server-to-browser projection and rendered output.
- A successful `LEDGER_APPROVAL_REQUIRED` response from the existing agent API is handed through
  session storage to `/p5-ledger`; the browser test verifies the handoff while keeping
  authorization pending. Provider failure remains visibly unavailable. The panel exposes public
  site/robot/build/evaluation bindings and shows clearance/expiry/intent fields only when an actual
  prepared response supplies them; fixture-only states say that no live clearance record was issued.
  The optional `NEXT_PUBLIC_P6_SIGNER_ADDRESS` setting is documented as a public address only; no
  private key is accepted by the web app.
- The Ledger panel labels Speculos as a development/test simulator and states that physical-device
  evidence is not demonstrated. The Sepolia registry link is the deployed address already recorded
  by P4; no clearance transaction is invented.

The dashboard is explanatory only. P2 remains the sole local evaluator, P5 remains the release
authority, and P6 does not activate a robot.

## P7 deterministic demo reliability result

`bun run demo:setup` resets only the ignored `.data/rovaulta-demo` directory, writes a public
manifest, and runs the fixed-clock offline rehearsal. `bun run demo:reset` is idempotent; it does
not touch source fixtures, deployment metadata, evidence, environment files, or the normal P5
SQLite store. `bun run demo:run` repeats the prepared rehearsal and writes the same public trace.

The authoritative P7 fixture reuses `@rovaulta/simulation-core` for the P2 verdict and the
existing P5.2 `DeploymentAgent` plus `ReleaseService` for the host-owned proposal boundary. A
demo-only nonce factory, fixed registry block/timestamp, fixed attempt IDs, and fixed clock make
the local prepared digest reproducible; the production nonce default remains cryptographically
random. Public output includes only scenario, exact public site/robot/build bindings, digests,
clearance/intent metadata, tool order, and Ledger status.

- A: P2 `HOLD`; agent decision `HOLD`; Ledger `NOT_REQUESTED`.
- B: P2 `CLEAR`; local deterministic clearance; agent `LEDGER_APPROVAL_REQUIRED`; exact intent
  prepared; Ledger `AWAITING_HUMAN` and handoff reachable, with no authorization.
- C: deterministic Build B ID/artifact mutation changes the canonical digest; the corrected
  baseline clearance is retained; agent returns `BLOCKED / CLEARANCE_BINDING_MISMATCH`; CRE is
  marked not run and Ledger remains `NOT_REQUESTED`.

The rehearsal is explicitly not live Gemini, Sepolia, CRE, Ledger, or Speculos execution. The
dashboard reset clears the prepared session handoff on mount and scenario changes, and ignores a
late agent response after reset/mutation. P7 Playwright coverage runs the clean startup → reset →
A → reset → B/prepared handoff → reset → C → repeated C sequence without sleeps or developer paths.

## Implemented authorization boundary

The existing P1 deployment intent is versioned to `rovaulta.deployment-intent/v2` with one fixed
`ACTIVATE_DEPLOYMENT` action. P5 builds full EIP-712 typed data under domain `Rovaulta`, version
`1`, Sepolia `11155111`, and the deployed P4 registry
`0xFB270cc222efa8B5005AA097dD512Be2558dde65`. The deployment artifact is the single address/chain
source.

The message binds protocol/schema, exact site, robot, build ID/digest, clearance ID/digest,
environment, authorized signer, server nonce, integer issuance/expiry, and the canonical P1 intent
digest. Tests lock field order and a golden typed-data digest, and mutate every security field and
domain component.

Before a device request, deterministic API policy validates proposal/clearance identity, the public
signer allowlist, live chain/contract code, and every P4 binding at one explicit block. After
signature recovery it reauthorizes the signer and repeats the exact P4 read. Missing, non-`CLEAR`,
revoked, expired, inexact, wrong-chain/registry, RPC, persistence, malformed, substitution, and
TOCTOU states fail closed.

SQLite is the honest single-node offchain nonce authority. A 128-bit random nonce, canonical intent,
clearance, signer, typed-data digest, and precheck block are persisted under WAL + synchronous
`FULL`; one conditional update atomically consumes `ISSUED` exactly once. Concurrent consumers yield
one authorization. No browser-local or onchain replay claim is made.

## Ledger implementation

Pinned packages:

- `@ledgerhq/context-module` `2.5.0`
- `@ledgerhq/device-management-kit` `1.9.0`
- `@ledgerhq/device-transport-kit-web-hid` `1.2.4`
- `@ledgerhq/device-transport-kit-speculos` `1.2.1`
- `@ledgerhq/device-signer-kit-ethereum` `1.18.0`
- `@ledgerhq/speculos-device-controller` `0.3.0` (test only)
- `rxjs` `7.8.2`

The client-only adapter defaults to explicit WebHID discovery/connect and permits only an opt-in,
loopback Speculos transport in development/test; production configuration rejects it. It checks environment support, confirms the Ethereum address for
chain `11155111`, verifies the active Ethereum app, reconstructs the server-prepared full typed
data, and submits only `signTypedData`. The official
Ethereum Context Module must return the exact chain, registry, 15-field schema, declared filter
count, and every exact display-filter path before the signing command may proceed. Disconnect,
wrong app/browser, missing origin token, signer mismatch, refusal, generic failure, partial/mismatched
context, malformed output, and stale/tampered prepared requests are explicit failures. Physical
device refusal maps to `HUMAN_REJECTED` with no retry.

Signer Kit 1.18.0 exposes a legacy typed-data fallback step when Clear Signing context is
unavailable. P5 observes `SIGN_TYPED_DATA_LEGACY`, cancels immediately, and returns
`CLEAR_SIGNING_UNAVAILABLE`; output from that path is never accepted. The exported strict action
requires the context-resolution guard and a build-context → provide-context → sign-typed-data path,
so callers cannot omit the guard. Source/scaffold/dependency audits find no legacy LedgerJS,
hashed-EIP-712, personal-sign, raw-transaction, private-key, or frontend-boolean fallback.

`POST /release/prepare` remains the deterministic proposal authority. P5.2 invokes it through a
narrow model/tool controller; the browser route remains the separate manual operator evidence
harness and only place that may begin Ledger signing.

## P5.2 AI deployment-agent result

The API now contains a real provider boundary and official Gemini adapter using strict function
calls. Before the provider is invoked, the host matches the
whole deployment input against finite forms generated from the public catalog, resolves the exact
target, discards raw text, and provides only a canonical public projection. The host gives the model
exactly one next tool and enforces this sequence:

```text
resolve target → lock context → evaluation → clearance → release prepare → Ledger status
```

Only reference extraction accepts arguments, and those aliases must resolve to the same target the
host already resolved. Later calls cannot supply site/build substitutions, signer, chain, registry,
nonce, signature, typed data, or authorization. There is no generic HTTP, shell, filesystem,
registry-write, signing, or release-consumption tool. Provider failure, unexpected output, extra
arguments, skipped/repeated/reordered tools, a conflicting target, and non-catalog private-context
text fail closed before Ledger.

The public evaluation/clearance reads inform the trace, while the existing `ReleaseService.prepare`
remains the sole eligibility transition. Its live P4 check, exact bindings, authorized signer,
expiry, and durable server nonce override model claims. Successful local Build B preparation returns
`LEDGER_APPROVAL_REQUIRED`; unsafe A stops on `EVALUATION_HOLD`; mutated C reaches preparation and
returns `CLEARANCE_BINDING_MISMATCH`. Revoked and expired fixtures stop before Ledger.

The agent reports `AUTHORIZED` only after its exact prepared nonce has been consumed by the existing
P5 flow. A positive test signs the actual EIP-712 payload with a test-only key, exercises signature
recovery, signer authorization, P4 postcheck, and atomic nonce consumption, then reads the stored
`ReleaseAuthorization`. Model claims and old/foreign attempt identifiers cannot produce that state.

The local evidence runner records public A/B/C audit trails. A separate live read-only agent run
queried chain `11155111`, registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, block
`11653234`, and correctly returned `CLEARANCE_NOT_FOUND` for the deliberately unregistered existing
fixture. No live positive Build B clearance or chain write is claimed. The real provider adapter is
contract-tested; no external model call was made because no provider key/model was configured.
See `docs/compliance/evidence/p5.2-ai-deployment-agent-2026-09-07.md` and ADR-0008.

Independent adversarial review initially identified a conflicting-target and raw-text-disclosure
gap. The final controller now uses a finite catalog grammar, raw-text discard, canonical provider/
audit projection, and exact first-tool target comparison; targeted negative tests
cover a negated second target and a non-keyword private-context canary.

## P5.1 Speculos and ERC-7730 result

Ledger Speculos official device simulator `0.27.0` ran the checksum-verified public Ethereum
`1.22.3` Nano S Plus ELF (API level `26`). DMK discovered it through
`SPECULOS_HTTP_TRANSPORT`; the official device controller drove the actual emulator address review
and confirmation screens; the adapter returned a session tagged `speculos` /
`official-device-simulator`. Screenshots and hashes are recorded in
`docs/compliance/evidence/p5-ledger-speculos-partial-2026-09-07.md`.
The committed `evidence:speculos-smoke` script reproduces the DMK/controller address flow and public
session output.

The candidate descriptor was migrated from deprecated ERC-7730 v1 to active v2. Official
`erc7730 1.0.7` lint under CPython `3.12.14` reported one descriptor, no errors, and no warnings.
This is validation only, not registry acceptance or device display evidence.

The official registry Tester wrapper was run from revision
`0318f9a51ec4fc7ba4aed6de5e315c8884d1fe38` and exited `1` with
`Error: GATING_TOKEN environment variable not set`. The implicit direct-tester token, blind-signing
switches, and JavaScript signer mocks were not used as evidence. The Tester also discards its
signature, so Rovaulta separately lacks an application origin token plus accepted/served
descriptor or another official signature-preserving resolution path. Therefore the structured Clear
Signing display and Speculos A/B/E/F are not complete.

The real P5 `/release/prepare` boundary was executed using the public Speculos test address and
temporary test-only policy/state. C returned HTTP `403 CLEARANCE_BINDING_MISMATCH`; the
invalid/unregistered D variant queried the deployed Sepolia registry and returned HTTP `403
CLEARANCE_NOT_FOUND`. Neither invoked signing. Revoked/expired D remain deterministic test evidence
only.

On 2026-09-11 a clean Speculos process was restarted and `evidence:speculos-smoke` passed again.
The authenticated browser `/p5-ledger` route connected through the same official simulator path,
prepared an exact intent against Sepolia block `11679749`, and rejected a public build-digest
mutation as `MALFORMED_REQUEST` before any signer request. The valid path then returned
`CLEAR_SIGNING_UNAVAILABLE` because the Ledger-issued origin token and accepted/served descriptor
are not configured. No signature, `ReleaseAuthorization`, physical-device, or Secure Element
claim is made. The redacted trace is in
`docs/compliance/evidence/p5-ledger-speculos-browser-boundary-2026-09-11.md`. The standalone
presign harness was also rerun but returned `PERSISTENCE_UNAVAILABLE` without an authenticated
application store; it is not counted as a new C/D pass.

## P9 partner qualification slice

The normal account path now uses the partner boundaries rather than a fixture-only shortcut:

- `POST /evaluations` receives the private policy only inside the API boundary, builds a public
  versioned request, and calls `CreHttpEvaluationClient`. The client signs the official
  `workflows.execute` JSON-RPC/JWT request, includes a request-scoped site secret selector, sends no
  envelope or blind, validates the completed public result and exact bindings, and turns network,
  rejection, malformed-result, and asynchronous `ACCEPTED` responses into explicit fail-closed
  states. The P10 callback completes an accepted request only after its signed public result is
  verified. `buildServer` has no implicit P2 evaluator fallback.
- `integrations/the-graph/subgraph` contains a from-scratch Sepolia `RovaultaRegistry` event index.
  `TheGraphClearanceReader` queries only public fields by the exact clearance digest and checks the
  chain, registry, every binding, verdict, revocation, expiry, block number, and block hash.
- Account-backed `DeploymentAgent` resolution comes from the authenticated `ApplicationStore`
  evaluation/clearance pair. Its fixed tool order includes `getGraphContext`; unavailable,
  missing, revoked, expired, mismatched, or malformed Graph data blocks before the direct P5
  registry check. A `MATCHED` result is context only; P5 remains the final signer/nonce/authorization
  authority.
- The static catalog and local deterministic registry reader remain available only to the explicit
  development fixture path and tests. No browser-provided Graph response or model claim can select a
  different account target or authorize a release.

The focused local checks for this slice are:

```text
bun --cwd apps/api typecheck
bun --cwd apps/api test test/application-lifecycle.test.ts test/server.test.ts test/deployment-agent.test.ts test/graph-provider.test.ts test/cre-client.test.ts
```

Those tests use injected Graph/CRE responses and are not live partner evidence. The current
environment has no `ROVAULTA_CRE_GATEWAY_URL`, `CHAINLINK_CRE_WORKFLOW_ID`,
`CHAINLINK_CRE_TRIGGER_PRIVATE_KEY`, `THE_GRAPH_API_KEY`, `THE_GRAPH_SUBGRAPH_ID`, RPC endpoint, or
Gemini provider key/model. The required next external steps are documented in
`docs/partners/THE_GRAPH.md`, `docs/partners/CHAINLINK.md`, and
`docs/planning/exec-plans/P9-partner-bounty-qualification.md`.

## P10 asynchronous CRE result completion

The official CRE gateway returns account executions asynchronously. P10 now stores a pending
evaluation request before the gateway call, returns `202 PENDING`, and exposes a bounded browser
poll against the exact evaluation id. The optional workflow `resultDeliveryUrl` uses the CRE HTTP
capability only after the TEE has produced the minimal public response. It fetches a separate HMAC
secret inside the TEE and sends canonical callback JSON containing only the public P1 result.

The API callback verifies the HMAC in constant time, parses the versioned callback strictly, checks
the exact account site/robot/build/evaluation and behavior-input digest, and completes the record in
an SQLite transaction. Replaying the same signed callback returns `ALREADY_COMPLETED`; a conflicting
binding returns `409 CONFLICT`. Tests cover pending state, callback completion, replay, invalid
signature, binding mismatch, canonical serialization, and private-field leakage. This is local
transport evidence only: no deployed workflow, callback URL, request-scoped site secret, or live
account-created result exists in this environment.

## P13 authenticated CRE simulation qualification

The selected Chainlink qualification path is the official authenticated CRE CLI simulator, not a live
DON deployment. The committed artifact
[`chainlink-cre-p3-authenticated-simulation-2026-09-06.md`](docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md)
records three real executions of the existing Rovaulta workflow: unsafe `HOLD`, corrected `CLEAR`,
and tampered confidential input `REJECT`. The workflow uses the real `handlerInTee` registration,
fetches the site-bound confidential envelope/blind inside the confidential callback, calls the
existing deterministic evaluator, and emits only the bounded public result.

This committed artifact is historical evidence from before the current mandatory site-selector
boundary. It proves the authenticated confidential path at that revision, but it is not presented as
a fresh current-source run.

`apps/api/scripts/cre-simulation-evidence.ts` is now the reproducible operator path. It regenerates
ignored site-bound inputs, runs all three official CLI commands, extracts only the public response,
validates it with the strict Rovaulta request/callback parsers and exact bindings, checks that the
confidential value is absent from CLI output, and writes only a redacted evidence JSON. The command
fails closed when the official CLI or authenticated context is missing; it never substitutes P2 or
creates a success artifact. The official `cre` CLI is installed in WSL for operator use. The
account-mode executor now checks `cre whoami` before invoking the workflow. The current WSL probe
stops there with the external error `authentication failed: unable to retrieve organization info`
(`token refresh failed`, request timeout); no account result or evidence artifact was created.
Live workflow deployment, DON consensus, production Vault custody, and hardware TEE attestation
are not claimed.

Focused checks for this change:

```text
bun --filter '@rovaulta/chainlink-cre' test
bun --filter '@rovaulta/chainlink-cre' typecheck
bun --filter '@rovaulta/api' test -- cre-simulation-evidence.test.ts
bun run --cwd apps/api evidence:cre-simulation  # requires the authenticated operator CRE context
```

## P11 The Graph qualification result

The Graph integration now has a reproducible Sepolia subgraph under
`integrations/the-graph/subgraph/`, pinned Graph CLI/AssemblyScript tooling, and an operator-only
deployment/query path. The manifest indexes only public `RovaultaRegistry` clearance and revocation
events. The API sends the exact clearance digest to the Graph Gateway and validates public entity
identity, exact site/robot/build/evaluation/safety/evaluator bindings, verdict, issuer, expiry,
revocation, chain/registry identity, and block metadata. Private envelopes, blinds, rules,
thresholds, traces, credentials, and model output never enter the subgraph or browser projection.

For an authenticated account target, the deployment agent requires `MATCHED` Graph context before
the existing direct P5 Sepolia check and Ledger-required handoff. `NOT_FOUND`, `REVOKED`, `EXPIRED`,
`MISMATCH`, malformed data, provider errors, missing credentials, and missing subgraph configuration
all fail closed. The focused Graph/provider and agent tests pass with injected responses, but those
tests are local validation rather than provider evidence. `THE_GRAPH_API_KEY`,
`THE_GRAPH_SUBGRAPH_ID`, and `ROVAULTA_P11_ACCOUNT_ID` are unset in this environment, so no hosted
subgraph identity, live Gateway response, or account-created trace is claimed. Start Fresh pool
eligibility also remains unverified; see
`docs/compliance/evidence/p11-the-graph-qualification-2026-09-09.md`.

## Verification results

- Ledger gate: 18/18 tests, including adapter lifecycle, exact transport selection/discovery,
  development/test-only loopback Speculos configuration and production rejection, shared signing path, missing origin token, signer mismatch,
  refusal, failure, malformed output, exact/partial runtime descriptor resolution, required context
  steps, and legacy-fallback cancellation.
- Chain client: 12/12 tests for deployed-domain EIP-712, all field/domain mutations, signature
  recovery, exact P4 transport, positive pinned-block reader/ABI behavior, chain/registry, verdict,
  revocation, and expiry boundaries.
- API: 67/67 tests across 16 files, including the account lifecycle/CRE fail-closed path, official
  CLI simulation cleanup/provenance, strict P13 setup-file/template validation and owner-only mode
  checks, operator credential-bound and stale-resource-ID validation, Graph provider binding and
  outage cases, P5/P5.2 authority boundaries, provider schema failures, and deterministic P7
  fixture regression.
- Domain: 31/31; simulation core: 60/60; Chainlink CRE: 32/32; chain client: 12/12; Ledger gate:
  18/18; web: 2/2.
- Full TypeScript total: 222 tests, 3,030 assertions, zero failures.
- `bun run lint`: pass; Biome checks 173 files with 27 existing CSS specificity warnings and no
  errors.
- `bun run typecheck`: pass; 7/7 Turbo tasks.
- `bun run test`: pass; 12/12 Turbo tasks.
- `bun run test`: pass; 12/12 Turbo tasks, confirming 222 tests and 3,030 assertions after the
  setup-flow, operator-credential, and stale-resource-ID preflight changes.
- `bun run build`: pass; 8/8 tasks including the pinned The Graph subgraph build; Next.js
  production build includes static `/` and `/p5-ledger`.
- `bun run --cwd apps/web test`: pass; 2 P6 projection/mutation tests, 9 assertions.
- `bun run test:e2e`: pass; 10 browser tests, including the five P6 states, the account flow's
  truthful CRE-unavailable stop, and the P7 clean startup → reset → A → reset → B/prepared handoff
  → reset → C/repeated C flow plus a late-response race guard.
- `bun run demo:setup`, two idempotent `bun run demo:reset` calls, and repeated `bun run demo:run`:
  pass; generated public trace is byte-for-byte stable. Local timings were approximately `0.43s`
  for setup and `0.37s` for a repeat run.
- Client bundle leakage scan: pass; no confidential fixture markers in `apps/web/.next/static/chunks`.
- Windows `forge test`: pass; 24 registry unit/fuzz tests. The WSL `bun run contracts:test` command
  remains environment-blocked because `forge` is not installed in WSL.
- `bun run verify:scaffold`: pass; 4/4 tests with positive P5.2/P6/P7/P9 partner-boundary
  assertions and the non-authoritative judge guard intact.
- `bun audit`: pass after top-level compatible `uuid` `11.1.1` and `ws` `8.21.0` overrides; 212
  packages checked, no known vulnerabilities.
- `git diff --check`: pass.
- WSL `bun run verify`: reached the final contract step after lint, typecheck, package tests, and
  build passed, then stopped with `forge: command not found`; the Windows Foundry run above passes.

The read-only live Sepolia P5 client confirmed chain, registry code, and exact-reader behavior at
block `11645707`; a deliberately unregistered local fixture returned `exists=false` and
`exactMatch=false`. No demo clearance transaction was created. See
`docs/compliance/evidence/p5-ledger-release-gate-software-2026-09-06.md`.

## Speculos A–F and physical Ledger results

- A — valid exact clearance + Speculos/physical approval: **not run**
- B — Speculos/physical rejection: **not run**
- C — mutated build blocked before signer: **pass**, real API HTTP `403 CLEARANCE_BINDING_MISMATCH`
- D — invalid/unregistered clearance blocked before signer: **pass**, live Sepolia HTTP `403 CLEARANCE_NOT_FOUND`
- E — consumed signature replay: local durable replay test passes; Speculos/physical artifact pending
- F — signed-intent tampering: local signature/binding tests pass; Speculos/physical artifact pending

The Speculos evidence identifies only the emulated Nano S Plus, Ethereum app `1.22.3`, and public
derived signer. No physical Ledger model, firmware, signature, approval, or signature hash is
claimed. `NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN` is unset, and the validated ERC-7730 v2 file is only a
candidate—not evidence of Ledger acceptance/serving for this origin. P5 fails closed without the
required context and an authorized signer. Blind signing was not enabled.

The Speculos signer is deterministically derived public test identity, not custody. Production
rejects the Speculos transport, and this address plus any related clearance/nonce state must never
be retained in production policy.

## P13 account-created CRE evaluation

The P13 account command is:

```text
bun run --cwd apps/api p13:account-evaluation
```

It supports setup-only mode, which composes the existing authenticated HTTP routes and prints only
public account/site/robot/build IDs. Evaluation mode can reuse those IDs and never opens the
application database or calls the local P2 evaluator. A completed response is projected through an
allowlist before optional evidence output. The companion provisioning command is:

```text
bun run --cwd apps/api p13:provision-site-secret
```

It reads the encrypted site policy through the trusted local `ApplicationStore`, supplies the exact
versioned secret to `cre secrets create` through an in-memory environment variable, and removes its
temporary mapping. It never prints or writes the envelope/blind.

Before the setup fix, the command was also run with the repository's existing `.env` and failed
closed at the API password-length boundary; no record was created by that attempt:

```json
{"status":"BLOCKED","error":"INVALID_INPUT (400): Password must be 12-256 characters"}
```

After the operator preflight guard, the same unchanged ignored `.env` fails before any API request
with an actionable configuration error and still does not print the credential:

```json
{"status":"BLOCKED","error":"ROVAULTA_P13_PASSWORD must be 12-256 characters; update the ignored root .env or export a valid value"}
```

The clean-checkout template flow was then exercised with an unprinted generated test credential.
`p13:setup-template` produced the ignored `.data/p13-setup.json`, and setup-only completed through
the normal authenticated HTTP routes:

```json
{
  "status": "SETUP_COMPLETE",
  "execution": "normal account application path",
  "accountId": "account:a785740e7950d53c1c939c700b9cdc5a",
  "siteId": "site:f8051b93dffb528d23336bbe00a2e6aa",
  "robotId": "robot:29c487f4d2010e9fd9ec78e2a9fecf77",
  "buildId": "robot-build:9bb450bf2066d335685b9de52bf430ca"
}
```

Only public IDs are recorded for the setup-only run above. The same account-owned resources were
then evaluated with `ROVAULTA_CRE_EXECUTION_MODE=simulation` and the official authenticated CRE
CLI. The normal API persisted this public result after strict callback, behavior-digest, and exact-
binding validation:

```json
{
  "status": "CLEAR",
  "executionMode": "official-cre-cli-simulation",
  "creCliVersion": "1.32.0",
  "accountId": "account:3dbe64397ce11e131f7286277d93294d",
  "siteId": "site:192e49ae56c0abf18cd827706b909ce3",
  "robotId": "robot:ce87964de66e14684b1b3c68a7a4b1be",
  "buildId": "robot-build:075049b64bf7dd982705cac9a40d0f27",
  "evaluationId": "evaluation:1a89c0ad9a5e0672c086ad58346595ee",
  "robotBuildDigest": "sha256:c496d3fc98485bcbdef70658f36449da918afc3ec0e56610dff5eeab7bea4a3e",
  "safetyEnvelopeCommitment": "sha256:69af11588f15c0c6cf94087c41f2e03c051bfab0209158d8669013b2c53b7369",
  "evaluatorVersion": "evaluator-version:warehouse-rules-v1",
  "evaluationInputsDigest": "sha256:a49c510f57d4253bbf7dd25d558d62352f8d1ec40119f20bd1349ef5b1e675ea"
}
```

The CLI simulation was not live CRE/DON execution and did not create a Sepolia clearance. The next
operator action is to pass this stored `CLEAR` to the existing P12 command only after its explicit
registrar, clearance, and confirmation inputs are supplied.

## P13.1 account-owned official CLI simulation mode

The normal API entrypoint now selects the official CLI executor only when
`ROVAULTA_CRE_EXECUTION_MODE=simulation` is explicitly set; gateway mode remains the default. The
executor constructs the public request from the authenticated account's persisted site, robot,
build, and traces, creates a short-lived workflow folder with the exact site selector in
`secretsNames`, writes the versioned envelope/blind only to a temporary CRE `-e` file, and invokes
the unchanged P13 workflow. It accepts no P2 fallback, fabricated result, browser verdict, or
manual callback. The public result passes the existing callback parser, behavior-input digest, and
exact P1 binding checks before `ApplicationStore` persists `executionMode:
official-cre-cli-simulation` and the CLI version. Temporary workflow, mapping, payload, and secret
material are removed on every exit path. The executor verifies both `cre -v` and `cre whoami` and
fails closed before workflow execution when the authenticated session is unavailable. A real
operator run persisted the public `CLEAR` shown above; the simulation provenance is explicitly not
live CRE/DON execution and does not itself write Sepolia.

## Dependency and secret review

The final dependency graph contains no `@ledgerhq/hw-app-*` or `@ledgerhq/hw-transport-*` package.
`bun audit fix` could not update SDK-pinned vulnerable transitive versions within their declared
ranges, so compatible top-level Bun overrides were applied and the Ledger tests/browser build were
rerun; `bun audit` then reported zero vulnerabilities.

The tracked/untracked working tree and Git history were scanned without printing candidate values
for seed/recovery phrases, private keys, PIN/credential assignments, Ledger origin tokens, RPC or
Etherscan credentials, CRE secrets, and envelope blinds. No leak was found. `gitleaks` was not
installed, so this result uses filename/history checks, assignment/high-entropy regex checks, Git
ignore verification, and targeted source/dependency scans. `.env`, SQLite data, Foundry output, and
CRE local secrets remain ignored.

## Scope and unresolved risk

No P7 robot activation, autonomous release execution, Key Ring, new contract, automatic CRE-to-EVM
delivery, or private-key custody was added. P6's digital twin is explanatory only. The P5.2 agent
can inspect and prepare only. The `/p5-ledger` page remains an explicit WebHID/Speculos evidence
harness.

P5 physical partner evidence cannot be called complete until legitimate official Tester access plus a signature-preserving
origin/accepted-descriptor path permit Speculos A/B/E/F, and the separate device prerequisites
permit physical A–F. P5.2 closes the software agent/product-fit gap, but an external provider run
still needs an approved key/model and is not fabricated here. Even after hardware closure, SQLite
protects one coordinated API database only. Database loss/split replicas, Sepolia reorgs, and
clearance revocation after authorization but before a future P6 action require operational/finality
policy. P5 does not prove physical robot safety, trace provenance, registrar honesty, or live CRE
delivery.

## 2026-09-09 — P14 live bounty evidence update

The existing account-owned `official-cre-cli-simulation` `CLEAR` was consumed by the unchanged P12
operator path. Ethereum Sepolia transaction
`0xa1854cef882006928b312d418372e861f6470125beaa23c97708a8c8b077e4a1` confirmed at block
`11668773`; both `ClearanceRecorded` and `ClearanceBindingsRecorded` were present and exact registry
readback passed. The public-only result is recorded in
`docs/compliance/evidence/p14-live-bounty-evidence-2026-09-09.md`.

The deployed `rovaulta-registry` v0.1.0 Subgraph Studio endpoint returned the exact public entity,
and `TheGraphClearanceReader` returned `MATCHED` after validating all bindings, issuer, timestamps,
verdict, revocation, chain, registry, and block metadata. This is live Studio evidence, not Gateway
or decentralized-network evidence. The direct live query was also captured by the Graph evidence
script; no entity was manually inserted.

The account-agent evidence command stopped fail-closed before model execution because
`GEMINI_API_KEY` is absent. No model output, `LEDGER_APPROVAL_REQUIRED`
handoff, Ledger signature, physical approval, Gateway publication, or live CRE/DON execution is
claimed. The Ledger adapter test suite remains green; physical and official Tester evidence remain
external prerequisites.

## 2026-09-10 — P15 live Gemini account-agent update

The previous provider-blocked state was closed without changing the Chainlink, Graph, Ledger, or
evaluation architecture. The real `apps/api evidence:p11-graph` command used the account-owned
Sepolia clearance and the hosted Subgraph Studio endpoint, then made seven host-validated Gemini
function calls. The sequence reached `MATCHED`, `ELIGIBLE`, `PREPARED`, and
`LEDGER_APPROVAL_REQUIRED`; no signing or authorization capability was exposed to the model. The
public-only details are in `docs/compliance/evidence/p15-live-gemini-graph-ledger-boundary-2026-09-10.md`.

This API key rejects the repository default `gemini-2.5-flash` as unavailable to new users, so the
run supplied the explicit server-only `GEMINI_MODEL=gemini-3.5-flash` override. This is a real
provider execution, not a mock or fallback. Physical Ledger/Clear Signing evidence remains blocked.

Verification after the run: focused Gemini/deployment-agent/Graph tests pass (16 + 8 tests), the
Ledger suite passes (18 tests), `bun run typecheck`, `bun run build`, `bun run contracts:test`, and
`git diff --check` pass. `bun run test` is blocked by one existing Windows sandbox `EPERM` when
`p13-setup-template.test.ts` spawns a child Bun process (70 API tests pass); `verify:scaffold` has
the same child-process `EPERM`, and Speculos smoke is blocked because no emulator is listening on
`127.0.0.1:5000`. These are environment limitations, not claimed partner evidence.

## 2026-09-11 — P16 live CRE deployment boundary

The existing `handlerInTee` workflow was deployed through CRE CLI v1.32.0 to the Chainlink-hosted
private registry and is recorded as `ACTIVE` under workflow ID
`0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144`. The normal account path then
sent one signed public request to the documented enterprise gateway. The gateway returned HTTP 400 /
JSON-RPC `-32600` (`Workflow not found`) before creating an execution; no callback, live verdict, or
live account evaluation was persisted. This deployment record is not live DON execution evidence.

The exact redacted command and result are in
`docs/compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md`. A fresh official
simulation rerun completed successfully with public `HOLD`, `CLEAR`, and `REJECT` outcomes; it
remains separate simulation evidence and does not claim live execution. After the bounded
gateway-diagnostic fix, all 72 API,
32 CRE, domain/simulation, full repository, typecheck, build, contract, scaffold, and verification
checks passed. The only lint output is the repository's existing CSS specificity warning set.

After aligning the tracked staging config, CRE CLI v1.33.0 re-ran the authenticated unsafe,
corrected, and tampered simulations successfully as `HOLD`, `CLEAR`, and `REJECT`. The redacted
ignored artifact is `.data/cre-simulation/20260911154644464-6a5140c7/evidence.json`; it contains no
raw CLI output or confidential fields.

On 2026-09-12, a direct official v1.33.0 trigger outside the Rovaulta API used the matching signer,
private gateway, exact workflow ID, and schema-valid public fixture. It reproduced HTTP 400 /
JSON-RPC `-32600` (`Workflow not found`); execution history remained empty. This confirms the live
blocker is outside the Rovaulta request path.

The current-ID/trigger audit then found one active private-registry workflow record and the latest
deployment UUID `68d13f61-60b8-453c-8ee8-62c088cbebbf` at `2026-09-11T14:12:55Z`. The tracked source
and staging config hash to the same workflow ID, and the SDK workflow test verifies the single
`http-trigger@1.0.0-alpha` `handlerInTee` registration, signer, and Nitro requirement. No stale-ID
or missing-trigger fix was justified; no redeploy was performed.

The follow-up CRE CLI v1.33.0 check reproduced the active deployment's binary, config, and workflow
hashes from the tracked staging config, matched the public authorized trigger signer, and repeated
the independent gateway smoke test. The private gateway still returned HTTP 400 / JSON-RPC `-32600`
before execution, so no live callback or verdict is claimed. The staging-config alignment is
committed separately; Vault consent, site-secret provisioning, and an HTTPS callback remain external
post-acceptance prerequisites.
