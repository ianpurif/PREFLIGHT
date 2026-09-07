# Ledger developer-experience feedback

**Context:** Preflight P5/P5.1, DMK/WebHID production path plus Ledger Speculos official device
simulator test path, September 2026. This is implementation feedback, not a claim of partner
acceptance.

## What worked well

- The Ledger Agent Stack/DMK direction keeps device ownership in the browser and makes the transport
  boundary explicit. The same Ethereum Device Signer Kit can run over WebHID or Speculos without
  changing Preflight's EIP-712, signer-recovery, registry-recheck, or replay semantics.
- `DeviceManagementKitBuilder`, transport factories, and the observable device-action states made it
  possible to detect and reject `SIGN_TYPED_DATA_LEGACY` rather than silently accepting a fallback.
- `@ledgerhq/device-transport-kit-speculos` connected cleanly to Speculos over HTTP, and
  `@ledgerhq/speculos-device-controller` drove the actual Nano S Plus emulator buttons.
- Official Ethereum app releases now include public model-specific ELF assets with published
  SHA-256 digests. That materially reduces setup time and avoids private coin-app access for basic
  emulator work.
- The `erc7730` linter gave precise, actionable diagnostics. Migrating the descriptor from v1 to v2
  and fixing device-length/address-format warnings was straightforward.

## Friction and ambiguity

- The official Speculos transport documentation shows `speculosTransportFactory(...)` without a
  complete import in one place, while package/readme examples have used inconsistent package names.
  A single copy-pasteable DMK example with import, factory, discovery identifier, device model, and
  loopback URL would save time.
- Model naming is inconsistent across tools: `nanosp`, `nanos2`, `nanoSP`, and “Nano S Plus” all
  refer to the same target in different contexts. A canonical mapping table should live beside the
  quickstart.
- The registry tester wrapper documents Node 18+, the tester has separately documented Node 20+,
  and the current device SDK monorepo requires Node 24+. Pinning one tested toolchain in the wrapper
  would make runs reproducible.
- The official registry wrapper floats the device SDK `develop` branch and latest Speculos image.
  It should pin a tester commit, container digest, and compatible app version, then print all three
  in the result artifact.
- The wrapper requires `GATING_TOKEN` and private `LedgerHQ/coin-apps` access, but the onboarding path
  for external hackathon developers is not public. The current public Ethereum releases make the
  private app repository unnecessary when `--custom-app` is supported; the wrapper should expose
  that path directly.
- The direct Clear Signing Tester silently substitutes a test origin token when `GATING_TOKEN` is
  absent, while the registry wrapper fails explicitly. The CLI should fail closed by default and
  require an explicit `--unsafe-local-test-token` flag if that behavior is needed internally.
- ERC-7730 v2 uses structured `expected` test results, while the current tester file repository reads
  legacy `expectedTexts`. With no `expectedTexts`, a run can appear successful without asserting any
  display text. The tester should consume v2 fixtures directly and reject empty expectations.
- The tester auto-approves and discards the returned signature. That is appropriate for descriptor
  display validation but cannot prove refusal behavior, signature recovery, replay handling, or an
  application's post-sign authorization path. Its output should state this boundary clearly.
- `originToken` onboarding, descriptor submission, acceptance, remote serving, local injection, and
  tester gating are described across several surfaces. Developers need one lifecycle diagram that
  distinguishes production Context Module resolution from local Speculos descriptor injection.

## Concrete improvements

1. Publish a versioned `create-ledger-clear-signing-test` command that downloads a verified public
   app ELF, pins Speculos/tester versions, and produces a manifest with hashes.
2. Add an official `--custom-app` option to the registry wrapper so public release ELFs work without
   private coin-app access.
3. Make missing `GATING_TOKEN` a hard error in every tester entrypoint and document how external
   developers obtain one, including expected approval time and scope.
4. Validate that at least one expected display assertion exists; support the active v2
   `expected.fields` fixture schema end to end.
5. Add `--reject` and `--keep-signature` test modes so applications can prove actual emulator refusal
   and cryptographic end-to-end flows without maintaining a second controller harness.
6. Print an evidence manifest: tester commit, Speculos version/digest, model, API level, app
   name/version/hash, DMK/signing/context package versions, descriptor hash, clear/partial/blind
   classification, and screenshot hashes.
7. Provide a single WebHID ↔ Speculos transport-switch example showing that application signing and
   post-sign verification code remain shared.

## Preflight-specific status

The DMK Speculos transport and actual Ethereum `1.22.3` Nano S Plus app reached address review and
confirmation. The v2 descriptor passes `erc7730 1.0.7` with no issues. The structured display and
P5 A/B/E/F evidence remain blocked: the Tester lacks an official `GATING_TOKEN`, and Preflight
separately lacks an application origin token plus accepted/served descriptor path that returns the
signature. Real pre-sign C and invalid/unregistered D denials passed; revoked/expired D remain
test-only. Preflight did not use the implicit test token or permit blind signing. Physical Ledger
execution remains unperformed.

## P5.2 agent-boundary observation

The human-in-the-loop agent direction was implementable without giving the model a Ledger SDK
capability: the agent prepares through deterministic API tools, then the existing browser DMK path
owns the explicit user gesture and signing session. This makes Ledger materially load-bearing and
avoids backend key custody. A concise official reference architecture showing “agent proposes →
deterministic application policy → DMK browser handoff → verified result” would help teams avoid
exposing signing as a general model tool. Preflight did not use Key Ring and did not execute an
official Ledger Agent Skill; those should not be implied by using DMK itself.
