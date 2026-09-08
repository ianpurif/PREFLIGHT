import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { ViemClearanceRegistryReader } from "@rovaulta/chain-client";
import { clearanceFixture } from "../../../packages/chain-client/test/fixtures.js";
import {
  DeploymentAgent,
  type DeploymentAgentModel,
  type DeploymentAgentModelTurn,
  type DeploymentAgentToolCall,
  DeploymentCatalog,
} from "../src/agent/index.js";
import {
  AuthorizedSignerPolicy,
  ReleaseService,
  SqliteReleaseStore,
} from "../src/release/index.js";

const SPECULOS_PUBLIC_TEST_SIGNER = "0xDad77910DbDFdE764fC21FCD4E74D71bBACA6D8D";

class LiveReadEvidenceModel implements DeploymentAgentModel {
  readonly provider = "deterministic-evidence-model";
  readonly model = "scripted-tool-calls-v1";

  async callTool(turn: DeploymentAgentModelTurn): Promise<DeploymentAgentToolCall> {
    return {
      name: turn.expectedTool.name,
      arguments:
        turn.expectedTool.name === "resolveDeploymentTarget"
          ? { siteRef: "warehouse-a", robotRef: "picker-01", buildRef: "release-001" }
          : {},
    };
  }
}

const rpcUrl = process.env.EVM_RPC_URL || process.env.SEPOLIA_RPC_URL;
if (!rpcUrl) throw new Error("EVM_RPC_URL or SEPOLIA_RPC_URL is required");
const temporaryRoot = mkdtempSync(join(tmpdir(), "rovaulta-p52-agent-live-read-"));
const reader = new ViemClearanceRegistryReader(rpcUrl);
const releaseService = new ReleaseService({
  reader,
  store: new SqliteReleaseStore(join(temporaryRoot, "release.sqlite")),
  signers: new AuthorizedSignerPolicy([SPECULOS_PUBLIC_TEST_SIGNER]),
});
const catalog = new DeploymentCatalog([
  {
    key: "existing-p5-unregistered-fixture",
    aliases: { site: ["warehouse-a"], robot: ["picker-01"], build: ["release-001"] },
    target: {
      siteId: clearanceFixture.inputs.siteId,
      robotId: clearanceFixture.inputs.robotId,
      robotBuildId: clearanceFixture.inputs.robotBuildId,
      robotBuildDigest: clearanceFixture.inputs.robotBuildDigest,
    },
    evaluation: { evaluationId: clearanceFixture.evaluationId, verdict: "CLEAR" },
    clearance: clearanceFixture,
  },
]);

try {
  const agent = new DeploymentAgent({
    model: new LiveReadEvidenceModel(),
    catalog,
    reader,
    releaseService,
  });
  const result = await agent.run({
    request: "Prepare picker-01 release-001 for warehouse-a",
    signerAddress: SPECULOS_PUBLIC_TEST_SIGNER,
  });
  process.stdout.write(
    `${JSON.stringify(
      {
        evidenceType: "P5.2 agent live Sepolia read",
        executionMode: "scripted model orchestration + live read-only Sepolia registry",
        capturedAt: new Date().toISOString(),
        expectedCurrentState: "existing fixture is deliberately unregistered",
        result,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  releaseService.close();
  rmSync(temporaryRoot, { recursive: true, force: true });
}
