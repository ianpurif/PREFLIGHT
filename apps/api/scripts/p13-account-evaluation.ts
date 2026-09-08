import { existsSync, readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

type JsonRecord = Record<string, unknown>;

type Setup = {
  readonly site: {
    readonly name: string;
    readonly location: string;
    readonly policy: JsonRecord;
  };
  readonly robot: { readonly name: string };
  readonly build: {
    readonly version: string;
    readonly label: string;
    readonly artifactDigest: string;
    readonly route: JsonRecord;
  };
};

type PublicEvaluation = {
  readonly id: string;
  readonly siteId: string;
  readonly robotId: string;
  readonly buildId: string;
  readonly evaluationId: string;
  readonly robotBuildId: string;
  readonly verdict: "CLEAR" | "HOLD" | "ESCALATE";
  readonly safetyEnvelopeId: string;
  readonly evaluatorVersion: string;
  readonly robotBuildDigest: string;
  readonly safetyEnvelopeCommitment: string;
  readonly evaluationInputsDigest: string;
  readonly scenarioCount: number | null;
  readonly violationCount: number | null;
  readonly reasons: readonly string[];
  readonly evaluatedAt: string;
};

type PublicResult = {
  readonly status: "COMPLETED" | "PENDING";
  readonly evaluationId: string;
  readonly evaluation?: PublicEvaluation;
};

const DEFAULT_API_ORIGIN = "http://localhost:4000";
const DEFAULT_WEB_ORIGIN = "http://localhost:3000";
const DEFAULT_POLL_ATTEMPTS = 30;
const DEFAULT_POLL_DELAY_MS = 2_000;

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) throw new Error(`${name} is required`);
  return value;
}

function positiveInteger(name: string, fallback: number): number {
  const value = process.env[name]?.trim();
  if (value === undefined || value.length === 0) return fallback;
  if (!/^[1-9][0-9]{0,5}$/.test(value)) throw new Error(`${name} must be a positive integer`);
  return Number(value);
}

function record(value: unknown, label: string): JsonRecord {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${label} must be an object`);
  }
  return value as JsonRecord;
}

function text(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${label} must be a non-empty string`);
  }
  return value.trim();
}

function parseSetup(value: unknown): Setup {
  const input = record(value, "P13 setup");
  const site = record(input.site, "P13 setup.site");
  const robot = record(input.robot, "P13 setup.robot");
  const build = record(input.build, "P13 setup.build");
  return {
    site: {
      name: text(site.name, "P13 setup.site.name"),
      location: text(site.location, "P13 setup.site.location"),
      policy: record(site.policy, "P13 setup.site.policy"),
    },
    robot: { name: text(robot.name, "P13 setup.robot.name") },
    build: {
      version: text(build.version, "P13 setup.build.version"),
      label: text(build.label, "P13 setup.build.label"),
      artifactDigest: text(build.artifactDigest, "P13 setup.build.artifactDigest"),
      route: record(build.route, "P13 setup.build.route"),
    },
  };
}

function parseCookie(value: string | null): string {
  if (value === null || value.length === 0) throw new Error("API did not return a session cookie");
  return value.split(",", 1)[0]?.split(";", 1)[0] ?? "";
}

function publicEvaluation(value: unknown): PublicEvaluation {
  const input = record(value, "public evaluation");
  const verdict = input.verdict;
  if (verdict !== "CLEAR" && verdict !== "HOLD" && verdict !== "ESCALATE") {
    throw new Error("public evaluation verdict is invalid");
  }
  return Object.freeze({
    id: text(input.id, "public evaluation.id"),
    siteId: text(input.siteId, "public evaluation.siteId"),
    robotId: text(input.robotId, "public evaluation.robotId"),
    buildId: text(input.buildId, "public evaluation.buildId"),
    evaluationId: text(input.evaluationId, "public evaluation.evaluationId"),
    robotBuildId: text(input.robotBuildId, "public evaluation.robotBuildId"),
    verdict,
    safetyEnvelopeId: text(input.safetyEnvelopeId, "public evaluation.safetyEnvelopeId"),
    evaluatorVersion: text(input.evaluatorVersion, "public evaluation.evaluatorVersion"),
    robotBuildDigest: text(input.robotBuildDigest, "public evaluation.robotBuildDigest"),
    safetyEnvelopeCommitment: text(
      input.safetyEnvelopeCommitment,
      "public evaluation.safetyEnvelopeCommitment",
    ),
    evaluationInputsDigest: text(
      input.evaluationInputsDigest,
      "public evaluation.evaluationInputsDigest",
    ),
    scenarioCount: typeof input.scenarioCount === "number" ? input.scenarioCount : null,
    violationCount: typeof input.violationCount === "number" ? input.violationCount : null,
    reasons: Array.isArray(input.reasons)
      ? Object.freeze(
          input.reasons.filter((reason): reason is string => typeof reason === "string"),
        )
      : Object.freeze([]),
    evaluatedAt: text(input.evaluatedAt, "public evaluation.evaluatedAt"),
  });
}

