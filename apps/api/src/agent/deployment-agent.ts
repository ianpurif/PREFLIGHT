import {
  assertClearanceSnapshotEligible,
  type ClearanceRegistryReader,
  ReleaseGateError,
  ROVAULTA_SEPOLIA_DEPLOYMENT,
} from "@rovaulta/chain-client";
import { type ClearanceRecord, digestClearance } from "@rovaulta/domain";
import { type GraphClearanceReader, GraphProviderError } from "../graph/index.js";
import type { PreparedReleaseRequest, ReleaseService } from "../release/index.js";
import { DeploymentCatalog, formatPublicDeploymentRequest } from "./catalog.js";
import { parseToolArguments, toolDefinition } from "./tools.js";
import {
  DEPLOYMENT_AGENT_AUDIT_SCHEMA_VERSION,
  type DeploymentAgentAudit,
  DeploymentAgentError,
  type DeploymentAgentFinalStatus,
  type DeploymentAgentModel,
  type DeploymentAgentObservation,
  type DeploymentAgentResult,
  type DeploymentAgentToolCall,
  type DeploymentAgentToolName,
  type DeploymentAuditToolEvent,
  type DeploymentCatalogEntry,
  type DeploymentGraphContext,
  type LedgerAuthorizationStatus,
} from "./types.js";

interface MutableAttempt {
  attemptId: string;
  accountId?: string;
  createdAt: string;
  request: string;
  provider: Readonly<{ name: string; model: string }>;
  target?: DeploymentCatalogEntry["target"];
  toolCalls: DeploymentAuditToolEvent[];
  observations: DeploymentAgentObservation[];
  clearanceResult: string;
  clearanceInspection?: Readonly<{
    chainId: number;
    registry: string;
    blockNumber: string;
    blockHash: string;
  }>;
  graphContext?: DeploymentGraphContext;
  policyResult: string;
  protocolIntentDigest?: string;
  typedDataDigest?: string;
  ledgerAuthorizationStatus: LedgerAuthorizationStatus;
  finalReleaseStatus: DeploymentAgentFinalStatus;
  prepared?: PreparedReleaseRequest;
}

function publicAudit(attempt: MutableAttempt): DeploymentAgentAudit {
  return Object.freeze({
    schemaVersion: DEPLOYMENT_AGENT_AUDIT_SCHEMA_VERSION,
    attemptId: attempt.attemptId,
    createdAt: attempt.createdAt,
    request: attempt.request,
    provider: attempt.provider,
    ...(attempt.target === undefined ? {} : { target: attempt.target }),
    toolCalls: Object.freeze([...attempt.toolCalls]),
    clearanceResult: attempt.clearanceResult,
    ...(attempt.clearanceInspection === undefined
      ? {}
      : { clearanceInspection: attempt.clearanceInspection }),
    ...(attempt.graphContext === undefined ? {} : { graphContext: attempt.graphContext }),
    policyResult: attempt.policyResult,
    ...(attempt.protocolIntentDigest === undefined
      ? {}
      : { protocolIntentDigest: attempt.protocolIntentDigest }),
    ...(attempt.typedDataDigest === undefined ? {} : { typedDataDigest: attempt.typedDataDigest }),
    ledgerAuthorizationStatus: attempt.ledgerAuthorizationStatus,
    finalReleaseStatus: attempt.finalReleaseStatus,
  });
}

function explanation(status: DeploymentAgentFinalStatus, code: string): string {
  if (status === "AUTHORIZED") {
    return "The existing P5 flow cryptographically verified this exact Ledger authorization.";
  }
  if (status === "LEDGER_APPROVAL_REQUIRED") {
    return "This exact build passed deterministic preparation. Human Ledger authorization is required before release.";
  }
  return `I cannot prepare this deployment. Deterministic Rovaulta policy blocked it: ${code}.`;
}

function errorCode(error: unknown): string {
  if (error instanceof GraphProviderError) return "GRAPH_UNAVAILABLE";
  if (error instanceof DeploymentAgentError || error instanceof ReleaseGateError) return error.code;
  return "AGENT_PROTOCOL_VIOLATION";
}

function clearanceProjection(clearance: ClearanceRecord | null, status: string, code?: string) {
  return Object.freeze({
    status,
    ...(code === undefined ? {} : { code }),
    ...(clearance === null
      ? {}
      : {
          clearanceId: clearance.clearanceId,
          clearanceDigest: digestClearance(clearance),
          expiresAt: clearance.expiresAt,
        }),
  });
}

