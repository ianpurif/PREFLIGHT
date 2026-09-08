# P3 — Chainlink CRE Confidential Evaluation

## Outcome

`@rovaulta/chainlink-cre` supplies a real Chainlink CRE TypeScript workflow whose HTTP-triggered handler runs through `handlerInTee`, obtains the private safety envelope and 32-byte commitment blind from CRE secrets, validates exact P1/P2 bindings, invokes the existing deterministic P2 evaluator, and releases only a versioned minimal public result or a redacted fail-closed error.

## Non-goals

- P4 registry state, onchain clearance issuance, revocation, or expiry enforcement
- P5 Ledger, EIP-712, release authorization, hardware confirmation, or deployment execution
- frontend/digital-twin work, physical robot integration, or AI verdict logic
- claiming that caller-supplied synthetic traces prove hardware, software, or model execution provenance
- replacing or reimplementing P1 canonicalization/digests or P2 evaluation semantics

## Invariants

- Confidential envelope geometry, rules, thresholds, commitment blind, and internal P2 violations never enter public output or workflow logs.
- The private envelope and blind are fetched and decoded only inside an actual `handlerInTee` callback and are load-bearing to the verdict.
- The P1 safety-envelope commitment is recomputed before evaluation; any commitment or exact site/envelope/build/robot/evaluator/scenario binding failure rejects closed.
- The existing `evaluateSimulation` implementation remains the sole verdict source.
- Public success contains only the exact evaluation bindings, verdict, explicit synthetic-input provenance, and a deterministic commitment to the supplied trace suite.
- The trace commitment proves result-to-input integrity only. It does not authenticate trace origin or physical safety.
- External errors use a fixed code set and never include thrown messages, paths, secret values, or confidential diagnostics.
- CRE compilation and simulation evidence are reported separately from local tests and from live deployment.

## Change surfaces

- `integrations/chainlink-cre/src/**`: versioned schemas, redacted adapter, confidential callback, and workflow entrypoint
- `integrations/chainlink-cre/test/**`: validation, binding, redaction, deterministic/golden, SDK-mock, and workflow-structure tests
- `integrations/chainlink-cre/{package.json,tsconfig*.json,workflow.yaml,README.md}`: workspace wiring and CRE configuration
- `integrations/chainlink-cre/scripts/**`: non-runtime fixture/evidence helpers if required by the CLI
- `scripts/verify-scaffold.mjs` and `scripts/scaffold.test.mjs`: P3-positive guards while retaining P4/P5-negative guards
- planning, architecture, security, partner, evidence, and AI-use documentation

## Acceptance checks

- The official CRE compiler consumes the actual workflow entrypoint and transitive P1/P2 source successfully.
- An HTTP public request plus a CRE secret containing the private envelope/blind reaches an SDK-created `handlerInTee` handler.
- Unsafe fixture returns `HOLD`, corrected fixture returns `CLEAR`, and tampered envelope/blind returns redacted `REJECT` before evaluation.
- Missing/malformed/unsupported public or private inputs and every security-critical binding mismatch fail closed with stable public codes.
- Public result serialization is deterministic and contains no private rule, geometry, threshold, blind, violation, error-message, or secret material.
- The wrapper result matches the unchanged P1 result produced by direct P2 evaluation for the same input.
- Bun and CRE-compatible canonical/digest golden vectors agree.
- Chainlink integration, domain, simulation, repository, Foundry, scaffold, and diff verification gates pass.
- Current CRE CLI simulation is executed when the external CLI/account is available; otherwise exact environment/authentication blockers and remaining commands are recorded without a success claim.
- Independent security and partner-compliance reviews have no unresolved valid finding.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Read-only specialists cover current SDK surface, trust-boundary design, test gaps, partner compliance, and final diff review. The primary agent owns all writes in the existing working tree; no parallel writer is authorized.

## Risks and rollback

- CRE QuickJS/WASM incompatibility: compile the real transitive source first and isolate only genuinely unsupported adapters without duplicating semantics.
- Secret leakage: construct public data from an allowlist, never log inside the confidential path, discard the internal report, and search adversarially for known private values.
- Substitution: validate all P1/P2 exact bindings and recompute both the robot build digest and private envelope commitment.
- Trace relabeling/provenance: commit the normalized supplied trace suite into the public result and document that the caller still controls synthetic trace origin; trusted remote attestation remains later work.
- Evolving SDK/CLI: pin the installed SDK and record the exact compiler/CLI versions and official commands used.
- External CRE access: preserve authenticated simulator evidence separately from private-beta deployment access and never promote simulation into a deployment claim.

Rollback is limited to the Chainlink integration, P3-positive scaffold assertions, and P3 documentation. P1/P2 semantics and all P4+ shells remain unchanged.

## Decisions / deviations

- One atomic `main`-namespace secret avoids mixed envelope/blind rotation. The 1,506-character ASCII demo secret fits the integration's explicit 2 KiB input cap; maximum-size P2 envelopes are not claimed to fit CRE Vault quotas.
- The public result omits scenario/violation counts and internal-report digests. Neither is required for exact P1 binding, and both increase confidential-rule oracle/dictionary risk.
- `rovaulta.digest.cre-behavior-input/v1` covers the normalized version, P1 request, build descriptor, entire trace suite, provenance marker, and explicit evaluation time. It prevents silent substitution but is not origin attestation.
- The official confidential guide permits any TEE, but P3 restricts the installed SDK surface to Nitro/us-west-2 and uses a request-scoped site-bound secret selector with no ordinary handler capability calls. The legacy fixed selector is retained only for old simulation payloads that omit the selector.
- CLI v1.32.0 simulation passes empty configuration to the optional pre-hook phase, so P3 follows the current official confidential TypeScript template shape without that hook. This compatibility repair does not alter the TEE handler, P1/P2 semantics, secret selector, or minimal public projection; detailed findings and violation-family summaries remain TEE-local.

## Verification evidence

- `bun --filter '@rovaulta/chainlink-cre' test`: 25 passed, 0 failed, 343 assertions
- integration source/test typecheck: passed
- SDK `cre-compile` with no skip flag: passed; non-empty WASM generated from actual P1/P2 imports
- checksum-verified official CRE CLI v1.32.0 authenticated `workflow simulate`: all three runs passed using CLI-reported simulation binary hash `8d8bff9fdfaf67a8db7b2fa81ea46fa351b5e8f6914b2b6ebe21e2ad4310c315` and workflow config hash `4cda450a9d236d49ccd0e3f01285ba26b15c16b0202d35c091c076b6095a3e12`
- the captured runtime commitment blind was generated fresh into ignored local env files and is distinct from the source-visible P2 test blind; the demo envelope itself remains synthetic source-visible test data
- unsafe returned `EVALUATED/HOLD`, corrected returned `EVALUATED/CLEAR`, and tampered blind returned `REJECT/CONFIDENTIAL_EVALUATION_REJECTED`; all exited `0`
- raw output checks found neither exact secret values nor confidential field/rule/geometry/threshold/blind markers; see the linked compliance evidence artifact
- repository lint, typecheck, tests, builds, Foundry command, scaffold verification, `bun run verify`, and `git diff --check`: passed
- independent read-only review completed; its test-depth and evidence-wording findings were resolved, with no remaining critical/high defect
