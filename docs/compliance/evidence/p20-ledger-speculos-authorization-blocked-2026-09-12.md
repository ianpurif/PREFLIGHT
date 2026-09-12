# Ledger/Speculos authorization closure — 2026-09-12

## Result

**BLOCKED before signing.** This run reached the real official Speculos device
through the Rovaulta DMK/Signer Kit adapter and confirmed the public Ethereum
address. The exact signing attempt then failed closed because the application
origin token is not configured. No signature and no `ReleaseAuthorization` were
created.

## Public runtime identities

- transport: official Ledger Speculos transport, loopback `http://127.0.0.1:5000`
- Speculos: `0.27.0`
- Ethereum application: `1.22.3`, Nano S Plus public ELF
- Device Management Kit: `1.9.0`
- execution environment: `official-device-simulator`
- public test signer returned after on-device address confirmation:
  `0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D`

The signer above is the deterministic Speculos test identity. It is not a
physical-device identity and is not a production signer.

## Commands

The emulator was started with the official public Ethereum app and loopback
ports:

```text
/home/ian/rovaulta-speculos-venv/bin/speculos --model nanosp --display headless --api-port 5000 --apdu-port 9999 /home/ian/rovaulta-speculos/app-1.22.3-nanos2.elf
```

The repository smoke command completed:

```text
bun run --cwd packages/ledger-gate evidence:speculos-smoke
```

The returned public session contained the identities above. The real adapter
signing check was then executed after the same address-confirmation flow using
an exact empty-token configuration (the token value was not printed or
persisted):

```text
sign: {
  "code": "CLEAR_SIGNING_UNAVAILABLE",
  "message": "A Ledger-issued origin token is required for Clear Signing"
}
```

The adapter deliberately stops before `signTypedData`; no legacy, blind, raw,
or backend signing path was used.

## Root cause and remaining prerequisite

Ledger's current wallet integration documentation requires an `originToken`
issued through the Ledger partner program for the default Context Module. The
same Context Module must then resolve the exact accepted/served ERC-7730
descriptor for Rovaulta's Sepolia `DeploymentIntent`. The repository's
descriptor is locally validated but remains a candidate until Ledger serves it
for this application origin. The local `.env` now selects the test-only
Speculos transport and public test signer allowlist; it intentionally contains
no origin token.

Until a legitimate Ledger-issued origin token and accepted/served descriptor
are supplied, the following cases remain unproven: real Clear Signing
signature, `/release/consume` `AUTHORIZED` readback, emulator refusal, replay
rejection after consumption, and post-sign binding tamper rejection. Existing
API tests cover those policy checks with test doubles; they are not hardware
evidence.

## Sources

- [Ledger Clear Signing wallet integration](https://developers.ledger.com/docs/clear-signing/for-wallets)
- [Ledger Ethereum Signer Kit reference](https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth)
- `packages/ledger-gate/src/browser-adapter.ts`
- `packages/ledger-gate/src/clear-signing-context.ts`
- `apps/api/src/release/release-service.ts`
