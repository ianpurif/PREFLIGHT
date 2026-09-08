# Ledger Integration Contract

## Prize direction and precise claim

**Intended AI Agents x Ledger direction: human-in-the-loop autonomous-agent authorization.**

> An orchestration client can prepare an exact robot release request, but release authorization requires a cryptographically valid, one-time Ledger-backed human approval bound to the exact cleared build and deployed Rovaulta registry.

P5.2 now implements the narrow autonomous deployment-agent half: a real strict tool-calling provider
adapter plus a host-owned deterministic controller can resolve a public request, inspect evaluation
and Sepolia clearance state, and call the existing release-preparation authority. The agent has no
signing/consumption key or tool and eligible execution stops at `LEDGER_APPROVAL_REQUIRED`. The
current `/p5-ledger` route remains the separate manual operator evidence harness. Ledger does not
evaluate safety, run Chainlink CRE, certify an industrial system, or activate a physical robot.

## Load-bearing authority flow

```text
Operator asks AI deployment agent
      ↓
Agent inspects public evaluation + Sepolia clearance
      ↓
Rovaulta deterministic policy filters
      ↓
Human reviews and approves on device
      ↓
Ledger signer enforces key custody
      ↓
API verifies, rechecks clearance, consumes nonce once
```

- The P5.2 agent accepts only catalog-generated public deployment forms. The host resolves and
  locks canonical identifiers before a provider sees a generated public projection (`store: false`);
  the model cannot construct clearance, signer, chain, registry, nonce, signature, payload, or
  authorization.
- Its strict tools can inspect public state and invoke `ReleaseService.prepare()`. There is no
  signing, `/release/consume`, registry-write, arbitrary-network, shell, or filesystem tool.
- Deterministic policy queries the deployed P4 registry and decides whether Ledger may be prompted.
- The software requires Ledger's returned descriptor to cover every signed field before the signing command may proceed. Physical display/review remains unverified until hardware evidence is captured.
- In production, Ledger hardware keeps the private key on-device and produces the only acceptable signature. Speculos is a test emulator and provides no Secure Element claim.
- The API reconstructs the message, recovers the signer, repeats the P4 check, and atomically consumes the nonce.
- Agent status becomes `AUTHORIZED` only by reading that exact stored P5 result. Model text cannot
  create or override the state.

Local P5.2 evidence shows unsafe A blocked, deterministic corrected B reaching the Ledger boundary,
and mutated C losing to exact-build preparation. A separate live read-only Sepolia agent run blocked
the deliberately unregistered existing fixture. No external provider credential was configured, so
the real OpenAI adapter is contract-tested but no live model call is claimed. No Speculos signature
or physical device approval is inferred from agent preparation.

## Current packages

Exact versions are pinned for demo stability:

| Package | Version | Purpose |
|---|---:|---|
| `@ledgerhq/context-module` | `2.5.0` | Clear Signing context dependency |
| `@ledgerhq/device-management-kit` | `1.9.0` | device discovery/session management |
| `@ledgerhq/device-transport-kit-web-hid` | `1.2.4` | browser WebHID transport |
| `@ledgerhq/device-transport-kit-speculos` | `1.2.1` | official local simulator transport |
| `@ledgerhq/device-signer-kit-ethereum` | `1.18.0` | Ethereum address and full EIP-712 signing |
| `@ledgerhq/speculos-device-controller` | `0.3.0` | test-only actual emulator UI control |
| `rxjs` | `7.8.2` | device-action observables |

Deprecated `@ledgerhq/hw-app-*` and `@ledgerhq/hw-transport-*` packages are prohibited and absent. P5 does not use Key Ring because it needs physical human approval, not agent/VPS secret brokerage.

The implemented Ledger primitives are DMK, Ethereum Device Signer Kit, WebHID Device Transport
Kit, Speculos Device Transport Kit, Context Module, and the ERC-7730 descriptor/tooling. The
official Ledger Agent Stack/agent-skills material informed the human-in-the-loop positioning, but
no Agent Skill was installed or executed in this repository, so no such execution claim is made.
Key Ring is intentionally not used for this direction.

## Exact authorization

The domain is `Rovaulta`, version `1`, chain ID `11155111`, verifying contract `0xFB270cc222efa8B5005AA097dD512Be2558dde65`. The address and chain come from `contracts/deployments/sepolia.json`.

`DeploymentIntent` signs protocol/schema version, fixed `ACTIVATE_DEPLOYMENT`, exact site, robot, build ID/digest, clearance ID/digest, `sepolia`, authorized signer, server nonce, integer `issuedAt`/`expiresAt`, and the P1 canonical intent digest. Any field or domain change invalidates the signature.

Authorized signers are a strict public-address allowlist controlled by the API operator through `ROVAULTA_AUTHORIZED_SIGNERS`. The connected device address is confirmed on-device and checked before signing; recovered signer authorization is checked again during consumption. The backend never receives a private key.

## Replay and TOCTOU boundaries

