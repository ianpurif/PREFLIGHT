# Rovaulta Attestation Registry

`RovaultaRegistry` records public, scoped evidence that an authorized registrar attests a
validated P1 `ClearanceRecord`. It does not parse Rovaulta Canonical JSON, prove that Chainlink
executed an evaluation, authorize deployment, or claim universal/physical robot safety.

## P1 transport mapping

- A P1 SHA-256 digest becomes `bytes32` by removing its `sha256:` prefix and decoding the 64 hex
  digits. The P1 clearance digest is the registry's primary key.
- A validated P1 textual identifier becomes `sha256(UTF8(exact prefixed identifier))`. Onchain
  field names end in `IdHash` or `VersionHash` so these values cannot be confused with P1 object
  digests.
- `evaluationIdHash` plus `evaluationInputsDigest` preserve the P1 evaluation binding. P1 defines
  no evaluation-result digest, and the P3 `behaviorInputDigest` is a different value, so neither is
  invented or relabeled here.
- The authorized registrar vouches that the fixed-size fields correspond to the validated P1
  object and clearance digest. Solidity does not recompute canonical JSON.

The record stores only public hashes/digests, `CLEAR`, timestamps, issuer, and revocation state.
Private envelope geometry, thresholds, rules, the commitment blind, confidential responses, and
internal violations must never be submitted.

## Authority, validity, and revocation

The immutable owner is the initial registrar and may add or remove registrars. A removed registrar
cannot create new records, but an original issuer retains revoke-only authority for its own records.
The owner may also revoke. Revocation is permanent; clearance digests and clearance-ID hashes are
single-use and cannot be overwritten or revived.

A record is valid only when it exists, stores `CLEAR`, is not revoked, and
`block.timestamp < expiresAt`. Registration rejects future issuance, already-expired records,
`issuedAt >= expiresAt`, zero critical bindings, and timestamps beyond P1's year-9999 maximum.
`isClearanceValidFor` additionally compares every stored exact-context binding.

P3 authenticated simulation and P4 registration are separate trust boundaries. The current demo
path is manual/authorized registration based on inspected P3 evidence; there is no live DON-to-EVM
delivery or onchain TEE attestation.

## Local verification

From `contracts/`:

```text
forge fmt --check
forge build
forge test -vvv
forge test --gas-report
```

## Sepolia deployment

The unchanged P4 registry is deployed and source-verified on Ethereum Sepolia:

- contract: [`0xFB270cc222efa8B5005AA097dD512Be2558dde65`](https://sepolia.etherscan.io/address/0xFB270cc222efa8B5005AA097dD512Be2558dde65)
- deployment transaction: [`0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497`](https://sepolia.etherscan.io/tx/0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497)
- block: `11644462`; chain ID: `11155111`
- public configuration: [`deployments/sepolia.json`](deployments/sepolia.json)
- curated evidence: [`docs/compliance/evidence/p4-sepolia-deployment-2026-09-06.md`](../docs/compliance/evidence/p4-sepolia-deployment-2026-09-06.md)

The deployer is the immutable owner and initial registrar. This deployment records no clearance by
itself and does not begin P5 or authorize robot deployment.

Copy the root `.env.example` to an ignored local environment file and provide
`SEPOLIA_RPC_URL`, `SEPOLIA_DEPLOYER_PRIVATE_KEY`, and (for explorer verification)
`ETHERSCAN_API_KEY`. Never commit those values.

PowerShell deployment and verification:

```powershell
forge script script/DeployRovaultaRegistry.s.sol:DeployRovaultaRegistry `
  --rpc-url $env:SEPOLIA_RPC_URL --broadcast --verify `
  --etherscan-api-key $env:ETHERSCAN_API_KEY
```

The script rejects any chain other than Ethereum Sepolia (`11155111`) and makes the deployer the
immutable owner. Never substitute a generated address for deployment evidence.
