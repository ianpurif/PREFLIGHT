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
- Buildx: `0.30.1`
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

Result: `10 pass`, `0 fail`, `0 skip`.

## Produced identity

```json
{
  "sourceSnapshotDigest": "sha256:af2c3d195c8c4e0884fc1157cca1e1300c0dd095b65568312c31900bba5a6461",
  "lockfileDigest": "sha256:abcc298d9319f2c9e50c8f8f1f6fbd784766c7cfb265bc2963d6211f6a0f91f0",
  "artifactDigest": "sha256:d1fe7f91b06d1deb4f68850435f21337bb29821f70d62de60b47da13679b2fb7",
  "provenanceSubjectDigest": "d1fe7f91b06d1deb4f68850435f21337bb29821f70d62de60b47da13679b2fb7",
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
  "buildId": "robot-build:63ec9e56b86e74eb31511b2ceb39291a",
  "artifactDigest": "sha256:d1fe7f91b06d1deb4f68850435f21337bb29821f70d62de60b47da13679b2fb7",
  "robotBuildDigest": "sha256:17424a308179c84eef5451f0f0206d7897630b0c6cfa707609da2a6025404eaa",
  "evaluationId": "evaluation:742b4b3466dc243ec992638500e03177",
  "verdict": "CLEAR",
  "clearanceRobotBuildDigest": "sha256:17424a308179c84eef5451f0f0206d7897630b0c6cfa707609da2a6025404eaa"
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

The proof used a root-owned Docker Engine/Buildx daemon inside WSL because native Docker Desktop
elevation was unavailable. Source code ran in a non-root BuildKit stage with a temporary context,
bounded CPU/memory/timeout controls, no host mounts or secrets, lifecycle scripts disabled, and
build-time network disabled after dependency installation. The runner removed the named builder and
temporary artifact directory after the test.
