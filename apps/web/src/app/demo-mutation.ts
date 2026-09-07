import {
  digestRobotBuild,
  parseRobotBuildDescriptor,
  type RobotBuildDescriptor,
} from "@preflight/domain";
import type { DemoPublicBuild } from "./demo-data";

export type MutatedDemoBuild = Omit<DemoPublicBuild, "version" | "descriptor"> & {
  readonly label: "Build B";
  readonly version: "4.7.22";
  readonly descriptor: RobotBuildDescriptor;
};

/** A deterministic controller artifact/build-id change; it never mutates the old clearance. */
export function mutateBuildForDemo(build: DemoPublicBuild): MutatedDemoBuild {
  const descriptor = parseRobotBuildDescriptor({
    ...build.descriptor,
    robotBuildId: "robot-build:corrected-v2",
    artifactDigest: `sha256:${"33".repeat(32)}`,
  });
  return Object.freeze({
    ...build,
    label: "Build B",
    version: "4.7.22",
    buildId: descriptor.robotBuildId,
    artifactDigest: descriptor.artifactDigest,
    robotBuildDigest: digestRobotBuild(descriptor),
    descriptor,
  });
}

export function shortDigest(digest: string): string {
  return `${digest.slice(0, 15)}…${digest.slice(-8)}`;
}
