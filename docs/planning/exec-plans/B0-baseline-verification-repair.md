# B0 — Baseline Verification Repair

## Outcome

The existing boilerplate passes its intended pre-implementation verification gates with the installed Biome and Bun toolchain, while empty scaffold packages remain valid and real test failures still fail.

## Non-goals

- P1 or later product implementation
- simulator or evaluator behavior
- Chainlink CRE, contract, Ledger, or frontend feature work
- architecture or public-interface changes

## Invariants

- Linting remains enabled with Biome's recommended preset.
- Generated and cache outputs are excluded from source scanning.
- Empty scaffold packages may have zero tests, but actual test failures remain fatal.
- No private data, partner behavior, clearance semantics, or release authorization changes.

## Change surfaces

- Root Biome configuration and generated-output exclusions
- Existing scaffold source/config formatting only
- Workspace test scripts for packages that legitimately contain no tests
- Boilerplate verification documentation and AI-use bookkeeping

## Acceptance checks

- `bun run lint`
- `bun run typecheck`
- `bun run test`
- `bun run build`
- `bun run contracts:test` when Foundry is installed
- `bun run verify:scaffold`
- `bun run verify`
- A second lint run after Turbo commands does not inspect generated `.turbo` files.
- Independent read-only diff review has no unresolved findings.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Read-only baseline audit and final diff review may use subagents. All edits remain in the main working tree and are owned by the primary agent.

## Risks and rollback

- Over-broad force-ignore patterns could hide source files; keep exclusions limited to generated/cache directories.
- Applying formatting too broadly could create unrelated churn; format only files reported by Biome.
- Changing all test scripts indiscriminately could mask real suites; first prove which workspaces contain no tests.

Rollback is a direct revert of the configuration, formatting, script, and documentation changes in this plan.

## Decisions / deviations

- Biome 2.5.12 documents `linter.rules.preset` and `!!` force-ignore patterns in `files.includes`; generated/cache directory exclusions use those current forms.
- All seven workspace packages contain no package-local test files. Their scripts use Bun's zero-test allowance while retaining normal failure behavior for discovered tests.
- Foundry is not installed in this environment, so contract verification will be reported as blocked rather than passed.

## Verification evidence

- `bun run lint` — pass; 42 files checked, including after Turbo generated fresh caches.
- `bun run typecheck` — pass; 7/7 workspace tasks.
- `bun run test` — pass; 9/9 Turbo tasks, with all seven empty test packages accepted.
- `bun run build` — pass; 7/7 workspace tasks, including the Next.js production build.
- `bun run verify:scaffold` — pass; scaffold checks and 3/3 Node tests.
- `bun run contracts:test` — environment-blocked because `forge` is not installed.
- `bun run verify` — lint/typecheck/test/build pass; aggregate exits nonzero at the unchanged Foundry gate because `forge` is unavailable.
- Independent `rovaulta-reviewer` diff review — no findings.
