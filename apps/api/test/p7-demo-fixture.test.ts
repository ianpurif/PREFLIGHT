import { describe, expect, test } from "bun:test";
import { createP7DemoFixture, runP7DemoRehearsal } from "../scripts/p7-demo-fixture.js";

describe("P7 offline deterministic demo fixture", () => {
  test("repeats the authoritative A/B/C public trace byte-for-byte", async () => {
    const first = await runP7DemoRehearsal();
    const second = await runP7DemoRehearsal();

    expect(JSON.stringify(first)).toBe(JSON.stringify(second));
    expect(first.map((scenario) => scenario.agent.decision)).toEqual([
      "HOLD",
      "LEDGER_APPROVAL_REQUIRED",
      "CLEARANCE_BINDING_MISMATCH",
    ]);
    expect(first[0]?.evaluationVerdict).toBe("HOLD");
    expect(first[1]?.evaluationVerdict).toBe("CLEAR");
    expect(first[1]?.ledgerHandoff).toBe("PREPARED_EXACT_REQUEST");
    expect(first[1]?.agent.ledgerAuthorizationStatus).toBe("AWAITING_HUMAN");
    expect(first[2]?.ledgerHandoff).toBe("NOT_REQUESTED");
    expect(first[2]?.creEvidence).toBe("NOT_RUN_BINDING_MISMATCH");
    expect(first[1]?.robotBuildDigest).not.toBe(first[2]?.robotBuildDigest);
    expect(JSON.stringify(first)).not.toContain("confidentialEnvelope");
    expect(JSON.stringify(first)).not.toContain("envelopeBlindingSecret");
  });

  test("binds the mutation to the corrected build without changing the clearance", () => {
    const fixture = createP7DemoFixture();
    expect(fixture.mutatedBuild.robotBuildId).not.toBe(fixture.corrected.robotBuild.robotBuildId);
    expect(fixture.mutatedBuild.artifactDigest).not.toBe(
      fixture.corrected.robotBuild.artifactDigest,
    );
    expect(fixture.clearance.inputs.robotBuildId).toBe(fixture.corrected.robotBuild.robotBuildId);
    expect(fixture.clearance.inputs.robotBuildDigest).toBe(
      fixture.corrected.request.inputs.robotBuildDigest,
    );
  });
});
