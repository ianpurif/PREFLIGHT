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
- prompt/tool injection attempting to gain signing or registry-write capability
- model output fabricating readiness or authorization
- ambiguous or substituted deployment target resolution

## Test families
- mismatch/replay/expiry/revocation tests
- confidential logging tests
- canonical digest golden vectors
- deterministic simulation property tests
- contract fuzz/invariant tests
- frontend intent-display vs signed-payload consistency

P1–P5.2 software now covers canonical vectors, evaluator properties, contract invariants, exact
EIP-712/domain mutations, registry mismatch/expiry/revocation, durable/concurrent nonce replay,
TOCTOU, build mutation, device refusal/errors, legacy fallback cancellation, model/tool injection,
strict capability order, and fabricated-agent authorization. Physical Ledger
display/approval/refusal remains an evidence requirement, not a mocked-test claim.

## P1 controls established

- exact, type-prefixed identifier parsing
- strict schema versions and rejection of unknown/unhashed fields
- canonical serialization negative tests and SHA-256 golden vectors
- secret-blinded private-envelope commitments
- exact result/request, clearance/result, and deployment-intent/clearance binding checks
- nonce and bounded intent expiry fields for later replay enforcement

Current-time validity and revocation are P4 controls. P5 now adds durable nonce consumption,
authorized-signer checks, exact EIP-712 domain separation, and pre/post registry reads.

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
- authenticated HTTP-trigger configuration, a request-scoped site-bound secret selector (with the fixed selector retained only for legacy simulations), and zero ordinary capability calls from the handler
- no scenario counts, violation-family summaries, or detailed findings are released in the normal application-facing CRE result
- one atomic versioned secret containing the full private envelope and commitment blind
- strict, bounded public/confidential parsing and exact P1/P2 binding validation
- unchanged P2 evaluator execution, including commitment reconstruction before rule evaluation
- domain-separated canonical behavior-input digest binding the response to the exact supplied public request/traces
- field-by-field public result allowlist and fixed redacted failure schemas
- no TEE logging, no private error messages/paths, and no DON crossover calls
- adversarial tests for private-value leakage, tampering, substitution, deterministic output, and unavailable secrets
- actual SDK and CRE CLI compilation plus authenticated simulation of the transitive P1/P2 source

Residual risks: an authorized caller can make chosen-input queries and may infer information from verdicts; rate/access policy is outside this stateless workflow. The behavior digest does not prove trace origin. Authenticated CLI simulation is not deployed Nitro, hardware-enclave execution, production Vault custody, DON consensus, or remote attestation.

## P4 controls established

- immutable owner and explicit owner-managed registrar set; `issuer` always derives from `msg.sender`
- only `CLEAR` may be persisted; `HOLD`, P3 `REJECT`, and unknown values revert
- nonzero fixed-size storage for every P1 public clearance binding, including both build ID/digest
  and envelope ID/commitment
- P1 clearance digest and clearance-ID hash are permanently single-use, preventing overwrite or
  revocation revival
- validity requires existence, `CLEAR`, non-revocation, and strict `block.timestamp < expiresAt`
- exact verification compares every stored identifier, digest, issuance, and expiry field
- owner/original-issuer revocation is explicit and monotonic; unrelated parties fail
- P1 year-9999 timestamp maximum and golden SHA-256 transport vectors are enforced in Foundry tests
- production storage has no dynamic strings/bytes, arrays, confidential envelope fields, loops,
  external calls, or enumerable state

Residual risks: an authorized registrar can attest false scalar-to-digest mappings because Solidity
does not parse P1 canonical JSON; registrar key custody and evidence inspection are operational trust
requirements. The P1 clearance digest is not chain- or contract-domain-separated, so it may be
recorded in another registry; P5 must bind deployment intent to chain ID, verifying contract,
authorized signer, and nonce. Block timestamp has normal validator skew and must not be treated as a
precision clock. No live CRE-to-contract provenance is claimed.

