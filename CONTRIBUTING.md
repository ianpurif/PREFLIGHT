# Contributing

## Branches
Use `codex/<task-id>-<slug>` for agent work. One coherent task per branch/worktree.

## Commits
Prefer small commits such as:
- `docs: define clearance trust boundaries`
- `feat(cre): add confidential evaluation handler`
- `test(sim): cover restricted-zone violation`

Do not create a single giant final-day commit.

## Pull/merge gate
- targeted tests pass
- lint/typecheck pass
- full `bun run verify` passes when tooling is available
- Foundry checks pass for contract changes
- partner compliance checklist updated for partner changes
- independent read-only review completed
- AI usage/prompt artifact updated when Codex materially contributed
