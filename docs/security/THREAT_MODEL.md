# Threat Model Seed

## Assets
- confidential facility safety envelope
- proprietary robot policy/build artifacts
- exact build/site commitments
- clearance integrity
- Ledger-backed release authority
- audit/evidence trail

## Adversaries / failures
- malicious or compromised orchestrator
- vendor trying to reuse a clearance for another build
- operator trying to bypass human approval
- accidental confidential logging
- replayed/stale approvals
- evaluator/version mismatch
- compromised UI presenting one intent while signing another
- nondeterministic simulator creating irreproducible outcomes

## Required future test families
- mismatch/replay/expiry/revocation tests
- confidential logging tests
- canonical digest golden vectors
- deterministic simulation property tests
- contract fuzz/invariant tests
- frontend intent-display vs signed-payload consistency

## P1 controls established

- exact, type-prefixed identifier parsing
- strict schema versions and rejection of unknown/unhashed fields
- canonical serialization negative tests and SHA-256 golden vectors
- secret-blinded private-envelope commitments
- exact result/request, clearance/result, and deployment-intent/clearance binding checks
- nonce and bounded intent expiry fields for later replay enforcement

Current-time validity, revocation, nonce consumption, authorized-signer checks, and EIP-712 domain separation remain P4/P5 controls. This document is still a seed, not a completed security review.

## P2 controls established

- full private envelope—including geometry, rules, scenario seed/config/templates—is recomputed against the P1 blinded commitment before evaluation
- materialized traces must exactly match robot/build ID and digest and exactly cover the generated scenario suite
- one concrete evaluator-version literal locks fixed-unit, geometry, rule, ordering, PRNG, and verdict semantics
- bounded integer units and exact closed-segment/rectangle intersection avoid floating tolerances and waypoint tunneling
- deterministic generation/order and explicit time remove clock, locale, entropy, filesystem, and network influence
- the strict P1 result remains minimal while detailed evidence is named and typed as an internal report

P2 cannot prove that a materialized trace was authentically produced by the declared proprietary artifact, and its point-robot simulation is not physical validation.

## P3 controls established

- real SDK `handlerInTee` registration constrained to Nitro/us-west-2
- authenticated HTTP-trigger configuration, one compile-time fixed secret selector, and zero ordinary capability calls from the handler
- one atomic versioned secret containing the full private envelope and commitment blind
- strict, bounded public/confidential parsing and exact P1/P2 binding validation
- unchanged P2 evaluator execution, including commitment reconstruction before rule evaluation
- domain-separated canonical behavior-input digest binding the response to the exact supplied public request/traces
- field-by-field public result allowlist and fixed redacted failure schemas
- no TEE logging, no private error messages/paths, and no DON crossover calls
- adversarial tests for private-value leakage, tampering, substitution, deterministic output, and unavailable secrets
- actual SDK and CRE CLI compilation plus authenticated simulation of the transitive P1/P2 source

Residual risks: an authorized caller can make chosen-input queries and may infer information from verdicts; rate/access policy is outside this stateless workflow. The behavior digest does not prove trace origin. Authenticated CLI simulation is not deployed Nitro, hardware-enclave execution, production Vault custody, DON consensus, or remote attestation.
