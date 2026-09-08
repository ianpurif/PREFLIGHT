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
  digestRobotBuild,
  parseClearanceId,
  parseClearanceRecord,
  parseDeploymentNonce,
  parseRobotBuildDescriptor,
  parseUnixTimestamp,
  type RobotBuildDescriptor,
} from "@rovaulta/domain";
import {
  createDeterministicDemoFixture,
  type DemoEvaluationCase,
  type DeterministicDemoFixture,
  evaluateSimulation,
} from "@rovaulta/simulation-core";
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

/** Fixed wall-clock value used only by the offline rehearsal. */
export const P7_DEMO_CLOCK = "2026-09-07T10:00:00.000Z" as const;
export const P7_DEMO_BLOCK_TIMESTAMP = "1788774200" as const;
export const P7_DEMO_CAPTURED_AT = P7_DEMO_CLOCK;
export const P7_DEMO_NONCE = "p7-demo-fixed-nonce-b" as const;
/** Public test identity only; the rehearsal never signs or consumes an intent. */
export const P7_DEMO_SIGNER = "0xaA5768d0f2157F8781efb975CDd9aec99e7879E3" as const;

export type P7ScenarioKey = "A" | "B" | "C";

export interface P7DemoFixture {
  readonly source: DeterministicDemoFixture;
  readonly unsafe: DemoEvaluationCase;
  readonly corrected: DemoEvaluationCase;
  readonly mutatedBuild: RobotBuildDescriptor;
  readonly clearance: ClearanceRecord;
  readonly catalog: DeploymentCatalog;
}

export interface P7PublicAgentTrace {
  readonly scenario: P7ScenarioKey;
  readonly status: "BLOCKED" | "LEDGER_APPROVAL_REQUIRED";
  readonly decision: "HOLD" | "LEDGER_APPROVAL_REQUIRED" | "CLEARANCE_BINDING_MISMATCH";
  readonly siteId: string;
  readonly robotId: string;
  readonly robotBuildId: string;
  readonly robotBuildDigest: string;
  readonly clearanceId?: string | undefined;
  readonly clearanceDigest?: string | undefined;
  readonly protocolIntentDigest?: string | undefined;
  readonly typedDataDigest?: string | undefined;
  readonly expiresAt?: string | undefined;
  readonly ledgerAuthorizationStatus: "NOT_REQUESTED" | "AWAITING_HUMAN";
  readonly toolOrder: readonly string[];
}

export interface P7PublicScenarioTrace {
  readonly scenario: P7ScenarioKey;
  readonly siteId: string;
  readonly robotId: string;
  readonly robotBuildId: string;
  readonly robotBuildDigest: string;
  readonly evaluationVerdict: "HOLD" | "CLEAR";
  readonly evaluationId: string;
  readonly clearanceState: "NONE" | "LOCAL_DETERMINISTIC_FIXTURE";
  readonly agent: P7PublicAgentTrace;
  readonly ledgerHandoff: "NOT_REQUESTED" | "PREPARED_EXACT_REQUEST";
  readonly creEvidence: "HOLD" | "CLEAR" | "NOT_RUN_BINDING_MISMATCH";
}

function buildFromCase(input: DemoEvaluationCase): RobotBuildDescriptor {
  return input.robotBuild;
}

function createMutatedBuild(build: RobotBuildDescriptor): RobotBuildDescriptor {
  return parseRobotBuildDescriptor({
    ...build,
    robotBuildId: "robot-build:corrected-v2",
    artifactDigest: `sha256:${"33".repeat(32)}`,
  });
}

function createClearance(corrected: DemoEvaluationCase): ClearanceRecord {
  return parseClearanceRecord({
    schemaVersion: CLEARANCE_RECORD_SCHEMA_VERSION,
    clearanceId: parseClearanceId("clearance:demo-corrected"),
    evaluationId: corrected.request.evaluationId,
    inputs: corrected.request.inputs,
    evaluationInputsDigest: digestEvaluationInputs(corrected.request.inputs),
    verdict: "CLEAR",
    issuedAt: parseUnixTimestamp("1788774000"),
    expiresAt: parseUnixTimestamp("1893456000"),
  });
}

class P7DemoRegistryReader implements ClearanceRegistryReader {
  async readExactClearance(record: ClearanceRecord): Promise<ClearanceRegistrySnapshot> {
    const requested = clearanceRecordToTransport(record);
    return {
      chainId: 11_155_111,
      registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
      blockNumber: 11_700_000n,
      blockHash: `0x${"ab".repeat(32)}`,
      blockTimestamp: parseUnixTimestamp(P7_DEMO_BLOCK_TIMESTAMP),
      requested,
      stored: {
        ...requested,
        verdict: VERDICT_CLEAR_BYTES32,
        issuer: P7_DEMO_SIGNER,
        revoked: false,
        exists: true,
      },
      exactMatch: true,
    };
  }
}

