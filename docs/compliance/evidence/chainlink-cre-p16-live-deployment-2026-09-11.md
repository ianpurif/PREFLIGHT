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

## Interpretation

- Live workflow deployment: **PASS** (private registry registration is visible through the official
  CLI and `workflow get`).
- Live CRE execution: **BLOCKED** (the enterprise gateway did not resolve the deployed private
  workflow ID).
- Live callback and account-owned live verdicts: **BLOCKED** because execution did not start.
- P13 simulation regression: **PASS** through a fresh authenticated CLI run on 2026-09-11; the
  separate simulation evidence path produced `HOLD`, `CLEAR`, and `REJECT` with no confidential
  fields in the public results. This was not re-labelled as live deployment evidence.

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

The remaining external investigation is Chainlink-side private-registry/enterprise-gateway
workflow visibility or Confidential Workflow access for this organization. This repository does
not bypass that boundary or claim live DON execution.
