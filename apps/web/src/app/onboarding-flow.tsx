"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { type Account, ApiError, apiFetch, jsonBody } from "./api-client";
import styles from "./entry-page.module.css";

type AccountEntryMode = "register" | "sign-in";

function useAccountEntry(initialMode: AccountEntryMode) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const next = searchParams.get("next");

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submittedMode = mode;
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ account: Account }>(
        submittedMode === "register" ? "/auth/register" : "/auth/sign-in",
        { method: "POST", body: jsonBody({ email, password }) },
      );
      router.push(
        next?.startsWith("/app") ? next : submittedMode === "register" ? "/app/setup" : "/app",
      );
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Account request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  function switchMode(nextMode: AccountEntryMode) {
    setMode(nextMode);
    setError(null);
  }

  return {
    busy,
    email,
    error,
    mode,
    password,
    setEmail,
    setPassword,
    submit,
    switchMode,
  };
}

export function StartAccountEntry({
  initialMode = "register",
}: {
  readonly initialMode?: AccountEntryMode;
}) {
  const { busy, email, error, mode, password, setEmail, setPassword, submit, switchMode } =
    useAccountEntry(initialMode);

  return (
    <main className={styles.page} id="main-content">
      <div className={styles.gridField} aria-hidden="true" />
      <div className={styles.topRule} aria-hidden="true" />

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Back to Rovaulta home">
          <span className={styles.mark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandText}>
            <strong>Rovaulta</strong>
            <small>Release control for robots</small>
          </span>
        </Link>
        <div className={styles.topbarRight}>
          <span className={styles.secureStatus}>
            <i aria-hidden="true" />
            Controlled access
          </span>
          <Link className={styles.exitLink} href="/">
            Exit to overview <span aria-hidden="true">↗</span>
          </Link>
        </div>
      </header>

      <section className={styles.layout} aria-labelledby="account-entry-title">
        <aside className={styles.intro}>
          <p className={styles.eyebrow}>Operator entry / controlled deployment</p>
          <h1 id="account-entry-title">Enter the gate before a build reaches the floor.</h1>
          <p className={styles.introCopy}>
            Rovaulta keeps each facility, robot, exact build, evaluation, and release attempt in its
            own operator workspace.
          </p>

          <div className={styles.boundaryList}>
            <div className={styles.boundaryItem}>
              <span className={styles.boundaryIndex}>01</span>
              <span>
                <strong>Private evaluation</strong>
                <small>Site rules stay inside the evaluation boundary.</small>
              </span>
            </div>
            <div className={styles.boundaryItem}>
              <span className={styles.boundaryIndex}>02</span>
              <span>
                <strong>Exact identity</strong>
                <small>Clearance follows the declared site, robot, and build.</small>
              </span>
            </div>
            <div className={styles.boundaryItem}>
              <span className={styles.boundaryIndex}>03</span>
              <span>
                <strong>Human release gate</strong>
                <small>Final intent review remains an operator action on Ledger.</small>
              </span>
            </div>
          </div>
        </aside>

        <div className={styles.card}>
          <div className={styles.cardTopline}>
            <span className={styles.cardKicker}>
              <i aria-hidden="true" />
              Rovaulta / operator workspace
            </span>
            <span className={styles.cardMeta}>SESSION BOUNDARY</span>
          </div>

          <div className={styles.modeTabs} role="tablist" aria-label="Account access">
            <button
              type="button"
              role="tab"
              id="create-account-tab"
              aria-controls="account-entry-panel"
              aria-selected={mode === "register"}
              className={mode === "register" ? styles.modeTabActive : styles.modeTab}
              disabled={busy}
              onClick={() => switchMode("register")}
            >
              Create operator account
            </button>
            <button
              type="button"
              role="tab"
              id="sign-in-tab"
              aria-controls="account-entry-panel"
              aria-selected={mode === "sign-in"}
              className={mode === "sign-in" ? styles.modeTabActive : styles.modeTab}
              disabled={busy}
              onClick={() => switchMode("sign-in")}
            >
              Sign in
            </button>
          </div>

          <div
            id="account-entry-panel"
            role="tabpanel"
            aria-labelledby={mode === "register" ? "create-account-tab" : "sign-in-tab"}
          >
            <div className={styles.cardHeading}>
              <span className={styles.stepCaption}>
                {mode === "register" ? "New operator workspace" : "Existing operator workspace"}
              </span>
              <h2>{mode === "register" ? "Create your operator account" : "Welcome back"}</h2>
              <p>
                {mode === "register"
                  ? "Use an email you control. Your first site and robot target come next."
                  : "Continue to the targets and evaluations owned by your account."}
              </p>
            </div>

            {error ? (
              <p className={styles.error} role="alert">
                {error}
              </p>
            ) : null}

            <form
              className={styles.form}
              id="account-entry-form"
              aria-busy={busy}
              onSubmit={(event) => void submit(event)}
            >
              <label className={styles.field}>
                <span>
                  Email address <small>Required</small>
                </span>
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="operator@company.com"
                  required
                />
              </label>
              <label className={styles.field}>
                <span>
                  Password <small>12+ characters</small>
                </span>
                <input
                  type="password"
                  autoComplete={mode === "register" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your workspace password"
                  minLength={12}
                  required
                />
              </label>
              <button type="submit" className={styles.submit} disabled={busy}>
                {busy ? "Checking account…" : mode === "register" ? "Create account" : "Sign in"}
                <span aria-hidden="true">→</span>
              </button>
            </form>

            <div className={styles.cardFooter}>
              <span className={styles.footerRule} aria-hidden="true" />
              <p>
                {mode === "register"
                  ? "Already have an operator account?"
                  : "New to the controlled deployment workspace?"}{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => switchMode(mode === "register" ? "sign-in" : "register")}
                >
                  {mode === "register" ? "Sign in" : "Create an account"}
                </button>
              </p>
              <p className={styles.securityNote}>
                <span aria-hidden="true">◆</span>
                HTTP-only session cookie. Passwords are hashed by the API and never returned to the
                browser.
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export function StartAccountEntryLoading() {
  return (
    <main className={styles.page} id="main-content" aria-busy="true">
      <div className={styles.gridField} aria-hidden="true" />
      <div className={styles.topRule} aria-hidden="true" />

      <header className={styles.topbar}>
        <Link className={styles.brand} href="/" aria-label="Back to Rovaulta home">
          <span className={styles.mark} aria-hidden="true">
            R
          </span>
          <span className={styles.brandText}>
            <strong>Rovaulta</strong>
            <small>Release control for robots</small>
          </span>
        </Link>
        <span className={styles.secureStatus}>
          <i aria-hidden="true" />
          Controlled access
        </span>
      </header>

      <section className={styles.loadingLayout} aria-labelledby="account-entry-loading-title">
        <div className={styles.loadingCopy}>
          <p className={styles.eyebrow}>Operator entry / controlled deployment</p>
          <h1 id="account-entry-loading-title">Preparing the controlled workspace.</h1>
          <p className={styles.introCopy}>
            Loading the account entry boundary before a build can move forward.
          </p>
        </div>
        <div className={styles.loadingCard} role="status" aria-live="polite">
          <span className={styles.cardKicker}>
            <i aria-hidden="true" />
            Rovaulta / operator workspace
          </span>
          <span className={styles.loadingBar} aria-hidden="true" />
          <p>Preparing secure account access…</p>
        </div>
      </section>
    </main>
  );
}

export function AccountEntry({
  initialMode = "register",
}: {
  readonly initialMode?: AccountEntryMode;
}) {
  const { busy, email, error, mode, password, setEmail, setPassword, submit, switchMode } =
    useAccountEntry(initialMode);

  return (
    <main className="onboarding-page real-account-page" id="main-content">
      <div className="onboarding-topbar">
        <Link className="brand-lockup" href="/" aria-label="Back to Rovaulta home">
          <span className="brand-mark" aria-hidden="true">
            R
          </span>
          <span>
            <strong>Rovaulta</strong>
            <small>Deployment safety</small>
          </span>
        </Link>
        <Link className="onboarding-exit" href="/">
          Back to overview <span aria-hidden="true">↗</span>
        </Link>
      </div>
      <section className="onboarding-layout" aria-labelledby="account-entry-title">
        <aside className="onboarding-intro">
          <p className="landing-eyebrow">{mode === "register" ? "Create an account" : "Sign in"}</p>
          <h1 id="account-entry-title">A clear release path starts with a real workspace.</h1>
          <p>
            Rovaulta keeps your sites, robots, exact build records, evaluations, and release
            attempts separate from every other account.
          </p>
          <div className="onboarding-promise">
            <span className="promise-icon" aria-hidden="true">
              ◇
            </span>
            <span>
              <strong>Private policies stay private.</strong>
              <small>
                Your safety envelope is encrypted at rest and only its public commitment is shown in
                the browser.
              </small>
            </span>
          </div>
        </aside>
        <div className="onboarding-card real-account-card">
          <div className="onboarding-card-heading">
            <span className="onboarding-step-caption">
              {mode === "register" ? "New account" : "Existing account"}
            </span>
            <h2>{mode === "register" ? "Create your operator account" : "Welcome back"}</h2>
            <p>
              {mode === "register"
                ? "Use an email you control. You will create the site and robot target next."
                : "Continue to the targets and evaluations owned by your account."}
            </p>
          </div>
          {error ? (
            <p className="real-error" role="alert">
              {error}
            </p>
          ) : null}
          <form className="real-account-form" onSubmit={(event) => void submit(event)}>
            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="operator@company.com"
                required
              />
            </label>
            <label>
              Password
              <input
                type="password"
                autoComplete={mode === "register" ? "new-password" : "current-password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 12 characters"
                minLength={12}
                required
              />
            </label>
            <button type="submit" className="view-primary-action" disabled={busy}>
              {busy ? "Checking account…" : mode === "register" ? "Create account" : "Sign in"}{" "}
              <span aria-hidden="true">→</span>
            </button>
          </form>
          <p className="real-account-switch">
            {mode === "register" ? "Already have an account?" : "Need an account?"}{" "}
            <button
              type="button"
              disabled={busy}
              onClick={() => switchMode(mode === "register" ? "sign-in" : "register")}
            >
              {mode === "register" ? "Sign in" : "Create one"}
            </button>
          </p>
          <p className="field-help">
            This local product build uses an HTTP-only session cookie. Passwords are hashed by the
            API and never returned to the browser.
          </p>
        </div>
      </section>
    </main>
  );
}

export function OnboardingFlow() {
  return <StartAccountEntry initialMode="register" />;
}
