# Current State

## Phase

## 2026-09-12 — P18 optional Build Integrity / source-build path

- The optional `Build From Source` path is implemented beside the unchanged existing build-number
  route. It validates an HTTPS GitHub/GitLab repository and exact commit, requires the runtime
  lockfile, runs Bun/Node through a BuildKit/buildx runner, hashes the runner-produced artifact, and
  records a bounded SLSA/in-toto-shaped evidence statement.
- Source jobs are account-scoped and separate from safety verdicts. Only a successful job promotes
  the internal placeholder to a v2 robot-build descriptor whose `robotBuildDigest` includes the
  complete build-integrity evidence digest; the existing evaluation, clearance, and Ledger paths
  therefore retain their exact-build binding.
- The web workspace exposes `Use Existing Build` and `Build From Source`, polls running jobs, and
  keeps runner/provenance details behind an evidence view. Build failures never become safety
  `REJECT` and cannot be evaluated.
- Targeted domain, API, runner, and web type checks pass. The explicit real-runner test passed with
  the public Elysia repository at commit `e037eca710e7ad193be09cc6615ab0dbe54af914`, executing
  frozen Bun installation and `bun run build` in BuildKit and asserting the exported artifact and
  provenance subject digests. The gated live lifecycle test then promoted that artifact through the
  existing evaluation path and exact clearance binding with a `CLEAR` result.
- The 2026-09-12 Windows regression investigation found that the Docker executable was present but
  the runner's sanitized child environment omitted Docker Desktop's plugin/configuration locations;
  `docker buildx` therefore failed before image inspection and was misreported as runtime-image
  resolution. The runner now preserves those host CLI variables, autodetects Docker Desktop, and
  fails daemon-unavailability closed. The immutable historical Rovaulta revision from the report
  now reaches BuildKit but still fails in its own old TypeScript configuration, so a newly published
  source revision is required for users to build the corrected repository state.
- The runner now pins the runtime/frontend/BuildKit images, uses the official BuildKit metadata file,
  defaults dependency installation to `--network=none`, disables lifecycle scripts, bounds source
  size/concurrency, and re-hashes the exact artifact path before promotion. Provenance mutations and
  the actual Bun version output format have regression coverage.
- A corrected published Rovaulta revision, `94227cfb2817bdc57dd49ed04f5005d4a19ce3c4`, was then
  replayed through a fresh Docker Desktop BuildKit builder with a real frozen Bun install and
  `bun run build`; the lifecycle test completed with `3 pass`, including existing-build
  compatibility, source-build failure isolation, `CLEAR`, and exact clearance digest binding. A
  cold cache correctly fails under `ROVAULTA_BUILD_INSTALL_NETWORK=none`, so the local ignored
  `.env` opts Docker Desktop into dependency-install egress while keeping the build command
  network-disabled. The submitted historical revision must be replaced with the corrected commit;
  an invalid/truncated revision cannot be made authoritative by the runner.

## 2026-09-12 — P19 final partner qualification audit

- The current qualification matrix is **PASS** for Chainlink's selected authenticated CRE CLI
  simulation path: the source registers `handlerInTee`, reads a request-scoped secret inside the
  confidential callback, calls the deterministic evaluator, and the committed evidence records
  `HOLD`, `CLEAR`, and tampered-commitment `REJECT` without private output. Live CRE/DON execution
  remains a separate blocked deployment path and is not required by the prize.
- The Graph implementation is **PASS** for the Start Fresh / From Scratch technical pool: the real
  Sepolia registry clearance is indexed by the hosted Studio subgraph, the strict reader returns
  `MATCHED`, and the real Gemini agent consumes that context before `LEDGER_APPROVAL_REQUIRED`.
  The required two-to-four-minute demo video remains an external submission artifact and is not
  claimed.
- Ledger is **PARTIAL**: DMK/WebHID/Speculos, exact intent binding, pre-sign checks, and the
  AI-to-human boundary are real and fail closed, but no Clear Signing signature, `AUTHORIZED`
  result, physical-device proof, origin token, or accepted descriptor is available. The official
  track does not make physical hardware a blanket requirement, but the missing approval evidence
  prevents a full qualification claim.
- The audit plan and verification record are in
  [`P19`](exec-plans/P19-partner-qualification-audit.md). The ignored local `.env` has the public
  Studio query URL configured; gateway remains the default and simulation remains an explicit
  operator mode. A fresh authenticated CRE v1.33.0 simulation now records `HOLD`, `CLEAR`, and
  tampered-commitment `REJECT`; live gateway/DON delivery remains separately blocked.

## 2026-09-12 — P17 authentication, session, and ownership hardening

- `/start`, `/sign-in`, and `/create-account` now probe `/auth/me` before rendering account-entry
  actions. Valid sessions redirect to `/app` (or a validated `/app...` continuation); anonymous
  sessions see the form; probe failures stay explicit and retryable.
