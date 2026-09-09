# P11 The Graph Qualification Evidence

**Label:** historical implementation checkpoint; superseded live provider evidence is recorded in
[`p14-live-bounty-evidence-2026-09-09.md`](p14-live-bounty-evidence-2026-09-09.md).

**Date:** 2026-09-09

## Qualification boundary

Rovaulta targets **The Graph — Best AI Tooling or AI Use Case with The Graph — From Scratch**.
The code now contains a reproducible Sepolia subgraph and a server-only Gateway path that makes
The Graph load-bearing for account-backed release preparation:

```text
account evaluation + public clearance
  -> exact clearance digest query to The Graph Gateway
  -> public MATCHED / NOT_FOUND / REVOKED / EXPIRED / MISMATCH context
  -> bounded deployment-agent decision
  -> direct P5 Sepolia check
  -> Ledger-required handoff
```

The Graph is context, not final authority. P5 still performs the exact registry, expiry, signer,
nonce, and human Ledger checks.

## Implemented artifacts

- `integrations/the-graph/subgraph/schema.graphql` — public clearance entity only.
- `integrations/the-graph/subgraph/subgraph.yaml` — Sepolia `RovaultaRegistry` data source at
  `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, starting at deployment block `11644462`.
- `integrations/the-graph/subgraph/src/rovaulta-registry.ts` — public record, binding, and
  revocation event mappings. No private envelope, blind, rule, trace, credential, or model data.
- `integrations/the-graph/package.json` — pinned `@graphprotocol/graph-cli@0.98.1` and
  `@graphprotocol/graph-ts@0.38.2` codegen/build/deploy commands.
- `apps/api/src/graph/provider.ts` — server-only Gateway query and strict digest/binding/chain/
  registry/verdict/revocation/expiry/block/issuer validation.
- `apps/api/src/agent/index.ts` and `apps/api/src/agent/deployment-agent.ts` — authenticated
  account resolution and mandatory `getGraphContext` gate before P5 preparation.
- `apps/api/scripts/p11-graph-live-evidence.ts` — operator command that invokes the actual
  account-backed AI-agent path and prints only the public audit projection.

## Local verification (not prize evidence)

| Check | Result |
|---|---|
| `bun run --cwd integrations/the-graph build` | PASS; Graph CLI codegen and WASM compilation completed |
| `bun test apps/api/test/graph-provider.test.ts apps/api/test/deployment-agent.test.ts` | PASS; 18 tests, 114 assertions |
| Graph Gateway request contains only exact public digest and allowlisted fields | PASS; injected transport test |
| Missing/revoked/expired/mismatched/malformed Graph state blocks account agent | PASS; injected provider/agent tests |
| P5 remains after Graph gate | PASS; matched test reaches `LEDGER_APPROVAL_REQUIRED`, direct P5 reader remains next |
| `bun run verify` | PASS; lint, typecheck, 204 tests/2,958 assertions, 8 build tasks, Foundry, and scaffold verification |

These tests use injected responses and are deliberately not described as live provider evidence.

## Live operator procedure

1. Create the Subgraph Studio subgraph and deploy the checked-in manifest:

   ```bash
   bun run --cwd integrations/the-graph build
   GRAPH_SUBGRAPH_SLUG='account/rovaulta-registry' \
   GRAPH_DEPLOY_KEY='do-not-log' \
   GRAPH_VERSION_LABEL='0.1.0' \
   bun run --cwd integrations/the-graph deploy
   ```

   The deploy script authenticates without echoing the deploy key. Do not put the key in the
   repository or evidence.

2. Set `THE_GRAPH_API_KEY`, `THE_GRAPH_SUBGRAPH_ID`, and optional `THE_GRAPH_API_URL` only in the
   server environment. The API key must never use a `NEXT_PUBLIC_` name.

3. Use a real account-created `CLEAR` evaluation and a public P4 clearance whose exact digest was
   recorded by the deployed Sepolia registry. Set the public clearance file, account identifier,
   and public signer address:

   ```bash
   ROVAULTA_P11_ACCOUNT_ID='account:<32 hex chars>' \
   ROVAULTA_P11_CLEARANCE_PATH='./public-clearance.json' \
   ROVAULTA_P11_SIGNER_ADDRESS='0x<public address>' \
   bun run --cwd apps/api evidence:p11-graph
   ```

4. The redacted output must show the same clearance digest, a live Gateway `MATCHED` context, the
   agent's `getGraphContext` event, and `LEDGER_APPROVAL_REQUIRED` before any human Ledger action.
   Capture the provider/subgraph identity, query timestamp, block number/hash, and output after
   removing credentials and any confidential payload.

The small query-only helper `bun run --cwd integrations/the-graph evidence:live` can verify a
public digest before the full account-agent command. It exits nonzero for missing credentials or a
missing entity and never prints the API key.

At this historical checkpoint the helper failed closed with `THE_GRAPH_API_KEY is required; no live
evidence was collected`. The later P14 run used the deployed Subgraph Studio query endpoint and
captured a real indexed `MATCHED` response without changing the subgraph data.

## Current status and blockers

| Requirement | Status | Evidence | Remaining blocker |
|---|---|---|---|
| Start Fresh / From Scratch pool | BLOCKED | Repository history and prize wording are documented in `docs/partners/THE_GRAPH.md` | Event-start timestamp and submitted pool must be verified by the submitter; pre-existing work must be disclosed honestly |
| Actual Subgraph product | PASS | Manifest, schema, ABI, mapping, pinned CLI build, hosted Studio deployment, and P14 indexed entity |
| Live Graph provider data | PASS (Studio), PARTIAL (Gateway) | P14 direct Studio query and strict API reader returned `MATCHED` for the real clearance | Gateway subgraph ID and network publication remain unverified |
| Load-bearing AI reasoning/decision | PASS (code), BLOCKED (live model proof) | Account agent blocks every non-`MATCHED` state and permits P5 only after the Graph gate | External model key/model is absent for the live account-agent command |
| Open-source documentation | PASS | README, partner contract, architecture, env example, this artifact | Add hosted ID and redacted output after deployment |
| Short demo evidence | BLOCKED | Reproducible operator procedure exists | Record a 2–4 minute public demo with live provider result and decision transition |

No live response, subgraph deployment, account trace, or qualification claim is fabricated by this
artifact.
