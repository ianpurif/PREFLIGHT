"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { JUDGE_SCENARIO_HEADLINE } from "./demo-contract";
import type { DemoPublicData, DemoPublicEvaluation } from "./demo-data";
import { mutateBuildForDemo, shortDigest } from "./demo-mutation";
import { DigitalTwin } from "./digital-twin";

type Selection = "unsafe" | "corrected" | "mutated";
type AgentPhase = "not-requested" | "checking" | "prepared" | "unavailable" | "blocked";

interface AgentState {
  readonly phase: AgentPhase;
  readonly message: string;
  readonly liveResult?: boolean;
  readonly liveCode?: string;
  readonly audit?: Readonly<{
    toolCalls?: readonly Readonly<{ tool: string; result: string; code?: string }>[];
    finalReleaseStatus?: string;
    ledgerAuthorizationStatus?: string;
  }>;
  readonly prepared?: Readonly<Record<string, unknown>>;
}

const REGISTRY_NETWORK = "Ethereum Sepolia";
const SITE_LABEL = "Warehouse Manila-01";
const ROBOT_LABEL = "AMR-17";
const PUBLIC_API_ORIGIN = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";
const OPTIONAL_SIGNER_ADDRESS = process.env.NEXT_PUBLIC_P6_SIGNER_ADDRESS ?? "";

function initialAgentState(selection: Selection): AgentState {
  if (selection === "unsafe") {
    return {
      phase: "blocked",
      message: "Fixture-backed public evidence: evaluation HOLD; no Ledger request was created.",
    };
  }
  if (selection === "mutated") {
    return {
      phase: "blocked",
      message:
        "Fixture-backed public evidence: exact-build mismatch; no Ledger request was created.",
    };
  }
  return {
    phase: "not-requested",
    message: "Fixture-backed P5.2 evidence is shown below. A live agent call is not assumed.",
  };
}

function publicError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "AGENT_REQUEST_FAILED";
}

function buildRequestText(build: DemoPublicEvaluation["build"]): string {
  return `Deploy ${build.version} for ${ROBOT_LABEL} to ${SITE_LABEL}`;
}

function preparedIntentField(agent: AgentState, field: string): string | null {
  const intent = agent.prepared?.intent;
  if (intent === null || typeof intent !== "object" || Array.isArray(intent)) return null;
  const value = (intent as Record<string, unknown>)[field];
  return typeof value === "string" ? value : null;
}

function statusLabel(
  selection: Selection,
  evaluation: DemoPublicEvaluation,
): "HOLD" | "CLEAR" | "BLOCKED" {
  if (selection === "mutated") return "BLOCKED";
  return evaluation.verdict;
}

function routeFor(selection: Selection): "unsafe" | "corrected" | "mutated" {
  return selection === "unsafe" ? "unsafe" : "corrected";
}

function statusClass(status: "HOLD" | "CLEAR" | "BLOCKED"): string {
  return status.toLowerCase();
}

function publicAgentActivity(selection: Selection, agent: AgentState): readonly string[] {
  if (selection === "unsafe") return ["✕ Deployment blocked", "Reason: evaluation HOLD"];
  if (selection === "mutated") {
    return ["✕ Deployment blocked", "Reason: CLEARANCE_BINDING_MISMATCH"];
  }
  if (agent.phase === "unavailable") {
    return ["✕ Live deployment agent unavailable", "No Ledger request was created"];
  }
  if (agent.phase === "blocked" && agent.liveResult) {
    return ["✕ Deployment blocked", `Reason: ${agent.liveCode ?? "AGENT_BLOCKED"}`];
  }
  if (agent.phase === "prepared") {
    const toolCalls = agent.audit?.toolCalls ?? [];
    if (toolCalls.length > 0) {
      const labels: Readonly<Record<string, string>> = {
        resolveDeploymentTarget: "Resolved site and robot",
        getDeploymentContext: "Locked deployment context",
        getEvaluationStatus: "Checked evaluation",
        getClearance: "Verified clearance",
        prepareDeploymentIntent: "Prepared deployment intent",
        getLedgerAuthorizationStatus: "Checked Ledger authorization status",
      };
      return toolCalls.map((call) => {
        const prefix = call.result === "AWAITING_HUMAN" ? "⚠" : "✓";
        return `${prefix} ${labels[call.tool] ?? call.tool}: ${call.result}`;
      });
    }
    return ["✓ Exact P5 request prepared", "⚠ Human Ledger approval required"];
  }
  return [
    "✓ Resolved site (recorded public audit)",
    "✓ Resolved robot (recorded public audit)",
    "✓ Checked evaluation: CLEAR",
    "✓ Clearance read is public and fixture-backed",
    "○ Deployment intent not prepared in this browser",
    "⚠ Human Ledger approval remains required",
  ];
}

