"use client";

import Link from "next/link";
import { useState } from "react";
import {
  DEFAULT_WORKSPACE_SETUP,
  WORKSPACE_SETUP_STORAGE_KEY,
  type WorkspaceSetup,
} from "./workspace-context";

const steps = [
  { label: "Site", helper: "Where will this build run?" },
  { label: "Robot", helper: "Which robot is it for?" },
  { label: "Build", helper: "What exact artifact are you reviewing?" },
] as const;

export function OnboardingFlow() {
  const [step, setStep] = useState(0);
  const [setup, setSetup] = useState<WorkspaceSetup>(DEFAULT_WORKSPACE_SETUP);
  const [saved, setSaved] = useState(false);

  function update(field: keyof WorkspaceSetup, value: string) {
    setSaved(false);
    setSetup((current) => ({ ...current, [field]: value }));
  }

  function next() {
    if (step < steps.length - 1) {
      setStep((current) => current + 1);
      return;
    }
    window.sessionStorage.setItem(WORKSPACE_SETUP_STORAGE_KEY, JSON.stringify(setup));
    setSaved(true);
  }

  function previous() {
    setSaved(false);
    setStep((current) => Math.max(0, current - 1));
  }

  const currentStep = steps[step] ?? steps[0];

  return (
    <main className="onboarding-page" id="main-content">
      <div className="onboarding-topbar">
        <Link className="brand-lockup" href="/" aria-label="Back to Preflight home">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>Preflight</strong>
            <small>Deployment safety</small>
          </span>
        </Link>
        <Link className="onboarding-exit" href="/app/evaluate">
          Skip setup and view demo <span aria-hidden="true">↗</span>
        </Link>
      </div>

      <section className="onboarding-layout" aria-labelledby="onboarding-title">
        <aside className="onboarding-intro">
          <p className="landing-eyebrow">Get started</p>
          <h1 id="onboarding-title">Set up a release review in a minute.</h1>
          <p>
            We&apos;ll use this context to label your workspace. You can change it later. Site rules
            and confidential evaluation data never belong in this form.
          </p>
          <div className="onboarding-promise">
            <span className="promise-icon" aria-hidden="true">
              ◇
            </span>
            <span>
              <strong>Keep the private parts private.</strong>
              <small>Preflight only shows the public result needed for a release decision.</small>
            </span>
          </div>
        </aside>

        <div className="onboarding-card">
          <div
            className="onboarding-progress"
            role="progressbar"
            aria-label={`Setup step ${step + 1} of 3`}
            aria-valuemin={1}
            aria-valuemax={steps.length}
            aria-valuenow={step + 1}
          >
            <div className="onboarding-progress-bar">
              <span style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
            </div>
            <div className="onboarding-progress-labels">
              {steps.map((item, index) => (
                <span className={index <= step ? "is-active" : ""} key={item.label}>
                  <i aria-hidden="true">{index < step ? "✓" : index + 1}</i>
                  {item.label}
                </span>
              ))}
            </div>
          </div>

          {!saved ? (
            <>
              <div className="onboarding-card-heading">
                <span className="onboarding-step-caption">Step {step + 1} of 3</span>
                <h2>{currentStep.label}</h2>
                <p>{currentStep.helper}</p>
              </div>

              {step === 0 ? (
                <div className="onboarding-fields">
                  <label>
                    Site name
                    <input
                      value={setup.siteName}
                      onChange={(event) => update("siteName", event.target.value)}
                      placeholder="e.g. Warehouse Manila-01"
                    />
                  </label>
                  <label>
                    Facility type
                    <select
                      value={setup.facilityType}
                      onChange={(event) => update("facilityType", event.target.value)}
                    >
                      <option>Warehouse</option>
                      <option>Distribution center</option>
                      <option>Manufacturing floor</option>
                    </select>
                  </label>
                </div>
              ) : null}

              {step === 1 ? (
                <div className="onboarding-fields">
                  <label>
                    Robot name
                    <input
                      value={setup.robotName}
                      onChange={(event) => update("robotName", event.target.value)}
                      placeholder="e.g. AMR-17"
                    />
                  </label>
                  <label>
                    Fleet or operating group
                    <input
                      value={setup.fleetLabel}
                      onChange={(event) => update("fleetLabel", event.target.value)}
                      placeholder="e.g. Manila autonomous fleet"
                    />
                  </label>
                </div>
              ) : null}

              {step === 2 ? (
                <div className="onboarding-fields">
                  <label>
                    Build version
                    <input
                      value={setup.buildVersion}
                      onChange={(event) => update("buildVersion", event.target.value)}
                      placeholder="e.g. 4.7.21"
                    />
                  </label>
                  <label>
                    Build label <span className="field-optional">Optional</span>
                    <input
                      value={setup.buildLabel}
                      onChange={(event) => update("buildLabel", event.target.value)}
                      placeholder="e.g. Controller release candidate"
                    />
                  </label>
                  <p className="onboarding-field-note">
                    The evaluator binds to the exact build digest. This label is only for your
                    workspace; it does not change evaluation semantics.
                  </p>
                </div>
              ) : null}

              <div className="onboarding-actions">
                <button
                  type="button"
                  className="onboarding-back"
                  onClick={previous}
                  disabled={step === 0}
                >
                  Back
                </button>
                <button type="button" className="onboarding-next" onClick={next}>
                  {step === steps.length - 1 ? "Open workspace" : "Continue"}
                  <span aria-hidden="true">→</span>
                </button>
              </div>
            </>
          ) : (
            <div className="onboarding-complete">
              <span className="complete-mark" aria-hidden="true">
                ✓
              </span>
              <span className="onboarding-step-caption">Workspace ready</span>
              <h2>{setup.siteName}</h2>
              <p>
                {setup.robotName} · Build {setup.buildVersion}. Your review workspace is ready to
                explore.
              </p>
              <Link className="onboarding-next onboarding-open-link" href="/app">
                Open Preflight workspace <span aria-hidden="true">→</span>
              </Link>
              <button
                type="button"
                className="onboarding-start-over"
                onClick={() => {
                  setSaved(false);
                  setStep(0);
                }}
              >
                Edit setup
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