- Registration/sign-in preserve the HTTP-only session cookie, `apiFetch` uses `no-store`, and the API
  marks responses non-cacheable. Sign-out redirects only after server revocation and surfaces a
  failure instead of pretending the session ended.
- The existing API store already derives ownership from the session and scopes resource queries by
  account. Legacy release preparation/consumption now binds deployment context and durable nonces to
  the authenticated owner, and regression tests cover session lifecycle plus cross-account
  URL/body-ID/nonce isolation. The P5 browser handoff is explicitly account-scoped and rejects
  mismatched or legacy payloads; mobile workspace sign-out remains visible at the narrow viewport.
- Targeted tests and the final browser flow passed; `bun run verify` passed end to end. Detailed
  scope and evidence are in [`P17`](exec-plans/P17-authentication-session-ownership.md).
- Remaining environment limitation: the separate read-only reviewer fork was dispatched but did not
  return a report during bounded waits. No auth defect is inferred from that absence.

**P1–P8 software is implemented. P5.2 adds the narrow AI deployment-agent workflow, deterministic tool/capability boundary, public audit projection, local positive/adversarial evidence, and a live read-only Sepolia blocked-state trace. P6 adds the deterministic digital twin over a server-side public projection of the existing P2/P3 fixture. P7 adds an offline fixed-clock A/B/C rehearsal, demo-owned idempotent reset, stale-browser protection, and reliable Playwright flow coverage. P8 provides the account-backed product lifecycle: authenticated onboarding, persisted site/robot/build/evaluation/release records, encrypted private policy storage, server-side evaluation, and a truthful P5/P5.2 release boundary. P7 fixtures are development/test-only and are not normal account data. A real Gemini-backed account-agent run now consumes the live Studio `MATCHED` clearance and reaches `LEDGER_APPROVAL_REQUIRED`. P5.1 has official Speculos transport, actual Ethereum app/address UI smoke, ERC-7730 v2 validation, real pre-sign C, and invalid/unregistered D. Authenticated Clear Signing A/B/E/F and physical Ledger evidence remain externally blocked.**

**P15 replaces the deployment-agent provider without changing its authority model:** the API now uses
the official Google Gen AI SDK (`@google/genai`) with `gemini-2.5-flash` as the default model. The
host still sends only the canonical public request and public observations, forces one host-selected
function per turn, and leaves Graph checks, P5 preparation, and Ledger authorization unchanged.
`GEMINI_API_KEY` is server-only; no confidential CRE policy, envelope, blind, credential, signature,
or raw model output enters the agent context or public audit. A real Gemini execution is captured in
the P15 evidence artifact. This API key rejects `gemini-2.5-flash` for new users, so the evidence run
supplied the server-only `GEMINI_MODEL=gemini-3.5-flash` override; the repository default remains
`gemini-2.5-flash`.

**P9 partner qualification slice is implemented and now has public live Graph evidence:** the normal
account evaluation boundary uses an official Chainlink CRE HTTP JSON-RPC/JWT client and never falls
back to the in-process evaluator; a request-scoped site secret selector is bound into the public CRE
request. The production gateway remains asynchronous and P10 completes it only through a signed
public-only callback when deployment/result-delivery configuration exists. Account-backed release
preparation resolves the exact authenticated evaluation/clearance, requires a live The Graph registry
context, then delegates to the existing P5 authority; the static catalog remains only for the explicit
development fixture route. The deployed Sepolia subgraph now indexes one real account-owned clearance,
and the strict provider returns `MATCHED` through the hosted Studio endpoint. Gateway publication
and the final Ledger handoff remain unclaimed; the real Gemini handoff is captured in P15 evidence.**

**P10 closes the asynchronous CRE application transport in code:** account evaluations now persist an
exact pending request after the official gateway returns `ACCEPTED`; a configured CRE TEE callback
can deliver only the minimal public result over an HMAC-authenticated canonical payload. The API
checks the exact evaluation/site/robot/build, behavior-input digest, and callback idempotency before
exposing the result to the owning account, and the web workspace polls the explicit pending state.
The workflow uses the official HTTP capability only when this public-result delivery is configured;
it never sends the private envelope, blind, policy, or internal report. The authenticated P13
simulation remains the selected Chainlink qualification path. A real Sepolia clearance and live
Subgraph Studio `MATCHED` response, and Gemini-backed `LEDGER_APPROVAL_REQUIRED` handoff are now
captured; deployed callback completion and Ledger hardware evidence remain external.**

**P11 hardens and operationalizes The Graph qualification path:** the repository now has pinned
Graph CLI/AssemblyScript tooling that code-generates and compiles the public Sepolia registry
subgraph, a server-only provider client that validates the exact clearance identity/bindings,
issuer, block metadata, verdict, revocation, and expiry, and an operator-only command that runs the
real account-backed agent path without printing credentials. The account agent already requires
`MATCHED` Graph context before the direct P5 check; all other Graph states fail closed. The build
and injected critical tests are green. The hosted `rovaulta-registry` deployment is live on Sepolia,
one real clearance is indexed, and both the direct Studio query and strict API reader return
`MATCHED` for the exact digest. This is labelled Studio evidence, not Gateway/decentralized evidence.
The model-backed agent handoff is captured in the P15 evidence artifact. Start Fresh / From Scratch
eligibility is documented by the maintainer-origin declaration and repository chronology in the
Graph eligibility artifact. The required 2–4 minute demo remains an external submission artifact and
is not yet recorded; a Gateway subgraph ID remains optional for the selected hosted Studio evidence
path and is not claimed.**

