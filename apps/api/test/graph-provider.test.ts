import { describe, expect, test } from "bun:test";
import { clearanceRecordToTransport } from "@rovaulta/chain-client";
import { parseClearanceRecord } from "@rovaulta/domain";
import { createDeterministicDemoFixture, evaluateSimulation } from "@rovaulta/simulation-core";
import { type GraphProviderError, TheGraphClearanceReader } from "../src/graph/index.js";

const fixture = createDeterministicDemoFixture();
const report = evaluateSimulation({
  request: fixture.correctedFixtureBuild.request,
  robotBuild: fixture.correctedFixtureBuild.robotBuild,
  confidentialEnvelope: fixture.confidentialEnvelope,
  envelopeBlindingSecret: fixture.envelopeBlindingSecret,
  behaviorTraces: fixture.correctedFixtureBuild.behaviorTraces,
  evaluatedAt: fixture.correctedFixtureBuild.evaluatedAt,
});
const clearance = parseClearanceRecord({
  schemaVersion: "rovaulta.clearance-record/v1",
  clearanceId: "clearance:graph-test",
  evaluationId: report.result.evaluationId,
  inputs: report.result.inputs,
  evaluationInputsDigest: report.result.evaluationInputsDigest,
  verdict: "CLEAR",
  issuedAt: report.result.evaluatedAt,
  expiresAt: "1999999999",
});
const transport = clearanceRecordToTransport(clearance);

function response(entity: unknown): Response {
  return new Response(JSON.stringify({ data: { clearance: entity } }), { status: 200 });
}

function reader(entity: unknown) {
  return new TheGraphClearanceReader({
    apiKey: "graph-test-key",
    subgraphId: "graph-test-subgraph",
    now: () => 1_788_000_000,
    fetch: async () => response(entity),
  });
}

function entity(overrides: Record<string, unknown> = {}) {
  return {
    id: transport.clearanceDigest,
    clearanceDigest: transport.clearanceDigest,
    ...transport.bindings,
    issuedAt: transport.bindings.issuedAt.toString(),
    expiresAt: transport.bindings.expiresAt.toString(),
    verdict: transport.verdict,
    issuer: `0x${"11".repeat(20)}`,
    revoked: false,
    blockNumber: "100",
    blockHash: `0x${"22".repeat(32)}`,
    ...overrides,
  };
}

