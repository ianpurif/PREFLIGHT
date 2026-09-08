import { describe, expect, test } from "bun:test";
import { createDeterministicDemoFixture, evaluateSimulation } from "@rovaulta/simulation-core";
import { CreHttpEvaluationClient } from "../src/evaluation/index.js";

const fixture = createDeterministicDemoFixture();
const input = {
  request: fixture.correctedFixtureBuild.request,
  robotBuild: fixture.correctedFixtureBuild.robotBuild,
  confidentialEnvelope: fixture.confidentialEnvelope,
  envelopeBlindingSecret: fixture.envelopeBlindingSecret,
  behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
  evaluatedAt: fixture.correctedFixtureBuild.evaluatedAt,
};
const report = evaluateSimulation(input);

describe("CRE application transport", () => {
  test("sends only public request data and validates the completed public result", async () => {
    let capturedBody = "";
    let capturedAuthorization = "";
    const client = new CreHttpEvaluationClient({
      gatewayUrl: "https://cre.example.test",
      workflowId: "ab".repeat(32),
      privateKey: `0x${"01".repeat(32)}`,
      idFactory: () => "request:cre-test",
      now: () => 1_788_000_000,
      fetch: async (_url, init) => {
        capturedBody = String(init?.body);
        const headers = init?.headers as Record<string, string> | undefined;
        capturedAuthorization = String(headers?.authorization);
        const body = JSON.parse(capturedBody) as {
          id: string;
          jsonrpc: string;
          method: string;
          params: { input: Record<string, unknown> };
        };
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              status: "EVALUATED",
              schemaVersion: "rovaulta.cre-public-evaluation-result/v1",
              protocolVersion: "rovaulta.protocol/v1",
              result: report.result,
              behaviorInputDigest: body.params.input.behaviorInputDigest,
              traceProvenance: "SYNTHETIC_CALLER_SUPPLIED",
            },
          }),
          { status: 200 },
        );
      },
    });
    const result = await client.evaluate(input);
    expect(result.result.verdict).toBe("CLEAR");
    expect(result.scenarioCount).toBeUndefined();
    expect(result.violationCount).toBeUndefined();
    expect(result.violations).toBeUndefined();
    expect(capturedBody).not.toContain("confidentialEnvelope");
    expect(capturedBody).not.toContain("envelopeBlindingSecret");
    expect(capturedBody).toContain("confidentialInputSecretId");
    expect(capturedAuthorization.startsWith("Bearer ey")).toBe(true);
    const jwtSignature = capturedAuthorization.split(".")[2] ?? "";
    const signatureBytes = Buffer.from(jwtSignature, "base64url");
    expect(signatureBytes.byteLength).toBe(65);
    expect([0, 1]).toContain(signatureBytes[64] ?? -1);
  });

  test("treats an accepted asynchronous gateway execution as unavailable to the synchronous API", async () => {
    const client = new CreHttpEvaluationClient({
      gatewayUrl: "https://cre.example.test",
      workflowId: "ab".repeat(32),
      privateKey: `0x${"01".repeat(32)}`,
      idFactory: () => "request:cre-pending",
      fetch: async () =>
        new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: "request:cre-pending",
            result: { status: "ACCEPTED", workflow_execution_id: "execution-1" },
          }),
          { status: 200 },
        ),
    });
    await expect(client.evaluate(input)).rejects.toMatchObject({ code: "CRE_EVALUATION_PENDING" });
  });

  test("rejects mismatched JSON-RPC envelopes and public result bindings", async () => {
    const client = new CreHttpEvaluationClient({
      gatewayUrl: "https://cre.example.test",
      workflowId: "ab".repeat(32),
      privateKey: `0x${"01".repeat(32)}`,
      idFactory: () => "request:cre-envelope",
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          id: string;
          params: { input: { behaviorInputDigest: string } };
        };
        return new Response(
          JSON.stringify({
            jsonrpc: "1.0",
            id: "different-request",
            result: {
              schemaVersion: "rovaulta.cre-public-evaluation-result/v1",
              protocolVersion: "rovaulta.protocol/v1",
              status: "EVALUATED",
              result: report.result,
              behaviorInputDigest: body.params.input.behaviorInputDigest,
              traceProvenance: "WRONG_PROVENANCE",
            },
          }),
          { status: 200 },
        );
      },
    });
    await expect(client.evaluate(input)).rejects.toMatchObject({ code: "CRE_RESPONSE_INVALID" });
  });

  test("rejects a changed result schema or provenance marker", async () => {
    const client = new CreHttpEvaluationClient({
      gatewayUrl: "https://cre.example.test",
      workflowId: "ab".repeat(32),
      privateKey: `0x${"01".repeat(32)}`,
      idFactory: () => "request:cre-result-shape",
      fetch: async (_url, init) => {
        const body = JSON.parse(String(init?.body)) as {
          id: string;
          params: { input: { behaviorInputDigest: string } };
        };
        return new Response(
          JSON.stringify({
            jsonrpc: "2.0",
            id: body.id,
            result: {
              schemaVersion: "rovaulta.cre-public-evaluation-result/v999",
              protocolVersion: "rovaulta.protocol/v1",
              status: "EVALUATED",
              result: report.result,
              behaviorInputDigest: body.params.input.behaviorInputDigest,
              traceProvenance: "SYNTHETIC_CALLER_SUPPLIED",
            },
          }),
          { status: 200 },
        );
      },
    });
    await expect(client.evaluate(input)).rejects.toMatchObject({ code: "CRE_RESPONSE_INVALID" });
  });

  test("does not silently run the local evaluator when CRE configuration is absent", async () => {
    const client = new CreHttpEvaluationClient({});
    await expect(client.evaluate(input)).rejects.toMatchObject({ code: "CRE_UNAVAILABLE" });
  });

  test("fails closed when the deployed gateway cannot be reached", async () => {
    const client = new CreHttpEvaluationClient({
      gatewayUrl: "https://cre.example.test",
      workflowId: "ab".repeat(32),
      privateKey: `0x${"01".repeat(32)}`,
      fetch: async () => {
        throw new Error("network down");
      },
    });
    await expect(client.evaluate(input)).rejects.toMatchObject({ code: "CRE_UNAVAILABLE" });
  });
});
