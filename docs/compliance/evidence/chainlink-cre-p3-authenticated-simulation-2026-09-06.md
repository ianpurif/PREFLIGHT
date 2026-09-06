# P3 Chainlink CRE Authenticated Simulation Evidence

**Evidence class:** CRE authenticated simulation
**Date:** 2026-09-06
**Environment:** Official local, single-node CRE simulator; not a live DON deployment or hardware TEE
**Workflow:** `preflight-confidential-evaluation-staging`

## Tool and build identity

- CRE CLI: `v1.32.0`
- Official Windows archive SHA-256: `7d3760709029fc6101085479cda858f5e606400094d06971d63bbf34e66a38ee`
- CRE SDK: `@chainlink/cre-sdk` `1.19.1`
- CLI-reported simulation binary hash: `8d8bff9fdfaf67a8db7b2fa81ea46fa351b5e8f6914b2b6ebe21e2ad4310c315`
- CLI-reported workflow config hash: `4cda450a9d236d49ccd0e3f01285ba26b15c16b0202d35c091c076b6095a3e12`
- Target: `staging-settings`
- Trigger: `http-trigger@1.0.0-alpha`, index `0`
- Requested confidential runtime: AWS Nitro, `us-west-2`

The CLI authenticated successfully through `cre login`. The simulator compiled the workflow, checked the configured Sepolia RPC, loaded each public JSON fixture, displayed the `handlerInTee` requirement, and completed each execution with engine status `SUCCESS` and process exit code `0`.

## Confidential fixture handling

The fixture generator created a fresh cryptographically random 32-byte simulation blind and wrote it only into ignored `.env.cre-*.local` files. It rebound the checked-in public requests to the corresponding public commitment before these runs. The runtime blind is distinct from the source-visible P2 unit-test blind and is not present in source, public fixtures, this evidence, or Git history.

The safety envelope is an intentionally synthetic, source-visible demo fixture. These runs prove that the CRE confidential callback consumes its runtime envelope/blind input and does not release those fields in its public result; they do not claim that the demo envelope itself is undisclosed from repository readers. A new fixture-generation run intentionally rotates the blind and public commitment and therefore requires new simulation evidence.

## Exact commands

The checksum-verified executable was assigned to `$cre`; these commands were run separately from the repository root:

```powershell
& $cre -v -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json

& $cre -v -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-valid.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\corrected.public.json

& $cre -v -R . -T staging-settings -e .\integrations\chainlink-cre\.env.cre-tampered.local --non-interactive workflow simulate .\integrations\chainlink-cre --trigger-index 0 --http-payload .\integrations\chainlink-cre\fixtures\unsafe.public.json
```

The `.env.cre-*.local` files are ignored local inputs. Their values were never copied into terminal evidence or this file.

## Case A — unsafe fixture

- Captured: `2026-09-06T08:27:22Z` (`16:27` PHT)
- Workflow execution ID: `060441b006d255fb46dc35619a8ac30f919b769902a0515e74a32d76f105e6fb`
- Engine/process: `SUCCESS`, exit `0`
- Result: `EVALUATED` / `HOLD`

```json
{
  "behaviorInputDigest": "sha256:36aa34b60babba8ea22e4f2803639ffb51c15005a10b345a37c49b79e6238bd0",
  "protocolVersion": "preflight.protocol/v1",
  "result": {
    "evaluatedAt": "1788547210",
    "evaluationId": "evaluation:unsafe-demo",
    "evaluationInputsDigest": "sha256:a6d01e27eacf0e1f9061d2e961bb89a6b037ee82b815eaeadb04ed97af40fd74",
    "inputs": {
      "evaluatorVersion": "evaluator-version:warehouse-rules-v1",
      "robotBuildDigest": "sha256:dfa8a366ab9980769d7e91ea03fa346e2d816c98bd613bc9a6c58bc0d2d39ba8",
      "robotBuildId": "robot-build:unsafe-v1",
      "robotId": "robot:demo-amr-01",
      "safetyEnvelopeCommitment": "sha256:c0711ab58a51ae8e332a71d9abcb553a7b1345bfca180d7e9fba9d0187f7f51a",
      "safetyEnvelopeId": "safety-envelope:demo-v1",
      "schemaVersion": "preflight.evaluation-inputs/v1",
      "siteId": "site:demo-warehouse"
    },
    "schemaVersion": "preflight.evaluation-result/v1",
    "verdict": "HOLD"
  },
  "schemaVersion": "preflight.cre-public-evaluation-result/v1",
  "status": "EVALUATED",
  "traceProvenance": "SYNTHETIC_CALLER_SUPPLIED"
}
```

