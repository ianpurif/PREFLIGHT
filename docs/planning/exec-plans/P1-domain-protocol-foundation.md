# P1 — Domain + Protocol Foundation

## Outcome

`@rovaulta/domain` provides the versioned, runtime-validated protocol vocabulary that P2–P8 can consume: typed identifiers, exact-binding schemas, canonical serialization, deterministic SHA-256 digests, and explicit protocol failures.

## Non-goals

- simulator or safety-rule evaluation
- Chainlink CRE or confidential-handler implementation
- Solidity registry/state logic
- Ledger transport, EIP-712 signing, or release authorization
- API/UI flows, AI agents, or additional partners

## Invariants

- A clearance binds exact site, robot, build digest, safety-envelope commitment, evaluator version, verdict, evaluation, and expiry.
- A deployment intent repeats its site/robot/build/clearance bindings and commits to the exact clearance digest; signer authorization remains deferred.
- Protocol objects never imply physical safety.
- Canonicalization accepts only an explicit JSON-compatible subset and fails closed on ambiguous values.
- Digest framing is versioned and domain-separated; SHA-256 output types are not interchangeable across protocol purposes.
- The domain package remains independent of web, server, partner, rendering, and environment APIs.

## Change surfaces

- `packages/domain/src/**`: identifiers, schemas, validation, canonicalization, digests, binding assertions, public exports
- `packages/domain/test/**`: deterministic, mutation, malformed-input, version, expiry, and binding tests
- `packages/domain/package.json` / lockfile: portable SHA-256 dependency and real test script
- `docs/architecture/**`: concrete canonical protocol and authorization-intent decisions
- `docs/planning/**`, `docs/security/**`, `docs/compliance/**`, `docs/ai/**`: state, evidence, risks, and handoff

## Acceptance checks

- Every requested identifier is a separately branded, prefix-validated type.
- Every requested schema has exact-key runtime parsing and a supported schema-version literal.
- Canonical serialization is insertion-order independent, UTF-8 framed, recursively deterministic, and rejects undefined, holes, non-plain objects, non-safe integers, non-canonical Unicode, and cycles.
- Robot build, envelope commitment, evaluation input, clearance, and deployment-intent digests use versioned domain separation and SHA-256.
- Meaningful field mutations change digests; unsupported schema versions and malformed/missing bindings fail explicitly.
- Evaluation/result, result/clearance, and clearance/deployment bindings can be checked without implementing later execution logic.
- Domain tests, repository tests, lint, typecheck, applicable builds, scaffold verification, and aggregate verification are run and reported truthfully.
- An independent adversarial review has no unresolved valid findings.

## Steps

- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

Read-only specialist agents may audit protocol shape, test coverage, and the final diff. All writes remain owned by the primary agent in the existing working tree; no parallel write work is authorized.

## Risks and rollback

- Cross-runtime hash differences: use a pure TypeScript SHA-256 implementation already compatible with the CRE dependency graph and add golden vectors.
- Accidental type interchange: use distinct identifier/digest brands plus runtime prefixes/formats.
- Ambiguous canonical values: reject rather than coerce unsupported values.
- Replay-enabling omissions: require nonce/expiry and exact clearance/site/robot/build bindings in deployment intents, while deferring signer verification.
- Downstream placeholder breakage: preserve compatibility exports where they remain semantically sound and run the full monorepo typecheck/build.

Rollback is limited to the P1 domain modules/tests and their corresponding protocol/planning documentation; no later-phase state is introduced.

## Decisions / deviations

- Protocol objects use exact string schema literals and reject unknown fields.
- Identifier values combine runtime type prefixes with distinct compile-time brands.
- Digest preimages are canonical structural frames with a global protocol version and distinct versioned domains.
- Safety-envelope commitments include a secret 32-byte blind; plain low-entropy rule hashes are not treated as confidentiality-preserving.
- Protocol time uses bounded canonical decimal Unix-second strings. Parsers never read the wall clock.
- Clearance records require verdict `CLEAR`. P4 decides live expiry/revocation validity; P5 decides signer authorization, EIP-712 mapping, and nonce consumption.
- `@noble/hashes` 2.2.0 is a direct domain dependency because portable synchronous SHA-256 removes a substantial custom-cryptography implementation; CRE runtime proof remains P3.
- Adversarial review found mutable exported constants, an internally inconsistent clearance-digest path, a public generic branding helper, and missing Unicode byte vectors. All four were fixed and covered by negative/golden tests before final verification.

## Verification evidence

- `bun test` in `packages/domain`: 30 passed, 0 failed, 676 assertions.
- `bun run typecheck` in `packages/domain`: passed.
- `bun run build` in `packages/domain`: passed.
- Root `bun run lint`: passed, 50 files checked.
- Root `bun run typecheck`: 7/7 Turbo tasks passed.
- Root `bun run test`: 9/9 Turbo tasks passed.
- Root `bun run build`: 7/7 Turbo tasks passed, including the Next.js production build.
- `bun run contracts:test`: passed with Foundry 1.8.1; no contract tests exist before P4.
- `bun run verify:scaffold`: passed, including 3/3 scaffold tests.
- `bun run verify`: passed end to end.
- Independent protocol/adversarial and partner-compliance reviews: all P1 findings resolved; no P1-blocking finding remains.
