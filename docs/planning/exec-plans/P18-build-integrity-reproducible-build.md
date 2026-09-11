# P18 — Optional Build Integrity / reproducible source builds

## Outcome

Add an opt-in `Build From Source` path beside the existing build-number/version flow. The source
path validates an HTTPS repository and exact commit, materializes only that snapshot, runs a Bun
or Node build inside an isolated Docker BuildKit/buildx build, hashes the actual exported artifact,
records bounded SLSA/in-toto-shaped provenance, and then sends the resulting artifact-backed build
through the unchanged confidential evaluation and release boundaries.

`Use Existing Build` remains the default-compatible path. Existing v1 robot-build descriptors,
historical rows, evaluations, clearances, and Ledger intents remain valid and are not migrated or
reinterpreted.

## Non-goals

- No CI platform, queueing service, artifact registry, deployment runtime, or robot activation.
- No replacement for the existing display version/build-number field.
- No automatic clearance issuance, Ledger signing, or change to Chainlink CRE safety semantics.
- No claim that a reproducible build proves physical robot safety or that synthetic traces came from
  the built artifact.
- No Earthly, Dagger, Nix, Bazel, Cosign, or custom container/build engine.
- No automatic fallback from a failed/blocked source build to a user-supplied artifact digest.

## Research and decision

The current official material was checked before implementation:

