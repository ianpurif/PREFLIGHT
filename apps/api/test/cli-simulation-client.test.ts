import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  CRE_PUBLIC_RESULT_VERSION,
  type CrePublicEvaluationRequest,
  type CrePublicEvaluationSuccess,
  digestBehaviorInput,
  SYNTHETIC_TRACE_PROVENANCE,
} from "@rovaulta/chainlink-cre/protocol";
import { PROTOCOL_VERSION } from "@rovaulta/domain";
import { createDeterministicDemoFixture, evaluateSimulation } from "@rovaulta/simulation-core";
import { CreCliSimulationEvaluationClient } from "../src/evaluation/index.js";

describe("official CRE CLI simulation executor", () => {
  test("validates and returns an account-shaped public CLEAR result with provenance", async () => {
    const fixture = createDeterministicDemoFixture();
    let simulationEnvironmentPath: string | undefined;
    let temporaryWorkflowPath: string | undefined;
    const client = new CreCliSimulationEvaluationClient({
      environment: {
        ...process.env,
        ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON: "parent-secret-must-not-pass",
        ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_fake: "parent-site-secret-must-not-pass",
        UNSAFE_SERVICE_TOKEN: "parent-service-token-must-not-pass",
        CRE_API_KEY: "operator-api-key",
      },
      run: (_executable, args, options) => {
        if (args.length === 1 && args[0] === "-v") {
          return { status: 0, stdout: "cre version v1.32.0", stderr: "" };
        }
        if (args.length === 1 && args[0] === "whoami") {
          expect(options.env.UNSAFE_SERVICE_TOKEN).toBeUndefined();
          expect(options.env.CRE_API_KEY).toBe("operator-api-key");
          return { status: 0, stdout: "authenticated", stderr: "" };
        }
        const environmentPath = args[args.indexOf("-e") + 1];
        const payloadPathValue = args[args.indexOf("--http-payload") + 1];
        const workflowPath = args[args.indexOf("simulate") + 1];
        if (
          payloadPathValue === undefined ||
          environmentPath === undefined ||
          workflowPath === undefined
        ) {
          return { status: 1, stdout: "", stderr: "missing simulation paths" };
        }
        simulationEnvironmentPath = resolve(options.cwd, environmentPath);
        temporaryWorkflowPath = resolve(options.cwd, workflowPath);
        expect(options.env.ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON).toBeUndefined();
        expect(options.env.ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_site_fake).toBeUndefined();
        expect(options.env.UNSAFE_SERVICE_TOKEN).toBeUndefined();
        expect(options.env.CRE_API_KEY).toBe("operator-api-key");
        const payload = JSON.parse(
          readFileSync(resolve(options.cwd, payloadPathValue), "utf8"),
        ) as CrePublicEvaluationRequest;
        const workflow = readFileSync(resolve(temporaryWorkflowPath, "workflow.yaml"), "utf8");
        const secrets = readFileSync(resolve(temporaryWorkflowPath, "secrets.yaml"), "utf8");
        expect(workflow).toContain("workflow-path:");
        expect(workflow).toContain("config-path:");
        expect(workflow).toContain('workflow-path: "integrations/chainlink-cre/src/main.ts"');
        expect(workflow).toContain('config-path: "integrations/chainlink-cre/config.staging.json"');
        expect(existsSync(resolve(options.cwd, "integrations/chainlink-cre/src/main.ts"))).toBe(
          true,
        );
        expect(
          existsSync(resolve(options.cwd, "integrations/chainlink-cre/config.staging.json")),
        ).toBe(true);
        expect(workflow).toContain('secrets-path: "./secrets.yaml"');
        expect(secrets).toContain(payload.confidentialInputSecretId ?? "missing-secret-selector");
        expect(secrets).toContain("ROVAULTA_CONFIDENTIAL_EVALUATION_INPUT_JSON");
        const report = evaluateSimulation({
          request: payload.request,
          robotBuild: payload.robotBuild,
          confidentialEnvelope: fixture.confidentialEnvelope,
          envelopeBlindingSecret: fixture.envelopeBlindingSecret,
          behaviorTraces: payload.behaviorTraces,
          evaluatedAt: payload.evaluatedAt,
        });
        const response: CrePublicEvaluationSuccess = {
          schemaVersion: CRE_PUBLIC_RESULT_VERSION,
          protocolVersion: PROTOCOL_VERSION,
          status: "EVALUATED",
          result: report.result,
          behaviorInputDigest: digestBehaviorInput({
            schemaVersion: payload.schemaVersion,
            protocolVersion: payload.protocolVersion,
            ...(payload.confidentialInputSecretId === undefined
              ? {}
              : { confidentialInputSecretId: payload.confidentialInputSecretId }),
            request: payload.request,
            robotBuild: payload.robotBuild,
            behaviorTraces: payload.behaviorTraces,
            traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
            evaluatedAt: payload.evaluatedAt,
          }),
          traceProvenance: SYNTHETIC_TRACE_PROVENANCE,
        };
        return { status: 0, stdout: JSON.stringify(response), stderr: "" };
      },
    });
    const result = await client.evaluate({
      request: fixture.correctedFixtureBuild.request,
      robotBuild: fixture.correctedFixtureBuild.robotBuild,
      confidentialEnvelope: fixture.confidentialEnvelope,
      envelopeBlindingSecret: fixture.envelopeBlindingSecret,
      behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
      evaluatedAt: fixture.correctedFixtureBuild.evaluatedAt,
    });

    expect(result.result.verdict).toBe("CLEAR");
    expect(result.executionMode).toBe("official-cre-cli-simulation");
    expect(result.creCliVersion).toBe("1.32.0");
    if (simulationEnvironmentPath === undefined)
      throw new Error("simulation env path was not captured");
    expect(existsSync(simulationEnvironmentPath)).toBe(false);
    expect(existsSync(dirname(simulationEnvironmentPath))).toBe(false);
    if (temporaryWorkflowPath === undefined) throw new Error("workflow path was not captured");
    expect(existsSync(temporaryWorkflowPath)).toBe(false);
  });

  test("rejects confidential output and still removes temporary material", async () => {
    const fixture = createDeterministicDemoFixture();
    let simulationEnvironmentPath: string | undefined;
    const client = new CreCliSimulationEvaluationClient({
      run: (_executable, args, options) => {
        if (args.length === 1 && args[0] === "-v") {
          return { status: 0, stdout: "cre version v1.32.0", stderr: "" };
        }
        if (args.length === 1 && args[0] === "whoami") {
          return { status: 0, stdout: "authenticated", stderr: "" };
        }
        const environmentPath = args[args.indexOf("-e") + 1];
        if (environmentPath !== undefined) {
          simulationEnvironmentPath = resolve(options.cwd, environmentPath);
        }
        return {
          status: 0,
          stdout: '{"maximumMmPerSecond":600}',
          stderr: "",
        };
      },
    });

    await expect(
      client.evaluate({
        request: fixture.correctedFixtureBuild.request,
        robotBuild: fixture.correctedFixtureBuild.robotBuild,
        confidentialEnvelope: fixture.confidentialEnvelope,
        envelopeBlindingSecret: fixture.envelopeBlindingSecret,
        behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
        evaluatedAt: fixture.correctedFixtureBuild.evaluatedAt,
      }),
    ).rejects.toThrow("confidential data");
    if (simulationEnvironmentPath === undefined)
      throw new Error("simulation env path was not captured");
    expect(existsSync(resolve(simulationEnvironmentPath))).toBe(false);
    expect(existsSync(dirname(simulationEnvironmentPath))).toBe(false);
  });

  test("fails closed before workflow execution when CRE authentication is unavailable", async () => {
    const fixture = createDeterministicDemoFixture();
    let simulationStarted = false;
    const client = new CreCliSimulationEvaluationClient({
      run: (_executable, args) => {
        if (args.length === 1 && args[0] === "-v") {
          return { status: 0, stdout: "cre version v1.32.0", stderr: "" };
        }
        if (args.length === 1 && args[0] === "whoami") {
          return { status: 1, stdout: "", stderr: "authentication required" };
        }
        simulationStarted = true;
        return { status: 0, stdout: "", stderr: "" };
      },
    });

    await expect(
      client.evaluate({
        request: fixture.correctedFixtureBuild.request,
        robotBuild: fixture.correctedFixtureBuild.robotBuild,
        confidentialEnvelope: fixture.confidentialEnvelope,
        envelopeBlindingSecret: fixture.envelopeBlindingSecret,
        behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
        evaluatedAt: fixture.correctedFixtureBuild.evaluatedAt,
      }),
    ).rejects.toThrow("not authenticated");
    expect(simulationStarted).toBe(false);
  });
});
