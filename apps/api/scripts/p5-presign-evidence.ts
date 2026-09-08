import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { clearanceFixture } from "../../../packages/chain-client/test/fixtures.js";
import { createReleaseServiceFromEnvironment } from "../src/release/index.js";
import { buildServer } from "../src/server.js";

const SPECULOS_SIGNER = "0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D";
const temporaryRoot = mkdtempSync(join(tmpdir(), "rovaulta-p5-presign-"));
const service = createReleaseServiceFromEnvironment({
  ...process.env,
  ROVAULTA_AUTHORIZED_SIGNERS: SPECULOS_SIGNER,
  ROVAULTA_RELEASE_DB_PATH: join(temporaryRoot, "release.sqlite"),
});
const app = buildServer({ releaseService: service });
const exactProposal = Object.freeze({
  siteId: clearanceFixture.inputs.siteId,
  robotId: clearanceFixture.inputs.robotId,
  robotBuildId: clearanceFixture.inputs.robotBuildId,
  robotBuildDigest: clearanceFixture.inputs.robotBuildDigest,
  clearance: clearanceFixture,
  signerAddress: SPECULOS_SIGNER,
});

async function runCase(label: "C" | "D", proposal: Record<string, unknown>) {
  const response = await app.inject({
    method: "POST",
    url: "/release/prepare",
    payload: proposal,
  });
  return Object.freeze({
    case: label,
    statusCode: response.statusCode,
    result: JSON.parse(response.body) as unknown,
    signingRequested: false,
  });
}

try {
  const caseC = await runCase("C", {
    ...exactProposal,
    robotBuildId: "robot-build:release-002",
  });
  const caseD = await runCase("D", exactProposal);
  process.stdout.write(
    `${JSON.stringify(
      {
        evidenceClass: "P5 pre-sign fail-closed API execution",
        capturedAt: new Date().toISOString(),
        network: "sepolia",
        signerAddress: SPECULOS_SIGNER,
        cases: [caseC, caseD],
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await app.close();
  rmSync(temporaryRoot, { recursive: true, force: true });
}