class P7ScriptedModel implements DeploymentAgentModel {
  readonly provider = "deterministic-p7-rehearsal";
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
          ? {
              siteRef: "demo-warehouse",
              robotRef: "demo-amr-01",
              buildRef: this.#buildRef,
            }
          : {},
    };
  }
}

function catalogEntry(options: {
  key: string;
  buildAlias: string;
  build: RobotBuildDescriptor;
  evaluationId: string;
  verdict: "CLEAR" | "HOLD";
  clearance: ClearanceRecord | null;
}) {
  return {
    key: options.key,
    aliases: {
      site: ["demo-warehouse", "site:demo-warehouse"],
      robot: ["demo-amr-01", "robot:demo-amr-01"],
      build: [options.buildAlias, options.build.robotBuildId],
    },
    target: {
      siteId: "site:demo-warehouse",
      robotId: options.build.robotId,
      robotBuildId: options.build.robotBuildId,
      robotBuildDigest: digestRobotBuild(options.build),
    },
    evaluation: { evaluationId: options.evaluationId, verdict: options.verdict },
    clearance: options.clearance,
  };
}

export function createP7DemoFixture(): P7DemoFixture {
  const source = createDeterministicDemoFixture();
  const unsafe = source.unsafeFixtureBuild;
  const corrected = source.correctedFixtureBuild;
  const mutatedBuild = createMutatedBuild(buildFromCase(corrected));
  const clearance = createClearance(corrected);
  const catalog = new DeploymentCatalog([
    catalogEntry({
      key: "build-a",
      buildAlias: "build a",
      build: unsafe.robotBuild,
      evaluationId: unsafe.request.evaluationId,
      verdict: "HOLD",
      clearance: null,
    }),
    catalogEntry({
      key: "build-b",
      buildAlias: "build b",
      build: corrected.robotBuild,
      evaluationId: corrected.request.evaluationId,
      verdict: "CLEAR",
      clearance,
    }),
    catalogEntry({
      key: "build-c",
      buildAlias: "mutated build",
      build: mutatedBuild,
      evaluationId: corrected.request.evaluationId,
      verdict: "CLEAR",
      clearance,
    }),
  ]);
  return Object.freeze({ source, unsafe, corrected, mutatedBuild, clearance, catalog });
}

function publicAgentTrace(
  scenario: P7ScenarioKey,
  result: Awaited<ReturnType<DeploymentAgent["run"]>>,
): P7PublicAgentTrace {
  const target = result.audit.target;
  if (target === undefined) throw new Error(`P7 scenario ${scenario} did not resolve a target`);
  if (result.status !== "BLOCKED" && result.status !== "LEDGER_APPROVAL_REQUIRED") {
    throw new Error(`P7 scenario ${scenario} reached an unexpected release status`);
  }
  if (
    result.audit.ledgerAuthorizationStatus !== "NOT_REQUESTED" &&
    result.audit.ledgerAuthorizationStatus !== "AWAITING_HUMAN"
  ) {
    throw new Error(`P7 scenario ${scenario} reached an unexpected Ledger status`);
  }
  const expectedPolicy = {
    A: "EVALUATION_HOLD",
    B: "PREPARED",
    C: "CLEARANCE_BINDING_MISMATCH",
  }[scenario];
  if (result.audit.policyResult !== expectedPolicy) {
    throw new Error(`P7 scenario ${scenario} reached an unexpected policy result`);
  }
  const prepared = result.prepared;
  const intent = prepared?.intent;
  return Object.freeze({
    scenario,
    status: result.status,
    decision:
      scenario === "A"
        ? "HOLD"
        : scenario === "C"
          ? "CLEARANCE_BINDING_MISMATCH"
          : "LEDGER_APPROVAL_REQUIRED",
    siteId: target.siteId,
    robotId: target.robotId,
    robotBuildId: target.robotBuildId,
    robotBuildDigest: target.robotBuildDigest,
    clearanceId: intent?.clearanceId,
    clearanceDigest: intent?.clearanceDigest,
    protocolIntentDigest: prepared?.protocolIntentDigest,
    typedDataDigest: prepared?.typedDataDigest,
    expiresAt: intent?.expiresAt,
    ledgerAuthorizationStatus: result.audit.ledgerAuthorizationStatus,
    toolOrder: Object.freeze(result.audit.toolCalls.map((call) => call.tool)),
  });
}

