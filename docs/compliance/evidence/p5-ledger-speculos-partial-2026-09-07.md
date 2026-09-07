# P5.1 Ledger Speculos evidence — partial, access-blocked

**Date:** 2026-09-07 (+08:00)
**Evidence class:** Ledger Speculos official device simulator
**Physical-device class:** not executed; not claimed

## Status

- `Official Speculos integration: BLOCKED — authenticated Tester access and a production-compatible origin/accepted-descriptor path are unavailable; Clear Signing A/B/E/F were not completed`
- `Physical Ledger execution: NOT PERFORMED — hardware unavailable`
- `Ledger prize acceptance of Speculos-only execution: AWAITING PARTNER CONFIRMATION`

The production integration still targets a physical Ledger signer through DMK/WebHID. This run
proved the official Speculos transport, actual Ethereum application, emulator address-review UI,
current descriptor validation, real pre-sign C, and invalid/unregistered D. It did **not** produce a Clear Signed deployment-intent
signature or a `ReleaseAuthorization`, so it is not end-to-end P5.1 evidence.

## Pinned identities

- Speculos: Python package `0.27.0`, native WSL2 execution; no Docker image was used
- emulated model: Ledger Nano S Plus (`nanosp`, DMK model `nanoSP`), API level `26`
- Ethereum application: official public release `1.22.3`, file
  `app-1.22.3-nanos2.elf`
- Ethereum ELF SHA-256:
  `d8631ab43961928851e66175bef6d0157e5c516389b8b61bdb3c239a8125944e`
- Device Management Kit: `1.9.0`
- Speculos Device Transport Kit: `1.2.1`
- WebHID Device Transport Kit: `1.2.4`
- Ethereum Device Signer Kit: `1.18.0`
- Context Module: `2.5.0`
- Speculos Device Controller: `0.3.0`
- official ERC-7730 validator: `erc7730 1.0.7` under managed CPython `3.12.14`
- validator registry source revision: `0318f9a51ec4fc7ba4aed6de5e315c8884d1fe38`
- observed Clear Signing Tester source revision:
  `bb0cc89381ca7a4e297ed6bb801aa3e5ba9cf21f`

## Actual Speculos execution

The official Ethereum ELF was downloaded from its public Ledger release and checked before use:

```text
/opt/preflight-speculos/app-ethereum-1.22.3-nanos2.elf: OK
```

The actual emulator command was:

```sh
/opt/preflight-speculos/venv/bin/speculos \
  --display headless \
  --model nanosp \
  --api-port 5000 \
  --apdu-port 9999 \
  /opt/preflight-speculos/app-ethereum-1.22.3-nanos2.elf
```

Startup reported the detected API level and actual application identity:

```text
Api level detected from metadata: 26
using API_LEVEL version 26 on nanosp
Env app name: 'Ethereum'
Env app version: '1.22.3'
```

The P5 adapter selected `speculos`, scoped discovery to
`SPECULOS_HTTP_TRANSPORT`, connected through DMK, and requested the Sepolia address with
`checkOnDevice: true`. The official device controller pressed the real emulator buttons to review
and confirm the UI. The committed reproducer is
`packages/ledger-gate/scripts/speculos-smoke.ts`; with the emulator already running, the exact
repository command was:

```powershell
bun run --cwd packages/ledger-gate evidence:speculos-smoke
```

It invokes the controller's explicit `right`, `right`, `both` sequence and prints public session
metadata only. The public session result was:

```json
{
  "signerAddress": "0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D",
  "deviceModel": "nanoSP",
  "firmwareVersion": null,
  "ethereumAppVersion": "1.22.3",
  "dmkVersion": "1.9.0",
  "transport": "speculos",
  "executionEnvironment": "official-device-simulator"
}
```

Screenshots captured from the Ledger Speculos official device simulator:

- `p5-speculos-2026-09-07/address-review.png` — SHA-256
  `974290f9e549df51c1686ee8b4ceade74305a828e57eec53275cc96d80878a90`
- `p5-speculos-2026-09-07/address-confirm.png` — SHA-256
  `b1e1229185bd1d7be80ad7f4a2ee8bc46f0e9e0ef4a509478ece130502ed08ae`

These screenshots contain only the public derived Sepolia address and simulator UI. They contain no
seed, private key, PIN, origin/gating token, RPC credential, confidential envelope, or blind.

The address is derived from Speculos's deterministic simulator seed and is therefore public test
identity, not custody evidence. It must never remain in a production
`PREFLIGHT_AUTHORIZED_SIGNERS` allowlist. Any clearance or nonce database created for it must be
explicitly test-only and discarded after use. The application rejects `speculos` when
`NODE_ENV` is not `development` or `test`; loopback URL filtering is only an additional direct
configuration constraint, not remote-attestation or anti-proxy protection.

## Official descriptor validation

Equivalent reproducible command (the recorded run used a checksum-verified `uv 0.12.10` executable
at a temporary absolute Windows path):

