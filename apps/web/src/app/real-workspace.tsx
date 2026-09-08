"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  apiFetch,
  jsonBody,
  type Account,
  type Build,
  type Evaluation,
  type ReleaseAttempt,
  type Robot,
  type Site,
} from "./api-client";

export type ProductView = "overview" | "setup" | "builds" | "evaluate" | "releases" | "evidence";

interface WorkspaceData {
  readonly account: Account;
  readonly sites: readonly Site[];
  readonly robots: readonly Robot[];
  readonly builds: readonly Build[];
  readonly evaluations: readonly Evaluation[];
  readonly releases: readonly ReleaseAttempt[];
}

const navItems: readonly Readonly<{ href: string; label: string; view: ProductView }>[] = [
  { href: "/app", label: "Overview", view: "overview" },
  { href: "/app/setup", label: "Set up", view: "setup" },
  { href: "/app/builds", label: "Builds", view: "builds" },
  { href: "/app/evaluate", label: "Evaluate", view: "evaluate" },
  { href: "/app/releases", label: "Releases", view: "releases" },
  { href: "/app/evidence", label: "Evidence", view: "evidence" },
] as const;

function ProductBrand() {
  return (
    <Link className="brand-lockup product-brand" href="/app" aria-label="Preflight workspace home">
      <span className="brand-mark" aria-hidden="true">
        P
      </span>
      <span>
        <strong>Preflight</strong>
        <small>Deployment safety</small>
      </span>
    </Link>
  );
}

function StatusPill({ status }: { readonly status: string }) {
  const className = status.toLowerCase().replaceAll("_", "-");
  return <span className={`real-status-pill ${className}`}>{status}</span>;
}

function ErrorNotice({ message }: { readonly message: string }) {
  return (
    <p className="real-error" role="alert">
      {message}
    </p>
  );
}

function EmptyState({
  title,
  body,
  action,
}: {
  readonly title: string;
  readonly body: string;
  readonly action?: React.ReactNode;
}) {
  return (
    <section className="real-empty-state">
      <span className="real-empty-icon" aria-hidden="true">
        +
      </span>
      <h2>{title}</h2>
      <p>{body}</p>
      {action}
    </section>
  );
}

function ProductSidebar({
  view,
  data,
  onSignOut,
}: {
  readonly view: ProductView;
  readonly data: WorkspaceData;
  readonly onSignOut: () => void;
}) {
  const site = data.sites[0];
  return (
    <aside className="product-sidebar real-sidebar">
      <div className="product-sidebar-top">
        <ProductBrand />
        <div className="sidebar-workspace-card">
          <span className="sidebar-label">Account</span>
          <strong>{data.account.email}</strong>
          <span>{site?.name ?? "No site configured"}</span>
        </div>
        <nav className="product-nav" aria-label="Workspace navigation">
          <span className="sidebar-label">Workspace</span>
          {navItems.map((item) => (
            <Link
              className={`product-nav-link ${item.view === view ? "is-active" : ""}`}
              href={item.href}
              aria-current={item.view === view ? "page" : undefined}
              key={item.view}
            >
              <span className={`nav-icon nav-icon-${item.view}`} aria-hidden="true" />
              {item.label}
              {item.view === "evaluate" && data.builds.length > 0 ? (
                <span className="nav-count">{data.builds.length}</span>
              ) : null}
            </Link>
          ))}
        </nav>
      </div>
      <div className="product-sidebar-bottom">
        <div className="sidebar-boundary-card">
          <span className="sidebar-boundary-icon" aria-hidden="true">
            ◇
          </span>
          <span>
            <strong>Private by design</strong>
            <small>Policy rules stay in the API boundary.</small>
          </span>
        </div>
        <button type="button" className="sidebar-back-link real-signout" onClick={onSignOut}>
          Sign out
        </button>
      </div>
    </aside>
  );
}

function ProductHeader({
  view,
  data,
}: {
  readonly view: ProductView;
  readonly data: WorkspaceData;
}) {
  const labels: Readonly<Record<ProductView, string>> = {
    overview: "Overview",
    setup: "Site setup",
    builds: "Builds",
    evaluate: "Evaluation",
    releases: "Releases",
    evidence: "Evidence",
  };
  return (
    <header className="product-header">
      <div>
        <p className="product-breadcrumb">
          Workspace <span aria-hidden="true">/</span> {labels[view]}
        </p>
        <span className="product-header-context">
          {data.sites[0]?.name ?? "No site configured"}
        </span>
      </div>
      <div className="product-header-actions">
        <span className="workspace-status">
          <i aria-hidden="true" /> Account workspace
        </span>
      </div>
    </header>
  );
}

