# AI Usage Log

## 2026-09-05 — Boilerplate generation

**Tool:** OpenAI Codex-oriented ChatGPT workflow.

**Human direction:** The user supplied the event constraints, selected product concept (Rovaulta), selected partners (Chainlink + Ledger), and explicitly requested a development boilerplate/agentic harness without product implementation.

**AI-assisted output:** Repository structure, stack recommendation, `AGENTS.md` hierarchy, project-local skills, Codex subagent profiles, architecture/planning/compliance docs, app/integration/contract scaffolds, CI, verification scripts, and worktree workflow.

**Not implemented:** confidential evaluation logic, robot simulation/evaluator behavior, smart-contract clearance logic, Ledger signing behavior, release logic, and final demo functionality.

Add future material AI-assisted changes as dated entries. Do not claim fully human-authored code where Codex generated or substantially rewrote it.

## 2026-09-09 — P12 account-backed Sepolia clearance issuance

**Tool:** OpenAI Codex using the Rovaulta execution-plan, verification-loop, and partner-compliance
skills.

**Human direction:** Reuse the existing account evaluation and P4/P5 transport to create one real
Sepolia `CLEAR` clearance for The Graph indexing; do not insert mock Graph data, alter the contract,
or expose confidential inputs.

**AI-assisted output:** A validated public clearance constructor from account-owned evaluations, the
existing registry ABI extended with `recordClearance`/event definitions, and an explicit operator
command that checks registrar authorization, simulates and confirms the transaction, validates both
registry events, performs exact readback, and emits only public confirmation fields.

**Evidence boundary:** This checkout now has one account-owned `CLEAR` from the authenticated
official CRE CLI simulation path, but no live gateway result. No clearance transaction was broadcast
and no Graph entity or `MATCHED` response is claimed. The operator command still fails closed until
the account, evaluation, registrar, RPC, and explicit confirmation are supplied.

## 2026-09-05 — Boilerplate verification repair

**Tool:** OpenAI Codex.

**Human direction:** Repair only the pre-implementation development harness: update Biome 2.5 configuration/exclusions, format existing scaffold files, allow intentionally empty workspace test packages, and run the requested verification gates without weakening them.

**AI-assisted output:** Biome configuration and generated-output hygiene, package test-script maintenance, mechanical formatting, execution-plan/verification evidence, and command-based validation.

**Not implemented:** P1 or later product behavior, simulator/evaluator logic, Chainlink workflow logic, contract product logic, Ledger behavior, frontend features, or architecture changes.

## 2026-09-05 — P1 domain and protocol foundation

**Tool:** OpenAI Codex with read-only Rovaulta architecture, exploration, verification, and review specialists.

**Human direction:** Implement only P1: canonical identifiers, minimum protocol schemas, deterministic canonical serialization and digests, runtime validation/failures, exact clearance/deployment bindings, tests, and protocol documentation.

**AI-assisted output:** `@rovaulta/domain` implementation and tests, type-only consumer alignment, ADR-0003, planning/security/evidence updates, adversarial review, and command-based verification.

**Not implemented:** P2 evaluation logic, P3 CRE/TEE behavior, P4 contract state, P5 Ledger/EIP-712 behavior, P6 UI, AI agents, or additional partners.

## 2026-09-05 — P2 deterministic simulator/evaluator

**Tool:** OpenAI Codex with read-only Rovaulta architecture, portability, test, verification, and adversarial-review specialists.

**Human direction:** Implement only P2: a pure fixed-unit warehouse model, committed deterministic scenarios, structured restricted-zone/speed/payload rules, build-declared materialized traces, deterministic evidence/verdicts, demo fixtures, tests, and documentation.

**AI-assisted output:** `@rovaulta/simulation-core` implementation and tests, ADR-0004, execution plan, security/risk/evidence updates, adversarial review, and command-based verification.

**Not implemented:** Chainlink CRE/TEE behavior or filtering, contract logic, Ledger/EIP-712 behavior, API/UI/digital twin, robotics middleware/hardware, AI models, or additional partners.

## 2026-09-05 — P3 Chainlink CRE confidential evaluation

**Tool:** OpenAI Codex with read-only CRE SDK, trust-boundary, test-gap, partner-compliance, and adversarial-review specialists.

**Human direction:** Implement only P3: prove the public-request/private-envelope to Chainlink Confidential Workflow/TEE to existing P2 evaluator to minimal-result path; preserve privacy, evidence, phase boundaries, and truthful provenance claims.

**AI-assisted output:** CRE SDK 1.19.1 `handlerInTee` workflow, Nitro/fixed-secret handling, versioned boundary schemas, canonical supplied-behavior digest, private envelope/blind processing, P2 adapter, redacted result/error projection, tests/fixtures/configuration, scaffold transition, security/planning/evidence documentation, and command-based compilation/verification.