**P12 adds the missing operator path from account data to the deployed registry:** a validated
account-owned public `CLEAR` evaluation can now be converted through the canonical P1 clearance
schema and existing P4 transport, preflighted against the authorized Sepolia registrar, simulated,
submitted to `RovaultaRegistry.recordClearance`, confirmed, checked for both public registry events,
and read back through the existing exact-binding client. The command emits only public confirmation
fields and can write a public-only clearance JSON for P5/P11. The existing account-owned simulated
`CLEAR` produced a confirmed Ethereum Sepolia transaction with both registry events and exact
readback; the deployed `rovaulta-registry` v0.1.0 Subgraph Studio endpoint then returned the exact
entity and the API reader returned `MATCHED`.**

**P13 now selects the authenticated official CRE CLI simulation as the Chainlink qualification path:**
`apps/api/scripts/cre-simulation-evidence.ts` regenerates ignored site-bound public payloads/secrets,
runs the existing `handlerInTee` workflow for unsafe/corrected/tampered cases, extracts only the
minimal public result, validates it with Rovaulta's strict callback/binding parsers, and writes a
redacted evidence artifact. The current-source artifact records official CLI execution of unsafe
`HOLD`, corrected `CLEAR`, and tampered `REJECT` with the mandatory site-selector boundary. P16 also
deployed the same workflow to the Chainlink-hosted private registry (`ACTIVE`), but the first
enterprise-gateway request returned a workflow-lookup error before execution; no live DON verdict,
Vault completion, callback, or Early Access claim is made. The normal account runner and encrypted
site-secret provisioning helper remain available and fail closed at that external boundary.**

## P13 CRE simulation qualification and account boundary

- `apps/api/scripts/p13-account-evaluation.ts` uses the normal account HTTP boundary. Setup-only mode
  creates a site/robot/build from an ignored setup file and prints public IDs; evaluation mode can
  reuse those IDs, submits the existing CRE-backed `/evaluations` route, and polls the owning
  account's result. It has no SQLite, P2, P7, browser-verdict, or fabricated-result path.
- `apps/api/scripts/p13-provision-site-secret.ts` is a local operator-only handoff. It resolves the
  encrypted policy through `ApplicationStore`, maps the exact site selector to an environment
  variable for the official `cre secrets create` command, and removes its temporary mapping. The
  envelope/blind never crosses the API/browser/evidence boundary.
- The setup file may contain the facility's private policy and must remain under ignored `.data/`.
  The runner prints and optionally writes only an allowlisted public evaluation projection.
- `bun run --cwd apps/api evidence:cre-simulation` is the reproducible qualification command. It
  requires the official CRE CLI and authenticated CLI context, runs all three public cases, and
  fails closed without them; it never substitutes P2 or fabricates a result.
- The generated artifact contains only the command, CLI/build identity when reported, execution ID
  when reported, public bindings, verdict/error, validation projection, and leakage flags. Raw CLI
  output and the confidential input are never persisted.
- A deployed workflow must fetch `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_<base32-site-id>`
  and `ROVAULTA_CONFIDENTIAL_EVALUATION_RESULT_CALLBACK_SECRET` from CRE `main`; the API must
  configure the matching callback HMAC, gateway URL, workflow ID, and trigger signer. The local
  provisioning helper does not expose a policy-export route and requires the official CRE CLI.
- Local account-runner preflight: `bun run --cwd apps/api p13:account-evaluation` fails closed with
  missing email or a password outside the API's 12–256 character bound before creating any
  records. The authenticated official CLI simulation runner now completes all three current-source
  cases and writes only its redacted public artifact. The P16 private-registry deployment is active,
  but the enterprise gateway rejected the first workflow lookup before execution; no live result or
  callback is claimed.

## P13.1 account-owned official CRE CLI simulation mode

- The normal authenticated `/evaluations` route now accepts the explicit
  `ROVAULTA_CRE_EXECUTION_MODE=simulation` operator mode. Gateway mode remains the default, and
  no implicit local P2/P7 fallback exists.
- The simulation executor verifies the installed CLI version and runs `cre whoami` before invoking
  the workflow. An unavailable or expired authenticated CLI session fails closed without exposing
  the CLI response.
- The simulation executor builds its public payload from the account-owned site, robot, build,
  request, and traces, then invokes the unchanged P13 `handlerInTee` workflow through the official
  CRE CLI. It creates a short-lived workflow configuration whose `secretsNames` entry matches the
  exact request-scoped site selector, maps that selector to a temporary `-e` environment file, and
  removes the workflow, payload, mapping, and secret files in a `finally` block.
