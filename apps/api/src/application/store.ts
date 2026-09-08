import { Database } from "bun:sqlite";
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
  scryptSync,
  timingSafeEqual,
} from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import {
  canonicalSerialize,
  digestRobotBuild,
  digestSafetyEnvelopeCommitment,
  EVALUATION_INPUTS_SCHEMA_VERSION,
  EVALUATION_REQUEST_SCHEMA_VERSION,
  parseClearanceRecord,
  parseEvaluationRequest,
  parseEvaluatorVersionId,
  parseRobotBuildDescriptor,
  parseSafetyEnvelopeId,
  parseSha256Digest,
  parseSiteId,
  ROBOT_BUILD_SCHEMA_VERSION,
  type RobotBuildDescriptor,
} from "@rovaulta/domain";
import {
  CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
  type ConfidentialEvaluationEnvelope,
  confidentialEnvelopeCommitmentPayload,
  parseConfidentialEvaluationEnvelope,
  parsePointMm,
  parseRobotBehaviorTraceSuite,
  ROBOT_TRACE_SUITE_VERSION,
  type RobotBehaviorTraceSuite,
  SCENARIO_GENERATOR_VERSION,
  WAREHOUSE_EVALUATOR_VERSION,
} from "@rovaulta/simulation-core";
import type {
  ConfidentialEvaluationInput,
  ConfidentialEvaluationReport,
} from "../evaluation/index.js";
import { ApplicationError } from "./errors.js";

const SESSION_COOKIE = "rovaulta_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 30;
const POLICY_CIPHERTEXT_VERSION = "rovaulta.policy-ciphertext/v1" as const;
const ACCOUNT_ID_PATTERN = /^account:[a-f0-9]{32}$/;
const MAX_PASSWORD_LENGTH = 256;

export interface PublicAccount {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
}

export interface PolicyInput {
  readonly warehouseWidthMm: number;
  readonly warehouseHeightMm: number;
  readonly restrictedZone: Readonly<{
    readonly minXmm: number;
    readonly minYmm: number;
    readonly maxXmm: number;
    readonly maxYmm: number;
  }>;
  readonly maximumSpeedMmPerSecond: number;
  readonly zoneSpeedLimitMmPerSecond: number;
  readonly payloadThresholdGrams: number;
}

export interface PublicSite {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly safetyEnvelopeId: string;
  readonly safetyEnvelopeCommitment: string;
  readonly createdAt: string;
}

export interface PublicRobot {
  readonly id: string;
  readonly siteId: string;
  readonly name: string;
  readonly createdAt: string;
}

export interface PublicBuild {
  readonly id: string;
  readonly siteId: string;
  readonly robotId: string;
  readonly version: string;
  readonly label: string;
  readonly artifactDigest: string;
  readonly robotBuildDigest: string;
  readonly route: Readonly<{
    readonly start: Readonly<{ readonly xMm: number; readonly yMm: number }>;
    readonly end: Readonly<{ readonly xMm: number; readonly yMm: number }>;
    readonly speedMmPerSecond: number;
  }>;
  readonly createdAt: string;
}

export interface PublicEvaluation {
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
}

export interface PublicReleaseAttempt {
  readonly id: string;
  readonly evaluationId: string;
  readonly status: "PREPARED" | "LEDGER_APPROVAL_REQUIRED" | "AUTHORIZED" | "BLOCKED";
  readonly code: string | null;
  readonly message: string;
  readonly createdAt: string;
}

interface AccountRow {
  id: string;
  email: string;
  password_hash: string;
  created_at: string;
}

interface SessionRow {
  account_id: string;
  expires_at: string;
}

interface SiteRow {
  id: string;
  account_id: string;
  name: string;
  location: string;
  safety_envelope_id: string;
  safety_envelope_commitment: string;
  policy_ciphertext: string;
  created_at: string;
}

interface RobotRow {
  id: string;
  account_id: string;
  site_id: string;
  name: string;
  created_at: string;
}

interface BuildRow {
  id: string;
  account_id: string;
  site_id: string;
  robot_id: string;
  version: string;
  label: string;
  descriptor_json: string;
  trace_json: string;
  route_json: string;
  created_at: string;
}

interface EvaluationRow {
  id: string;
  account_id: string;
  site_id: string;
  robot_id: string;
  build_id: string;
  public_json: string;
  created_at: string;
}

interface ReleaseAttemptRow {
  id: string;
  account_id: string;
  evaluation_id: string;
  status: PublicReleaseAttempt["status"];
  code: string | null;
  message: string;
  created_at: string;
}

interface PersistedPolicy {
  readonly version: typeof POLICY_CIPHERTEXT_VERSION;
  readonly iv: string;
  readonly tag: string;
  readonly ciphertext: string;
}

interface DecryptedPolicy {
  readonly envelope: ConfidentialEvaluationEnvelope;
  readonly blind: Uint8Array;
}

