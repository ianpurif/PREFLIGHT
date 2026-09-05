# ADR-0004: Deterministic Warehouse Evaluator v1

**Status:** Accepted for P2

## Decision

`@preflight/simulation-core` implements evaluator `evaluator-version:warehouse-rules-v1` as a pure synchronous TypeScript computation. It consumes a validated P1 request/build, the exact committed confidential envelope, a secret commitment blind, and materialized traces declaring that build metadata. It returns an unchanged P1 `EvaluationResult` inside a full `InternalEvaluationReport`.

P2 `CLEAR` means only that this exact declared build binding produced zero rule violations across this exact deterministic simulated suite and envelope. It is not universal or physical-safety certification.

## Fixed-unit warehouse model

- Coordinates are signed integer millimetres, bounded to `-10,000,000..10,000,000` on each axis.
- Speed is integer millimetres/second in `0..1,000,000`.
- Payload is integer grams in `0..1,000,000,000`.
- Fractions, negative zero, unsafe integers, invalid ranges, and degenerate rectangles are rejected.
- These coordinate bounds keep the segment-orientation cross products exactly within JavaScript's safe-integer range.
- Warehouse and zone rectangles are positive-area, axis-aligned, and closed. Every edge and corner is inside.
- The robot is modeled as a point moving along closed straight segments between sampled trace steps. P2 does not model robot footprint, acceleration, dynamics, swept volume, timing, localization error, or obstacle physics.
- Both trace endpoints must be inside the closed warehouse bounds. Since the warehouse rectangle is convex, their connecting segment also remains inside.
- V1 bounds the confidential envelope/trace shape to 128 zones, 16 rules, 16 scenarios, and 32 steps per trace. These limits keep accepted inputs and maximum structured reports below P1 canonicalization's 10,000-node limit.

Step zero is a point observation. For every later step, the segment from the previous point to that step is the observation, and the arrival step's `speedMmPerSecond` applies to the whole segment. Integer-exact segment/rectangle intersection prevents a path from tunneling through a zone merely because both endpoints are outside.

## Rule semantics

Rules are structured data; scripts and dynamic evaluation are not accepted.

- `restricted-zone`: the first point/segment touching or crossing the named closed zone violates.
- `site-speed-limit`: `speed <= maximum` passes and `speed > maximum` violates everywhere.
- `zone-speed-limit`: the same comparison applies only when the point/segment touches or crosses the named closed zone.
- `payload-zone-restriction`: activates only when `payloadGrams > payloadGreaterThanGrams`; equality does not activate it. Once active, touching or crossing the named closed zone violates.

Every applicable rule is evaluated without short-circuiting. At most the earliest violation is retained per scenario/rule. Evidence is ordered by generated scenario order, first violating step, fixed rule-family rank, then rule ID using ECMAScript code-unit comparison. Zone/rule/template/trace input collections that are semantically unordered are normalized before use.

## Scenario determinism

The complete scenario generator configuration is part of the committed confidential envelope. Templates carry stable `scenario:` IDs, base payload, and symmetric integer payload variation. Templates are normalized by scenario ID before generation.

Generator `preflight.xorshift32-scenarios/v1` requires a non-zero uint32 seed and advances state exactly as follows:

```text
x ^= x << 13
x ^= x >>> 17
x ^= x << 5
output = x >>> 0
```

Each template consumes one output and uses integer modulo to select a payload offset in the inclusive configured range. A Fisher-Yates permutation then consumes additional outputs to establish suite order. Golden vectors lock the PRNG, payloads, and demo ordering. No system entropy or `Math.random()` is used.

## Binding and result semantics

Before rule evaluation, P2:

1. strictly parses and copies every input;
2. requires the request evaluator version to equal the implemented evaluator literal;
3. recomputes the P1 safety-envelope commitment over envelope version, bounds, zones, rules, scenario seed/config/templates, and the supplied blind;
4. uses P1 binding checks to verify the exact site, envelope, robot, build descriptor/digest, and evaluator inputs;
5. requires the materialized trace suite to repeat the exact robot/build ID and digest and exactly cover generated scenario IDs;
6. constructs the strict P1 result with the request's exact bindings and explicit caller-supplied evaluation time, then validates it against the request.

The mechanical verdict mapping is `CLEAR` for zero violations and `HOLD` otherwise. Evaluator v1 never emits `ESCALATE`; it does not create a clearance.

Trace bindings establish declared association, not cryptographic proof that a proprietary software artifact produced those traces. Authentic trace provenance is an explicit evaluator precondition, not a claim P2 can validate from raw JSON. The P1 software-artifact digest is never redefined as a trace digest. Demo traces are explicitly synthetic fixture policies. P3 must reject arbitrary caller-supplied trace JSON and establish trusted trace provenance before using this core in a clearance-authoritative workflow or making a stronger build-execution claim.

## Confidentiality and portability posture

The full report contains private geometry/rule evidence and is named internal. P2 performs no logging or filtering. P3 must execute the evaluator inside the confidential boundary and define the minimal public result separately; it must not forward this report wholesale.

Simulation source compiles with ES2022 and no ambient Node/Bun/browser types. It uses no network, filesystem, environment, clock, locale, worker, native-module, or partner API. This is a portability posture, not proof of Chainlink CRE/QuickJS execution; that proof remains P3.

## Versioning

Any semantic change to fixed units, geometry, boundary inclusion, segment speed, PRNG, payload generation, rule comparison, evidence selection/order, or verdict mapping requires a new evaluator-version identifier and refreshed golden vectors. P1 schemas and digests are unchanged by P2.
