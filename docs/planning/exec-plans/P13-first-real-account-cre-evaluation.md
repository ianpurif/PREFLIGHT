# P13 — CRE Simulation Qualification and Account Boundary

## Outcome

Make the authenticated official CRE CLI simulation the complete Chainlink qualification path. The
operator command regenerates the existing Rovaulta public cases and ignored confidential inputs,
runs the real `handlerInTee` workflow for unsafe/corrected/tampered cases, validates each minimal
public result through the Rovaulta protocol boundary, and writes only redacted evidence. Preserve
the normal account-backed CRE gateway path as an optional live upgrade without making deployment a
qualification dependency.

## Non-goals

- No P2 evaluator fallback, fixture promotion, fabricated database row, response, or clearance.
- No automatic P12 registry broadcast.
- No changes to the confidential envelope, blind, callback payload minimization, or P5 authority.
- No live CRE deployment, DON, Vault, callback, or Early Access claim is made by this plan.

## Invariants

- Normal account evaluations use `CreHttpEvaluationClient`; missing configuration fails closed.
- The API receives only the minimal public CRE result through the authenticated callback.
- Site secrets are selected by the exact site-bound selector and remain in the CRE `main` namespace.
- Account, site, robot, build, and evaluation records are created through the existing application boundary.
- A `CLEAR` evaluation is not a clearance or release authorization.
- Simulation evidence must record only public bindings, verdict/error, execution identity when
  reported, CLI/build identity when reported, and validation status.

## Change surfaces

- `apps/api/scripts/` — two-phase account commands plus the authenticated simulation/evidence runner.
- `apps/api/test/` — critical ownership/configuration/result-transport and simulation-output parsing coverage.
- `docs/planning/`, `docs/compliance/`, `docs/partners/`, `README.md`, `docs/ai/` — runbook and evidence status.
- `integrations/chainlink-cre/` — configuration guidance only; no confidential handler redesign.

## Acceptance checks

- A normal account can be registered and scoped resources can be created through existing routes.
- Evaluation requests fail closed without gateway/workflow/signing configuration.
- A clean checkout can run `bun run --cwd apps/api evidence:cre-simulation` after the official CRE
  CLI is installed/authenticated; the command executes unsafe `HOLD`, corrected `CLEAR`, and
  tampered-input `REJECT` through the existing workflow.
- Every CLI response is parsed with the strict versioned Rovaulta boundary and exact binding checks;
  malformed output or a binding mismatch fails closed.
- Site-secret provisioning reads only through the encrypted application store and gives the official
  CRE CLI an in-memory value; the envelope/blind never crosses HTTP or evidence boundaries.
- No confidential envelope, blind, secret, credential, or internal report appears in public output or
  committed evidence.
- The committed P3 evidence is the actual authenticated simulation record. The current-source
  runner artifact is added to submission evidence only after a real CLI run; missing
  CLI/authentication never produces a success fallback.

## Steps
- [x] Explore account/evaluation/CRE boundaries and current environment.
- [x] Implement the smallest operator-facing vertical slice, only where the existing API needs it.
- [x] Add a two-phase setup/provision/evaluate handoff without a second evaluation authority.
- [x] Add a clean-checkout simulation fixture generator with the site-bound selector.
- [x] Add the redacted official CLI runner and strict public-result validation.
- [x] Preserve the three-case authenticated simulation evidence record.
- [x] Targeted verification.
- [x] Full repository verification after the simulation-path changes.
- [x] Independent read-only review.
- [x] Docs/evidence/status updated to identify simulation as the qualification path.

## Parallel work / worktrees

No parallel write work. A separate read-only reviewer will inspect the final diff.

## Risks and rollback

- The official CRE CLI and authenticated simulator remain operator-managed. If either is absent, stop
  at the explicit blocked boundary and do not manufacture a result.
- Account-created live CRE completion remains a separate optional path and must retain its existing
  fail-closed gateway/callback behavior.
- Any operator helper must use the existing HTTP API and can be removed independently without
  changing protocol or persistence semantics.

## Decisions / deviations

- The repository already has normal account creation and resource routes, so no direct SQLite
  bootstrap is required. A helper is justified only if it composes those routes without creating
  a second application path.
