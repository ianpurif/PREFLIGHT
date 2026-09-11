# P5.1 Ledger Speculos browser-boundary evidence

**Date:** 2026-09-11 (+08:00)
**Evidence class:** authenticated Rovaulta `/p5-ledger` run against the official Ledger Speculos device simulator
**Physical-device class:** not executed; not claimed

## Scope and result

This artifact records a real local emulator run through the production browser adapter and the
authenticated API pre-sign boundary. It does not claim Ledger Secure Element, physical-device,
Clear Signing, release-authorization, or robot-activation evidence.

The emulator was restarted from a clean process before the checks below. No seed, private key,
PIN, origin token, gating token, credential, confidential safety envelope, or blind was printed or
committed.

## Pinned public identities

- Speculos `0.27.0` (native WSL2)
- model `nanosp` / DMK model `nanoSP`
- official Ledger Ethereum application `1.22.3`, public file `app-1.22.3-nanos2.elf`
- Ethereum ELF SHA-256:
  `d8631ab43961928851e66175bef6d0157e5c516389b8b61bdb3c239a8125944e`
- Device Management Kit `1.9.0`
- Speculos Device Transport Kit `1.2.1`
- Ethereum Device Signer Kit `1.18.0`
- Context Module `2.5.0`
- Speculos Device Controller `0.3.0`
- network `sepolia` / chain ID `11155111`
- deployed registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`

The emulator-derived signer address is public test identity only:
`0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D`. It is not physical-device custody evidence and must
not be retained in a production signer allowlist.

## Reproduction commands

The emulator was run with the official public Ethereum app:

```sh
/home/ian/rovaulta-speculos-venv/bin/speculos \
  --display headless \
  --model nanosp \
  --api-port 5000 \
  --apdu-port 9999 \
  /home/ian/rovaulta-speculos/app-1.22.3-nanos2.elf
```

The repository smoke command then completed successfully:

```powershell
bun run --cwd packages/ledger-gate evidence:speculos-smoke
```

Public smoke output:

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

The controller drove the actual emulator address-review sequence (`right`, `right`, `both`).
The browser adapter used the same shared DMK/Context Module/Signer Kit path as WebHID and returned
the public session above.

## Authenticated `/p5-ledger` trace

Using the normal local account session and the public P1 clearance record already used by the live
Gemini/Graph boundary, the browser route reached the exact pre-sign gate. The public bindings were:

```text
siteId: site:192e49ae56c0abf18cd827706b909ce3
robotId: robot:ce87964de66e14684b1b3c68a7a4b1be
robotBuildId: robot-build:075049b64bf7dd982705cac9a40d0f27
robotBuildDigest: sha256:c496d3fc98485bcbdef70658f36449da918afc3ec0e56610dff5eeab7bea4a3e
clearanceId: clearance:account-3dbe6439-20260909-01
clearanceDigest: sha256:a2434762455812fe57479dc5c86b41f13fbb7a111d23e32101327073b1d4a10d
targetEnvironment: sepolia
authorizedSigner: 0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D
precheckBlock: 11679749
precheckBlockHash: 0x4f90d5d55d3bf4c65013dda8289a13bff98a3c7e688c36c5a2986c569beddfe1
typedDataDigest: 0xd7ad52a597e870f51845e138b11bafe7ec7dcdc432caa30d109a51d552359ea1
```

The UI reported `Eligible exact intent prepared`. This proves the authenticated server policy,
exact public binding, live Sepolia snapshot, and one-time intent preparation were reached before
any device-signing request.

The next explicit action returned `CLEAR_SIGNING_UNAVAILABLE`. The configured Ledger-issued
application origin token and accepted/served descriptor are not available in this environment, so
the adapter correctly refused to request a signature. No signature or `ReleaseAuthorization` was
created.

For the adversarial browser check, only the public `robotBuildDigest` was changed to an all-zero
digest. The pre-sign request was rejected as `MALFORMED_REQUEST`; signing was not requested. The
previous authenticated API evidence additionally records `CLEARANCE_BINDING_MISMATCH` for a
build-substitution case and `CLEARANCE_NOT_FOUND` for an unregistered clearance:
[`p5-ledger-speculos-partial-2026-09-07.md`](p5-ledger-speculos-partial-2026-09-07.md).

## Current harness note

The standalone `bun run --cwd apps/api evidence:p5-presign` command was rerun on this date, but its
isolated server has no authenticated application persistence and returned `503 PERSISTENCE_UNAVAILABLE`
for both cases. This is a harness/authentication limitation, not a successful signing result. The
2026-09-07 artifact remains the source for its recorded C/D API responses, while the authenticated
browser trace above is the current live pre-sign evidence.

## Clear Signing and hardware boundary

The committed ERC-7730 v2 deployment-intent descriptor previously passed the official `erc7730
1.0.7` linter; that is descriptor validation only. The official Clear Signing Tester still exits
with `GATING_TOKEN environment variable not set`, and the Rovaulta adapter still requires its
separate Ledger origin/accepted-descriptor path. Speculos A/B/E/F therefore remain **not run**.

Speculos is an official device simulator, not a Secure Element. This evidence intentionally makes
no physical Ledger, physical approval, hardware root-of-trust, or physical Clear Signing claim.
