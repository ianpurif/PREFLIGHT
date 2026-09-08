# P6 — Digital Twin / Judge UX

## Outcome

Deliver one deterministic judge-facing dashboard for the existing P1–P5.2 Rovaulta
workflow. The dashboard renders the existing P2 fixture/evaluator result, presents the
public Chainlink/attestation/Ledger boundaries, and makes the unsafe → cleared → mutated
build story obvious without becoming an authority.

## Non-goals

- No P7 activation, robot control, new evaluator, CRE execution path, registry write, or
  Ledger signing implementation.
- No frontend clearance or authorization logic, private-envelope rendering, fake chain
  transaction, or fabricated physical-device evidence.
- No redesign of P1–P5.2 APIs, contracts, agent policy, or Ledger transport.

## Invariants

- P2 remains the sole deterministic safety evaluator for the demo fixture.
- The browser displays only public evaluation/audit projections; private envelope rules,
  blinds, and confidential runtime payloads never enter rendered state.
- Build mutation changes the canonical build digest and invalidates the old clearance;
  no Ledger request is offered for the mutated state.
- A valid cleared state can only hand the exact existing P5 request to `/p5-ledger`; UI
  state never reports authorization.
- Sepolia registry metadata is real deployment metadata, while fixture/CRE evidence and
  physical Ledger limitations remain explicitly labeled.

## Change surfaces

- `apps/web`: dashboard, deterministic digital twin, public state projection, Ledger handoff.
- `tests/e2e`: browser coverage for the three states and leakage/authority assertions.
- `apps/web/package.json` / `next.config.ts`: consume the existing simulation-core package.
- `docs/planning/CURRENT.md`, `docs/planning/TASKS.md`, `docs/architecture/DATA_FLOW.md`,
  `docs/compliance/EVIDENCE_MATRIX.md`, `README.md`: P6 status and judge path only.

## Acceptance checks

- Initial Build A visibly evaluates to `HOLD` with three concise public violation reasons.
- Build B evaluates to `CLEAR`, shows 487 scenarios/zero critical violations, and exposes
  only the public CRE result boundary. The brief-required 487 headline is explicitly a public
  judge metric; the authoritative P2 fixture remains three committed templates and is shown
  beside it.
- Mutating Build B changes the digest and shows `BLOCKED` with cleared/requested identities;
  Ledger approval is unavailable in that state.
- Agent, Chainlink, attestation, Verification, and Ledger panels distinguish local fixture,
  recorded authenticated CRE simulation evidence, Sepolia deployment, Speculos, and physical
  evidence. A binding mismatch says CRE was not run.
- The Ledger panel shows public site/robot/build/evaluation bindings and displays clearance,
  expiry, and intent digests only when the existing agent returns an actual prepared request.
- Browser tests prove no confidential fields or self-authorized state are rendered.

## Steps

- [x] Explore existing simulator, agent, Ledger, and web interfaces.
- [x] Implement the smallest dashboard/digital-twin vertical slice.
- [x] Run targeted web and browser verification.
- [x] Run the full repository verification loop.
- [x] Perform an independent read-only review and resolve valid findings.
- [x] Update P6 documentation/evidence state and hand off without starting P7.

## Parallel work / worktrees

Read-only specialist review is allowed. All writes remain in this working tree and are
owned by the primary agent to avoid overlapping edits.

## Risks and rollback

- R3F/Three client rendering can complicate SSR; isolate it in a client component and keep
  the public state model independent so a rendering failure cannot change authority.
- Existing API/provider/Ledger services may be unavailable; show an explicit limitation and
  link to the existing P5 harness rather than inventing success.
- Rollback is limited to the P6 web/tests/docs files; P1–P5.2 sources remain untouched.

## Decisions / deviations

- The UI calls the existing deterministic evaluator on the server for the checked-in fixture and
  projects the committed P3 authenticated-simulation outcomes as recorded evidence; it does not
  claim a fresh browser CRE run or live DON execution.
- The agent panel will use public, fixture-backed audit projections and offer the existing
  P5 handoff only after a `CLEAR` state; any live API failure is surfaced as unavailable.
- Public behavior trace points drive the explanatory route. The twin's fixed colored zones are
  illustrative and are not an envelope or safety-rule implementation.

## Verification evidence

Record targeted tests, `bun run test:e2e`, the full required commands, and `git diff --check`
in the completion response and verification report/docs as appropriate.
