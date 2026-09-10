import { describe, expect, test } from "bun:test";
import { GeminiDeploymentModel } from "../src/agent/gemini-model.js";
import { toolDefinition } from "../src/agent/tools.js";
import { DeploymentAgentError } from "../src/agent/types.js";

describe("Gemini tool-calling adapter", () => {
  test("uses one strict host-selected tool without placing the API key in the request", async () => {
    const secret = "test-gemini-secret-canary";
    let capturedParameters: unknown;
    const model = new GeminiDeploymentModel({
      apiKey: secret,
      model: "gemini-2.5-flash",
      client: {
        models: {
          generateContent: async (parameters) => {
            capturedParameters = parameters;
            return {
              functionCalls: [
                {
                  name: "resolveDeploymentTarget",
                  args: {
                    siteRef: "Warehouse Manila-01",
                    robotRef: "AMR-17",
                    buildRef: "v4.7.21",
                  },
                },
              ],
            };
          },
        },
      },
    });
    const call = await model.callTool({
      publicRequest: "Deploy AMR-17",
      expectedTool: toolDefinition("resolveDeploymentTarget"),
      observations: [],
    });
    const parameters = capturedParameters as {
      model: string;
      contents: string;
      config: {
        tools: Array<{ functionDeclarations: Array<Record<string, unknown>> }>;
        toolConfig: { functionCallingConfig: Record<string, unknown> };
      };
    };
    expect(call).toEqual({
      name: "resolveDeploymentTarget",
      arguments: {
        siteRef: "Warehouse Manila-01",
        robotRef: "AMR-17",
        buildRef: "v4.7.21",
      },
    });
    expect(parameters.model).toBe("gemini-2.5-flash");
    expect(parameters.config.tools).toHaveLength(1);
    expect(parameters.config.tools[0]?.functionDeclarations).toHaveLength(1);
    expect(parameters.config.tools[0]?.functionDeclarations[0]).toMatchObject({
      name: "resolveDeploymentTarget",
      parametersJsonSchema: { additionalProperties: false },
    });
    expect(parameters.config.toolConfig.functionCallingConfig).toMatchObject({
      mode: "ANY",
      allowedFunctionNames: ["resolveDeploymentTarget"],
    });
    expect(JSON.stringify(parameters)).not.toContain(secret);
  });

  test("defaults to Gemini 2.5 Flash and has no credentialless fallback", () => {
    const model = new GeminiDeploymentModel({
      apiKey: "test-gemini-key",
      client: { models: { generateContent: async () => ({ functionCalls: [] }) } },
    });
    expect(model.model).toBe("gemini-2.5-flash");
    expect(() => new GeminiDeploymentModel({ apiKey: "", model: "configured-model" })).toThrow(
      DeploymentAgentError,
    );
  });

  test("accepts surrounding API-key whitespace without a credentialless fallback", () => {
    const model = new GeminiDeploymentModel({
      apiKey: "  test-key  ",
      client: {
        models: {
          generateContent: async () => ({ functionCalls: [] }),
        },
      },
    });
    expect(model.model).toBe("gemini-2.5-flash");
  });

  test("redacts provider failures and rejects malformed or unexpected output", async () => {
    const model = new GeminiDeploymentModel({
      apiKey: "secret-provider-key",
      model: "configured-model",
      client: {
        models: {
          generateContent: async () => {
            throw new Error("raw upstream secret details");
          },
        },
      },
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

    const responses = [
      null,
      undefined,
      { functionCalls: [] },
      {
        functionCalls: [
          { name: "getDeploymentContext", args: {} },
          { name: "getDeploymentContext", args: {} },
        ],
      },
      { functionCalls: [{ name: "sign", args: {} }] },
      { functionCalls: [{ name: "getDeploymentContext", args: "not-an-object" }] },
    ];
    for (const response of responses) {
      const malformed = new GeminiDeploymentModel({
        apiKey: "test-key",
        model: "configured-model",
        client: { models: { generateContent: async () => response } },
      });
      await expect(
        malformed.callTool({
          publicRequest: "Deploy Build B",
          expectedTool: toolDefinition("getDeploymentContext"),
          observations: [],
        }),
      ).rejects.toMatchObject({ code: "PROVIDER_FAILED" });
    }
  });
});
