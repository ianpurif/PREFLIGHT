# P14 live bounty evidence — 2026-09-09

**Evidence boundary:** This artifact contains only public Ethereum, Graph, account-binding, and
provenance fields. It does not contain a private policy, CRE envelope, blind, credential, API key,
password, callback secret, model payload, signature, or private key.

## Chainlink source evaluation

The source evaluation is the existing account-owned result produced by the authenticated official
CRE CLI simulation. It is not live CRE/DON execution.

| Field | Public value |
|---|---|
| Account | `account:3dbe64397ce11e131f7286277d93294d` |
| Evaluation | `evaluation:1a89c0ad9a5e0672c086ad58346595ee` |
| Verdict | `CLEAR` |
| Execution mode | `official-cre-cli-simulation` |
| CRE CLI | `1.32.0` |
| Site / robot / build | `site:192e49ae56c0abf18cd827706b909ce3` / `robot:ce87964de66e14684b1b3c68a7a4b1be` / `robot-build:075049b64bf7dd982705cac9a40d0f27` |
| Public safety-envelope commitment | `sha256:69af11588f15c0c6cf94087c41f2e03c051bfab0209158d8669013b2c53b7369` |
| Evaluator / input digest | `evaluator-version:warehouse-rules-v1` / `sha256:a49c510f57d4253bbf7dd25d558d62352f8d1ec40119f20bd1349ef5b1e675ea` |

## Sepolia clearance

The existing P12 operator command recorded the exact persisted `CLEAR` through the deployed
`RovaultaRegistry` and verified the receipt events plus exact readback:

```text
command (public arguments; RPC/registrar values were loaded from the ignored .env):
  ROVAULTA_CLEARANCE_ACCOUNT_ID=account:3dbe64397ce11e131f7286277d93294d
  ROVAULTA_CLEARANCE_EVALUATION_ID=evaluation:1a89c0ad9a5e0672c086ad58346595ee
  ROVAULTA_CLEARANCE_ID=clearance:account-3dbe6439-20260909-01
  ROVAULTA_CLEARANCE_CONFIRM=YES
  ROVAULTA_CLEARANCE_OUTPUT_PATH=.data/clearance-p13-sepolia.json
  bun run --cwd apps/api record:sepolia-clearance
network: ethereum-sepolia
chainId: 11155111
registry: 0xFB270cc222efa8B5005AA097dD512Be2558dde65
transaction: 0xa1854cef882006928b312d418372e861f6470125beaa23c97708a8c8b077e4a1
block: 11668773
issuer: 0xaa5768d0f2157f8781efb975cdd9aec99e7879e3
clearanceId: clearance:account-3dbe6439-20260909-01
clearanceDigest: 0xa2434762455812fe57479dc5c86b41f13fbb7a111d23e32101327073b1d4a10d
robotBuildDigest: 0xc496d3fc98485bcbdef70658f36449da918afc3ec0e56610dff5eeab7bea4a3e
issuedAt: 1788967128
expiresAt: 1789571928
ClearanceRecorded: true
ClearanceBindingsRecorded: true
exact registry readback: true
```

## Live The Graph query

The deployed Sepolia Subgraph Studio endpoint returned the exact clearance entity for the public
digest. The endpoint is labelled Subgraph Studio evidence, not Gateway or decentralized-network
evidence. The query-only script returned the allowlisted public entity and requested digest; the
production API reader performed the exact binding, verdict, expiry, and revocation checks and
returned `MATCHED`.

```text
query URL: https://api.studio.thegraph.com/query/1758964/rovaulta-registry/0.1.0
deployment: QmV5cGZDKqNHLMtcsBiCTERSHXJyY6FQemouvzhHQ7rxoj
provider: studio
status: MATCHED
clearanceDigest: 0xa2434762455812fe57479dc5c86b41f13fbb7a111d23e32101327073b1d4a10d
indexedAtBlock: 11668773
blockHash: 0xbeb1825cd74ad4600852342cb927cc82604a10d19a7281181852bfdb2a5f5f4b
revoked: false
indexingErrors: false
```

The machine-readable public projection is in
[`p14-live-sepolia-graph-2026-09-09.json`](p14-live-sepolia-graph-2026-09-09.json).

## Agent and Ledger boundary

The live Graph context is verified independently. The normal account-agent evidence command was
attempted with the account-owned public clearance and the live Studio provider, but stopped before
model execution because `GEMINI_API_KEY` is not configured. No model
execution, agent decision, Ledger signature, or authorization is claimed from that blocked run.

Ledger software tests remain green and the existing Speculos evidence remains partial. Physical
Ledger use and official Clear Signing A/B/E/F evidence were not performed and are not claimed.

This artifact records the provider state on 2026-09-09. The later real Gemini account-agent run,
including the live Graph gate and `LEDGER_APPROVAL_REQUIRED` handoff, is recorded separately in
[`p15-live-gemini-graph-ledger-boundary-2026-09-10.md`](p15-live-gemini-graph-ledger-boundary-2026-09-10.md).
