# Task Board

## B0 — Boilerplate
- [x] Specialized repository structure
- [x] Codex context hierarchy
- [x] Codex skills + specialist agents
- [x] Architecture / partner / compliance docs
- [x] App/package/integration/contract shells
- [x] CI + scaffold verification
- [x] Worktree workflow

## P1 — Domain + protocol foundation
- [x] Canonical identifiers and digest strategy
- [x] Clearance/evaluation schemas
- [x] Failure semantics and validation
- [x] Serialization/canonicalization tests

## P2 — Deterministic simulator/evaluator
- [x] Seeded warehouse scenario model
- [x] Restricted-zone/speed/payload rules
- [x] Deterministic verdict engine
- [x] Negative/property tests

## P3 — Chainlink CRE confidential evaluation
- [x] CRE workflow entrypoint
- [x] `handlerInTee` confidential path
- [x] private envelope handling
- [x] minimal public result
- [x] authenticated CRE simulation evidence — unsafe `HOLD`, corrected `CLEAR`, tampered commitment `REJECT`

## P4 — Attestation registry
- [x] minimal clearance registry interface
- [x] exact-build/site/evaluator/expiry binding
- [x] revocation/expiry semantics
- [x] fuzz + invariant tests
- [x] Sepolia deployment, source verification, public RPC readback, and non-secret P5 registry identity

## P5 — Ledger release gate
- [x] align and pin compatible DMK, WebHID transport, context, signer-kit, and RxJS versions
- [x] DMK/WebHID browser adapter with explicit device/app/address lifecycle
- [x] narrow WebHID/Speculos transport selection with shared signer lifecycle and production rejection
- [x] full EIP-712 deployment intent bound to the deployed Sepolia registry
- [x] ERC-7730 v2 candidate validated by official linter plus exact runtime filter-resolution guard and fail-closed legacy/blind-fallback rejection
- [x] actual Ethereum 1.22.3 app under Speculos 0.27.0 with DMK discovery and emulator address UI confirmation
- [ ] authenticated official Clear Signing Tester structured-display evidence — blocked on missing `GATING_TOKEN`
- [ ] Speculos A–F end-to-end evidence — real C and invalid/unregistered D pass; A/B/E/F plus revoked/expired D captures blocked/open
- [ ] Ledger-issued origin token and accepted/served Clear Signing descriptor
- [x] device signing path implemented and mock-verified (physical execution pending)
- [x] deterministic pre/post clearance policy, authorized signer, durable nonce, replay/TOCTOU/mismatch tests
- [ ] physical hardware evidence

## P5.2 — AI deployment-agent closure
- [x] narrow real provider abstraction and Gemini 2.5 Flash strict tool-calling adapter
- [x] exact public catalog resolution and immutable site/robot/build binding
- [x] host-owned ordered tool/capability state machine
- [x] live public Sepolia clearance inspection and existing `/release/prepare` authority reuse
- [x] Ledger-required handoff with no agent signing/consumption authority
- [x] exact consumed-P5 authorization status correlation
- [x] structured public/non-secret attempt audit
- [x] unsafe, corrected, mutated, revoked, expired, adversarial, injection, and determinism tests
- [x] finite public request grammar, conflicting-target rejection, and raw-text non-disclosure
- [x] local A/B/C agent evidence and live read-only Sepolia blocked-state evidence
- [x] external Gemini model execution evidence — live run captured; this key uses explicit
  `gemini-3.5-flash` because the default `gemini-2.5-flash` is unavailable to new users

## P6 — Demo UI / digital twin
- [x] deterministic warehouse scene
- [x] denied build scenario
- [x] corrected build scenario
- [x] visible CRE/attestation state
- [x] Ledger approval UX
- [x] mutated-build blocked scene

## P7 — End-to-end demo reliability
- [x] scripted deterministic demo fixture
- [x] reset/retry path
- [x] offline-safe visual fallback that does not fake partner execution
- [x] 4-minute timing rehearsal (repeatable offline rehearsal path; no live partner execution claimed)

