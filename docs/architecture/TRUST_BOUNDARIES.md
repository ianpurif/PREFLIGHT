# Trust Boundaries

## Boundary A — Facility secrets → Chainlink CRE TEE
Private envelope values, hidden scenario parameters, restricted geometry, and confidential intermediate evaluation state must not be logged or returned to the public workflow.

## Boundary B — Deterministic evaluator
The clearance decision must be reproducible from declared evaluator version + allowed inputs. An LLM may orchestrate/explain but cannot decide `CLEAR`, `HOLD`, or `ESCALATE`.

P2 implements `warehouse-rules-v1` with bounded integer units, committed scenario configuration, exact closed-segment geometry, normalized ordering, explicit timestamps, and no external runtime inputs. `CLEAR` means zero violations only for that exact simulated suite/envelope. Materialized trace metadata is a declaration, not proof that a real artifact or physical robot produced it. P3 must authenticate trace provenance and reject arbitrary caller-supplied trace JSON before treating evaluator output as clearance-authoritative.

## Boundary C — Public chain
Only minimum public artifacts belong onchain: commitments/digests, evaluator/version metadata, verdict metadata, timestamps/expiry, issuer/revocation state as designed later. Never raw site rules or proprietary model data.

## Boundary D — Ledger hardware
The deployment key remains hardware-backed. The browser can prepare an EIP-712 deployment intent and request a signature; it cannot bypass physical confirmation. Backend-held keys are not a valid replacement in the judged path.

## Boundary E — Simulation vs physical reality
Simulation is evidence about a defined evaluation envelope, not a guarantee about the physical robot. Product copy, logs, API names, and demo narration must preserve this distinction.

## Boundary F — Exact-build binding
Any relevant robot build mutation changes its digest. Reusing clearance for a mismatched digest must fail closed.

P1 establishes the canonical identifiers, versioned schemas, deterministic digests, and pure binding assertions for this boundary. Runtime clearance validity, revocation, signer authorization, and nonce consumption remain later-phase responsibilities.

## Threats to design for later
- hidden-rule exfiltration via logs/errors
- model endpoint equivocation
- digest canonicalization bugs
- replayed/expired clearances
- replayed Ledger approvals
- UI showing a different build than the signed intent
- compromised orchestrator attempting bypass
- nondeterministic simulation results
- TEE output over-disclosure
