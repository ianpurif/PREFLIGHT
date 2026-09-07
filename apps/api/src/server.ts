import { ReleaseGateError } from "@preflight/chain-client";
import Fastify, { type FastifyReply } from "fastify";
import { type DeploymentAgent, DeploymentAgentError } from "./agent/index.js";
import type { ReleaseService } from "./release/index.js";

function rejectMalformed(reply: FastifyReply) {
  return reply.code(400).send({ error: "MALFORMED_REQUEST", message: "Request body is malformed" });
}

function expectBody(input: unknown, keys: readonly string[]): Record<string, unknown> | null {
  if (input === null || typeof input !== "object" || Array.isArray(input)) return null;
  const record = input as Record<string, unknown>;
  const allowed = new Set(keys);
  if (Object.keys(record).some((key) => !allowed.has(key))) return null;
  if (keys.some((key) => !Object.hasOwn(record, key))) return null;
  return record;
}

export function buildServer(
  options: { releaseService?: ReleaseService; deploymentAgent?: DeploymentAgent } = {},
) {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });
  const releaseService = options.releaseService;
  const deploymentAgent = options.deploymentAgent;
  app.addHook("onSend", async (request, reply, payload) => {
    const origin = request.headers.origin;
    if (origin === "http://localhost:3000") {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Vary", "Origin");
    }
    return payload;
  });
  app.options("/*", async (request, reply) => {
    if (request.headers.origin === "http://localhost:3000") {
      reply.header("Access-Control-Allow-Origin", request.headers.origin);
      reply.header("Access-Control-Allow-Headers", "content-type");
      reply.header("Access-Control-Allow-Methods", "POST, OPTIONS");
    }
    return reply.code(204).send();
  });
  app.setErrorHandler((error, _request, reply) => {
    if (error instanceof ReleaseGateError) {
      const status =
        error.code === "REPLAY_REJECTED"
          ? 409
          : error.code === "MALFORMED_REQUEST"
            ? 400
            : error.code === "REGISTRY_UNAVAILABLE" || error.code === "PERSISTENCE_UNAVAILABLE"
              ? 503
              : 403;
      return reply.code(status).send({ error: error.code, message: error.message });
    }
    if (error instanceof DeploymentAgentError) {
      const status = error.code === "PROVIDER_UNAVAILABLE" ? 503 : 400;
      return reply.code(status).send({ error: error.code, message: error.message });
    }
    return reply.code(400).send({ error: "MALFORMED_REQUEST", message: "Request failed closed" });
  });
  app.get("/health", async () => ({
    status: "ok",
    phase: "p5.2-ai-deployment-agent",
    releaseGateConfigured: releaseService !== undefined,
    deploymentAgentConfigured: deploymentAgent !== undefined,
  }));
  app.post("/agent/deployment/prepare", async (request, reply) => {
    if (deploymentAgent === undefined) {
      throw new DeploymentAgentError("PROVIDER_UNAVAILABLE", "Deployment agent is not configured");
    }
    const body = expectBody(request.body, ["request", "signerAddress"]);
    if (
      body === null ||
      typeof body.request !== "string" ||
      typeof body.signerAddress !== "string"
    ) {
      return rejectMalformed(reply);
    }
    return deploymentAgent.run({ request: body.request, signerAddress: body.signerAddress });
  });
  app.post("/agent/deployment/status", async (request, reply) => {
    if (deploymentAgent === undefined) {
      throw new DeploymentAgentError("PROVIDER_UNAVAILABLE", "Deployment agent is not configured");
    }
    const body = expectBody(request.body, ["attemptId"]);
    if (body === null || typeof body.attemptId !== "string") return rejectMalformed(reply);
    return deploymentAgent.getAuthorizationStatus(body.attemptId);
  });
  app.post("/release/prepare", async (request, reply) => {
    if (releaseService === undefined) {
      throw new ReleaseGateError("PERSISTENCE_UNAVAILABLE", "Release gate is not configured");
    }
    const body = expectBody(request.body, [
      "siteId",
      "robotId",
      "robotBuildId",
      "robotBuildDigest",
      "clearance",
      "signerAddress",
    ]);
    if (body === null || typeof body.signerAddress !== "string") return rejectMalformed(reply);
    return releaseService.prepare({
      siteId: body.siteId,
      robotId: body.robotId,
      robotBuildId: body.robotBuildId,
      robotBuildDigest: body.robotBuildDigest,
      clearance: body.clearance,
      signerAddress: body.signerAddress,
    });
  });
  app.post("/release/consume", async (request, reply) => {
    if (releaseService === undefined) {
      throw new ReleaseGateError("PERSISTENCE_UNAVAILABLE", "Release gate is not configured");
    }
    const body = expectBody(request.body, ["intent", "signature"]);
    if (body === null) return rejectMalformed(reply);
    return releaseService.consume({ intent: body.intent, signature: body.signature });
  });
  if (releaseService !== undefined) {
    app.addHook("onClose", async () => releaseService.close());
  }
  return app;
}