## P8 — Product UI/UX and real lifecycle
- [x] plain-language landing page and account entry
- [x] authenticated onboarding for site, private policy, robot, and exact build
- [x] account-scoped persistence and session isolation
- [x] server-side evaluation through the configured confidential evaluation boundary
- [x] public result UX for `HOLD`, `CLEAR`, `BLOCKED`, and `LEDGER_APPROVAL_REQUIRED`
- [x] truthful release preparation through the existing P5/P5.2 boundary
- [x] explicit development-only P7 fixture route and regression coverage
- [x] responsive, loading, error, disabled, and accessibility states for critical flow

## P9 — Partner bounty qualification slice
- [x] official CRE gateway client boundary with request-scoped site secret binding
- [x] fail-closed CRE request/rejection/pending/network semantics and public-result validation
- [x] Sepolia RovaultaRegistry subgraph schema, manifest, ABI, and event mappings
  - [x] server-only The Graph provider adapter with exact binding/revocation/expiry checks
- [x] account-backed agent resolution from authenticated evaluation/clearance records
- [x] load-bearing `getGraphContext` step before the existing P5 preparation authority
- [x] normal release preparation routed through the account-backed agent boundary
- [x] negative tests for CRE fallback/network failures, Graph outage/mismatch, account mismatch,
  and agent authority boundaries
- [ ] provision request-scoped CRE secrets and capture a completed account-created CRE result (optional live path; not required for Chainlink simulation qualification)
- [x] deploy/index the Rovaulta Sepolia subgraph and capture live Graph-provider evidence
- [x] run a real account-backed Graph `MATCHED` preparation through P5/Ledger handoff
- [x] obtain external Gemini model execution evidence (server-side key; model override recorded)

## P10 — Final partner qualification
- [x] versioned canonical CRE result callback with HMAC authentication and public-only payload
- [x] persist exact account evaluation requests while official CRE execution is asynchronous
- [x] complete pending evaluations with exact binding checks and idempotent callback handling
- [x] deliver the minimal result from the TEE through the official HTTP capability when configured
- [x] expose explicit pending state and bounded browser polling in the normal workspace
- [x] document Chainlink, Graph, and Ledger qualification boundaries without fabricated evidence
- [ ] provision deployed CRE site/callback secrets and capture account-created completion (optional live path; not required for Chainlink simulation qualification)
- [x] deploy/index the Sepolia subgraph and capture live Subgraph Studio `MATCHED` evidence
- [x] capture account-backed Graph `MATCHED` → P5/Ledger-required execution
- [x] capture external Gemini execution if required by the selected submission
- [ ] capture official Ledger Clear Signing/physical-device evidence if required by the selected pool

## P11 — The Graph qualification
- [x] pinned Graph CLI/AssemblyScript tooling with reproducible Sepolia codegen and WASM build
- [x] public-only `RovaultaRegistry` subgraph schema, manifest, ABI, and event mappings
  - [x] server-only live Graph client with exact digest, binding, issuer, block, expiry, and revocation validation
- [x] account-backed deployment agent Graph gate before the existing P5 authority
- [x] live-only operator scripts for hosted deployment, provider query, and account-agent evidence
- [x] critical tests for provider request shape, malformed public data, non-matched states, and P5 handoff
- [x] deploy/index the subgraph through a real Graph provider and record hosted identity (`rovaulta-registry` v0.1.0, Sepolia, 100% sync, one real account clearance indexed)
- [x] capture a live Subgraph Studio `MATCHED` response for an account-created Sepolia clearance
- [x] capture the live Graph result changing the account-agent outcome and reaching `LEDGER_APPROVAL_REQUIRED`
- [x] document Start Fresh / From Scratch eligibility declaration and repository chronology; retain the event submission record as the external authoritative artifact
- [ ] record a 2–4 minute public demo showing the live provider-to-agent decision

### Remaining submission evidence
- [ ] partner evidence matrix complete
- [ ] architecture diagram final
- [ ] README judge path
- [ ] AI attribution complete
- [ ] 2–4 minute showcase video

## P18 — Optional Build Integrity / reproducible source builds
- [x] versioned source-build integrity descriptor and exact-build digest binding
- [x] BuildKit/buildx-backed Bun/Node Build Runner with fail-closed limits
- [x] account-scoped source build job/status/artifact/provenance persistence
- [x] existing build-number route remains compatible
- [x] existing evaluation/clearance/Ledger path consumes only successful source builds
- [x] minimal source-build UX and evidence/details projection
- [x] real Bun BuildKit proof and targeted verification
- [x] diagnose and fix Windows Docker Desktop `buildx` plugin resolution
- [ ] full repository verification