- A result is persisted only after the existing callback parser, behavior-input digest check, and
  exact P1 binding validation pass. The public evaluation records
  `executionMode: official-cre-cli-simulation` and the CLI version; this is explicit provenance,
  not a live CRE/DON claim. An operator run persisted one account-owned simulated `CLEAR` through
  this path, and the existing P12 command consumed it to produce the confirmed Sepolia transaction
  recorded in the P14 evidence artifact. The resulting public entity is indexed by Subgraph Studio;
  no Gateway or live CRE/DON claim is made.
- The clean-checkout operator path now has a tracked safe template at
  `apps/api/p13-setup.example.json`; `p13:setup-template` copies it to the ignored
  `apps/api/.data/p13-setup.json`. The account runner uses a shared strict loader that rejects
  missing, empty, malformed, or structurally invalid files with an actionable template command.
- ID-reuse failures are explicit and fail closed: a missing account-owned site, robot, or build
  tells the operator to clear stale `ROVAULTA_P13_*_ID` exports and rerun setup-only in the
  current API database; the runner never silently creates replacement resources in reuse mode.
  On POSIX hosts the generator applies owner-only modes to the directory and setup file. The
  template's digest, route, and example policy are accepted by the existing account API; operators
  must replace them locally with the real build/site values. Setup-only still creates only
  account-owned site/robot/build records and never an evaluation or clearance.

## P14 live bounty evidence closure

- The persisted account-owned `CLEAR` from the authenticated official CRE CLI simulation was
  consumed by the existing P12 operator path. Ethereum Sepolia confirmed transaction
  `0xa1854cef882006928b312d418372e861f6470125beaa23c97708a8c8b077e4a1` at block `11668773`,
  including both `ClearanceRecorded` and `ClearanceBindingsRecorded` plus exact readback.
- The deployed `rovaulta-registry` v0.1.0 Subgraph Studio endpoint returned the exact public
  clearance entity at the same indexed block; `TheGraphClearanceReader` returned `MATCHED` after
  validating every public binding. This is live Studio evidence, not Gateway or decentralized-network
  evidence, and no Graph entity was manually inserted.
- The account-agent command now runs with the live Studio provider and exact public clearance. A
  real Gemini function-calling execution resolved the target, observed `MATCHED`, prepared the exact
  P5 intent, and returned `LEDGER_APPROVAL_REQUIRED`. No signature or authorization is claimed.
- The model-specific evidence uses `gemini-3.5-flash` because this API key rejects the repository's
  default `gemini-2.5-flash` as unavailable to new users; no provider fallback is implemented.
- Ledger adapter tests remain green and existing Speculos evidence remains partial. Physical-device
  approval and official Clear Signing Tester A/B/E/F evidence require external hardware/access.
- Redacted evidence: `docs/compliance/evidence/p14-live-bounty-evidence-2026-09-09.md` and
  `p14-live-sepolia-graph-2026-09-09.json`; detailed execution plan:
  `docs/planning/exec-plans/P14-live-bounty-evidence-closure.md`. The Gemini run is recorded in
  `docs/compliance/evidence/p15-live-gemini-graph-ledger-boundary-2026-09-10.md`.

## P15 live Gemini deployment-agent evidence

- The existing `apps/api evidence:p11-graph` command was run against the real account-owned
  clearance, the deployed Sepolia registry, and the hosted Subgraph Studio endpoint. It used the
  official `@google/genai` SDK and made seven real host-selected function calls.
- The public sequence was `RESOLVED → LOCKED → CLEAR → MATCHED → ELIGIBLE → PREPARED →
  AWAITING_HUMAN`, ending at `LEDGER_APPROVAL_REQUIRED`. The agent had no signing, registry-write,
  or authorization capability.
- Evidence is public-only and records the target bindings, chain/registry, Graph block metadata,
  clearance digest, intent digests, provider/model, and no confidential payload. See
  `docs/compliance/evidence/p15-live-gemini-graph-ledger-boundary-2026-09-10.md`.
- The repository keeps `gemini-2.5-flash` as its default, but this API key rejects that model as
  unavailable to new users. The run used the explicit server-side `GEMINI_MODEL=gemini-3.5-flash`
  override. This is a model-availability limitation, not a fallback or authority change.

## P16 live CRE deployment boundary

- The existing workflow was deployed with official CRE CLI v1.32.0 to the Chainlink-hosted private
  registry. Workflow `rovaulta-confidential-evaluation-staging` is `ACTIVE` under ID
  `0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144`; no second workflow was added.
- The first normal account gateway request used the documented private enterprise gateway and the
  existing signed public request. The gateway returned HTTP 400 / JSON-RPC `-32600` (`Workflow not
  found`) before creating an execution; `cre execution list` was empty. No callback, live verdict,
  or live account evaluation was persisted.
