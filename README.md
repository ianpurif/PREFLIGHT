# Preflight — Confidential Robot Deployment Gate

> **P1–P4 implemented and verified; the P4 registry is live on Ethereum Sepolia. P5–P8 remain intentionally unimplemented.**

Preflight is a confidential deployment gate for autonomous warehouse robots: an exact robot software build must pass a site's private evaluation envelope, then a human must authorize that exact build on Ledger hardware before deployment.

This repository is specialized for an ETHGlobal **From Scratch** build using **Chainlink CRE Confidential Workflows + Ledger DMK** as load-bearing integrations.

## Stack

- **Runtime / monorepo:** Bun 1.4.x (`>=1.2.21` required by CRE), TypeScript 5.9-compatible project configs, Turborepo
- **Web / demo:** Next.js 16, React 19, React Three Fiber + Three.js
- **API / orchestration:** Fastify 5
- **Deterministic domain + simulation:** dependency-light TypeScript packages
- **Confidential evaluation:** Chainlink CRE TypeScript SDK (`@chainlink/cre-sdk`), WASM/QuickJS constraints respected
- **Attestation registry:** Solidity + Foundry, Sepolia-first
- **Hardware approval:** Ledger Device Management Kit + WebHID + Ethereum Signer Kit; EIP-712 deployment intents
- **EVM client:** viem (implementation phase)
- **Quality:** Biome, Bun test, Playwright, Foundry, GitHub Actions
- **Agentic harness:** root/scoped `AGENTS.md`, project-local Codex skills, custom subagents, worktree tooling, review + verification loops

## Why this stack

1. Chainlink's TypeScript CRE tooling runs naturally with Bun and has WASM constraints that are easier to honor in an isolated integration package.
2. The simulation/evaluator core stays deterministic and dependency-light so it can be tested aggressively and run inside the P3 TEE callback without dragging web/server assumptions into CRE.
3. Ledger DMK is isolated to the browser-facing hardware boundary; the backend never receives the device key.
4. Solidity stays in a Foundry workspace so onchain attestations can be fuzzed/invariant-tested independently of the TypeScript monorepo.
5. React Three Fiber gives the hackathon demo a fast path to a memorable warehouse simulation without coupling simulation truth to rendering.

## Repository status

The repository now contains the canonical domain protocol, deterministic simulator/evaluator,
Chainlink CRE confidential-evaluation workflow with authenticated local simulation evidence, and a
minimal exact-binding attestation registry with Foundry unit/fuzz/invariant coverage. The registry
is [deployed and source-verified on Sepolia](https://sepolia.etherscan.io/address/0xFB270cc222efa8B5005AA097dD512Be2558dde65),
with its public chain/contract identity recorded in
[`contracts/deployments/sepolia.json`](contracts/deployments/sepolia.json). The Ledger release gate,
demo UI, and later phases remain scoped placeholders.

## Prerequisites

- Git 2.40+
- Bun 1.4.x (CRE minimum: 1.2.21)
- Foundry (`forge`, `anvil`, `cast`) for contract work
- Chromium/Chrome for WebHID Ledger integration
- A Ledger device is optional until the hardware integration task

## Start

```bash
git init
# Configure your real Git identity before the first commit.
cp .env.example .env.local
bun install
bun run doctor
bun run verify:scaffold
```

Commit the generated `bun.lock` after the first successful install. CI automatically switches to frozen-lockfile mode once the lockfile exists.

Then install the official partner-facing Codex skills when you are ready to implement integrations:

```bash
bash scripts/install-partner-skills.sh
```

Do **not** put keys or confidential envelope inputs in repository files. P3 local simulation uses ignored environment files; later deployment must use the CRE-supported secret path.

## Main commands

```bash
bun run dev             # all dev services through Turbo
bun run lint            # Biome
bun run typecheck       # all TS packages
bun run test            # unit tests
bun run build           # build graph
bun run test:e2e        # Playwright smoke/e2e
bun run contracts:test  # Foundry tests
bun run verify          # full local gate
bun run verify:scaffold # dependency-free scaffold integrity checks
```

## Codex operating flow

1. Read root `AGENTS.md` and the nearest scoped `AGENTS.md`.
2. Read `docs/planning/CURRENT.md`, then the task's architecture/partner docs.
3. For multi-surface changes, create/update an execution plan in `docs/planning/exec-plans/`.
4. Delegate **read-heavy** exploration/review to subagents; isolate parallel writes in Git worktrees.
5. Implement the smallest vertical slice that proves the requirement.
6. Run targeted checks, then `bun run verify`.
7. Run a separate reviewer/subagent or Codex `/review` before merge.
8. Update task state, decision log, evidence matrix, and AI-use log.

See `docs/codex/OPERATING_MODEL.md`.

## Hard product invariants

- A Preflight result means **“this exact build passed this specified evaluation envelope”**, never “this robot is safe.”
- The evaluator that determines clearance is deterministic; an LLM may orchestrate but must never decide the safety verdict.
- Private site rules must not be written onchain or logged outside the confidential boundary.
- Clearance is bound to an exact robot build digest + site commitment + evaluator version + expiry.
- Changing the build/site commitment invalidates the old clearance.
- Ledger is the final human approval gate for deployment; no backend-held key may substitute for it in the real demo path.

## Next task

P4 is complete and deployed on Sepolia. Start from `docs/planning/CURRENT.md`; do not begin P5
without an explicit implementation prompt and the required Ledger hardware/SDK readiness.
