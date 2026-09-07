# Current State

## Phase

**P1–P7 software is implemented. P5.2 adds the narrow AI deployment-agent workflow, deterministic tool/capability boundary, public audit projection, local positive/adversarial evidence, and a live read-only Sepolia blocked-state trace. P6 adds the deterministic digital twin over a server-side public projection of the existing P2/P3 fixture. P7 adds an offline fixed-clock A/B/C rehearsal, demo-owned idempotent reset, stale-browser protection, and reliable Playwright flow coverage. The product UI pass now adds a landing page, first-time onboarding, workspace navigation, target/build views, evaluation/release/evidence views, and a polished Ledger handoff without changing authority. The real provider adapter is implemented but no external model call was captured because provider credentials/model are absent. P5.1 has official Speculos transport, actual Ethereum app/address UI smoke, ERC-7730 v2 validation, real pre-sign C, and invalid/unregistered D. Authenticated Clear Signing A/B/E/F and physical Ledger evidence remain externally blocked. P8 submission evidence/assets remain open.**

## Product UI/UX pass now present

- `/` is a plain-language landing page for warehouse safety engineers and robot integrators.
- `/start` captures only public/demo workspace context (site, robot, and build labels) and stores it
  in the browser session; it does not invent backend persistence or authority.
- `/app` is the workspace overview. `/app/setup`, `/app/builds`, `/app/evaluate`, `/app/releases`,
  and `/app/evidence` are focused product views with simple navigation.
- The existing deterministic P6/P7 evaluator remains at `/app/evaluate`; Build A, Build B, mutated
  build, reset, stale-response handling, and the real P5 preparation boundary remain unchanged.
- The UI distinguishes `HOLD`, `CLEAR`, `BLOCKED`, and `LEDGER_APPROVAL_REQUIRED`. Technical CRE,
  Sepolia, and Ledger details live behind the Evidence view rather than leading the workflow.
- Private envelope inputs, blinds, restricted geometry, thresholds, internal reports, credentials,
  and raw model/CRE payloads remain outside the browser projection.

## P6 implementation now present

- The root route is a single judge-facing dashboard: deployment target, deterministic warehouse
  digital twin, public evaluation, Chainlink boundary, deployment-agent activity, Sepolia registry,
  Ledger boundary, and expandable verification trail.
- The server evaluates the existing `@preflight/simulation-core` fixture and passes only a public
  projection to the browser. The confidential envelope, blind, rules, thresholds, geometry, and
  internal report never enter the client bundle or rendered output.
- Build A is the default `HOLD` state with the existing three deterministic violation families.
  Build B is the same-envelope `CLEAR` state. The public judge headline displays `487 scenarios`
  while the authoritative checked-in P2 fixture remains bounded to three committed templates;
  the distinction is visible in the UI and does not alter evaluator semantics.
- Mutating Build B changes the build ID and canonical digest and produces `BLOCKED` with
  `CLEARANCE_BINDING_MISMATCH`. It clears any prepared state and cannot expose a Ledger request.
- The agent panel is a public/fixture-backed projection until the existing API is configured. A
  live `/agent/deployment/prepare` response is required before the page stores an exact prepared
  P5 request and opens `/p5-ledger`; no frontend state can report `AUTHORIZED`.
- Chainlink is labeled `CRE authenticated simulation evidence` and sourced as a recorded P3 public
  outcome; a mutated build explicitly says confidential evaluation was not run. The real Sepolia
  registry identity is linked, Speculos is labeled as a development/test simulator, and physical
  Ledger approval is explicitly not demonstrated. No clearance transaction or robot activation is
  fabricated.

## P5.2 implementation now present

- A narrow OpenAI Responses function-calling adapter supports one strict tool per turn, sends only
  a host-generated public request with `store: false`, and fails without a deterministic/mock
  production fallback when configuration is missing.
- A host-owned state machine enforces
  `resolve target → context → evaluation → clearance → release prepare → Ledger status`.
  Unknown, malformed, skipped, repeated, reordered, or authority-bearing calls fail closed.
- A strict public catalog accepts only its finite public request forms, resolves the exact target
  locally, discards raw input, and gives the model only a generated canonical public request. The
  model's first aliases must match that same entry; it cannot construct clearance, signer, chain,
  registry, nonce, signature, typed data, or authorization.
