# Current State

## Phase
**P1 complete; P2–P8 intentionally not started.**

## What exists
- all B0 boilerplate/tooling and specialized agentic harness
- canonical prefixed/branded site, robot, build, envelope, evaluator, evaluation, and clearance identifiers
- strict versioned schemas for build, envelope metadata, evaluation inputs/request/result, clearance, and deployment intent
- Preflight Canonical JSON v1 + deterministic UTF-8/SHA-256 domain-separated digests
- secret-blinded safety-envelope commitment semantics
- pure evaluation/clearance/deployment binding assertions and negative/golden-vector tests
- type-only scaffold consumers aligned to the canonical domain protocol

Detailed decisions and evidence: `docs/architecture/adr/0003-canonical-protocol.md` and `docs/planning/exec-plans/P1-domain-protocol-foundation.md`.

## Next exact task
Wait for explicit authorization to implement **P2 — Deterministic simulator/evaluator**. Do not begin P2 autonomously.

P2 should consume the P1 `EvaluationInputs`/request/result types and must not change canonical digest semantics without a deliberate new protocol version.

## Environment status
Bun 1.4.1 and Foundry 1.8.1 are available. The complete `bun run verify` gate passes. The Foundry scaffold currently reports no contract tests, as expected before P4; P1 adds no contract logic.
