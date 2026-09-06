import { describe, expect, test } from "bun:test";
import { ReleaseGateError } from "@preflight/chain-client";
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
      phase: "p5-ledger-release-gate",
      releaseGateConfigured: false,
    });
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
    expect(forged.statusCode).toBe(400);
    expect(forged.headers["access-control-allow-origin"]).toBeUndefined();
    expect(JSON.parse(forged.body)).toEqual({
      error: "MALFORMED_REQUEST",
      message: "Request body is malformed",
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