- Public evaluation and clearance reads are informational. Only the existing
  `ReleaseService.prepare()` can issue a request, preserving live P4 checks, exact bindings, signer
  allowlist, expiry, and server nonce semantics.
- The agent has no signing, release-consumption, registry-write, arbitrary network, shell, or
  filesystem tool. Eligible execution ends at `LEDGER_APPROVAL_REQUIRED`; the browser/user Ledger
  action remains separate.
- `AUTHORIZED` is available only from a read of the exact prepared nonce after the existing P5 flow
  stored a validated `ReleaseAuthorization`. Tests prove this with actual EIP-712 signing,
  signature recovery, postcheck, and atomic nonce consumption using a test-only key.
- The public audit records only a host-generated canonical request/target, ordered tools, public
  clearance/block result, policy result, intent digests, Ledger status, and final status. It excludes
  raw submitted text/model output, signatures, credentials, private envelopes/blinds, CRE payloads,
  and private evaluation detail.
- Local evidence shows unsafe A blocked, corrected B reaching Ledger-required, and mutated C losing
  to `CLEARANCE_BINDING_MISMATCH`. A live read-only agent trace queried Sepolia at block `11653234`
  and blocked the deliberately unregistered fixture with `CLEARANCE_NOT_FOUND`.
- Production WebHID remains unchanged/default; Speculos remains development/test-only. P6 adds
  only the judge dashboard/public projection and exact prepared-request handoff; no activation,
  Key Ring, contract mutation, or P1–P5.1 redesign was added. See ADR-0008 and the P6 execution
  plan.

## P7 deterministic demo reliability now present

- `bun run demo:setup` resets only `.data/preflight-demo`, materializes a public manifest, and
  runs the deterministic A/B/C rehearsal. `bun run demo:reset` is idempotent and never removes
  source fixtures, deployment metadata, evidence, `.env`, or the normal release database.
- The rehearsal reuses the P2 evaluator and existing P5.2 DeploymentAgent/ReleaseService with a
  fixed clock, block snapshot, attempt IDs, and demo-only nonce factory. Production defaults remain
  live RPC/provider-backed and cryptographically random.
- Scenario A is `HOLD`/`NOT_REQUESTED`; B is `CLEAR` with a local deterministic clearance,
  `LEDGER_APPROVAL_REQUIRED`, exact intent binding, and `AWAITING_HUMAN`; C mutates Build B,
  recomputes its digest, and returns `BLOCKED / CLEARANCE_BINDING_MISMATCH` without Ledger handoff.
- The dashboard exposes `Reset demo`, clears stale handoff storage on scenario changes/mount, and
  ignores late agent responses after a reset or mutation. The Playwright P7 flow covers clean
  startup, reset, A/B/C transitions, exact handoff fields, repeated C output, and race cleanup.
- This is offline rehearsal evidence only. The recorded P3 authenticated CRE simulation, live
  Sepolia read-only identity, Speculos development path, and physical Ledger limitations retain
  their existing labels and boundaries.

## P5 implementation now present

- `DeploymentIntent` v2 adds the fixed `ACTIVATE_DEPLOYMENT` action without creating a second intent model.
- EIP-712 signs the full exact intent under `Preflight` v1, Sepolia `11155111`, and the deployed registry from `contracts/deployments/sepolia.json`.
- The signed message binds protocol/schema, site, robot, build ID/digest, clearance ID/digest, environment, authorized signer, nonce, issuance, expiry, and the P1 intent digest.
- The API reads the real P4 interface at one explicit block and rejects missing, non-`CLEAR`, revoked, expired, inexact, wrong-chain, or wrong-registry clearance state.
- The signer address must be in the operator-controlled `PREFLIGHT_AUTHORIZED_SIGNERS` allowlist before a Ledger request is prepared and again after recovery.
- Nonces are generated server-side, persisted in SQLite, and atomically consumed once. Invalid signatures and failed post-sign checks do not consume them.
- Clearance is checked before signing and again before nonce consumption. Revocation or expiry between checks denies authorization.
- The browser adapter uses pinned Ledger DMK, WebHID and Speculos Device Transport Kits, Context Module, and Ethereum Device Signer Kit packages behind an exact `webhid | speculos` selection. Both transports retain one connection/address/context/signing path; Speculos is rejected outside `development`/`test`.
- The runtime Clear Signing guard requires successful resolution for the exact chain, registry, 15-field schema, filter count, and every display path before signing may proceed. Partial/mismatched context and the signer kit's legacy typed-data fallback state are cancelled and rejected. There is no personal-sign, raw-transaction, hashed-EIP-712, backend-key, or frontend-boolean fallback.
- A minimal `/p5-ledger` operator harness defaults to production WebHID and can opt into a loopback Ledger Speculos official device simulator only in development/test. It does not activate a robot or implement the P6 digital twin.
- Speculos `0.27.0` executed the official Ethereum `1.22.3` Nano S Plus ELF. DMK discovery, actual emulator address review/confirmation, and public session identity were captured without a seed or secret.
- The candidate descriptor now uses active ERC-7730 v2 and passes official `erc7730 1.0.7` lint with no issues. This is validation, not Ledger registry acceptance or display evidence.
- `/release/prepare` remains the deterministic proposal authority. P5.2 now calls it through the
  narrow agent controller; the Ledger browser flow remains manual and explicitly human-controlled.