- This is recorded as deployment `PASS` and live execution `BLOCKED`, not as live DON evidence. The
  exact public command/result and remaining external Chainlink registry/Confidential Workflow
  visibility dependency are in
  `docs/compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md`.
- A CRE CLI v1.33.0 control-plane check still reports the exact workflow as `ACTIVE` in the private
  registry, and `cre workflow hash` with the tracked staging config reproduces the deployed binary,
  config, and workflow hashes. The authorized signer address also matches the deployed trigger.
  An independent minimal signed gateway request returned the same HTTP 400 / `-32600` lookup error,
  while `cre execution list` remained empty. The local source/deployment alignment is therefore
  fixed and no redeploy is claimed; workflow visibility/access remains a Chainlink-side blocker.
- The current site-bound Vault selector is not in the tracked secrets manifest, and the active
  deployment has no HTTPS result-delivery callback configuration. These must be completed only
  after the gateway resolves the workflow; no Vault value, callback secret, or confidential payload
  was created, printed, or committed.
- On 2026-09-12, an independent official v1.33.0 trigger using a schema-valid public workflow
  fixture, the documented private gateway, and the matching authorized signer reproduced HTTP 400 /
  JSON-RPC `-32600` (`Workflow not found`). `cre execution list` remained empty. This rules out the
  Rovaulta application request path as the cause; the live blocker is the Chainlink private
  execution plane/registry visibility.
- The same v1.33.0 audit found one current `ACTIVE` workflow record, the current ID in configuration,
  latest deployment `68d13f61-60b8-453c-8ee8-62c088cbebbf`, and a source/config hash that reproduces
  that ID. The compiled source registers one `http-trigger@1.0.0-alpha` `handlerInTee` entry with
  the matching authorized signer and Nitro requirement. No stale-ID or missing-trigger fix was
  justified, so no redeploy was performed.
- `apps/api/src/evaluation/cre-client.ts` now returns bounded provider status/code/message details
  for this fail-closed rejection; it never includes signed request bytes, credentials, or private
  CRE inputs. The P13 simulation path remains unchanged.

## P11 The Graph qualification implementation

- `integrations/the-graph` pins `@graphprotocol/graph-cli@0.98.1` and
  `@graphprotocol/graph-ts@0.38.2`; `bun run --cwd integrations/the-graph build` runs codegen and
  WASM compilation. Generated code/build output is ignored and never scanned as application source.
- The subgraph starts at the deployed Sepolia `RovaultaRegistry` block and indexes only public
  clearance/binding/revocation fields. No private policy, envelope, blind, trace, secret, credential,
  or model output is represented in the schema.
- The provider adapter sends the exact clearance digest to either the configured Gateway URL or an
  explicitly configured, exact Subgraph Studio query URL, validates the entity ID plus all P1/P4
  public bindings, issuer, block number/hash, `CLEAR` verdict, expiry, and revocation, and returns a
  redacted public context. It has no fixture fallback; Studio responses are labelled separately.
- Authenticated account release preparation resolves its clearance from the account store, invokes
  `getGraphContext`, blocks on any non-`MATCHED` response, and only then calls the existing P5 reader
  and `ReleaseService.prepare()`. P5 remains the final authority.
- `apps/api evidence:p11-graph` is the reproducible live-account evidence command. It requires a
  real Gateway key/subgraph ID or exact Studio query URL, account-created public clearance, account
  identifier, and public signer address; missing configuration fails closed. The current live proof
  validates Studio context independently, and the P15 run records the real Gemini tool sequence after
  the `MATCHED` gate.

## P12 account-backed clearance issuance

- `apps/api/src/application/clearance.ts` constructs a clearance only from a stored account
  evaluation whose public verdict is `CLEAR`; all P1 site/robot/build/envelope-commitment/evaluator
  and input-digest bindings are copied and revalidated by `assertClearanceBindings`.
- `apps/api/scripts/record-sepolia-clearance.ts` is an explicit operator-only write path. It requires
  an existing account database/evaluation, an explicit clearance id, a confirmation flag, and an
  authorized registrar key. It validates Sepolia chain/bytecode/registrar state, duplicate IDs,
  timestamps, simulation, both `ClearanceRecorded` and `ClearanceBindingsRecorded` logs, and the
  existing exact registry readback before reporting `CONFIRMED`.
- The script never opens the encrypted policy and never prints envelope, blind, credential, private
  key, or confidential evaluation fields. A missing account evaluation, CRE completion, RPC, or
  funded registrar is a pre-broadcast blocker.
- The 2026-09-09 run recorded the account-owned simulated `CLEAR` on Ethereum Sepolia at block
  `11668773`, confirmed both registry events, and wrote the public-only clearance artifact used for
  the live Graph query. See the P14 evidence artifact for the transaction and digest.

## P9 partner qualification slice

- `POST /evaluations` invokes the configured CRE transport and returns only the existing public
  evaluation projection. Missing CRE configuration, rejected requests, and network failures are
  explicit 503 failures; asynchronous gateway acceptance is a 202 pending record completed only by
  the signed callback. No local P2 fallback is used by the normal API entrypoint.
