"use client";

import { LedgerBrowserAdapter } from "@preflight/ledger-gate";
import { useEffect, useRef, useState } from "react";

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? "http://localhost:4000";

function publicError(error: unknown): string {
  if (error !== null && typeof error === "object" && "code" in error) return String(error.code);
  if (error instanceof Error) return error.message;
  return "REQUEST_FAILED";
}

async function post(path: string, body: unknown) {
  const response = await fetch(`${apiOrigin}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
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
    );
    adapter.current = ledger;
    return () => {
      void ledger.disconnect();
    };
  }, []);

  async function connect() {
    try {
      setStatus("Waiting for Ledger connection and address confirmation…");
      const connected = await adapter.current?.connect();
      setSession(connected ? { ...connected } : null);
      setPrepared(null);
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
    <main className="shell p5-operator">
      <p className="eyebrow">P5 / LEDGER HARDWARE EVIDENCE HARNESS</p>
      <h1>Exact release approval</h1>
      <p className="lede">
        Operator or orchestration client proposes → deterministic Sepolia policy filters → human
        verifies → Ledger signs. This manual evidence harness does not implement an autonomous
        agent, activate a robot, or decide whether a clearance is valid.
      </p>
      <div className="operator-actions">
        <button type="button" onClick={connect}>
          Connect and verify Ledger
        </button>
        <button type="button" onClick={prepare}>
          Run deterministic pre-sign gate
        </button>
        <button type="button" onClick={approve}>
          Request physical approval
        </button>
        <button type="button" onClick={consume}>
          Verify and consume once
        </button>
      </div>
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
