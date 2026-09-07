# P7 — Deterministic Demo Reliability

## Outcome

Make the existing P6 judge path reproducible from a clean checkout with an explicit
offline deterministic rehearsal, an idempotent demo-owned reset, and browser coverage for
the unsafe → cleared → mutated sequence. The rehearsal reuses the P2 evaluator and the
existing P5.2 deployment-agent/ReleaseService authorities without changing production
protocol semantics.

## Non-goals

- No P8 submission work, robot activation, execution, new partner, contract, CRE, or Ledger
  feature.
- No production fallback from a missing OpenAI/Sepolia provider to the rehearsal.
- No claim of live positive Sepolia clearance, live CRE DON execution, physical Ledger
  approval, or external model execution.
- No weakening of P1–P6 binding, signer, nonce, replay, or confidentiality semantics.

## Invariants

- The P2 evaluator remains the safety verdict authority; the browser is explanatory only.
- Scenario A is `HOLD`; Scenario B is `CLEAR` and reaches
  `LEDGER_APPROVAL_REQUIRED` only through the existing host-owned agent and P5 preparation
  boundary; Scenario C mutates Build B, recomputes its digest, and stops with
  `CLEARANCE_BINDING_MISMATCH` before Ledger.
- The offline rehearsal uses a fixed clock, fixed registry snapshot, fixed attempt IDs, and
  a demo-only nonce factory. Production ReleaseService nonce generation remains random.
- Reset removes only `.data/preflight-demo`; source fixtures, evidence, deployment metadata,
  environment files, and the normal release store are untouched.
- Private envelope fields and confidential intermediate values never enter public rehearsal
  output, browser state, or committed logs.

## Change surfaces

- `apps/api/src/release/release-service.ts`: optional demo/test nonce seam with the existing
  cryptographically random default.
- `apps/api/scripts/p7-demo-fixture.ts`: one deterministic P2 + P5.2 rehearsal fixture and
  concise public scenario traces.
- `scripts/p7-demo.mjs`, root scripts, and `.gitignore`: prepare/reset/run commands and
  demo-owned state.
- `apps/api/src/index.ts`: development startup remains available without optional live RPC;
  the live agent is still disabled unless its real configuration is present.
- `apps/web/src/app/judge-dashboard.tsx`, Playwright config/tests: reset, stale-response
  invalidation, readiness, and repeated scenario coverage.
- `README.md`, `CURRENT.md`, `TASKS.md`, `VERIFICATION_REPORT.md`, evidence matrix, and
  `docs/ai/AI_USAGE.md`: P7 commands, evidence boundary, and limitations.

## Acceptance checks

- `bun run demo:setup` creates deterministic public manifest/traces without network access.
- `bun run demo:reset` is idempotent and only removes the exact demo-owned directory.
- Repeated A/B/C rehearsal output is byte-for-byte stable; B includes exact prepared binding
  and remains awaiting human approval, while C has no Ledger handoff.
- Browser tests cover clean startup, reset, A, reset, B/prepared handoff, reset, C, and a
  repeated C run without stale session storage or race leakage.
- Existing live/read-only and emulator/device disclosures remain explicit.

## Steps

- [x] Explore existing P2, P5.2, P6, and verification surfaces.
- [x] Implement the smallest deterministic rehearsal/reset path.
- [x] Add reset/race protections and browser coverage.
- [x] Run targeted and full verification, including a clean repeated rehearsal.
- [x] Complete independent read-only review and resolve valid findings.
- [x] Update P7 docs/evidence.
- [ ] Commit the scoped change with `feat(p7): make judge demo deterministic and reproducible`
      (blocked in this sandbox because `.git/index.lock` creation is denied).

## Parallel work / worktrees

Two read-only agents reviewed the P7 reliability boundary and test gaps. All writes remain
in this working tree to avoid overlapping changes.

## Risks and rollback

- The real P5 intent includes a protocol nonce and live block timestamp. The rehearsal injects
  those only through optional test/demo seams; production defaults remain unchanged.
- The real API remains unavailable without its configured RPC/provider/catalog. The offline
  path is a clearly labelled rehearsal, never an implicit production fallback.
- Rollback is limited to P7 scripts, reset/UI safeguards, tests, and synchronized docs.

## Decisions / deviations

- The checked-in P2 fixture is the canonical evaluator input. A demo-only catalog binds its
  exact public site/robot/build values to a deterministic registry reader so the existing
  DeploymentAgent and ReleaseService can be exercised offline.
- The browser prepared-response test uses a deterministic exact-binding payload to verify the
  existing handoff contract; it does not claim a live registry or Ledger authorization.
- The existing brief-facing `487 scenarios` headline and bounded three-template P2 report are
  preserved and remain explicitly distinguished.

## Verification evidence

Record `demo:setup`, `demo:reset`, repeated `demo:run`, browser, package, repository,
contract, leakage, and diff checks in the completion report and `VERIFICATION_REPORT.md`.
