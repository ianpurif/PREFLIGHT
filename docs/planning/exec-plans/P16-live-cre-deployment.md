# P16 — Live CRE Confidential Workflow Deployment

## Outcome

Deploy the existing Rovaulta confidential evaluation workflow to the authenticated Chainlink CRE
private registry, activate its HTTP trigger, provision only the declared site-bound and callback
secrets through the official Vault flow, and exercise the normal account evaluation gateway path.
Capture truthful public evidence for deployment identity, live execution, callback validation, and
the resulting account-owned verdicts. Keep the authenticated official CLI simulation as a separate
working qualification path.

## Non-goals

- No second workflow, new safety evaluator, protocol redesign, P4/P5/Ledger change, or Graph change.
- No live DON claim from a local simulation, manual callback, direct database write, or fabricated
  evaluation/clearance.
- No public logging or evidence of site policy, envelope, blind, Vault value, API key, private key,
  callback secret, or confidential intermediate.
- No onchain Ethereum-mainnet workflow registry deployment; use the available private registry unless
  the authenticated CRE account explicitly requires a different target.

## Invariants

- The deployed source continues to use `handlerInTee` and the exact site selector; private values are
  fetched and evaluated only inside the Nitro TEE.
- The public response contains only the versioned Rovaulta result and exact request bindings.
- The API accepts a live result only through the existing canonical HMAC callback, account ownership,
  behavior digest, execution/provenance, expiry, and P1 binding checks.
- Gateway mode remains fail-closed when workflow, signer, callback, or endpoint configuration is
  missing; simulation mode remains explicit and unaffected.
- A `CLEAR` evaluation remains distinct from a P12 clearance and a Ledger authorization.

## Change surfaces and dependency order

1. Confirm current CLI, account access, registry, target, workflow, secrets manifest, and callback
   reachability without exposing values.
2. Make the minimal deployment configuration explicit (`private` registry and a real authorized
   trigger address supplied through an operator-only deployment configuration path).
3. Build and deploy the unchanged workflow; activate it and record the workflow ID/status.
4. Upload the exact site-bound confidential input and callback HMAC through `cre secrets create`,
   using temporary local material and redacted output only.
5. Configure the API gateway client and externally reachable HTTPS callback, then run the normal
   account evaluation path for safe/unsafe/tampered inputs as supported by the deployed trigger.
6. Capture redacted live evidence, update Chainlink/planning/verification documents, and rerun the
   official three-case CLI simulation.

## Acceptance checks

- `cre workflow deploy` succeeds against the configured private registry and returns a real workflow
  identity; `cre workflow get` reports a healthy active deployment.
- `cre secrets create` stores the declared site selector and callback key in the `main` namespace;
  values never enter git, terminal evidence, or committed artifacts.
- A real `workflows.execute` request reaches the deployed HTTP trigger with the authorized signer,
  and the workflow executes `handlerInTee` using the site-bound secret.
- The existing API callback accepts only the signed minimal result and persists the account-owned
  evaluation; malformed, replayed, mis-bound, or unsigned callbacks remain rejected.
- Safe, unsafe, and tampered cases produce only their protocol-level public outcomes when the live
  path supports each case; no confidential payload is observable outside the TEE.
- Simulation still returns `HOLD`, `CLEAR`, and `REJECT` after deployment work.

## Risks and blockers

- Deploy Access does not imply Confidential Workflows/Vault access; an explicit Chainlink permission
  error is an external blocker and must be reported verbatim but redacted.
- The private registry requires an externally reachable HTTPS callback for asynchronous completion;
  localhost or an unconfigured tunnel cannot be treated as live evidence.
- The current target may not have a public callback URL or trigger signer configured. Do not create a
  bypass; stop at the exact missing configuration.
- A failed deployment or secret upload must not be retried with changed bindings or a different
  authority key without recording the reason and preserving the fail-closed path.

## Steps

- [x] Verify current deployment prerequisites and target registry.
- [x] Add explicit private-registry deployment configuration without changing workflow logic.
- [x] Build/deploy/activate the existing workflow and capture public identity.
- [ ] Provision declared Vault secrets through the official CLI.
- [x] Exercise the live account gateway boundary and capture its external blocker.
- [x] Capture redacted evidence and update docs/status.
- [x] Run simulation, targeted tests, full verification, and `git diff --check`; a fresh
  authenticated CLI rerun produced unsafe `HOLD`, corrected `CLEAR`, and tampered `REJECT`.
