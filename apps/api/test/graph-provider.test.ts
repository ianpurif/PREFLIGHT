import { describe, expect, test } from "bun:test";
import { clearanceRecordToTransport } from "@rovaulta/chain-client";
import { parseClearanceRecord } from "@rovaulta/domain";
import { createDeterministicDemoFixture, evaluateSimulation } from "@rovaulta/simulation-core";
import { TheGraphClearanceReader, GraphProviderError } from "../src/graph/index.js";

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
    });
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
    await expect(
      reader(entity({ expiresAt: "1787999999" })).readClearance(clearance),
    ).resolves.toMatchObject({ status: "EXPIRED" });
    await expect(
      reader(entity({ robotBuildDigest: `0x${"ff".repeat(32)}` })).readClearance(clearance),
    ).resolves.toMatchObject({ status: "MISMATCH" });
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