| Option | Finding | Decision |
|---|---|---|
| [Docker BuildKit/buildx](https://docs.docker.com/build/buildkit/) | Mature builder backend with container execution, local/tar outputs, resource controls, and [BuildKit-generated SLSA/in-toto attestations](https://docs.docker.com/build/metadata/attestations/slsa-provenance/). | Chosen foundation; Rovaulta owns orchestration, identity, storage, and evaluation binding. |
| [Earthly](https://github.com/earthly/earthly/blob/main/README.md) | The official `earthly/earthly` repository README now says Earthly is no longer actively maintained. | Rejected despite convenient repeatable-build syntax. |
| [Dagger](https://docs.dagger.io/getting-started/introduction/) | Programmable, cached container pipelines built on a container runtime; adds an SDK/module/runtime layer that this MVP does not need. | Rejected as unnecessary abstraction. |
| [Nix](https://nix.dev/manual/nix) | Strong reproducibility model and diff tooling, but introduces a second package/build ecosystem and project-specific Nix expressions. | Rejected for Bun/Node-first MVP. |
| [SLSA/in-toto](https://slsa.dev/spec/v1.2/provenance) | SLSA provenance is the standard model for linking an artifact to source, build definition, builder, dependencies, and run metadata; [in-toto Statements](https://in-toto.io/docs/specs/) provide the envelope. | Adopt the standard statement/predicate concepts; do not invent a competing attestation format. |

The selected foundation is Docker BuildKit/buildx plus a small Rovaulta Build Runner. BuildKit
executes untrusted source in a containerized build boundary; the runner validates inputs, prepares a
source snapshot, applies limits/timeouts/network policy, hashes the exported artifact, and produces
the canonical public evidence projection.

## Invariants

- Existing `POST /sites/:siteId/builds` and its v1 descriptor/digest semantics remain unchanged.
- A source build accepts no authoritative artifact digest from the caller.
- Source revision is an exact commit, and the source snapshot digest is computed from that commit's
  tracked files before BuildKit receives the context.
- Bun builds require the repository's `bun.lock` or `bun.lockb` and run
  `bun install --frozen-lockfile --ignore-scripts` before the requested build command. Node builds
  require `package-lock.json` and run `npm ci --ignore-scripts`.
- Install/build code never runs directly on the Rovaulta API host; no host filesystem, `.env`, CRE
  secret, Ledger key, or private safety policy is mounted into the build.
- Dependency installation defaults to `--network=none`; enabling `default` is an explicit operator
  choice that requires a dedicated BuildKit daemon with package-registry/proxy egress controls.
- Runtime, Dockerfile frontend, and BuildKit images are resolved to immutable digests; each build
  uses a fresh named builder, `--no-cache`, bounded source entry/byte limits, bounded in-process
  concurrency, and a re-read/hash of the promoted artifact.
- Build failure, timeout, missing lockfile, sandbox failure, or artifact/digest failure is a distinct
  build failure and cannot become `CLEAR`, `HOLD`, `REJECT`, or a release attempt.
- Successful source builds use a versioned descriptor containing a digest of the complete validated
  integrity evidence. The existing `robotBuildDigest` therefore changes when the source, artifact,
  builder/runtime, or provenance evidence changes.
- CRE receives only the canonical public build descriptor/traces; private safety envelope values and
  confidential intermediate results remain inside the existing boundary.
- A source-built `CLEAR` still means only the existing evaluation result; Ledger remains the human
  release gate.
- Account ownership applies to source jobs, artifacts, builds, evaluations, and status reads.

## Change surfaces and dependency order

1. `packages/domain`: add a source-build descriptor version, integrity evidence schema, and
   `buildIntegrityDigest`; preserve v1 parsing/digests and add binding tests.
2. `apps/api/src/build-integrity`: add source validation, Git snapshot materialization, BuildKit
   runner, artifact hashing, provenance generation, and bounded result/error handling.
3. `apps/api/src/application/store.ts`: add non-destructive source-job metadata storage, status
   projections, successful descriptor promotion, and fail-closed evaluation checks.
4. `apps/api/src/server.ts` / `apps/api/src/index.ts`: add the opt-in source-build route and inject
   the runner without changing the existing build route.
5. `apps/web`: add a small existing/source selector, source fields, status/evidence projection, and
   polling for an in-progress source build; keep internals behind a details view.
6. Tests: domain digest/binding tests, runner validation/provenance tests, API/store lifecycle and
   account-isolation tests, and real-runner integration coverage that skips explicitly when Docker
   BuildKit is unavailable.
7. Docs/task/evidence: architecture, trust boundary, task board, AI usage, and this live plan.

## Acceptance checks

- Existing build-number/version route still creates a v1 build and evaluates through the current
  executor.
- Source route creates an account-scoped `BUILDING` record and never accepts an artifact digest.
- Invalid repository, non-commit revision, missing lockfile, unsupported runtime/command, or runner
  unavailability produces an explicit failed/unavailable state without evaluation.
- A real Bun fixture runs `bun install --frozen-lockfile --ignore-scripts` and `bun run build` inside BuildKit when
  Docker is available; an intentionally failing build remains `BUILD_FAILED`.
- Artifact digest is computed from the exported artifact bytes, not input or user data.
- Source snapshot mutation changes the source/integrity/robot-build identity even if a build output
  happens to be unchanged.
- Provenance has an in-toto Statement v1 subject and SLSA build-provenance predicate referencing the
  exact repository, commit, build command, lockfile, builder/runtime, and artifact digest.
- Only a successful source build can be evaluated; the existing evaluator receives the exact promoted
  descriptor and existing result binding/clearance/release checks remain active.
- Two accounts cannot read or complete one another's source jobs or builds.
- Chainlink, Graph, Gemini, and Ledger code paths remain unchanged except for consuming the existing
  exact `robotBuildDigest` generated by the promoted descriptor.

## Steps

- [x] Required docs, scoped instructions, and current repository inventory
- [x] Official BuildKit/Earthly/Dagger/Nix/SLSA/in-toto research
- [x] Domain protocol for optional source-build integrity evidence
- [x] Build Runner validation and BuildKit orchestration
- [x] Account store/status/evaluation integration
- [x] API route and default runner wiring
- [x] Minimal web selector/status/details view
- [x] Targeted tests; real Bun BuildKit proof remains environment-blocked
- [x] Independent read-only review and remediation of runner/provenance findings
- [ ] Full repository verification loop (blocked by workspace dependency wiring)
- [ ] Live BuildKit/Bun evidence report and handoff

## Risks and rollback

- Docker/buildx is not currently installed on this Windows host. The implementation must fail closed
  and preserve a truthful `BLOCKED`/`BUILD_FAILED` state; real-runner acceptance remains pending
  until Docker BuildKit is installed or an equivalent configured builder is supplied.
- In-process job orchestration is intentionally single-node MVP behavior. A durable queue/worker is
  a later operational change, not silently introduced here.
- Local artifact storage is private `.data` storage for this MVP; no download endpoint is exposed.
  If it cannot write or re-read the artifact, the build fails closed.
- BuildKit provenance can contain build-definition metadata. The runner reads the bounded official
  BuildKit metadata file, stores only its digest inside the standard provenance projection, and
  never persists raw build logs or secrets.
- Rollback is additive: remove the source route/runner wiring and leave v1 builds, descriptors,
  evaluations, clearances, and Ledger intents intact.

## Decisions / deviations

- The exact-build binding uses a `buildIntegrityDigest` inside a new descriptor version rather than
  adding new Solidity/EIP-712 fields. Existing P1/P4/P5 fields already bind `robotBuildDigest`.
- Failed/in-progress jobs use a non-authoritative internal placeholder descriptor only to satisfy the
  current SQLite row shape; it is never returned as an artifact identity and is rejected by
  `evaluateBuild`. Successful promotion replaces it atomically with the versioned source descriptor.
- Build output is a deterministic runner-produced tar archive of the post-build workspace excluding
  dependency caches, VCS metadata, environment files, and private local state. Its SHA-256 is the
  artifact identity for this MVP; deployment consumption of that archive is explicitly out of scope.

## Verification evidence

- `bun test packages/domain/test/protocol.test.ts apps/api/test/build-integrity-runner.test.ts
  apps/api/test/build-integrity-lifecycle.test.ts` — passed (43 tests, 1 explicit real-runner skip);
  the suite covers legacy compatibility, source promotion, evaluation gating, failure distinction,
  account isolation, actual artifact re-hashing, provenance binding mutations, and the real Bun
  version-output format.
- `bun x tsc --noEmit -p packages/domain/tsconfig.json` — passed.
- `bun x tsc --noEmit -p apps/api/tsconfig.test.json` — passed.
- `bun x tsc --noEmit -p apps/web/tsconfig.json` — passed.
- Live Docker BuildKit/Bun proof is blocked: `docker`, `buildx`, `buildctl`, `buildkitd`, and Podman
  are not installed on the current Windows host. The explicit integration test must be run with
  `ROVAULTA_RUN_REAL_BUILDKIT_TESTS=true`, `ROVAULTA_REAL_BUILD_REPOSITORY`, and
  `ROVAULTA_REAL_BUILD_REVISION` after a configured Docker/BuildKit builder is available.
- `bun run lint` reaches the existing CSS specificity warnings but exits successfully; direct
  affected-workspace TypeScript checks pass.
- `bun run verify` remains blocked by the pre-existing workspace-local `typescript` junction whose
  `bin/tsc` target is missing, after frozen-install repair attempts; the root `bun x tsc` checks
  above pass. The root test command also discovers Playwright specs through Bun and is not a valid
  all-suite runner in this checkout.
