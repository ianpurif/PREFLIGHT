import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
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
  readonly executionMode?: "official-cre-cli-simulation" | "cre-gateway" | "cre-gateway-callback";
  readonly creCliVersion?: string;
};

type EvaluationOutcome = {
  readonly evaluation: PublicEvaluation;
  readonly creExecutionId?: string;
};

type Resources = {
  readonly siteId: string;
  readonly robotId: string;
  readonly buildId: string;
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

function optionalBoolean(name: string): boolean {
  const value = process.env[name]?.trim().toLowerCase();
  if (value === undefined || value.length === 0 || value === "false") return false;
  if (value === "true") return true;
  throw new Error(`${name} must be true or false`);
}

function optionalResourceId(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value === undefined || value.length === 0 ? undefined : value;
}

function assertApiOrigin(value: string): void {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("ROVAULTA_P13_API_ORIGIN must be a valid URL");
  }
  const loopback =
    url.protocol === "http:" && new Set(["localhost", "127.0.0.1", "[::1]"]).has(url.hostname);
  if (url.protocol !== "https:" && !loopback) {
    throw new Error("ROVAULTA_P13_API_ORIGIN must use HTTPS outside loopback");
  }
  if (url.username.length > 0 || url.password.length > 0) {
    throw new Error("ROVAULTA_P13_API_ORIGIN must not contain credentials");
  }
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
  const executionMode = input.executionMode;
  if (
    executionMode !== undefined &&
    executionMode !== "official-cre-cli-simulation" &&
    executionMode !== "cre-gateway" &&
    executionMode !== "cre-gateway-callback"
  ) {
    throw new Error("public evaluation execution mode is invalid");
  }
  const creCliVersion = input.creCliVersion;
  if (creCliVersion !== undefined && typeof creCliVersion !== "string") {
    throw new Error("public evaluation CRE CLI version is invalid");
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
    ...(executionMode === undefined ? {} : { executionMode }),
    ...(creCliVersion === undefined
      ? {}
      : { creCliVersion: text(creCliVersion, "public evaluation.creCliVersion") }),
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
): Promise<Resources> {
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

async function resolveExistingResources(
  apiOrigin: string,
  webOrigin: string,
  cookie: string,
  resources: Resources,
): Promise<Resources> {
  const siteResponse = await request(
    apiOrigin,
    webOrigin,
    `/sites/${encodeURIComponent(resources.siteId)}`,
    { method: "GET", cookie },
  );
  if (siteResponse.response.status !== 200) {
    throw apiError(siteResponse.response.status, siteResponse.body);
  }
  const site = record(record(siteResponse.body, "site response").site, "site");
  if (text(site.id, "site.id") !== resources.siteId) {
    throw new Error("Existing site binding does not match ROVAULTA_P13_SITE_ID");
  }

  const robotsResponse = await request(
    apiOrigin,
    webOrigin,
    `/sites/${encodeURIComponent(resources.siteId)}/robots`,
    { method: "GET", cookie },
  );
  if (robotsResponse.response.status !== 200) {
    throw apiError(robotsResponse.response.status, robotsResponse.body);
  }
  const robots = record(robotsResponse.body, "robots response").robots;
  if (!Array.isArray(robots)) throw new Error("Existing robots response is malformed");
  const robot = robots.find((value) => {
    const candidate = record(value, "robot");
    return candidate.id === resources.robotId && candidate.siteId === resources.siteId;
  });
  if (robot === undefined) throw new Error("Existing robot is not owned by the selected site");

  const buildsResponse = await request(
    apiOrigin,
    webOrigin,
    `/sites/${encodeURIComponent(resources.siteId)}/builds`,
    { method: "GET", cookie },
  );
  if (buildsResponse.response.status !== 200) {
    throw apiError(buildsResponse.response.status, buildsResponse.body);
  }
  const builds = record(buildsResponse.body, "builds response").builds;
  if (!Array.isArray(builds)) throw new Error("Existing builds response is malformed");
  const build = builds.find((value) => {
    const candidate = record(value, "build");
    return (
      candidate.id === resources.buildId &&
      candidate.siteId === resources.siteId &&
      candidate.robotId === resources.robotId
    );
  });
  if (build === undefined) throw new Error("Existing build is not bound to the selected robot");
  return resources;
}

async function evaluate(
  apiOrigin: string,
  webOrigin: string,
  cookie: string,
  resources: { readonly siteId: string; readonly robotId: string; readonly buildId: string },
): Promise<EvaluationOutcome> {
  const submitted = await request(apiOrigin, webOrigin, "/evaluations", {
    method: "POST",
    cookie,
    body: resources,
  });
  if (submitted.response.status === 201) {
    return {
      evaluation: assertEvaluationResources(
        publicEvaluation(record(submitted.body, "evaluation response").evaluation),
        resources,
      ),
    };
  }
  if (submitted.response.status !== 202) throw apiError(submitted.response.status, submitted.body);

  const pending = record(submitted.body, "pending evaluation response");
  const evaluationId = text(pending.evaluationId, "pending evaluationId");
  const creExecutionId =
    typeof pending.creExecutionId === "string" ? pending.creExecutionId : undefined;
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
      return {
        evaluation: assertEvaluationResources(
          publicEvaluation(record(result.body, "completed evaluation response").evaluation),
          resources,
        ),
        ...(creExecutionId === undefined ? {} : { creExecutionId }),
      };
    }
    if (result.response.status !== 202) throw apiError(result.response.status, result.body);
  }
  throw new Error(`CRE evaluation remained PENDING after ${attempts} polls`);
}