**External limitation at that checkpoint:** The checksum-verified CRE CLI v1.32.0 compiled the workflow, but the three simulations could not start because no CRE login or `CRE_API_KEY` was present. The 2026-09-06 entry records the later authenticated simulation closure. No deployment, live TEE/Vault/DON execution, remote attestation, clearance, contract, Ledger, API, or UI behavior was claimed at this checkpoint.

## 2026-09-06 — P3 authenticated simulation evidence closure

**Tool:** OpenAI Codex using the project partner-compliance, verification-loop, and handoff skills plus an independent read-only reviewer.

**Human direction:** Close only the P3 evidence gap by running the existing unsafe, corrected, and tampered cases through the official authenticated CRE simulator; capture redacted evidence and keep P4 untouched.

**AI-assisted output:** Checksum-verified CRE CLI v1.32.0 execution, authenticated simulation orchestration, a fresh ignored runtime blind distinct from the public unit-test vector, non-secret result/execution-identity capture, raw-output leakage checks, exact Nitro/auth regression assertions, minimal simulator-compatibility corrections, and evidence/planning/verification updates.

**Evidence boundary:** Unsafe returned `HOLD`, corrected returned `CLEAR`, and a tampered confidential blind returned `REJECT`. These are official authenticated local simulations, not a live DON deployment or hardware TEE execution.

## 2026-09-06 — P4 attestation registry

**Tool:** OpenAI Codex with read-only Rovaulta architecture, contract-surface, test-gap, verification,
and adversarial-review specialists.

**Human direction:** Implement only P4: a minimal public Solidity registry for exact P1 clearance
bindings, authorized registration, strict expiry, monotonic revocation, stable reads, extensive
Foundry coverage, Sepolia deployment readiness, and truthful separation from P3 simulation.

**AI-assisted output:** `RovaultaRegistry`, dependency-free Foundry test harness, unit/fuzz/stateful
invariant tests, P1-to-EVM golden vectors, Sepolia chain-guarded deployment script, scaffold-phase
transition, ADR-0006, planning/security/evidence updates, and command-based verification.

**Evidence boundary:** P4 locally records registrar-attested public clearance evidence. It does not
prove live CRE delivery, TEE hardware attestation, authentic robot trace origin, deployment
authorization, Ledger approval, or physical robot safety. Sepolia deployment remains pending because
no funded deployer credential or explorer key was available.

## 2026-09-06 — P4 Sepolia deployment evidence closure

**Tool:** OpenAI Codex using the project execution-plan, verification-loop, and handoff skills plus
an independent read-only reviewer.

**Human direction:** Deploy the completed unchanged P4 registry to Ethereum Sepolia, verify the
source and public state, capture non-secret evidence and P5 registry-domain configuration, and stop
without beginning P5.

**AI-assisted output:** Pre-broadcast environment/chain/balance checks, one chain-guarded Foundry
broadcast, idempotent Etherscan/Sourcify verification confirmation, public receipt/code/state reads,
machine-readable deployment metadata, compliance/planning/report documentation, secret-leak review,
and command-based verification.

**Evidence boundary:** This is a public Sepolia contract deployment. No clearance was registered,
no live CRE-to-EVM delivery or TEE attestation is claimed, and no Ledger, EIP-712, signer, nonce,
release, API, UI, or P5 behavior was implemented. Credentials and confidential P3 values remain
ignored and uncommitted.

## 2026-09-06 — P5 Ledger release-gate software

**Tool:** OpenAI Codex using project execution-plan, vertical-slice, Ledger partner-compliance,
verification-loop, and handoff skills plus read-only domain, architecture, Ledger API, test-gap,
partner, and adversarial-review specialists.

**Human direction:** Implement only P5: an exact one-time Ledger-backed release authorization over
the deployed P4 registry, using current DMK/WebHID/Ethereum Device Signer Kit, full EIP-712, strict
pre/post deterministic policy, physical human approval, replay prevention, and no P6 work.

**AI-assisted output:** Minimal DeploymentIntent v2 action correction; exact P1-to-P4 chain reader;
full deployed-domain EIP-712 construction/recovery; authorized-signer policy; durable SQLite nonce
and TOCTOU checks; browser-only Ledger adapter; exact runtime Clear Signing filter guard; explicit
legacy typed-data fallback cancellation; minimal WebHID evidence harness; deterministic/device and
API-boundary tests; scaffold transition; ADR-0007; and
planning, security, partner, compliance, and verification documentation.

**Evidence boundary:** Software/mock verification and a read-only live Sepolia missing-fixture check
are recorded. Physical Ledger cases A–F were not run because no Ledger-issued origin token or
accepted/served ERC-7730 descriptor was available. No device model/app/signer, physical approval,
autonomous/LLM agent execution, robot activation, backend key, blind-signing result, or P6
functionality is claimed.

## 2026-09-07 — P5.1 Ledger Speculos evidence attempt

**Tool:** OpenAI Codex using project execution-plan, Ledger partner-compliance, verification-loop,
and handoff skills plus read-only repository and partner auditors.

