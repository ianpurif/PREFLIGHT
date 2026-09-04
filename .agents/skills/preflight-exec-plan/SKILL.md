---
name: preflight-exec-plan
description: Create or update an execution plan for a multi-surface Preflight implementation task before coding. Use when work spans 3+ packages, changes a trust boundary, adds a partner integration, changes contract state, or needs multiple Codex iterations.
---

# Preflight Exec Plan

1. Read root + scoped `AGENTS.md`, `docs/planning/CURRENT.md`, product brief, relevant architecture docs, and partner docs.
2. State the user-visible outcome and non-goals.
3. Record invariants that could be broken.
4. Map change surfaces and dependency order.
5. Define acceptance tests **before** implementation.
6. Split parallelizable read work from write work. Parallel writes require worktrees.
7. Create `docs/planning/exec-plans/<task-id>-<slug>.md` from `TEMPLATE.md`.
8. Keep the plan live: mark discoveries, decisions, verification evidence, and deviations.

Do not start broad refactors just because the plan exposes them.
