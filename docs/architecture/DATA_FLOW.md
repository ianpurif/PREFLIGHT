# Data Flow

This is the implemented P1–P6 architectural contract. P6 renders public evidence but does not
activate a robot or become an authority.

The optional source-build path is a preflight to step 2: `Repository + exact commit` → account-owned
`BUILDING` job → Git snapshot and lockfile digests → non-root Docker BuildKit/buildx execution with
frozen Bun/Node dependencies → actual exported artifact → artifact SHA-256 and bounded SLSA/in-toto
provenance. Only a successful result is promoted to the descriptor below. A source-build failure is
not a safety verdict and cannot be evaluated; users may continue using the existing build-number
path independently.

1. **Facility configuration** → canonical private envelope + secret 32-byte blind → site/envelope-bound commitment.
2. **Build descriptor** either preserves the existing vendor build descriptor (v1) or binds the
   source-built artifact plus a digest of its validated integrity evidence (v2) → canonical
   robot-build digest.
3. **Evaluation request** binds the exact public identifiers, build digest, envelope commitment, evaluator version, and request time. The commitment covers P2 bounds, zones, rules, scenario seed/config/templates, and a secret blind.
4. **Public CRE request** carries the P1 request, exact build descriptor, supplied synthetic traces, explicit evaluation time, a synthetic-provenance marker, and a domain-separated SHA-256 behavior-input digest over those normalized public fields.
5. **Confidential CRE input** is one versioned secret containing the full private envelope and 32-byte blind. It is fetched only by the Nitro `handlerInTee` callback using an injective, request-site-bound selector; deployed workflow configuration requires and verifies that selector, while the legacy fixed selector is accepted only by old simulation payloads that omit it. When configured, the handler may use the official HTTP capability to deliver the already-minimal public result to the API; it never sends confidential values.
6. **Deterministic evaluator** runs unchanged inside the confidential callback. It reconstructs the P1 commitment before rule evaluation, validates exact site/envelope/robot/build/evaluator/scenario/trace bindings, and emits the detailed internal report only in TEE-local memory.
7. **Minimal evaluation result** contains the unchanged P1 `EvaluationResult`, public behavior-input digest, and synthetic-provenance marker. Private envelope values, blind, scenario findings, violations, counts, and caught diagnostics do not leave confidential execution. Rejections expose only a fixed schema/status/code. An accepted account request is completed by a versioned canonical callback signed with an HMAC key fetched inside the TEE; the API verifies exact bindings and idempotency before exposing the public projection.
8. **Registry transaction** is submitted by an owner-authorized registrar after inspecting a valid
   `CLEAR` result. It records the P1 clearance digest and fixed-size exact bindings. The verified P4
   registry is deployed on Sepolia; registration remains manual/authorized, not automatic CRE delivery.
9. **The Graph public-context step** queries the hosted Sepolia subgraph by the exact clearance
   digest. The server validates the entity identity, all public P1/P4 binding hashes, issuer,
   `CLEAR` verdict, expiry, revocation state, chain/registry identity, and indexed block metadata.
   Missing, stale, revoked, expired, malformed, mismatched, or unavailable data fails closed; no
   fixture response is accepted on an account-backed request.
10. **AI deployment agent** first matches one bounded public natural-language request against finite
   forms generated from the trusted public catalog. It discards the raw text and sends only a
   host-generated canonical public request to a provider. A real provider may
   call only the next strict tool in the host-owned sequence, and its first aliases must resolve to
   the same immutable site/robot/build tuple already resolved by the host. Ambiguous, conflicting,
   secret-bearing, or non-catalog input fails before provider/audit handling. The model cannot supply
   clearance, signer, chain, registry, nonce, signature, signed payload, or authorization.
11. **Agent inspection** reads the catalog's public evaluation status and complete public clearance,
    then queries the fixed Sepolia P4 registry at an explicit block. Tool output includes only public
   status/digest/block data. No raw submitted request, private envelope, blind, private finding, CRE
   secret, credential, or raw upstream error enters model context or audit.
12. **Release prepare API** validates exact proposal/clearance bindings and the signer allowlist, then
   reads the deployed registry at one explicit block. Only an existing exact `CLEAR`, unrevoked,
   unexpired record can produce a server-nonced full EIP-712 request. This result overrides every
   conflicting model claim. Success is `LEDGER_APPROVAL_REQUIRED`, never authorization.
13. **Ledger operator harness** defaults to WebHID and connects a physical Ledger on an explicit
    human gesture. Development/test may select only a loopback Ledger Speculos official device
    simulator; production configuration rejects it.
    Both confirm the address, reconstruct the exact request, and share full typed-data signing. The
    runtime descriptor must resolve every exact display path; partial context or legacy/blind
    fallback fails closed. The agent cannot invoke signing or consumption.
14. **Human + Ledger** review/approve or reject. The private key never enters browser, API, or agent.
15. **Release consume API** reconstructs the request, recovers an authorized signer, repeats the exact
    P4 check for TOCTOU, enforces `now < expiresAt`, atomically consumes the durable nonce once, and
    emits a public `ReleaseAuthorization`.
16. **Agent status read** may report `AUTHORIZED` only by correlating the exact prepared nonce and
    digests with that stored P5 `ReleaseAuthorization`. Model text, an old signature, or an arbitrary
    attempt ID cannot create this state. The public audit shows where autonomy stopped and human
    authorization began.
17. **P6 judge UI** receives a server-side public projection of the existing deterministic fixture
    and recorded P3/P5.2 public evidence. It renders the explanatory digital twin, public verdict,
    CRE boundary, Sepolia registry identity, and Ledger boundary only; the browser never receives
    the confidential envelope/blind or internal report and cannot turn `CLEAR` into authorization.
18. **P6 Ledger handoff** may persist an exact prepared request returned by the existing agent API
    and link to `/p5-ledger`. Without a real backend `LEDGER_APPROVAL_REQUIRED` response, the UI
    shows the external limitation and creates no request. Only the existing P5 consume/status path
    can later produce `AUTHORIZED`.
19. **P7 later** may consume a verified authorization only after defining activation-time
    validity/finality. No robot activation is implemented by P6.

Canonical schema/digest rules are defined in ADR-0003, deterministic evaluation semantics in
ADR-0004, the confidential/public boundary in ADR-0005, registry transport/authority semantics
in ADR-0006, Ledger/replay authority in ADR-0007, and the host-owned agent capability boundary in
ADR-0008. No step may silently downgrade to trusting model prose, a frontend boolean, or an
uncommitted rule/scenario set.

The behavior-input digest protects result-to-request integrity, not origin. An authenticated HTTP submitter can still fabricate well-formed synthetic traces; remote robot/model attestation is outside P3.
