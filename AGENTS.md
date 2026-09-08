# Rovaulta Agent Instructions

## Mission

Build **Rovaulta**, a confidential deployment gate for autonomous warehouse robots. The product must prove that an exact robot build passed a site's private evaluation envelope, then require a Ledger-backed human approval before that exact build can be released.

This repository begins as a **boilerplate**. Do not silently implement future product behavior unless the current task explicitly asks for it.

## First reads

For every non-trivial task:

1. Read `docs/planning/CURRENT.md`.
2. Read `docs/product/BRIEF.md`.
3. Read `docs/architecture/OVERVIEW.md` and `docs/architecture/TRUST_BOUNDARIES.md`.
4. Read the nearest scoped `AGENTS.md` for files you will touch.
5. If Chainlink or Ledger is involved, read the relevant file in `docs/partners/`.

## Non-negotiable invariants

- Never claim a simulation/evaluation pass proves real-world robot safety.
- Clearance semantics: **exact build + exact site commitment + evaluator version + expiry**.
- Safety verdict logic must be deterministic. LLMs may explain/orchestrate, never decide clearance.
- Sensitive site envelope inputs and confidential intermediate values must not escape the Chainlink CRE confidential boundary.
- Never log private safety rules, restricted geometry, secrets, raw credentials, or confidential API responses.
- Never move Ledger signing authority to the backend. Hardware confirmation remains the release gate.
- Use Sepolia/test environments until a task explicitly authorizes anything else.
- Partner integrations must be load-bearing, not prize-decoration.

## Change discipline

- Prefer the smallest complete vertical slice over broad speculative abstractions.
- Do not add a dependency unless it removes meaningful complexity or is required by a partner SDK.
- Do not introduce another partner without an explicit product reason and user approval.
- Do not invent unsupported APIs. When partner SDK details matter, verify current official docs before implementation.
- Preserve public interfaces unless the plan explicitly changes them.
- No TODO soup: every TODO must point to a task ID in `docs/planning/TASKS.md` or be removed.

## Planning

Create an execution plan under `docs/planning/exec-plans/` when a task:

- spans 3+ packages/surfaces,
- changes trust boundaries or protocol schemas,
- adds a partner integration,
- changes contract state/authorization,
- or is expected to take multiple Codex iterations.

Use the `$rovaulta-exec-plan` skill when available.

## Verification loop

Before reporting completion:

1. Run the narrowest tests for changed code.
2. Run typecheck/lint for affected workspaces.
3. Run security/partner-specific checks when relevant.
4. Run `bun run verify` for merge-ready changes.
5. Ask a separate reviewer/subagent to inspect the diff without editing it.
6. Resolve findings or document a justified exception in `docs/planning/DECISIONS.md`.

Never say “verified” if a command was not actually run. State environment limitations explicitly.

## Agent delegation

Use subagents for bounded, read-heavy work: architecture review, docs/API research, test-gap analysis, partner compliance, and diff review. Keep the main agent responsible for requirements, decisions, integration, and final verification.

Parallel write-heavy tasks must use separate Git worktrees. Do not let multiple agents modify the same working tree concurrently.

## Git / hackathon integrity

- Keep commits small, thematic, and chronological.
- Never squash the entire hackathon into one final commit.
- Never rewrite published history unless explicitly requested.
- Record AI-assisted work in `docs/ai/AI_USAGE.md` and relevant prompt/spec artifacts.
- Keep reused/public starter material distinguishable from new project work.

## Definition of done

A task is done only when implementation, tests, documentation, task state, and evidence hooks all agree. Passing code with stale docs is not done.
