# Trust Boundaries

## Boundary A — Facility secrets → Chainlink CRE TEE
Private envelope values, hidden scenario parameters, restricted geometry, and confidential intermediate evaluation state must not be logged or returned to the public workflow.

## Boundary B — Deterministic evaluator
The clearance decision must be reproducible from declared evaluator version + allowed inputs. An LLM may orchestrate/explain but cannot decide `CLEAR`, `HOLD`, or `ESCALATE`.

## Boundary C — Public chain
Only minimum public artifacts belong onchain: commitments/digests, evaluator/version metadata, verdict metadata, timestamps/expiry, issuer/revocation state as designed later. Never raw site rules or proprietary model data.

## Boundary D — Ledger hardware
The deployment key remains hardware-backed. The browser can prepare an EIP-712 deployment intent and request a signature; it cannot bypass physical confirmation. Backend-held keys are not a valid replacement in the judged path.

## Boundary E — Simulation vs physical reality
Simulation is evidence about a defined evaluation envelope, not a guarantee about the physical robot. Product copy, logs, API names, and demo narration must preserve this distinction.

## Boundary F — Exact-build binding
Any relevant robot build mutation changes its digest. Reusing clearance for a mismatched digest must fail closed.

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