export class DeploymentAgent {
  readonly #model: DeploymentAgentModel;
  readonly #catalog: DeploymentCatalog | undefined;
  readonly #graphReader: GraphClearanceReader | undefined;
  readonly #accountResolver:
    | ((accountId: string, request: unknown, clearance: unknown) => DeploymentCatalogEntry)
    | undefined;
  readonly #reader: ClearanceRegistryReader;
  readonly #releaseService: ReleaseService;
  readonly #attempts = new Map<string, MutableAttempt>();
  readonly #clock: () => Date;
  readonly #idFactory: () => string;

  constructor(options: {
    model: DeploymentAgentModel;
    catalog?: DeploymentCatalog;
    reader: ClearanceRegistryReader;
    releaseService: ReleaseService;
    graphReader?: GraphClearanceReader;
    accountResolver?: (
      accountId: string,
      request: unknown,
      clearance: unknown,
    ) => DeploymentCatalogEntry;
    clock?: () => Date;
    idFactory?: () => string;
  }) {
    this.#model = options.model;
    this.#catalog = options.catalog;
    this.#graphReader = options.graphReader;
    this.#accountResolver = options.accountResolver;
    this.#reader = options.reader;
    this.#releaseService = options.releaseService;
    this.#clock = options.clock ?? (() => new Date());
    this.#idFactory = options.idFactory ?? (() => crypto.randomUUID());
  }