- Each account site maps to a request-scoped CRE secret selector. Operators must provision that
  selector in the CRE `main` namespace with the private envelope/blind and deploy a result-delivery
  mechanism before a real account evaluation can complete.
- `integrations/the-graph/subgraph` indexes only public Sepolia `RovaultaRegistry` events. The API
  Graph adapter validates exact public bindings, chain/registry, block identity, verdict, revocation,
  and expiry. Account-backed agent preparation blocks unless Graph returns `MATCHED`; the deployed
  Studio endpoint now supplies one live exact match.
- Normal `/releases/prepare` and the non-fixture agent route use account records and the Graph
  context step before the existing P5 read/prepare authority. The model still cannot sign, consume,
  write registry state, or authorize a release.
- Local Graph/provider and CRE transport tests use injected responses only; they are not live partner
  evidence. The P3 authenticated CLI simulation remains the accepted Chainlink simulation evidence.

## Rovaulta repository identity migration

The repository now emits Rovaulta package scopes, protocol labels, deployment metadata, environment
keys, workflow configuration, UI copy, contract names, paths, and documentation. New protocol and
EIP-712 outputs use the Rovaulta namespace. Opaque compatibility readers preserve verification of
persisted wire records, release authorizations, environment keys, and the confidential workflow
secret selector created before the migration; compatibility values are not exposed in public
responses or source text. Existing external CRE workflow registrations remain operator-managed
identities and require an intentional redeploy when their configured workflow name changes.

## P8 real product lifecycle now present

- `/` is a plain-language landing page. `/start` creates or signs into an account; it does not
  create a browser-only demo session.
- `/app/setup` creates an account-scoped site and constrained private safety policy, then registers
  a robot and exact build declaration through the API. The artifact digest is recorded identity,
  while the declared route is the deterministic simulation input; no binary provenance is claimed.
  Policy contents are encrypted at rest and only opened inside the API evaluation boundary.
- `/app`, `/app/builds`, `/app/evaluate`, `/app/releases`, and `/app/evidence` load authenticated,
  persisted records. All resource queries are scoped by the session account; the browser never
  chooses an account id.
- User-created build declarations are submitted through the configured CRE evaluation boundary. The
  browser receives a public projection only: bindings, verdict, counts, reason families, and
  commitments. Without a deployed CRE gateway/result transport the request fails closed; the normal
  path does not silently invoke P2 locally. The result is not evidence that artifact bytes were
  inspected.
- Release preparation calls the existing P5 boundary when configured and otherwise records a
  truthful `BLOCKED` attempt. A local `CLEAR` result is not presented as a P4 clearance or human
  approval.
- The P7 unsafe/corrected/mutated fixture is available only at the explicit, env-gated
  `/dev-fixtures/evaluate` development route used by regression tests. It is not imported by the
  normal `/app` product path.
- The UI distinguishes `HOLD`, `CLEAR`, `BLOCKED`, and `LEDGER_APPROVAL_REQUIRED`. Technical CRE,
  Sepolia, and Ledger details support the workflow in Evidence rather than replacing it.
- Private envelope inputs, blinds, restricted geometry, thresholds, internal reports, credentials,
  and raw model/CRE payloads remain outside the browser projection.

## P6 implementation now present

- The explicit development fixture route is a judge/regression dashboard: deployment target,
  deterministic warehouse digital twin, public evaluation, Chainlink boundary, deployment-agent
  activity, Sepolia registry, Ledger boundary, and expandable verification trail.
- The server evaluates the existing `@rovaulta/simulation-core` fixture and passes only a public
  projection to the browser. The confidential envelope, blind, rules, thresholds, geometry, and
  internal report never enter the client bundle or rendered output.
- Build A is the default `HOLD` state with the existing three deterministic violation families.
  Build B is the same-envelope `CLEAR` state. The public judge headline displays `487 scenarios`
  while the authoritative checked-in P2 fixture remains bounded to three committed templates;
  the distinction is visible in the UI and does not alter evaluator semantics.
- Mutating Build B changes the build ID and canonical digest and produces `BLOCKED` with
  `CLEARANCE_BINDING_MISMATCH`. It clears any prepared state and cannot expose a Ledger request.
- The agent panel is a public/fixture-backed projection until the existing API is configured. A
  live `/agent/deployment/prepare` response is required before the page stores an exact prepared
  P5 request and opens `/p5-ledger`; no frontend state can report `AUTHORIZED`.
- Chainlink is labeled `CRE authenticated simulation evidence` and sourced as a recorded P3 public
  outcome; a mutated build explicitly says confidential evaluation was not run. The real Sepolia
  registry identity is linked, Speculos is labeled as a development/test simulator, and physical
  Ledger approval is explicitly not demonstrated. No clearance transaction or robot activation is
  fabricated.

## P5.2 implementation now present

- A narrow Gemini function-calling adapter supports one strict tool per turn, sends only
  a host-generated public request, and fails without a deterministic/mock
  production fallback when configuration is missing.
