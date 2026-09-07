import { describe, expect, test } from "bun:test";
import {
  DeploymentAgentError,
  OpenAIResponsesDeploymentModel,
  toolDefinition,
} from "../src/agent/index.js";

describe("real OpenAI Responses tool-calling adapter", () => {
  test("sends one strict allowlisted tool and keeps the API key out of the body", async () => {
    const secret = "test-provider-secret-canary";
    let capturedBody = "";
    let capturedAuthorization = "";
    const model = new OpenAIResponsesDeploymentModel({
      apiKey: secret,
      model: "configured-model",
      fetch: async (_url, init) => {
        capturedBody = String(init?.body);
        capturedAuthorization = new Headers(init?.headers).get("authorization") ?? "";
        return new Response(
          JSON.stringify({
            output: [
              {
                type: "function_call",
                name: "resolveDeploymentTarget",
                arguments: JSON.stringify({
                  siteRef: "Warehouse Manila-01",
                  robotRef: "AMR-17",
                  buildRef: "v4.7.21",
                }),
              },
            ],
          }),
          { status: 200 },
        );
      },
    });
    const call = await model.callTool({
      publicRequest: "Deploy AMR-17",
      expectedTool: toolDefinition("resolveDeploymentTarget"),
      observations: [],
    });
    const body = JSON.parse(capturedBody) as Record<string, unknown>;
    const tools = body.tools as Array<Record<string, unknown>>;
    expect(call).toEqual({
      name: "resolveDeploymentTarget",
      arguments: {
        siteRef: "Warehouse Manila-01",
        robotRef: "AMR-17",
        buildRef: "v4.7.21",
      },
    });
    expect(tools).toHaveLength(1);
    expect(tools[0]).toMatchObject({
      name: "resolveDeploymentTarget",
      strict: true,
      parameters: { additionalProperties: false },
    });
    expect(body.parallel_tool_calls).toBe(false);
    expect(body.store).toBe(false);
    expect(capturedAuthorization).toBe(`Bearer ${secret}`);
    expect(capturedBody).not.toContain(secret);
  });

  test("has no credentialless fallback and redacts provider failures", async () => {
    expect(
      () => new OpenAIResponsesDeploymentModel({ apiKey: "", model: "configured-model" }),
    ).toThrow(DeploymentAgentError);
    const model = new OpenAIResponsesDeploymentModel({
      apiKey: "secret-provider-key",
      model: "configured-model",
      fetch: async () => new Response("raw upstream secret details", { status: 429 }),
    });
    try {
      await model.callTool({
        publicRequest: "Deploy Build B",
        expectedTool: toolDefinition("getDeploymentContext"),
        observations: [],
      });
      throw new Error("Expected provider failure");
    } catch (error) {
      expect(error).toBeInstanceOf(DeploymentAgentError);
      expect(String(error)).not.toContain("raw upstream secret details");
      expect(String(error)).not.toContain("secret-provider-key");
    }
  });

  test("rejects malformed, duplicate, or unexpected provider output", async () => {
    const outputs = [
      { output: [] },
      {
        output: [
          { type: "function_call", name: "getDeploymentContext", arguments: "{}" },
          { type: "function_call", name: "getDeploymentContext", arguments: "{}" },
        ],
      },
      { output: [{ type: "function_call", name: "sign", arguments: "{}" }] },
      { output: [{ type: "function_call", name: "getDeploymentContext", arguments: "{" }] },
    ];
    for (const output of outputs) {
      const model = new OpenAIResponsesDeploymentModel({
        apiKey: "test-key",
        model: "configured-model",
        fetch: async () => new Response(JSON.stringify(output), { status: 200 }),
      });
      await expect(
        model.callTool({
          publicRequest: "Deploy Build B",
          expectedTool: toolDefinition("getDeploymentContext"),
          observations: [],
        }),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    }
  });
});
