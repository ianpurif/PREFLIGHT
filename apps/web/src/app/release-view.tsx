/** @deprecated Development fixture compatibility surface; normal /app routes use API state. */

import Link from "next/link";
import type { DemoPublicData } from "./demo-data";
import { shortDigest } from "./demo-mutation";

export function ReleaseView({ demo }: { readonly demo: DemoPublicData }) {
  return (
    <div className="product-view release-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Releases</p>
          <h1>Prepare the release, then let a human decide.</h1>
          <p className="view-lede">
            Preflight never treats a clear evaluation as authorization. The exact build, clearance,
            target, and expiry must be prepared before Ledger can be presented to an operator.
          </p>
        </div>
        <Link className="secondary-view-action" href="/app/evaluate?build=corrected">
          Go to clear build
        </Link>
      </div>

      <section className="release-status-banner" aria-labelledby="release-status-title">
        <div className="release-status-icon" aria-hidden="true">
          2
        </div>
        <div>
          <span className="view-eyebrow">Next safe stop after preparation</span>
          <h2 id="release-status-title">LEDGER_APPROVAL_REQUIRED</h2>
          <p>
            A clear build can enter this state after the existing agent prepares an exact request.
            No request is prepared in this view, no signature has been requested, and no robot
            activation is available.
          </p>
        </div>
        <span className="release-status-label">AFTER PREPARE</span>
      </section>

      <section className="release-steps" aria-labelledby="release-steps-title">
        <div className="product-section-heading release-section-heading">
          <div>
            <p className="view-eyebrow">Release path</p>
            <h2 id="release-steps-title">What happens next</h2>
          </div>
          <span className="section-helper">Exact binding · one-time approval</span>
        </div>
        <ol className="release-check-list">
          <li className="is-done">
            <span className="release-check-icon" aria-hidden="true">
              ✓
            </span>
            <div>
              <strong>Evaluation is clear</strong>
              <p>Build B passed the deterministic fixture for this site and evaluator version.</p>
            </div>
            <span className="release-check-state">COMPLETE</span>
          </li>
          <li className="is-current">
            <span className="release-check-icon" aria-hidden="true">
              2
            </span>
            <div>
              <strong>Prepare the exact intent</strong>
              <p>
                The existing host-owned agent checks public state and creates the bounded request.
              </p>
            </div>
            <Link href="/app/evaluate?build=corrected" className="release-check-action">
              Prepare from Evaluate →
            </Link>
          </li>
          <li>
            <span className="release-check-icon" aria-hidden="true">
              3
            </span>
            <div>
              <strong>Review on Ledger</strong>
              <p>
                The operator confirms the exact fields on hardware. The agent cannot do this step.
              </p>
            </div>
            <span className="release-check-state">WAITING</span>
          </li>
          <li>
            <span className="release-check-icon" aria-hidden="true">
              4
            </span>
            <div>
              <strong>Verify and consume once</strong>
              <p>
                Only the existing server authority can verify the signature and consume the nonce.
              </p>
            </div>
            <span className="release-check-state">WAITING</span>
          </li>
        </ol>
      </section>

      <section className="intent-preview-card" aria-labelledby="intent-preview-title">
        <div className="intent-preview-heading">
          <div>
            <p className="view-eyebrow">Exact release intent</p>
            <h2 id="intent-preview-title">The request Ledger will eventually display</h2>
          </div>
          <span className="intent-preview-lock">PUBLIC FIELDS ONLY</span>
        </div>
        <dl className="intent-preview-grid">
          <div>
            <dt>Site</dt>
            <dd>{demo.corrected.siteId}</dd>
          </div>
          <div>
            <dt>Robot</dt>
            <dd>{demo.corrected.build.robotId}</dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>{demo.corrected.build.buildId}</dd>
          </div>
          <div>
            <dt>Build digest</dt>
            <dd>{shortDigest(demo.corrected.build.robotBuildDigest)}</dd>
          </div>
          <div>
            <dt>Clearance</dt>
            <dd>Created only after exact clear state</dd>
          </div>
          <div>
            <dt>Signer</dt>
            <dd>Confirmed on Ledger, not by the agent</dd>
          </div>
        </dl>
        <p className="intent-preview-note">
          Private envelope data, evaluator rules, blind values, and internal findings are not part
          of the browser release intent.
        </p>
      </section>
    </div>
  );
}