function apiError(status: number, body: unknown): Error {
  const input = body !== null && typeof body === "object" ? (body as JsonRecord) : {};
  const code = typeof input.error === "string" ? input.error : "API_REQUEST_FAILED";
  const message = typeof input.message === "string" ? input.message : "API request failed";
  return new Error(`${code} (${status}): ${message}`);
}

async function request(
  apiOrigin: string,
  webOrigin: string,
  path: string,
  options: { readonly method: "GET" | "POST"; readonly cookie?: string; readonly body?: unknown },
): Promise<{ readonly response: Response; readonly body: unknown }> {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: options.method,
    headers: {
      accept: "application/json",
      ...(options.body === undefined ? {} : { "content-type": "application/json" }),
      ...(options.cookie === undefined ? {} : { cookie: options.cookie }),
      ...(options.method === "POST" ? { origin: webOrigin } : {}),
    },
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });
  const textBody = await response.text();
  let body: unknown = null;
  if (textBody.length > 0) {
    try {
      body = JSON.parse(textBody) as unknown;
    } catch {
      throw new Error(`API returned a non-JSON response (${response.status})`);
    }
  }
  return { response, body };
}

async function createSession(
  apiOrigin: string,
  webOrigin: string,
  email: string,
  password: string,
): Promise<string> {
  const registration = await request(apiOrigin, webOrigin, "/auth/register", {
    method: "POST",
    body: { email, password },
  });
  if (registration.response.status === 201)
    return parseCookie(registration.response.headers.get("set-cookie"));
  if (registration.response.status !== 409)
    throw apiError(registration.response.status, registration.body);

  const signIn = await request(apiOrigin, webOrigin, "/auth/sign-in", {
    method: "POST",
    body: { email, password },
  });
  if (signIn.response.status !== 200) throw apiError(signIn.response.status, signIn.body);
  return parseCookie(signIn.response.headers.get("set-cookie"));
}

async function createResources(
  apiOrigin: string,
  webOrigin: string,
  cookie: string,
  setup: Setup,
): Promise<{ readonly siteId: string; readonly robotId: string; readonly buildId: string }> {
  const siteResponse = await request(apiOrigin, webOrigin, "/sites", {
    method: "POST",
    cookie,
    body: setup.site,
  });
  if (siteResponse.response.status !== 201)
    throw apiError(siteResponse.response.status, siteResponse.body);
  const site = record(siteResponse.body, "site response").site;
  const siteRecord = record(site, "site");
  const siteId = text(siteRecord.id, "site.id");

  const robotResponse = await request(
    apiOrigin,
    webOrigin,
    `/sites/${encodeURIComponent(siteId)}/robots`,
    {
      method: "POST",
      cookie,
      body: setup.robot,
    },
  );
  if (robotResponse.response.status !== 201)
    throw apiError(robotResponse.response.status, robotResponse.body);
  const robotRecord = record(record(robotResponse.body, "robot response").robot, "robot");
  const robotId = text(robotRecord.id, "robot.id");

  const buildResponse = await request(
    apiOrigin,
    webOrigin,
    `/sites/${encodeURIComponent(siteId)}/builds`,
    {
      method: "POST",
      cookie,
      body: { ...setup.build, robotId },
    },
  );
  if (buildResponse.response.status !== 201)
    throw apiError(buildResponse.response.status, buildResponse.body);
  const buildRecord = record(record(buildResponse.body, "build response").build, "build");
  return {
    siteId,
    robotId,
    buildId: text(buildRecord.id, "build.id"),
  };
}

