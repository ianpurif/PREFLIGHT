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

## P13 account-created CRE evaluation

The normal account path is the only supported source for a P13 evaluation. Start the API with the
same environment used by the web app, then create an ignored local setup file such as
`.data/p13-setup.json`:

```json
{
  "site": {
    "name": "North dock",
    "location": "Manila",
    "policy": {
      "warehouseWidthMm": 1000,
      "warehouseHeightMm": 1000,
      "restrictedZone": { "minXmm": 400, "minYmm": 400, "maxXmm": 600, "maxYmm": 600 },
      "maximumSpeedMmPerSecond": 1000,
      "zoneSpeedLimitMmPerSecond": 600,
      "payloadThresholdGrams": 40000
    }
  },
  "robot": { "name": "AMR-01" },
  "build": {
    "version": "1.0.0",
    "label": "Clear candidate",
    "artifactDigest": "sha256:replace-with-the-real-build-digest",
    "route": {
      "start": { "xMm": 100, "yMm": 100 },
      "end": { "xMm": 900, "yMm": 100 },
      "speedMmPerSecond": 400
    }
  }
}
```

Replace the artifact digest and policy/route with the facility's real configuration. Do not commit
this file: the policy is private even though the API returns only its commitment. Set
`ROVAULTA_P13_EMAIL` and `ROVAULTA_P13_PASSWORD` in an ignored environment file, then run:

```powershell
bun run --cwd apps/api p13:account-evaluation
```

The command registers (or signs in to) the account, calls the existing site/robot/build routes,
submits `/evaluations`, and polls only the owning account's evaluation. It never opens SQLite,
calls the P2 evaluator, imports a P7 fixture, or accepts a browser-supplied verdict. A configured
CRE gateway returns `PENDING` until the signed TEE callback completes; missing gateway/workflow/
trigger configuration fails closed. Set `ROVAULTA_P13_EVIDENCE_PATH` only when a completed public
result should be written to an ignored path. The evidence file contains an allowlisted public
projection and no policy, envelope, blind, secret, credential, or internal report.

Before running the command, an operator must deploy/activate the workflow, provision the exact
site selector `ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_<base32-site-id>` and the callback HMAC
secret in the CRE `main` namespace, configure the workflow's HTTPS `resultDeliveryUrl` to the
reachable API callback, and set the matching server-only `ROVAULTA_CRE_GATEWAY_URL`,
`CHAINLINK_CRE_WORKFLOW_ID`, `CHAINLINK_CRE_TRIGGER_PRIVATE_KEY`, and
`ROVAULTA_CRE_RESULT_CALLBACK_SECRET`. The application does not expose the encrypted site policy
or blind for copying; site-secret provisioning must use the facility's approved secure operator
process. Do not treat a local P2-injected test as P13 evidence.
