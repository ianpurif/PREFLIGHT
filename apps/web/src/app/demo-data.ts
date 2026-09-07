import {
  digestRobotBuild,
  type RobotBuildDescriptor,
  type RobotBuildDigest,
  type Sha256Digest,
} from "@preflight/domain";
import {
  createDeterministicDemoFixture,
  evaluateSimulation,
  type RuleViolation,
} from "@preflight/simulation-core";

export const DEMO_REGISTRY_ADDRESS = "0xFB270cc222efa8B5005AA097dD512Be2558dde65" as const;
export const DEMO_REGISTRY_URL =
  `https://sepolia.etherscan.io/address/${DEMO_REGISTRY_ADDRESS}` as const;

export interface DemoPublicBuild {
  readonly label: "Build A" | "Build B";
  readonly version: "4.7.20" | "4.7.21";
  readonly buildId: string;
  readonly robotId: string;
  readonly artifactDigest: Sha256Digest;
  readonly robotBuildDigest: RobotBuildDigest;
  readonly descriptor: RobotBuildDescriptor;
}

export interface DemoRoutePoint {
  readonly xMm: number;
  readonly yMm: number;
}

export interface DemoPublicEvaluation {
  readonly verdict: "HOLD" | "CLEAR";
  readonly evaluationId: string;
  readonly siteId: string;
  readonly safetyEnvelopeId: string;
  readonly safetyEnvelopeCommitment: string;
  readonly evaluatorVersion: string;
  readonly build: DemoPublicBuild;
  readonly fixtureScenarioCount: number;
  readonly violationCount: number;
  readonly reasons: readonly string[];
  readonly route: "unsafe" | "corrected";
  /** Public caller-supplied behavior points; private envelope geometry is not projected. */
  readonly routePoints: readonly DemoRoutePoint[];
}

export interface DemoCreEvidence {
  readonly source: "docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md";
  readonly unsafe: "HOLD";
  readonly corrected: "CLEAR";
  readonly tampered: "REJECT";
}

export interface DemoPublicData {
  readonly unsafe: DemoPublicEvaluation;
  readonly corrected: DemoPublicEvaluation;
  readonly creEvidence: DemoCreEvidence;
  readonly registryAddress: typeof DEMO_REGISTRY_ADDRESS;
  readonly registryUrl: typeof DEMO_REGISTRY_URL;
}

function publicBuild(
  label: DemoPublicBuild["label"],
  version: DemoPublicBuild["version"],
  descriptor: RobotBuildDescriptor,
): DemoPublicBuild {
  return Object.freeze({
    label,
    version,
    buildId: descriptor.robotBuildId,
    robotId: descriptor.robotId,
    artifactDigest: descriptor.artifactDigest,
    robotBuildDigest: digestRobotBuild(descriptor),
    descriptor,
  });
}

function publicReason(violation: RuleViolation): string {
  switch (violation.type) {
    case "restricted-zone":
      return "Restricted zone crossed";
    case "site-speed-limit":
    case "zone-speed-limit":
      return "Speed limit exceeded";
    case "payload-zone-restriction":
      return "Payload restriction violated";
  }
}

function publicRoutePoints(
  input: ReturnType<typeof createDeterministicDemoFixture>["unsafeFixtureBuild"],
): readonly DemoRoutePoint[] {
  const trace =
    input.behaviorTraces.traces.find(
      (candidate) => candidate.scenarioId === "scenario:restricted-route",
    ) ?? input.behaviorTraces.traces[0];
  if (trace === undefined) return Object.freeze([]);
  return Object.freeze(
    trace.steps.map((step) => Object.freeze({ xMm: step.position.xMm, yMm: step.position.yMm })),
  );
}

function projectEvaluation(
  build: DemoPublicBuild,
  input: ReturnType<typeof createDeterministicDemoFixture>["unsafeFixtureBuild"],
  fixture: ReturnType<typeof createDeterministicDemoFixture>,
  route: DemoPublicEvaluation["route"],
): DemoPublicEvaluation {
  const report = evaluateSimulation({
    ...input,
    confidentialEnvelope: fixture.confidentialEnvelope,
    envelopeBlindingSecret: fixture.envelopeBlindingSecret,
  });
  return Object.freeze({
    verdict: report.result.verdict === "CLEAR" ? "CLEAR" : "HOLD",
    evaluationId: report.result.evaluationId,
    siteId: report.result.inputs.siteId,
    safetyEnvelopeId: report.result.inputs.safetyEnvelopeId,
    safetyEnvelopeCommitment: report.result.inputs.safetyEnvelopeCommitment,
    evaluatorVersion: report.result.inputs.evaluatorVersion,
    build,
    fixtureScenarioCount: report.scenarioCount,
    violationCount: report.violationCount,
    reasons: Object.freeze(report.violations.map(publicReason)),
    route,
    routePoints: publicRoutePoints(input),
  });
}

/** Server-only projection of the existing P2 fixture and public P3-shaped result. */
export function createDemoPublicData(): DemoPublicData {
  const fixture = createDeterministicDemoFixture();
  const unsafeBuild = publicBuild("Build A", "4.7.20", fixture.unsafeFixtureBuild.robotBuild);
  const correctedBuild = publicBuild("Build B", "4.7.21", fixture.correctedFixtureBuild.robotBuild);
  return Object.freeze({
    unsafe: projectEvaluation(unsafeBuild, fixture.unsafeFixtureBuild, fixture, "unsafe"),
    corrected: projectEvaluation(
      correctedBuild,
      fixture.correctedFixtureBuild,
      fixture,
      "corrected",
    ),
    creEvidence: Object.freeze({
      source: "docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md",
      unsafe: "HOLD",
      corrected: "CLEAR",
      tampered: "REJECT",
    }),
    registryAddress: DEMO_REGISTRY_ADDRESS,
    registryUrl: DEMO_REGISTRY_URL,
  });
}
