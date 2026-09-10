import { existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { createP7DemoFixture, runP7DemoRehearsal } from "../apps/api/scripts/p7-demo-fixture.ts";
import { digestRobotBuild } from "../packages/domain/src/index.ts";

const repositoryRoot = resolve(import.meta.dirname, "..");
const demoDirectory = resolve(repositoryRoot, ".data", "rovaulta-demo");
const manifestPath = resolve(demoDirectory, "manifest.json");
const runPath = resolve(demoDirectory, "last-run.json");
const expectedRelativeDirectory = ".data/rovaulta-demo";

function assertDemoDirectory() {
  const actual = relative(repositoryRoot, demoDirectory).replaceAll("\\", "/");
  if (actual !== expectedRelativeDirectory) {
    throw new Error(`Refusing to operate outside the demo directory: ${actual}`);
  }
}

function resetDemo() {
  assertDemoDirectory();
  rmSync(demoDirectory, { recursive: true, force: true });
}

function publicManifest() {
  const fixture = createP7DemoFixture();
  return {
    schemaVersion: "rovaulta.p7-demo-manifest/v1",
    fixtureVersion: "p7-p2-fixture-v1",
    executionMode: "offline deterministic rehearsal",
    demoClock: "2026-09-07T10:00:00.000Z",
    evaluator: "@rovaulta/simulation-core deterministic fixture",
    externalExecution: {
      gemini: "not used",
      sepolia: "not used; local registry reader fixture",
      chainlinkCre: "recorded authenticated simulation evidence only",
      ledger: "handoff only; no signing or consumption",
      speculos: "not used by rehearsal",
    },
    scenarios: [
      {
        scenario: "A",
        siteId: fixture.unsafe.request.inputs.siteId,
        robotId: fixture.unsafe.request.inputs.robotId,
        robotBuildId: fixture.unsafe.robotBuild.robotBuildId,
        robotBuildDigest: fixture.unsafe.request.inputs.robotBuildDigest,
        expectedEvaluation: "HOLD",
        expectedAgentDecision: "HOLD",
      },
      {
        scenario: "B",
        siteId: fixture.corrected.request.inputs.siteId,
        robotId: fixture.corrected.request.inputs.robotId,
        robotBuildId: fixture.corrected.robotBuild.robotBuildId,
        robotBuildDigest: fixture.corrected.request.inputs.robotBuildDigest,
        clearanceId: fixture.clearance.clearanceId,
        expectedEvaluation: "CLEAR",
        expectedAgentDecision: "LEDGER_APPROVAL_REQUIRED",
        expectedLedgerState: "AWAITING_HUMAN",
      },
      {
        scenario: "C",
        siteId: fixture.corrected.request.inputs.siteId,
        robotId: fixture.corrected.request.inputs.robotId,
        robotBuildId: fixture.mutatedBuild.robotBuildId,
        robotBuildDigest: digestRobotBuild(fixture.mutatedBuild),
        expectedEvaluation: "CLEAR baseline; mutation blocks before re-evaluation",
        expectedAgentDecision: "CLEARANCE_BINDING_MISMATCH",
        expectedLedgerState: "NOT_REQUESTED",
      },
    ],
  };
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

async function runRehearsal() {
  assertDemoDirectory();
  if (!existsSync(manifestPath)) {
    throw new Error("P7 demo is not prepared; run `bun run demo:setup` first");
  }
  const traces = await runP7DemoRehearsal();
  const output = {
    evidenceType: "P7 offline deterministic demo rehearsal",
    executionMode:
      "scripted model + deterministic registry fixture; not live Gemini, Sepolia, CRE, Ledger, or Speculos",
    demoClock: "2026-09-07T10:00:00.000Z",
    scenarios: traces,
  };
  const serialized = JSON.stringify(output);
  for (const forbidden of [
    "confidentialEnvelope",
    "envelopeBlindingSecret",
    "warehouseBounds",
    "payloadGreaterThanGrams",
    "private safety envelope",
  ]) {
    if (serialized.includes(forbidden)) throw new Error(`P7 public output leaked ${forbidden}`);
  }
  writeJson(runPath, output);
  console.log(JSON.stringify(output, null, 2));
}

async function prepare() {
  resetDemo();
  assertDemoDirectory();
  mkdirSync(demoDirectory, { recursive: true });
  writeJson(manifestPath, publicManifest());
  await runRehearsal();
  console.log(`P7 demo prepared under ${expectedRelativeDirectory}`);
}

const command = process.argv[2] ?? "help";
if (command === "reset") {
  resetDemo();
  console.log("P7 demo reset: .data/rovaulta-demo removed (idempotent).\n");
} else if (command === "prepare" || command === "setup") {
  await prepare();
} else if (command === "run" || command === "rehearse") {
  await runRehearsal();
} else {
  console.log(
    [
      "P7 deterministic demo commands:",
      "  bun run demo:setup   reset, seed, and run the offline rehearsal",
      "  bun run demo:reset   remove only .data/rovaulta-demo (safe to repeat)",
      "  bun run demo:run     repeat the prepared offline A/B/C rehearsal",
    ].join("\n"),
  );
}
