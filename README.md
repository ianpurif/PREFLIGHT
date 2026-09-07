# Preflight — Confidential Robot Deployment Gate

> **P1–P7 software is implemented. The P4 registry is live on Sepolia, the narrow AI deployment agent, judge-facing digital twin, and offline deterministic rehearsal are locally/adversarially verified. Physical Ledger/Clear Signing evidence remains externally blocked; P8 is not started.**

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
- **EVM client:** viem exact-binding registry reads + EIP-712 verification
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
[`contracts/deployments/sepolia.json`](contracts/deployments/sepolia.json). P5 now implements the
full exact EIP-712 request, current Ledger DMK/WebHID/Ethereum signer adapter, authorized-signer
policy, pre/post registry checks, signature recovery, and durable one-time authorization. It fails
closed without a Ledger-issued origin token and an exact accepted Clear Signing descriptor response.
P5.2 adds the narrow tool-calling deployment agent: it locks canonical identifiers, inspects public
evaluation/live Sepolia clearance state, and can call only the existing deterministic preparation
authority. It cannot sign, consume a release, mutate the registry, or declare authorization. Local
evidence reaches the Ledger-required boundary and a live read-only Sepolia trace blocks the existing
unregistered fixture; no external model run is claimed because provider configuration is absent.
P6 adds the root judge dashboard and R3F digital twin. It renders only a server-side public
projection of the existing P2/P3 fixture, keeps the 487 public judge headline distinct from the
bounded three-template P2 report, and blocks the mutated Build B before any Ledger request. Physical
cases A–F are not yet captured, so P5 partner evidence remains incomplete.
P7 adds an explicit demo-owned reset and an offline deterministic A/B/C rehearsal. It reuses the
existing P2 evaluator and P5.2 host-owned agent/ReleaseService with fixed demo clock, registry
snapshot, attempt IDs, and nonce. It never silently substitutes for live OpenAI, Sepolia, CRE,
Ledger, or Speculos execution.

## Judge path

Open `/` and follow the three controls in the left rail:

1. **Evaluate Build A** starts in `HOLD` with the real deterministic fixture's restricted-zone,
   speed, and payload findings. The twin shows the route conflict.
2. **Switch to Cleared Build B** shows the same-envelope `CLEAR` public result, Chainlink CRE
   authenticated-simulation evidence, the deployed Sepolia registry identity, and the explicit
   human Ledger boundary. The headline reads `487 scenarios`; the UI also discloses that the
   authoritative checked-in P2 fixture is bounded to three committed templates.
3. **Mutate Build** changes the build ID/artifact digest and immediately shows
   `CLEARANCE_BINDING_MISMATCH`. The old clearance cannot be reused and the Ledger action is
   unavailable.

`Request Ledger Approval` calls the existing P5.2 preparation endpoint only when configured. A
real `LEDGER_APPROVAL_REQUIRED` response hands the exact prepared request to `/p5-ledger`; missing
provider/signer configuration is shown as unavailable and never becomes fake authorization. The
Ledger panel labels Speculos as a development/test simulator and states that physical hardware is
not demonstrated. No CRE live DON run, clearance transaction, or robot activation is claimed.

## Deterministic demo rehearsal

The clean-checkout judge path has one explicit offline preparation command. It uses only the
checked-in deterministic P2 fixture, a local registry reader fixture, and the existing P5.2
state machine; it does not call OpenAI, Sepolia, CRE, Ledger, or Speculos.

```bash
bun install --frozen-lockfile
bun run verify
bun run demo:setup       # reset + seed .data/preflight-demo + print A/B/C traces
bun run dev              # starts the web shell; the live API remains explicitly unavailable without RPC/provider config
# open http://localhost:3000 and use Reset demo between judge runs
bun run demo:reset       # removes only .data/preflight-demo; safe to repeat
bun run demo:run         # repeat the prepared offline A/B/C rehearsal
bun run demo:rehearse    # repeat the deterministic Playwright judge flow
```

The rehearsal's public scenarios are stable: A is `HOLD` with no Ledger request, B is `CLEAR`
with a local deterministic clearance and `LEDGER_APPROVAL_REQUIRED`/exact prepared intent awaiting
human review, and C recomputes a different Build B digest and stops with
`BLOCKED / CLEARANCE_BINDING_MISMATCH` before Ledger. The local clearance and scripted model are
explicitly rehearsal evidence, not a live positive Sepolia record or external model run. CRE is
represented by the recorded authenticated simulation evidence already documented; the registry
link remains live/read-only metadata; Speculos and physical hardware remain separate boundaries.

## Prerequisites

- Git 2.40+
- Bun 1.4.x (CRE minimum: 1.2.21)
- Foundry (`forge`, `anvil`, `cast`) for contract work
- Chromium/Chrome for WebHID Ledger integration
- A supported Ledger device, current Ethereum app, issued origin token, and accepted ERC-7730 descriptor are required to close P5 hardware evidence

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
bun run demo:setup      # deterministic offline judge fixture and A/B/C rehearsal
bun run demo:reset      # remove demo-owned mutable state only
bun run demo:run        # repeat deterministic offline A/B/C rehearsal
bun run demo:rehearse   # deterministic Playwright judge flow
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

P8 may address submission evidence only. Physical Ledger/Clear Signing, live positive provider
execution, and external partner evidence remain separate open limitations documented in
`docs/planning/CURRENT.md`. No robot activation or UI authority is implied by the P7 rehearsal.
