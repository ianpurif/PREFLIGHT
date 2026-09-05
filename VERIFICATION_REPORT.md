# P2 Verification Report

**Date:** 2026-09-05
**Scope:** P2 deterministic simulator/evaluator only; P3–P8 behavior intentionally absent.

## Passed in the development environment

- `@preflight/simulation-core` `bun test` — **60 passed, 0 failed, 1,385 assertions** across four files.
- `@preflight/domain` `bun test` — **30 passed, 0 failed, 676 assertions**; P1 remains green and unchanged.
- simulation-core `bun run typecheck` and `bun run build` — pass.
- `bun run lint` — Biome 2.5.12 checked **60 files** with no diagnostics.
- `bun run typecheck` — **7/7 workspace tasks pass**.
- `bun run test` — **9/9 Turbo tasks pass**; 90 real tests run across domain and simulation-core, while legitimately empty packages retain `--pass-with-no-tests`.
- `bun run build` — **7/7 workspace tasks pass**, including the Next.js production build.
- `bun run contracts:test` — passes with Foundry 1.8.1; the pre-P4 contract scaffold reports no tests.
- `bun run verify:scaffold` — structure, manifests, product guardrails, secret checks, context budgets, and all **3/3** scaffold tests pass.
- `bun run verify` — passes end to end, including Foundry and scaffold verification.
- `git diff --check` — passes.

## Determinism and negative evidence

- xorshift32 sequence, scenario content/order, and the unsafe report have locked golden vectors/fingerprints.
- 250 repeated evaluations and key/collection reordering produce the same canonical report.
- closed-segment tests cover crossings, all zone edges/corners, diagonal tangency, collinear overlap, vertical/reversed paths, degenerate outside points, one-millimetre misses, and maximum coordinates.
- site/zone speed and payload thresholds cover below, equality, and above cases.
- malformed fixed units, objects, versions, rectangles, identifiers, rules, traces, scenario coverage, commitment blinds, evaluator versions, and exact P1 build/envelope bindings fail closed.
- the accepted maximum v1 shape (16 scenarios × 16 rules × 32 trace steps) remains canonically serializable; 33-step traces are rejected explicitly.

## Adversarial review

Valid findings fixed before the final run included closed-segment geometry coverage, exact same-family evidence ordering, a true unknown-scenario branch test, exact evidence/golden output checks, and structural bounds that keep worst-case reports inside P1 canonicalization limits.

The review also rejected equating P1's robot software artifact digest with runtime trace bytes. P2 therefore validates declared build metadata and exact scenario coverage without inventing a competing provenance digest. Authentic proof that a declared build produced a trace is correctly documented as a P3 trust-boundary requirement.

## Environment blockers

None for P2 verification. Foundry is installed and ran successfully; the absence of contract tests is expected before P4.

## Phase boundary

No Chainlink workflow/TEE handler, confidential output adapter, contract product logic, Ledger/EIP-712 behavior, API orchestration, frontend/digital twin, robotics middleware/hardware, AI model, or additional partner was added. P2 does not claim physical or universal robot safety.
