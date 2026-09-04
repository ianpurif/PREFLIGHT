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