**Human direction:** Close P5 as far as legitimate without physical hardware by adding the official
DMK Speculos transport, running the actual Ethereum app and emulator UI, validating/previewing the
ERC-7730 display, exercising A–F without mocks, preserving WebHID, documenting Ledger DX feedback,
and stopping before P6.

**AI-assisted output:** Narrow `webhid | speculos` transport selection with production rejection;
loopback development/test Speculos configuration; shared adapter/context/signature path; ERC-7730 v2 descriptor migration and official
validator run; explicit Tester display fixture; native WSL2 Speculos setup with checksum-verified
public Ethereum app ELF; actual DMK discovery and emulator address-review/confirmation capture;
reproducible official-controller smoke harness; real pre-sign C and invalid/unregistered D API
denials; scaffold regressions;
Ledger DX feedback; and planning/compliance/evidence updates.

**Evidence boundary:** The official Tester wrapper failed closed because `GATING_TOKEN` was absent,
and its display harness cannot supply Rovaulta's separate application origin/accepted-descriptor
context or preserve the signature. The implicit direct-tester token and blind signing were not used.
Case C and invalid/unregistered D passed before signer invocation; revoked/expired D remain
test-only. No deployment-intent signature, `ReleaseAuthorization`,
Speculos A/B/E/F result, physical Ledger/Secure Element claim, live contract write, autonomous
agent, or P6 behavior is claimed.

## 2026-09-07 — P5.2 AI deployment-agent closure

**Tool:** OpenAI Codex using the project execution-plan, vertical-slice, Ledger
partner-compliance, verification-loop, and handoff skills; the provider function-calling guide;
and read-only architecture, seam, partner, and adversarial-test specialists.

**Human direction:** Implement only P5.2: a narrow real tool-calling deployment agent that resolves
an exact public target, inspects evaluation/live Sepolia clearance state, reuses the existing P5
preparation authority, stops at Ledger, records a public audit, resists model/tool injection, and
does not begin P6 or redesign P1–P5.1.

**AI-assisted output:** Host-owned six-tool state machine; strict public deployment catalog; real
provider function-calling adapter; exact P5 authorization-status correlation;
agent prepare/status API routes; local deterministic and live read-only Sepolia evidence runners;
provider/orchestration/adversarial/leakage tests; scaffold transition; ADR-0008; and planning,
architecture, security, Ledger, compliance, verification, and handoff documentation.

The final adversarial review found that broad request text could become provider/audit input and that
alias containment could accept a negated second target. Those findings were fixed by restricting
requests to whole catalog-generated public forms, discarding raw submitted text, sending only the
canonical public projection, and requiring the first model tool call
to resolve to the host-selected catalog entry. Negative tests cover both cases.

**Authority boundary:** Model output is never a safety, eligibility, signing, or authorization
decision. The model has no registry-write, Ledger-signing, signature, consumption, arbitrary-chain,
network, shell, or filesystem tool. Existing P2/Chainlink results inform public status,
`ReleaseService.prepare()` decides eligibility, the browser Ledger path remains the human gate, and
only the existing cryptographic P5 consume result can produce `AUTHORIZED`.

**Evidence boundary:** Positive Build B evidence uses a clearly labeled deterministic registry
fixture; the live Sepolia agent trace is read-only and blocks the existing unregistered fixture.
No external model execution was captured because provider credentials were unavailable. No
Speculos signature, physical Ledger/Secure Element,
accepted Clear Signing descriptor, robot activation, confidential value, credential, or P6 behavior
is claimed.

## 2026-09-07 — P6 judge-facing digital twin

**Tool:** OpenAI Codex using the project execution-plan, vertical-slice, verification-loop, and
partner-compliance skills plus read-only simulation, web-test, and architecture reviewers.

**Human direction:** Implement only P6: one polished deterministic dashboard for the existing P2/P3
fixture and P5.2 public boundary, with unsafe/corrected/mutated states, an explanatory warehouse
twin, honest CRE/Sepolia/Ledger evidence, and no P7/P8 work.

**AI-assisted output:** Server-side public fixture projection, Next.js/React/R3F judge dashboard,
deterministic build-digest mutation, exact-build blocked state, public agent/CRE/attestation/Ledger
panels, prepared-request handoff support in the existing `/p5-ledger` route, Playwright judge-path
coverage, and P6 planning/architecture/compliance/README updates.

**Boundary:** The browser receives no confidential envelope, blind, private rule/threshold data,
internal report, credentials, signature, or fabricated transaction. A real existing agent API
response is required before an exact prepared P5 request is handed off; missing provider/signer
configuration remains visible as an external limitation. The public `487 scenarios` headline is
explicitly distinguished from the authoritative bounded three-template P2 fixture and does not
alter evaluator semantics.

## 2026-09-07 — P7 deterministic demo reliability

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop skills plus
read-only architecture and test-gap reviewers.

