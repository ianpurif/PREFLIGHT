export interface Account {
  readonly id: string;
  readonly email: string;
  readonly createdAt: string;
}

export interface Site {
  readonly id: string;
  readonly name: string;
  readonly location: string;
  readonly safetyEnvelopeId: string;
  readonly safetyEnvelopeCommitment: string;
  readonly createdAt: string;
}

export interface Robot {
  readonly id: string;
  readonly siteId: string;
  readonly name: string;
  readonly createdAt: string;
}

export interface Build {
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

export type EvaluationVerdict = "CLEAR" | "HOLD" | "ESCALATE";

export interface Evaluation {
  readonly id: string;
  readonly siteId: string;
  readonly robotId: string;
  readonly buildId: string;
  readonly evaluationId: string;
  readonly robotBuildId: string;
  readonly verdict: EvaluationVerdict;
  readonly evaluatorVersion: string;
  readonly robotBuildDigest: string;
  readonly safetyEnvelopeCommitment: string;
  readonly scenarioCount: number;
  readonly violationCount: number;
  readonly reasons: readonly string[];
  readonly evaluatedAt: string;
}

export type ReleaseStatus = "PREPARED" | "LEDGER_APPROVAL_REQUIRED" | "AUTHORIZED" | "BLOCKED";

export interface ReleaseAttempt {
  readonly id: string;
  readonly evaluationId: string;
  readonly status: ReleaseStatus;
  readonly code: string | null;
  readonly message: string;
  readonly createdAt: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = code;
  }
}

const API_ORIGIN = process.env.NEXT_PUBLIC_PREFLIGHT_API_URL ?? "http://localhost:4000";

export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined && !headers.has("content-type"))
    headers.set("content-type", "application/json");
  const response = await fetch(`${API_ORIGIN}${path}`, {
    ...init,
    headers,
    credentials: "include",
  });
  const text = await response.text();
  let payload: unknown = null;
  try {
    payload = text.length === 0 ? null : JSON.parse(text);
  } catch {
    payload = null;
  }
  if (!response.ok) {
    const record =
      payload !== null && typeof payload === "object" ? (payload as Record<string, unknown>) : {};
    throw new ApiError(
      response.status,
      typeof record.error === "string" ? record.error : "REQUEST_FAILED",
      typeof record.message === "string" ? record.message : "Request failed",
    );
  }
  return payload as T;
}

export function jsonBody(value: unknown): string {
  return JSON.stringify(value);
}
