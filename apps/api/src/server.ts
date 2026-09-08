import { randomBytes } from "node:crypto";
import { ReleaseGateError } from "@preflight/chain-client";
import { evaluateSimulation } from "@preflight/simulation-core";
import Fastify, { type FastifyReply } from "fastify";
import { type DeploymentAgent, DeploymentAgentError } from "./agent/index.js";
import { ApplicationError, ApplicationStore } from "./application/index.js";
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
  options: {
    releaseService?: ReleaseService;
    deploymentAgent?: DeploymentAgent;
    applicationStore?: ApplicationStore;
    environment?: NodeJS.ProcessEnv;
  } = {},
) {
  const app = Fastify({
    logger: {
      redact: ["req.headers.authorization", "req.headers.cookie"],
    },
  });
  const releaseService = options.releaseService;
  const deploymentAgent = options.deploymentAgent;
  const applicationStore = options.applicationStore;
  const environment = options.environment ?? process.env;
  const allowedOrigins = new Set(
    ["http://localhost:3000", "http://127.0.0.1:3000", environment.PREFLIGHT_WEB_ORIGIN].filter(
      (origin): origin is string => typeof origin === "string" && origin.length > 0,
    ),
  );
  app.addHook("onSend", async (request, reply, payload) => {
    const origin = request.headers.origin;
    if (origin !== undefined && allowedOrigins.has(origin)) {
      reply.header("Access-Control-Allow-Origin", origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Vary", "Origin");
    }
    return payload;
  });
  app.options("/*", async (request, reply) => {
    if (request.headers.origin !== undefined && allowedOrigins.has(request.headers.origin)) {
      reply.header("Access-Control-Allow-Origin", request.headers.origin);
      reply.header("Access-Control-Allow-Credentials", "true");
      reply.header("Access-Control-Allow-Headers", "content-type");
      reply.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
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
    if (error instanceof ApplicationError) {
      const status =
        error.code === "AUTH_REQUIRED" || error.code === "INVALID_CREDENTIALS"
          ? 401
          : error.code === "DUPLICATE_ACCOUNT" || error.code === "CONFLICT"
            ? 409
            : error.code === "NOT_FOUND"
              ? 404
              : error.code === "FORBIDDEN"
                ? 403
                : error.code === "POLICY_UNAVAILABLE" || error.code === "PERSISTENCE_UNAVAILABLE"
                  ? 503
                  : 400;
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

  function requireStore(): ApplicationStore {
    if (applicationStore === undefined) {
      throw new ApplicationError(
        "PERSISTENCE_UNAVAILABLE",
        "Application persistence is not configured",
      );
    }
    return applicationStore;
  }

  function requireAccount(
    request: { headers: { cookie?: string | undefined } },
    reply: FastifyReply,
  ): string | null {
    const store = requireStore();
    const token = ApplicationStore.readSessionCookie(request.headers.cookie);
    const account = store.accountForSession(token);
    if (account === null) {
      reply.code(401).send({ error: "AUTH_REQUIRED", message: "Sign in to continue" });
      return null;
    }
    return account.id;
  }

  app.post("/auth/register", async (request, reply) => {
    const store = requireStore();
    const body = expectBody(request.body, ["email", "password"]);
    if (body === null) return rejectMalformed(reply);
    const result = store.registerAccount({ email: body.email, password: body.password });
    reply.header(
      "Set-Cookie",
      ApplicationStore.sessionCookie(result.sessionToken, environment.NODE_ENV === "production"),
    );
    return reply.code(201).send({ account: result.account });
  });

  app.post("/auth/sign-in", async (request, reply) => {
    const store = requireStore();
    const body = expectBody(request.body, ["email", "password"]);
    if (body === null) return rejectMalformed(reply);
    const result = store.signIn({ email: body.email, password: body.password });
    reply.header(
      "Set-Cookie",
      ApplicationStore.sessionCookie(result.sessionToken, environment.NODE_ENV === "production"),
    );
    return reply.send({ account: result.account });
  });

  app.post("/auth/sign-out", async (request, reply) => {
    const store = requireStore();
    store.revokeSession(ApplicationStore.readSessionCookie(request.headers.cookie));
    reply.header(
      "Set-Cookie",
      ApplicationStore.clearSessionCookie(environment.NODE_ENV === "production"),
    );
    return reply.code(204).send();
  });

  app.get("/auth/me", async (request, reply) => {
    const store = requireStore();
    const account = store.accountForSession(
      ApplicationStore.readSessionCookie(request.headers.cookie),
    );
    if (account === null)
      return reply.code(401).send({ error: "AUTH_REQUIRED", message: "Sign in to continue" });
    return reply.send({ account });
  });

  app.get("/sites", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    return accountId === null ? undefined : { sites: requireStore().listSites(accountId) };
  });

  app.post("/sites", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const body = expectBody(request.body, ["name", "location", "policy"]);
    if (body === null) return rejectMalformed(reply);
    const site = requireStore().createSite(accountId, {
      name: body.name,
      location: body.location,
      policy: body.policy,
    });
    return reply.code(201).send({ site });
  });

  app.get("/sites/:siteId", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { siteId?: unknown };
    if (typeof params.siteId !== "string") return rejectMalformed(reply);
    return { site: requireStore().getSite(accountId, params.siteId) };
  });

  app.get("/sites/:siteId/robots", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { siteId?: unknown };
    if (typeof params.siteId !== "string") return rejectMalformed(reply);
    return { robots: requireStore().listRobots(accountId, params.siteId) };
  });

  app.post("/sites/:siteId/robots", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { siteId?: unknown };
    if (typeof params.siteId !== "string") return rejectMalformed(reply);
    const body = expectBody(request.body, ["name"]);
    if (body === null) return rejectMalformed(reply);
    return reply
      .code(201)
      .send({ robot: requireStore().createRobot(accountId, params.siteId, { name: body.name }) });
  });

  app.get("/sites/:siteId/builds", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { siteId?: unknown };
    if (typeof params.siteId !== "string") return rejectMalformed(reply);
    return { builds: requireStore().listBuilds(accountId, params.siteId) };
  });

  app.post("/sites/:siteId/builds", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { siteId?: unknown };
    if (typeof params.siteId !== "string") return rejectMalformed(reply);
    const body = expectBody(request.body, [
      "robotId",
      "version",
      "label",
      "artifactDigest",
      "route",
    ]);
    if (body === null) return rejectMalformed(reply);
    return reply.code(201).send({
      build: requireStore().createBuild(accountId, params.siteId, {
        robotId: body.robotId,
        version: body.version,
        label: body.label,
        artifactDigest: body.artifactDigest,
        route: body.route,
      }),
    });
  });

  app.get("/evaluations", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    return accountId === null
      ? undefined
      : { evaluations: requireStore().listEvaluations(accountId) };
  });

  app.post("/evaluations", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const body = expectBody(request.body, ["siteId", "robotId", "buildId"]);
    if (
      body === null ||
      typeof body.siteId !== "string" ||
      typeof body.robotId !== "string" ||
      typeof body.buildId !== "string"
    )
      return rejectMalformed(reply);
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const evaluation = requireStore().evaluateBuild(accountId, {
      siteId: body.siteId,
      robotId: body.robotId,
      buildId: body.buildId,
      evaluationId: `evaluation:${randomBytes(16).toString("hex")}`,
      requestedAt: timestamp,
      evaluatedAt: timestamp,
      evaluate: evaluateSimulation,
    });
    return reply.code(201).send({ evaluation });
  });

  app.get("/evaluations/:evaluationId", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const params = request.params as { evaluationId?: unknown };
    if (typeof params.evaluationId !== "string") return rejectMalformed(reply);
    return { evaluation: requireStore().getEvaluation(accountId, params.evaluationId) };
  });

  app.get("/releases", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    return accountId === null
      ? undefined
      : { releases: requireStore().listReleaseAttempts(accountId) };
  });

  app.post("/releases/prepare", async (request, reply) => {
    const accountId = requireAccount(request, reply);
    if (accountId === null) return undefined;
    const body = expectBody(request.body, ["evaluationId", "signerAddress", "clearance"]);
    if (
      body === null ||
      typeof body.evaluationId !== "string" ||
      typeof body.signerAddress !== "string"
    )
      return rejectMalformed(reply);
    const store = requireStore();
    const evaluation = store.getEvaluation(accountId, body.evaluationId);
    if (evaluation.verdict !== "CLEAR") {
      const attempt = store.recordReleaseAttempt(accountId, {
        evaluationId: evaluation.evaluationId,
        status: "BLOCKED",
        code: "EVALUATION_NOT_CLEAR",
        message: "Only a CLEAR evaluation can prepare a release",
      });
      return reply
        .code(409)
        .send({ error: "EVALUATION_NOT_CLEAR", message: attempt.message, attempt });
    }
    if (body.clearance === null || typeof body.clearance !== "object") {
      const attempt = store.recordReleaseAttempt(accountId, {
        evaluationId: evaluation.evaluationId,
        status: "BLOCKED",
        code: "CLEARANCE_NOT_AVAILABLE",
        message: "A public P4 clearance record is required before release preparation",
      });
      return reply
        .code(409)
        .send({ error: "CLEARANCE_NOT_AVAILABLE", message: attempt.message, attempt });
    }
    if (releaseService === undefined) {
      const attempt = store.recordReleaseAttempt(accountId, {
        evaluationId: evaluation.evaluationId,
        status: "BLOCKED",
        code: "RELEASE_GATE_UNAVAILABLE",
        message: "The live release gate is not configured",
      });
      return reply
        .code(503)
        .send({ error: "RELEASE_GATE_UNAVAILABLE", message: attempt.message, attempt });
    }
    try {
      const prepared = await releaseService.prepare({
        siteId: evaluation.siteId,
        robotId: evaluation.robotId,
        robotBuildId: evaluation.robotBuildId,
        robotBuildDigest: evaluation.robotBuildDigest,
        clearance: body.clearance,
        signerAddress: body.signerAddress,
      });
      const attempt = store.recordReleaseAttempt(accountId, {
        evaluationId: evaluation.evaluationId,
        status: "LEDGER_APPROVAL_REQUIRED",
        code: null,
        message: "Exact release request prepared; human Ledger approval is still required",
      });
      return reply.send({ status: "LEDGER_APPROVAL_REQUIRED", attempt, prepared });
    } catch (error) {
      if (error instanceof ReleaseGateError) {
        const attempt = store.recordReleaseAttempt(accountId, {
          evaluationId: evaluation.evaluationId,
          status: "BLOCKED",
          code: error.code,
          message: error.message,
        });
        const status =
          error.code === "REGISTRY_UNAVAILABLE" || error.code === "PERSISTENCE_UNAVAILABLE"
            ? 503
            : 403;
        return reply.code(status).send({ error: error.code, message: error.message, attempt });
      }
      throw error;
    }
  });
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
  if (applicationStore !== undefined) {
    app.addHook("onClose", async () => applicationStore.close());
  }
  return app;
}