**Human direction:** Make the existing P6 judge path reproducible and resettable without starting
P8, adding product/robot execution, or changing P1–P6 authority semantics.

**AI-assisted output:** A fixed-clock offline P2/P5.2 rehearsal fixture, demo-owned setup/reset/run
commands, an optional test/demo nonce seam with the production random default unchanged, API
development startup that remains explicitly unavailable without live RPC, dashboard reset/stale
response guards, deterministic Playwright sequence coverage, and synchronized P7 planning/evidence
documentation.

**Boundary:** The rehearsal uses a scripted model and deterministic local registry reader. It is
not live Gemini, Sepolia, Chainlink CRE, Ledger, or Speculos execution. B stops at
`LEDGER_APPROVAL_REQUIRED` and C stops at `CLEARANCE_BINDING_MISMATCH`; no signature, nonce
consumption, registry write, authorization, confidential envelope, or robot activation is produced.

## 2026-09-08 — P8 real product lifecycle and UI correction

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop skills plus the
Next.js documentation and a required read-only final review.

**Human direction:** Replace the demo-only normal application path with a truthful product flow:
real account/session handling, account-scoped persisted site/robot/build/evaluation/release data,
private policy handling, server-side evaluation, and a release boundary that cannot be bypassed by
frontend state. Keep P7 fixtures development/test-only and do not add later-phase functionality.

**AI-assisted output:** Bun SQLite application store, scrypt password hashing, opaque HTTP-only
sessions, AES-256-GCM policy-at-rest encryption, authenticated Fastify resource routes, the existing
P2 evaluator wired server-side, account-isolation tests, real onboarding/workspace/evaluation/release
views, an explicit `/dev-fixtures/evaluate` regression route, critical Playwright coverage, and
product/architecture/planning documentation updates.

**Boundary:** User-created evaluations are public projections of the existing deterministic core;
they are not proof of physical robot safety. A local `CLEAR` result does not create a P4 clearance,
and release preparation records `BLOCKED` until the existing P5/P5.2 boundary has the required
public clearance and configuration. No confidential policy, blind, credential, raw CRE payload,
signature, AI authorization, robot activation, or P2+ feature was added.

## 2026-09-08 — P8 adversarial product-boundary correction

**Tool:** OpenAI Codex with a required read-only Rovaulta reviewer.

**Human direction:** Continue P8 until the normal flow is a real account-backed product rather than
a demo, and resolve any security or truthfulness gaps without starting P9 or changing P1–P5.2.

**AI-assisted output:** Added production denial for the fixture route, Origin/Referer mutation checks,
session protection for legacy P5/P5.2 routes, public-clearance paste and exact Ledger handoff from
the normal release view, selected-build URL preservation, and explicit disclosure that the local
evaluator runs over a declared route rather than inspecting artifact bytes. Test-port and API-origin
configuration were aligned for repeatable browser verification.

**Boundary:** The product still cannot create a clearance, sign, authorize, inspect artifact bytes,
or expose private policy values. Missing public clearance, provider, registry, or Ledger configuration
remains a truthful `BLOCKED` state.

The post-fix review also required preserving a prepared P5 request when Ledger connection fails or
is retried, rejecting cookie mutations with missing origin provenance, and making the reusable API
server fail closed unless its explicit non-production fixture boundary is enabled.

## 2026-09-08 — P9 partner bounty qualification slice

**Tool:** OpenAI Codex using the Rovaulta execution-plan, vertical-slice, partner-compliance, and
verification-loop skills plus official Chainlink CRE and The Graph documentation.

**Human direction:** Continue the product path so the three targeted partner integrations are
load-bearing in normal account flows: CRE for confidential evaluation, The Graph for public registry
context, and the existing Ledger/P5 boundary for human authorization. Preserve fail-closed behavior,
keep P7 fixtures development-only, and do not claim unavailable external execution.

**AI-assisted output:** A request-scoped CRE secret selector and official gateway JSON-RPC/JWT
adapter; public-result, binding, asynchronous-acceptance, network, and no-local-fallback tests; a
from-scratch Sepolia RovaultaRegistry subgraph schema/manifest/ABI/mapping; a server-only Graph
Gateway adapter with exact binding/revocation/expiry checks; account-backed agent target resolution;
the load-bearing Graph context tool/state step; normal release preparation routing through the
account-backed agent; and synchronized architecture, partner, planning, and evidence documentation.

**Evidence boundary:** Local tests use injected provider responses. The current environment has no
deployed CRE gateway/workflow result transport, request-scoped CRE secrets, Graph API key/subgraph
ID, or Gemini provider configuration. Therefore no completed account-created CRE result, live
Graph response, or external model execution is claimed. The existing authenticated CRE CLI
simulation remains simulation evidence only.

## 2026-09-08 — P10 final partner qualification transport

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop skills, with official
Chainlink CRE gateway/HTTP capability documentation and The Graph prize requirements reviewed.

