# ROVAULTA — Repository-wide product rename

## Outcome

Rename the product, package scopes, identifiers, paths, configuration keys, documentation, and
source references to Rovaulta while preserving the current authenticated lifecycle, confidential
evaluation boundaries, Ledger gate behavior, development fixtures, and verification harness.

## Non-goals

- No product behavior redesign or new feature work.
- No changes to evaluation, Chainlink, attestation, Ledger, release, or fixture semantics.
- No history rewrite and no removal of existing tests or evidence.

## Invariants

- Existing routes, API contracts, package boundaries, and security checks continue to work.
- Confidential policy material remains outside public projections and browser output.
- Hardware-backed approval remains the release authority; naming changes cannot grant authority.
- Development fixture access remains explicitly environment-gated.
- A repository search over tracked/source files returns no legacy brand spelling in any case.
- Existing wire artifacts remain readable through opaque compatibility values; newly emitted
  records use the Rovaulta namespace and EIP-712 identity.
- Existing environment keys and confidential secret selectors remain readable through migration
  aliases without exposing the retired spelling in source or documentation.

## Change surfaces

- Root manifests, workspace package names, environment keys, Turbo/Playwright/Next configuration.
- TypeScript imports, package scopes, identifiers, persistence paths, test fixtures, and scripts.
- Solidity contract names, deployment metadata, ABI references, and Foundry tests.
- CRE workflow configuration and integration documentation.
- Web UI copy, routes, metadata, styles, and browser tests.
- Planning, architecture, partner, compliance, evidence, README, and AI records.
- Project-local skills and instruction metadata, including file and directory names.

## Acceptance checks

- Case-insensitive repository content search finds zero matches for the former brand.
- Case-insensitive repository path search finds zero matches for the former brand.
- `bun install`/lockfile resolution remains valid without changing dependency versions.
- Existing unit, integration, contract, browser, scaffold, lint, typecheck, and build checks pass.
- Public routes and authenticated lifecycle retain their existing behavior.

## Steps
- [x] Explore
- [x] Implement smallest vertical slice
- [x] Targeted verification
- [x] Full verification
- [x] Independent review
- [x] Docs/evidence/handoff

## Parallel work / worktrees

The rename is intentionally performed in one worktree because package scopes, imports, file paths,
and generated metadata must change atomically. A separate read-only review is required before final
verification.

## Risks and rollback

The main risks are missed case variants, package-resolution drift, generated path references, and
external tooling assumptions. Use small thematic commits and revert only the affected commit if a
targeted check fails; do not rewrite published history.

## Decisions / deviations

- The root checkout directory is managed by the host and is not renamed; the repository contents,
  tracked paths, and internal references are the scope of the migration.
- Historical Git objects are not rewritten; repository searches intentionally exclude `.git`.
- Generated build/cache directories are disposable and were cleared after verification so stale
  bundles cannot be mistaken for repository source.
- Existing external CRE workflow registrations are external identities; the checked-in workflow is
  now Rovaulta-named and must be redeployed/migrated by its operator when that external identity is
  changed.

## Verification evidence

Final evidence: case-insensitive content/path scans over repository contents (excluding `.git` and
third-party dependencies) returned zero matches; targeted package tests, `bun run verify`, the
Playwright suite, and `git diff --check` passed. The independent read-only rename review was
resolved with compatibility readers for wire identities, EIP-712 domains, environment keys, and
the confidential secret selector.