function OverviewView({ data }: { readonly data: WorkspaceData }) {
  const site = data.sites[0];
  const latest = data.evaluations[0];
  if (site === undefined) {
    return (
      <div className="product-view">
        <div className="view-heading-row">
          <div>
            <p className="view-eyebrow">Workspace overview</p>
            <h1>Start with a real deployment target.</h1>
            <p className="view-lede">
              Create a site, keep its policy private, then register the first robot build you want
              to review.
            </p>
          </div>
        </div>
        <EmptyState
          title="No site yet"
          body="Your account is ready. Add the facility and its private evaluation policy to begin."
          action={
            <Link className="view-primary-action" href="/app/setup">
              Set up a site <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </div>
    );
  }
  return (
    <div className="product-view overview-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Workspace overview</p>
          <h1>Make the next release easy to trust.</h1>
          <p className="view-lede">
            Preflight keeps the target, exact build, evaluation result, and human handoff in one
            accountable path.
          </p>
        </div>
        <Link className="view-primary-action" href="/app/evaluate">
          Evaluate a build <span aria-hidden="true">→</span>
        </Link>
      </div>
      <section className="workspace-summary-card" aria-labelledby="real-summary-title">
        <div className="summary-card-heading">
          <div>
            <span className="view-eyebrow">Current target</span>
            <h2 id="real-summary-title">{site.name}</h2>
          </div>
          <span className="summary-ready-pill">
            <i aria-hidden="true" /> Account-owned
          </span>
        </div>
        <div className="summary-facts">
          <div>
            <span>Location</span>
            <strong>{site.location}</strong>
            <small>Private policy commitment recorded</small>
          </div>
          <div>
            <span>Robots</span>
            <strong>{data.robots.length}</strong>
            <small>{data.robots.length === 1 ? "robot registered" : "robots registered"}</small>
          </div>
          <div>
            <span>Builds</span>
            <strong>{data.builds.length}</strong>
            <small>
              {data.builds.length === 0 ? "Register a build to evaluate" : "Exact build identities"}
            </small>
          </div>
        </div>
      </section>
      <section className="product-section-heading">
        <div>
          <p className="view-eyebrow">Release path</p>
          <h2>From target to accountable approval.</h2>
        </div>
        <span className="section-helper">Data belongs to {data.account.email}</span>
      </section>
      <ol className="release-path-list real-release-path">
        <li className="release-path-item is-complete">
          <span className="path-step">1</span>
          <div>
            <strong>Set up the target</strong>
            <p>Site, robot, and private policy are stored for this account.</p>
          </div>
          <span className="path-state">{site ? "READY" : "WAITING"}</span>
        </li>
        <li
          className={`release-path-item ${data.builds.length > 0 ? "is-complete" : "is-current"}`}
        >
          <span className="path-step">2</span>
          <div>
            <strong>Register an exact build</strong>
            <p>Record the artifact digest and declared route for evaluation.</p>
          </div>
          {data.builds.length > 0 ? (
            <span className="path-state">READY</span>
          ) : (
            <Link href="/app/setup" className="path-action">
              Add build <span aria-hidden="true">→</span>
            </Link>
          )}
        </li>
        <li className={`release-path-item ${latest ? "is-current" : ""}`}>
          <span className="path-step">3</span>
          <div>
            <strong>Evaluate the build</strong>
            <p>
              {latest
                ? `Latest result is ${latest.verdict}.`
                : "Run the deterministic evaluator against the private site policy."}
            </p>
          </div>
          {latest ? (
            <StatusPill status={latest.verdict} />
          ) : (
            <Link href="/app/evaluate" className="path-action">
              Evaluate <span aria-hidden="true">→</span>
            </Link>
          )}
        </li>
        <li className="release-path-item">
          <span className="path-step">4</span>
          <div>
            <strong>Prepare and approve release</strong>
            <p>A public clearance and human Ledger confirmation are still required.</p>
          </div>
          <Link href="/app/releases" className="path-action">
            View releases <span aria-hidden="true">→</span>
          </Link>
        </li>
      </ol>
      <section className="overview-cards" aria-label="Account workspace details">
        <article className="overview-detail-card">
          <div className="detail-card-topline">
            <span className="view-eyebrow">Latest evaluation</span>
            <Link href="/app/evaluate">Open evaluation →</Link>
          </div>
          {latest ? (
            <>
              <h3>
                <StatusPill status={latest.verdict} />
              </h3>
              <p>
                {latest.violationCount === 0
                  ? "No public violations were returned by the evaluator."
                  : `${latest.violationCount} public violation${latest.violationCount === 1 ? "" : "s"} need attention before release.`}
              </p>
              <div className="proof-line">
                <span>Build</span>
                <strong>{latest.robotBuildId}</strong>
              </div>
            </>
          ) : (
            <>
              <h3>No evaluation yet</h3>
              <p>Choose a registered build to create the first public result.</p>
            </>
          )}
        </article>
        <article className="overview-detail-card">
          <div className="detail-card-topline">
            <span className="view-eyebrow">Private policy</span>
            <Link href="/app/evidence">View boundaries →</Link>
          </div>
          <h3>Commitment only in the browser</h3>
          <p>
            The application shows a commitment and public result. Restricted geometry, thresholds,
            and the blind stay inside the API evaluation boundary.
          </p>
          <div className="proof-line">
            <span>Envelope</span>
            <strong>{site.safetyEnvelopeId}</strong>
          </div>
        </article>
      </section>
    </div>
  );
}

interface SetupFormState {
  readonly siteName: string;
  readonly location: string;
  readonly robotName: string;
  readonly version: string;
  readonly label: string;
  readonly artifactDigest: string;
  readonly startX: string;
  readonly startY: string;
  readonly endX: string;
  readonly endY: string;
  readonly speed: string;
  readonly width: string;
  readonly height: string;
  readonly zoneMinX: string;
  readonly zoneMinY: string;
  readonly zoneMaxX: string;
  readonly zoneMaxY: string;
  readonly maxSpeed: string;
  readonly zoneSpeed: string;
  readonly payloadThreshold: string;
}

const INITIAL_SETUP: SetupFormState = {
  siteName: "",
  location: "",
  robotName: "",
  version: "",
  label: "",
  artifactDigest: "",
  startX: "100",
  startY: "100",
  endX: "900",
  endY: "100",
  speed: "400",
  width: "1000",
  height: "1000",
  zoneMinX: "400",
  zoneMinY: "400",
  zoneMaxX: "600",
  zoneMaxY: "600",
  maxSpeed: "1000",
  zoneSpeed: "600",
  payloadThreshold: "40000",
};

function SetupView({
  data,
  refresh,
}: {
  readonly data: WorkspaceData;
  readonly refresh: () => Promise<void>;
}) {
  const router = useRouter();
  const [form, setForm] = useState<SetupFormState>(INITIAL_SETUP);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const update = (field: keyof SetupFormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));
  const submit = async () => {
    setBusy(true);
    setError(null);
    try {
      const site = await apiFetch<{ site: Site }>("/sites", {
        method: "POST",
        body: jsonBody({
          name: form.siteName,
          location: form.location,
          policy: {
            warehouseWidthMm: Number(form.width),
            warehouseHeightMm: Number(form.height),
            restrictedZone: {
              minXmm: Number(form.zoneMinX),
              minYmm: Number(form.zoneMinY),
              maxXmm: Number(form.zoneMaxX),
              maxYmm: Number(form.zoneMaxY),
            },
            maximumSpeedMmPerSecond: Number(form.maxSpeed),
            zoneSpeedLimitMmPerSecond: Number(form.zoneSpeed),
            payloadThresholdGrams: Number(form.payloadThreshold),
          },
        }),
      });
      const robot = await apiFetch<{ robot: Robot }>(`/sites/${site.site.id}/robots`, {
        method: "POST",
        body: jsonBody({ name: form.robotName }),
      });
      await apiFetch<{ build: Build }>(`/sites/${site.site.id}/builds`, {
        method: "POST",
        body: jsonBody({
          robotId: robot.robot.id,
          version: form.version,
          label: form.label,
          artifactDigest: form.artifactDigest,
          route: {
            start: { xMm: Number(form.startX), yMm: Number(form.startY) },
            end: { xMm: Number(form.endX), yMm: Number(form.endY) },
            speedMmPerSecond: Number(form.speed),
          },
        }),
      });
      await refresh();
      router.push("/app");
    } catch (reason) {
      setError(
        reason instanceof ApiError ? reason.message : "The setup could not be saved. Try again.",
      );
    } finally {
      setBusy(false);
    }
  };
  const existingSite = data.sites[0];
  if (existingSite !== undefined) {
    const site = existingSite;
    return (
      <div className="product-view setup-view">
        <div className="view-heading-row">
          <div>
            <p className="view-eyebrow">Site setup</p>
            <h1>{site.name} is connected to this account.</h1>
            <p className="view-lede">
              The private safety policy is represented here by its public commitment. Add more
              builds from the Builds view.
            </p>
          </div>
          <StatusPill status="READY" />
        </div>
        <section className="real-record-card">
          <dl className="real-facts">
            <div>
              <dt>Location</dt>
              <dd>{site.location}</dd>
            </div>
            <div>
              <dt>Safety envelope</dt>
              <dd>
                <code>{site.safetyEnvelopeId}</code>
              </dd>
            </div>
            <div>
              <dt>Commitment</dt>
              <dd>
                <code>{site.safetyEnvelopeCommitment}</code>
              </dd>
            </div>
            <div>
              <dt>Robots</dt>
              <dd>{data.robots.length}</dd>
            </div>
          </dl>
          <p className="real-boundary-copy">
            The policy contents, restricted geometry, thresholds, and blinding secret are not
            readable from this page or from the browser.
          </p>
          <Link className="view-primary-action" href="/app/builds">
            Manage builds <span aria-hidden="true">→</span>
          </Link>
        </section>
      </div>
    );
  }
  const steps = ["Site and policy", "Robot", "Exact build"];
  return (
    <div className="product-view setup-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">First-time setup</p>
          <h1>Create the target you actually operate.</h1>
          <p className="view-lede">
            This is saved to your account. The safety policy is encrypted at rest and only its
            commitment is returned to the browser.
          </p>
        </div>
        <span className="local-only-badge">Account-backed</span>
      </div>
      <section className="real-onboarding-card">
        <div className="real-stepper" aria-label={`Setup step ${step + 1} of ${steps.length}`}>
          {steps.map((label, index) => (
            <span
              className={index === step ? "active" : index < step ? "complete" : ""}
              key={label}
            >
              <i aria-hidden="true">{index < step ? "✓" : index + 1}</i>
              {label}
            </span>
          ))}
        </div>
        {error ? <ErrorNotice message={error} /> : null}
        {step === 0 ? (
          <div className="real-form-grid">
            <label>
              Site name
              <input
                value={form.siteName}
                onChange={(event) => update("siteName", event.target.value)}
                placeholder="North dock facility"
                required
              />
            </label>
            <label>
              Location
              <input
                value={form.location}
                onChange={(event) => update("location", event.target.value)}
                placeholder="City or facility code"
                required
              />
            </label>
            <fieldset>
              <legend>Private evaluation policy</legend>
              <p className="field-help">
                Use the measurements and rules your safety team owns. These values are never
                returned after save.
              </p>
              <div className="real-inline-fields">
                <label>
                  Width (mm)
                  <input
                    type="number"
                    value={form.width}
                    onChange={(event) => update("width", event.target.value)}
                  />
                </label>
                <label>
                  Height (mm)
                  <input
                    type="number"
                    value={form.height}
                    onChange={(event) => update("height", event.target.value)}
                  />
                </label>
                <label>
                  Max speed
                  <input
                    type="number"
                    value={form.maxSpeed}
                    onChange={(event) => update("maxSpeed", event.target.value)}
                  />
                </label>
                <label>
                  Zone speed
                  <input
                    type="number"
                    value={form.zoneSpeed}
                    onChange={(event) => update("zoneSpeed", event.target.value)}
                  />
                </label>
                <label>
                  Payload threshold (g)
                  <input
                    type="number"
                    value={form.payloadThreshold}
                    onChange={(event) => update("payloadThreshold", event.target.value)}
                  />
                </label>
              </div>
              <p className="field-help">Restricted rectangle</p>
              <div className="real-inline-fields">
                <label>
                  Min X
                  <input
                    type="number"
                    value={form.zoneMinX}
                    onChange={(event) => update("zoneMinX", event.target.value)}
                  />
                </label>
                <label>
                  Min Y
                  <input
                    type="number"
                    value={form.zoneMinY}
                    onChange={(event) => update("zoneMinY", event.target.value)}
                  />
                </label>
                <label>
                  Max X
                  <input
                    type="number"
                    value={form.zoneMaxX}
                    onChange={(event) => update("zoneMaxX", event.target.value)}
                  />
                </label>
                <label>
                  Max Y
                  <input
                    type="number"
                    value={form.zoneMaxY}
                    onChange={(event) => update("zoneMaxY", event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <button
              type="button"
              className="view-primary-action"
              onClick={() => setStep(1)}
              disabled={!form.siteName.trim() || !form.location.trim()}
            >
              Continue <span aria-hidden="true">→</span>
            </button>
          </div>
        ) : null}
        {step === 1 ? (
          <div className="real-form-grid">
            <label>
              Robot name
              <input
                value={form.robotName}
                onChange={(event) => update("robotName", event.target.value)}
                placeholder="AMR-01"
                required
              />
            </label>
            <p className="field-help">
              The robot is linked to this site and cannot be evaluated under another account.
            </p>
            <div className="real-form-actions">
              <button type="button" className="button-secondary" onClick={() => setStep(0)}>
                Back
              </button>
              <button
                type="button"
                className="view-primary-action"
                onClick={() => setStep(2)}
                disabled={!form.robotName.trim()}
              >
                Continue <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : null}
        {step === 2 ? (
          <div className="real-form-grid">
            <label>
              Build version
              <input
                value={form.version}
                onChange={(event) => update("version", event.target.value)}
                placeholder="2026.09.08"
                required
              />
            </label>
            <label>
              Build label
              <input
                value={form.label}
                onChange={(event) => update("label", event.target.value)}
                placeholder="Release candidate"
                required
              />
            </label>
            <label>
              Artifact digest
              <input
                value={form.artifactDigest}
                onChange={(event) => update("artifactDigest", event.target.value)}
                placeholder="sha256:…"
                required
              />
              <span className="field-help">Use the digest produced by your build pipeline.</span>
            </label>
            <fieldset>
              <legend>Declared route for evaluation</legend>
              <div className="real-inline-fields">
                <label>
                  Start X
                  <input
                    type="number"
                    value={form.startX}
                    onChange={(event) => update("startX", event.target.value)}
                  />
                </label>
                <label>
                  Start Y
                  <input
                    type="number"
                    value={form.startY}
                    onChange={(event) => update("startY", event.target.value)}
                  />
                </label>
                <label>
                  End X
                  <input
                    type="number"
                    value={form.endX}
                    onChange={(event) => update("endX", event.target.value)}
                  />
                </label>
                <label>
                  End Y
                  <input
                    type="number"
                    value={form.endY}
                    onChange={(event) => update("endY", event.target.value)}
                  />
                </label>
                <label>
                  Speed (mm/s)
                  <input
                    type="number"
                    value={form.speed}
                    onChange={(event) => update("speed", event.target.value)}
                  />
                </label>
              </div>
            </fieldset>
            <div className="real-form-actions">
              <button
                type="button"
                className="button-secondary"
                onClick={() => setStep(1)}
                disabled={busy}
              >
                Back
              </button>
              <button
                type="button"
                className="view-primary-action"
                onClick={() => void submit()}
                disabled={
                  busy ||
                  !form.version.trim() ||
                  !form.label.trim() ||
                  !/^sha256:[0-9a-f]{64}$/.test(form.artifactDigest.trim().toLowerCase())
                }
              >
                {busy ? "Saving target…" : "Create target and build"}{" "}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}

function BuildsView({ data }: { readonly data: WorkspaceData }) {
  if (data.sites.length === 0)
    return (
      <div className="product-view">
        <EmptyState
          title="Set up a site first"
          body="Build identities are always scoped to a real site and robot."
          action={
            <Link className="view-primary-action" href="/app/setup">
              Set up site <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </div>
    );
  if (data.builds.length === 0)
    return (
      <div className="product-view">
        <div className="view-heading-row">
          <div>
            <p className="view-eyebrow">Builds</p>
            <h1>Register the exact artifact.</h1>
            <p className="view-lede">
              Build registration is part of setup so the artifact digest and route are never implied
              by a UI label.
            </p>
          </div>
        </div>
        <EmptyState
          title="No builds registered"
          body="Return to site setup to register the first build for this account."
          action={
            <Link className="view-primary-action" href="/app/setup">
              Register first build <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </div>
    );
  return (
    <div className="product-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Builds</p>
          <h1>Exact robot build identities.</h1>
          <p className="view-lede">
            These records are account-owned. A build digest is not a display label and cannot be
            changed by selecting a different result.
          </p>
        </div>
      </div>
      <div className="real-list" role="list">
        {data.builds.map((build) => (
          <article className="real-list-card" key={build.id} role="listitem">
            <div>
              <span className="view-eyebrow">{build.label}</span>
              <h2>{build.version}</h2>
              <p>
                {build.robotId} · {build.id}
              </p>
            </div>
            <div className="real-list-meta">
              <span>
                Artifact <code>{build.artifactDigest}</code>
              </span>
              <span>
                Build digest <code>{build.robotBuildDigest}</code>
              </span>
              <Link
                className="path-action"
                href={`/app/evaluate?build=${encodeURIComponent(build.id)}`}
              >
                Evaluate <span aria-hidden="true">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function EvaluateView({
  data,
  refresh,
}: {
  readonly data: WorkspaceData;
  readonly refresh: () => Promise<void>;
}) {
  const router = useRouter();
  const [selectedBuildId, setSelectedBuildId] = useState(data.builds[0]?.id ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    if (selectedBuildId === "" && data.builds[0] !== undefined)
      setSelectedBuildId(data.builds[0].id);
  }, [data.builds, selectedBuildId]);
  const selected = data.builds.find((build) => build.id === selectedBuildId);
  const latest = data.evaluations.find((evaluation) => evaluation.buildId === selectedBuildId);
  async function evaluate() {
    if (selected === undefined || data.sites[0] === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ evaluation: Evaluation }>("/evaluations", {
        method: "POST",
        body: jsonBody({
          siteId: selected.siteId,
          robotId: selected.robotId,
          buildId: selected.id,
        }),
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Evaluation failed");
    } finally {
      setBusy(false);
    }
  }
  if (data.builds.length === 0)
    return (
      <div className="product-view">
        <EmptyState
          title="No build to evaluate"
          body="Register a site, robot, and exact artifact before asking for an evaluation."
          action={
            <Link className="view-primary-action" href="/app/setup">
              Set up a build <span aria-hidden="true">→</span>
            </Link>
          }
        />
      </div>
    );
  return (
    <div className="product-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Evaluation</p>
          <h1>Understand the result before release.</h1>
          <p className="view-lede">
            The API evaluates the stored build against the private policy and returns only a public
            result projection.
          </p>
        </div>
        <Link className="button-secondary" href="/app/builds">
          Manage builds
        </Link>
      </div>
      <section className="real-evaluation-card">
        <div className="real-evaluation-toolbar">
          <label>
            Exact build
            <select
              value={selectedBuildId}
              onChange={(event) => {
                setSelectedBuildId(event.target.value);
                router.replace(`/app/evaluate?build=${encodeURIComponent(event.target.value)}`);
              }}
            >
              {data.builds.map((build) => (
                <option value={build.id} key={build.id}>
                  {build.version} · {build.label}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            className="view-primary-action"
            onClick={() => void evaluate()}
            disabled={busy}
          >
            {busy ? "Evaluating…" : "Run evaluation"} <span aria-hidden="true">→</span>
          </button>
        </div>
        {error ? <ErrorNotice message={error} /> : null}
        {latest ? (
          <div
            className={`real-result-card ${latest.verdict.toLowerCase()}`}
            data-testid="real-evaluation-result"
          >
            <div className="real-result-heading">
              <div>
                <span className="view-eyebrow">Public evaluator result</span>
                <h2>
                  <StatusPill status={latest.verdict} />
                </h2>
              </div>
              <span className="real-result-date">
                {new Date(Number(latest.evaluatedAt) * 1000).toLocaleString()}
              </span>
            </div>
            <p className="real-result-summary">
              {latest.verdict === "CLEAR"
                ? "This exact build produced no public violations for the stored policy."
                : "This exact build must not move to release preparation until the reported violations are addressed."}
            </p>
            <div className="real-result-facts">
              <div>
                <span>Build binding</span>
                <code>{latest.robotBuildId}</code>
                <code>{latest.robotBuildDigest}</code>
              </div>
              <div>
                <span>Scenarios</span>
                <strong>{latest.scenarioCount}</strong>
              </div>
              <div>
                <span>Violations</span>
                <strong>{latest.violationCount}</strong>
              </div>
            </div>
            {latest.reasons.length > 0 ? (
              <ul className="real-reason-list">
                {latest.reasons.map((reason) => (
                  <li key={reason}>{reason.replaceAll("-", " ")}</li>
                ))}
              </ul>
            ) : null}
            <div className="real-result-footer">
              <span>Evaluator {latest.evaluatorVersion}</span>
              <span>
                Envelope commitment <code>{latest.safetyEnvelopeCommitment}</code>
              </span>
            </div>
          </div>
        ) : (
          <EmptyState
            title="No result for this build"
            body="Run the evaluator to create a public result. Private policy values will not be returned."
            action={
              <button
                type="button"
                className="view-primary-action"
                onClick={() => void evaluate()}
                disabled={busy}
              >
                {busy ? "Evaluating…" : "Run evaluation"}
              </button>
            }
          />
        )}
      </section>
    </div>
  );
}

function ReleasesView({
  data,
  refresh,
}: {
  readonly data: WorkspaceData;
  readonly refresh: () => Promise<void>;
}) {
  const clearEvaluation = data.evaluations.find((evaluation) => evaluation.verdict === "CLEAR");
  const [signer, setSigner] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function prepare() {
    if (clearEvaluation === undefined) return;
    setBusy(true);
    setError(null);
    try {
      await apiFetch("/releases/prepare", {
        method: "POST",
        body: jsonBody({
          evaluationId: clearEvaluation.evaluationId,
          signerAddress: signer,
          clearance: null,
        }),
      });
      await refresh();
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Release preparation failed");
      await refresh();
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="product-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Releases</p>
          <h1>Prepare the exact handoff.</h1>
          <p className="view-lede">
            A clear local evaluation is not an onchain clearance. Preflight will stop until the
            public record and configured release gate are available.
          </p>
        </div>
      </div>
      {clearEvaluation === undefined ? (
        <EmptyState
          title="A CLEAR evaluation is required"
          body="Run and review a clear result before release preparation becomes available."
          action={
            <Link className="view-primary-action" href="/app/evaluate">
              Open evaluation <span aria-hidden="true">→</span>
            </Link>
          }
        />
      ) : (
        <section className="real-release-card">
          <div className="real-release-target">
            <span className="view-eyebrow">Eligible evaluation</span>
            <h2>{clearEvaluation.robotBuildId}</h2>
            <p>
              {clearEvaluation.evaluationId} · exact digest{" "}
              <code>{clearEvaluation.robotBuildDigest}</code>
            </p>
            <StatusPill status="CLEAR" />
          </div>
          <div className="real-release-form">
            <label>
              Authorized signer address
              <input
                value={signer}
                onChange={(event) => setSigner(event.target.value)}
                placeholder="0x…"
              />
            </label>
            <button
              type="button"
              className="view-primary-action"
              onClick={() => void prepare()}
              disabled={busy || !/^0x[a-fA-F0-9]{40}$/.test(signer)}
            >
              {busy ? "Checking release gate…" : "Prepare release"}{" "}
              <span aria-hidden="true">→</span>
            </button>
            <p className="field-help">
              The browser cannot create a clearance, sign, or approve. This action calls the
              existing P5 boundary and will return a truthful blocked state when it is not
              configured.
            </p>
          </div>
          {error ? <ErrorNotice message={error} /> : null}
        </section>
      )}
      {data.releases.length > 0 ? (
        <section className="real-history">
          <div className="product-section-heading">
            <div>
              <p className="view-eyebrow">Release history</p>
              <h2>Account-owned attempts</h2>
            </div>
          </div>
          {data.releases.map((release) => (
            <article className="real-history-row" key={release.id}>
              <div>
                <strong>{release.evaluationId}</strong>
                <span>{release.message}</span>
              </div>
              <StatusPill status={release.status} />
            </article>
          ))}
        </section>
      ) : null}
    </div>
  );
}

function EvidenceView({ data }: { readonly data: WorkspaceData }) {
  return (
    <div className="product-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Evidence and boundaries</p>
          <h1>Technical proof supports the decision.</h1>
          <p className="view-lede">
            The normal product shows what an operator needs to trust the next step. Deeper partner
            evidence remains documented outside the private policy boundary.
          </p>
        </div>
      </div>
      <section className="real-evidence-grid">
        <article className="real-record-card">
          <span className="view-eyebrow">Data ownership</span>
          <h2>{data.account.email}</h2>
          <p>
            Sites, robots, builds, evaluations, and release attempts are loaded from this
            account&apos;s authenticated session. Another account cannot address their identifiers.
          </p>
        </article>
        <article className="real-record-card">
          <span className="view-eyebrow">Confidential evaluation</span>
          <h2>Commitment, not contents</h2>
          <p>
            The browser receives a safety-envelope commitment and public verdict only. The encrypted
            policy and blinding secret are opened inside the API before the deterministic evaluator
            runs.
          </p>
        </article>
        <article className="real-record-card">
          <span className="view-eyebrow">Human authority</span>
          <h2>Preparation is not approval</h2>
          <p>
            Release preparation can stop at <code>LEDGER_APPROVAL_REQUIRED</code>; only the existing
            P5 consume path can produce authorization, and no AI or browser state can replace the
            signer.
          </p>
        </article>
        <article className="real-record-card">
          <span className="view-eyebrow">Fixture boundary</span>
          <h2>P7 fixtures are not account data</h2>
          <p>
            The deterministic unsafe/corrected/mutated fixture remains available only at the
            explicit development route used by regression tests. It is not used by this workspace.
          </p>
          <Link className="path-action" href="/app/evidence">
            Keep reading <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>
    </div>
  );
}

export function RealProductApp({ initialView }: { readonly initialView: ProductView }) {
  const router = useRouter();
  const pathname = usePathname();
  const [data, setData] = useState<WorkspaceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const refresh = useCallback(async () => {
    const me = await apiFetch<{ account: Account }>("/auth/me");
    const sites = (await apiFetch<{ sites: readonly Site[] }>("/sites")).sites;
    const site = sites[0];
    const [robots, builds, evaluations, releases] = await Promise.all([
      site
        ? apiFetch<{ robots: readonly Robot[] }>(`/sites/${site.id}/robots`)
        : Promise.resolve({ robots: [] as readonly Robot[] }),
      site
        ? apiFetch<{ builds: readonly Build[] }>(`/sites/${site.id}/builds`)
        : Promise.resolve({ builds: [] as readonly Build[] }),
      apiFetch<{ evaluations: readonly Evaluation[] }>("/evaluations"),
      apiFetch<{ releases: readonly ReleaseAttempt[] }>("/releases"),
    ]);
    setData({
      account: me.account,
      sites,
      robots: robots.robots,
      builds: builds.builds,
      evaluations: evaluations.evaluations,
      releases: releases.releases,
    });
  }, []);
  useEffect(() => {
    let active = true;
    setLoading(true);
    void refresh()
      .catch((reason) => {
        if (!active) return;
        if (reason instanceof ApiError && reason.status === 401) {
          router.replace(`/start?next=${encodeURIComponent(pathname)}`);
          return;
        }
        setError(reason instanceof ApiError ? reason.message : "The workspace could not be loaded");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [pathname, refresh, router]);
  async function signOut() {
    await apiFetch("/auth/sign-out", { method: "POST" }).catch(() => undefined);
    router.replace("/start");
  }
  if (loading)
    return (
      <main className="product-loading" id="main-content">
        <div className="real-loading-card">
          <span className="loading-spinner" aria-hidden="true" />
          <h1>Loading your workspace</h1>
          <p>Checking the account session and private target records.</p>
        </div>
      </main>
    );
  if (error !== null || data === null)
    return (
      <main className="product-loading" id="main-content">
        <div className="real-loading-card">
          <h1>Workspace unavailable</h1>
          <p>{error ?? "Sign in is required."}</p>
          <Link className="view-primary-action" href="/start">
            Return to account entry
          </Link>
        </div>
      </main>
    );
  return (
    <main className="product-shell" id="main-content" data-product-view={initialView}>
      <ProductSidebar view={initialView} data={data} onSignOut={() => void signOut()} />
      <div className="product-main">
        <ProductHeader view={initialView} data={data} />
        <div className="product-content">
          {initialView === "overview" ? (
            <OverviewView data={data} />
          ) : initialView === "setup" ? (
            <SetupView data={data} refresh={refresh} />
          ) : initialView === "builds" ? (
            <BuildsView data={data} />
          ) : initialView === "evaluate" ? (
            <EvaluateView data={data} refresh={refresh} />
          ) : initialView === "releases" ? (
            <ReleasesView data={data} refresh={refresh} />
          ) : (
            <EvidenceView data={data} />
          )}
        </div>
      </div>
    </main>
  );
}
