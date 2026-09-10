# P15 — Gemini deployment-agent provider migration

## Outcome

Replace the deployment agent's legacy Responses adapter with the official Google Gen AI
(`@google/genai`) SDK using Gemini 2.5 Flash by default, while preserving the existing
host-owned tool state machine, The Graph gate, P5 preparation boundary, and Ledger human
authorization boundary.

## Non-goals

- No changes to the agent catalog, state machine, tools, Graph reader, CRE workflow, Ledger
  adapter, release service, contract, or frontend behavior.
- No model authority over safety, clearance, signing, registry writes, or authorization.
- No confidential site policy, envelope, blind, CRE payload, credentials, or private evaluator
  output sent to Gemini.
- No provider fallback, mock execution, or credential exposure to the browser.

## Invariants

- The server constructs and sends only the existing canonical public deployment request and public
  tool observations.
- Gemini can request only the one host-selected function for the current turn; the host validates
  name and arguments before the deterministic state machine proceeds.
- Missing or rejected Gemini configuration fails closed with the existing provider error boundary.
- `LEDGER_APPROVAL_REQUIRED` remains the successful pre-signing handoff; only P5 can produce
  `AUTHORIZED`.

## Change surfaces and order

1. Install the official `@google/genai` dependency and inspect its current function-calling types.
2. Replace the provider adapter/module name and environment wiring without changing
   `DeploymentAgentModel` or tool contracts.
3. Replace provider adapter tests with SDK-client-injected tests covering strict tool selection,
   malformed output, failure redaction, missing configuration, and secret non-disclosure.
4. Update `.env.example`, API/README/planning/decision/evidence wording, and AI usage record.
5. Run targeted tests, API typecheck/build, full verification gates, and the real account-agent
   command when Gemini credentials and existing public Graph/P5 configuration are available.

## Acceptance checks

- Runtime imports only `@google/genai`; no legacy provider key/model is read by the agent or API startup.
- Default documented model is `gemini-2.5-flash`; `GEMINI_MODEL` remains explicit and server-only.
- Gemini requests contain one declared function and force the host-selected function; returned
  function calls are translated to the unchanged `DeploymentAgentToolCall` shape. Malformed SDK
  responses and provider failures map to the existing redacted `PROVIDER_FAILED` boundary.
- Tests prove no API key or confidential fields enter the request body or public audit.
- Agent tests, API typecheck/build, repository lint/test/build, and verification are run and their
  environment limitations are reported honestly.

## Risks and blockers

- Google SDK response/type shapes can change; pin the installed version in the workspace lockfile
  and test the exact response parser.
- A real external execution still requires a valid `GEMINI_API_KEY`, public Graph configuration,
  Sepolia RPC, and the existing account/clearance fixture. Missing any of these must remain a
  truthful fail-closed result.

## Verification evidence

- `@google/genai` is pinned at `2.21.0` in `apps/api/package.json` and `bun.lock`.
- `bun test apps/api/test/gemini-model.test.ts` passes all four adapter tests (19 assertions).
- Direct Biome validation and `node scripts/verify-scaffold.mjs` pass. Running the scaffold test
  file directly with Node passes all four tests.
- The repository package wrappers cannot complete on this checkout because the Windows
  `node_modules` tree has broken workspace links (`typescript`, `viem`, `@biomejs/biome`, and
  `turbo` resolve to missing paths). WSL is also unavailable in this environment.
- A real Gemini-backed agent run is intentionally not claimed: `.env` has no `GEMINI_API_KEY`, and
  the live account-agent command fails before provider construction when the broken install cannot
  resolve `viem`. No credential or fabricated provider result was used.
