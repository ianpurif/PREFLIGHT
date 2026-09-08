# P8 — Real product lifecycle and account isolation

## Outcome

Replace the demo-only normal application path with an account-scoped Preflight product:
authenticated users create a site and private safety policy, register a robot and exact build
declaration,
run the existing deterministic evaluator through the API, inspect the public result, and prepare a
truthful release handoff. P7 fixtures remain available only through an explicit development/test
surface.

## Non-goals

- No new evaluator semantics, CRE workflow, contract authority, Ledger signer, robot activation, or
  AI decision authority.
- No confidential envelope, blind, restricted geometry, rules, credentials, or internal evaluator
  report in browser responses, logs, or normal UI routes.
- No fabricated clearance, onchain attestation, signature, authorization, or deployment result.
- No third-party auth/database dependency unless the existing runtime cannot safely provide the
  required local persistence.

## Invariants

- P2 remains the sole deterministic `HOLD`/`CLEAR` authority.
- Every protected resource query is scoped by the authenticated session's account id; frontend
  account ids are never trusted.
- Cookie-authenticated mutations reject an untrusted `Origin`/`Referer`; legacy P5/P5.2 routes
  require the account session whenever the application store is configured (the explicit fixture
  flag is the only non-production exception).
- Site policy is encrypted at rest and decrypted only inside the API evaluation boundary.
- A release proposal reuses the existing P5/P5.2 authority and stops truthfully when provider,
  registry, or Ledger configuration is unavailable.
- P7 fixtures are test/development inputs, never the normal product's data source.

## Change surfaces

- `apps/api/src/application/*` (SQLite persistence, password/session handling, encrypted policy
  storage, account-scoped resource routes).
- `apps/api/src/server.ts` and `src/index.ts` (auth/session hooks, CORS credentials, real resource
  and evaluation endpoints, release handoff integration).
- `apps/web/src/app/*` (account creation/sign-in, authenticated shell, real onboarding/forms,
  persisted build/evaluation/release views, fixture-only route boundary).
- Critical API and Playwright tests for authentication, isolation, lifecycle, and fixture gating.
- Architecture, planning, AI usage, README, and current-state documentation.

## Acceptance checks

- Anonymous users can only see landing/auth pages; `/app/*` redirects to sign-in without a session.
- Registration creates a durable account and an HTTP-only session; sign-in/sign-out/me work and
  passwords are never stored or returned in plaintext.
- Two accounts cannot read, mutate, evaluate, or prepare releases for one another's site, robot,
  build, evaluation, or release records.
- Onboarding creates a real site with a constrained private policy, robot, and exact build record;
  the artifact digest is a caller-supplied identity and the declared route is the simulation input,
  not binary provenance. The API returns only public metadata and commitments.
- Evaluation calls `evaluateSimulation` server-side with the decrypted policy and returns only the
  public result projection. Unsafe and corrected user-created build declarations produce the
  evaluator's deterministic verdicts; malformed bindings fail closed. The product does not claim
  to inspect or verify artifact bytes.
- Release preparation never reports human authorization without the existing P5 boundary returning
  a validated prepared request.
- Normal `/app/evaluate` has no deterministic fixture selector. Fixture scenarios are explicit,
  gated, and covered by existing regression tests only.
- API tests, web critical tests, full lint/typecheck/test/build/verify, and diff checks pass.

## Dependency order

1. Add and test the local persistence/auth/encryption store.
2. Add authenticated, account-scoped API routes and server-side evaluation projection.
3. Add web auth and real onboarding/application data clients.
4. Replace normal static views with persisted lifecycle views and make fixture routes explicit.
5. Add isolation/regression tests, update docs/evidence, and run the verification loop.

## Micro-commits

- `docs(p8): plan real product lifecycle`
- `feat(p8): add account and session persistence`
- `feat(p8): add account-scoped resource API`
- `feat(p8): evaluate persisted builds inside the API boundary`
- `feat(p8): add real account entry screens`
- `feat(p8): add persisted onboarding flow`
- `feat(p8): connect real build and evaluation views`
- `feat(p8): connect release preparation boundary`
- `fix(p8): isolate deterministic fixture routes`
- `test(p8): cover lifecycle and account isolation`
- `docs(p8): document real product boundaries`

## Risks and rollback

- Risk: replacing demo routes breaks P6/P7 regression automation. Mitigation: add an explicit
  development/test fixture route and point only regression tests at it.
- Risk: policy data leaks through serialization or logging. Mitigation: narrow encrypted store API,
  public projection types, redacted logs, and negative response tests.
- Risk: local SQLite is unsuitable for multi-instance production. Mitigation: document it as the
  current local/single-instance persistence boundary and keep the store interface replaceable; do
  not pretend it is a managed production database.
- Rollback: every lifecycle surface is committed independently; reverting the surface does not
  modify P1–P5.2 authority code.

## Status

- [x] Plan and boundaries
- [x] Persistence/auth store
- [x] Account-scoped API and evaluation boundary
- [x] Real authenticated web lifecycle
- [x] Fixture isolation and critical tests
- [x] Documentation and full verification

## Implemented boundary notes

- The local product store is intentionally single-node Bun SQLite. It persists account, session,
  site, robot, build, evaluation, and release-attempt records and is replaceable through the
  application-store boundary; it is not presented as a managed production database.
- Passwords are scrypt-hashed. Sessions are opaque HTTP-only cookies with only a SHA-256 token hash
  persisted. The site policy envelope and blinding secret are AES-256-GCM encrypted at rest and
  never included in public API projections.
- Normal `/app/*` pages require an authenticated API session. P7's deterministic fixture is gated
  behind `PREFLIGHT_ENABLE_DEMO_ROUTES=true` and `/dev-fixtures/evaluate`; it is not a source of
  account data.
- Evaluation uses the existing `@preflight/simulation-core` authority inside the API and stores a
  public projection over the registered route declaration; it does not inspect binary artifact
  bytes or claim external provenance. Release preparation delegates to the existing P5/P5.2
  boundary and records a blocked attempt when a public P4 clearance or live release gate is
  unavailable. An operator may paste a public P4 clearance for the exact evaluation to reach the
  existing Ledger handoff; the product never creates that clearance. Before delegation,
  the API cross-checks the supplied public clearance against the stored evaluation's exact site,
  robot, build digest, safety-envelope id/commitment, evaluator version, evaluation id, and
  evaluation-input digest.
