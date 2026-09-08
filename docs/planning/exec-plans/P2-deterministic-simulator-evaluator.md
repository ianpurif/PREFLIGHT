# P2 — Deterministic Simulator/Evaluator

## Outcome

`@rovaulta/simulation-core` provides a pure, synchronous, fixed-unit warehouse evaluator. It validates a P1 evaluation request, the exact committed safety envelope, a deterministic scenario suite, and materialized robot traces carrying exact declared build metadata; then it returns the unchanged P1 `EvaluationResult` plus deterministic internal violation evidence.

## Non-goals

- Chainlink CRE workflow, `handlerInTee`, secrets adapter, or confidential-output filtering
- physics, swept-volume collision, continuous-time motion, ROS, hardware, or AI/model inference
- Solidity, Ledger, EIP-712, API orchestration, UI, or digital-twin rendering
- changing P1 identifiers, canonical serialization, digest framing, or schema versions
- certifying universal or physical robot safety

## Invariants

- `CLEAR` means zero violations in this exact declared suite and envelope; any violation deterministically yields P1 `HOLD`. P2 never emits `ESCALATE`.
- Rules and traces use signed millimetres, non-negative millimetres/second, and non-negative grams as safe integers; security-relevant comparisons do not use floating point.
- An axis-aligned zone is closed: every edge and corner is inside. P2 evaluates each sampled point and the closed straight segment between consecutive points for a point-sized robot; physical footprint/swept-volume dynamics remain deferred.
- The private envelope is recomputed against the P1 site/envelope commitment using the supplied 32-byte blind before evaluation.
- Every materialized trace suite declares the exact P1 robot ID, build ID, and build digest; scenario IDs are unique and exactly cover the validated suite. Authentic trace provenance is explicitly deferred to P3.
- No clock, entropy, network, filesystem, locale, environment, concurrency, rendering, or partner API can influence evaluation.
- Violation ordering is total and documented: scenario suite order, step index, fixed rule-family rank, then lexically sorted rule ID.
- V1 accepts at most 16 scenarios, 16 rules, and 32 steps per trace so every accepted maximum-shape report remains within P1 canonicalization limits.
- Outputs are fresh deeply frozen plain data and remain valid P1 canonical values.

## Change surfaces

- `packages/simulation-core/src/model.ts`: fixed-unit warehouse/envelope/scenario/trace/rule types and strict validation
- `packages/simulation-core/src/scenarios.ts`: specified uint32 PRNG and deterministic generation
- `packages/simulation-core/src/evaluator.ts`: binding checks, rule evaluation, evidence ordering, P1 result construction
- `packages/simulation-core/src/fixtures.ts`: synthetic unsafe/corrected demo builds using one envelope/suite
- `packages/simulation-core/src/index.ts`: public P2 exports
- `packages/simulation-core/test/**`: boundary, negative, property, golden, reproducibility, and fixture tests
- simulation package scripts/tsconfigs plus planning, architecture, security, evidence, AI-usage, and verification docs

## Acceptance checks

- Restricted-zone entry fails; all zone edges/corners count inside; points one millimetre outside do not.
- Site/zone speed below or equal to the maximum passes; above fails; zone limits apply only inside that zone.
- Payload equal to the threshold passes; greater-than activates the zone prohibition.
- Overlapping applicable rules can produce multiple findings with stable ordering.
- The specified PRNG has a golden vector; identical seed/config yields byte-identical suites; a tested alternate seed changes valid content/order.
- Strict parsers reject floats, unsafe integers, invalid rectangles, duplicate IDs, unknown fields, malformed traces, missing/extra scenarios, and build/envelope binding mismatches.
- Repeated evaluation and key-reordered wire objects produce canonically identical reports.
- The synthetic unsafe build deterministically yields `HOLD`; the corrected build yields `CLEAR` for the same envelope and scenario suite.
- Domain tests and all repository verification gates remain green; independent adversarial review has no unresolved valid finding.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Specialist agents perform read-only architecture, surface, portability, test-gap, and final-diff reviews. The primary agent owns all writes in the existing working tree; no parallel write is authorized.

## Risks and rollback

- Geometry ambiguity: constrain P2 to inclusive axis-aligned rectangles and closed straight segments between sampled points; document that footprint, dynamics, and localization behavior are deferred.
- Numeric drift: accept only bounded safe integers in fixed units and use integer comparisons.
- Seed drift: specify the exact uint32 PRNG and lock it with golden vectors rather than using `Math.random()`.
- Behavior substitution: evaluate validated materialized traces, not arbitrary callbacks, so external producers cannot change verdict mechanics. P3 must authenticate that traces came from the declared build before making a stronger provenance claim.
- P1 mismatch: recompute the envelope commitment, bind traces to the exact build, construct the P1 result, and run `assertEvaluationResultBindings`.
- CRE incompatibility: use plain TypeScript/ES2022 data and no runtime APIs or new dependencies; actual QuickJS execution remains P3 evidence.

Rollback is confined to P2 simulation-core modules/tests and corresponding documentation; no partner, contract, API, UI, or hardware state is introduced.

## Decisions / deviations

- P1 already requires `CLEAR | HOLD | ESCALATE`, so P2 uses `CLEAR` for zero violations and deterministic `HOLD` for one or more violations. Adding `DENY` would require an unjustified P1 protocol version change.
- The detailed P2 report wraps, rather than extends, the exact P1 `EvaluationResult` schema.
- The envelope commitment payload is exactly the validated P2 envelope body excluding the public site/envelope IDs; the P1 commitment function supplies those bindings and its own commitment schema frame.
- Rules carry stable `rule:` identifiers and are normalized lexically. Zone identifiers use local `zone:` values and scenario identifiers use local `scenario:` values.
- Scenario generation uses an explicitly specified uint32 xorshift algorithm and deterministic Fisher-Yates ordering; generation has no external entropy.

## Verification evidence

- simulation-core: 60 tests passed, 0 failed, 1,385 assertions; package typecheck/build passed
- domain regression: 30 tests passed, 0 failed, 676 assertions
- root lint/typecheck/test/build, Foundry contract test, scaffold verification, full `bun run verify`, and `git diff --check` passed
- independent completion review found no unresolved computation, geometry, determinism, canonicalization, portability, or phase-scope blocker
- review disposition: authentic build-to-trace provenance remains an explicit P3 trust-boundary precondition; P2 does not redefine the P1 software digest or claim arbitrary trace JSON proves build execution
