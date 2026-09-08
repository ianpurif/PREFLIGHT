# AI Usage Log

## 2026-09-05 — Boilerplate generation

**Tool:** OpenAI Codex-oriented ChatGPT workflow.

**Human direction:** The user supplied the event constraints, selected product concept (Preflight), selected partners (Chainlink + Ledger), and explicitly requested a development boilerplate/agentic harness without product implementation.

**AI-assisted output:** Repository structure, stack recommendation, `AGENTS.md` hierarchy, project-local skills, Codex subagent profiles, architecture/planning/compliance docs, app/integration/contract scaffolds, CI, verification scripts, and worktree workflow.

**Not implemented:** confidential evaluation logic, robot simulation/evaluator behavior, smart-contract clearance logic, Ledger signing behavior, release logic, and final demo functionality.

Add future material AI-assisted changes as dated entries. Do not claim fully human-authored code where Codex generated or substantially rewrote it.

## 2026-09-05 — Boilerplate verification repair

**Tool:** OpenAI Codex.

**Human direction:** Repair only the pre-implementation development harness: update Biome 2.5 configuration/exclusions, format existing scaffold files, allow intentionally empty workspace test packages, and run the requested verification gates without weakening them.

**AI-assisted output:** Biome configuration and generated-output hygiene, package test-script maintenance, mechanical formatting, execution-plan/verification evidence, and command-based validation.

**Not implemented:** P1 or later product behavior, simulator/evaluator logic, Chainlink workflow logic, contract product logic, Ledger behavior, frontend features, or architecture changes.

## 2026-09-05 — P1 domain and protocol foundation

**Tool:** OpenAI Codex with read-only Preflight architecture, exploration, verification, and review specialists.

**Human direction:** Implement only P1: canonical identifiers, minimum protocol schemas, deterministic canonical serialization and digests, runtime validation/failures, exact clearance/deployment bindings, tests, and protocol documentation.

**AI-assisted output:** `@preflight/domain` implementation and tests, type-only consumer alignment, ADR-0003, planning/security/evidence updates, adversarial review, and command-based verification.

**Not implemented:** P2 evaluation logic, P3 CRE/TEE behavior, P4 contract state, P5 Ledger/EIP-712 behavior, P6 UI, AI agents, or additional partners.

## 2026-09-05 — P2 deterministic simulator/evaluator

**Tool:** OpenAI Codex with read-only Preflight architecture, portability, test, verification, and adversarial-review specialists.

**Human direction:** Implement only P2: a pure fixed-unit warehouse model, committed deterministic scenarios, structured restricted-zone/speed/payload rules, build-declared materialized traces, deterministic evidence/verdicts, demo fixtures, tests, and documentation.

**AI-assisted output:** `@preflight/simulation-core` implementation and tests, ADR-0004, execution plan, security/risk/evidence updates, adversarial review, and command-based verification.

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

**Tool:** OpenAI Codex with read-only Preflight architecture, contract-surface, test-gap, verification,
and adversarial-review specialists.

**Human direction:** Implement only P4: a minimal public Solidity registry for exact P1 clearance
bindings, authorized registration, strict expiry, monotonic revocation, stable reads, extensive
Foundry coverage, Sepolia deployment readiness, and truthful separation from P3 simulation.

**AI-assisted output:** `PreflightRegistry`, dependency-free Foundry test harness, unit/fuzz/stateful
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
and its display harness cannot supply Preflight's separate application origin/accepted-descriptor
context or preserve the signature. The implicit direct-tester token and blind signing were not used.
Case C and invalid/unregistered D passed before signer invocation; revoked/expired D remain
test-only. No deployment-intent signature, `ReleaseAuthorization`,
Speculos A/B/E/F result, physical Ledger/Secure Element claim, live contract write, autonomous
agent, or P6 behavior is claimed.

## 2026-09-07 — P5.2 AI deployment-agent closure

**Tool:** OpenAI Codex using the project execution-plan, vertical-slice, Ledger
partner-compliance, verification-loop, and handoff skills; the official OpenAI function-calling
guide; and read-only architecture, seam, partner, and adversarial-test specialists.

**Human direction:** Implement only P5.2: a narrow real tool-calling deployment agent that resolves
an exact public target, inspects evaluation/live Sepolia clearance state, reuses the existing P5
preparation authority, stops at Ledger, records a public audit, resists model/tool injection, and
does not begin P6 or redesign P1–P5.1.

**AI-assisted output:** Host-owned six-tool state machine; strict public deployment catalog; real
OpenAI Responses function-calling adapter over `fetch`; exact P5 authorization-status correlation;
agent prepare/status API routes; local deterministic and live read-only Sepolia evidence runners;
provider/orchestration/adversarial/leakage tests; scaffold transition; ADR-0008; and planning,
architecture, security, Ledger, compliance, verification, and handoff documentation.

The final adversarial review found that broad request text could become provider/audit input and that
alias containment could accept a negated second target. Those findings were fixed by restricting
requests to whole catalog-generated public forms, discarding raw submitted text, sending only the
canonical public projection with Responses `store: false`, and requiring the first model tool call
to resolve to the host-selected catalog entry. Negative tests cover both cases.

**Authority boundary:** Model output is never a safety, eligibility, signing, or authorization
decision. The model has no registry-write, Ledger-signing, signature, consumption, arbitrary-chain,
network, shell, or filesystem tool. Existing P2/Chainlink results inform public status,
`ReleaseService.prepare()` decides eligibility, the browser Ledger path remains the human gate, and
only the existing cryptographic P5 consume result can produce `AUTHORIZED`.

**Evidence boundary:** Positive Build B evidence uses a clearly labeled deterministic registry
fixture; the live Sepolia agent trace is read-only and blocks the existing unregistered fixture.
No external model execution was captured because `OPENAI_API_KEY` and
`PREFLIGHT_AGENT_MODEL` were unavailable. No Speculos signature, physical Ledger/Secure Element,
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

**Tool:** OpenAI Codex using the Preflight execution-plan and verification-loop skills plus
read-only architecture and test-gap reviewers.

**Human direction:** Make the existing P6 judge path reproducible and resettable without starting
P8, adding product/robot execution, or changing P1–P6 authority semantics.

**AI-assisted output:** A fixed-clock offline P2/P5.2 rehearsal fixture, demo-owned setup/reset/run
commands, an optional test/demo nonce seam with the production random default unchanged, API
development startup that remains explicitly unavailable without live RPC, dashboard reset/stale
response guards, deterministic Playwright sequence coverage, and synchronized P7 planning/evidence
documentation.

**Boundary:** The rehearsal uses a scripted model and deterministic local registry reader. It is
not live OpenAI, Sepolia, Chainlink CRE, Ledger, or Speculos execution. B stops at
`LEDGER_APPROVAL_REQUIRED` and C stops at `CLEARANCE_BINDING_MISMATCH`; no signature, nonce
consumption, registry write, authorization, confidential envelope, or robot activation is produced.

## 2026-09-08 — P8 real product lifecycle and UI correction

**Tool:** OpenAI Codex using the Preflight execution-plan and verification-loop skills plus the
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

**Tool:** OpenAI Codex with a required read-only Preflight reviewer.

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
