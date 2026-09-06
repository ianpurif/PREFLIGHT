# P4 Ethereum Sepolia Deployment Evidence

**Evidence class:** public testnet deployment

**Network:** Ethereum Sepolia (`chainId` `11155111`)

**Deployment time:** 2026-09-06T02:48:00Z

**Contract:** `PreflightRegistry`

**Source baseline:** `19296513554c48929de83087409c6ecf5cb0c3a3`

This evidence closes only the P4 public-registry deployment gap. It is not a clearance record, a
P3-to-chain delivery, a Ledger approval, deployment authorization, or proof of physical robot
safety. No clearance was written for the sake of deployment evidence.

## Public deployment identity

| Field | Value |
|---|---|
| Verifying contract | [`0xFB270cc222efa8B5005AA097dD512Be2558dde65`](https://sepolia.etherscan.io/address/0xFB270cc222efa8B5005AA097dD512Be2558dde65) |
| Deployment transaction | [`0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497`](https://sepolia.etherscan.io/tx/0x9dce1c53715d1a0f7b39e469d3ec350ffec2726cbb1e396432dd545f6c16d497) |
| Block | `11644462` |
| Receipt status | success (`0x1`) |
| Deployer / owner / initial registrar | `0xaA5768d0f2157F8781efb975CDd9aec99e7879E3` |
| Constructor argument | `initialOwner = 0xaA5768d0f2157F8781efb975CDd9aec99e7879E3` |
| Gas used | `1001684` (`0xf48d4`) |
| Deployed runtime code | `4263` bytes; keccak256 `0x4455720a5275fc2fcd02f06626937c25fa1d5ba818ce2b9e9908d123ec04c108` |
| Solidity / EVM | `0.8.30+commit.73712a01` / Prague; optimizer enabled, 200 runs |
| Foundry | `1.8.1`, commit `982849d3140c01fd3b72905759581a132df7aa98` |
| Source verification | Etherscan verified; Sourcify verified |

The reusable public artifact for later P5 configuration is
[`contracts/deployments/sepolia.json`](../../../contracts/deployments/sepolia.json). Its
`chainId + verifyingContract` pair is the deployed registry domain; it does not authorize signing.

## Exact commands

Secrets were loaded from the ignored root `.env` into process-local variables. Values are not
shown. These read-only prechecks ran before the broadcast:

```powershell
cast chain-id --rpc-url $rpc
cast wallet address --private-key $deployerPrivateKey
cast balance $deployer --ether --rpc-url $rpc
cast block-number --rpc-url $rpc
forge --version
forge inspect PreflightRegistry metadata
```

They returned chain ID `11155111`, deployer
`0xaA5768d0f2157F8781efb975CDd9aec99e7879E3`, balance `0.162821495099851653 ETH`,
latest block `11644453`, Foundry `1.8.1` at commit
`982849d3140c01fd3b72905759581a132df7aa98`, and compiler
`0.8.30+commit.73712a01`. Predeployment formatting, build, contract tests, and full repository
verification also passed.

The unchanged chain-guarded deployment script was then broadcast once from `contracts/`:

```powershell
forge script script/DeployPreflightRegistry.s.sol:DeployPreflightRegistry `
  --rpc-url $rpc --broadcast --verify
```

The initial combined command mined the transaction. Source status was then confirmed idempotently,
without another broadcast:

```powershell
forge verify-contract 0xFB270cc222efa8B5005AA097dD512Be2558dde65 `
  src/PreflightRegistry.sol:PreflightRegistry --chain sepolia `
  --constructor-args 0x000000000000000000000000aa5768d0f2157f8781efb975cdd9aec99e7879e3 `
  --watch
```

Foundry reported the contract already verified on both Etherscan and Sourcify. Public receipt and
state were independently read with these exact sanitized commands:

```powershell
cast receipt $deploymentTransaction --rpc-url $rpc --json
cast block 11644462 --field timestamp --rpc-url $rpc
cast code $registry --rpc-url $rpc
cast call $registry "owner()(address)" --rpc-url $rpc
cast call $registry "registrars(address)(bool)" $deployer --rpc-url $rpc
cast call $registry "VERDICT_CLEAR()(bytes32)" --rpc-url $rpc
cast call $registry "MAX_PROTOCOL_TIMESTAMP()(uint64)" --rpc-url $rpc
cast call $registry "isClearanceValid(bytes32)(bool)" $zeroDigest --rpc-url $rpc
cast call $registry "clearanceDigestByIdHash(bytes32)(bytes32)" $zeroDigest --rpc-url $rpc
```

The receipt returned status `0x1`, contract/deployer addresses matching the table, block
`0xb1ae2e` (`11644462`), and gas used `0xf48d4` (`1001684`). The block timestamp returned Unix
`1788662880` (`2026-09-06T02:48:00Z`). `cast code` returned 4,263 bytes of runtime code; hashing
those bytes with `cast keccak` produced the runtime hash in the table.

## RPC readback

- `owner()` returned the deployer address.
- `registrars(deployer)` returned `true`.
- `VERDICT_CLEAR()` returned `0x434c454152` followed by zero padding (`bytes32("CLEAR")`).
- `MAX_PROTOCOL_TIMESTAMP()` returned `253402300799`.
- `isClearanceValid(0x00…00)` returned `false` for a nonexistent clearance.
- `clearanceDigestByIdHash(0x00…00)` returned the zero digest.
- The deployed runtime bytecode is nonempty and hashes to the value recorded above.
- The deployment receipt contains the expected `RegistrarAuthorizationUpdated(initialOwner, true)`
  constructor event and no `ClearanceRecorded` or `ClearanceBindingsRecorded` event.

## Secret and scope review

The evidence contains only public chain data and non-secret tool/build identity. The ignored `.env`,
RPC credential, deployer private key, explorer API key, P3 confidential runtime files, private
envelope values, and commitment blind are absent. Raw Foundry broadcast/cache files remain ignored
and are not committed. No P5 EIP-712, Ledger, signer, nonce, or release behavior was added.