## P12 — Account-backed Sepolia clearance issuance
- [x] validated public clearance construction from an account-owned `CLEAR` evaluation
- [x] canonical P4 registry write/event ABI and exact transport reuse
- [x] fail-closed operator command with simulation, confirmation, event checks, and readback
- [x] operator runbook and public-only output contract
- [x] create one real account-backed Sepolia clearance and capture transaction evidence
- [x] wait for The Graph entity and capture the exact live Subgraph Studio `MATCHED` response

## P13 — CRE simulation qualification and account boundary
- [x] normal account/site/robot/build/evaluation HTTP path is reused without a production P2 fallback
- [x] fail-closed operator runner with public-only polling/output
- [x] two-phase setup, exact resource reuse, and secure local CRE site-secret provisioning handoff
- [x] ignored setup-file contract and CRE/site-secret/callback runbook
- [x] clean-checkout fixture generation with the exact site-bound selector
- [x] official CRE CLI simulation runner with strict public-result/binding validation
- [x] authenticated simulation evidence for unsafe `HOLD`, corrected `CLEAR`, and tampered `REJECT`
- [x] redacted evidence contract and no-secret leakage checks
- [x] simulation selected as the Chainlink qualification path; live deployment explicitly not claimed
- [ ] create one normal account-backed evaluation through an optional deployed CRE gateway
- [ ] verify an account-created evaluation is consumable by the existing P12 command (optional live path)

## P13.1 — Account-owned official CRE CLI simulation mode
- [x] add an explicit `ROVAULTA_CRE_EXECUTION_MODE=simulation` application mode; keep gateway as the default
- [x] build the official CLI public payload from account-owned site, robot, build, request, and traces
- [x] generate a temporary `secretsNames` mapping for the exact request-scoped site selector
- [x] pass the versioned confidential envelope/blind through the CRE-supported temporary `-e` file only
- [x] require `cre -v` and `cre whoami` before starting the account simulation
- [x] require the existing callback parser, behavior-input digest, and exact P1 binding validation before persistence
- [x] persist public `official-cre-cli-simulation` provenance and CLI version on the account evaluation
- [x] delete temporary workflow, mapping, payload, and secret material on success or failure
- [x] cover dynamic selector mapping, cleanup, confidential-output rejection, and clearance construction
- [x] document the operator flow and keep simulation provenance distinct from live CRE/DON execution
- [x] provide a safe clean-checkout setup template/generator and strict actionable setup-file validation
- [x] run the mode with a real operator account and capture one account-owned simulated `CLEAR` with explicit official CLI provenance
- [x] use that stored `CLEAR` with P12 to create a real Sepolia clearance and capture Graph indexing

## P15 — Gemini deployment-agent provider migration
- [x] replace the legacy provider adapter with the official `@google/genai` SDK
- [x] default to `gemini-2.5-flash` with explicit `GEMINI_MODEL` override
- [x] preserve strict host-selected function calling and the existing agent/tool/state-machine boundary
- [x] preserve Graph gating, P5 preparation, Ledger human authorization, and fail-closed errors
- [x] keep `GEMINI_API_KEY` server-side and exclude confidential CRE data from model context
- [x] update runtime configuration, README, architecture/evidence/AI documentation, and scaffold checks
- [x] add adapter regression tests for tool shape, malformed output, failure redaction, and missing credentials
- [x] run a real Gemini-backed account-agent execution against the live account/Graph configuration;
  this key required the explicit `gemini-3.5-flash` override because `gemini-2.5-flash` was unavailable

## P16 — Live CRE deployment boundary
- [x] make the existing workflow's private-registry target explicit without changing handler logic
- [x] deploy the existing `handlerInTee` workflow through the official CRE CLI with Deploy Access
- [x] record the public workflow ID, registry, status, and deployment artifact identity
- [x] send one real signed account gateway request through the documented private enterprise gateway
- [x] preserve fail-closed behavior and capture the bounded provider error without leaking request data
- [ ] provision deployed site/callback secrets and complete a live account execution
- [ ] capture live `CLEAR`, `HOLD`, and `REJECT` callback evidence after Chainlink resolves the workflow