## P5 controls established

- versioned P1 `DeploymentIntent` with fixed `ACTIVATE_DEPLOYMENT`; no arbitrary action surface
- full EIP-712 field schema and canonical P1 intent digest under exact Sepolia/P4 domain
- exact site, robot, build ID/digest, clearance ID/digest, signer, nonce, issuance, and expiry binding
- server-side signer allowlist enforced before preparation and after signature recovery
- real deployed-registry reads at one explicit block, including independent field comparison
- pre-sign and post-sign clearance checks with strict equality-at-expiry rejection
- 128-bit server nonce and canonical request persistence in SQLite with atomic one-time consumption
- invalid signature/TOCTOU failures do not consume the original exact request
- browser-only DMK/WebHID/Ethereum signer path with on-device address confirmation
- exact runtime chain/registry/schema/filter-path resolution before signing plus explicit cancellation/rejection of partial context and `SIGN_TYPED_DATA_LEGACY`; no blind, hashed, personal, raw, or backend-key fallback
- normal `HUMAN_REJECTED`, disconnect, unavailable-app/browser, and malformed-output failures
- no release decision based on agent/LLM output or a UI approval boolean

Residual risks: physical device/app behavior and Clear Signing display are not yet evidenced; the
origin token is unavailable and the ERC-7730 file is not confirmed accepted. SQLite
protects one coordinated API store only; loss or split replicas can undermine replay state. A
Sepolia reorg or revocation after the postcheck but before a future P6 action needs an execution-time
policy. P5 does not prove physical robot safety, authenticated trace origin, registrar honesty, or
automatic CRE delivery.

## P5.2 controls established

- exact six-tool allowlist with one host-selected next tool per provider turn and no parallel calls
- a finite catalog-generated public grammar resolves site/robot/build locally before any provider
  call; raw submitted text is discarded and only a host-generated canonical public request is sent
  with `store: false`
- only human-reference extraction accepts model arguments, and its aliases must match the already
  locked site, robot, build ID/digest, and candidate public clearance
- later calls accept no chain, registry, signer, nonce, signature, arbitrary payload, or approval data
- no generic network, shell, filesystem, registry mutation, Ledger signing, or release-consumption tool
- public evaluation/clearance reads are informational; only the existing `ReleaseService.prepare()`
  can issue an intent, preserving live P4, signer, binding, expiry, and nonce enforcement
- host-derived final state and deterministic explanations; model prose/tool text cannot authorize
- exact attempt-to-prepared-request correlation; `AUTHORIZED` requires a validated authorization
  read from P5's atomically consumed nonce state
- provider request/response bounds, strict schemas, `store: false`, stable redacted failures, and no
  credentialless mock fallback
- public audit allowlist excludes raw submitted text/model output, signature material, credentials,
  private envelope/blind data, CRE payloads, and detailed evaluator findings
- adversarial coverage for skip/reorder/repeat, unknown tools, alternate build/chain/registry,
  old-signature injection, prompt/tool injection, Unicode-confusable references, fake approval,
  provider failure, and wording-independent security results

Residual risks: the public catalog is operationally curated and can become stale, though live P4
policy remains authoritative. The deliberately narrow input grammar rejects free-form conversation,
which protects confidentiality but limits usability until an independently reviewed public-request
parser is introduced. Attempt/audit state is process-local, so restart loses agent history but not
the durable P5 nonce. No actual external model execution was captured because no provider
credential/model was configured. The live Sepolia agent evidence is a read-only blocked fixture;
positive Build B evidence uses a labeled deterministic reader because no live positive clearance is
currently documented. Before a network-exposed production deployment, the API owner must add
operator authentication, rate/cost controls, catalog update governance, and durable audit retention;
CORS is not authorization. P5.2 adds no activation authority and does not reduce the existing
physical Ledger/Clear Signing evidence blockers.
