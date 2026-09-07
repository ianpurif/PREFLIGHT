# Trust Boundaries

## Boundary A — Facility secrets → Chainlink CRE TEE
Private envelope values, hidden scenario parameters, restricted geometry, and confidential intermediate evaluation state must not be logged or returned to the public workflow.

P3 implements this boundary with an SDK 1.19.1 `handlerInTee` callback restricted to Nitro in `us-west-2`. The callback fetches one atomic, versioned secret from the `main` namespace using a compile-time fixed ID. The handler makes no ordinary capability calls, does not log or call `usingTheDons`/`reportFromDon`, and constructs its public response field by field. CRE CLI v1.32.0 authenticated simulations exercise this path; the CLI explicitly states that simulation is not a real TEE.

## Boundary B — Deterministic evaluator
The clearance decision must be reproducible from declared evaluator version + allowed inputs. An LLM may orchestrate/explain but cannot decide `CLEAR`, `HOLD`, or `ESCALATE`.

P2 implements `warehouse-rules-v1` with bounded integer units, committed scenario configuration, exact closed-segment geometry, normalized ordering, explicit timestamps, and no external runtime inputs. `CLEAR` means zero violations only for that exact simulated suite/envelope. P3 reuses this implementation inside the TEE and binds the public response to the exact normalized supplied behavior.

Materialized trace metadata and the P3 behavior digest are declarations/integrity bindings, not proof that a real artifact or physical robot produced the traces. P3 authenticates a configured HTTP submitter, not robot execution. Remote hardware/model attestation remains outside scope.

## Boundary C — Public chain
Only minimum public artifacts belong onchain: identifier hashes, commitments/digests,
evaluator/version metadata, `CLEAR`, timestamps/expiry, issuer, and revocation state. Never raw site
rules, proprietary model data, private geometry/thresholds, the commitment blind, or internal
findings.

P4 implements this boundary with fixed-size storage and bounded reads. An immutable owner manages
registrars; a registrar is trusted to attest that a validated P1 clearance digest corresponds to the
submitted scalar fields. The contract does not recompute canonical JSON or prove P3 execution. A
removed registrar loses record authority but retains revoke-only power for its existing records.

## Boundary D — Ledger hardware

P5 keeps the deployment key on Ledger hardware. An operator/orchestration client can propose through
the agent-facing API, deterministic API policy can prepare, and the browser can request a signature
only after explicit WebHID connection and on-device address confirmation. No autonomous/LLM agent
runtime is implemented in P5. The fixed full EIP-712 message binds every exact release field,
authorized signer, one-time nonce, expiry, chain, and deployed registry. Backend-held keys and
frontend approval booleans are not valid replacements.

The adapter requires a Ledger origin token and accepts context only when the official Context Module
returns the exact chain, registry, schema, filter count, and every display path. It rejects partial
context and the Signer Kit `SIGN_TYPED_DATA_LEGACY` fallback before output. Physical refusal is
`HUMAN_REJECTED` and is not retried. These controls are implemented and mock-verified, but hardware
enforcement/Clear Signing is not yet evidenced because the production origin/accepted-descriptor/
physical-device prerequisites are unavailable.

P5.1 adds a separate test transport only: Ledger's official Speculos transport is rejected outside
development/test, accepts only a directly configured loopback HTTP endpoint, and uses the same
adapter/context/signature path. Speculos `0.27.0` plus the
actual Ethereum `1.22.3` application proves emulator discovery and address-review UI behavior, but
not Secure Element custody, physical interaction, WebHID behavior, or firmware compatibility.
Authenticated Clear Signing A/B/E/F remain blocked on both the official Tester's missing
`GATING_TOKEN` and the separate application origin/accepted-descriptor path; they must not be
inferred from the address smoke. Actual C and invalid/unregistered D requests fail before signer
invocation; revoked/expired D variants remain test-only evidence.

## Boundary D2 — Offchain release and replay authority

The API—not the browser or agent—owns an explicit authorized-signer allowlist and durable SQLite
nonce state. It queries the exact P4 record at one block before signing and again before consumption,
recovers the signer from the reconstructed payload, and performs one atomic nonce state transition.
This protects a single coordinated API instance. It is not onchain replay protection and cannot
safely span independent databases.

## Boundary E — Simulation vs physical reality
Simulation is evidence about a defined evaluation envelope, not a guarantee about the physical robot. Product copy, logs, API names, and demo narration must preserve this distinction.

## Boundary F — Exact-build binding
Any relevant robot build mutation changes its digest. Reusing clearance for a mismatched digest must fail closed.

P1 establishes the canonical identifiers, versioned schemas, deterministic digests, and pure
binding assertions for this boundary. P4 stores every public exact binding, prevents digest/ID
overwrite, permits only `CLEAR`, and enforces expiry and monotonic revocation. P5 checks every P4
binding, signs exact site/robot/build/clearance values under a chain/contract domain, enforces signer
authorization, and consumes a one-time nonce. A P4 clearance or Ledger signature alone is not a
release authorization.

## Threats to design for later
- hidden-rule exfiltration via logs/errors
- model endpoint equivocation
- digest canonicalization bugs
- replayed/expired clearances
- replayed Ledger approvals across lost/split nonce databases
- UI showing a different build than the signed intent
- compromised orchestrator attempting bypass
- accepted-descriptor/origin mismatch causing clear-signing fallback
- post-authorization revocation or Sepolia reorg before a later P6 action
- nondeterministic simulation results
- TEE output over-disclosure
- authorized chosen-input queries inferring private rules from repeated verdicts
- synthetic trace fabrication by an otherwise authorized submitter