function assertEvaluationResources(
  evaluation: PublicEvaluation,
  resources: { readonly siteId: string; readonly robotId: string; readonly buildId: string },
): PublicEvaluation {
  if (
    evaluation.siteId !== resources.siteId ||
    evaluation.robotId !== resources.robotId ||
    evaluation.buildId !== resources.buildId
  ) {
    throw new Error("CRE evaluation resource binding does not match the created account resources");
  }
  return evaluation;
}

function writePublicEvidence(
  path: string,
  evaluation: PublicEvaluation,
  accountId: string,
  creExecutionId: string | undefined,
): string {
  const target = resolve(process.cwd(), path);
  if (existsSync(target)) throw new Error("ROVAULTA_P13_EVIDENCE_PATH already exists");
  mkdirSync(dirname(target), { recursive: true });
  const evidence = {
    evidenceType: "P13 account-created CRE evaluation",
    execution:
      evaluation.executionMode === "official-cre-cli-simulation"
        ? "authenticated CRE CLI simulation through the normal account path"
        : "normal account application path",
    executionMode: evaluation.executionMode ?? null,
    creCliVersion: evaluation.creCliVersion ?? null,
    capturedAt: new Date().toISOString(),
    accountId,
    creExecutionId: creExecutionId ?? null,
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
  assertApiOrigin(apiOrigin);
  const email = required("ROVAULTA_P13_EMAIL");
  const password = required("ROVAULTA_P13_PASSWORD");
  const requestedMode = process.env.ROVAULTA_CRE_EXECUTION_MODE?.trim().toLowerCase();
  const setupOnly = optionalBoolean("ROVAULTA_P13_SETUP_ONLY");
  const setupPath = process.env.ROVAULTA_P13_SETUP_PATH?.trim();
  const configuredSiteId = optionalResourceId("ROVAULTA_P13_SITE_ID");
  const configuredRobotId = optionalResourceId("ROVAULTA_P13_ROBOT_ID");
  const configuredBuildId = optionalResourceId("ROVAULTA_P13_BUILD_ID");
  const configuredResources = [configuredSiteId, configuredRobotId, configuredBuildId];
  const suppliedResourceCount = configuredResources.filter((value) => value !== undefined).length;
  if (suppliedResourceCount !== 0 && suppliedResourceCount !== configuredResources.length) {
    throw new Error(
      "ROVAULTA_P13_SITE_ID, ROVAULTA_P13_ROBOT_ID, and ROVAULTA_P13_BUILD_ID must be supplied together",
    );
  }
  if (suppliedResourceCount === 0 && (setupPath === undefined || setupPath.length === 0)) {
    throw new Error("ROVAULTA_P13_SETUP_PATH is required when resource IDs are not supplied");
  }
  if (suppliedResourceCount === configuredResources.length && setupPath !== undefined) {
    throw new Error("Unset ROVAULTA_P13_SETUP_PATH when reusing existing resource IDs");
  }
  const setup =
    setupPath === undefined
      ? undefined
      : parseSetup(JSON.parse(readFileSync(resolve(process.cwd(), setupPath), "utf8")) as unknown);
  const cookie = await createSession(apiOrigin, webOrigin, email, password);
  const accountResponse = await request(apiOrigin, webOrigin, "/auth/me", {
    method: "GET",
    cookie,
  });
  if (accountResponse.response.status !== 200)
    throw apiError(accountResponse.response.status, accountResponse.body);
  const account = record(accountResponse.body, "account response").account;
  const accountId = text(record(account, "account").id, "account.id");
  const configuredAccountId = process.env.ROVAULTA_P13_ACCOUNT_ID?.trim();
  if (configuredAccountId !== undefined && configuredAccountId.length > 0) {
    if (configuredAccountId !== accountId) {
      throw new Error("Authenticated account does not match ROVAULTA_P13_ACCOUNT_ID");
    }
  }
  const resources =
    suppliedResourceCount === configuredResources.length
      ? await resolveExistingResources(apiOrigin, webOrigin, cookie, {
          siteId: configuredSiteId as string,
          robotId: configuredRobotId as string,
          buildId: configuredBuildId as string,
        })
      : await createResources(apiOrigin, webOrigin, cookie, setup as Setup);
  if (setupOnly) {
    console.log(
      JSON.stringify(
        {
          status: "SETUP_COMPLETE",
          execution: "normal account application path",
          accountId,
          ...resources,
          nextStep:
            requestedMode === "simulation"
              ? "Run the evaluation; simulation mode creates a temporary confidential mapping and removes it after execution"
              : "Provision the site-bound CRE secret before evaluating this build",
        },
        null,
        2,
      ),
    );
    return;
  }
  const outcome = await evaluate(apiOrigin, webOrigin, cookie, resources);
  const evaluation = outcome.evaluation;
  if (
    requestedMode === "simulation" &&
    evaluation.executionMode !== "official-cre-cli-simulation"
  ) {
    throw new Error("the account evaluation was not produced by the official CRE CLI simulation");
  }
  const evidencePath = process.env.ROVAULTA_P13_EVIDENCE_PATH?.trim();

  console.log(
    JSON.stringify(
      {
        status: evaluation.verdict === "CLEAR" ? "CLEAR" : evaluation.verdict,
        execution:
          evaluation.executionMode === "official-cre-cli-simulation"
            ? "authenticated CRE CLI simulation through the normal account path"
            : "normal account application path",
        executionMode: evaluation.executionMode ?? null,
        creCliVersion: evaluation.creCliVersion ?? null,
        accountId,
        siteId: evaluation.siteId,
        robotId: evaluation.robotId,
        buildId: evaluation.buildId,
        evaluationId: evaluation.evaluationId,
        creExecutionId: outcome.creExecutionId ?? null,
        robotBuildDigest: evaluation.robotBuildDigest,
        safetyEnvelopeCommitment: evaluation.safetyEnvelopeCommitment,
        evaluatorVersion: evaluation.evaluatorVersion,
        evaluationInputsDigest: evaluation.evaluationInputsDigest,
        evaluatedAt: evaluation.evaluatedAt,
        publicEvidencePath:
          evaluation.verdict === "CLEAR" && evidencePath !== undefined && evidencePath.length > 0
            ? writePublicEvidence(evidencePath, evaluation, accountId, outcome.creExecutionId)
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