- Mock tests cover deterministic EIP-712 mutation, the positive exact registry-reader path, API request/error boundaries, authorized signatures, durable/concurrent replay rejection, TOCTOU, build mutation, device lifecycle, refusal, exact/partial descriptor resolution, malformed output, and legacy-fallback cancellation.

## Current blocker

The official Clear Signing Tester wrapper was invoked and failed closed with `Error: GATING_TOKEN environment variable not set` (exit `1`). Its direct implicit test-token fallback was not used. The Tester is also a separate display harness that discards the signature: its gating token is not a substitute for Preflight's Ledger origin token/accepted descriptor. Consequently the structured deployment-intent display and Speculos cases A/B/E/F have **not** been run. A deliberate unexpired Sepolia demo `CLEAR` record for the Speculos signer would also be required for Case A; no contract write was made.

Case C and the invalid/unregistered D variant were executed through the real `/release/prepare` boundary using the public Speculos test address. Build substitution returned `403 CLEARANCE_BINDING_MISMATCH`; the deliberately unregistered fixture reached the deployed Sepolia registry and returned `403 CLEARANCE_NOT_FOUND`. Both stopped before device signing. Real revoked/expired D variants remain uncaptured, although deterministic tests cover them.

Physical cases A–F also have **not** been run. The local environment has no configured Ledger-issued origin token and no evidence that Ledger accepted/serves the candidate descriptor for this origin. No physical Ledger model, firmware, approval, or rejection was captured.

P5 therefore does not yet prove either a complete official Speculos Clear Signing flow or hardware-backed human approval. Blind signing remains disabled; missing/partial context or the SDK legacy fallback fails closed.

## Next exact task

P8 submission evidence may address the partner matrix, architecture diagram, AI attribution, and
showcase assets. Do not add robot activation, make UI state authoritative, or turn the offline
rehearsal into a live-partner claim. Persisting agent audit history may be considered later without
changing P5 nonce authority.

External evidence remains separately open: run the real provider adapter when an approved
`OPENAI_API_KEY` and explicit `PREFLIGHT_AGENT_MODEL` are available; obtain legitimate Ledger
Tester/application-origin/accepted-descriptor access for Speculos A/B/E/F; and capture physical
Ledger cases when hardware is available. Do not fabricate these results or block deterministic P6
UI work on claims that have already been explicitly scoped as external limitations.

## Environment status

Bun 1.4.1 and Foundry 1.8.1 are available. P1–P4 regressions remain in scope. Native WSL2 Speculos `0.27.0`, QEMU, and the verified public Ethereum `1.22.3` Nano S Plus ELF were used for the recorded smoke run. A read-only Sepolia P5 client run on 2026-09-06 confirmed chain `11155111`, registry `0xFB270cc222efa8B5005AA097dD512Be2558dde65`, and live contract access at block `11645707`; the deliberately unregistered local fixture returned `exists=false` and `exactMatch=false`, as expected. This is reader/policy evidence, not a successful release or proof that the registry contains no other clearances.

P3's authenticated CRE runs remain simulation evidence only. P4 remains an authorized registrar attestation, not automatic CRE delivery. Neither Ledger nor Preflight proves physical robot safety.
