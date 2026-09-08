# Codex Operating Model

## Context engineering
Codex should receive **the minimum authoritative context**, not the whole repository narrative every time.

Hierarchy:
1. root `AGENTS.md` — global invariants and workflow
2. nearest scoped `AGENTS.md` — local implementation rules
3. `docs/planning/CURRENT.md` — tiny current state / next task
4. one execution plan — detailed task state
5. relevant architecture + partner doc — only when needed

Do not copy the same instructions into every file. Scoped instructions should add local constraints.

## Orchestrator pattern
The primary Codex session owns:
- interpreting user intent
- architecture decisions
- work decomposition
- integration of branches/worktrees
- final verification and user report

Subagents are best used for bounded analysis, not for competing architectural authority.

## Suggested subagent sequence
For a substantial task:
1. `rovaulta-explorer` maps files and unknowns.
2. `rovaulta-architect` attacks the plan if trust boundaries change.
3. Main agent implements or assigns isolated worktrees.
4. `rovaulta-verifier` looks for missing tests.
5. `rovaulta-reviewer` reviews final diff read-only.
6. `partner-auditor` runs when Chainlink/Ledger is touched.

## Parallelism rule
Parallelize **independent exploration** freely within the configured thread cap. Parallelize writes only in separate worktrees and only when their ownership is non-overlapping.

Bad parallelism: two agents editing shared schemas simultaneously.
Good parallelism: one worktree builds simulation fixtures while another creates isolated UI scene primitives against an already-frozen interface.

## Long-running work
Every multi-iteration task gets an exec plan. After each meaningful milestone:
- mark the plan
- record unexpected facts
- run narrow verification
- checkpoint with a small commit

Do not leave essential state only in chat history.

## Review loop
Use a read-only reviewer or Codex `/review` after verification. Reviewer findings are inputs, not automatic truth: reproduce material findings, fix them, and rerun the affected checks.
