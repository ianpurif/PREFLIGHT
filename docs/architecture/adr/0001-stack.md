# ADR-0001: Bun/TypeScript + Foundry + Next.js/R3F + Fastify

**Status:** Accepted for boilerplate

## Decision
Use Bun/TypeScript across web, API, deterministic packages, and Chainlink integration; isolate Solidity in Foundry; use Next.js + React Three Fiber for the demo; use Fastify for orchestration; use Ledger DMK in a browser-only adapter.

## Why
- Chainlink CRE TypeScript SDK requires Bun 1.2.21+; the boilerplate targets current Bun 1.4.x and runs workflows in a constrained WASM/QuickJS environment.
- Shared TypeScript reduces cross-language serialization errors during a short hackathon while keeping the deterministic core portable.
- Foundry gives contract fuzz/invariant testing without imposing EVM tooling on the rest of the repo.
- React Three Fiber provides a high-impact deterministic visual demo while separating render state from simulation truth.
- Fastify is small, typed, fast, and easy to test through injection.
- Ledger's current DMK path is the forward-compatible hardware API; legacy LedgerJS is intentionally excluded.

## Revisit if
A partner requirement makes Go CRE materially safer or a real robotics simulator requires Python/ROS. That must be a deliberate ADR, not an opportunistic rewrite.
