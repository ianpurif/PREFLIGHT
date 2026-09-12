# P19 — Final Partner Qualification Audit

## Outcome

Produce an evidence-backed qualification matrix for Rovaulta's Chainlink Best Confidential Workflow, The Graph Best AI Tooling or AI Use Case with The Graph, and Ledger AI Agents x Ledger submissions. Reproduce the critical local/live paths where the environment permits and record only claims supported by code or redacted evidence.

## Non-goals

- No new partner features or architecture redesign.
- No live CRE/DON deployment, Graph Gateway/Substreams work, Key Ring work, or physical Ledger work.
- No fabricated accounts, evaluations, clearances, executions, signatures, or evidence.
- No confidential values, credentials, API keys, private keys, or safety-envelope contents in logs or committed artifacts.

## Invariants

- Confidential evaluation inputs and intermediate values remain inside the CRE confidential boundary.
- Deterministic safety evaluation, not an LLM, determines clearance.
- Clearance binds the exact site, robot, build, envelope commitment, evaluator version, verdict, and expiry.
- The deployment agent can prepare an intent but cannot authorize or sign it.
- Graph data used by the agent is live and load-bearing for the deployment decision.
- Normal product routes use account-scoped persisted data; fixtures remain explicit evidence/demo paths only.

## Change surfaces

- Read-only first: official partner requirements, Chainlink workflow/evidence, The Graph integration/evidence, Ledger gate/Speculos evidence, normal application flow, environment templates, and verification scripts.
- Potential edits only if a concrete qualification gap is found: documentation/evidence or the smallest production configuration/test fix.

## Acceptance checks

- Official current partner requirements are cited and mapped to repository evidence.
- Chainlink, Graph, and Ledger critical paths are reproduced or explicitly classified as externally blocked.
- Environment audit reports presence/configuration without exposing secret values.
- Targeted tests plus lint, typecheck, build, scaffold verification, and `bun run verify` are run where the environment supports them.
- A separate read-only review inspects the findings; unresolved gaps are documented rather than hand-waved.
- Working tree remains clean unless a justified, reviewed documentation/configuration fix is made.

## Steps

- [x] Explore repository instructions and current planning/evidence docs.
- [x] Research current official bounty and partner requirements.
- [x] Reproduce the available normal product, CRE, Graph, Gemini, and Ledger/Speculos paths;
  classify unavailable replay states without fabricating data.
- [x] Audit environment/configuration without exposing secrets.
- [x] Implement only a justified minimal fix, if one is required for qualification.
- [x] Run targeted and full verification.
- [x] Perform independent review and resolve or document findings.
- [x] Update evidence/docs and prepare the final matrix.

## Parallel work / worktrees

Independent read-only Chainlink, Graph, and Ledger reviews may run in parallel. The primary agent owns all decisions, any edits, verification, and the final report.

## Risks and rollback

- External partner access, credentials, or hardware may prevent live reproduction. Classify the dependency and preserve fail-closed behavior.
- Any documentation/configuration-only fix must be small and revertible; no product behavior is changed for presentation.

## Decisions / deviations

Record any qualification classification that differs from existing docs, with the exact source and rationale.

- The Graph's two-to-four-minute public demo is a mandatory external submission artifact, not an
  optional item. The earlier `CURRENT.md` wording was corrected; the repository does not fabricate or
  claim a video that has not been recorded.
- The selected Graph Studio provider is valid live evidence for the base prize path. Gateway
  publication and Substreams are separate options/challenges and were not treated as mandatory.
- The accepted Chainlink evidence now includes a fresh authenticated v1.33.0 CLI simulation. The
  initial WSL compiler-shim failure was repaired by reinstalling the committed lockfile; no workflow
  or confidential-boundary change was needed.
- Ledger qualification remains partial/blocked at the approval/signature evidence boundary. No
  physical device, Clear Signing signature, origin token, or accepted descriptor is claimed.

## Verification evidence

- `bun --filter '@rovaulta/chainlink-cre' test`: 32 pass, 0 fail.
- `bun --filter '@rovaulta/ledger-gate' test`: 18 pass, 0 fail.
- `bun run test`: 12 workspaces successful; API 90 pass/2 skipped/0 fail.
- `bun run test:e2e`: 11 pass after updating the stale P8 gateway-unavailable assertion to the
   bounded current error message.
- `bun run lint`, `bun run typecheck`, `bun run build`, `bun run contracts:test`,
   `bun run verify:scaffold`, and `bun run verify`: pass (Biome reports existing CSS
   `noDescendingSpecificity` warnings only).
- `bun run --cwd integrations/the-graph evidence:live` against the public Studio endpoint and the
   committed clearance digest: `FOUND`; the API `TheGraphClearanceReader` independently returned
   `MATCHED` with exact public bindings.
- The official CRE v1.33.0 CLI is authenticated in WSL. A Windows-generated compiler shim initially
   caused `cre-compile: command not found`; reinstalling the committed lockfile in WSL restored the
   official compiler. The fresh simulation then passed unsafe `HOLD`, corrected `CLEAR`, and
   tampered-commitment `REJECT`, with redacted evidence committed separately.
- Current Speculos executable/origin token/accepted descriptor are unavailable; committed smoke and
   pre-sign evidence remains partial and no signature or physical-device proof is claimed.
- Runtime `.env` inspection never printed values. The public `THE_GRAPH_STUDIO_QUERY_URL` is
   configured locally; gateway remains the default and simulation remains an explicit operator mode.

Never paste secrets or confidential payloads into this plan or evidence.
