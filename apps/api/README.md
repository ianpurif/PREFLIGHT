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
`ROVAULTA_P13_EMAIL` and `ROVAULTA_P13_PASSWORD` in an ignored environment file, then create the
account-owned resources without evaluating them:

```powershell
$env:ROVAULTA_P13_SETUP_ONLY="true"
bun run --cwd apps/api p13:account-evaluation
```

The command registers (or signs in to) the account and calls the existing site/robot/build routes.
It prints only the public account/site/robot/build IDs. It never opens SQLite, calls the P2
evaluator, imports a P7 fixture, or accepts a browser-supplied verdict.

Provision the exact site-bound secret directly to the official CRE secret store from the same local
operator environment. The helper reads the encrypted policy through the application store, creates
only a temporary `secretsNames` mapping, passes the versioned envelope/blind to the CLI in memory,
and deletes the mapping afterward. It never prints or writes the secret value:

```powershell
$env:ROVAULTA_P13_ACCOUNT_ID="account:<account-id-from-setup>"
$env:ROVAULTA_P13_SITE_ID="site:<site-id-from-setup>"
bun run --cwd apps/api p13:provision-site-secret
```

The provisioning command requires the official `cre` CLI and uses `ROVAULTA_CRE_TARGET` (or
`CHAINLINK_CRE_TARGET`) plus optional `ROVAULTA_CRE_SECRETS_AUTH` (`auto` or `browser`, an auth
mode rather than a credential). If the CLI or CRE access is unavailable it fails closed; do not
copy a secret into a browser, API request, shell transcript, or evidence file.

For the evaluation phase, unset `ROVAULTA_P13_SETUP_PATH`, set the three IDs printed by setup, and
run the same normal account command:

```powershell
$env:ROVAULTA_P13_SETUP_ONLY="false"
$env:ROVAULTA_P13_SITE_ID="site:<site-id-from-setup>"
$env:ROVAULTA_P13_ROBOT_ID="robot:<robot-id-from-setup>"
$env:ROVAULTA_P13_BUILD_ID="robot-build:<build-id-from-setup>"
Remove-Item Env:ROVAULTA_P13_SETUP_PATH -ErrorAction SilentlyContinue
bun run --cwd apps/api p13:account-evaluation
```

The evaluation command submits `/evaluations` and polls only the owning account's result. A
configured CRE gateway returns `PENDING` until the signed TEE callback completes; missing
gateway/workflow/trigger configuration fails closed. Set `ROVAULTA_P13_EVIDENCE_PATH` only when a
completed public result should be written to an ignored path. The evidence file contains an
allowlisted public projection and no policy, envelope, blind, secret, credential, or internal
report. If the gateway returns a bounded public workflow execution identifier, it is carried through
as `creExecutionId`; no raw gateway response is retained.

### Account-owned official CRE CLI simulation mode

When live CRE provisioning is unavailable, the normal account route can be run against the same
authenticated official CLI simulation without promoting a fixture or using the local P2 evaluator.
Set the explicit mode before starting the API:

```powershell
$env:ROVAULTA_CRE_EXECUTION_MODE="simulation"
$env:ROVAULTA_CRE_CLI="cre"
bun run --cwd apps/api dev
```

Use the setup-only and evaluation commands above with a real operator setup file and real account
credentials. The server builds the public CRE payload from that account's site/robot/build records,
creates the temporary CLI env file from the encrypted site policy, invokes:

```text
cre -R . -T staging-settings -e <temporary-env-file> --non-interactive workflow simulate <temporary-workflow-folder> --trigger-index 0 --http-payload <temporary-public-payload>
```

The executor also creates a short-lived workflow configuration whose `secretsNames` entry maps the
exact account site's selector to the temporary environment variable; the checked-in fixture
mapping is never reused for another site. The CLI result is accepted only after the existing public
callback parser, behavior-input digest check, and exact P1 binding validation pass. The resulting account evaluation records
`executionMode: official-cre-cli-simulation` and the CLI version. Temporary payload/secret files are
deleted on success or failure; no confidential value or raw CLI output is returned or written to
evidence. The executor checks both `cre -v` and `cre whoami` before starting the workflow; a missing
or expired CLI session fails closed. Authentication may come from the operator's `cre login` context
or the official `CRE_API_KEY` environment variable; the key is passed only to the child CLI and is
never printed or persisted. A nonzero CLI exit, malformed result, rejection, binding mismatch, or
leakage fails closed.

This mode is explicitly simulation provenance. It is not live CRE/DON execution and does not itself
create a clearance. Once the persisted account result is `CLEAR`, the existing
`record:sepolia-clearance` command is the only path that can create the real Sepolia registry record.

## Chainlink simulation qualification

The Chainlink prize uses the authenticated official CRE CLI simulation path; a live CRE deployment is
not required or claimed. From a clean checkout, run:

```powershell
bun run --cwd apps/api evidence:cre-simulation
```

This creates fresh ignored public payloads and temporary local simulation secrets, runs unsafe `HOLD`,
corrected `CLEAR`, and tampered-input `REJECT` against the existing `handlerInTee` workflow, then
validates each public result with the same strict Rovaulta protocol boundary used by the application.
The generated artifact contains only public bindings, verdict/error, execution identity when reported,
and leakage checks. Confidential environment files are deleted after the run. If the official `cre`
executable or authenticated CLI context is missing, the command fails closed; it never substitutes P2
or writes a success artifact.

The simulation path needs the official CLI authenticated with `cre login`, the checked-in
`staging-settings` workflow configuration, and the CLI environment mapping used by the workflow. It
does not require a deployed workflow, gateway callback, account credentials, or live DON access. The
separate account-backed gateway path still requires the site selector, callback HMAC, HTTPS callback,
workflow ID, and trigger signer described below. Do not treat a local P2-injected test as P13 evidence.
