import { describe, expect, test } from "bun:test";
import { ReleaseGateError } from "@preflight/chain-client";
import type { DeploymentAgent } from "../src/agent/index.js";
import type { ReleaseService } from "../src/release/index.js";
import { buildServer } from "../src/server.js";

function fakeReleaseService(overrides: Partial<ReleaseService> = {}): ReleaseService {
  return {
    prepare: async (proposal: unknown) => ({ prepared: proposal }),
    consume: async (request: unknown) => ({ authorized: request }),
    close: () => undefined,
    ...overrides,
  } as unknown as ReleaseService;
}

function fakeDeploymentAgent(overrides: Record<string, unknown> = {}): DeploymentAgent {
  return {
    run: async (input: unknown) => ({ status: "LEDGER_APPROVAL_REQUIRED", input }),
    getAuthorizationStatus: (attemptId: string) => ({ status: "AUTHORIZED", attemptId }),
    ...overrides,
  } as unknown as DeploymentAgent;
}

const proposal = {
  siteId: "site:api-route",
  robotId: "robot:api-route",
  robotBuildId: "robot-build:api-route",
  robotBuildDigest: `sha256:${"11".repeat(32)}`,
  clearance: { clearanceId: "clearance:api-route" },
  signerAddress: "0x0000000000000000000000000000000000000001",
};

describe("P5 release API boundary", () => {
  test("exposes configuration status without fabricating a release gate", async () => {
    const app = buildServer();
    const response = await app.inject({ method: "GET", url: "/health" });
    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.body)).toEqual({
      status: "ok",
      phase: "p5.2-ai-deployment-agent",
      releaseGateConfigured: false,
      deploymentAgentConfigured: false,
    });
    await app.close();
  });

  test("exposes exact agent prepare/status requests without accepting authority fields", async () => {
    const runs: unknown[] = [];
    const app = buildServer({
      deploymentAgent: fakeDeploymentAgent({
        run: async (input: unknown) => {
          runs.push(input);
          return { status: "LEDGER_APPROVAL_REQUIRED" };
        },
      }),
    });
    const accepted = await app.inject({
      method: "POST",
      url: "/agent/deployment/prepare",
      payload: { request: "Deploy Build B", signerAddress: proposal.signerAddress },
    });
    expect(accepted.statusCode).toBe(200);
    expect(runs).toEqual([{ request: "Deploy Build B", signerAddress: proposal.signerAddress }]);
    for (const extra of [
      { authorized: true },
      { chainId: 1 },
      { registry: `0x${"11".repeat(20)}` },
      { signature: "0xfake" },
    ]) {
      const rejected = await app.inject({
        method: "POST",
        url: "/agent/deployment/prepare",
        payload: {
          request: "Deploy Build B",
          signerAddress: proposal.signerAddress,
          ...extra,
        },
      });
      expect(rejected.statusCode).toBe(400);
    }
    const status = await app.inject({
      method: "POST",
      url: "/agent/deployment/status",
      payload: { attemptId: "attempt:known" },
    });
    expect(JSON.parse(status.body)).toEqual({
      status: "AUTHORIZED",
      attemptId: "attempt:known",
    });
    const replayInjection = await app.inject({
      method: "POST",
      url: "/agent/deployment/status",
      payload: { attemptId: "attempt:known", signature: "0xold" },
    });
    expect(replayInjection.statusCode).toBe(400);
    await app.close();
  });

  test("accepts only exact agent proposals and never trusts an approval boolean", async () => {
    const prepared: unknown[] = [];
    const app = buildServer({
      releaseService: fakeReleaseService({
        prepare: async (input) => {
          prepared.push(input);
          return { status: "prepared" } as never;
        },
      }),
    });
    const accepted = await app.inject({
      method: "POST",
      url: "/release/prepare",
      headers: { origin: "http://localhost:3000" },
      payload: proposal,
    });
    expect(accepted.statusCode).toBe(200);
    expect(accepted.headers["access-control-allow-origin"]).toBe("http://localhost:3000");
    expect(prepared).toEqual([proposal]);

    const forged = await app.inject({
      method: "POST",
      url: "/release/prepare",
      headers: { origin: "https://attacker.example" },
      payload: { ...proposal, ledgerApproved: true },
    });
    expect(forged.statusCode).toBe(403);
    expect(forged.headers["access-control-allow-origin"]).toBeUndefined();
    expect(JSON.parse(forged.body)).toEqual({
      error: "CSRF_ORIGIN_REJECTED",
      message: "Request origin is not allowed",
    });
    expect(prepared).toHaveLength(1);
    await app.close();
  });

  test("maps replay and infrastructure failures to stable fail-closed responses", async () => {
    const app = buildServer({
      releaseService: fakeReleaseService({
        prepare: async () => {
          throw new ReleaseGateError("REGISTRY_UNAVAILABLE", "Registry read failed closed");
        },
        consume: async () => {
          throw new ReleaseGateError("REPLAY_REJECTED", "Release nonce was consumed");
        },
      }),
    });
    const unavailable = await app.inject({
      method: "POST",
      url: "/release/prepare",
      payload: proposal,
    });
    expect(unavailable.statusCode).toBe(503);
    expect(JSON.parse(unavailable.body)).toEqual({
      error: "REGISTRY_UNAVAILABLE",
      message: "Registry read failed closed",
    });
    const replay = await app.inject({
      method: "POST",
      url: "/release/consume",
      payload: { intent: {}, signature: "0x00" },
    });
    expect(replay.statusCode).toBe(409);
    expect(JSON.parse(replay.body)).toEqual({
      error: "REPLAY_REJECTED",
      message: "Release nonce was consumed",
    });
    await app.close();
  });
});
