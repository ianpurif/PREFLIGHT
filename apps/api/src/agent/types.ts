import type { ClearanceRecord } from "@rovaulta/domain";
import type { PreparedReleaseRequest, ReleaseAuthorization } from "../release/index.js";

export const DEPLOYMENT_AGENT_AUDIT_SCHEMA_VERSION = "rovaulta.deployment-agent-audit/v1" as const;

export const DEPLOYMENT_AGENT_TOOL_NAMES = Object.freeze([
  "resolveDeploymentTarget",
  "getDeploymentContext",
  "getEvaluationStatus",
  "getClearance",
  "prepareDeploymentIntent",
  "getLedgerAuthorizationStatus",
] as const);

export type DeploymentAgentToolName = (typeof DEPLOYMENT_AGENT_TOOL_NAMES)[number];

export type DeploymentAgentErrorCode =
  | "MALFORMED_AGENT_REQUEST"
  | "TARGET_NOT_FOUND"
  | "TARGET_AMBIGUOUS"
  | "AGENT_PROTOCOL_VIOLATION"
  | "PROVIDER_UNAVAILABLE"
  | "PROVIDER_FAILED";

export class DeploymentAgentError extends Error {
  readonly code: DeploymentAgentErrorCode;

  constructor(code: DeploymentAgentErrorCode, message: string) {
    super(message);
    this.name = "DeploymentAgentError";
    this.code = code;
  }
}

export interface DeploymentTarget {
  readonly siteId: string;
  readonly robotId: string;
  readonly robotBuildId: string;
  readonly robotBuildDigest: string;
}

export interface PublicEvaluationStatus {
  readonly evaluationId: string;
  readonly verdict: "CLEAR" | "HOLD";
}

export interface DeploymentCatalogEntry {
  readonly key: string;
  readonly aliases: Readonly<{
    site: readonly string[];
    robot: readonly string[];
    build: readonly string[];
  }>;
  readonly target: DeploymentTarget;
  readonly evaluation: PublicEvaluationStatus;
  readonly clearance: ClearanceRecord | null;
}

export interface DeploymentAgentToolDefinition {
  readonly name: DeploymentAgentToolName;
  readonly description: string;
  readonly parameters: Readonly<Record<string, unknown>>;
}

export interface DeploymentAgentToolCall {
  readonly name: string;
  readonly arguments: unknown;
}

export interface DeploymentAgentObservation {
  readonly tool: DeploymentAgentToolName;
  readonly result: Readonly<Record<string, unknown>>;
}

export interface DeploymentAgentModelTurn {
  readonly publicRequest: string;
  readonly expectedTool: DeploymentAgentToolDefinition;
  readonly observations: readonly DeploymentAgentObservation[];
}

export interface DeploymentAgentModel {
  readonly provider: string;
  readonly model: string;
  callTool(turn: DeploymentAgentModelTurn): Promise<DeploymentAgentToolCall>;
}

export interface DeploymentAuditToolEvent {
  readonly sequence: number;
  readonly tool: DeploymentAgentToolName;
  readonly result: string;
  readonly code?: string;
}

export type DeploymentAgentFinalStatus = "BLOCKED" | "LEDGER_APPROVAL_REQUIRED" | "AUTHORIZED";
export type LedgerAuthorizationStatus = "NOT_REQUESTED" | "AWAITING_HUMAN" | "AUTHORIZED";

export interface DeploymentAgentAudit {
  readonly schemaVersion: typeof DEPLOYMENT_AGENT_AUDIT_SCHEMA_VERSION;
  readonly attemptId: string;
  readonly createdAt: string;
  readonly request: string;
  readonly provider: Readonly<{ name: string; model: string }>;
  readonly target?: DeploymentTarget;
  readonly toolCalls: readonly DeploymentAuditToolEvent[];
  readonly clearanceResult: string;
  readonly clearanceInspection?: Readonly<{
    chainId: number;
    registry: string;
    blockNumber: string;
    blockHash: string;
  }>;
  readonly policyResult: string;
  readonly protocolIntentDigest?: string;
  readonly typedDataDigest?: string;
  readonly ledgerAuthorizationStatus: LedgerAuthorizationStatus;
  readonly finalReleaseStatus: DeploymentAgentFinalStatus;
}

export interface DeploymentAgentResult {
  readonly status: DeploymentAgentFinalStatus;
  readonly explanation: string;
  readonly audit: DeploymentAgentAudit;
  readonly prepared?: PreparedReleaseRequest;
  readonly authorization?: ReleaseAuthorization;
}
