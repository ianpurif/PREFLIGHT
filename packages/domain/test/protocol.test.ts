import { describe, expect, test } from "bun:test";
import {
  assertClearanceBindings,
  assertDeploymentIntentBindings,
  assertEvaluationInputBindings,
  assertEvaluationResultBindings,
  BUILD_INTEGRITY_SCHEMA_VERSION,
  CLEARANCE_RECORD_SCHEMA_VERSION,
  canonicalBytes,
  canonicalSerialize,
  createDeploymentIntent,
  DEPLOYMENT_ACTION,
  DEPLOYMENT_TARGETS,
  DIGEST_DOMAINS,
  digestBuildIntegrity,
  digestClearance,
  digestDeploymentIntent,
  digestEvaluationInputs,
  digestRobotBuild,
  digestSafetyEnvelopeCommitment,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  EVALUATION_REQUEST_SCHEMA_VERSION,
  EVALUATION_RESULT_SCHEMA_VERSION,
  EVALUATION_VERDICTS,
  LEGACY_SCHEMA_VERSIONS,
  PROTOCOL_ERROR_CODES,
  type ProtocolError,
  parseBuildIntegrityEvidence,
  parseClearanceId,
  parseClearanceRecord,
  parseDeploymentIntent,
  parseDeploymentNonce,
  parseEvaluationId,
  parseEvaluationInputs,
  parseEvaluationRequest,
  parseEvaluationResult,
  parseEvaluatorVersionId,
  parseRobotBuildDescriptor,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeId,
  parseSafetyEnvelopeMetadata,
  parseSha256Digest,
  parseSiteId,
  parseUnixTimestamp,
  ROBOT_BUILD_SCHEMA_VERSION,
  type RobotBuildDigest,
  SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
  type SiteId,
  SOURCE_ROBOT_BUILD_SCHEMA_VERSION,
} from "../src/index.js";

function expectProtocolCode(action: () => unknown, code: ProtocolError["code"]): void {
  try {
    action();
    throw new Error(`Expected protocol error ${code}`);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as ProtocolError).code).toBe(code);
  }
}

const artifactDigest = parseSha256Digest(`sha256:${"11".repeat(32)}`);
const alternateArtifactDigest = parseSha256Digest(`sha256:${"12".repeat(32)}`);
const siteId = parseSiteId("site:warehouse-a");
const alternateSiteId = parseSiteId("site:warehouse-b");
const robotId = parseRobotId("robot:picker-01");
const alternateRobotId = parseRobotId("robot:picker-02");
const robotBuildId = parseRobotBuildId("robot-build:release-001");
const alternateRobotBuildId = parseRobotBuildId("robot-build:release-002");
const safetyEnvelopeId = parseSafetyEnvelopeId("safety-envelope:warehouse-a-v1");
const alternateSafetyEnvelopeId = parseSafetyEnvelopeId("safety-envelope:warehouse-a-v2");
const evaluatorVersion = parseEvaluatorVersionId("evaluator-version:deterministic-v1");
const alternateEvaluatorVersion = parseEvaluatorVersionId("evaluator-version:deterministic-v2");
const evaluationId = parseEvaluationId("evaluation:eval-001");
const alternateEvaluationId = parseEvaluationId("evaluation:eval-002");
const clearanceId = parseClearanceId("clearance:clear-001");
const alternateClearanceId = parseClearanceId("clearance:clear-002");
const requestedAt = parseUnixTimestamp("1788547200");
const evaluatedAt = parseUnixTimestamp("1788547210");
const issuedAt = parseUnixTimestamp("1788547220");
const expiresAt = parseUnixTimestamp("1788550800");
const intentIssuedAt = parseUnixTimestamp("1788547230");
const intentExpiresAt = parseUnixTimestamp("1788549000");
const nonce = parseDeploymentNonce("release_nonce_0001");

const robotBuild = parseRobotBuildDescriptor({
  schemaVersion: ROBOT_BUILD_SCHEMA_VERSION,
  robotId,
  robotBuildId,
  artifactDigest,
});

