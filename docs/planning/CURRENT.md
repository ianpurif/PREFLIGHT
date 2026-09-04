# Current State

## Phase
**Boilerplate complete; product implementation intentionally not started.**

## What exists
- monorepo/tooling manifests
- root + scoped Codex instructions
- project-local Codex skills
- read-only specialist subagents
- product/architecture/trust-boundary docs
- Chainlink + Ledger integration contracts and package scaffolds
- Next.js/Fastify/simulation/domain/contract shells
- CI + dependency-free scaffold verification
- worktree helper and agentic operating docs
- hackathon/partner evidence + AI-use bookkeeping

## Next exact task
Wait for the user's next implementation prompt. Do not autonomously choose a product feature.

When implementation starts, prefer the first vertical slice that proves one end-to-end invariant rather than building all layers independently.

## Known environment limitation at boilerplate creation
The artifact-generation container did not have Bun or Foundry installed and could not download packages, so dependency-backed builds could not be executed here. `scripts/verify-scaffold.mjs`, Node tests, JSON/TOML parsing, and dependency-free TypeScript checks are the baseline verification path. Run `bun install`, commit the generated `bun.lock`, then run `bun run verify` in the real development environment before implementation. After the lockfile is committed, switch CI installs to `bun install --frozen-lockfile`.
