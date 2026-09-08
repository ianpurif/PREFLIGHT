import {
  type ClearanceRegistryReader,
  type ClearanceRegistrySnapshot,
  clearanceRecordToTransport,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
  VERDICT_CLEAR_BYTES32,
} from "@rovaulta/chain-client";
import {
  CLEARANCE_RECORD_SCHEMA_VERSION,
  type ClearanceRecord,
  digestEvaluationInputs,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  parseClearanceId,
  parseClearanceRecord,
  parseEvaluationId,
  parseEvaluatorVersionId,
  parseRobotBuildDigest,
  parseRobotBuildId,
  parseRobotId,
  parseSafetyEnvelopeCommitment,
  parseSafetyEnvelopeId,
  parseSiteId,
  parseUnixTimestamp,
} from "@rovaulta/domain";
import { privateKeyToAccount } from "viem/accounts";
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

const evidenceAccount = privateKeyToAccount(`0x${"01".repeat(32)}`);
const inputs = {
  schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
  siteId: parseSiteId("site:warehouse-manila-01"),
  robotId: parseRobotId("robot:amr-17"),
  robotBuildId: parseRobotBuildId("robot-build:amr-17-v4.7.21"),
  robotBuildDigest: parseRobotBuildDigest(`sha256:${"11".repeat(32)}`),
  safetyEnvelopeId: parseSafetyEnvelopeId("safety-envelope:warehouse-manila-01"),
  safetyEnvelopeCommitment: parseSafetyEnvelopeCommitment(`sha256:${"22".repeat(32)}`),
  evaluatorVersion: parseEvaluatorVersionId("evaluator-version:p2-v1"),
} as const;
const clearance = parseClearanceRecord({
  schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
  clearanceId: parseClearanceId("clearance:amr-17-build-b"),
  evaluationId: parseEvaluationId("evaluation:amr-17-build-b"),
  inputs,
  evaluationInputsDigest: digestEvaluationInputs(inputs),
  verdict: "CLEAR",
  issuedAt: parseUnixTimestamp("1788774000"),
  expiresAt: parseUnixTimestamp("1893456000"),
});

const sharedAliases = {
  site: ["warehouse manila-01"],
  robot: ["amr-17"],
};
const catalog = new DeploymentCatalog([
  {
    key: "build-b",
    aliases: { ...sharedAliases, build: ["v4.7.21"] },
    target: {
      siteId: inputs.siteId,
      robotId: inputs.robotId,
      robotBuildId: inputs.robotBuildId,
      robotBuildDigest: inputs.robotBuildDigest,
    },
    evaluation: { evaluationId: clearance.evaluationId, verdict: "CLEAR" },
    clearance,
  },
  {
    key: "build-a",
    aliases: { ...sharedAliases, build: ["unsafe build a"] },
    target: {
      siteId: inputs.siteId,
      robotId: inputs.robotId,
      robotBuildId: "robot-build:amr-17-unsafe-a",
      robotBuildDigest: `sha256:${"aa".repeat(32)}`,
    },
    evaluation: { evaluationId: "evaluation:amr-17-build-a", verdict: "HOLD" },
    clearance: null,
  },
  {
    key: "build-c",
    aliases: { ...sharedAliases, build: ["mutated build c"] },
    target: {
      siteId: inputs.siteId,
      robotId: inputs.robotId,
      robotBuildId: "robot-build:amr-17-mutated-c",
      robotBuildDigest: `sha256:${"33".repeat(32)}`,
    },
    evaluation: { evaluationId: clearance.evaluationId, verdict: "CLEAR" },
    clearance,
  },
]);

class EvidenceModel implements DeploymentAgentModel {
  readonly provider = "deterministic-evidence-model";
  readonly model = "scripted-tool-calls-v1";
  readonly #buildRef: string;

  constructor(buildRef: string) {
    this.#buildRef = buildRef;
  }

  async callTool(turn: DeploymentAgentModelTurn): Promise<DeploymentAgentToolCall> {
    return {
      name: turn.expectedTool.name,
      arguments:
        turn.expectedTool.name === "resolveDeploymentTarget"
          ? { siteRef: "Warehouse Manila-01", robotRef: "AMR-17", buildRef: this.#buildRef }
          : {},
    };
  }
}

class EvidenceReader implements ClearanceRegistryReader {
  async readExactClearance(record: ClearanceRecord): Promise<ClearanceRegistrySnapshot> {
    const requested = clearanceRecordToTransport(record);
    return {
      chainId: 11_155_111,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
      blockNumber: 11_700_000n,
      blockHash: `0x${"ab".repeat(32)}`,
      blockTimestamp: parseUnixTimestamp("1788774200"),
      requested,
      stored: {
        ...requested,
        verdict: VERDICT_CLEAR_BYTES32,
        issuer: "0xaA5768d0f2157F8781efb975CDd9aec99e7879E3",
        revoked: false,
        exists: true,
      },
      exactMatch: true,
    };
  }
}

async function runCase(label: string, buildRef: string, request: string) {
  const store = new SqliteReleaseStore(":memory:");
  const reader = new EvidenceReader();
  const releaseService = new ReleaseService({
    reader,
    store,
    signers: new AuthorizedSignerPolicy([evidenceAccount.address]),
    intentTtlSeconds: 300,
  });
  try {
    const agent = new DeploymentAgent({
      model: new EvidenceModel(buildRef),
      catalog,
      reader,
      releaseService,
      clock: () => new Date("2026-09-07T10:00:00.000Z"),
      idFactory: () => `attempt:p52-${label.toLowerCase()}`,
    });
    const result = await agent.run({ request, signerAddress: evidenceAccount.address });
    return { label, status: result.status, explanation: result.explanation, audit: result.audit };
  } finally {
    releaseService.close();
  }
}

const traces = await Promise.all([
  runCase("A", "unsafe build a", "Prepare AMR-17 unsafe Build A for Warehouse Manila-01"),
  runCase("B", "v4.7.21", "Deploy AMR-17 v4.7.21 to Warehouse Manila-01"),
  runCase("C", "mutated build c", "Deploy mutated Build C for AMR-17 to Warehouse Manila-01"),
]);

console.log(
  JSON.stringify(
    {
      evidenceType: "P5.2 local deterministic deployment-agent integration",
      executionMode: "scripted model + deterministic registry fixture; not live Sepolia or Ledger",
      productionLedgerPath: "WebHID remains external explicit human action",
      speculosPath: "development/test only; not exercised by this evidence",
      traces,
    },
    null,
    2,
  ),
);
