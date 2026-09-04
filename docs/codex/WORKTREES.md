# Worktrees + Subagents

## Why
Separate worktrees prevent parallel Codex writers from trampling each other's files or staging unrelated changes.

## Before first worktree

Initialize Git and create the baseline boilerplate commit using **your own configured Git identity**. The downloadable boilerplate intentionally contains no `.git` directory and no synthetic author history.

## Manual helper

```bash
node scripts/worktree.mjs create P3-cre
node scripts/worktree.mjs list
node scripts/worktree.mjs remove P3-cre
```

The helper creates a sibling worktree and branch named `codex/<slug>`.

## Assignment protocol
Before dispatching a writing agent, state:
- task ID
- owned directories/files
- forbidden files
- acceptance checks
- expected commit(s)

Example ownership:
- P2 worktree: `packages/simulation-core/**`, its tests/docs only
- P3 worktree: `integrations/chainlink-cre/**`, partner evidence only

Shared domain schemas should be frozen/merged first rather than edited concurrently.

## Merge order
1. merge foundational protocol/schema branch
2. rebase dependent worktrees
3. run their verification
4. merge one at a time
5. run root verification after each integration

Do not copy `.env.local` or secrets into worktrees by default.
