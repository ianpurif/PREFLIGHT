# P10 Final Partner Qualification Audit

**Date:** 2026-09-09
**Label:** implementation and local verification; no live partner execution is claimed.

This artifact records the smallest qualification map after P10. External credentials, hosted
subgraph deployment, event-start eligibility, and physical hardware are not inferred from local
tests.

## Chainlink — Best Confidential Workflow

| Requirement | Status | Evidence | Missing / smallest next step |
|---|---|---|---|
| CRE workflow uses `handlerInTee` | PASS | `integrations/chainlink-cre/src/workflow.ts`; P3 authenticated CLI evidence | None in code; live deployment remains optional because simulation is accepted. |
| Sensitive input is processed inside the TEE | PASS | `confidential-evaluation.ts` fetches the site-bound envelope/blind with `getSecret` and invokes P2; redaction tests | Provision the request-scoped site secret in the deployed CRE namespace. |
| Confidential path is core, not a placeholder | PASS | Normal `/evaluations` uses `CreHttpEvaluationClient` and has no local fallback; P10 pending callback completes the same account record | Run the configured account path once with real operator configuration. |
| Public output excludes private envelope/blind/rules/diagnostics | PASS | Minimal P1 result allowlist, callback protocol, leakage tests | None in code. |
| Successful simulation evidence | PASS | `chainlink-cre-p3-authenticated-simulation-2026-09-06.md`: unsafe `HOLD`, corrected `CLEAR`, tampered `REJECT` | None for simulation qualification; this is not a live DON claim. |
| Account-created completed CRE result | BLOCKED | Code path is implemented and tested with an asynchronous callback | No gateway/workflow ID/trigger key/site secret/callback deployment in this environment; capture one real account execution. |

## The Graph — Best AI Tooling or AI Use Case with The Graph

| Requirement | Status | Evidence | Missing / smallest next step |
|---|---|---|---|
| Start Fresh / net-new eligibility | BLOCKED | First repository commit is 2026-09-05; official event-start boundary and submitted pool are not independently verified | Document pre-existing work and choose Start Fresh or Continuity honestly. |
| Live Graph-provider data | BLOCKED | `apps/api/src/graph/provider.ts` uses the official Gateway URL and fails closed without config | Deploy the minimal Sepolia subgraph, configure API key/subgraph ID, and capture a real response. |
| Subgraph usage | PARTIAL | `integrations/the-graph/subgraph` schema/manifest/ABI/mapping indexes public `RovaultaRegistry` events | Hosted deployment/indexing evidence remains missing. |
| Meaningful reasoning/decision | PARTIAL | `getGraphContext` is a required account-agent step; only `MATCHED` reaches P5 preparation | Capture live `MATCHED` context in the demo. |
| Load-bearing normal flow | PARTIAL | Authenticated account resolver and Graph gate are wired; fixture catalog is dev-only | Complete one account-created evaluation → public registry event → Graph `MATCHED` → Ledger-required run. |
| Public demo/README evidence | PARTIAL | Partner docs and README explain the query and public-only fields | Add live query output and the exact event-to-decision trace to submission assets. |

## Ledger — AI Agents x Ledger

| Requirement | Status | Evidence | Missing / smallest next step |
|---|---|---|---|
| Device-backed human authorization is central | PASS (software) | P5 DMK/WebHID/Speculos adapter, exact EIP-712 intent, P5.2 agent stops at `LEDGER_APPROVAL_REQUIRED` | Capture the supported official/physical device flow if the selected prize pool requires it. |
| Agent cannot sign, bypass, or authorize | PASS | No signing/consume/registry-write tool; only exact stored P5 consume result can become `AUTHORIZED`; adversarial tests | None in code. |
| Ledger SDK/DMK integration | PASS (software) | Pinned DMK, Ethereum signer kit, WebHID, Speculos, Context Module packages and tests | Official origin token/descriptor evidence remains absent. |
| Speculos evidence | PARTIAL | Official Speculos transport/app/address smoke and partial evidence | A/B/E/F Clear Signing cases remain unrun. |
| Physical-device evidence | BLOCKED | No physical device, approval, refusal, or signature captured | Requires legitimate hardware and origin/descriptor access. |
| Start-during-event eligibility | BLOCKED | Repository date is known, event-start proof/track selection is not | Document continuity/start-fresh status before submission. |

## Local verification boundary

P10 local evidence covers protocol parsing, canonical serialization, TEE callback leakage, API
pending state, HMAC authentication, exact bindings, idempotency, and browser pending polling. It does
not substitute for live CRE, live Graph, external OpenAI, or Ledger hardware evidence.
