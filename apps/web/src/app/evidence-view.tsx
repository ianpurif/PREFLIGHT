/** @deprecated Development fixture compatibility surface; normal /app routes use API state. */

import Link from "next/link";
import type { DemoPublicData } from "./demo-data";

const evidenceItems = [
  {
    tone: "teal",
    label: "Chainlink CRE",
    title: "Confidential evaluation path",
    summary:
      "The handler reads the private envelope inside the confidential callback and returns an allowlisted public result.",
    status: "Authenticated simulation",
    href: "/app/evidence#chainlink",
  },
  {
    tone: "blue",
    label: "Ethereum Sepolia",
    title: "Public attestation identity",
    summary:
      "The registry stores exact public bindings and expiry state. It does not store private site rules.",
    status: "Deployed identity",
    href: "/app/evidence#registry",
  },
  {
    tone: "amber",
    label: "Ledger",
    title: "Human approval boundary",
    summary:
      "The agent can prepare an exact intent, but the operator must review and approve it on device.",
    status: "Software verified",
    href: "/app/evidence#ledger",
  },
] as const;

export function EvidenceView({ demo }: { readonly demo: DemoPublicData }) {
  return (
    <div className="product-view evidence-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Technical evidence</p>
          <h1>Proof that supports the decision.</h1>
          <p className="view-lede">
            These records explain how Rovaulta protects the boundaries around evaluation,
            attestation, and human approval. They are evidence—not extra authority.
          </p>
        </div>
        <Link className="secondary-view-action" href="/app/evaluate">
          Back to evaluation
        </Link>
      </div>

      <section className="evidence-grid" aria-label="Evidence summary">
        {evidenceItems.map((item) => (
          <a
            className={`evidence-summary-card tone-${item.tone}`}
            href={item.href}
            key={item.label}
          >
            <span className="evidence-card-label">{item.label}</span>
            <h2>{item.title}</h2>
            <p>{item.summary}</p>
            <span className="evidence-card-status">
              <i aria-hidden="true" /> {item.status}
            </span>
          </a>
        ))}
      </section>

      <section className="evidence-detail-stack" aria-label="Evidence details">
        <article className="evidence-detail-card" id="chainlink">
          <div className="evidence-detail-heading">
            <div>
              <span className="evidence-card-label">01 · Chainlink CRE</span>
              <h2>Confidential evaluation path</h2>
            </div>
            <span className="evidence-detail-pill tone-teal-pill">Simulation evidence</span>
          </div>
          <p>
            The official CRE workflow uses <code>handlerInTee</code> and consumes a fixed secret
            selector inside the callback. Only the public P1 result and behavior binding leave the
            confidential path.
          </p>
          <div className="evidence-result-grid">
            <div>
              <span>Unsafe fixture</span>
              <strong className="evidence-hold">{demo.creEvidence.unsafe}</strong>
            </div>
            <div>
              <span>Corrected fixture</span>
              <strong className="evidence-clear">{demo.creEvidence.corrected}</strong>
            </div>
            <div>
              <span>Tampered commitment</span>
              <strong className="evidence-reject">{demo.creEvidence.tampered}</strong>
            </div>
          </div>
          <details className="evidence-details">
            <summary>View boundary notes</summary>
            <ul>
              <li>
                Private envelope, blind, thresholds, geometry, and internal findings are not public
                output.
              </li>
              <li>
                Recorded evidence is an authenticated local CRE simulation, not a live DON
                deployment.
              </li>
              <li>The checked-in demo envelope is synthetic source-visible fixture data.</li>
            </ul>
          </details>
          <a
            className="evidence-source-link"
            href="https://github.com/ianpurif/ROVAULTA/blob/main/docs/compliance/evidence/chainlink-cre-p3-authenticated-simulation-2026-09-06.md"
            target="_blank"
            rel="noreferrer"
          >
            Open recorded CRE evidence <span aria-hidden="true">↗</span>
          </a>
        </article>

        <article className="evidence-detail-card" id="registry">
          <div className="evidence-detail-heading">
            <div>
              <span className="evidence-card-label">02 · Ethereum Sepolia</span>
              <h2>Public attestation identity</h2>
            </div>
            <span className="evidence-detail-pill tone-blue-pill">Public network</span>
          </div>
          <p>
            The registry is a public verification surface for exact bindings, verdict, issuer, and
            validity. It is not a copy of the private evaluation envelope and it cannot authorize a
            robot release on its own.
          </p>
          <dl className="evidence-facts">
            <div>
              <dt>Network</dt>
              <dd>Ethereum Sepolia · chain 11155111</dd>
            </div>
            <div>
              <dt>Registry</dt>
              <dd>
                <a href={demo.registryUrl} target="_blank" rel="noreferrer">
                  {demo.registryAddress}
                </a>
              </dd>
            </div>
            <div>
              <dt>Stored</dt>
              <dd>Public exact bindings, expiry, issuer, revocation state</dd>
            </div>
          </dl>
          <details className="evidence-details">
            <summary>View the trust boundary</summary>
            <p>
              The contract does not parse canonical JSON, reconstruct private commitments, prove CRE
              execution, or sign a deployment intent. Those checks stay in their existing layers.
            </p>
          </details>
        </article>

        <article className="evidence-detail-card" id="ledger">
          <div className="evidence-detail-heading">
            <div>
              <span className="evidence-card-label">03 · Ledger</span>
              <h2>Human approval boundary</h2>
            </div>
            <span className="evidence-detail-pill tone-amber-pill">Hardware gate</span>
          </div>
          <p>
            Rovaulta stops at <code>LEDGER_APPROVAL_REQUIRED</code> until the operator reviews the
            exact EIP-712 intent on device. The browser cannot turn a clear result into
            authorization.
          </p>
          <div className="ledger-boundary-steps">
            <div className="is-done">
              <span>1</span>
              <strong>Agent prepares</strong>
              <small>Exact public intent</small>
            </div>
            <div className="is-current">
              <span>2</span>
              <strong>Human reviews</strong>
              <small>Ledger display</small>
            </div>
            <div>
              <span>3</span>
              <strong>Server verifies</strong>
              <small>One-time consume</small>
            </div>
          </div>
          <details className="evidence-details">
            <summary>View current limitation</summary>
            <p>
              Physical Clear Signing evidence remains environment-dependent. The development
              Speculos harness is available, but it is not physical-device proof.
            </p>
          </details>
          <Link className="evidence-source-link" href="/p5-ledger?source=p8">
            Open the existing Ledger harness <span aria-hidden="true">→</span>
          </Link>
        </article>
      </section>

      <div className="evidence-footer-note">
        <span aria-hidden="true">◇</span>
        <p>
          Simulation and evaluation evidence are evidence about defined inputs. They are not a
          guarantee that a physical robot is globally or operationally safe.
        </p>
      </div>
    </div>
  );
}