const blindingSecret = Uint8Array.from({ length: 32 }, (_, index) => index);
const confidentialEnvelope = {
  maxPayloadKg: 240,
  restrictedZones: ["zone-a", "zone-b"],
  speedLimitMmPerSecond: 1500,
};
const safetyEnvelopeCommitment = digestSafetyEnvelopeCommitment(
  siteId,
  safetyEnvelopeId,
  confidentialEnvelope,
  blindingSecret,
);
const safetyEnvelopeMetadata = parseSafetyEnvelopeMetadata({
  schemaVersion: SAFETY_ENVELOPE_METADATA_SCHEMA_VERSION,
  siteId,
  safetyEnvelopeId,
  safetyEnvelopeCommitment,
});

const inputs = parseEvaluationInputs({
  schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
  siteId,
  robotId,
  robotBuildId,
  robotBuildDigest: digestRobotBuild(robotBuild),
  safetyEnvelopeId,
  safetyEnvelopeCommitment,
  evaluatorVersion,
});

const request = parseEvaluationRequest({
  schemaVersion: EVALUATION_REQUEST_SCHEMA_VERSION,
  evaluationId,
  inputs,
  requestedAt,
});

const result = parseEvaluationResult({
  schemaVersion: EVALUATION_RESULT_SCHEMA_VERSION,
  evaluationId,
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  evaluatedAt,
});

const clearance = parseClearanceRecord({
  schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
  clearanceId,
  evaluationId,
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  issuedAt,
  expiresAt,
});

const intent = createDeploymentIntent(clearance, {
  targetEnvironment: "sepolia",
  nonce,
  issuedAt: intentIssuedAt,
  expiresAt: intentExpiresAt,
});

const GOLDEN_DIGESTS = {
  robotBuild: "sha256:843cd43a5a5a375351733150a611c1d9d63c6a2fc3ae9c1ebef0ea3f29b1c4b7",
  safetyEnvelopeCommitment:
    "sha256:3cffef1ca4b0942157109c9ff2670d0ee082d264bcb9e4c2b194ee6e7ab9bd6a",
  evaluationInputs: "sha256:84d738b5f0a56736f04bdd16415b3678112ea0b0e4223e53b3d4faf23055b80c",
  clearance: "sha256:79d513cd15b4a24192ae7598d1037926a72df6d60eba79cd472fb9973d89ecb5",
  deploymentIntent: "sha256:224aec1dd2eb3675886c362b50719f9479a1772e102ed3729295778f3c7b8ed9",
} as const;

describe("canonical identifiers", () => {
  test("each identifier kind validates its own prefix", () => {
    expect(parseSiteId(siteId)).toBe(siteId);
    expect(parseRobotId(robotId)).toBe(robotId);
    expect(parseRobotBuildId(robotBuildId)).toBe(robotBuildId);
    expect(parseSafetyEnvelopeId(safetyEnvelopeId)).toBe(safetyEnvelopeId);
    expect(parseEvaluatorVersionId(evaluatorVersion)).toBe(evaluatorVersion);
    expect(parseEvaluationId(evaluationId)).toBe(evaluationId);
    expect(parseClearanceId(clearanceId)).toBe(clearanceId);
  });

  test.each([
    [() => parseSiteId("robot:picker-01")],
    [() => parseRobotId("robot:UPPER")],
    [() => parseRobotBuildId("robot-build:has space")],
    [() => parseSafetyEnvelopeId("safety-envelope:")],
    [() => parseEvaluatorVersionId("evaluator-version:café")],
    [() => parseEvaluationId(42)],
    [() => parseClearanceId(`clearance:${"a".repeat(65)}`)],
  ])("rejects malformed or cross-kind identifiers", (action) => {
    expectProtocolCode(action, "INVALID_IDENTIFIER");
  });

  test("brands prevent compile-time identifier interchange", () => {
    const typedSite: SiteId = siteId;
    expect(typedSite).toBe(siteId);
    // @ts-expect-error Robot IDs must not be assignable to Site IDs.
    const wrongKind: SiteId = robotId;
    // @ts-expect-error Raw strings must cross a runtime parser first.
    const rawString: SiteId = "site:warehouse-a";
    expect([wrongKind, rawString]).toBeDefined();

    // @ts-expect-error Safety-envelope commitments must not be used as robot-build digests.
    const wrongDigest: RobotBuildDigest = safetyEnvelopeCommitment;
    expect(String(wrongDigest)).toBe(String(safetyEnvelopeCommitment));
  });
});