async function postAgentPrepare(request: string): Promise<Readonly<Record<string, unknown>>> {
  const response = await fetch(`${PUBLIC_API_ORIGIN}/agent/deployment/prepare`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ request, signerAddress: OPTIONAL_SIGNER_ADDRESS }),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error ?? "AGENT_REQUEST_FAILED"));
  return payload;
}

export function JudgeDashboard({
  demo,
  initialSelection = "unsafe",
}: {
  readonly demo: DemoPublicData;
  readonly initialSelection?: Selection;
}) {
  const [selection, setSelection] = useState<Selection>(initialSelection);
  const [agent, setAgent] = useState<AgentState>(() => initialAgentState(initialSelection));
  const [statusMessage, setStatusMessage] = useState(() =>
    initialSelection === "corrected"
      ? "Build B is loaded. This corrected build is clear, but human approval is still required."
      : "Build A is loaded. Evaluate it to see why Preflight holds the release.",
  );
  const requestGeneration = useRef(0);

  useEffect(() => {
    // A prepared request is scoped to one explicit browser run. A fresh dashboard mount must
    // not resurrect an old handoff after reset, reload, or a different scenario.
    window.sessionStorage.removeItem("preflight.p5.prepared");
  }, []);
  const mutatedBuild = useMemo(
    () => mutateBuildForDemo(demo.corrected.build),
    [demo.corrected.build],
  );
  const evaluation = selection === "unsafe" ? demo.unsafe : demo.corrected;
  const currentBuild = selection === "mutated" ? mutatedBuild : evaluation.build;
  const status = statusLabel(selection, evaluation);
  const chainlinkResult =
    status === "BLOCKED"
      ? "NOT RUN / BINDING MISMATCH"
      : selection === "unsafe"
        ? demo.creEvidence.unsafe
        : demo.creEvidence.corrected;
  const canRequest = selection === "corrected" && status === "CLEAR";
  const activity = publicAgentActivity(selection, agent);
  const preparedClearanceId = preparedIntentField(agent, "clearanceId");
  const preparedClearanceDigest = preparedIntentField(agent, "clearanceDigest");
  const preparedBuildId = preparedIntentField(agent, "robotBuildId");
  const preparedBuildDigest = preparedIntentField(agent, "robotBuildDigest");
  const preparedIntentDigest =
    typeof agent.prepared?.protocolIntentDigest === "string"
      ? agent.prepared.protocolIntentDigest
      : null;
  const preparedExpiry = preparedIntentField(agent, "expiresAt");

  function invalidatePendingRequest() {
    requestGeneration.current += 1;
    window.sessionStorage.removeItem("preflight.p5.prepared");
  }

  function selectBuild(next: Exclude<Selection, "mutated">) {
    invalidatePendingRequest();
    setSelection(next);
    setAgent(initialAgentState(next));
    setStatusMessage(
      next === "unsafe"
        ? "Build A evaluated against the deterministic fixture: HOLD."
        : "Build B evaluated against the same committed fixture: CLEAR. The Ledger boundary is still separate.",
    );
  }

  function mutateBuild() {
    if (selection !== "corrected") return;
    invalidatePendingRequest();
    setSelection("mutated");
    setAgent(initialAgentState("mutated"));
    setStatusMessage(
      "Build B changed from controller artifact 4.7.21 to 4.7.22. The existing clearance no longer binds.",
    );
  }

  async function requestLedgerApproval() {
    if (!canRequest) {
      setStatusMessage("Ledger approval is unavailable until the exact build is cleared.");
      return;
    }
    if (OPTIONAL_SIGNER_ADDRESS.length === 0) {
      setAgent({
        phase: "unavailable",
        message:
          "Existing deployment-agent API unavailable: no browser signer address is configured. No approval was requested.",
      });
      setStatusMessage(
        "Live P5 preparation is unavailable in this environment; no Ledger request was created.",
      );
      return;
    }
    setAgent({
      phase: "checking",
      message: "Calling the existing deployment-agent preparation endpoint…",
    });
    setStatusMessage("The existing agent is checking the exact public target and clearance.");
    const generation = ++requestGeneration.current;
    try {
      const payload = await postAgentPrepare(buildRequestText(demo.corrected.build));
      if (generation !== requestGeneration.current || selection !== "corrected") return;
      const prepared = payload.prepared;
      const audit = payload.audit;
      if (
        payload.status !== "LEDGER_APPROVAL_REQUIRED" ||
        prepared === null ||
        typeof prepared !== "object" ||
        audit === null ||
        typeof audit !== "object"
      ) {
        setAgent({
          phase: "blocked",
          message: `Existing agent returned ${String(payload.status ?? "BLOCKED")}; no Ledger request was created.`,
          liveResult: true,
          liveCode: String(payload.status ?? "BLOCKED"),
        });
        setStatusMessage(
          "The backend did not prepare an exact Ledger request; release remains blocked.",
        );
        return;
      }
      const preparedRecord = prepared as Record<string, unknown>;
      window.sessionStorage.setItem("preflight.p5.prepared", JSON.stringify(preparedRecord));
      setAgent({
        phase: "prepared",
        message:
          "Existing agent prepared the exact P5 request. Open the existing Ledger harness to continue.",
        liveResult: true,
        audit: audit as NonNullable<AgentState["audit"]>,
        prepared: preparedRecord,
      });
      setStatusMessage(
        "Exact intent prepared. Human Ledger review is required; authorization has not happened.",
      );
    } catch (error) {
      if (generation !== requestGeneration.current || selection !== "corrected") return;
      const message = publicError(error);
      setAgent({
        phase: "unavailable",
        message: `Existing deployment-agent API unavailable: ${message}.`,
      });
      setStatusMessage(
        "No Ledger request was created because the existing agent boundary was unavailable.",
      );
    }
  }

  function resetDemo() {
    invalidatePendingRequest();
    setSelection("unsafe");
    setAgent(initialAgentState("unsafe"));
    setStatusMessage("Demo reset. Build A is loaded from the deterministic fixture.");
  }

  return (
    <section
      className="judge-shell evaluation-workspace"
      data-testid="demo-dashboard"
      data-demo-selection={selection}
    >
      <header className="topbar">
        <div>
          <p className="eyebrow">STEP 2 OF 4 / EVALUATION</p>
          <h1>Review the exact build.</h1>
        </div>
        <div className="topbar-badges">
          <span>Same site envelope</span>
          <span>Deterministic fixture</span>
        </div>
      </header>

      <section className="hero-copy">
        <p>
          Select a build to see the public result. A clear evaluation makes release preparation
          possible; it never skips human approval.
        </p>
        <span className="fixture-note">
          Public projection · no private rules or robot activation
        </span>
      </section>

      <section className="evaluation-state-guide" aria-label="Evaluation state guide">
        <span>
          <i className="state-guide-dot hold" aria-hidden="true" /> <strong>HOLD</strong> needs a
          build change
        </span>
        <span>
          <i className="state-guide-dot clear" aria-hidden="true" /> <strong>CLEAR</strong> can
          continue to release prep
        </span>
        <span>
          <i className="state-guide-dot blocked" aria-hidden="true" /> <strong>BLOCKED</strong>{" "}
          binding failed
        </span>
        {agent.phase === "prepared" ? (
          <span>
            <i className="state-guide-dot ledger" aria-hidden="true" />
            <strong>LEDGER_APPROVAL_REQUIRED</strong> human review pending
          </span>
        ) : null}
      </section>

      <section className="workspace-grid">
        <aside className="control-rail panel">
          <div className="section-kicker">Deployment target</div>
          <dl className="target-list">
            <div>
              <dt>Site</dt>
              <dd>{SITE_LABEL}</dd>
            </div>
            <div>
              <dt>Robot</dt>
              <dd>{ROBOT_LABEL}</dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd>
                {currentBuild.version} <span className="build-label">{currentBuild.label}</span>
              </dd>
            </div>
          </dl>
          <p className="target-boundary-note">
            Demo fixture target. Workspace labels are display-only and do not change evaluator
            bindings.
          </p>
          <div className="control-stack">
            <button
              type="button"
              className={selection === "unsafe" ? "active" : ""}
              onClick={() => selectBuild("unsafe")}
            >
              Evaluate Build A
            </button>
            <button
              type="button"
              className={selection === "corrected" ? "active" : ""}
              onClick={() => selectBuild("corrected")}
            >
              Switch to Cleared Build B
            </button>
            <button type="button" disabled={selection !== "corrected"} onClick={mutateBuild}>
              Mutate Build
            </button>
            <button type="button" onClick={resetDemo}>
              Reset demo
            </button>
          </div>
          <div className="rail-callout">
            <span>Current evaluation state</span>
            <strong className={`status-word ${statusClass(status)}`}>{status}</strong>
            <p aria-live="polite">{statusMessage}</p>
          </div>
          <div className="build-identity">
            <span>{selection === "mutated" ? "Cleared build digest" : "Build digest"}</span>
            <code>
              {shortDigest(
                selection === "mutated"
                  ? demo.corrected.build.robotBuildDigest
                  : currentBuild.robotBuildDigest,
              )}
            </code>
            {selection === "mutated" ? (
              <>
                <span>Requested digest</span>
                <code className="danger-code">{shortDigest(currentBuild.robotBuildDigest)}</code>
              </>
            ) : null}
          </div>
        </aside>

        <section className="twin-panel panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Live explanatory view</div>
              <h2>Warehouse digital twin</h2>
            </div>
            <span className={`route-pill ${statusClass(status)}`}>
              {status === "HOLD"
                ? "Route conflict"
                : status === "CLEAR"
                  ? "Route clear"
                  : "Clearance mismatch"}
            </span>
          </div>
          <DigitalTwin kind={routeFor(selection)} routePoints={evaluation.routePoints} />
          <div className="twin-caption">
            <span>
              <strong>{ROBOT_LABEL}</strong> · deterministic route projection
            </span>
            <span>
              {status === "HOLD"
                ? "Crossing marked zones"
                : status === "CLEAR"
                  ? "Corrected route"
                  : "Mutation rejected before release"}
            </span>
          </div>
        </section>
      </section>

      <section className="status-grid" aria-label="Evaluation and release status">
        <article className={`status-card ${statusClass(status)}`} data-testid="evaluation-card">
          <div className="status-card-top">
            <span className="section-kicker">Evaluation</span>
            <strong className="status-word">{status}</strong>
          </div>
          {status === "HOLD" ? (
            <>
              <h2>3 violations</h2>
              <ul className="reason-list">
                {evaluation.reasons.map((reason) => (
                  <li key={reason}>{reason}</li>
                ))}
              </ul>
            </>
          ) : status === "CLEAR" ? (
            <>
              <h2>{JUDGE_SCENARIO_HEADLINE} scenarios</h2>
              <p className="metric-subline">0 critical violations</p>
              <p className="source-note">
                Public judge headline requested by the brief · authoritative P2 fixture report:{" "}
                {evaluation.fixtureScenarioCount} committed templates.
              </p>
            </>
          ) : (
            <>
              <h2>Build does not match cleared build</h2>
              <p className="metric-subline">CLEARANCE_BINDING_MISMATCH</p>
              <div className="digest-pair">
                <span>
                  Cleared <code>{shortDigest(demo.corrected.build.robotBuildDigest)}</code>
                </span>
                <span>
                  Requested <code>{shortDigest(currentBuild.robotBuildDigest)}</code>
                </span>
              </div>
            </>
          )}
          {agent.phase === "prepared" ? (
            <div className="release-gate-callout" role="status">
              <span className="section-kicker">Release gate</span>
              <strong>LEDGER_APPROVAL_REQUIRED</strong>
              <p>
                Evaluation is CLEAR. The exact request still needs human confirmation on Ledger.
              </p>
            </div>
          ) : null}
          <div className="public-identifiers">
            <span>
              Public result ·{" "}
              {status === "BLOCKED" ? "no evaluation returned" : evaluation.evaluationId}
            </span>
            <span>{evaluation.evaluatorVersion}</span>
          </div>
        </article>

        <article className="status-card chainlink-card">
          <div className="status-card-top">
            <span className="section-kicker">Chainlink CRE</span>
            <span className="boundary-tag">confidential boundary</span>
          </div>
          <h2>Confidential evaluation</h2>
          <ul className="check-list">
            {status === "BLOCKED" ? (
              <li>○ Confidential handler not invoked for this binding mismatch</li>
            ) : (
              <>
                <li>✓ Handler boundary recorded</li>
                <li>✓ Private input processed inside callback</li>
                <li>✓ Minimal public result returned</li>
              </>
            )}
          </ul>
          <div className="public-result">
            <span>CRE authenticated simulation evidence</span>
            <strong>{chainlinkResult}</strong>
          </div>
          <p className="source-note">
            Local P2 projection matches the committed P3 public evidence; no browser CRE execution
            or live DON deployment is claimed.
          </p>
        </article>

        <article className="status-card agent-card">
          <div className="status-card-top">
            <span className="section-kicker">Deployment agent</span>
            <span className="boundary-tag">host-owned tools</span>
          </div>
          <h2>Preparation, not authorization</h2>
          {agent.phase === "prepared" ? (
            <span className="release-state-badge">LEDGER_APPROVAL_REQUIRED</span>
          ) : null}
          <ul className="activity-list">
            {activity.map((item) => (
              <li
                key={item}
                className={
                  item.startsWith("✕")
                    ? "activity-fail"
                    : item.startsWith("⚠")
                      ? "activity-warn"
                      : ""
                }
              >
                {item}
              </li>
            ))}
          </ul>
          <p className="agent-message">{agent.message}</p>
          {agent.phase === "prepared" ? (
            <span className="prepared-chip">Exact P5 request prepared · authorization pending</span>
          ) : null}
        </article>
      </section>

      <section className="lower-grid">
        <article className="panel ledger-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Ledger boundary</div>
              <h2>Human authorization required</h2>
            </div>
            <span className="ledger-mark">LEDGER</span>
          </div>
          <dl className="release-details">
            <div>
              <dt>Site / robot</dt>
              <dd>
                {SITE_LABEL} / {ROBOT_LABEL}
                <br />
                <code>{evaluation.siteId}</code> · <code>{evaluation.build.robotId}</code>
              </dd>
            </div>
            <div>
              <dt>Build</dt>
              <dd>
                {currentBuild.version} · <code>{currentBuild.buildId}</code>
                <br />
                <code>{shortDigest(currentBuild.robotBuildDigest)}</code>
                {preparedBuildId && preparedBuildDigest ? (
                  <>
                    <br />
                    Prepared <code>{preparedBuildId}</code>
                    <br />
                    Digest <code>{shortDigest(preparedBuildDigest)}</code>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Action</dt>
              <dd>
                Release {ROBOT_LABEL} / Build {demo.corrected.build.version}
                <br />
                to {SITE_LABEL}
              </dd>
            </div>
            <div>
              <dt>Clearance</dt>
              <dd>
                {status === "CLEAR" ? (
                  <>
                    <code>{evaluation.safetyEnvelopeId}</code>
                    <br />
                    Commitment <code>{shortDigest(evaluation.safetyEnvelopeCommitment)}</code>
                    <br />
                    {preparedClearanceId && preparedClearanceDigest ? (
                      <>
                        Prepared ID <code>{preparedClearanceId}</code>
                        <br />
                        Digest <code>{shortDigest(preparedClearanceDigest)}</code>
                      </>
                    ) : (
                      <span className="source-note">No live clearance record in this fixture</span>
                    )}
                  </>
                ) : (
                  "Exact clear build required"
                )}
              </dd>
            </div>
            <div>
              <dt>Evaluation</dt>
              <dd>
                <code>{evaluation.evaluationId}</code>
                <br />
                <code>{evaluation.evaluatorVersion}</code>
              </dd>
            </div>
            <div>
              <dt>Expiry / intent</dt>
              <dd>
                {preparedExpiry ? <code>{preparedExpiry}</code> : "Not issued — local fixture"}
                {preparedIntentDigest ? (
                  <>
                    <br />
                    Intent <code>{shortDigest(preparedIntentDigest)}</code>
                  </>
                ) : null}
              </dd>
            </div>
            <div>
              <dt>Network</dt>
              <dd>{REGISTRY_NETWORK}</dd>
            </div>
            <div>
              <dt>Status</dt>
              <dd className="waiting">
                {agent.phase === "prepared"
                  ? "WAITING FOR HUMAN APPROVAL"
                  : "WAITING FOR EXACT P5 PREPARATION"}
              </dd>
            </div>
          </dl>
          <div className="ledger-evidence">
            <strong>Ledger Speculos — development/test simulator</strong>
            <span>Physical device: not demonstrated</span>
          </div>
          {agent.phase === "prepared" ? (
            <a className="button-link" href="/p5-ledger?source=p6">
              Open existing P5 Ledger harness
            </a>
          ) : (
            <button
              type="button"
              className="primary-button"
              onClick={requestLedgerApproval}
              disabled={!canRequest || agent.phase === "checking"}
            >
              {agent.phase === "checking" ? "Checking existing agent…" : "Request Ledger Approval"}
            </button>
          )}
          <p className="source-note">
            A clear local fixture never creates an onchain clearance or signs a release.
          </p>
        </article>

        <article className="panel attestation-panel">
          <div className="panel-heading">
            <div>
              <div className="section-kicker">Public attestation</div>
              <h2>Sepolia registry</h2>
            </div>
            <span className="network-dot">● live identity</span>
          </div>
          <dl className="release-details compact">
            <div>
              <dt>Network</dt>
              <dd>{REGISTRY_NETWORK}</dd>
            </div>
            <div>
              <dt>Registry</dt>
              <dd>
                <a href={demo.registryUrl} target="_blank" rel="noreferrer">
                  {demo.registryAddress}
                </a>
              </dd>
            </div>
          </dl>
          <p className="source-note">
            Deployment metadata only. This demo does not invent a clearance transaction.
          </p>
          <details className="verification-details">
            <summary>Verification trail</summary>
            <ul className="verification-list">
              <li>
                <span>Protocol</span>
                <strong>✓ verified</strong>
              </li>
              <li>
                <span>Deterministic evaluator</span>
                <strong>✓ verified</strong>
              </li>
              <li>
                <span>Chainlink CRE</span>
                <strong>✓ authenticated simulation</strong>
              </li>
              <li>
                <span>Sepolia registry</span>
                <strong>✓ deployed identity</strong>
              </li>
              <li>
                <span>Ledger authorization</span>
                <strong>software verified</strong>
              </li>
              <li>
                <span>AI deployment agent</span>
                <strong>✓ bounded integration</strong>
              </li>
              <li>
                <span>Speculos</span>
                <strong>available</strong>
              </li>
              <li>
                <span>Physical device</span>
                <strong>not demonstrated</strong>
              </li>
            </ul>
          </details>
        </article>
      </section>
    </section>
  );
}