**Human direction:** Close the remaining partner-qualification engineering gap without redesigning
P3, starting P4, fabricating partner evidence, or adding unrelated Ledger/Graph features.

**AI-assisted output:** A versioned canonical CRE result-callback protocol; TEE-only HMAC secret
delivery through the official HTTP capability; account pending-evaluation persistence; exact
site/robot/build/behavior binding and idempotent callback completion; bounded browser polling; and
partner/evidence/task documentation with explicit external blockers.

**Evidence boundary:** Callback tests use local SDK/runtime mocks and an injected API secret. No
deployed CRE callback, live Graph response, external Gemini execution, or physical Ledger evidence
was generated or claimed. Private envelope, blind, policy, callback secret, and credentials remain
uncommitted.

## 2026-09-09 — P11 The Graph qualification implementation

**Tool:** OpenAI Codex using the Rovaulta execution-plan, partner-compliance, and verification-loop
skills plus official The Graph Subgraph Studio/Gateway documentation.

**Human direction:** Implement only the smallest production-quality The Graph qualification path:
build a public Sepolia `RovaultaRegistry` subgraph, consume live provider context in the normal
account-backed deployment agent, preserve P5 authority, add critical tests/evidence hooks, and do
not fabricate hosted deployment or live responses.

**AI-assisted output:** Pinned Graph CLI/AssemblyScript package and reproducible codegen/WASM build;
operator-only Subgraph Studio deploy and redacted live-query scripts; strict server-side provider
validation for public entity identity, bindings, issuer, block metadata, verdict, expiry, and
revocation; account-agent live evidence runner; negative provider/agent tests; and synchronized
README, partner, architecture, planning, evidence, and environment documentation.

**Evidence boundary:** Local Graph build and injected tests pass. The current environment has no
`THE_GRAPH_API_KEY`, hosted `THE_GRAPH_SUBGRAPH_ID`, real indexed account clearance, or Start Fresh
submission proof. No live Graph provider response, subgraph deployment, account-agent trace, or
qualification claim was generated. No private policy, envelope, blind, credential, signature, or
API key was committed.

## 2026-09-09 — P13 first real account-created CRE evaluation

**Tool:** OpenAI Codex using the Rovaulta execution-plan, partner-compliance, and verification-loop
skills plus the official CRE secret/workflow guidance.

**Human direction:** Complete only the normal account-created CRE evaluation path; do not create
fake database rows, bypass CRE, promote P2/P7 fixtures, fabricate a result/clearance, or expose
private policy material.

**AI-assisted output:** A thin two-phase `apps/api` operator path. The account runner registers/signs
in, creates or reuses site/robot/build records through the existing routes, submits the existing
CRE-backed evaluation, polls the owning account result, and optionally writes an allowlisted public
projection. A separate local provisioning command resolves the encrypted site policy through the
application store and passes the exact versioned site secret to the official CRE CLI in memory.
Neither command has a P2/P7, browser-verdict, or signing-authority path, and the secret is never
sent over HTTP or written to evidence.

**Evidence boundary:** The current environment has no CRE CLI, deployed gateway/workflow ID,
trigger signer, request-scoped Vault secret, reachable HTTPS callback, or callback HMAC. The account
runner fails closed before creating records when its operator inputs are absent, and the provisioning
command cannot run without an account/site ID and the official CLI. No account-created evaluation
ID, `CLEAR`, CRE execution evidence, clearance, or confidential value was fabricated.

## 2026-09-09 — P13 authenticated CRE simulation qualification path

**Tool:** OpenAI Codex using the Rovaulta execution-plan, partner-compliance, and verification-loop
skills plus the official CRE CLI simulation contract already recorded in the repository.

**Human direction:** Stop treating live CRE deployment as a Chainlink qualification dependency.
Preserve the P9/P10 confidentiality and callback boundaries, make the official simulation path
reproducible, and never fabricate a simulation result or expose a secret.

**AI-assisted output:** A clean-checkout site-selector fixture generator, the redacted
`apps/api/scripts/cre-simulation-evidence.ts` runner, strict public-response/exact-binding parsing,
CLI-output leakage checks, critical parser tests, and updated partner/planning/evidence documentation.
The runner invokes the existing `handlerInTee` workflow three times and records only safe public
evidence; it has no P2 fallback, live deployment, or signing path.

**Evidence boundary:** The current authenticated CRE CLI run records unsafe `HOLD`, corrected
`CLEAR`, and tampered `REJECT` with the mandatory site-selector boundary in
`docs/compliance/evidence/chainlink-cre-p13-current-authenticated-simulation-2026-09-09.md`.
The runner stores no raw CLI output, envelope, blind, or credential and deletes its temporary secret
directory after execution. Live DON/Vault/Nitro execution and account-created gateway completion
remain unclaimed optional upgrades.

## 2026-09-09 — P13.1 account-owned official CLI simulation mode

**Tool:** OpenAI Codex using the Rovaulta vertical-slice, execution-plan, partner-compliance, and
verification-loop skills.