describe("Rovaulta Canonical JSON v1", () => {
  test("logical object equality and insertion order produce identical bytes", () => {
    const left = { z: 3, nested: { b: true, a: "value" }, a: [1, 2, 3] };
    const right = { a: [1, 2, 3], nested: { a: "value", b: true }, z: 3 };
    expect(canonicalSerialize(left)).toBe(canonicalSerialize(right));
    expect(String(canonicalSerialize(left))).toBe(
      '{"a":[1,2,3],"nested":{"a":"value","b":true},"z":3}',
    );
  });

  test("repeated canonicalization is deterministic and shared references are not cycles", () => {
    const shared = { value: "same" };
    const value = { first: shared, second: shared };
    const expected = canonicalSerialize(value);
    for (let iteration = 0; iteration < 250; iteration += 1) {
      expect(canonicalSerialize(value)).toBe(expected);
    }
  });

  test("type and framing ambiguities remain distinct", () => {
    expect(canonicalSerialize(["a", "bc"])).not.toBe(canonicalSerialize(["ab", "c"]));
    expect(canonicalSerialize(null)).not.toBe(canonicalSerialize("null"));
    expect(canonicalSerialize(1)).not.toBe(canonicalSerialize("1"));
    expect(canonicalSerialize([1, 2])).not.toBe(canonicalSerialize([2, 1]));
  });

  test("UTF-8 bytes and Unicode key ordering match independent golden vectors", () => {
    expect(Array.from(canonicalBytes({ a: "¢é水😀" }))).toEqual([
      123, 34, 97, 34, 58, 34, 194, 162, 195, 169, 230, 176, 180, 240, 159, 152, 128, 34, 125,
    ]);
    expect(String(canonicalSerialize({ "\ue000": 3, "😀": 2, a: 1 }))).toBe('{"a":1,"😀":2,"":3}');
  });

  test("rejects every unsupported or ambiguous value family", () => {
    const sparse: unknown[] = [];
    sparse[1] = "value";
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const accessor = {};
    Object.defineProperty(accessor, "secret", { enumerable: true, get: () => "value" });
    const hidden = {};
    Object.defineProperty(hidden, "secret", { enumerable: false, value: "value" });
    const symbolKey = { [Symbol("key")]: "value" };
    const customArray = [1, 2] as number[] & { extra?: string };
    customArray.extra = "value";

    const invalidValues: unknown[] = [
      undefined,
      { value: undefined },
      [undefined],
      sparse,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.NEGATIVE_INFINITY,
      -0,
      1.5,
      Number.MAX_SAFE_INTEGER + 1,
      1n,
      () => undefined,
      Symbol("value"),
      new Date(0),
      new Map(),
      new Set(),
      new Uint8Array([1]),
      cyclic,
      accessor,
      hidden,
      symbolKey,
      customArray,
      "e\u0301",
      "\ud800",
      Object.assign(Object.create({ inherited: true }), { value: "x" }),
      new Proxy(
        {},
        {
          getPrototypeOf: () => {
            throw new Error("trap");
          },
        },
      ),
    ];

    for (const invalid of invalidValues) {
      expectProtocolCode(() => canonicalSerialize(invalid), "CANONICALIZATION_FAILURE");
    }
  });
});

