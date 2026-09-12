# CRE authenticated simulation evidence — 2026-09-12

**Evidence class:** CRE authenticated simulation

This artifact records a fresh official Chainlink CRE CLI Confidential Workflow simulation. It is
simulation evidence only; it is not a live DON deployment, live workflow execution, or account-owned
evaluation. The public fixtures exercise the existing Rovaulta `handlerInTee` path and its
request-scoped confidential input boundary.

## Run identity

| Field | Public value |
|---|---|
| Captured at (UTC) | `2026-09-12T15:28:30.726Z` |
| CRE CLI | `1.33.0` |
| Target | `staging-settings` |
| Workflow path | `integrations/chainlink-cre` |
| Trigger index | `0` |
| Execution mode | `official CRE CLI simulation` |
| Live deployment claimed | `false` |

The WSL dependency tree was installed from the committed lockfile before this run so the official
`cre-compile` binary was available to the CLI. The simulation runner created temporary secret
material for each case and deleted it in its `finally` path.

## Exact public CLI commands

The `-e` files below were temporary local files containing the request-scoped secret mapping. Their
contents are not included here and were deleted after execution.

```text
cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-e4TGQI/.env.cre-valid.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260912152200827-c8437d28/fixtures/unsafe.public.json
cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-e4TGQI/.env.cre-valid.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260912152200827-c8437d28/fixtures/corrected.public.json
cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-e4TGQI/.env.cre-tampered.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260912152200827-c8437d28/fixtures/unsafe.public.json
```

## Public results

| Case | Engine status | Public result | Public evaluation-input digest |
|---|---|---|---|
| Unsafe fixture | `SUCCESS` | `EVALUATED` / `HOLD` | `sha256:75cd073ac0d5891cd65ebcebb4cade8718e4fb538920af75cf8734f22397c283` |
| Corrected fixture | `SUCCESS` | `EVALUATED` / `CLEAR` | `sha256:1951f313c41b5a3227056ce17d7946b53ef8da1087b3efc425f554a6e8f7abfe` |
| Tampered commitment | `SUCCESS` | `REJECT` / `CONFIDENTIAL_EVALUATION_REJECTED` before evaluation | not emitted |

Each case returned `processExitCode: 0`; the application projection matched the public verdict.
No CRE execution ID is claimed because this was a local CLI simulation.

## Confidentiality checks

- `confidentialFieldsAbsent: true` for all three cases.
- No private envelope, blind, credentials, or raw CLI output was stored.
- The committed artifact contains public bindings, public verdicts, and public digests only.
- The simulation runner's leakage checks passed before parsing each result.

The source workflow and handler remain unchanged. This evidence does not claim live CRE/DON delivery,
automatic EVM attestation, or production safety.
