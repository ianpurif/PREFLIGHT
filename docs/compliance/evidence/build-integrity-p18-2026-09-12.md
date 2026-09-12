# P18 Build Integrity live evidence — 2026-09-12

## Scope

This record proves the optional source-build runner path with a public Bun project. It does not
claim that a successful software build proves physical robot safety. The existing deterministic
evaluation and Ledger release boundary remain separate controls.

## Live runner input

- Repository: `https://github.com/elysiajs/elysia`
- Exact revision: `e037eca710e7ad193be09cc6615ab0dbe54af914`
- Command: `bun run build`
- Runtime: Bun `1.4.1`
- BuildKit image: `moby/buildkit:v0.30.0`, resolved to an immutable digest by the runner
- Buildx: Docker Desktop `0.36.1-desktop.1`
- Install network: explicitly enabled for this local proof only; production defaults to `none`

The command was executed through the gated real-runner test:

```text
ROVAULTA_RUN_REAL_BUILDKIT_TESTS=true
ROVAULTA_REAL_BUILD_REPOSITORY=https://github.com/elysiajs/elysia
ROVAULTA_REAL_BUILD_REVISION=e037eca710e7ad193be09cc6615ab0dbe54af914
ROVAULTA_REAL_BUILD_COMMAND="bun run build"
ROVAULTA_REAL_BUILD_INSTALL_NETWORK=default
bun test apps/api/test/build-integrity-runner.test.ts
```

Result: `12 pass`, `0 fail`, `0 skip`.

## Produced identity

```json
{
  "sourceSnapshotDigest": "sha256:af2c3d195c8c4e0884fc1157cca1e1300c0dd095b65568312c31900bba5a6461",
  "lockfileDigest": "sha256:abcc298d9319f2c9e50c8f8f1f6fbd784766c7cfb265bc2963d6211f6a0f91f0",
  "artifactDigest": "sha256:080e6eaa0792a168b45b7e769610f292415c79703c3ebab77f820515ea106a21",
  "provenanceSubjectDigest": "080e6eaa0792a168b45b7e769610f292415c79703c3ebab77f820515ea106a21",
  "provenancePredicateType": "https://slsa.dev/provenance/v1"
}
```

The test derives `artifactDigest` from the exported artifact bytes and asserts it equals the
in-toto subject digest. The runner also records the exact source snapshot, lockfile, runtime image,
BuildKit/frontend evidence, builder version, invocation id, and build command in the validated
provenance projection.

The same real result was then submitted through the account API and existing evaluation path:

```json
{
  "buildId": "robot-build:c4236a0d527b921a6cd7cdfb4cd9829a",
  "artifactDigest": "sha256:080e6eaa0792a168b45b7e769610f292415c79703c3ebab77f820515ea106a21",
  "robotBuildDigest": "sha256:8e30919235bb135435f452ac578f5b8fed454f49097864e58be018ad06fff3ee",
  "evaluationId": "evaluation:4f1f76fe44dde59a35ac2a784d0a788e",
  "verdict": "CLEAR",
  "clearanceRobotBuildDigest": "sha256:8e30919235bb135435f452ac578f5b8fed454f49097864e58be018ad06fff3ee"
}
```

The clearance context accepted only because its build digest exactly matched the evaluation and
promoted source-built descriptor. The artifact digest is therefore part of the exact build identity
that the clearance binds through the existing digest chain.

## Binding verification

- `apps/api/test/build-integrity-lifecycle.test.ts` proves that only a successful source result is
  promoted, that its artifact-backed robot-build digest reaches the existing evaluation, and that a
  failed source build remains distinct from safety `REJECT`.
- `packages/domain/test/protocol.test.ts` proves source-integrity mutations change the exact robot
  build digest and that evaluation/clearance bindings reject changed build identities.
- The normal existing-build route remains covered in the same lifecycle suite.

## Environment boundary