describe("strict protocol schemas", () => {
  test("all minimum schemas validate into frozen typed data", () => {
    for (const value of [
      robotBuild,
      safetyEnvelopeMetadata,
      inputs,
      request,
      result,
      clearance,
      intent,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }
    expect(Object.isFrozen(request.inputs)).toBe(true);
    expect(parseEvaluationInputs(inputs)).not.toBe(inputs);
  });

  test("public protocol constant collections resist runtime mutation", () => {
    for (const value of [
      DIGEST_DOMAINS,
      DEPLOYMENT_TARGETS,
      EVALUATION_VERDICTS,
      PROTOCOL_ERROR_CODES,
    ]) {
      expect(Object.isFrozen(value)).toBe(true);
    }

    expect(() => {
      (DIGEST_DOMAINS as { robotBuild: string }).robotBuild = "attacker-domain";
    }).toThrow(TypeError);
    expect(() => {
      (EVALUATION_VERDICTS as unknown as string[]).push("SAFE");
    }).toThrow(TypeError);
  });

  test("unsupported versions fail before hashing", () => {
    expectProtocolCode(
      () => digestRobotBuild({ ...robotBuild, schemaVersion: "rovaulta.robot-build/v3" }),
      "UNSUPPORTED_VERSION",
    );
    expectProtocolCode(
      () =>
        parseEvaluationRequest({
          ...request,
          schemaVersion: "rovaulta.evaluation-request/v2",
        }),
      "UNSUPPORTED_VERSION",
    );
  });

  test("malformed objects and unknown fields fail closed", () => {
    expectProtocolCode(() => parseRobotBuildDescriptor(null), "MALFORMED_OBJECT");
    expectProtocolCode(() => parseEvaluationInputs([]), "MALFORMED_OBJECT");
    expectProtocolCode(
      () => parseSafetyEnvelopeMetadata({ ...safetyEnvelopeMetadata, ignored: true }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () => parseEvaluationResult({ ...result, verdict: "SAFE" }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () => parseClearanceRecord({ ...clearance, verdict: "HOLD" }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () => parseDeploymentIntent({ ...intent, targetEnvironment: "mainnet" }),
      "MALFORMED_OBJECT",
    );
    expectProtocolCode(
      () => parseDeploymentIntent({ ...intent, action: "DELETE_DEPLOYMENT" }),
      "MALFORMED_OBJECT",
    );
  });

  test("timestamps and expiry are canonical and deterministic", () => {
    for (const invalid of ["01", "-1", "1.5", "253402300800", 1]) {
      expectProtocolCode(() => parseUnixTimestamp(invalid), "MALFORMED_OBJECT");
    }
    expectProtocolCode(
      () => parseClearanceRecord({ ...clearance, expiresAt: clearance.issuedAt }),
      "INVALID_EXPIRY",
    );
    expectProtocolCode(
      () => parseDeploymentIntent({ ...intent, expiresAt: "invalid" }),
      "INVALID_EXPIRY",
    );
  });

  test("every exact clearance binding is required", () => {
    const topLevelBindings = [
      "clearanceId",
      "evaluationId",
      "inputs",
      "evaluationInputsDigest",
      "verdict",
      "expiresAt",
    ] as const;
    for (const field of topLevelBindings) {
      const candidate = { ...clearance } as Record<string, unknown>;
      delete candidate[field];
      expectProtocolCode(() => parseClearanceRecord(candidate), "MISSING_REQUIRED_BINDING");
    }

    const inputBindings = [
      "siteId",
      "robotId",
      "robotBuildId",
      "robotBuildDigest",
      "safetyEnvelopeId",
      "safetyEnvelopeCommitment",
      "evaluatorVersion",
    ] as const;
    for (const field of inputBindings) {
      const incompleteInputs = { ...clearance.inputs } as Record<string, unknown>;
      delete incompleteInputs[field];
      expectProtocolCode(
        () => parseClearanceRecord({ ...clearance, inputs: incompleteInputs }),
        "MISSING_REQUIRED_BINDING",
      );
    }
  });
});

describe("versioned domain-separated digests", () => {
  test("fixed SHA-256 golden vectors remain stable", () => {
    expect(String(digestRobotBuild(robotBuild))).toBe(GOLDEN_DIGESTS.robotBuild);
    expect(String(safetyEnvelopeCommitment)).toBe(GOLDEN_DIGESTS.safetyEnvelopeCommitment);
    expect(String(digestEvaluationInputs(inputs))).toBe(GOLDEN_DIGESTS.evaluationInputs);
    expect(String(digestClearance(clearance))).toBe(GOLDEN_DIGESTS.clearance);
    expect(String(digestDeploymentIntent(intent))).toBe(GOLDEN_DIGESTS.deploymentIntent);
  });

  test("same logical data and reordered wire objects have the same digest", () => {
    const reorderedBuild = {
      artifactDigest: robotBuild.artifactDigest,
      robotBuildId: robotBuild.robotBuildId,
      robotId: robotBuild.robotId,
      schemaVersion: robotBuild.schemaVersion,
    };
    expect(digestRobotBuild(reorderedBuild)).toBe(digestRobotBuild(robotBuild));
    for (let iteration = 0; iteration < 100; iteration += 1) {
      expect(digestClearance({ ...clearance })).toBe(digestClearance(clearance));
      expect(digestDeploymentIntent({ ...intent })).toBe(digestDeploymentIntent(intent));
    }
  });

  test("accepts pre-brand wire identities without changing their digest semantics", () => {
    const legacyBuild = parseRobotBuildDescriptor({
      ...robotBuild,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.robotBuild,
    });
    const legacyEnvelope = {
      ...confidentialEnvelope,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.confidentialEvaluationEnvelope,
    };
    const legacyCommitment = digestSafetyEnvelopeCommitment(
      siteId,
      safetyEnvelopeId,
      legacyEnvelope,
      blindingSecret,
    );
    const legacyInputs = parseEvaluationInputs({
      ...inputs,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.evaluationInputs,
      robotBuildDigest: digestRobotBuild(legacyBuild),
      safetyEnvelopeCommitment: legacyCommitment,
    });
    const legacyClearance = parseClearanceRecord({
      ...clearance,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.clearanceRecord,
      inputs: legacyInputs,
      evaluationInputsDigest: digestEvaluationInputs(legacyInputs),
    });
    const legacyIntent = parseDeploymentIntent({
      ...intent,
      schemaVersion: LEGACY_SCHEMA_VERSIONS.deploymentIntent,
      robotBuildDigest: legacyInputs.robotBuildDigest,
      clearanceDigest: digestClearance(legacyClearance),
    });

    expect(legacyBuild.schemaVersion).toBe(LEGACY_SCHEMA_VERSIONS.robotBuild);
    expect(digestRobotBuild(legacyBuild)).not.toBe(digestRobotBuild(robotBuild));
    expect(digestClearance(legacyClearance)).not.toBe(digestClearance(clearance));
    expect(digestDeploymentIntent(legacyIntent)).not.toBe(digestDeploymentIntent(intent));
    expect(legacyIntent.schemaVersion).toBe(LEGACY_SCHEMA_VERSIONS.deploymentIntent);
  });

  test("digest domain labels are versioned and unique", () => {
    const domains = Object.values(DIGEST_DOMAINS);
    expect(new Set(domains).size).toBe(domains.length);
    for (const domain of domains) expect(domain).toMatch(/^rovaulta\.digest\..+\/v1$/);
  });

  test("meaningful robot-build and envelope changes alter digests", () => {
    expect(digestRobotBuild({ ...robotBuild, artifactDigest: alternateArtifactDigest })).not.toBe(
      digestRobotBuild(robotBuild),
    );
    expect(digestRobotBuild({ ...robotBuild, robotBuildId: alternateRobotBuildId })).not.toBe(
      digestRobotBuild(robotBuild),
    );

    expect(
      digestSafetyEnvelopeCommitment(
        siteId,
        safetyEnvelopeId,
        { ...confidentialEnvelope, maxPayloadKg: 241 },
        blindingSecret,
      ),
    ).not.toBe(safetyEnvelopeCommitment);
    expect(
      digestSafetyEnvelopeCommitment(
        siteId,
        safetyEnvelopeId,
        {
          speedLimitMmPerSecond: 1500,
          restrictedZones: ["zone-a", "zone-b"],
          maxPayloadKg: 240,
        },
        blindingSecret,
      ),
    ).toBe(safetyEnvelopeCommitment);
    const alternateBlind = Uint8Array.from(blindingSecret);
    alternateBlind[31] = 255;
    expect(
      digestSafetyEnvelopeCommitment(
        siteId,
        safetyEnvelopeId,
        confidentialEnvelope,
        alternateBlind,
      ),
    ).not.toBe(safetyEnvelopeCommitment);
    expect(
      digestSafetyEnvelopeCommitment(
        alternateSiteId,
        safetyEnvelopeId,
        confidentialEnvelope,
        blindingSecret,
      ),
    ).not.toBe(safetyEnvelopeCommitment);
    expectProtocolCode(
      () =>
        digestSafetyEnvelopeCommitment(
          siteId,
          safetyEnvelopeId,
          confidentialEnvelope,
          new Uint8Array(16),
        ),
      "MALFORMED_OBJECT",
    );
  });

  test("source-build integrity is validated and included in the exact build digest", () => {
    const provenance = {
      _type: "https://in-toto.io/Statement/v1",
      subject: [
        {
          name: `rovaulta/${robotBuildId}/artifact.tar.gz`,
          digest: { sha256: "22".repeat(32) },
        },
      ],
      predicateType: "https://slsa.dev/provenance/v1",
      predicate: {
        buildDefinition: {
          buildType: "https://rovaulta.dev/build-types/buildkit-bun/v1",
          externalParameters: {
            repository: "https://github.com/example/robot",
            revision: "a".repeat(40),
            buildCommand: "bun run build",
            runtime: "bun",
          },
          resolvedDependencies: [
            {
              uri: `git+https://github.com/example/robot@${"a".repeat(40)}`,
              digest: { gitCommit: "a".repeat(40) },
            },
            {
              uri: `source-snapshot:sha256:${"33".repeat(32)}`,
              digest: { sha256: "33".repeat(32) },
            },
            {
              uri: "lockfile:bun.lock",
              digest: { sha256: "44".repeat(32) },
            },
            {
              uri: `docker-image:oven/bun:1.4.1@sha256:${"55".repeat(32)}`,
              digest: { sha256: "55".repeat(32) },
            },
            {
              uri: `dockerfile-frontend:docker/dockerfile:1.7@sha256:${"66".repeat(32)}`,
              digest: { sha256: "66".repeat(32) },
            },
            {
              uri: `buildkit-image:moby/buildkit:v0.24.0@sha256:${"77".repeat(32)}`,
              digest: { sha256: "77".repeat(32) },
            },
            {
              uri: "urn:rovaulta:buildkit-provenance",
              digest: { sha256: "88".repeat(32) },
            },
          ],
        },
        runDetails: {
          builder: {
            id: "https://rovaulta.dev/builders/buildkit/v1",
            version: { buildx: "buildx-test", platform: "linux/amd64" },
          },
          metadata: {
            invocationId: "robot-build:release-001",
            startedOn: "2026-09-12T00:00:00Z",
            finishedOn: "2026-09-12T00:01:00Z",
          },
        },
      },
    } as const;
    const evidence = parseBuildIntegrityEvidence({
      schemaVersion: BUILD_INTEGRITY_SCHEMA_VERSION,
      buildId: robotBuildId,
      sourceRepository: "https://github.com/example/robot",
      sourceRevision: "a".repeat(40),
      sourceSnapshotDigest: `sha256:${"33".repeat(32)}`,
      artifactDigest: `sha256:${"22".repeat(32)}`,
      buildCommand: "bun run build",
      lockfileDigest: `sha256:${"44".repeat(32)}`,
      builder: { id: "https://rovaulta.dev/builders/buildkit/v1", version: "buildx-test" },
      runtime: {
        name: "bun",
        version: "1.4.1",
        image: `oven/bun:1.4.1@sha256:${"55".repeat(32)}`,
      },
      buildStatus: "BUILD_SUCCEEDED",
      provenance,
    });
    const sourceDescriptor = parseRobotBuildDescriptor({
      schemaVersion: SOURCE_ROBOT_BUILD_SCHEMA_VERSION,
      robotId,
      robotBuildId,
      artifactDigest: evidence.artifactDigest,
      buildIntegrityDigest: digestBuildIntegrity(evidence),
    });
    expect(sourceDescriptor.buildIntegrityDigest).toBe(digestBuildIntegrity(evidence));
    expect(digestRobotBuild(sourceDescriptor)).not.toBe(digestRobotBuild(robotBuild));
    expect(
      digestRobotBuild({
        ...sourceDescriptor,
        buildIntegrityDigest: `sha256:${"55".repeat(32)}`,
      }),
    ).not.toBe(digestRobotBuild(sourceDescriptor));
    expectProtocolCode(
      () =>
        parseBuildIntegrityEvidence({
          ...evidence,
          artifactDigest: `sha256:${"66".repeat(32)}`,
        }),
      "DIGEST_MISMATCH",
    );
    expectProtocolCode(
      () =>
        parseBuildIntegrityEvidence({
          ...evidence,
          provenance: {
            ...evidence.provenance,
            predicate: {
              ...evidence.provenance.predicate,
              buildDefinition: {
                ...evidence.provenance.predicate.buildDefinition,
                externalParameters: {
                  ...evidence.provenance.predicate.buildDefinition.externalParameters,
                  buildCommand: "bun test",
                },
              },
            },
          },
        }),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () =>
        parseBuildIntegrityEvidence({
          ...evidence,
          provenance: {
            ...evidence.provenance,
            predicate: {
              ...evidence.provenance.predicate,
              runDetails: {
                ...evidence.provenance.predicate.runDetails,
                metadata: {
                  ...evidence.provenance.predicate.runDetails.metadata,
                  invocationId: "robot-build:other-build",
                },
              },
            },
          },
        }),
      "BINDING_MISMATCH",
    );
  });

  test("every evaluation binding mutation changes its digest", () => {
    const alternateBuildDigest = digestRobotBuild({
      ...robotBuild,
      robotBuildId: alternateRobotBuildId,
    });
    const alternateCommitment = digestSafetyEnvelopeCommitment(
      siteId,
      alternateSafetyEnvelopeId,
      confidentialEnvelope,
      blindingSecret,
    );
    const mutations = [
      { ...inputs, siteId: alternateSiteId },
      { ...inputs, robotId: alternateRobotId },
      { ...inputs, robotBuildId: alternateRobotBuildId },
      { ...inputs, robotBuildDigest: alternateBuildDigest },
      { ...inputs, safetyEnvelopeId: alternateSafetyEnvelopeId },
      { ...inputs, safetyEnvelopeCommitment: alternateCommitment },
      { ...inputs, evaluatorVersion: alternateEvaluatorVersion },
    ];
    for (const mutated of mutations) {
      expect(digestEvaluationInputs(mutated)).not.toBe(digestEvaluationInputs(inputs));
    }
  });

  test("clearance and intent field mutations change their digests", () => {
    const clearanceMutations = [
      { ...clearance, clearanceId: alternateClearanceId },
      { ...clearance, evaluationId: alternateEvaluationId },
      { ...clearance, issuedAt: parseUnixTimestamp("1788547221") },
      { ...clearance, expiresAt: parseUnixTimestamp("1788550801") },
    ];
    for (const mutated of clearanceMutations) {
      expect(digestClearance(mutated)).not.toBe(digestClearance(clearance));
    }

    const intentMutations = [
      { ...intent, nonce: parseDeploymentNonce("release_nonce_0002") },
      { ...intent, issuedAt: parseUnixTimestamp("1788547231") },
      { ...intent, expiresAt: parseUnixTimestamp("1788549001") },
      { ...intent, clearanceId: alternateClearanceId },
    ];
    for (const mutated of intentMutations) {
      expect(digestDeploymentIntent(mutated)).not.toBe(digestDeploymentIntent(intent));
    }
    expect(intent.action).toBe(DEPLOYMENT_ACTION);
  });
});

describe("exact cross-object bindings", () => {
  test("valid build, envelope, evaluation, clearance, and intent chains agree", () => {
    expect(assertEvaluationInputBindings(inputs, robotBuild, safetyEnvelopeMetadata)).toEqual(
      inputs,
    );
    expect(assertEvaluationResultBindings(result, request)).toEqual(result);
    expect(assertClearanceBindings(clearance, result)).toEqual(clearance);
    expect(assertDeploymentIntentBindings(intent, clearance)).toEqual(intent);
  });

  test("evaluation results cannot attach to different inputs or requests", () => {
    expectProtocolCode(
      () =>
        assertEvaluationResultBindings({ ...result, evaluationId: alternateEvaluationId }, request),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () =>
        assertEvaluationResultBindings(
          { ...result, evaluationInputsDigest: parseSha256Digest(`sha256:${"ff".repeat(32)}`) },
          request,
        ),
      "DIGEST_MISMATCH",
    );
  });

  test("clearances cannot attach to a different evaluation", () => {
    expectProtocolCode(
      () => assertClearanceBindings({ ...clearance, evaluationId: alternateEvaluationId }, result),
      "BINDING_MISMATCH",
    );
    expectProtocolCode(
      () => assertClearanceBindings(clearance, { ...result, verdict: "HOLD" }),
      "BINDING_MISMATCH",
    );

    const forgedDigest = parseSha256Digest(`sha256:${"ff".repeat(32)}`);
    const forgedResult = { ...result, evaluationInputsDigest: forgedDigest };
    const forgedClearance = { ...clearance, evaluationInputsDigest: forgedDigest };
    expectProtocolCode(
      () => assertClearanceBindings(forgedClearance, forgedResult),
      "DIGEST_MISMATCH",
    );
    expectProtocolCode(() => digestClearance(forgedClearance), "DIGEST_MISMATCH");
    expectProtocolCode(
      () =>
        createDeploymentIntent(forgedClearance, {
          targetEnvironment: "sepolia",
          nonce,
          issuedAt: intentIssuedAt,
          expiresAt: intentExpiresAt,
        }),
      "DIGEST_MISMATCH",
    );
    expectProtocolCode(
      () => assertDeploymentIntentBindings(intent, forgedClearance),
      "DIGEST_MISMATCH",
    );
  });

  test("deployment intent rejects every changed site/build/clearance binding", () => {
    const missingSite = { ...intent } as Record<string, unknown>;
    delete missingSite.siteId;
    expectProtocolCode(() => parseDeploymentIntent(missingSite), "MISSING_REQUIRED_BINDING");

    const mismatches = [
      [{ ...intent, siteId: alternateSiteId }, "BINDING_MISMATCH"],
      [{ ...intent, robotId: alternateRobotId }, "BINDING_MISMATCH"],
      [{ ...intent, robotBuildId: alternateRobotBuildId }, "BINDING_MISMATCH"],
      [
        {
          ...intent,
          robotBuildDigest: digestRobotBuild({
            ...robotBuild,
            artifactDigest: alternateArtifactDigest,
          }),
        },
        "DIGEST_MISMATCH",
      ],
      [{ ...intent, clearanceId: alternateClearanceId }, "BINDING_MISMATCH"],
    ] as const;
    for (const [mismatch, code] of mismatches) {
      expectProtocolCode(() => assertDeploymentIntentBindings(mismatch, clearance), code);
    }

    expectProtocolCode(
      () =>
        assertDeploymentIntentBindings(
          { ...intent, clearanceDigest: parseSha256Digest(`sha256:${"ee".repeat(32)}`) },
          clearance,
        ),
      "DIGEST_MISMATCH",
    );
    expectProtocolCode(
      () =>
        assertDeploymentIntentBindings(
          { ...intent, expiresAt: parseUnixTimestamp("1788550801") },
          clearance,
        ),
      "INVALID_EXPIRY",
    );
  });
});
