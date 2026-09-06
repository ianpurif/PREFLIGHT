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
