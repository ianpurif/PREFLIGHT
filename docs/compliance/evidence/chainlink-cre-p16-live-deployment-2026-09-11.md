# Chainlink CRE P16 live deployment attempt — 2026-09-11

## Classification

This artifact records a real Chainlink CRE private-registry deployment and a failed live trigger
attempt. It is **not** a live execution success claim. The authenticated P13 official CLI simulation
remains the Chainlink qualification evidence.

## Deployment

| Field | Public value |
| --- | --- |
| CLI | CRE v1.32.0 |
| Registry | Chainlink-hosted private registry (`private`) |
| Target | `staging-settings` |
| Workflow name | `rovaulta-confidential-evaluation-staging` |
| Workflow ID | `0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144` |
| Gateway | `https://01.enterprise-gateway.zone-a.cre.chain.link/` |
| Authorized HTTP trigger | `0x89368Eb7efc94e7a946318d3eb6A72bED235bc34` |
| Deployment status | `ACTIVE` |
| Registered at | `2026-09-11T14:12:54Z` |
| Binary URL | `https://storage.cre.chain.link/artifacts/0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144/binary.wasm` |
| Execution ID | none; no execution was created |

The deployment command used the existing `integrations/chainlink-cre` workflow and a temporary
operator-generated public configuration for the authorized HTTP-trigger address. The private key
and temporary configuration were not committed or included here.

## Live trigger attempt

The normal account route was run with an existing account-owned site, robot, and build and the
private-registry enterprise gateway. The API sent the existing canonical public request and signed
JSON-RPC `workflows.execute` request; it did not send the envelope, blind, policy, or confidential
report.

Public command:

```text
bun run --cwd apps/api p13:account-evaluation
```

Result:

```text
BLOCKED
CRE_REQUEST_REJECTED (503): CRE gateway rejected the request (HTTP 400; code=-32600 message=Workflow not found. 'workflowID' 0x0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144 is not a valid workflow ID)
```

The error was returned before workflow execution; `cre execution list` returned an empty list. No
callback, evaluation result, or account-owned live `CLEAR`/`HOLD`/`REJECT` was persisted. No
confidential value appeared in terminal output or evidence.

## Independent identity and gateway checks — 2026-09-11

The deployment and trigger path was checked again with CRE CLI v1.33.0, without changing the
workflow source or sending confidential input:

- `cre workflow list -T staging-settings --registry private` and `cre workflow get` both returned
  the same `ACTIVE` private workflow ID shown above.
- `cre workflow hash` using the tracked `config.staging.json` reproduced the deployed identity:

  | Artifact | Hash |
  | --- | --- |
  | Binary | `e3b7053930fc7f38b7214e503c4bc411c27f1e7b50d98d93651193c59bb8004e` |
  | Config | `1977468021a54d7aba103f15adfb1873479a60acaa4bb84e3830249162e92478` |
  | Workflow | `0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144` |

- The derived signer address matched the deployed `authorizedEvmAddress`; the private trigger key
  was read only in memory and is not recorded here.
- A minimal signed `workflows.execute` request sent directly to the documented private gateway
  returned the same HTTP 400 / JSON-RPC `-32600` workflow-lookup error. It did not return
  `ACCEPTED` or a `workflow_execution_id`.
- `cre execution list 0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144` remained
  empty, and the Chainlink workflow detail view reported zero executions.

The tracked staging config now matches the active deployment configuration. This is a local
reproducibility fix only; no redeployment was performed because the gateway rejection occurs before
workflow execution and is unchanged by that alignment.

## Remaining live prerequisites

- The workflow declares deployed secrets through `../../secrets.yaml`, but the current account's
  site-bound selector is not present in the tracked manifest. The private-registry
  `cre secrets --secrets-auth=browser` flow stopped at its interactive Chainlink Vault consent
  screen; no secret was created and no secret value was printed or committed.
- The active deployment configuration contains no HTTPS result-delivery URL or callback secret ID.
  Even after Chainlink resolves the workflow at the gateway, an externally reachable callback and
  matching API HMAC secret are still required before the account route can persist a live result.

These are post-acceptance prerequisites. They do not explain the current pre-execution
`Workflow not found` response, which remains a Chainlink private-registry gateway visibility or
organization-access dependency after local identity, target, signer, request-shape, and execution
checks were independently ruled out.

## Interpretation

- Live workflow deployment: **PASS** (private registry registration is visible through the official
  CLI and `workflow get`).
- Live CRE execution: **BLOCKED** (the enterprise gateway did not resolve the deployed private
  workflow ID).
- Live callback and account-owned live verdicts: **BLOCKED** because execution did not start.
- P13 simulation regression: **PASS** through a fresh authenticated CLI v1.33.0 run after the
  staging-config alignment; the separate simulation evidence path produced `HOLD`, `CLEAR`, and
  `REJECT` with no confidential fields in the public results. This was not re-labelled as live
  deployment evidence.

## Fresh simulation regression check — 2026-09-11

The official CRE CLI v1.32.0 was authenticated with the same `staging-settings` target and ran
the existing workflow separately for the unsafe, corrected, and tampered fixtures. The redacted
public outcomes were:

| Case | Public outcome | Confidential fields exposed |
| --- | --- | --- |
| Unsafe fixture | `EVALUATED` / `HOLD` | No |
| Corrected fixture | `EVALUATED` / `CLEAR` | No |
| Tampered commitment | `REJECT` / `CONFIDENTIAL_EVALUATION_REJECTED` | No |

No live workflow execution ID was returned by this simulation, and the run does not establish
live DON, Vault, Nitro, callback, or account-owned evaluation evidence.

The post-alignment regression was repeated with CRE CLI v1.33.0. Its redacted artifact is under the
ignored local path `.data/cre-simulation/20260911154644464-6a5140c7/evidence.json`; it records the
same three successful official CLI executions, `confidentialFieldsAbsent: true`, and
`rawCliOutputStored: false`. The artifact is intentionally not committed because the evidence
runner's temporary secret material and generated fixtures remain local and are deleted after the
run.

The remaining external investigation is Chainlink-side private-registry/enterprise-gateway
workflow visibility or Confidential Workflow access for this organization. This repository does
not bypass that boundary or claim live DON execution.
