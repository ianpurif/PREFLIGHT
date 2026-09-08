# P5 Ledger release gate — software and blocker evidence

**Date:** 2026-09-06; final local revalidation 2026-09-07 (+08:00)  
**Evidence class:** local software verification + read-only Sepolia RPC  
**Hardware class:** not executed; not claimed

## Result

The P5 software boundary is implemented and fail-closed: exact EIP-712 construction, deterministic
pre/post P4 policy, authorized signer recovery, durable atomic nonce consumption, current Ledger
DMK/WebHID/Ethereum Signer Kit browser adapter, exact runtime Clear Signing filter enforcement, and
explicit legacy typed-data fallback cancellation.

P5 is **not complete**. No Ledger-issued origin token is configured, the committed ERC-7730 v1 file
is only an unaccepted candidate descriptor, and no physical device was exercised. Cases A–F remain
pending; mock results below are not hardware evidence.

## Public implementation identity

- EIP-712 domain: `Rovaulta`, version `1`, chain `11155111`
- verifying contract: `0xFB270cc222efa8B5005AA097dD512Be2558dde65`
- action: `ACTIVATE_DEPLOYMENT`
- deployment intent schema: `rovaulta.deployment-intent/v2`
- Ledger packages: DMK `1.9.0`, Context Module `2.5.0`, WebHID Transport Kit `1.2.4`, Ethereum Device Signer Kit `1.18.0`, RxJS `7.8.2`
- typed-data golden digest: `0xb0db5c583e92e138345d2b1a9383cd9e4064e3002940923adb3a88a352faae58`

The exact message fields are: `protocolVersion`, `schemaVersion`, `action`, `siteId`, `robotId`,
`robotBuildId`, `robotBuildDigest`, `clearanceId`, `clearanceDigest`, `targetEnvironment`,
`authorizedSigner`, `nonce`, `issuedAt`, `expiresAt`, and `protocolIntentDigest`.

## Read-only live P4 check

Exact command (the RPC URL remained in ignored environment configuration and was not printed):

```powershell
bun -e 'import { ViemClearanceRegistryReader } from "./packages/chain-client/src/index.ts"; import { clearanceFixture } from "./packages/chain-client/test/fixtures.ts"; const rpc=process.env.SEPOLIA_RPC_URL ?? process.env.EVM_RPC_URL; if (!rpc) throw new Error("Sepolia RPC environment is unavailable"); const result=await new ViemClearanceRegistryReader(rpc).readExactClearance(clearanceFixture); console.log(JSON.stringify({chainId:result.chainId,registry:result.registry,blockNumber:result.blockNumber.toString(),blockHash:result.blockHash,blockTimestamp:result.blockTimestamp,fixtureClearanceExists:result.stored?.exists ?? false,fixtureExactMatch:result.exactMatch},null,2));'
```

Public result:

```json
{
  "chainId": 11155111,
  "registry": "0xFB270cc222efa8B5005AA097dD512Be2558dde65",
  "blockNumber": "11645707",
  "blockHash": "0x34f55541f6a9e773af3ef583ebb0bac0c963a46bdaa986a16d2b5589f399fffa",
  "blockTimestamp": "1788678432",
  "fixtureClearanceExists": false,
  "fixtureExactMatch": false
}
```

This deliberately unregistered local fixture proves the client reached the exact deployed chain and
registry and failed closed for a missing clearance. It does not prove that the registry has no other
clearances and is not a successful hardware release.

## Deterministic case coverage (mock/local only)

- exact valid `CLEAR` fixture + authorized cryptographic signature → one `ReleaseAuthorization`
- Build B proposal against Build A clearance → blocked before registry/device request
- signed Build A intent mutated to Build B → signature/request mismatch
- missing, non-`CLEAR`, revoked, expired, or inexact record → denied
- signature from unauthorized signer/domain/chain/registry or malformed signature → denied
- clearance revoked/expired between reads → denied
- concurrent or repeated nonce consumption → exactly one success, later replay denied
- Ledger refusal → `HUMAN_REJECTED`, no retry
- exact chain/registry/schema plus all 15 runtime display filters → guard resolves
- missing, partial, extra, or mismatched runtime display filters → signing cancelled before acceptance
- Signer Kit `SIGN_TYPED_DATA_LEGACY` step → action cancelled, `CLEAR_SIGNING_UNAVAILABLE`
- unsupported WebHID, wrong app, disconnect/signing errors, malformed device output → denied

## Physical evidence table

| Required case | Result | Evidence status |
|---|---|---|
| A — exact valid cleared build, physical approval | Not run | blocked |
| B — physical human rejection | Not run | blocked |
| C — Build B blocked before Ledger | Local deterministic test passes | physical/demo capture pending |
| D — invalid/revoked/expired blocked before Ledger | Local deterministic tests pass | physical/demo capture pending |
| E — consumed signature replay | Local durable/concurrent tests pass | physical signed artifact pending |
| F — post-sign tampering | Local signature/binding tests pass | physical signed artifact pending |

## External blocker

Normal Ledger origin authentication/Clear Signing prerequisites are unavailable locally:

- `NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN` is unset (value was never printed);
- no evidence shows that Ledger accepted and serves the candidate ERC-7730 descriptor for this origin;
- no connected device model, firmware, Ethereum app version, or derived authorized signer is available.

The implementation does not downgrade. An empty origin token rejects before signing, and any SDK
partial/mismatched descriptor response or legacy/hash-based fallback is cancelled. To close P5,
configure the issued token and accepted descriptor, connect an authorized device, create an honestly
labeled demo P4 clearance only if needed, and capture physical cases A–F without credentials or
device secrets.

The `POST /release/prepare` API is usable by a future deployment-agent client, but this evidence run
used only the manual operator harness. No autonomous/LLM agent execution is claimed.

## Secret handling

This artifact contains only public chain data, public protocol fields, package versions, and test
outcomes. It contains no PIN, recovery phrase, private key, origin token, RPC credential, signature,
credential, confidential envelope, or commitment blind.

## 2026-09-07 addendum

The descriptor referenced above was subsequently migrated from ERC-7730 v1 to active v2 and passes
official `erc7730 1.0.7` lint with no issues. Actual Speculos transport/app/address UI smoke and the
remaining official Tester access blocker are recorded separately in
`p5-ledger-speculos-partial-2026-09-07.md`. This historical software evidence remains accurate for
its original run; it must not be read as Speculos A–F or physical-device evidence.
