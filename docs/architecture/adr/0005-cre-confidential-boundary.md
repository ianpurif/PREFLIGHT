# ADR-0005: CRE Confidential Evaluation Boundary

- Status: Accepted
- Date: 2026-09-05

## Context

P3 must execute the unchanged deterministic P2 evaluator over a private site envelope while allowing later public phases to bind an evaluation to exact P1 identifiers. The CRE TypeScript runtime is WASM/QuickJS rather than Node, Confidential Workflows are currently private beta, and public HTTP input, workflow configuration, binaries, logs, and DON crossover calls are not confidential.

## Decision

Use `@chainlink/cre-sdk` 1.19.1 with one authenticated HTTP trigger registered by the official `handlerInTee` API. Require Nitro in `us-west-2`. Fetch exactly `PREFLIGHT_CONFIDENTIAL_EVALUATION_INPUT` from the `main` secret namespace using a compile-time fixed selector, and make no ordinary capability calls from the handler.

The public request schema `preflight.cre-public-evaluation-request/v1` contains:

- `preflight.protocol/v1`
- the exact P1 `EvaluationRequest`
- exact P1 `RobotBuildDescriptor`
- the supplied P2 `RobotBehaviorTraceSuite`
- explicit `evaluatedAt`
- `SYNTHETIC_CALLER_SUPPLIED` provenance
- a `preflight.digest.cre-behavior-input/v1` SHA-256 digest

The behavior digest uses P1 canonical UTF-8 bytes and covers the normalized wrapper version/protocol, request, build descriptor, full trace suite, provenance marker, and evaluation time. It is public-input integrity, not remote provenance.

Scenario identifiers in the trace suite are public because P2 requires them to bind each trace to exact committed scenario coverage. The current synthetic demo uses readable identifiers, which disclose scenario taxonomy but no private geometry, thresholds, rule configuration, or blind. Production facilities should use opaque scenario identifiers when even that taxonomy is sensitive.

One atomic confidential JSON secret uses schema `preflight.cre-confidential-evaluation-input/v1` and contains the validated full P2 `ConfidentialEvaluationEnvelope` plus exactly 32 blind bytes encoded as 64 lowercase hexadecimal characters. The handler caps this demo secret at 2 KiB before parsing.

Inside the TEE callback, strict parsing occurs before the existing `evaluateSimulation` call. P2 reconstructs and checks the blinded P1 safety-envelope commitment before generating/evaluating scenarios. The integration never duplicates rule or verdict logic.

Success schema `preflight.cre-public-evaluation-result/v1` returns only:

- protocol/schema version, so downstream consumers cannot confuse semantics
- `status: EVALUATED`, separate from P1 verdicts
- the unchanged P1 `EvaluationResult`, required for exact site/robot/build/envelope/evaluator/verdict/time binding
- the behavior-input digest, required to bind the response to the supplied synthetic behavior
- the provenance marker, required to prevent stronger origin claims

It omits counts, violations, scenario findings, geometry, rules, thresholds, blind, and private-evidence digests. Failure schema `preflight.cre-public-evaluation-error/v1` returns only protocol/schema version, `status: REJECT`, and a fixed broad code. The handler does not log, expose caught diagnostics, use a public/local fallback, or call `usingTheDons`/`reportFromDon`.

## Consequences

- The private envelope and blind are load-bearing and remain inside the confidential path.
- CLI v1.32.0's simulator passed empty configuration to the optional pre-hook phase, preventing handler execution. P3 follows the current official confidential TypeScript template shape without that optional hook; the fixed secret selector and absence of other capability calls remain enforced in source and tests.
- Later phases can use the exact P1 result without changing P1 schemas or P2 semantics.
- Chosen-input verdict queries remain a possible oracle; authenticated submission and minimal output reduce but do not eliminate it. Later orchestration owns authorization/rate policy.
- The atomic demo secret is known to be 1,506 ASCII characters, but fit within Vault ciphertext quotas must be proven with authenticated tooling before deployment. Maximum-shape P2 envelopes are not supported by this P3 adapter claim.
- An authorized submitter can fabricate well-formed traces. The digest proves which supplied bytes were evaluated, not that the declared artifact or a physical robot produced them.
- CRE CLI simulation, live Nitro execution, Vault custody, DON consensus, registry clearance, and remote attestation are distinct evidence levels. P3 has authenticated simulation evidence only; no later evidence level may be inferred from it.