async function runAgentCase(
  fixture: P7DemoFixture,
  scenario: P7ScenarioKey,
  buildAlias: string,
): Promise<P7PublicAgentTrace> {
  const entry = fixture.catalog.resolve({
    siteRef: "demo-warehouse",
    robotRef: "demo-amr-01",
    buildRef: buildAlias,
  });
  const store = new SqliteReleaseStore(":memory:");
  const releaseService = new ReleaseService({
    reader: new P7DemoRegistryReader(),
    store,
    signers: new AuthorizedSignerPolicy([P7_DEMO_SIGNER]),
    intentTtlSeconds: 300,
    nonceFactory: () => parseDeploymentNonce(P7_DEMO_NONCE),
  });
  try {
    const agent = new DeploymentAgent({
      model: new P7ScriptedModel(buildAlias),
      catalog: fixture.catalog,
      reader: new P7DemoRegistryReader(),
      releaseService,
      clock: () => new Date(P7_DEMO_CLOCK),
      idFactory: () => `attempt:p7-${scenario.toLowerCase()}`,
    });
    const request = fixture.catalog.formatPublicRequest(entry);
    const result = await agent.run({ request, signerAddress: P7_DEMO_SIGNER });
    return publicAgentTrace(scenario, result);
  } finally {
    releaseService.close();
  }
}

export async function runP7DemoRehearsal(): Promise<readonly P7PublicScenarioTrace[]> {
  const fixture = createP7DemoFixture();
  const unsafeReport = evaluateSimulation({
    ...fixture.unsafe,
    confidentialEnvelope: fixture.source.confidentialEnvelope,
    envelopeBlindingSecret: fixture.source.envelopeBlindingSecret,
  });
  const correctedReport = evaluateSimulation({
    ...fixture.corrected,
    confidentialEnvelope: fixture.source.confidentialEnvelope,
    envelopeBlindingSecret: fixture.source.envelopeBlindingSecret,
  });
  const [agentA, agentB, agentC] = await Promise.all([
    runAgentCase(fixture, "A", "build a"),
    runAgentCase(fixture, "B", "build b"),
    runAgentCase(fixture, "C", "mutated build"),
  ]);
  if (agentA === undefined || agentB === undefined || agentC === undefined) {
    throw new Error("P7 rehearsal did not produce all three scenarios");
  }
  if (agentB.robotBuildDigest === agentC.robotBuildDigest) {
    throw new Error("P7 mutation did not change the canonical build digest");
  }
  if (unsafeReport.result.verdict !== "HOLD" || correctedReport.result.verdict !== "CLEAR") {
    throw new Error("P7 evaluator fixture did not produce the canonical A/B verdicts");
  }
  return Object.freeze([
    Object.freeze({
      scenario: "A",
      siteId: fixture.unsafe.request.inputs.siteId,
      robotId: fixture.unsafe.request.inputs.robotId,
      robotBuildId: fixture.unsafe.robotBuild.robotBuildId,
      robotBuildDigest: fixture.unsafe.request.inputs.robotBuildDigest,
      evaluationVerdict: "HOLD",
      evaluationId: unsafeReport.result.evaluationId,
      clearanceState: "NONE",
      agent: agentA,
      ledgerHandoff: "NOT_REQUESTED",
      creEvidence: "HOLD",
    }),
    Object.freeze({
      scenario: "B",
      siteId: fixture.corrected.request.inputs.siteId,
      robotId: fixture.corrected.request.inputs.robotId,
      robotBuildId: fixture.corrected.robotBuild.robotBuildId,
      robotBuildDigest: fixture.corrected.request.inputs.robotBuildDigest,
      evaluationVerdict: "CLEAR",
      evaluationId: correctedReport.result.evaluationId,
      clearanceState: "LOCAL_DETERMINISTIC_FIXTURE",
      agent: agentB,
      ledgerHandoff: "PREPARED_EXACT_REQUEST",
      creEvidence: "CLEAR",
    }),
    Object.freeze({
      scenario: "C",
      siteId: fixture.corrected.request.inputs.siteId,
      robotId: fixture.corrected.request.inputs.robotId,
      robotBuildId: fixture.mutatedBuild.robotBuildId,
      robotBuildDigest: digestRobotBuild(fixture.mutatedBuild),
      evaluationVerdict: "CLEAR",
      evaluationId: correctedReport.result.evaluationId,
      clearanceState: "LOCAL_DETERMINISTIC_FIXTURE",
      agent: agentC,
      ledgerHandoff: "NOT_REQUESTED",
      creEvidence: "NOT_RUN_BINDING_MISMATCH",
    }),
  ]);
}
