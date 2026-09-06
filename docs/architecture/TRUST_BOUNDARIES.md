# Trust Boundaries

## Boundary A — Facility secrets → Chainlink CRE TEE
Private envelope values, hidden scenario parameters, restricted geometry, and confidential intermediate evaluation state must not be logged or returned to the public workflow.

P3 implements this boundary with an SDK 1.19.1 `handlerInTee` callback restricted to Nitro in `us-west-2`. The callback fetches one atomic, versioned secret from the `main` namespace using a compile-time fixed ID. The handler makes no ordinary capability calls, does not log or call `usingTheDons`/`reportFromDon`, and constructs its public response field by field. CRE CLI v1.32.0 authenticated simulations exercise this path; the CLI explicitly states that simulation is not a real TEE.

## Boundary B — Deterministic evaluator
The clearance decision must be reproducible from declared evaluator version + allowed inputs. An LLM may orchestrate/explain but cannot decide `CLEAR`, `HOLD`, or `ESCALATE`.

P2 implements `warehouse-rules-v1` with bounded integer units, committed scenario configuration, exact closed-segment geometry, normalized ordering, explicit timestamps, and no external runtime inputs. `CLEAR` means zero violations only for that exact simulated suite/envelope. P3 reuses this implementation inside the TEE and binds the public response to the exact normalized supplied behavior.

Materialized trace metadata and the P3 behavior digest are declarations/integrity bindings, not proof that a real artifact or physical robot produced the traces. P3 authenticates a configured HTTP submitter, not robot execution. Remote hardware/model attestation remains outside scope.

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
- authorized chosen-input queries inferring private rules from repeated verdicts
- synthetic trace fabrication by an otherwise authorized submitter
