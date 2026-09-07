# P8-UI — Product UI/UX flow

## Outcome

Turn the current judge dashboard into a clear Preflight product journey: landing page, first-time
setup, application navigation, build selection, deterministic evaluation, result interpretation,
release preparation, and explicit human approval handoff.

## Non-goals

- No new evaluation, clearance, CRE, contract, Ledger, agent, or robot-control authority.
- No confidential envelope or private evaluator data in the browser.
- No fabricated live clearance, signature, authorization, deployment, or physical-safety claim.
- No broad design-system or dependency rewrite.

## Invariants

- P2 remains the only source of deterministic `HOLD`/`CLEAR` evaluation semantics.
- The browser renders a public projection only; private envelope, blind, rules, geometry, and
  internal findings remain server/TEE-only.
- `LEDGER_APPROVAL_REQUIRED` is a handoff state, not authorization. `AUTHORIZED` can only come
  from the existing P5 consume path.
- Build mutation must continue to fail closed as `BLOCKED / CLEARANCE_BINDING_MISMATCH`.
- Existing P6/P7 deterministic scenarios and stale-response protections remain intact.

## Change surfaces

- `apps/web/src/app/page.tsx` and new landing/onboarding components/routes.
- New `/app` product shell and focused setup/build/evaluation/release/evidence views.
- Existing judge dashboard embedded as the evaluation workspace with the same API and demo state.
- `apps/web/src/app/globals.css` for the industrial product visual system and responsive states.
- Critical Playwright paths updated to enter through `/app/evaluate` after the new landing flow.
- Current-state documentation updated after verification.

## Acceptance checks

- A first-time visitor sees a clear landing page and can reach onboarding without knowing the
  architecture.
- Onboarding captures site, robot, and build context locally and hands off to the workspace.
- Workspace navigation exposes Setup, Builds, Evaluate, Releases, and Evidence without making
  technical partner labels the primary UX.
- Evaluation view preserves unsafe `HOLD`, corrected `CLEAR`, mutated `BLOCKED`, and live-agent
  unavailable/error states.
- Release view makes `LEDGER_APPROVAL_REQUIRED` distinct from authorization and links to the
  existing Ledger harness only after an exact prepared request exists.
- Responsive/mobile and keyboard/focus states remain usable.
- Existing critical e2e, web typecheck, lint, build, and repository verification pass.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

No parallel write work; the UI state and existing judge dashboard share one web surface. A separate
read-only review will inspect the final diff before completion.

## Risks and rollback

- Risk: changing `/` breaks existing judge-path automation. Mitigation: keep deterministic evaluator
  at `/app/evaluate` and update only critical test entrypoints.
- Risk: visual polish accidentally implies authority. Mitigation: keep explicit status copy and
  existing server/API handoff checks.
- Rollback: each UI slice is committed independently; revert the affected commit without touching
  domain or partner code.

## Decisions / deviations

- The product shell uses URL routes for major views so a refresh has a stable entry point.
- Setup is intentionally local/demo-scoped; it does not invent persistence or backend CRUD.
- The existing P6 dashboard remains the authoritative demo workspace and is visually embedded,
  rather than reimplemented in a second state model.

## Verification evidence

Completed evidence:

- `bun run test` — all repository package tests passed (including the web critical-path unit tests).
- `bun run test:e2e` — 9 Playwright tests passed across P6, P7, and P8 landing/onboarding flows.
- `bun --filter '@preflight/web' typecheck` and the full typecheck stage in `bun run verify` passed.
- `bun run lint` — Biome clean with no warnings or errors.
- `bun run build` — all packages and the Next.js application built successfully.
- `bun run contracts:test` — Foundry ran 25 tests with no failures.
- `bun run verify:scaffold` and `bun run verify` passed.
- `git diff --check` passed.
- A separate read-only review inspected the final UI diff for accessibility, authority boundaries,
  deterministic demo regressions, and truthfulness before completion.