describe("The Graph clearance provider", () => {
  test("returns a matched live-shaped public context only for exact bindings", async () => {
    await expect(reader(entity()).readClearance(clearance)).resolves.toMatchObject({
      source: "the-graph",
      status: "MATCHED",
      chainId: 11_155_111,
      indexedAtBlock: "100",
      issuer: `0x${"11".repeat(20)}`,
      issuedAt: transport.bindings.issuedAt.toString(),
      expiresAt: transport.bindings.expiresAt.toString(),
    });
  });

  test("queries the configured Gateway with only a public digest and public fields", async () => {
    let request: Request | undefined;
    const gatewayReader = new TheGraphClearanceReader({
      apiKey: "graph-test-key",
      subgraphId: "graph-test-subgraph",
      fetch: async (input, init) => {
        request =
          input instanceof Request ? new Request(input, init) : new Request(input.toString(), init);
        return response(entity());
      },
    });
    await gatewayReader.readClearance(clearance);
    if (request === undefined) throw new Error("Expected Gateway request");
    expect(request.url).toBe(
      "https://gateway.thegraph.com/api/graph-test-key/subgraphs/id/graph-test-subgraph",
    );
    const body = (await request.json()) as { query: string; variables: { digest: string } };
    expect(body.variables.digest).toBe(transport.clearanceDigest.toLowerCase());
    expect(body.query).toContain("clearanceDigest");
    expect(body.query).not.toContain("privateEnvelope");
    expect(body.query).not.toContain("blind");
  });

  test("supports the explicit live Subgraph Studio query endpoint without Gateway credentials", async () => {
    let request: Request | undefined;
    const studioReader = new TheGraphClearanceReader({
      studioQueryUrl: "https://api.studio.thegraph.com/query/1758964/rovaulta-registry/0.1.0",
      fetch: async (input, init) => {
        request =
          input instanceof Request ? new Request(input, init) : new Request(input.toString(), init);
        return response(entity());
      },
    });
    await expect(studioReader.readClearance(clearance)).resolves.toMatchObject({
      status: "MATCHED",
    });
    if (request === undefined) throw new Error("Expected Studio request");
    expect(request.url).toBe(
      "https://api.studio.thegraph.com/query/1758964/rovaulta-registry/0.1.0",
    );
    expect(request.headers.get("authorization")).toBeNull();
    const body = (await request.json()) as { variables: { digest: string } };
    expect(body.variables.digest).toBe(transport.clearanceDigest.toLowerCase());
  });

  test("rejects malformed Studio query configuration", async () => {
    await expect(
      new TheGraphClearanceReader({
        studioQueryUrl: "https://example.com/not-a-studio-query",
        fetch: async () => response(entity()),
      }).readClearance(clearance),
    ).rejects.toMatchObject({ code: "GRAPH_UNAVAILABLE" } satisfies Partial<GraphProviderError>);
  });

  test("fails closed for missing, revoked, expired, and mismatched records", async () => {
    await expect(reader(null).readClearance(clearance)).resolves.toMatchObject({
      status: "NOT_FOUND",
    });
    await expect(reader(entity({ revoked: true })).readClearance(clearance)).resolves.toMatchObject(
      {
        status: "REVOKED",
      },
    );
    const expired = parseClearanceRecord({ ...clearance, expiresAt: "1788600000" });
    const expiredTransport = clearanceRecordToTransport(expired);
    await expect(
      new TheGraphClearanceReader({
        apiKey: "graph-test-key",
        subgraphId: "graph-test-subgraph",
        now: () => 1_788_600_000,
        fetch: async () =>
          response({
            id: expiredTransport.clearanceDigest,
            clearanceDigest: expiredTransport.clearanceDigest,
            ...expiredTransport.bindings,
            issuedAt: expiredTransport.bindings.issuedAt.toString(),
            expiresAt: expiredTransport.bindings.expiresAt.toString(),
            verdict: expiredTransport.verdict,
            issuer: `0x${"11".repeat(20)}`,
            revoked: false,
            blockNumber: "100",
            blockHash: `0x${"22".repeat(32)}`,
          }),
      }).readClearance(expired),
    ).resolves.toMatchObject({ status: "EXPIRED" });
    await expect(
      reader(entity({ robotBuildDigest: `0x${"ff".repeat(32)}` })).readClearance(clearance),
    ).resolves.toMatchObject({ status: "MISMATCH" });
    await expect(
      reader(entity({ expiresAt: "1999999998" })).readClearance(clearance),
    ).resolves.toMatchObject({ status: "MISMATCH" });
  });

  test("rejects malformed public identity and block metadata instead of treating it as matched", async () => {
    await expect(
      reader(entity({ id: `0x${"ff".repeat(32)}` })).readClearance(clearance),
    ).resolves.toMatchObject({ status: "MISMATCH" });
    await expect(reader(entity({ id: "0x1234" })).readClearance(clearance)).rejects.toMatchObject({
      code: "GRAPH_RESPONSE_INVALID",
    } satisfies Partial<GraphProviderError>);
    await expect(
      reader(entity({ issuer: "0x1234" })).readClearance(clearance),
    ).rejects.toMatchObject({
      code: "GRAPH_RESPONSE_INVALID",
    } satisfies Partial<GraphProviderError>);
    await expect(
      reader(entity({ blockNumber: "01" })).readClearance(clearance),
    ).rejects.toMatchObject({
      code: "GRAPH_RESPONSE_INVALID",
    } satisfies Partial<GraphProviderError>);
  });

  test("does not use a fixture fallback when provider configuration is absent", async () => {
    await expect(
      new TheGraphClearanceReader({ fetch: async () => response(null) }).readClearance(clearance),
    ).rejects.toMatchObject({ code: "GRAPH_UNAVAILABLE" } satisfies Partial<GraphProviderError>);
  });

  test("fails closed when the live provider is unreachable", async () => {
    await expect(
      new TheGraphClearanceReader({
        apiKey: "graph-test-key",
        subgraphId: "graph-test-subgraph",
        fetch: async () => {
          throw new Error("network down");
        },
      }).readClearance(clearance),
    ).rejects.toMatchObject({ code: "GRAPH_UNAVAILABLE" } satisfies Partial<GraphProviderError>);
  });
});
