"use client";

import Link from "next/link";
import { useState } from "react";
import type { DemoPublicData } from "./demo-data";
import { shortDigest } from "./demo-mutation";
import {
  useWorkspaceSetup,
  WORKSPACE_SETUP_STORAGE_KEY,
  type WorkspaceSetup,
} from "./workspace-context";

export function SetupView() {
  const { setup: values, setSetup } = useWorkspaceSetup();
  const [saved, setSaved] = useState(false);

  function update(field: keyof WorkspaceSetup, value: string) {
    setSaved(false);
    setSetup((current) => ({ ...current, [field]: value }));
  }

  function save() {
    window.sessionStorage.setItem(WORKSPACE_SETUP_STORAGE_KEY, JSON.stringify(values));
    setSaved(true);
  }

  return (
    <div className="product-view setup-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Site & robot</p>
          <h1>Give the review a clear target.</h1>
          <p className="view-lede">
            This context labels the workspace and release intent. It does not replace the
            evaluator&apos;s exact identifiers or create a chain record.
          </p>
        </div>
        <span className="local-only-badge">Local workspace context</span>
      </div>

      <div className="setup-layout">
        <section className="workspace-form-card" aria-labelledby="setup-form-title">
          <div className="form-card-heading">
            <span className="view-eyebrow">Target context</span>
            <h2 id="setup-form-title">Where is this release going?</h2>
            <p>Use operational names your team will recognize during a release review.</p>
          </div>
          <div className="workspace-form-grid">
            <label>
              Site name
              <input
                value={values.siteName}
                onChange={(event) => update("siteName", event.target.value)}
              />
            </label>
            <label>
              Facility type
              <select
                value={values.facilityType}
                onChange={(event) => update("facilityType", event.target.value)}
              >
                <option>Warehouse</option>
                <option>Distribution center</option>
                <option>Manufacturing floor</option>
              </select>
            </label>
            <label>
              Robot name
              <input
                value={values.robotName}
                onChange={(event) => update("robotName", event.target.value)}
              />
            </label>
            <label>
              Fleet or operating group
              <input
                value={values.fleetLabel}
                onChange={(event) => update("fleetLabel", event.target.value)}
              />
            </label>
          </div>
          <div className="form-card-actions">
            <span className="form-save-status" aria-live="polite">
              {saved
                ? "Saved for this browser session"
                : "Changes stay local to this demo workspace."}
            </span>
            <button type="button" className="view-primary-action" onClick={save}>
              Save context <span aria-hidden="true">✓</span>
            </button>
          </div>
        </section>

        <aside className="setup-side-card">
          <span className="view-eyebrow">What this controls</span>
          <h2>Labels, not authority.</h2>
          <p>
            The selected site and robot make the review legible. Clearance still comes from the
            exact validated identifiers and build digest returned by the evaluator.
          </p>
          <ul className="setup-boundary-list">
            <li>
              <span aria-hidden="true">✓</span> Public workspace labels
            </li>
            <li>
              <span aria-hidden="true">✓</span> Exact-build release context
            </li>
            <li>
              <span aria-hidden="true">×</span> No private safety rules here
            </li>
          </ul>
          <Link className="inline-action-link" href="/app/builds">
            Continue to builds <span aria-hidden="true">→</span>
          </Link>
        </aside>
      </div>
    </div>
  );
}

export function BuildsView({ demo }: { readonly demo: DemoPublicData }) {
  const { setup } = useWorkspaceSetup();
  return (
    <div className="product-view builds-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Builds</p>
          <h1>Choose the artifact you mean to release.</h1>
          <p className="view-lede">
            Each build is evaluated independently. A clearance for one digest cannot be reused for a
            changed artifact.
          </p>
        </div>
        <Link className="secondary-view-action" href="/app/setup">
          Edit target
        </Link>
      </div>

      <ul className="build-list" aria-label="Candidate builds">
        <li className="build-list-card is-hold">
          <div className="build-list-main">
            <div className="build-list-topline">
              <span className="build-status-badge hold">HOLD</span>
              <span className="build-list-date">Candidate · Controller release</span>
            </div>
            <h2>{demo.unsafe.build.label}</h2>
            <p className="build-version">Controller {demo.unsafe.build.version}</p>
            <p className="build-description">
              The evaluator found three public violation families on the declared route. Review the
              reasons before preparing any release.
            </p>
            <div className="build-list-reasons">
              {demo.unsafe.reasons.map((reason) => (
                <span key={reason}>{reason}</span>
              ))}
            </div>
          </div>
          <div className="build-list-side">
            <span className="build-list-label">Build digest</span>
            <code>{shortDigest(demo.unsafe.build.robotBuildDigest)}</code>
            <Link className="build-review-link is-hold-link" href="/app/evaluate?build=unsafe">
              Review held build <span aria-hidden="true">→</span>
            </Link>
          </div>
        </li>

        <li className="build-list-card is-clear">
          <div className="build-list-main">
            <div className="build-list-topline">
              <span className="build-status-badge clear">CLEAR</span>
              <span className="build-list-date">Candidate · Corrected route</span>
            </div>
            <h2>{demo.corrected.build.label}</h2>
            <p className="build-version">Controller {demo.corrected.build.version}</p>
            <p className="build-description">
              This build passed the deterministic fixture for the same site context. Human approval
              is still required before release.
            </p>
            <div className="build-clear-note">
              <span aria-hidden="true">✓</span> {demo.corrected.fixtureScenarioCount} committed
              evaluation templates · 0 critical violations
            </div>
          </div>
          <div className="build-list-side">
            <span className="build-list-label">Build digest</span>
            <code>{shortDigest(demo.corrected.build.robotBuildDigest)}</code>
            <Link className="build-review-link is-clear-link" href="/app/evaluate?build=corrected">
              Evaluate this build <span aria-hidden="true">→</span>
            </Link>
          </div>
        </li>
      </ul>

      <p className="builds-workspace-context">
        Workspace label: <strong>{setup.buildLabel || "Release candidate"}</strong> ·{" "}
        {setup.buildVersion}. The deterministic demo candidates below keep their exact fixture
        identities.
      </p>

      <div className="builds-footnote">
        <span className="footnote-icon" aria-hidden="true">
          ◇
        </span>
        <p>
          The site&apos;s private envelope is consumed by the confidential evaluator. This view only
          shows public identifiers, verdicts, and explanatory reasons.
        </p>
        <Link href="/app/evidence">Why this stays private →</Link>
      </div>
    </div>
  );
}