P5's nonce authority is offchain and single-node: Bun SQLite with WAL, synchronous `FULL`, and one atomic `UPDATE ... WHERE state = 'ISSUED'`. It persists the exact canonical intent, clearance, typed-data digest, signer, and precheck block evidence. Browser state is never treated as replay protection.

The same exact P4 clearance is read at one explicit Sepolia block before preparation and again after signature recovery. Missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, wrong-contract, RPC, or persistence state fails closed. Validity is strict `now < expiresAt`; equality rejects.

## Clear Signing and refusal

The browser route defaults to an explicit user gesture, WebHID, on-device address confirmation, and an active Ethereum app. Development/test configuration may select only a loopback Speculos endpoint; production runtime configuration rejects Speculos. Both modes use the same adapter, Context Module, exact typed data, and strict action. A Ledger-issued origin token remains mandatory for signing. The local ERC-7730 v2 file passes the official validator but is still a **candidate descriptor only** until Ledger accepts and serves it for the application origin.

The official Context Module is fixed to Ethereum. Before `SIGN_TYPED_DATA` may continue, the runtime guard requires a successful descriptor response for the exact chain, registry, 15-field `DeploymentIntent` schema, declared filter count, and exact display-filter paths. Missing, partial, extra, or mismatched filters fail closed. Signer Kit 1.18.0 can also enter its public `SIGN_TYPED_DATA_LEGACY` action step when full context cannot be built; the adapter cancels that action immediately and returns `CLEAR_SIGNING_UNAVAILABLE`. It never accepts hashed EIP-712, blind signing, personal signing, raw transaction signing, or a backend/frontend fallback. A device refusal maps to `HUMAN_REJECTED` and is not retried.

## Speculos and hardware evidence status

The Ledger Speculos official device simulator ran Speculos `0.27.0` with the checksum-verified public Ethereum `1.22.3` Nano S Plus ELF. DMK `1.9.0` discovered it and actual emulator address review/confirmation returned the public signer `0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D`. This is transport/app/UI smoke evidence only.

That signer comes from Speculos's deterministic test seed. It is public test identity, must never be retained in a production `ROVAULTA_AUTHORIZED_SIGNERS` allowlist, and any clearance/nonce database created for it must be test-only.

The official ERC-7730 Tester wrapper exited `1` because `GATING_TOKEN` was not set. The direct implicit test token was not used. The Tester also discards its signature, so completing Rovaulta A/B/E/F separately requires an application origin token plus an accepted/served descriptor or another official descriptor-resolution path that returns the real signature. Real `/release/prepare` runs already prove C (`CLEARANCE_BINDING_MISMATCH`) and invalid/unregistered D (`CLEARANCE_NOT_FOUND`) before signer invocation. Physical evidence is not captured; there is no connected physical-device model, firmware, approval, or rejection evidence.

Remaining Speculos closure cases are valid approval, emulator refusal, consumed-signature replay rejection, and post-sign field tampering rejection. Physical A–F remain separate. Evidence may include only public fields/signature hash and must never expose PIN, recovery phrase, private key, origin token, or credentials.

## Switching between Speculos and WebHID

The application defaults to `webhid`. A Ledger mentor with a physical device sets
`NEXT_PUBLIC_LEDGER_TRANSPORT=webhid`, configures the issued
`NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN`, opens the Ethereum app, and uses `/p5-ledger` from Chromium on
localhost/HTTPS. No architecture or EIP-712 change is required.

For test-only Speculos, set `NEXT_PUBLIC_LEDGER_TRANSPORT=speculos` and
`NEXT_PUBLIC_LEDGER_SPECULOS_URL=http://127.0.0.1:5000`, then start the exact supported Ethereum app
under Speculos while `NODE_ENV` is `development` or `test`. The runtime rejects Speculos in
production. Loopback filtering blocks direct non-loopback configuration only; it does not attest the
emulator or prevent a local proxy from forwarding APDUs.
Clear Signing still requires legitimate context resolution; an empty token, partial descriptor, or
legacy/blind path fails closed.

Detailed partial evidence is in
[`p5-ledger-speculos-partial-2026-09-07.md`](../compliance/evidence/p5-ledger-speculos-partial-2026-09-07.md).
Specific tooling feedback is in [`LEDGER_DX_FEEDBACK.md`](LEDGER_DX_FEEDBACK.md).

## Official resources used

- https://developers.ledger.com/docs/device-interaction/dmk-ts/references/signers/eth
- https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/migrations/signers/eth/hw_app_eth_to_dmk
- https://developers.ledger.com/docs/device-interaction/dmk-ts/integration/how_to/transports
- https://developers.ledger.com/docs/clear-signing/for-wallets
- https://developers.ledger.com/docs/clear-signing/reference/erc7730-reference
- https://github.com/LedgerHQ/agent-skills
- https://github.com/LedgerHQ/speculos
- https://github.com/LedgerHQ/app-ethereum/releases/tag/1.22.3
- https://github.com/ethereum/clear-signing-erc7730-registry
