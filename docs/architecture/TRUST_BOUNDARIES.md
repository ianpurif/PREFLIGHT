# Trust Boundaries

## Boundary A — Facility secrets → Chainlink CRE TEE
Private envelope values, hidden scenario parameters, restricted geometry, and confidential intermediate evaluation state must not be logged or returned to the public workflow.

P3 implements this boundary with an SDK 1.19.1 `handlerInTee` callback restricted to Nitro in
`us-west-2`. The callback fetches one atomic, versioned site secret from the `main` namespace using
the request's selector. A selector supplied by an application request never falls back to another
site; the legacy fixed selector is simulation compatibility only. The handler makes no ordinary
capability calls, does not log or call `usingTheDons`/`reportFromDon`, and constructs its public
response field by field. CRE CLI v1.32.0 authenticated simulations exercise this path; the CLI
explicitly states that simulation is not a real TEE. The account API signs the official gateway
request and treats an asynchronous `ACCEPTED` response as pending/unavailable rather than a verdict.

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

P5 keeps the deployment key on Ledger hardware. The P5.2 agent can inspect public state and propose
through the agent-facing API, deterministic API policy can prepare, and the browser can request a
signature only after explicit WebHID connection and on-device address confirmation. The fixed full EIP-712 message binds every exact release field,
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

## Boundary D1 — AI deployment agent

P5.2 treats the model as an untrusted orchestrator. The host first matches the entire input against
finite public request forms generated from the trusted catalog, discards raw text, and exposes only
the resulting canonical public request to a provider with `store: false`. A host-owned bounded state
machine then exposes one strict next tool at a time. Only deployment-reference extraction accepts
model arguments, and those aliases must resolve to the host-locked canonical target. Signer identity
comes from operator context. Later tools accept no replacement site, robot, build, clearance, chain,
registry, nonce, payload, signature, or approval fields.

The agent can read allowlisted public evaluation/clearance information and request deterministic
preparation. It has no general network, shell, filesystem, registry mutation, Ledger signing, or
release-consumption capability. `ReleaseService.prepare()` remains the sole eligibility transition.
Unknown, skipped, repeated, reordered, malformed, oversized, or provider-failed calls stop before
Ledger. Tool text is data and model prose cannot set the final status.

For an authenticated account target, the bounded sequence includes a server-side `getGraphContext`
step. The adapter queries only public P4 registry fields by the exact clearance digest; no fixture
or browser-supplied Graph result is accepted. Missing, stale, revoked, expired, mismatched, or
unavailable Graph data blocks before P5. A matching Graph result permits the direct P5 registry read,
but never replaces it.

Provider context and the public audit omit raw submitted request text, raw model output, signatures,
credentials, private envelope/blind values, CRE payloads, and private evaluator findings. The audit
may include the redacted Graph source/chain/registry/digest/status/block identity because those are
public registry facts.
`AUTHORIZED` can appear only after a read of the exact P5 nonce finds an internally stored, validated
`ReleaseAuthorization`. The process-local P5.2 attempt/audit map is not durable; persistence is a
P6 operational concern, not a substitute for P5's durable nonce authority. See ADR-0008.

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

## Boundary G — Product UI projection

The normal P8 product UI is a presentation and session boundary, not a new authority. Authenticated
pages receive account-scoped sites, robots, builds, public evaluation results, and release-attempt
projections from the API. They may show verdicts, generic reason families, public digests, route
metadata, commitments, and the human-approval boundary. They must not receive or render the
confidential envelope/blind, private rules or thresholds, restricted geometry, internal report, raw
CRE payload, model output, credentials, signatures, or a fabricated transaction.

The API persists only an opaque session token hash. Passwords are scrypt-hashed, and site policy
envelopes/blinds are encrypted at rest with AES-256-GCM. Every resource query includes the
authenticated account id; a caller-supplied account id is not accepted as an authorization input.
State-changing requests reject an untrusted `Origin` or `Referer`. The legacy P5/P5.2 HTTP routes
also require the authenticated account session whenever the application store is enabled; only
the explicit non-production fixture flag can bypass that session boundary for regression tooling.
The local SQLite store is a single-node implementation boundary and is not presented as production
multi-instance persistence.

The deterministic P6/P7 dashboard remains a separate, explicitly env-gated development fixture at
`/dev-fixtures/evaluate`. It is not imported by normal `/app` routes and regression tests are the
only supported consumer of its scenario selectors.

`CLEAR` in either the product UI or fixture dashboard remains an evaluation result only. The browser cannot construct a
clearance, call `/release/prepare` directly, mark a request prepared, or report `AUTHORIZED`. The
account release endpoint also cross-checks every public clearance input and its evaluation-input
digest against the stored evaluation before invoking P5. A
real public `LEDGER_APPROVAL_REQUIRED` response from the existing P5.2 API is required before an
exact prepared request is handed to `/p5-ledger`; the user gesture and existing Ledger/consume path
remain the release boundary. The digital twin projects public caller-supplied behavior points over
fixed illustrative zones and never reimplements safety rules or exposes the private envelope.

## Threats to design for later
- hidden-rule exfiltration via logs/errors
- model endpoint equivocation
- digest canonicalization bugs
- replayed/expired clearances
- replayed Ledger approvals across lost/split nonce databases
- UI showing a different build than the signed intent
- compromised orchestrator attempting bypass
- prompt/tool injection or a model attempting an unallowlisted capability
- ambiguous catalog aliases or stale public catalog entries
- accepted-descriptor/origin mismatch causing clear-signing fallback
- post-authorization revocation or Sepolia reorg before a later P6 action
- nondeterministic simulation results
- TEE output over-disclosure
- authorized chosen-input queries inferring private rules from repeated verdicts
- synthetic trace fabrication by an otherwise authorized submitter
