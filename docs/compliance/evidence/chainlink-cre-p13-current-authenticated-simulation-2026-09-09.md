# P13 Current Chainlink CRE Authenticated Simulation Evidence

**Evidence class:** CRE authenticated simulation
**Captured:** `2026-09-08T21:44:30.120Z` (UTC)
**CLI:** CRE `1.32.0`
**Target:** `staging-settings`
**Workflow:** `integrations/chainlink-cre`
**Trigger index:** `0` (`http-trigger`)
**Deployment:** simulation only; no live DON deployment claimed

This is a fresh current-source run after the site-bound selector and temporary secret injection
path were enabled. The official CLI compiled and executed the existing `handlerInTee` workflow for
each case. The fixture generator created the confidential input and blind in an ignored temporary
directory. The runner supplied the declared local simulation environment mappings through `-e`,
removed the temporary directory in `finally`, and wrote only the public projection below.

## Exact commands

These commands were executed separately from the repository root. The environment files were
temporary and were deleted after the run:

```text
cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-8qYb0P/.env.cre-valid.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260908213745221-482e2596/fixtures/unsafe.public.json

cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-8qYb0P/.env.cre-valid.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260908213745221-482e2596/fixtures/corrected.public.json

cre -R . -T staging-settings -e /tmp/rovaulta-cre-simulation-8qYb0P/.env.cre-tampered.local --non-interactive workflow simulate integrations/chainlink-cre --trigger-index 0 --http-payload .data/cre-simulation/20260908213745221-482e2596/fixtures/unsafe.public.json
```

## Public results

| Case | Process | Public result | Public evaluation-input digest |
|---|---:|---|---|
| Unsafe fixture | `SUCCESS`, exit `0` | `EVALUATED` / `HOLD` | `sha256:e5e826b673b7074992c4f3102f4d7aa44b5103473c5eeed3b27f1fd9d1096671` |
| Corrected fixture | `SUCCESS`, exit `0` | `EVALUATED` / `CLEAR` | `sha256:efb2fa3071d596a594c55e4970735781faa0ab2cb49ad76fdb3910d9dd7d8a34` |
| Tampered commitment | `SUCCESS`, exit `0` | `REJECT` / `CONFIDENTIAL_EVALUATION_REJECTED` | Not emitted |

The public bindings were parsed and revalidated by Rovaulta's request, callback, and exact-binding
parsers. No workflow execution identifier or CLI binary/config hash was reported by the non-verbose
simulation invocation.

## Leakage review

- `confidentialFieldsAbsent`: `true` for all three cases.
- Raw CLI output: not stored.
- Private envelope: not stored.
- Commitment blind: not stored.
- Credentials/authentication material: not stored.
- Temporary secret directory: deleted after execution (`/tmp/rovaulta-cre-simulation-8qYb0P`).

The synthetic fixture remains source-visible demo data; this evidence proves the confidential
handler execution and public-result boundary, not physical robot safety or a live DON attestation.