- Site-secret provisioning is deliberately a local operator command, not an HTTP route. It reads
  the encrypted policy through `ApplicationStore` and supplies the exact versioned payload to
  `cre secrets create` through a process environment variable; no secret is persisted by the
  repository helper.
- Chainlink confirmed that authenticated CLI Confidential Workflow simulation is sufficient for the
  prize. Live deployment is therefore out of scope for this phase.
- The existing committed P3 evidence remains the qualification artifact; the new runner is the
  reproducible path for recapturing it after fixture rotation.

## Verification evidence

Commands and evidence are recorded only when an authenticated workflow has completed and the public
response is available. The runner never stores raw CLI output.

- `bun run --cwd apps/api typecheck` passed after the runner was added.
- `bun run --cwd apps/api p13:account-evaluation` failed closed before any API call because
  `ROVAULTA_P13_EMAIL` is not configured.
- `bun run --cwd apps/api p13:provision-site-secret` is ready for an authenticated local account
  and site, but cannot complete here because no P13 account/site IDs or deployed site secret are
  configured.
- `bun run --cwd apps/api evidence:cre-simulation` completed with authenticated official CRE CLI
  `1.32.0`; the current public-only artifact records all three cases below.
- `bun --filter '@rovaulta/chainlink-cre' test` passed (31 tests, 366 assertions), including the
  confidential handler, site selector, tampered-input rejection, and leakage checks.
- `bun --filter '@rovaulta/api' test -- cre-simulation-evidence.test.ts` passed (3 parser tests).
- The account-backed gateway configuration remains absent (`CHAINLINK_CRE_WORKFLOW_ID`,
  `CHAINLINK_CRE_TRIGGER_PRIVATE_KEY`, and `ROVAULTA_CRE_RESULT_CALLBACK_SECRET` are empty), so
  no live gateway evaluation was created. A separate authenticated official CLI simulation run
  now persisted one account-owned `CLEAR`; its provenance is simulation-only and supplies no live
  DON claim or Sepolia transaction.

## Current simulation secret-injection repair

### User-visible outcome

The reproducible P13 runner supplies every environment variable declared by the repository's
`secrets.yaml` manifest to the official CRE CLI through its temporary `-e/--env` file, allowing the
workflow to reach handler execution while keeping the confidential input temporary and unlogged.

### Non-goals

- No workflow, `handlerInTee`, secret selector, or confidential payload redesign.
- No hard-coded secret, committed env file, evidence secret, or relaxed fail-closed behavior.
- No removal of the legacy manifest mapping needed to parse historical wire-compatible inputs.

### Invariants and acceptance checks

- The current site-bound `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON` mapping remains present.
- The compatibility mapping's decoded legacy environment variable is also populated only in the
  temporary simulation env file, using the same generated value.
- The official `cre workflow simulate` command receives the env file through `-e/--env` and reaches
  workflow execution; any later CLI failure is surfaced with safe diagnostics.
- The temporary secret directory is removed in the runner's `finally` block on success or failure.
- No secret value or confidential marker is printed or written to evidence.

### Steps

- [x] Trace the runner, fixture generator, `secrets.yaml`, and official CRE simulation semantics.
- [x] Populate all declared local simulation env mappings in the generated temporary file.
- [x] Add regression coverage for the generated env-file shape without asserting secret values.
- [x] Run the official three-case simulation and capture the public results.
- [x] Run affected verification and obtain an independent read-only review.

### Current-source verification

- `bun run --cwd apps/api evidence:cre-simulation` completed in WSL with authenticated CRE CLI
  `1.32.0` and returned `PASS`.
- Unsafe fixture reached the workflow and returned `EVALUATED` / `HOLD`.
- Corrected fixture reached the workflow and returned `EVALUATED` / `CLEAR`.
- Tampered commitment reached the workflow and returned `REJECT` /
  `CONFIDENTIAL_EVALUATION_REJECTED` before normal evaluation output.
- The generated public-only artifact is committed at
  `docs/compliance/evidence/chainlink-cre-p13-current-authenticated-simulation-2026-09-09.md`.
- The temporary secret directory was removed after the run; no secret, blind, raw CLI output, or
  confidential payload was written to the artifact.
