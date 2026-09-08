# P13 — First Real Account-Created CRE Evaluation

## Outcome

Provide a production-correct operator path for creating one normal Rovaulta account,
site, robot, build, and CRE-backed evaluation, then persist only the validated public
result. Capture a redacted evidence record only after an actual deployed CRE workflow
completes the request.

## Non-goals

- No P2 evaluator fallback, fixture promotion, fabricated database row, response, or clearance.
- No automatic P12 registry broadcast.
- No changes to the confidential envelope, blind, callback payload minimization, or P5 authority.
- No live CRE deployment claim without authenticated operator evidence.

## Invariants

- Normal account evaluations use `CreHttpEvaluationClient`; missing configuration fails closed.
- The API receives only the minimal public CRE result through the authenticated callback.
- Site secrets are selected by the exact site-bound selector and remain in the CRE `main` namespace.
- Account, site, robot, build, and evaluation records are created through the existing application boundary.
- A `CLEAR` evaluation is not a clearance or release authorization.

## Change surfaces

- `apps/api/scripts/` — optional operator command for the normal account setup/evaluation flow.
- `apps/api/test/` — critical ownership/configuration/result-transport coverage only if a code seam changes.
- `docs/planning/`, `docs/compliance/`, `docs/partners/`, `README.md`, `docs/ai/` — runbook and evidence status.
- `integrations/chainlink-cre/` — configuration guidance only; no confidential handler redesign.

## Acceptance checks

- A normal account can be registered and scoped resources can be created through existing routes.
- Evaluation requests fail closed without gateway/workflow/signing configuration.
- With an operator-provisioned workflow, site secret, callback secret, and HTTPS result URL,
  the request returns `PENDING`, callback validation stores a public `CLEAR`, and polling returns
  the exact account-owned evaluation.
- No confidential envelope, blind, secret, credential, or internal report appears in public output.
- No redacted evidence artifact is added unless real CRE execution occurs.

## Steps
- [x] Explore account/evaluation/CRE boundaries and current environment.
- [x] Implement the smallest operator-facing vertical slice, only where the existing API needs it.
- [x] Targeted verification.
- [ ] Full verification.
- [ ] Independent review.
- [x] Docs/evidence/handoff (blocker recorded; no evidence artifact created).

## Parallel work / worktrees

No parallel write work. A separate read-only reviewer will inspect the final diff.

## Risks and rollback

- External CRE workflow, gateway, Vault secret, callback URL, and funded/authenticated signer are
  operator-managed. If any is absent, stop at the explicit pending/unavailable boundary and do not
  manufacture a result.
- Any operator helper must use the existing HTTP API and can be removed independently without
  changing protocol or persistence semantics.

## Decisions / deviations

- The repository already has normal account creation and resource routes, so no direct SQLite
  bootstrap is required. A helper is justified only if it composes those routes without creating
  a second application path.
- The current `cre` CLI is not installed in this environment; official simulation/deployment
  evidence cannot be produced locally.

## Verification evidence

To be filled with commands actually run. External CRE execution IDs and evaluation IDs must be
recorded only when an authenticated workflow has completed and the public response is available.

- `bun run --cwd apps/api typecheck` passed after the runner was added.
- `bun run --cwd apps/api p13:account-evaluation` failed closed before any API call because
  `ROVAULTA_P13_EMAIL` is not configured.
- Current `.env` inspection found empty `CHAINLINK_CRE_WORKFLOW_ID`,
  `CHAINLINK_CRE_TRIGGER_PRIVATE_KEY`, and `ROVAULTA_CRE_RESULT_CALLBACK_SECRET`; the `cre`
  executable is unavailable. No real account/evaluation was created.
