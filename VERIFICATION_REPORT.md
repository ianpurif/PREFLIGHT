# Boilerplate Verification Report

**Date:** 2026-09-05
**Scope:** boilerplate/harness only; product behavior intentionally absent.

## Passed in artifact-generation environment

- `node scripts/verify-scaffold.mjs`
  - required structure present
  - JSON manifests parse
  - boilerplate/product guardrails present
  - `.env.example` contains no obvious secret-like values
  - root + scoped `AGENTS.md` context chains stay below 32 KiB
- `node --test scripts/scaffold.test.mjs` — **3/3 pass**
  - selected partners remain Chainlink + Ledger only
  - safety-language invariants preserved
  - legacy LedgerJS packages absent
- JSON/TOML/GitHub Actions YAML parsed successfully.
- Every `scripts/*.mjs` file passed `node --check`.
- `scripts/worktree.mjs` was exercised in a disposable Git repository: create/list/remove all passed.
- Dependency-free TypeScript scaffold checks passed for:
  - `packages/domain`
  - `packages/simulation-core`
  - `packages/ledger-gate`
  - `packages/chain-client`
  - `integrations/chainlink-cre`

## Not executable in artifact-generation environment

The container did not have Bun or Foundry installed and could not download dependencies. Therefore these commands are configured but **not falsely reported as passed** here:

- `bun install` / dependency-backed Next.js, Fastify, Ledger, CRE builds
- Biome lint
- Bun unit-test graph
- Playwright browser smoke test
- `forge build` / `forge test`
- real Chainlink CRE simulation
- real Ledger hardware interaction

## First real-machine gate

Run:

```bash
bun install
bun run doctor
bun run verify
```

Commit the generated `bun.lock`. CI will then use `bun install --frozen-lockfile`.

Real CRE and Ledger evidence belongs to implementation tasks P3/P5 and must never be simulated/faked merely to satisfy the checklist.