**Human direction:** Reuse the frozen P13 official CRE simulation to produce an account-owned
evaluation without fabricating records, bypassing strict P1/P9/P10 validation, or claiming live CRE.

**AI-assisted output:** An explicit `ROVAULTA_CRE_EXECUTION_MODE=simulation` application executor
that builds public input from persisted account resources, generates a temporary CRE workflow
`secretsNames` mapping for the exact site selector, passes the confidential payload through the
documented CLI `-e` mechanism, validates the public result and bindings, and persists safe execution
provenance for the existing Sepolia clearance command. It performs a `cre -v`/`cre whoami`
preflight, allows only the official CLI authentication context (including `CRE_API_KEY` when
explicitly supplied), and never logs that credential. Tests cover dynamic selector mapping,
temporary-file cleanup, confidential-output rejection, and clearance construction.

**Evidence boundary:** This change adds no account-owned live result, Sepolia transaction, Graph
match, or Ledger approval evidence. The frozen P13 workflow/handler is unchanged, temporary secret
material is deleted, and an operator must supply real account credentials and run the path before
any account-owned `CLEAR` claim is made.

## 2026-09-09 — P13.1 clean-checkout operator setup flow

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop skills.

**Human direction:** Make the documented account setup command work from a clean checkout without
  redesigning P13. Do not fabricate an evaluation, clearance, live CRE execution, or confidential
  input.

**AI-assisted output:** A tracked non-secret `apps/api/p13-setup.example.json`, an ignored setup
  template generator with owner-only POSIX modes, a shared strict setup-file loader with actionable
  empty/malformed/schema errors, and critical tests that send the exact template through the existing
  account-store site/robot/build validation. The runner now uses that loader and preserves the
  existing account-registration/sign-in, ownership, provenance, and fail-closed behavior.

**Evidence boundary:** The template contains no credentials, secrets, blinds, or private facility
  policy. A real operator must replace the example values locally. Setup-only creates resources
  only; no evaluation, Sepolia transaction, Graph record, or partner evidence is claimed by this
  change.

## 2026-09-09 — P13 operator credential preflight

**Tool:** OpenAI Codex using the Rovaulta verification-loop skill.

**Human direction:** Diagnose the account-evaluation command's password-length failure without
changing P13, exposing credentials, or overwriting the operator's account secret.

**AI-assisted output:** The account runner now validates the API's 12–256 character password bound
before making an HTTP request and reports only an actionable configuration error. A focused test
covers missing, short, maximum-length, and overlong values; the operator password itself is never
logged or included in evidence.

**Evidence boundary:** The existing ignored `.env` remains unchanged. Operators must provide the
existing account password (or a new account credential) that satisfies the API bound; this change
does not reset passwords or create an evaluation.

## 2026-09-09 — P13 stale resource-ID recovery guidance

**Tool:** OpenAI Codex using the Rovaulta verification-loop skill.

**Human direction:** Diagnose the account runner's `Site was not found` failure without bypassing
account ownership or silently creating replacement resources.

**AI-assisted output:** The ID-reuse path now reports an actionable resource-not-found message
without echoing identifiers, and the operator runbook explicitly clears stale ID exports before
setup-only creation in the current API database.

**Evidence boundary:** No account, site, robot, build, evaluation, or clearance was fabricated by
this change. Reuse remains strict: missing or cross-database resources stop the command.

## 2026-09-09 — P13 CRE runner diagnostics and account simulation execution

**Tool:** OpenAI Codex using the Rovaulta verification-loop skill and a read-only reviewer.

**Human direction:** Diagnose the generic `CRE_RESPONSE_INVALID` account-evaluation failure without
weakening the frozen P13 workflow, exposing confidential input, or claiming live CRE execution.

**AI-assisted output:** The official CLI failure now returns bounded command, working-directory,
workflow, target, trigger, exit-code, stdout, and stderr context after redacting credentials and
confidential markers. The temporary account workflow resolves its authoritative CRE artifacts from
the workflow directory, and failure-path cleanup is regression-tested.

**Evidence boundary:** With the authenticated CRE CLI v1.32.0, the existing account/site/robot/build
records produced one persisted `official-cre-cli-simulation` `CLEAR`. The run did not expose the
envelope/blind, did not create a Sepolia clearance, and did not claim live DON execution.

## 2026-09-09 — P14 live Sepolia and The Graph evidence closure

**Tool:** OpenAI Codex using the Rovaulta execution-plan, partner-compliance, and verification-loop
skills plus official The Graph provider documentation.

**Human direction:** Reuse the existing account-owned simulated `CLEAR` and P12/P11 paths. Finish
only legitimate Chainlink, Graph, and Ledger evidence; do not fabricate an evaluation, clearance,
Graph entity, AI output, Ledger signature, or live CRE/DON result.