- A host-owned state machine enforces
  `resolve target → context → evaluation → clearance → release prepare → Ledger status`.
  Unknown, malformed, skipped, repeated, reordered, or authority-bearing calls fail closed.
- A strict public catalog accepts only its finite public request forms, resolves the exact target
  locally, discards raw input, and gives the model only a generated canonical public request. The
  model's first aliases must match that same entry; it cannot construct clearance, signer, chain,
  registry, nonce, signature, typed data, or authorization.
- Public evaluation and clearance reads are informational. Only the existing
  `ReleaseService.prepare()` can issue a request, preserving live P4 checks, exact bindings, signer
  allowlist, expiry, and server nonce semantics.
- The agent has no signing, release-consumption, registry-write, arbitrary network, shell, or
  filesystem tool. Eligible execution ends at `LEDGER_APPROVAL_REQUIRED`; the browser/user Ledger
  action remains separate.
- `AUTHORIZED` is available only from a read of the exact prepared nonce after the existing P5 flow
  stored a validated `ReleaseAuthorization`. Tests prove this with actual EIP-712 signing,
  signature recovery, postcheck, and atomic nonce consumption using a test-only key.
- The public audit records only a host-generated canonical request/target, ordered tools, public
  clearance/block result, policy result, intent digests, Ledger status, and final status. It excludes
  raw submitted text/model output, signatures, credentials, private envelopes/blinds, CRE payloads,
  and private evaluation detail.
- Local evidence shows unsafe A blocked, corrected B reaching Ledger-required, and mutated C losing
  to `CLEARANCE_BINDING_MISMATCH`. A live read-only agent trace queried Sepolia at block `11653234`
  and blocked the deliberately unregistered fixture with `CLEARANCE_NOT_FOUND`.
- Production WebHID remains unchanged/default; Speculos remains development/test-only. P6 adds
  only the judge dashboard/public projection and exact prepared-request handoff; no activation,
  Key Ring, contract mutation, or P1–P5.1 redesign was added. See ADR-0008 and the P6 execution
  plan.

## P7 deterministic demo reliability now present

- `bun run demo:setup` resets only `.data/rovaulta-demo`, materializes a public manifest, and
  runs the deterministic A/B/C rehearsal. `bun run demo:reset` is idempotent and never removes
  source fixtures, deployment metadata, evidence, `.env`, or the normal release database.
- The rehearsal reuses the P2 evaluator and existing P5.2 DeploymentAgent/ReleaseService with a
  fixed clock, block snapshot, attempt IDs, and demo-only nonce factory. Production defaults remain
  live RPC/provider-backed and cryptographically random.
- Scenario A is `HOLD`/`NOT_REQUESTED`; B is `CLEAR` with a local deterministic clearance,
  `LEDGER_APPROVAL_REQUIRED`, exact intent binding, and `AWAITING_HUMAN`; C mutates Build B,
  recomputes its digest, and returns `BLOCKED / CLEARANCE_BINDING_MISMATCH` without Ledger handoff.
- The dashboard exposes `Reset demo`, clears stale handoff storage on scenario changes/mount, and
  ignores late agent responses after a reset or mutation. The Playwright P7 flow covers clean
  startup, reset, A/B/C transitions, exact handoff fields, repeated C output, and race cleanup.
- This is offline rehearsal evidence only. The recorded P3 authenticated CRE simulation, live
  Sepolia read-only identity, Speculos development path, and physical Ledger limitations retain
  their existing labels and boundaries.

## P5 implementation now present

- `DeploymentIntent` v2 adds the fixed `ACTIVATE_DEPLOYMENT` action without creating a second intent model.
- EIP-712 signs the full exact intent under `Rovaulta` v1, Sepolia `11155111`, and the deployed registry from `contracts/deployments/sepolia.json`.
- The signed message binds protocol/schema, site, robot, build ID/digest, clearance ID/digest, environment, authorized signer, nonce, issuance, expiry, and the P1 intent digest.
- The API reads the real P4 interface at one explicit block and rejects missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, or wrong-registry clearance state.
- The signer address must be in the operator-controlled `ROVAULTA_AUTHORIZED_SIGNERS` allowlist before a Ledger request is prepared and again after recovery.
- Nonces are generated server-side, persisted in SQLite, and atomically consumed once. Invalid signatures and failed post-sign checks do not consume them.
- Clearance is checked before signing and again before nonce consumption. Revocation or expiry between checks denies authorization.
- The browser adapter uses pinned Ledger DMK, WebHID and Speculos Device Transport Kits, Context Module, and Ethereum Device Signer Kit packages behind an exact `webhid | speculos` selection. Both transports retain one connection/address/context/signing path; Speculos is rejected outside `development`/`test`.
- The runtime Clear Signing guard requires successful resolution for the exact chain, registry, 15-field schema, filter count, and every display path before signing may proceed. Partial/mismatched context and the signer kit's legacy typed-data fallback state are cancelled and rejected. There is no personal-sign, raw-transaction, hashed-EIP-712, backend-key, or frontend-boolean fallback.
- A minimal `/p5-ledger` operator harness defaults to production WebHID and can opt into a loopback Ledger Speculos official device simulator only in development/test. It does not activate a robot or implement the P6 digital twin. The 2026-09-11 authenticated browser trace reached exact intent preparation against Sepolia and then failed closed at `CLEAR_SIGNING_UNAVAILABLE` because the Ledger-issued origin/accepted-descriptor path is not configured.
- Speculos `0.27.0` executed the official Ethereum `1.22.3` Nano S Plus ELF. DMK discovery, actual emulator address review/confirmation, and public session identity were captured without a seed or secret.
- The candidate descriptor now uses active ERC-7730 v2 and passes official `erc7730 1.0.7` lint with no issues. This is validation, not Ledger registry acceptance or display evidence.
- `/release/prepare` remains the deterministic proposal authority. P5.2 now calls it through the
  narrow agent controller; the Ledger browser flow remains manual and explicitly human-controlled.
