import { describe, expect, test } from "bun:test";
import { createDemoPublicData } from "./demo-data";
import { mutateBuildForDemo } from "./demo-mutation";

describe("P6 build mutation", () => {
  test("changes the canonical build identity without changing the cleared build", () => {
    const demo = createDemoPublicData();
    const mutated = mutateBuildForDemo(demo.corrected.build);

    expect(mutated.version).toBe("4.7.22");
    expect(mutated.buildId).not.toBe(demo.corrected.build.buildId);
    expect(mutated.robotBuildDigest).not.toBe(demo.corrected.build.robotBuildDigest);
    expect(demo.corrected.build.robotBuildDigest).not.toBe(mutated.robotBuildDigest);
  });

  test("keeps the public projection free of confidential fixture fields", () => {
    const serialized = JSON.stringify(createDemoPublicData());

    expect(serialized).not.toContain("envelopeBlindingSecret");
    expect(serialized).not.toContain("confidentialEnvelope");
    expect(serialized).not.toContain("warehouseBounds");
    expect(serialized).not.toContain("payloadGreaterThanGrams");
    expect(serialized).not.toContain('"rules":');
  });
});