The proof used Docker Desktop on the Windows host with a fresh `docker-container` BuildKit builder.
Source code ran in a non-root BuildKit stage with a temporary context, bounded CPU/memory/timeout
controls, no host mounts or secrets, lifecycle scripts disabled, and build-time network disabled
after dependency installation. The runner removed the named builder and temporary artifact directory
after the test. Host Docker plugin/configuration variables are used only to invoke the host CLI and
are not passed into the untrusted source-build container.

## 2026-09-12 regression investigation

The reported `The runtime image could not be resolved` error was not an unavailable Bun image. The
exact native invocation of `docker buildx imagetools inspect oven/bun:1.4.1` succeeded and resolved
the image to `sha256:9e123d5fc069e29d519fd4c981afb61b8542ac80274771961136db1e4538d53e`. The API's
sanitized child-process environment had removed Windows Docker CLI plugin/configuration locations,
so `execFile` saw the Docker executable but returned `docker: unknown command: docker buildx`; the
old error mapping surfaced that as a misleading image-resolution failure.

The runner now preserves the required Windows Docker environment, discovers Docker Desktop when no
override is configured, and maps daemon connection failures to `BUILD_RUNNER_UNAVAILABLE`. A copied
`.env.example` also leaves the override blank so autodetection is not defeated.

Replaying the immutable requested revision
`85da65f673ddcb5c8392dc6f619d120e13c5f6bd` now gets past image resolution and BuildKit startup, but
that historical source snapshot fails later in its own build (`packages/domain/src/schemas.ts`
uses `URL` without the required TypeScript DOM lib). It must remain a failed immutable build; it is
not valid to reuse a newer local result under that old revision. The local fixes are present in later
local commits; they require publishing a new source revision before a user can submit the corrected
Rovaulta repository state.

## Follow-up: corrected Rovaulta revision — 2026-09-12

The corrected checkout was replayed from the published commit
`94227cfb2817bdc57dd49ed04f5005d4a19ce3c4` using the exact repository and command requested by the
product flow. The fresh BuildKit runner used the local Docker Desktop daemon with dependency-install
network explicitly set to `default`; the build command itself remained `--network=none`.

```json
{
  "sourceRevision": "94227cfb2817bdc57dd49ed04f5005d4a19ce3c4",
  "sourceSnapshotDigest": "sha256:80a5d03eeaf43cd84cf1329e808964d4e63afd08c86260e0cf6458cd91f201ff",
  "lockfileDigest": "sha256:1f82fbc9f91af6cf6b6b9808422bbac10d019a0e022df7e852359b181075c1fc",
  "artifactDigest": "sha256:4d830c55bfa3f17a8155f586b160e34a76cf9b67e9f5241ec400cacfd7575fc2",
  "runtime": "Bun 1.4.1",
  "runtimeImage": "oven/bun:1.4.1@sha256:9e123d5fc069e29d519fd4c981afb61b8542ac80274771961136db1e4538d53e",
  "builder": "github.com/docker/buildx v0.36.1-desktop.1"
}
```

The runner's real lifecycle test completed in `476.81s` with `3 pass`, `0 fail`: the existing
build-number route passed, a failed source build stayed distinct from safety `REJECT`, and the
corrected source revision reached the existing evaluation path with `CLEAR`. The provenance
in-toto subject matched the artifact digest, and the resulting clearance bound the exact
artifact-backed robot-build digest.

The same current revision with the production-safe default `ROVAULTA_BUILD_INSTALL_NETWORK=none`
failed closed as `DEPENDENCY_INSTALL_FAILED` on a cold local cache. This is expected when Bun has no
pre-populated package cache and is not a lockfile mismatch: frozen installation must fetch the
repository's declared dependencies. The ignored local `.env` now opts this Docker Desktop checkout
into `ROVAULTA_BUILD_INSTALL_NETWORK=default` for that install layer only. Production should keep
`none` or provide a dedicated BuildKit package-registry/proxy egress policy; the untrusted build
command remains network-disabled in either case.

The local checkout also had stale generated workspace `node_modules` junctions, including broken
TypeScript links. Removing only those generated directories and rerunning `bun install --frozen-lockfile`
restored the dependency graph without changing `package.json` or `bun.lock`.
