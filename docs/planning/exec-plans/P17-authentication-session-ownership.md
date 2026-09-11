# P17 — Authentication, session, and account ownership hardening

## Outcome

Make the existing account flow consistent and server-enforced: logged-out users can enter,
register, or sign in; authenticated users are sent to their own workspace; sessions survive reloads;
sign-out reliably invalidates the server session; and every account-backed read/write continues to
derive identity from the authenticated session rather than client-supplied account data.

## Non-goals

- No replacement auth provider, managed database, password-recovery system, or broad backend rewrite.
- No changes to evaluation semantics, Chainlink/Graph/Ledger authority, release protocol, or product UI
  redesign beyond auth-state and error handling needed for correctness.
- No server-side trust in browser storage, URL account IDs, or client-authenticated flags.

## Invariants

- The API session cookie is the only source of authenticated account identity.
- Passwords remain scrypt-hashed; session tokens remain opaque and only their hashes are persisted.
- Every site, robot, build, evaluation, pending evaluation, and release-attempt query/mutation is
  scoped by the authenticated account id in the SQL boundary.
- Anonymous callers receive no account data; cross-account IDs fail closed without revealing records.
- Cookie-authenticated mutations reject untrusted origins/referers, and personalized API responses
  are not reusable from browser caches after sign-out or account switching.
- The browser remains a projection; auth UX never grants clearance, release, or Ledger authority.

## Change surfaces

- `apps/web/src/app/onboarding-flow.tsx`: shared session bootstrap for `/start`, sign-in, and
  account creation; safe redirects and explicit session-check failures.
- `apps/web/src/app/real-workspace.tsx`: preserve authenticated data loading and make failed sign-out
  visible instead of pretending the session was cleared; scope the Ledger handoff in browser storage
  to the current account and clear it on sign-out.
- `apps/web/src/app/p5-ledger/*`: require the authenticated session before loading an account-owned
  prepared handoff; retain only the explicitly server-gated P7 fixture handoff.
- `apps/api/src/server.ts`: prevent personalized responses from being cached across sessions,
  retain the existing server-side auth/CSRF gates, and bind legacy release requests to the session
  owner.
- `apps/api/src/release/*` and `apps/api/src/agent/deployment-agent.ts`: persist the owning account
  on account-backed release nonces and require that owner for consume/status reads.
- `apps/api/test/application-lifecycle.test.ts`: cover register/sign-in/me/session persistence,
  sign-out invalidation, account isolation across resource IDs, and authenticated legacy boundaries.
- `tests/e2e/p8-product-flow.spec.ts`: cover `/start` routing, refresh persistence, sign-in, and
  sign-out in a real browser flow.
- `docs/planning/exec-plans/P17-authentication-session-ownership.md`: record decisions and evidence.

## Acceptance checks

- Anonymous `/start` shows account entry; authenticated `/start`, `/sign-in`, and `/create-account`
  redirect to `/app` or a validated `/app...` continuation.
- Registration and sign-in set a durable HTTP-only cookie; `/auth/me` remains valid after a refresh.
- Sign-out revokes the server session and clears the cookie; subsequent private requests return 401.
- `/app/*` redirects anonymous users to `/start?next=...` without rendering private records.
- `/p5-ledger` does not load an account-owned browser handoff for an anonymous or different session;
  the explicit `source=p6` handoff remains available only when the server has enabled demo routes.
- Two authenticated accounts cannot read or mutate one another's site, robot, build, evaluation,
  pending evaluation, release, or deployment context by changing URL/body IDs or replaying a release
  nonce from another session.
- API responses containing session/account data are marked non-cacheable for account switching.
- Targeted API and browser tests cover the complete requested auth flow; typecheck/lint/full verify pass.

## Steps
- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review requested
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Read-only audit and test-gap inspection can be parallelized, but implementation remains in this
working tree so the shared session and API ownership changes are integrated coherently. No parallel
write worktree is needed.

## Risks and rollback

- Risk: session probing adds a loading state or redirects a user while the API is unavailable.
  Mitigation: distinguish `401` (logged out) from other failures and keep an explicit error state.
- Risk: stricter sign-out failure handling leaves a user on the workspace after a network failure.
  Mitigation: show the failure and keep data visible only under the still-valid server session.
- Risk: cache headers alter existing API behavior. Mitigation: use `no-store` only for API responses;
  revert the small header change independently if an integration requires caching.

## Decisions / deviations

- Keep the current opaque-cookie + SQLite store; the audit found server-side account scoping already
  present in the normal resource methods. The fix targets the missing session-aware entry UX, cache
  boundary, failure handling, regression coverage, and the legacy release nonce owner binding rather
  than replacing working persistence.
- The legacy `/release/prepare` and `/release/consume` boundary was not safe to leave at “any valid
  session”: it accepted/replayed identifiers and nonces without an owner. Normal authenticated
  requests now bind deployment context and durable release rows to the session account; old
  unowned fixture rows fail closed when accessed through an authenticated route.
- Browser handoffs now carry an explicit `version` and `scope`: account handoffs require a matching
  `/auth/me` account id, while only the development/test `source=p6` path accepts demo handoffs.
  Account handoffs are cleared on sign-out and when the operator edits the request.

## Verification evidence

- Targeted API suite: `77 pass, 0 fail, 412 expect() calls` across 16 files; covers registration,
  cookie attributes, `/auth/me`, sign-in, wrong-password rejection, sign-out revocation, anonymous
  access, cross-account site/robot/build/evaluation/release isolation, and legacy release nonce
  ownership.
- Targeted browser suite: `bun run test:e2e -- --workers=1 tests/e2e/p6-judge-path.spec.ts
  tests/e2e/p7-deterministic-demo.spec.ts tests/e2e/p8-product-flow.spec.ts` -> `11 passed
  (42.2s)`; covers the public fixture handoff plus account creation, refresh persistence,
  authenticated `/start`, `/sign-in`, and `/create-account` routing, anonymous `/app` redirect,
  safe continuation handling, account-scoped P5 handoff rejection, desktop/mobile sign-out,
  handoff clearing, sign-in, and refresh persistence after sign-in. The initial parallel run had
  two browser/server session-contention failures; the serial rerun passed all 11 tests.
- Targeted checks passed: API and web typechecks, targeted Biome check, and `git diff --check`.
- Full `bun run verify` passed: lint completed with 27 pre-existing CSS
  `noDescendingSpecificity` warnings and no errors; all 7 typecheck tasks, 12 test tasks, 8 build
  tasks, 25 Forge tests, and scaffold checks passed.
- Final browser rerun after the auth and client-handoff hardening: `11 passed (42.2s)` with one
  worker.
- A separate read-only reviewer was dispatched in child task
  `01a091e9-be4a-7c61-bdc2-447347b78db5` with an explicit no-edit security-review prompt. Those
  review turns completed without emitting a report. A fresh continuation reviewer was also
  dispatched in child task `01a091e9-7df9-7001-a8c7-94e4a65a635d`; its turn completed after bounded
  waits without emitting a report. There are therefore no reviewer findings to resolve, but this is
  recorded as an environment/timing limitation rather than a clean review result.
- Final repository checks passed: no diff-check errors and no unintended generated-file drift.
  Existing uncommitted logo/design work and the user-provided root logo PNGs were preserved.