```powershell
uv tool run --python 3.12 --from "erc7730==1.0.7" erc7730 lint packages/ledger-gate/clear-signing/eip712-preflight-deployment-intent.json
```

Result after migration to the active v2 schema and correction of all warnings:

```text
checking packages\ledger-gate\clear-signing\eip712-preflight-deployment-intent.json…
no issue found
checked 1 v2 descriptor files, no errors found
```

This proves schema/linter validity only. It does not prove registry acceptance, production serving,
or a device display.

## Official Clear Signing Tester access attempt

The official registry wrapper was invoked from registry revision
`0318f9a51ec4fc7ba4aed6de5e315c8884d1fe38` with the committed descriptor and explicit
`expectedTexts` fixture:

```powershell
wsl.exe -u root -- bash -lc \
  'cd /mnt/c/Users/IAN/AppData/Local/Temp/preflight-erc7730-lf-af0f0bf7516d45ce8d340b66fbfbcd80 && \
  env -u GATING_TOKEN bash tools/tester/run-test.sh \
  /mnt/c/Users/IAN/OneDrive/Desktop/professional/hackathon/ETH/preflight/packages/ledger-gate/clear-signing/eip712-preflight-deployment-intent.json \
  /mnt/c/Users/IAN/OneDrive/Desktop/professional/hackathon/ETH/preflight/packages/ledger-gate/clear-signing/eip712-preflight-deployment-intent.tests.json \
  nanosp debug'
```

Result, exit code `1`:

```text
Error: GATING_TOKEN environment variable not set
Set it with: export GATING_TOKEN='your-token-here'
```

The token is an official external prerequisite. The direct tester's implicit test-token fallback
was not used. No blind-signing option, origin-token bypass, unsigned filter injection, mock signer,
or fabricated screenshot was used.

The official Tester validates/renders the descriptor in its own harness and discards the signing
result; its `GATING_TOKEN` cannot be passed into Preflight's Context Module as an application origin
token. Completing Preflight A/B/E/F additionally requires a Ledger-issued origin token and evidence
that the candidate descriptor is accepted and served for that origin, or another officially
documented Speculos descriptor-resolution path that preserves the exact runtime guard and returns
the real device signature. Those prerequisites are independently unavailable in this environment.

## Actual pre-sign cases C and D

Immediately after the reproduced DMK/Speculos address-confirmation run, the real P5
`POST /release/prepare` route was exercised with that public simulator address in a temporary,
test-only signer allowlist and SQLite database. Case D used the configured Sepolia RPC and deployed
P4 registry; no contract write occurred. Exact command:

```powershell
bun run --cwd apps/api evidence:p5-presign
```

Public result captured at `2026-09-07T06:54:30.580Z`:

```json
{
  "network": "sepolia",
  "signerAddress": "0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D",
  "cases": [
    {
      "case": "C",
      "statusCode": 403,
      "error": "CLEARANCE_BINDING_MISMATCH",
      "signingRequested": false
    },
    {
      "case": "D",
      "statusCode": 403,
      "error": "CLEARANCE_NOT_FOUND",
      "signingRequested": false
    }
  ]
}
```

Both are deliberately pre-signer gates: C rejected Build B against Build A's clearance before a
registry call, while the invalid/unregistered D variant queried the live Sepolia registry and
rejected the deliberately unregistered clearance before any Ledger signing request. Revoked and
expired D variants remain covered only by deterministic tests. The reproducible harness is
`apps/api/scripts/p5-presign-evidence.ts`; it deletes its temporary nonce database on exit.

## Required A–F outcomes

| Case | Required outcome | Ledger Speculos official device simulator result |
|---|---|---|
| A | approval → signature → `ReleaseAuthorization` | **NOT RUN** — authenticated Clear Signing context unavailable |
| B | emulator rejection → no authorization | **NOT RUN** — authenticated Clear Signing context unavailable |
| C | Build B with Build A clearance blocked before signer | **PASS** — HTTP `403` / `CLEARANCE_BINDING_MISMATCH`; signing not requested |
| D | invalid/revoked/expired clearance blocked before signer | **PASS for invalid/unregistered** — live Sepolia HTTP `403` / `CLEARANCE_NOT_FOUND`; signing not requested |
| E | consumed authorization replay → `REPLAY_REJECTED` | **NOT RUN as Speculos evidence** — no Clear Signed authorization exists |
| F | critical post-sign mutation rejected | **NOT RUN as Speculos evidence** — no Clear Signed authorization exists |

A deliberate, unexpired Sepolia demo `CLEAR` record whose signer is the Speculos-derived authorized
address will also be needed for Case A. No contract write or fake record was created in this run.

## Leakage review

The committed evidence was checked for common secret assignments and forbidden confidential terms.
Only public package/revision identities, public Sepolia bindings, public derived address, fixed test
fixture values, commands, and fail-closed error text are present. The deterministic Speculos seed
was not captured or committed, and its public test address is explicitly barred from production
authorization. A final repository secret scan remains part of the full verification loop.