  async #callTool(attempt: MutableAttempt, expected: DeploymentAgentToolName) {
    let call: DeploymentAgentToolCall;
    try {
      call = await this.#model.callTool({
        publicRequest: attempt.request,
        expectedTool: toolDefinition(expected),
        observations: Object.freeze([...attempt.observations]),
      });
      return parseToolArguments(expected, call.name, call.arguments);
    } catch (error) {
      if (error instanceof DeploymentAgentError) throw error;
      throw new DeploymentAgentError(
        "AGENT_PROTOCOL_VIOLATION",
        "Model attempted an invalid deployment tool call",
      );
    }
  }

  #record(
    attempt: MutableAttempt,
    tool: DeploymentAgentToolName,
    result: string,
    projection: Readonly<Record<string, unknown>>,
    code?: string,
  ): void {
    attempt.toolCalls.push(
      Object.freeze({
        sequence: attempt.toolCalls.length + 1,
        tool,
        result,
        ...(code === undefined ? {} : { code }),
      }),
    );
    attempt.observations.push(Object.freeze({ tool, result: projection }));
  }

  #blocked(attempt: MutableAttempt, code: string): DeploymentAgentResult {
    attempt.policyResult = code;
    attempt.ledgerAuthorizationStatus = "NOT_REQUESTED";
    attempt.finalReleaseStatus = "BLOCKED";
    delete attempt.prepared;
    this.#attempts.set(attempt.attemptId, attempt);
    return Object.freeze({
      status: "BLOCKED",
      explanation: explanation("BLOCKED", code),
      audit: publicAudit(attempt),
    });
  }

  async run(input: {
    request: unknown;
    signerAddress: string;
    accountId?: string;
    clearance?: unknown;
  }): Promise<DeploymentAgentResult> {
    let requestedEntry: DeploymentCatalogEntry;
    let resolutionCatalog: DeploymentCatalog;
    try {
      if (input.accountId !== undefined) {
        if (this.#accountResolver === undefined) {
          throw new DeploymentAgentError(
            "PROVIDER_UNAVAILABLE",
            "Account-backed deployment resolution is not configured",
          );
        }
        requestedEntry = this.#accountResolver(input.accountId, input.request, input.clearance);
        resolutionCatalog = new DeploymentCatalog([requestedEntry]);
      } else {
        if (this.#catalog === undefined) {
          throw new DeploymentAgentError(
            "PROVIDER_UNAVAILABLE",
            "The deployment catalog is not configured",
          );
        }
        requestedEntry = this.#catalog.resolvePublicRequest(input.request);
        resolutionCatalog = this.#catalog;
      }
    } catch (error) {
      const code = errorCode(error);
      const attempt: MutableAttempt = {
        attemptId: this.#idFactory(),
        ...(input.accountId === undefined ? {} : { accountId: input.accountId }),
        createdAt: this.#clock().toISOString(),
        request: "REJECTED_SENSITIVE_OR_MALFORMED_REQUEST",
        provider: Object.freeze({ name: this.#model.provider, model: this.#model.model }),
        toolCalls: [],
        observations: [],
        clearanceResult: "NOT_INSPECTED",
        policyResult: code,
        ledgerAuthorizationStatus: "NOT_REQUESTED",
        finalReleaseStatus: "BLOCKED",
      };
      return this.#blocked(attempt, code);
    }

    const request = formatPublicDeploymentRequest(requestedEntry);

    const attempt: MutableAttempt = {
      attemptId: this.#idFactory(),
      ...(input.accountId === undefined ? {} : { accountId: input.accountId }),
      createdAt: this.#clock().toISOString(),
      request,
      provider: Object.freeze({ name: this.#model.provider, model: this.#model.model }),
      toolCalls: [],
      observations: [],
      clearanceResult: "NOT_INSPECTED",
      policyResult: "NOT_PREPARED",
      ledgerAuthorizationStatus: "NOT_REQUESTED",
      finalReleaseStatus: "BLOCKED",
    };

    try {
      const references = await this.#callTool(attempt, "resolveDeploymentTarget");
      const modelEntry = resolutionCatalog.resolve({
        siteRef: references.siteRef,
        robotRef: references.robotRef,
        buildRef: references.buildRef,
      });
      if (modelEntry.key !== requestedEntry.key) {
        throw new DeploymentAgentError(
          "AGENT_PROTOCOL_VIOLATION",
          "Model-selected target does not match the host-resolved public target",
        );
      }
      const entry = requestedEntry;
      attempt.target = entry.target;
      this.#record(
        attempt,
        "resolveDeploymentTarget",
        "RESOLVED",
        Object.freeze({ ...entry.target }),
      );

      await this.#callTool(attempt, "getDeploymentContext");
      this.#record(
        attempt,
        "getDeploymentContext",
        "LOCKED",
        Object.freeze({
          ...entry.target,
          action: "ACTIVATE_DEPLOYMENT",
          chainId: ROVAULTA_SEPOLIA_DEPLOYMENT.chainId,
          registry: ROVAULTA_SEPOLIA_DEPLOYMENT.verifyingContract,
        }),
      );

      await this.#callTool(attempt, "getEvaluationStatus");
      this.#record(
        attempt,
        "getEvaluationStatus",
        entry.evaluation.verdict,
        Object.freeze({ ...entry.evaluation }),
      );

      if (input.accountId !== undefined || this.#graphReader !== undefined) {
        await this.#callTool(attempt, "getGraphContext");
        if (this.#graphReader === undefined) {
          this.#record(
            attempt,
            "getGraphContext",
            "BLOCKED",
            Object.freeze({ status: "UNAVAILABLE", code: "GRAPH_UNAVAILABLE" }),
            "GRAPH_UNAVAILABLE",
          );
          return this.#blocked(attempt, "GRAPH_UNAVAILABLE");
        }
        if (entry.clearance === null) {
          this.#record(
            attempt,
            "getGraphContext",
            "BLOCKED",
            Object.freeze({ status: "NOT_FOUND", reason: "CLEARANCE_NOT_FOUND" }),
            "GRAPH_CLEARANCE_NOT_FOUND",
          );
          return this.#blocked(attempt, "GRAPH_CLEARANCE_NOT_FOUND");
        }
        try {
          const graphContext = await this.#graphReader.readClearance(entry.clearance);
          attempt.graphContext = graphContext;
          this.#record(
            attempt,
            "getGraphContext",
            graphContext.status,
            Object.freeze({ ...graphContext }),
            graphContext.status === "MATCHED" ? undefined : graphContext.reason,
          );
          if (graphContext.status !== "MATCHED") {
            return this.#blocked(
              attempt,
              graphContext.reason === undefined
                ? `GRAPH_${graphContext.status}`
                : `GRAPH_${graphContext.reason}`,
            );
          }
        } catch (error) {
          const code = errorCode(error);
          this.#record(
            attempt,
            "getGraphContext",
            "BLOCKED",
            Object.freeze({ status: "UNAVAILABLE", code }),
            code,
          );
          return this.#blocked(attempt, code);
        }
      }

      await this.#callTool(attempt, "getClearance");
      let clearanceStatus = "CLEARANCE_NOT_FOUND";
      let clearanceEligible = false;
      if (entry.clearance === null) {
        this.#record(
          attempt,
          "getClearance",
          "BLOCKED",
          clearanceProjection(null, "BLOCKED", "CLEARANCE_NOT_FOUND"),
          "CLEARANCE_NOT_FOUND",
        );
      } else {
        let inspectedSnapshot:
          | Awaited<ReturnType<ClearanceRegistryReader["readExactClearance"]>>
          | undefined;
        try {
          inspectedSnapshot = await this.#reader.readExactClearance(entry.clearance);
          attempt.clearanceInspection = Object.freeze({
            chainId: inspectedSnapshot.chainId,
            registry: inspectedSnapshot.registry,
            blockNumber: inspectedSnapshot.blockNumber.toString(),
            blockHash: inspectedSnapshot.blockHash,
          });
          const snapshot = assertClearanceSnapshotEligible(inspectedSnapshot);
          clearanceStatus = "CLEARANCE_ELIGIBLE";
          clearanceEligible = true;
          this.#record(
            attempt,
            "getClearance",
            "ELIGIBLE",
            Object.freeze({
              ...clearanceProjection(entry.clearance, "ELIGIBLE"),
              blockNumber: snapshot.blockNumber.toString(),
              blockHash: snapshot.blockHash,
            }),
          );
        } catch (error) {
          clearanceStatus = errorCode(error);
          this.#record(
            attempt,
            "getClearance",
            "BLOCKED",
            Object.freeze({
              ...clearanceProjection(entry.clearance, "BLOCKED", clearanceStatus),
              ...(inspectedSnapshot === undefined
                ? {}
                : {
                    chainId: inspectedSnapshot.chainId,
                    registry: inspectedSnapshot.registry,
                    blockNumber: inspectedSnapshot.blockNumber.toString(),
                    blockHash: inspectedSnapshot.blockHash,
                  }),
            }),
            clearanceStatus,
          );
        }
      }
      attempt.clearanceResult = clearanceStatus;
      if (entry.evaluation.verdict !== "CLEAR") return this.#blocked(attempt, "EVALUATION_HOLD");
      if (!clearanceEligible || entry.clearance === null) {
        return this.#blocked(attempt, clearanceStatus);
      }

      await this.#callTool(attempt, "prepareDeploymentIntent");
      let prepared: PreparedReleaseRequest;
      try {
        prepared = await this.#releaseService.prepare({
          ...entry.target,
          clearance: entry.clearance,
          signerAddress: input.signerAddress,
        });
      } catch (error) {
        const code = errorCode(error);
        this.#record(
          attempt,
          "prepareDeploymentIntent",
          "BLOCKED",
          Object.freeze({ status: "BLOCKED", code }),
          code,
        );
        return this.#blocked(attempt, code);
      }
      attempt.prepared = prepared;
      attempt.protocolIntentDigest = prepared.protocolIntentDigest;
      attempt.typedDataDigest = prepared.typedDataDigest;
      attempt.policyResult = "PREPARED";
      this.#record(
        attempt,
        "prepareDeploymentIntent",
        "PREPARED",
        Object.freeze({
          protocolIntentDigest: prepared.protocolIntentDigest,
          typedDataDigest: prepared.typedDataDigest,
          nonce: prepared.intent.nonce,
          expiresAt: prepared.intent.expiresAt,
        }),
      );

      await this.#callTool(attempt, "getLedgerAuthorizationStatus");
      const status = this.#releaseService.getAuthorizationStatus(prepared);
      if (status.status !== "AWAITING_LEDGER") {
        throw new DeploymentAgentError(
          "AGENT_PROTOCOL_VIOLATION",
          "New deployment request unexpectedly contained authorization",
        );
      }
      attempt.ledgerAuthorizationStatus = "AWAITING_HUMAN";
      attempt.finalReleaseStatus = "LEDGER_APPROVAL_REQUIRED";
      this.#record(
        attempt,
        "getLedgerAuthorizationStatus",
        "AWAITING_HUMAN",
        Object.freeze({ status: "AWAITING_HUMAN" }),
      );
      this.#attempts.set(attempt.attemptId, attempt);
      return Object.freeze({
        status: "LEDGER_APPROVAL_REQUIRED",
        explanation: explanation("LEDGER_APPROVAL_REQUIRED", "PREPARED"),
        audit: publicAudit(attempt),
        prepared,
      });
    } catch (error) {
      const code = errorCode(error);
      return this.#blocked(attempt, code);
    }
  }

  getAuthorizationStatus(attemptId: string, accountId?: string): DeploymentAgentResult {
    const attempt = this.#attempts.get(attemptId);
    if (attempt === undefined || attempt.prepared === undefined) {
      throw new DeploymentAgentError("TARGET_NOT_FOUND", "Deployment attempt was not prepared");
    }
    if (attempt.accountId !== undefined && attempt.accountId !== accountId) {
      throw new DeploymentAgentError(
        "TARGET_NOT_FOUND",
        "Deployment attempt is not in this account",
      );
    }
    const status = this.#releaseService.getAuthorizationStatus(attempt.prepared);
    if (status.status === "AWAITING_LEDGER") {
      return Object.freeze({
        status: "LEDGER_APPROVAL_REQUIRED",
        explanation: explanation("LEDGER_APPROVAL_REQUIRED", "PREPARED"),
        audit: publicAudit(attempt),
        prepared: attempt.prepared,
      });
    }
    attempt.ledgerAuthorizationStatus = "AUTHORIZED";
    attempt.finalReleaseStatus = "AUTHORIZED";
    attempt.policyResult = "P5_AUTHORIZATION_VERIFIED";
    this.#attempts.set(attempt.attemptId, attempt);
    return Object.freeze({
      status: "AUTHORIZED",
      explanation: explanation("AUTHORIZED", "P5_AUTHORIZATION_VERIFIED"),
      audit: publicAudit(attempt),
      prepared: attempt.prepared,
      authorization: status.authorization,
    });
  }
}