async function evaluate(
  apiOrigin: string,
  webOrigin: string,
  cookie: string,
  resources: { readonly siteId: string; readonly robotId: string; readonly buildId: string },
): Promise<PublicEvaluation> {
  const submitted = await request(apiOrigin, webOrigin, "/evaluations", {
    method: "POST",
    cookie,
    body: resources,
  });
  if (submitted.response.status === 201) {
    return publicEvaluation(record(submitted.body, "evaluation response").evaluation);
  }
  if (submitted.response.status !== 202) throw apiError(submitted.response.status, submitted.body);

  const pending = record(submitted.body, "pending evaluation response");
  const evaluationId = text(pending.evaluationId, "pending evaluationId");
  const attempts = positiveInteger("ROVAULTA_P13_POLL_ATTEMPTS", DEFAULT_POLL_ATTEMPTS);
  const delay = positiveInteger("ROVAULTA_P13_POLL_DELAY_MS", DEFAULT_POLL_DELAY_MS);
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    await new Promise((resolveDelay) => setTimeout(resolveDelay, delay));
    const result = await request(
      apiOrigin,
      webOrigin,
      `/evaluations/${encodeURIComponent(evaluationId)}`,
      { method: "GET", cookie },
    );
    if (result.response.status === 200) {
      return publicEvaluation(record(result.body, "completed evaluation response").evaluation);
    }
    if (result.response.status !== 202) throw apiError(result.response.status, result.body);
  }
  throw new Error(`CRE evaluation remained PENDING after ${attempts} polls`);
}

function writePublicEvidence(
  path: string,
  evaluation: PublicEvaluation,
  accountId: string,
): string {
  const target = resolve(process.cwd(), path);
  if (existsSync(target)) throw new Error("ROVAULTA_P13_EVIDENCE_PATH already exists");
  mkdirSync(dirname(target), { recursive: true });
  const evidence = {
    evidenceType: "P13 account-created CRE evaluation",
    execution: "normal account application path",
    capturedAt: new Date().toISOString(),
    accountId,
    evaluation,
    confidentialFields: "absent from this public projection",
  } as const;
  writeFileSync(target, `${JSON.stringify(evidence, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
    mode: 0o600,
  });
  return target;
}

async function run(): Promise<void> {
  const apiOrigin = (
    process.env.ROVAULTA_P13_API_ORIGIN ??
    process.env.API_ORIGIN ??
    DEFAULT_API_ORIGIN
  ).replace(/\/$/, "");
  const webOrigin = (
    process.env.ROVAULTA_P13_WEB_ORIGIN ??
    process.env.WEB_ORIGIN ??
    DEFAULT_WEB_ORIGIN
  ).replace(/\/$/, "");
  const email = required("ROVAULTA_P13_EMAIL");
  const password = required("ROVAULTA_P13_PASSWORD");
  const setupPath = required("ROVAULTA_P13_SETUP_PATH");
  const setup = parseSetup(
    JSON.parse(readFileSync(resolve(process.cwd(), setupPath), "utf8")) as unknown,
  );
  const cookie = await createSession(apiOrigin, webOrigin, email, password);
  const accountResponse = await request(apiOrigin, webOrigin, "/auth/me", {
    method: "GET",
    cookie,
  });
  if (accountResponse.response.status !== 200)
    throw apiError(accountResponse.response.status, accountResponse.body);
  const account = record(accountResponse.body, "account response").account;
  const accountId = text(record(account, "account").id, "account.id");
  const resources = await createResources(apiOrigin, webOrigin, cookie, setup);
  const evaluation = await evaluate(apiOrigin, webOrigin, cookie, resources);
  const evidencePath = process.env.ROVAULTA_P13_EVIDENCE_PATH?.trim();

  console.log(
    JSON.stringify(
      {
        status: evaluation.verdict === "CLEAR" ? "CLEAR" : evaluation.verdict,
        execution: "normal account application path",
        accountId,
        siteId: evaluation.siteId,
        robotId: evaluation.robotId,
        buildId: evaluation.buildId,
        evaluationId: evaluation.evaluationId,
        robotBuildDigest: evaluation.robotBuildDigest,
        safetyEnvelopeCommitment: evaluation.safetyEnvelopeCommitment,
        evaluatorVersion: evaluation.evaluatorVersion,
        evaluationInputsDigest: evaluation.evaluationInputsDigest,
        evaluatedAt: evaluation.evaluatedAt,
        publicEvidencePath:
          evaluation.verdict === "CLEAR" && evidencePath !== undefined && evidencePath.length > 0
            ? writePublicEvidence(evidencePath, evaluation, accountId)
            : null,
      },
      null,
      2,
    ),
  );
  if (evaluation.verdict !== "CLEAR") process.exitCode = 1;
}

run().catch((error: unknown) => {
  console.error(
    JSON.stringify(
      {
        status: "BLOCKED",
        error: error instanceof Error ? error.message : "P13 evaluation failed",
      },
      null,
      2,
    ),
  );
  process.exitCode = 1;
});
