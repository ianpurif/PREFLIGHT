"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { type Account, ApiError, apiFetch, jsonBody } from "./api-client";

export function AccountEntry({
  initialMode = "register",
}: {
  readonly initialMode?: "register" | "sign-in";
}) {
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
    setBusy(true);
    setError(null);
    try {
      await apiFetch<{ account: Account }>(
        mode === "register" ? "/auth/register" : "/auth/sign-in",
        { method: "POST", body: jsonBody({ email, password }) },
      );
      router.push(next?.startsWith("/app") ? next : mode === "register" ? "/app/setup" : "/app");
    } catch (reason) {
      setError(reason instanceof ApiError ? reason.message : "Account request failed. Try again.");
    } finally {
      setBusy(false);
    }
  }
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
              onClick={() => {
                setMode(mode === "register" ? "sign-in" : "register");
                setError(null);
              }}
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
  return <AccountEntry initialMode="register" />;
}