- Mock tests cover deterministic EIP-712 mutation, the positive exact registry-reader path, API request/error boundaries, authorized signatures, durable/concurrent replay rejection, TOCTOU, build mutation, device lifecycle, refusal, exact/partial descriptor resolution, malformed output, and legacy-fallback cancellation.

## Current blocker

The official Clear Signing Tester wrapper was invoked and failed closed with `Error: GATING_TOKEN environment variable not set` (exit `1`). Its direct implicit test-token fallback was not used. The Tester is also a separate display harness that discards the signature: its gating token is not a substitute for Rovaulta's Ledger origin token/accepted descriptor. Consequently the structured deployment-intent display and Speculos cases A/B/E/F have **not** been run. A deliberate unexpired Sepolia demo `CLEAR` record for the Speculos signer would also be required for Case A; no contract write was made.

Case C and the invalid/unregistered D variant were executed through the real `/release/prepare` boundary using the public Speculos test address. Build substitution returned `403 CLEARANCE_BINDING_MISMATCH`; the deliberately unregistered fixture reached the deployed Sepolia registry and returned `403 CLEARANCE_NOT_FOUND`. Both stopped before device signing. Real revoked/expired D variants remain uncaptured, although deterministic tests cover them.

The 2026-09-11 clean-emulator run also exercised the authenticated browser `/p5-ledger` path:
the official Speculos session was discovered and the exact public intent was prepared against
Sepolia block `11679749`. A public build-digest mutation returned `MALFORMED_REQUEST` before any
signer request. The valid path stopped at `CLEAR_SIGNING_UNAVAILABLE` because the Ledger-issued
origin token and accepted/served descriptor are unavailable. The standalone presign evidence
harness returned `PERSISTENCE_UNAVAILABLE` without an authenticated application store; that
rerun is not treated as a successful C/D result and the 2026-09-07 artifact remains the source
for those recorded API responses. See
`docs/compliance/evidence/p5-ledger-speculos-browser-boundary-2026-09-11.md`.

Physical cases A–F also have **not** been run. The local environment has no configured Ledger-issued origin token and no evidence that Ledger accepted/serves the candidate descriptor for this origin. No physical Ledger model, firmware, approval, or rejection was captured.

P5 therefore does not yet prove either a complete official Speculos Clear Signing flow or hardware-backed human approval. Blind signing remains disabled; missing/partial context or the SDK legacy fallback fails closed.

## Next exact task

P8 submission evidence may address the partner matrix, architecture diagram, AI attribution, and
showcase assets. For the product path, the next safe evolution is replacing the local SQLite
single-node store with an explicitly configured managed persistence layer and adding operator
account recovery; neither is required for this local product baseline. Do not add robot activation,
make UI state authoritative, or turn the offline rehearsal into a live-partner claim. Persisting
agent audit history may be considered later without changing P5 nonce authority.

External evidence remains separately open: run the real provider adapter when an approved
`GEMINI_API_KEY` is available; obtain legitimate Ledger
Tester/application-origin/accepted-descriptor access for Speculos A/B/E/F; and capture physical
Ledger cases when hardware is available. Do not fabricate these results or block deterministic P6
UI work on claims that have already been explicitly scoped as external limitations.

## Environment status

Bun 1.4.1 and Foundry 1.8.1 are available. P1–P4 regressions remain in scope. Native WSL2 Speculos `0.27.0`, QEMU, and the verified public Ethereum `1.22.3` Nano S Plus ELF were used for the recorded smoke run. A read-only Sepolia P5 client run on 2026-09-06 confirmed chain `11155111`, registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, and live contract access at block `11645707`; the deliberately unregistered local fixture returned `exists=false` and `exactMatch=false`, as expected. This is reader/policy evidence, not a successful release or proof that the registry contains no other clearances.

P3's authenticated CRE runs remain simulation evidence only. P4 remains an authorized registrar attestation, not automatic CRE delivery. Neither Ledger nor Rovaulta proves physical robot safety.