- [x] Complete an independent read-only partner/security review; no high-severity finding or
  secret-leakage/false-live-claim issue was identified. The reviewer noted only that bounded
  provider error text is intentionally surfaced to API clients.

## Verification evidence

Evidence will be added only after the official deployment/trigger commands complete. Any external
permission, network, callback, or credential limitation will remain explicitly `BLOCKED`; it will not
be converted into a simulated success.

## Current findings — 2026-09-11

- CRE CLI v1.32.0 reported Deploy Access enabled and the private registry available.
- The existing workflow deployed successfully as `ACTIVE` with workflow ID
  `0034106c2d141e81f34ae5b3cf7f71e133137e2dc1ff1d042ffdda86f34d2144`.
- The normal signed request reached `https://01.enterprise-gateway.zone-a.cre.chain.link/` but
  returned HTTP 400 / JSON-RPC `-32600` (`Workflow not found`) before an execution was created.
- `cre execution list` returned no execution. Vault secret provisioning could not be completed
  because the official private-registry browser authorization requires an interactive Chainlink
  sign-in; no secret was uploaded and no confidential value was printed or committed.
- Deployment evidence is recorded in
  `docs/compliance/evidence/chainlink-cre-p16-live-deployment-2026-09-11.md`. The remaining
  dependency is Chainlink-side workflow visibility/Confidential Workflow access plus interactive
  Vault authorization; no local bypass is appropriate.
- A fresh authenticated `bun run --cwd apps/api evidence:cre-simulation` run completed all three
  existing cases with public `HOLD`, `CLEAR`, and `REJECT` results. It remains simulation evidence,
  not live execution evidence.

### Follow-up identity and gateway verification — 2026-09-11

- CRE CLI v1.33.0 `workflow list`/`workflow get` still report the deployed workflow as `ACTIVE` in
  the private registry with the exact recorded ID; the UI also reports zero executions.
- `cre workflow hash` with the tracked staging config reproduced binary hash
  `e3b7053930fc7f38b7214e503c4bc411c27f1e7b50d98d93651193c59bb8004e`, config hash
  `1977468021a54d7aba103f15adfb1873479a60acaa4bb84e3830249162e92478`, and the deployed workflow
  ID. The public signer derived from the ignored trigger key matches the deployed authorized key.
- An independent minimal signed `workflows.execute` request to the private enterprise gateway
  returned the same HTTP 400 / JSON-RPC `-32600` workflow lookup error; no `ACCEPTED` response or
  execution identifier was created. This rules out local ID/target/config/signer drift as the cause.
- The tracked staging config now matches the active deployment. No redeploy was made because the
  failure occurs before execution. The current Vault selector and the HTTPS result callback remain
  separate post-acceptance prerequisites; no secret or callback value was exposed.

### Independent official trigger probe — 2026-09-12

- A direct v1.33.0 request, built outside the Rovaulta API with the official JSON-RPC/JWT format,
  used the documented private enterprise gateway and a schema-valid public corrected fixture.
- The derived signer matched the deployed `authorizedEvmAddress`, but the gateway returned HTTP 400 /
  JSON-RPC `-32600` (`Workflow not found`) and no execution ID.
- `cre execution list` remained empty. This is a reproduced Chainlink private execution-plane/
  registry-visibility blocker, not a Rovaulta request-construction failure. No callback or manual
  execution was attempted.

## Verification run — 2026-09-11

- Targeted API gateway diagnostics: 7 tests passed.
- Chainlink CRE package: 32 tests passed; typecheck passed after repairing the local Windows
  workspace link to the root TypeScript toolchain.
- Domain and simulation-core suites: 91 tests passed.
- Full repository tests: 12 tasks passed (all package tests green).
- `bun run lint`: passed with the repository's existing CSS specificity warnings.
- `bun run typecheck`, `bun run build`, `bun run contracts:test`, and `bun run verify:scaffold`:
  passed.
- `bun run verify`: passed.
- `git diff --check`: passed.
- A fresh official simulation rerun completed with public `HOLD`, `CLEAR`, and `REJECT` results;
  no confidential value or raw CLI output was captured.
- The current tracked configuration was hash-checked after alignment, and a post-alignment
  authenticated CRE CLI v1.33.0 rerun completed with public `HOLD`, `CLEAR`, and `REJECT` results;
  no confidential value or raw CLI output was captured. The ignored redacted artifact is
  `.data/cre-simulation/20260911154644464-6a5140c7/evidence.json`.