**AI-assisted output:** A server-only optional Subgraph Studio query path was added alongside the
existing Gateway adapter, with strict endpoint validation, provider labelling, and focused tests.
The real P12 command recorded the stored account-owned `CLEAR` on Ethereum Sepolia and verified both
registry events/readback. The deployed Subgraph Studio endpoint was queried for the exact digest and
the API reader returned `MATCHED`. Redacted public evidence and planning/matrix/runbook updates were
added; no contract, workflow, evaluator, or Ledger authority was changed.

**Evidence boundary:** The Graph artifact contains only public chain/entity/provenance fields. The
live account-agent command stopped before model execution because the external Gemini API key was
absent. No `LEDGER_APPROVAL_REQUIRED`, signature, physical-device, Gateway, decentralized-network,
or live CRE/DON claim is made. Private policy, envelope, blind, credentials, and deploy keys remain
uncommitted.

## 2026-09-10 — Gemini deployment-agent provider migration

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop skills plus official
Google Gen AI SDK documentation.

**Human direction:** Replace the deployment agent's legacy runtime provider with Google AI Studio
Gemini 2.5 Flash without changing the host-owned tool state machine, Graph gate, security rules, or
Ledger authorization boundary.

**AI-assisted output:** The dependency-free provider adapter was replaced by the official
`@google/genai` SDK adapter. It forces exactly the host-selected function, validates the SDK's
single function-call result, defaults to `gemini-2.5-flash`, and keeps `GEMINI_API_KEY` server-side.
Environment, README, planning, evidence, and provider regression tests were updated; no legacy
provider runtime dependency or environment key remains.

**Evidence boundary:** Gemini receives only the existing canonical public deployment request and
public tool observations. Confidential CRE policy/envelope/blind data, credentials, raw model
output, signatures, and Ledger authority remain outside the provider boundary. A real execution
is reported separately according to whether a local `GEMINI_API_KEY` is available.

## 2026-09-10 — Live Gemini account-agent qualification

**Tool:** OpenAI Codex using the Rovaulta verification-loop and partner-compliance guidance plus
the official Google Gen AI SDK already configured in the repository.

**Human direction:** Exercise the real account-owned Sepolia clearance through the live Subgraph
Studio provider and Gemini deployment agent, without changing Chainlink, Graph, Ledger, or the
host-owned authorization boundary.

**AI-assisted output:** The real `apps/api evidence:p11-graph` command used the official Gemini SDK
and made seven host-validated function calls: target resolution, context lock, evaluation, Graph
context, clearance inspection, `prepareDeploymentIntent`, and Ledger status. The exact live Graph
entity was `MATCHED`; the final public result was `LEDGER_APPROVAL_REQUIRED`.

The evidence run used `gemini-3.5-flash` through the explicit server-side `GEMINI_MODEL` override
because this API key rejects the repository default `gemini-2.5-flash` as unavailable to new users.
No fallback, mock, signing, or authorization capability was introduced. Physical Ledger and Clear
Signing evidence remain unperformed and are not claimed.

**Evidence:** [`p15-live-gemini-graph-ledger-boundary-2026-09-10.md`](../compliance/evidence/p15-live-gemini-graph-ledger-boundary-2026-09-10.md).

## 2026-09-11 — Ledger Speculos browser-boundary evidence

**Tool:** OpenAI Codex using the Rovaulta partner-compliance and verification-loop skills plus the
official Ledger Speculos, DMK, Device Transport Kit, Context Module, and Ethereum Signer Kit
packages already pinned in the repository.

**Human direction:** Exercise the existing `/p5-ledger` flow against the official emulator without
physical Ledger hardware, origin-token bypasses, blind signing, or changes to the authorization
architecture.

**AI-assisted output:** A clean WSL2 Speculos process was started with the checksum-verified public
Ethereum app. The repository smoke command and authenticated browser connection completed; the
exact public release intent reached the Sepolia pre-sign gate, and a public build-digest mutation
was rejected before signer invocation. The valid path failed closed at `CLEAR_SIGNING_UNAVAILABLE`
because the Ledger-issued origin/accepted-descriptor path is unavailable. No signature,
`ReleaseAuthorization`, physical-device, or Secure Element claim was added.

**Evidence:** [`p5-ledger-speculos-browser-boundary-2026-09-11.md`](../compliance/evidence/p5-ledger-speculos-browser-boundary-2026-09-11.md).

## 2026-09-11 — Final submission preparation and Graph pool declaration

**Tool:** OpenAI Codex using the Rovaulta partner-compliance and verification-loop guidance.

**Human direction:** Publish only the finished implementation, record the maintainer's ETHOnline
2026 Start Fresh / From Scratch declaration, and do not add product features or claim physical Ledger
or live CRE capabilities.

**AI-assisted output:** Added the explicit project-origin evidence artifact, reconciled the Graph
partner contract, current-state/task board, README, and evidence matrix, and verified tracked-secret
hygiene before publication. No runtime, contract, workflow, evaluator, Graph provider, Gemini, or
Ledger behavior changed.