function nowSeconds(): string {
  return Math.floor(Date.now() / 1000).toString();
}

function id(prefix: string): string {
  return `${prefix}:${randomBytes(16).toString("hex")}`;
}

function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("hex");
}

function normalizeEmail(input: unknown): string {
  if (typeof input !== "string") throw new ApplicationError("INVALID_INPUT", "Email is required");
  const email = input.trim().toLowerCase();
  if (email.length < 3 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new ApplicationError("INVALID_INPUT", "Enter a valid email address");
  }
  return email;
}

function validatePassword(input: unknown): string {
  if (typeof input !== "string" || input.length < 12 || input.length > MAX_PASSWORD_LENGTH) {
    throw new ApplicationError("INVALID_INPUT", "Password must be 12-256 characters");
  }
  return input;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16);
  const digest = scryptSync(password, salt, 32, {
    N: 16_384,
    r: 8,
    p: 1,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${salt.toString("base64url")}$${digest.toString("base64url")}`;
}

function verifyPassword(password: string, encoded: string): boolean {
  const [algorithm, saltEncoded, digestEncoded] = encoded.split("$");
  if (algorithm !== "scrypt" || saltEncoded === undefined || digestEncoded === undefined)
    return false;
  try {
    const salt = Buffer.from(saltEncoded, "base64url");
    const expected = Buffer.from(digestEncoded, "base64url");
    const actual = scryptSync(password, salt, expected.length, {
      N: 16_384,
      r: 8,
      p: 1,
      maxmem: 64 * 1024 * 1024,
    });
    return expected.length === actual.length && timingSafeEqual(expected, actual);
  } catch {
    return false;
  }
}

function canonicalPolicyKey(input: Uint8Array | undefined): Uint8Array {
  if (input === undefined || input.length !== 32) {
    throw new ApplicationError("POLICY_UNAVAILABLE", "A 32-byte policy encryption key is required");
  }
  return Uint8Array.from(input);
}

function parseInteger(input: unknown, label: string, minimum: number, maximum: number): number {
  if (
    typeof input !== "number" ||
    !Number.isSafeInteger(input) ||
    input < minimum ||
    input > maximum
  ) {
    throw new ApplicationError(
      "INVALID_INPUT",
      `${label} must be an integer from ${minimum} to ${maximum}`,
    );
  }
  return input;
}

function parseText(input: unknown, label: string, minimum = 1, maximum = 120): string {
  if (typeof input !== "string")
    throw new ApplicationError("INVALID_INPUT", `${label} is required`);
  const value = input.trim();
  if (value.length < minimum || value.length > maximum) {
    throw new ApplicationError(
      "INVALID_INPUT",
      `${label} must be ${minimum}-${maximum} characters`,
    );
  }
  return value;
}

function parsePoint(input: unknown, label: string) {
  try {
    return parsePointMm(input, label);
  } catch {
    throw new ApplicationError("INVALID_INPUT", `${label} is not a valid point`);
  }
}

function parsePolicy(input: unknown): PolicyInput {
  if (input === null || typeof input !== "object" || Array.isArray(input)) {
    throw new ApplicationError("INVALID_INPUT", "Safety policy is required");
  }
  const record = input as Record<string, unknown>;
  const keys = [
    "warehouseWidthMm",
    "warehouseHeightMm",
    "restrictedZone",
    "maximumSpeedMmPerSecond",
    "zoneSpeedLimitMmPerSecond",
    "payloadThresholdGrams",
  ] as const;
  if (Object.keys(record).some((key) => !keys.includes(key as (typeof keys)[number]))) {
    throw new ApplicationError("INVALID_INPUT", "Safety policy contains an unsupported field");
  }
  const zone = record.restrictedZone;
  if (zone === null || typeof zone !== "object" || Array.isArray(zone)) {
    throw new ApplicationError("INVALID_INPUT", "Restricted zone is required");
  }
  const zoneRecord = zone as Record<string, unknown>;
  const zoneKeys = ["minXmm", "minYmm", "maxXmm", "maxYmm"] as const;
  if (Object.keys(zoneRecord).some((key) => !zoneKeys.includes(key as (typeof zoneKeys)[number]))) {
    throw new ApplicationError("INVALID_INPUT", "Restricted zone contains an unsupported field");
  }
  const width = parseInteger(record.warehouseWidthMm, "Warehouse width", 1_000, 10_000_000);
  const height = parseInteger(record.warehouseHeightMm, "Warehouse height", 1_000, 10_000_000);
  const parsedZone = {
    minXmm: parseInteger(zoneRecord.minXmm, "Restricted zone minXmm", 0, width - 1),
    minYmm: parseInteger(zoneRecord.minYmm, "Restricted zone minYmm", 0, height - 1),
    maxXmm: parseInteger(zoneRecord.maxXmm, "Restricted zone maxXmm", 1, width),
    maxYmm: parseInteger(zoneRecord.maxYmm, "Restricted zone maxYmm", 1, height),
  } as const;
  if (parsedZone.minXmm >= parsedZone.maxXmm || parsedZone.minYmm >= parsedZone.maxYmm) {
    throw new ApplicationError("INVALID_INPUT", "Restricted zone must have positive dimensions");
  }
  return Object.freeze({
    warehouseWidthMm: width,
    warehouseHeightMm: height,
    restrictedZone: Object.freeze(parsedZone),
    maximumSpeedMmPerSecond: parseInteger(
      record.maximumSpeedMmPerSecond,
      "Maximum speed",
      1,
      1_000_000,
    ),
    zoneSpeedLimitMmPerSecond: parseInteger(
      record.zoneSpeedLimitMmPerSecond,
      "Zone speed limit",
      1,
      1_000_000,
    ),
    payloadThresholdGrams: parseInteger(
      record.payloadThresholdGrams,
      "Payload threshold",
      0,
      1_000_000_000,
    ),
  });
}

function buildEnvelope(
  siteId: string,
  safetyEnvelopeId: string,
  input: PolicyInput,
): ConfidentialEvaluationEnvelope {
  try {
    return parseConfidentialEvaluationEnvelope({
      schemaVersion: CONFIDENTIAL_EVALUATION_ENVELOPE_VERSION,
      siteId,
      safetyEnvelopeId,
      warehouseBounds: {
        minXmm: 0,
        minYmm: 0,
        maxXmm: input.warehouseWidthMm,
        maxYmm: input.warehouseHeightMm,
      },
      zones: [{ zoneId: "zone:restricted", bounds: input.restrictedZone }],
      rules: [
        { ruleId: "rule:restricted-zone", type: "restricted-zone", zoneId: "zone:restricted" },
        {
          ruleId: "rule:site-speed",
          type: "site-speed-limit",
          maximumMmPerSecond: input.maximumSpeedMmPerSecond,
        },
        {
          ruleId: "rule:zone-speed",
          type: "zone-speed-limit",
          zoneId: "zone:restricted",
          maximumMmPerSecond: input.zoneSpeedLimitMmPerSecond,
        },
        {
          ruleId: "rule:payload-zone",
          type: "payload-zone-restriction",
          zoneId: "zone:restricted",
          payloadGreaterThanGrams: input.payloadThresholdGrams,
        },
      ],
      scenarioGeneration: {
        generatorVersion: SCENARIO_GENERATOR_VERSION,
        seed: 0x5eed1234,
        templates: [
          {
            scenarioId: "scenario:restricted-route",
            basePayloadGrams: 20_000,
            payloadVariationGrams: 500,
          },
          {
            scenarioId: "scenario:human-zone-speed",
            basePayloadGrams: 25_000,
            payloadVariationGrams: 500,
          },
          {
            scenarioId: "scenario:heavy-payload-route",
            basePayloadGrams: 50_000,
            payloadVariationGrams: 500,
          },
        ],
      },
    });
  } catch (error) {
    if (error instanceof ApplicationError) throw error;
    throw new ApplicationError("INVALID_INPUT", "Safety policy could not be validated");
  }
}

function encryptPolicy(value: DecryptedPolicy, key: Uint8Array): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const payload = canonicalSerialize({
    envelope: value.envelope,
    blind: Buffer.from(value.blind).toString("base64url"),
  });
  const ciphertext = Buffer.concat([cipher.update(payload, "utf8"), cipher.final()]);
  return JSON.stringify({
    version: POLICY_CIPHERTEXT_VERSION,
    iv: iv.toString("base64url"),
    tag: cipher.getAuthTag().toString("base64url"),
    ciphertext: ciphertext.toString("base64url"),
  } satisfies PersistedPolicy);
}

function decryptPolicy(encoded: string, key: Uint8Array): DecryptedPolicy {
  try {
    const stored = JSON.parse(encoded) as PersistedPolicy;
    if (stored.version !== POLICY_CIPHERTEXT_VERSION) throw new Error();
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(stored.iv, "base64url"));
    decipher.setAuthTag(Buffer.from(stored.tag, "base64url"));
    const plaintext = Buffer.concat([
      decipher.update(Buffer.from(stored.ciphertext, "base64url")),
      decipher.final(),
    ]).toString("utf8");
    const parsed = JSON.parse(plaintext) as { envelope: unknown; blind: string };
    const envelope = parseConfidentialEvaluationEnvelope(parsed.envelope);
    const blind = Uint8Array.from(Buffer.from(parsed.blind, "base64url"));
    if (blind.length !== 32) throw new Error();
    return Object.freeze({ envelope, blind });
  } catch {
    throw new ApplicationError("POLICY_UNAVAILABLE", "Stored safety policy could not be opened");
  }
}

function publicAccount(row: AccountRow): PublicAccount {
  return Object.freeze({ id: row.id, email: row.email, createdAt: row.created_at });
}

function publicSite(row: SiteRow): PublicSite {
  return Object.freeze({
    id: row.id,
    name: row.name,
    location: row.location,
    safetyEnvelopeId: row.safety_envelope_id,
    safetyEnvelopeCommitment: row.safety_envelope_commitment,
    createdAt: row.created_at,
  });
}

function publicRobot(row: RobotRow): PublicRobot {
  return Object.freeze({
    id: row.id,
    siteId: row.site_id,
    name: row.name,
    createdAt: row.created_at,
  });
}

function publicBuild(row: BuildRow): PublicBuild {
  const descriptor = parseRobotBuildDescriptor(JSON.parse(row.descriptor_json));
  const route = JSON.parse(row.route_json) as PublicBuild["route"];
  return Object.freeze({
    id: row.id,
    siteId: row.site_id,
    robotId: row.robot_id,
    version: row.version,
    label: row.label,
    artifactDigest: descriptor.artifactDigest,
    robotBuildDigest: digestRobotBuild(descriptor),
    route,
    createdAt: row.created_at,
  });
}

function publicEvaluation(row: EvaluationRow): PublicEvaluation {
  return Object.freeze(JSON.parse(row.public_json) as PublicEvaluation);
}

function assertAccountId(accountId: string): void {
  if (!ACCOUNT_ID_PATTERN.test(accountId))
    throw new ApplicationError("AUTH_REQUIRED", "Session is invalid");
}

export class ApplicationStore {
  readonly #database: Database;
  readonly #policyKey: Uint8Array;
  readonly #now: () => string;

  constructor(options: {
    readonly dbPath: string;
    readonly policyKey: Uint8Array;
    readonly now?: () => string;
  }) {
    try {
      if (options.dbPath !== ":memory:") mkdirSync(dirname(options.dbPath), { recursive: true });
      this.#database = new Database(options.dbPath, { create: true, strict: true });
      this.#database.run("PRAGMA journal_mode = WAL");
      this.#database.run("PRAGMA synchronous = FULL");
      this.#database.run("PRAGMA foreign_keys = ON");
      this.#database.run(`
        CREATE TABLE IF NOT EXISTS accounts (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS sessions (
          token_hash TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          expires_at TEXT NOT NULL,
          created_at TEXT NOT NULL
        ) STRICT;
        CREATE TABLE IF NOT EXISTS sites (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          location TEXT NOT NULL,
          safety_envelope_id TEXT NOT NULL,
          safety_envelope_commitment TEXT NOT NULL,
          policy_ciphertext TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(account_id, id)
        ) STRICT;
        CREATE TABLE IF NOT EXISTS robots (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          name TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(account_id, id)
        ) STRICT;
        CREATE TABLE IF NOT EXISTS builds (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          robot_id TEXT NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
          version TEXT NOT NULL,
          label TEXT NOT NULL,
          descriptor_json TEXT NOT NULL,
          trace_json TEXT NOT NULL,
          route_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(account_id, id)
        ) STRICT;
        CREATE TABLE IF NOT EXISTS evaluations (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          site_id TEXT NOT NULL REFERENCES sites(id) ON DELETE CASCADE,
          robot_id TEXT NOT NULL REFERENCES robots(id) ON DELETE CASCADE,
          build_id TEXT NOT NULL REFERENCES builds(id) ON DELETE CASCADE,
          public_json TEXT NOT NULL,
          created_at TEXT NOT NULL,
          UNIQUE(account_id, id)
        ) STRICT;
        CREATE TABLE IF NOT EXISTS release_attempts (
          id TEXT PRIMARY KEY,
          account_id TEXT NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
          evaluation_id TEXT NOT NULL REFERENCES evaluations(id) ON DELETE CASCADE,
          status TEXT NOT NULL,
          code TEXT,
          message TEXT NOT NULL,
          created_at TEXT NOT NULL
        ) STRICT;
      `);
      this.#policyKey = canonicalPolicyKey(options.policyKey);
      this.#now = options.now ?? nowSeconds;
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError("PERSISTENCE_UNAVAILABLE", "Application store is unavailable");
    }
  }

  registerAccount(input: { readonly email: unknown; readonly password: unknown }): {
    account: PublicAccount;
    sessionToken: string;
    expiresAt: string;
  } {
    const email = normalizeEmail(input.email);
    const password = validatePassword(input.password);
    const createdAt = this.#now();
    const accountId = id("account");
    try {
      const row = this.#database
        .query<AccountRow, [string]>("SELECT id FROM accounts WHERE email = ?")
        .get(email);
      if (row !== null && row !== undefined)
        throw new ApplicationError(
          "DUPLICATE_ACCOUNT",
          "An account with that email already exists",
        );
      this.#database
        .query("INSERT INTO accounts (id, email, password_hash, created_at) VALUES (?, ?, ?, ?)")
        .run(accountId, email, hashPassword(password), createdAt);
    } catch (error) {
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError("DUPLICATE_ACCOUNT", "An account with that email already exists");
    }
    const session = this.createSession(accountId);
    return { account: { id: accountId, email, createdAt }, ...session };
  }

  signIn(input: { readonly email: unknown; readonly password: unknown }): {
    account: PublicAccount;
    sessionToken: string;
    expiresAt: string;
  } {
    const email = normalizeEmail(input.email);
    const password = validatePassword(input.password);
    const row = this.#database
      .query<AccountRow, [string]>("SELECT * FROM accounts WHERE email = ?")
      .get(email);
    if (row === null || row === undefined || !verifyPassword(password, row.password_hash)) {
      throw new ApplicationError("INVALID_CREDENTIALS", "Email or password is incorrect");
    }
    const session = this.createSession(row.id);
    return { account: publicAccount(row), ...session };
  }

  createSession(accountId: string): { sessionToken: string; expiresAt: string } {
    assertAccountId(accountId);
    const token = randomBytes(32).toString("base64url");
    const expiresAt = (BigInt(this.#now()) + BigInt(SESSION_TTL_SECONDS)).toString();
    this.#database
      .query(
        "INSERT INTO sessions (token_hash, account_id, expires_at, created_at) VALUES (?, ?, ?, ?)",
      )
      .run(hashToken(token), accountId, expiresAt, this.#now());
    return { sessionToken: token, expiresAt };
  }

  accountForSession(token: string | null | undefined): PublicAccount | null {
    if (token === null || token === undefined || token.length < 16) return null;
    const row = this.#database
      .query<SessionRow, [string]>(
        "SELECT account_id, expires_at FROM sessions WHERE token_hash = ?",
      )
      .get(hashToken(token));
    if (row === null || row === undefined) return null;
    if (BigInt(row.expires_at) <= BigInt(this.#now())) {
      this.#database.query("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
      return null;
    }
    const account = this.#database
      .query<AccountRow, [string]>("SELECT * FROM accounts WHERE id = ?")
      .get(row.account_id);
    return account === null || account === undefined ? null : publicAccount(account);
  }

  revokeSession(token: string | null | undefined): void {
    if (token === null || token === undefined) return;
    this.#database.query("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
  }

  createSite(
    accountId: string,
    input: { readonly name: unknown; readonly location: unknown; readonly policy: unknown },
  ): PublicSite {
    assertAccountId(accountId);
    const name = parseText(input.name, "Site name");
    const location = parseText(input.location, "Site location", 1, 160);
    const policyInput = parsePolicy(input.policy);
    const siteId = id("site");
    const safetyEnvelopeId = id("safety-envelope");
    const envelope = buildEnvelope(siteId, safetyEnvelopeId, policyInput);
    const blind = randomBytes(32);
    const commitment = digestSafetyEnvelopeCommitment(
      parseSiteId(siteId),
      parseSafetyEnvelopeId(safetyEnvelopeId),
      confidentialEnvelopeCommitmentPayload(envelope),
      blind,
    );
    const createdAt = this.#now();
    const row: SiteRow = {
      id: siteId,
      account_id: accountId,
      name,
      location,
      safety_envelope_id: safetyEnvelopeId,
      safety_envelope_commitment: commitment,
      policy_ciphertext: encryptPolicy({ envelope, blind }, this.#policyKey),
      created_at: createdAt,
    };
    this.#database
      .query(
        "INSERT INTO sites (id, account_id, name, location, safety_envelope_id, safety_envelope_commitment, policy_ciphertext, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        row.id,
        row.account_id,
        row.name,
        row.location,
        row.safety_envelope_id,
        row.safety_envelope_commitment,
        row.policy_ciphertext,
        row.created_at,
      );
    return publicSite(row);
  }

  listSites(accountId: string): readonly PublicSite[] {
    assertAccountId(accountId);
    return Object.freeze(
      this.#database
        .query<SiteRow, [string]>(
          "SELECT * FROM sites WHERE account_id = ? ORDER BY created_at, id",
        )
        .all(accountId)
        .map(publicSite),
    );
  }

  getSite(accountId: string, siteId: string): PublicSite {
    const row = this.#siteRow(accountId, siteId);
    return publicSite(row);
  }

  createRobot(accountId: string, siteId: string, input: { readonly name: unknown }): PublicRobot {
    const site = this.#siteRow(accountId, siteId);
    const row: RobotRow = {
      id: id("robot"),
      account_id: accountId,
      site_id: site.id,
      name: parseText(input.name, "Robot name"),
      created_at: this.#now(),
    };
    this.#database
      .query(
        "INSERT INTO robots (id, account_id, site_id, name, created_at) VALUES (?, ?, ?, ?, ?)",
      )
      .run(row.id, row.account_id, row.site_id, row.name, row.created_at);
    return publicRobot(row);
  }

  listRobots(accountId: string, siteId: string): readonly PublicRobot[] {
    this.#siteRow(accountId, siteId);
    return Object.freeze(
      this.#database
        .query<RobotRow, [string, string]>(
          "SELECT * FROM robots WHERE account_id = ? AND site_id = ? ORDER BY created_at, id",
        )
        .all(accountId, siteId)
        .map(publicRobot),
    );
  }

  createBuild(
    accountId: string,
    siteId: string,
    input: {
      readonly robotId: unknown;
      readonly version: unknown;
      readonly label: unknown;
      readonly artifactDigest: unknown;
      readonly route: unknown;
    },
  ): PublicBuild {
    const site = this.#siteRow(accountId, siteId);
    if (typeof input.robotId !== "string")
      throw new ApplicationError("INVALID_INPUT", "Robot id is required");
    const robot = this.#robotRow(accountId, site.id, input.robotId);
    const version = parseText(input.version, "Build version", 1, 80);
    const label = parseText(input.label, "Build label", 1, 120);
    let artifactDigest: RobotBuildDescriptor["artifactDigest"];
    try {
      artifactDigest = parseSha256Digest(input.artifactDigest, "artifactDigest");
    } catch {
      throw new ApplicationError(
        "INVALID_INPUT",
        "Artifact digest must be sha256:<64 lowercase hex characters>",
      );
    }
    if (input.route === null || typeof input.route !== "object" || Array.isArray(input.route))
      throw new ApplicationError("INVALID_INPUT", "A route is required");
    const route = input.route as Record<string, unknown>;
    const start = parsePoint(route.start, "route.start");
    const end = parsePoint(route.end, "route.end");
    const speed = parseInteger(route.speedMmPerSecond, "Route speed", 0, 1_000_000);
    const policy = decryptPolicy(site.policy_ciphertext, this.#policyKey);
    const bounds = policy.envelope.warehouseBounds;
    for (const [point, labelName] of [
      [start, "route.start"],
      [end, "route.end"],
    ] as const) {
      if (
        point.xMm < bounds.minXmm ||
        point.xMm > bounds.maxXmm ||
        point.yMm < bounds.minYmm ||
        point.yMm > bounds.maxYmm
      ) {
        throw new ApplicationError(
          "INVALID_INPUT",
          `${labelName} must be inside the warehouse bounds`,
        );
      }
    }
    const buildId = id("robot-build");
    const descriptor: RobotBuildDescriptor = parseRobotBuildDescriptor({
      schemaVersion: ROBOT_BUILD_SCHEMA_VERSION,
      robotId: robot.id,
      robotBuildId: buildId,
      artifactDigest,
    });
    const traces: RobotBehaviorTraceSuite = parseRobotBehaviorTraceSuite({
      schemaVersion: ROBOT_TRACE_SUITE_VERSION,
      robotId: robot.id,
      robotBuildId: buildId,
      robotBuildDigest: digestRobotBuild(descriptor),
      traces: [
        "scenario:restricted-route",
        "scenario:human-zone-speed",
        "scenario:heavy-payload-route",
      ].map((scenarioId) => ({
        scenarioId,
        steps: [
          { stepIndex: 0, position: start, speedMmPerSecond: 0 },
          { stepIndex: 1, position: end, speedMmPerSecond: speed },
        ],
      })),
    });
    const createdAt = this.#now();
    const row: BuildRow = {
      id: buildId,
      account_id: accountId,
      site_id: site.id,
      robot_id: robot.id,
      version,
      label,
      descriptor_json: canonicalSerialize(descriptor),
      trace_json: canonicalSerialize(traces),
      route_json: canonicalSerialize({ start, end, speedMmPerSecond: speed }),
      created_at: createdAt,
    };
    this.#database
      .query(
        "INSERT INTO builds (id, account_id, site_id, robot_id, version, label, descriptor_json, trace_json, route_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        row.id,
        row.account_id,
        row.site_id,
        row.robot_id,
        row.version,
        row.label,
        row.descriptor_json,
        row.trace_json,
        row.route_json,
        row.created_at,
      );
    return publicBuild(row);
  }

  listBuilds(accountId: string, siteId: string): readonly PublicBuild[] {
    this.#siteRow(accountId, siteId);
    return Object.freeze(
      this.#database
        .query<BuildRow, [string, string]>(
          "SELECT * FROM builds WHERE account_id = ? AND site_id = ? ORDER BY created_at, id",
        )
        .all(accountId, siteId)
        .map(publicBuild),
    );
  }

  listAllBuilds(accountId: string): readonly PublicBuild[] {
    assertAccountId(accountId);
    return Object.freeze(
      this.#database
        .query<BuildRow, [string]>(
          "SELECT * FROM builds WHERE account_id = ? ORDER BY created_at, id",
        )
        .all(accountId)
        .map(publicBuild),
    );
  }

  async evaluateBuild(
    accountId: string,
    input: {
      readonly siteId: string;
      readonly robotId: string;
      readonly buildId: string;
      readonly evaluationId: string;
      readonly requestedAt: string;
      readonly evaluatedAt: string;
      readonly evaluate: (
        value: ConfidentialEvaluationInput,
      ) => ConfidentialEvaluationReport | Promise<ConfidentialEvaluationReport>;
    },
  ): Promise<PublicEvaluation> {
    const site = this.#siteRow(accountId, input.siteId);
    const robot = this.#robotRow(accountId, site.id, input.robotId);
    const build = this.#buildRow(accountId, site.id, robot.id, input.buildId);
    const policy = decryptPolicy(site.policy_ciphertext, this.#policyKey);
    const descriptor = parseRobotBuildDescriptor(JSON.parse(build.descriptor_json));
    const traces = parseRobotBehaviorTraceSuite(JSON.parse(build.trace_json));
    const request = parseEvaluationRequest({
      schemaVersion: EVALUATION_REQUEST_SCHEMA_VERSION,
      evaluationId: input.evaluationId,
      inputs: {
        schemaVersion: EVALUATION_INPUTS_SCHEMA_VERSION,
        siteId: site.id,
        robotId: robot.id,
        robotBuildId: descriptor.robotBuildId,
        robotBuildDigest: digestRobotBuild(descriptor),
        safetyEnvelopeId: site.safety_envelope_id,
        safetyEnvelopeCommitment: site.safety_envelope_commitment,
        evaluatorVersion: parseEvaluatorVersionId(WAREHOUSE_EVALUATOR_VERSION),
      },
      requestedAt: input.requestedAt,
    });
    const report = await input.evaluate({
      request,
      robotBuild: descriptor,
      confidentialEnvelope: policy.envelope,
      envelopeBlindingSecret: policy.blind,
      behaviorTraces: traces,
      evaluatedAt: input.evaluatedAt,
    });
    const reasons = Object.freeze(
      Array.from(new Set((report.violations ?? []).map((violation) => violation.type))),
    );
    const result: PublicEvaluation = Object.freeze({
      id: id("evaluation-record"),
      siteId: site.id,
      robotId: robot.id,
      buildId: build.id,
      evaluationId: report.result.evaluationId,
      robotBuildId: report.result.inputs.robotBuildId,
      verdict: report.result.verdict,
      safetyEnvelopeId: report.result.inputs.safetyEnvelopeId,
      evaluatorVersion: report.result.inputs.evaluatorVersion,
      robotBuildDigest: report.result.inputs.robotBuildDigest,
      safetyEnvelopeCommitment: report.result.inputs.safetyEnvelopeCommitment,
      evaluationInputsDigest: report.result.evaluationInputsDigest,
      scenarioCount: report.scenarioCount ?? null,
      violationCount: report.violationCount ?? null,
      reasons,
      evaluatedAt: report.result.evaluatedAt,
    });
    const row: EvaluationRow = {
      id: result.id,
      account_id: accountId,
      site_id: site.id,
      robot_id: robot.id,
      build_id: build.id,
      public_json: canonicalSerialize(result),
      created_at: this.#now(),
    };
    this.#database
      .query(
        "INSERT INTO evaluations (id, account_id, site_id, robot_id, build_id, public_json, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        row.id,
        row.account_id,
        row.site_id,
        row.robot_id,
        row.build_id,
        row.public_json,
        row.created_at,
      );
    return result;
  }

  listEvaluations(accountId: string): readonly PublicEvaluation[] {
    assertAccountId(accountId);
    return Object.freeze(
      this.#database
        .query<EvaluationRow, [string]>(
          "SELECT * FROM evaluations WHERE account_id = ? ORDER BY created_at DESC, id DESC",
        )
        .all(accountId)
        .map(publicEvaluation),
    );
  }

  getEvaluation(accountId: string, evaluationId: string): PublicEvaluation {
    assertAccountId(accountId);
    const row = this.#database
      .query<EvaluationRow, [string, string]>(
        "SELECT * FROM evaluations WHERE account_id = ? AND id = ?",
      )
      .get(accountId, evaluationId);
    if (row !== null && row !== undefined) return publicEvaluation(row);
    const candidates = this.#database
      .query<EvaluationRow, [string]>("SELECT * FROM evaluations WHERE account_id = ?")
      .all(accountId);
    const match = candidates.find(
      (candidate) =>
        (JSON.parse(candidate.public_json) as PublicEvaluation).evaluationId === evaluationId,
    );
    if (match === undefined) throw new ApplicationError("NOT_FOUND", "Evaluation was not found");
    return publicEvaluation(match);
  }

  getDeploymentContext(
    accountId: string,
    evaluationId: string,
    clearanceInput: unknown,
  ): {
    readonly evaluation: PublicEvaluation;
    readonly clearance: ReturnType<typeof parseClearanceRecord>;
  } {
    const evaluation = this.getEvaluation(accountId, evaluationId);
    let clearance: ReturnType<typeof parseClearanceRecord>;
    try {
      clearance = parseClearanceRecord(clearanceInput);
    } catch {
      throw new ApplicationError("CONFLICT", "The public clearance record is malformed");
    }
    const matches =
      clearance.evaluationId === evaluation.evaluationId &&
      clearance.inputs.siteId === evaluation.siteId &&
      clearance.inputs.robotId === evaluation.robotId &&
      clearance.inputs.robotBuildId === evaluation.robotBuildId &&
      clearance.inputs.robotBuildDigest === evaluation.robotBuildDigest &&
      clearance.inputs.safetyEnvelopeId === evaluation.safetyEnvelopeId &&
      clearance.inputs.safetyEnvelopeCommitment === evaluation.safetyEnvelopeCommitment &&
      clearance.inputs.evaluatorVersion === evaluation.evaluatorVersion &&
      clearance.evaluationInputsDigest === evaluation.evaluationInputsDigest;
    if (!matches) {
      throw new ApplicationError("CONFLICT", "The clearance does not match the account evaluation");
    }
    return Object.freeze({ evaluation, clearance });
  }

  recordReleaseAttempt(
    accountId: string,
    input: Omit<PublicReleaseAttempt, "id" | "createdAt">,
  ): PublicReleaseAttempt {
    assertAccountId(accountId);
    const evaluation = this.getEvaluation(accountId, input.evaluationId);
    const row: ReleaseAttemptRow = {
      id: id("release-attempt"),
      account_id: accountId,
      evaluation_id: evaluation.id,
      status: input.status,
      code: input.code,
      message: input.message,
      created_at: this.#now(),
    };
    this.#database
      .query(
        "INSERT INTO release_attempts (id, account_id, evaluation_id, status, code, message, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
      )
      .run(
        row.id,
        row.account_id,
        row.evaluation_id,
        row.status,
        row.code,
        row.message,
        row.created_at,
      );
    return Object.freeze({
      id: row.id,
      evaluationId: evaluation.evaluationId,
      status: row.status,
      code: row.code,
      message: row.message,
      createdAt: row.created_at,
    });
  }

  listReleaseAttempts(accountId: string): readonly PublicReleaseAttempt[] {
    assertAccountId(accountId);
    return Object.freeze(
      this.#database
        .query<ReleaseAttemptRow & { evaluation_public_json: string }, [string]>(
          "SELECT release_attempts.*, evaluations.public_json AS evaluation_public_json FROM release_attempts JOIN evaluations ON evaluations.id = release_attempts.evaluation_id WHERE release_attempts.account_id = ? ORDER BY release_attempts.created_at DESC, release_attempts.id DESC",
        )
        .all(accountId)
        .map((row) =>
          Object.freeze({
            id: row.id,
            evaluationId: (JSON.parse(row.evaluation_public_json) as PublicEvaluation).evaluationId,
            status: row.status,
            code: row.code,
            message: row.message,
            createdAt: row.created_at,
          }),
        ),
    );
  }

  close(): void {
    this.#database.close();
  }

  static sessionCookieName(): string {
    return SESSION_COOKIE;
  }

  static sessionCookie(token: string, secure: boolean): string {
    return `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}${secure ? "; Secure" : ""}`;
  }

  static clearSessionCookie(secure: boolean): string {
    return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secure ? "; Secure" : ""}`;
  }

  static readSessionCookie(header: string | undefined): string | null {
    if (header === undefined) return null;
    for (const part of header.split(";")) {
      const [name, ...rest] = part.trim().split("=");
      if (name === SESSION_COOKIE) {
        try {
          return decodeURIComponent(rest.join("="));
        } catch {
          return null;
        }
      }
    }
    return null;
  }

  #siteRow(accountId: string, siteId: string): SiteRow {
    assertAccountId(accountId);
    const row = this.#database
      .query<SiteRow, [string, string]>("SELECT * FROM sites WHERE account_id = ? AND id = ?")
      .get(accountId, siteId);
    if (row === null || row === undefined)
      throw new ApplicationError("NOT_FOUND", "Site was not found");
    return row;
  }

  #robotRow(accountId: string, siteId: string, robotId: string): RobotRow {
    const row = this.#database
      .query<RobotRow, [string, string, string]>(
        "SELECT * FROM robots WHERE account_id = ? AND site_id = ? AND id = ?",
      )
      .get(accountId, siteId, robotId);
    if (row === null || row === undefined)
      throw new ApplicationError("NOT_FOUND", "Robot was not found");
    return row;
  }

  #buildRow(accountId: string, siteId: string, robotId: string, buildId: string): BuildRow {
    const row = this.#database
      .query<BuildRow, [string, string, string, string]>(
        "SELECT * FROM builds WHERE account_id = ? AND site_id = ? AND robot_id = ? AND id = ?",
      )
      .get(accountId, siteId, robotId, buildId);
    if (row === null || row === undefined)
      throw new ApplicationError("NOT_FOUND", "Build was not found");
    return row;
  }
}

export { SESSION_COOKIE };
