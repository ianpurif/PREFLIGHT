# P15 live Gemini account-agent evidence — 2026-09-10

**Evidence class:** live Google AI Studio Gemini provider execution over the existing
account-owned Sepolia clearance and hosted The Graph Studio provider.

This is a pre-signing handoff only. No Ledger device was connected, no signature was requested,
and no release was authorized. The run used only public deployment/registry data; it did not send
the CRE envelope, blind, private policy, credentials, confidential model payload, or a signature to
Gemini or to this artifact. Gemini did receive the intended canonical public request and public tool
observations described below.

## Run identity

| Field | Public value |
|---|---|
| Captured at | `2026-09-10T13:02:38.898Z` |
| Account | `account:3dbe64397ce11e131f7286277d93294d` |
| Evaluation | `evaluation:1a89c0ad9a5e0672c086ad58346595ee` |
| Evaluation provenance | `official-cre-cli-simulation` (not live CRE/DON) |
| Execution | live provider path (not a mock) |
| Gemini provider/model | `gemini` / `gemini-3.5-flash` |
| Agent attempt | `dfaef3fb-5340-454a-a6e3-1c0ed67fc97d` |

The repository default remains `gemini-2.5-flash`. This Google AI Studio key rejected that model as
unavailable to new users, so the operator supplied the documented server-side `GEMINI_MODEL` override
`gemini-3.5-flash` for this run. No provider fallback was added.

## Reproducible operator command

The command below shows only public values and an environment-variable placeholder. The API key
and RPC credentials were loaded from the ignored local `.env` file and are intentionally omitted.

```powershell
$env:NODE_PATH=(Resolve-Path 'node_modules').Path
$env:GEMINI_MODEL='gemini-3.5-flash'
$env:ROVAULTA_P11_ACCOUNT_ID='account:3dbe64397ce11e131f7286277d93294d'
$env:ROVAULTA_P11_CLEARANCE_PATH='.data/clearance-p13-sepolia.json'
$env:ROVAULTA_P11_SIGNER_ADDRESS='0xaA5768d0f2157F8781efb975CDd9aec99e7879E3'
$env:ROVAULTA_AUTHORIZED_SIGNERS='0xaA5768d0f2157F8781efb975CDd9aec99e7879E3'
$env:THE_GRAPH_STUDIO_QUERY_URL='https://api.studio.thegraph.com/query/1758964/rovaulta-registry/0.1.0'
bun run --cwd apps/api evidence:p11-graph
```

`NODE_PATH` is an environment-only workaround for the existing mixed Windows/WSL workspace
symlink layout; it does not change the application or agent authority model.

## Public execution result

The real agent made all seven host-selected function calls in order. The host parsed and validated
each call before advancing the deterministic state machine:

| Sequence | Tool | Host result |
|---:|---|---|
| 1 | `resolveDeploymentTarget` | `RESOLVED` |
| 2 | `getDeploymentContext` | `LOCKED` |
| 3 | `getEvaluationStatus` | `CLEAR` |
| 4 | `getGraphContext` | `MATCHED` |
| 5 | `getClearance` | `ELIGIBLE` |
| 6 | `prepareDeploymentIntent` | `PREPARED` |
| 7 | `getLedgerAuthorizationStatus` | `AWAITING_HUMAN` |

Final status: **`LEDGER_APPROVAL_REQUIRED`**.

Public target binding:

- site: `site:192e49ae56c0abf18cd827706b909ce3`
- robot: `robot:ce87964de66e14684b1b3c68a7a4b1be`
- build: `robot-build:075049b64bf7dd982705cac9a40d0f27`
- build digest: `sha256:c496d3fc98485bcbdef70658f36449da918afc3ec0e56610dff5eeab7bea4a3e`

Live authority checks recorded by the agent:

- Sepolia chain ID: `11155111`
- registry: `0xFB270cc222efa8B5005AA097dD512Be2558dde65`
- exact clearance inspection block: `11675108`
- Graph provider: Subgraph Studio, status `MATCHED`
- Graph indexed block: `11668773`
- clearance digest: `0xa2434762455812fe57479dc5c86b41f13fbb7a111d23e32101327073b1d4a10d`
- clearance issuer: `0xaa5768d0f2157f8781efb975cdd9aec99e7879e3`
- clearance issued/expiry: `1788967128` / `1789571928`
- source Sepolia transaction: `0xa1854cef882006928b312d418372e861f6470125beaa23c97708a8c8b077e4a1`
- protocol intent digest: `sha256:29b1ce88e5b06e411e03956f20053962982497f3645077e3fe0ed3c6f5917b23`
- typed-data digest: `0x44e32c71e1e0a422ff5d8ca7d77ca09d09b882222d8379c60ba9a08a670cf32f`
- Ledger authorization status: `AWAITING_HUMAN`

The model never received a signing or authorization tool. `prepareDeploymentIntent` produced a
proposal, and the final host state remained `LEDGER_APPROVAL_REQUIRED`; no `AUTHORIZED` result,
signature, or physical-device use is claimed.

## Remaining Ledger evidence boundary

The software and agent boundary are exercised through a real provider run. Physical Ledger
approval, Clear Signing Tester A/B/E/F, and signature-consumption evidence remain blocked on the
device/origin-token/descriptor access documented in the Ledger partner evidence. The next
qualification action is to connect an eligible Ledger, configure its issued origin token and
accepted descriptor, then run the existing `/p5-ledger` flow against this exact prepared intent.
