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
