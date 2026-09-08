# Rovaulta API

## P5.2 deployment agent

The API can run one narrow model-driven deployment-preparation mission. Configure these ignored
environment values:

```text
OPENAI_API_KEY=<local secret>
ROVAULTA_AGENT_MODEL=<explicit Responses API model>
ROVAULTA_AGENT_CATALOG_PATH=<path to public deployment catalog JSON>
EVM_RPC_URL=<Sepolia RPC>
ROVAULTA_AUTHORIZED_SIGNERS=<operator Ledger address allowlist>
```

The catalog format is shown in `config/deployment-catalog.example.json`. It contains complete public
P1 clearance records because P4 is intentionally non-enumerable. Do not place a private safety
envelope, blind, credential, raw signature, or confidential CRE payload in this file. The committed
example is expired and deliberately unregistered; it is a shape/example, not a live valid clearance.

Start the API with `bun run --cwd apps/api dev`, then submit an exact request:

```json
{
  "request": "Deploy Robot AMR-17 using build v4.7.21 to Warehouse Manila-01.",
  "signerAddress": "0x...connected-ledger-public-address"
}
```

to `POST /agent/deployment/prepare`. A successful response is
`LEDGER_APPROVAL_REQUIRED` and includes the exact existing P5 prepared request. The model cannot
sign it. After the separate browser `/release/consume` flow succeeds, post only the returned
`attemptId` to `POST /agent/deployment/status`; that read can report `AUTHORIZED` only from the
stored cryptographically verified P5 result.

This is deliberately **not** an open-ended chat endpoint. Before a provider call, the host matches
the entire input against catalog-generated public forms such as `Deploy Robot <robot> using build
<build> to <site>.`, `Deploy <build> for <robot> to <site>.`, or `Prepare <robot> <build> for
<site>.` Each placeholder must be one exact public catalog alias. Other text, including a second
target or private context, fails before the model is invoked. The raw submitted string is discarded;
the provider and public attempt audit receive only a host-generated canonical public request.

The Responses request uses `store: false`, one strict function schema, one host-selected next tool,
and bounded output. The model never receives a private envelope, blind, credential, raw signature,
or confidential CRE payload.

Missing provider configuration never falls back to the scripted test model. The deterministic and
live-read evidence commands are:

```text
bun run --cwd apps/api evidence:p52-agent
bun run --cwd apps/api evidence:p52-agent:live-read
```

The first is a local deterministic integration. The second uses the configured Sepolia RPC and is
read-only. Neither invokes Ledger or activates a robot.
