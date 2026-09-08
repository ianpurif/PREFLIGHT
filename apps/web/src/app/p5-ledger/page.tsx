"use client";

import {
  createLedgerBrowserDependencies,
  createLedgerTransportRuntime,
  LedgerBrowserAdapter,
  parseLedgerTransportConfig,
} from "@preflight/ledger-gate";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";
const ledgerTransport = parseLedgerTransportConfig(
  process.env.NEXT_PUBLIC_LEDGER_TRANSPORT,
  process.env.NEXT_PUBLIC_LEDGER_SPECULOS_URL,
  process.env.NODE_ENV,
);
const isSpeculos = ledgerTransport.kind === "speculos";

function publicError(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) return String(error.code);
  if (error instanceof Error) return error.message;
  return "REQUEST_FAILED";
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const payload = (await response.json()) as Record<string, unknown>;
  if (!response.ok) throw new Error(String(payload.error ?? "REQUEST_FAILED"));
  return payload;
}

export default function P5LedgerOperatorPage() {
  const adapter = useRef<LedgerBrowserAdapter | null>(null);
  const [session, setSession] = useState<Record<string, unknown> | null>(null);
  const [clearanceJson, setClearanceJson] = useState("");
  const [prepared, setPrepared] = useState<Record<string, unknown> | null>(null);
  const [signature, setSignature] = useState<string | null>(null);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [status, setStatus] = useState("Ready for an explicit Ledger connection gesture.");

  useEffect(() => {
    const ledger = new LedgerBrowserAdapter(
      process.env.NEXT_PUBLIC_LEDGER_ORIGIN_TOKEN ?? "",
      process.env.NEXT_PUBLIC_LEDGER_DERIVATION_PATH || undefined,
      createLedgerBrowserDependencies(
        createLedgerTransportRuntime(ledgerTransport, process.env.NODE_ENV),
      ),
    );
    adapter.current = ledger;
    const handoff = window.sessionStorage.getItem("preflight.p5.prepared");
    if (handoff !== null) {
      try {
        const preparedPayload = JSON.parse(handoff) as Record<string, unknown>;
        setPrepared(preparedPayload);
        setStatus(
          "Exact P5 request handed off from the judge view. Connect Ledger to review it; authorization has not happened.",
        );
      } catch {
        window.sessionStorage.removeItem("preflight.p5.prepared");
      }
    }
    return () => {
      void ledger.disconnect();
    };
  }, []);

  async function connect() {
    try {
      setStatus("Waiting for Ledger connection and address confirmation…");
      const connected = await adapter.current?.connect();
      setSession(connected ? { ...connected } : null);
      setSignature(null);
      setResult(null);
      setStatus("Ledger connected. Paste a public P1 clearance record to run the pre-sign gate.");
    } catch (error) {
      setStatus(publicError(error));
    }
  }

  async function prepare() {
    try {
      if (session === null) throw new Error("DEVICE_DISCONNECTED");
      const clearance = JSON.parse(clearanceJson) as Record<string, unknown>;
      const inputs = clearance.inputs as Record<string, unknown>;
      const response = await post("/release/prepare", {
        siteId: inputs.siteId,
        robotId: inputs.robotId,
        robotBuildId: inputs.robotBuildId,
        robotBuildDigest: inputs.robotBuildDigest,
        clearance,
        signerAddress: session.signerAddress,
      });
      setPrepared(response);
      setSignature(null);
      setResult(null);
      setStatus(
        "Eligible exact intent prepared. Signing proceeds only if Ledger resolves every required display field.",
      );
    } catch (error) {
      setStatus(publicError(error));
    }
  }

  async function approve() {
    try {
      if (prepared === null) throw new Error("NO_PREPARED_REQUEST");
      setStatus("Review the exact fields on Ledger; unresolved Clear Signing aborts the request.");
      const approval = await adapter.current?.sign(prepared);
      if (approval === undefined) throw new Error("DEVICE_DISCONNECTED");
      setSignature(approval.signature);
      setStatus("Signature received. It is not authorization until server verification succeeds.");
    } catch (error) {
      setStatus(publicError(error));
    }
  }

  async function consume() {
    try {
      if (prepared === null || signature === null) throw new Error("NO_LEDGER_SIGNATURE");
      const authorization = await post("/release/consume", {
        intent: prepared.intent,
        signature,
      });
      setResult(authorization);
      setStatus("One-time ReleaseAuthorization verified and nonce consumed.");
    } catch (error) {
      setStatus(publicError(error));
    }
  }

  return (
    <main className="shell p5-operator" id="main-content">
      <header className="operator-topbar">
        <Link className="brand-lockup" href="/app" aria-label="Back to Preflight workspace">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>Preflight</strong>
            <small>Human release gate</small>
          </span>
        </Link>
        <Link className="operator-back-link" href="/app/releases">
          Back to releases <span aria-hidden="true">↗</span>
        </Link>
      </header>
      <div className="operator-heading">
        <p className="eyebrow">
          {isSpeculos
            ? "HUMAN APPROVAL / LEDGER SPECULOS SIMULATOR"
            : "HUMAN APPROVAL / LEDGER DEVICE"}
        </p>
        <span className="operator-step-state">STEP 4 OF 4 · OPERATOR ACTION</span>
      </div>
      <h1>Approve the exact release.</h1>
      <p className="lede">
        The agent can prepare a request, but only you can verify the exact fields on Ledger.{" "}
        {isSpeculos ? "This run uses Ledger's official simulator. " : ""}
        This harness does not activate a robot or decide whether a clearance is valid.
      </p>
      <ol className="operator-stepper" aria-label="Human approval steps">
        <li className="is-complete">
          <span>1</span>Prepare exact intent
        </li>
        <li className="is-current">
          <span>2</span>Review on device
        </li>
        <li>
          <span>3</span>Verify and consume once
        </li>
      </ol>
      <div className="operator-actions">
        <button type="button" onClick={connect}>
          Connect and verify Ledger
        </button>
        <button type="button" onClick={prepare}>
          Run deterministic pre-sign gate
        </button>
        <button type="button" onClick={approve}>
          {isSpeculos ? "Request simulator approval" : "Request physical approval"}
        </button>
        <button type="button" onClick={consume}>
          Verify and consume once
        </button>
      </div>
      <details className="operator-input-details" open={prepared === null}>
        <summary>Advanced: provide a public P1 clearance record</summary>
        <label htmlFor="clearance">Public P1 clearance record</label>
        <textarea
          id="clearance"
          rows={16}
          spellCheck={false}
          value={clearanceJson}
          onChange={(event) => {
            setClearanceJson(event.target.value);
            setPrepared(null);
            setSignature(null);
            setResult(null);
          }}
        />
      </details>
      <section className="card operator-status">
        <strong>Current status</strong>
        <span>{status}</span>
      </section>
      {session ? <pre>{JSON.stringify(session, null, 2)}</pre> : null}
      {prepared ? <pre>{JSON.stringify(prepared, null, 2)}</pre> : null}
      {result ? <pre>{JSON.stringify(result, null, 2)}</pre> : null}
    </main>
  );
}