## Case B — corrected fixture

- Captured: `2026-09-06T08:28:29Z` (`16:28` PHT)
- Workflow execution ID: `f4ecd7cdcc3d34f084417dbec1e42c5b32e530e6aeab4a70768c21e2f1efb583`
- Engine/process: `SUCCESS`, exit `0`
- Result: `EVALUATED` / `CLEAR`

```json
{
  "behaviorInputDigest": "sha256:4641dfa1ceef38b12d71cc35ffa08288cbd5f70ac32788fe844eb2b4636d76dc",
  "protocolVersion": "preflight.protocol/v1",
  "result": {
    "evaluatedAt": "1788547210",
    "evaluationId": "evaluation:corrected-demo",
    "evaluationInputsDigest": "sha256:9c443e525d43158839660d95917dfcd8f6c464bc9a318dc1f8bc0c9d22155bd3",
    "inputs": {
      "evaluatorVersion": "evaluator-version:warehouse-rules-v1",
      "robotBuildDigest": "sha256:8241d2ea876d4ee5d09df277a0ea6f8f7bcebf96acf47fe9b647ee2aeb9e3999",
      "robotBuildId": "robot-build:corrected-v1",
      "robotId": "robot:demo-amr-01",
      "safetyEnvelopeCommitment": "sha256:c0711ab58a51ae8e332a71d9abcb553a7b1345bfca180d7e9fba9d0187f7f51a",
      "safetyEnvelopeId": "safety-envelope:demo-v1",
      "schemaVersion": "preflight.evaluation-inputs/v1",
      "siteId": "site:demo-warehouse"
    },
    "schemaVersion": "preflight.evaluation-result/v1",
    "verdict": "CLEAR"
  },
  "schemaVersion": "preflight.cre-public-evaluation-result/v1",
  "status": "EVALUATED",
  "traceProvenance": "SYNTHETIC_CALLER_SUPPLIED"
}
```

## Case C — tampered commitment

- Captured: `2026-09-06T08:29:19Z` (`16:29` PHT)
- Workflow execution ID: `5ea39cec749810a316d75eee77b0fb84249276e8fce776b893b284858ca0c887`
- Engine/process: `SUCCESS`, exit `0`
- Result: `REJECT`; no evaluation verdict was returned

```json
{
  "code": "CONFIDENTIAL_EVALUATION_REJECTED",
  "protocolVersion": "preflight.protocol/v1",
  "schemaVersion": "preflight.cre-public-evaluation-error/v1",
  "status": "REJECT"
}
```

The public request and declared commitment were unchanged from Case A. Only the ignored confidential blind input differed, demonstrating that confidential input was consumed by the handler and that commitment reconstruction rejected before a normal `CLEAR`/`HOLD` result was emitted.

## Leakage review

Every case was captured through a raw-output checker:

| Case | Expected result found | Exact runtime secret present | Confidential markers present |
|---|---:|---:|---:|
| unsafe | yes | no | 0 |
| corrected | yes | no | 0 |
| tampered | yes | no | 0 |

The marker set covered the confidential envelope field, blind field, warehouse bounds, private thresholds, private rule IDs, private zone IDs, and both current runtime blind values. No API key, authentication token, runtime envelope payload, blind, rule value, geometry, internal violation, or confidential diagnostic is included here.

## Evidence boundary

This proves execution through the official authenticated CRE simulator and its `handlerInTee` simulation path. The CLI explicitly states that the simulator is not a real TEE. This is not a workflow deployment, live DON execution, production Vault custody, hardware-enclave attestation, robot trace attestation, or proof of physical robot safety.