**Evidence boundary:** The Start Fresh statement is a maintainer declaration corroborated by the
repository's first commit and chronology; the event submission record remains the authoritative
external eligibility material. The 2–4 minute demo remains an unrecorded submission asset.

## 2026-09-11 — Final three-bounty qualification audit

**Tool:** OpenAI Codex using the Rovaulta partner-compliance and verification-loop guidance.

**Human direction:** Audit only the selected Chainlink, The Graph, and Ledger prizes; preserve the
existing authority boundaries; do not fabricate live CRE, Graph, or Ledger evidence.

**AI-assisted output:** Reconciled the judge-facing README and evidence matrix with the captured
P13/P14/P15 and Speculos evidence, and aligned `.env.example` with the repository's documented
Gemini default. No runtime, contract, workflow, evaluator, Graph, or Ledger behavior changed.

**Evidence boundary:** The audit keeps Subgraph Studio distinct from Gateway, CRE simulation distinct
from live DON execution, and Speculos distinct from physical Ledger evidence. The remaining
submission blockers are documented rather than hidden.

## 2026-09-11 — P16 live CRE deployment boundary

**Tool:** OpenAI Codex using the Rovaulta CRE execution-plan, partner-compliance, and verification-loop
skills plus the official Chainlink CRE deployment and HTTP-trigger documentation.

**Human direction:** Deploy the existing `handlerInTee` workflow now that Deploy Access is enabled,
exercise the real account gateway path, preserve simulation as an explicit regression path, and never
fabricate a workflow ID, execution, callback, or verdict.

**AI-assisted output:** Selected the private registry explicitly, deployed the existing workflow with
the official CRE CLI, recorded its active workflow identity, added bounded public gateway diagnostics,
and exercised the existing signed account request. The enterprise gateway returned a workflow-lookup
error before execution, so no live result or callback was persisted and no confidential data was
captured.

**Evidence boundary:** The private-registry deployment is real and active, but live DON/Vault/Nitro
execution remains blocked by Chainlink-side workflow visibility or Confidential Workflow access. The
authenticated P13 simulation evidence remains separate and unchanged.

**Evidence:** [`chainlink-cre-p16-live-deployment-2026-09-11.md`](../compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md).

## 2026-09-12 — Authentication and ownership hardening

**Tool:** OpenAI Codex using the Rovaulta execution-plan and verification-loop guidance plus a
separate read-only security-review task.

**Human direction:** Re-audit the original authentication prompt from the current repository state,
then complete sign-in, registration, session persistence, redirects, sign-out, server-side account
ownership, and user-data isolation without trusting browser state.

**AI-assisted output:** Added session-aware `/start` entry routing, safe internal continuations,
non-cacheable account responses, explicit sign-out failure handling, account-owned legacy release
nonces, cross-account regression coverage, and an authenticated/versioned Ledger handoff. The
explicit development fixture remains separately gated; no production auth bypass was added.

**Evidence boundary:** Local API/browser tests and repository verification prove the implemented
behavior in this checkout. They do not prove external deployment identity, physical Ledger approval,
or real-world robot safety.

## 2026-09-12 — Independent CRE private-gateway probe

**Tool:** OpenAI Codex using the official CRE v1.33.0 HTTP-trigger documentation and a standalone
signed request harness.

**Human direction:** Isolate the deployed private workflow gateway failure without changing
Rovaulta code, redeploying, fabricating an execution, or invoking the callback.

**AI-assisted output:** Sent one schema-valid public trigger directly to the documented private
enterprise gateway using the deployed workflow ID and matching authorized signer. The gateway
returned `HTTP 400 / JSON-RPC -32600 Workflow not found`; `cre execution list` remained empty.

**Evidence boundary:** The direct reproduction rules out the Rovaulta request implementation as the
cause. No JWT, private key, fixture contents, confidential payload, callback, or execution result
was recorded.

**Evidence:** [`chainlink-cre-p16-live-deployment-2026-09-11.md`](../compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md).

## 2026-09-11 — P16 deployment identity follow-up

**Tool:** OpenAI Codex using the official CRE CLI v1.33.0 and Chainlink private-workflow trigger
documentation.

**AI-assisted output:** Rechecked the private-registry workflow from the control plane and UI,
reproduced the deployed binary/config/workflow hashes from the tracked staging config, compared the
public trigger signer, and sent an independent minimal signed gateway request. The gateway returned
the same pre-execution `Workflow not found` error and no execution was created. The staging config
was aligned with the active deployment without redeploying or exposing any key or confidential input.

**Evidence boundary:** This follow-up rules out local workflow identity, target, signer, and source
configuration drift but does not prove live CRE execution. Vault consent, site-secret provisioning,
callback configuration, and Chainlink private-gateway visibility remain external prerequisites.

**Evidence:** [`chainlink-cre-p16-live-deployment-2026-09-11.md`](../compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md).
