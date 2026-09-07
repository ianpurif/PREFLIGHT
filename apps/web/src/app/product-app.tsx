import Link from "next/link";
import type { DemoPublicData } from "./demo-data";

export type ProductView = "overview" | "setup" | "builds" | "evaluate" | "releases" | "evidence";

const navItems: readonly Readonly<{ href: string; label: string; view: ProductView }>[] = [
  { href: "/app", label: "Overview", view: "overview" },
  { href: "/app/setup", label: "Site & robot", view: "setup" },
  { href: "/app/builds", label: "Builds", view: "builds" },
  { href: "/app/evaluate", label: "Evaluate", view: "evaluate" },
  { href: "/app/releases", label: "Releases", view: "releases" },
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

function ProductHeader({ view }: { readonly view: ProductView }) {
  const labels: Readonly<Record<ProductView, string>> = {
    overview: "Workspace overview",
    setup: "Site & robot",
    builds: "Builds",
    evaluate: "Evaluation",
    releases: "Releases",
    evidence: "Technical evidence",
  };
  return (
    <header className="product-header">
      <div>
        <p className="product-breadcrumb">
          Workspace <span aria-hidden="true">/</span> {labels[view]}
        </p>
        <span className="product-header-context">Warehouse Manila-01 · AMR-17</span>
      </div>
      <div className="product-header-actions">
        <span className="workspace-status">
          <i aria-hidden="true" /> Demo workspace
        </span>
        <Link className="header-home-link" href="/">
          Exit workspace
        </Link>
      </div>
    </header>
  );
}

function WorkspaceSidebar({ view }: { readonly view: ProductView }) {
  return (
    <aside className="product-sidebar">
      <div className="product-sidebar-top">
        <ProductBrand />
        <div className="sidebar-workspace-card">
          <span className="sidebar-label">Current workspace</span>
          <strong>Manila warehouse</strong>
          <span>AMR-17 · release review</span>
        </div>
        <nav className="product-nav" aria-label="Workspace navigation">
          <span className="sidebar-label">Review</span>
          {navItems.map((item) => (
            <Link
              className={`product-nav-link ${item.view === view ? "is-active" : ""}`}
              href={item.href}
              aria-current={item.view === view ? "page" : undefined}
              key={item.view}
            >
              <span className={`nav-icon nav-icon-${item.view}`} aria-hidden="true" />
              {item.label}
              {item.view === "evaluate" ? <span className="nav-count">2</span> : null}
            </Link>
          ))}
          <span className="sidebar-label sidebar-label-spaced">Proof</span>
          <Link
            className={`product-nav-link ${view === "evidence" ? "is-active" : ""}`}
            href="/app/evidence"
            aria-current={view === "evidence" ? "page" : undefined}
          >
            <span className="nav-icon nav-icon-evidence" aria-hidden="true" />
            Evidence
          </Link>
        </nav>
      </div>
      <div className="product-sidebar-bottom">
        <div className="sidebar-boundary-card">
          <span className="sidebar-boundary-icon" aria-hidden="true">
            ◇
          </span>
          <span>
            <strong>Private by design</strong>
            <small>Site rules stay outside the browser.</small>
          </span>
        </div>
        <Link className="sidebar-back-link" href="/start">
          Edit workspace setup
        </Link>
      </div>
    </aside>
  );
}

function OverviewView({ demo }: { readonly demo: DemoPublicData }) {
  return (
    <div className="product-view overview-view">
      <div className="view-heading-row">
        <div>
          <p className="view-eyebrow">Workspace overview</p>
          <h1>Make the next release easy to trust.</h1>
          <p className="view-lede">
            Start with the target, choose the exact build, and follow the review through to a human
            release decision.
          </p>
        </div>
        <Link className="view-primary-action" href="/app/evaluate">
          Start evaluation <span aria-hidden="true">→</span>
        </Link>
      </div>

      <section className="workspace-summary-card" aria-labelledby="summary-title">
        <div className="summary-card-heading">
          <div>
            <span className="view-eyebrow">Current target</span>
            <h2 id="summary-title">Warehouse Manila-01</h2>
          </div>
          <span className="summary-ready-pill">
            <i aria-hidden="true" /> Ready for review
          </span>
        </div>
        <div className="summary-facts">
          <div>
            <span>Robot</span>
            <strong>AMR-17</strong>
            <small>Autonomous mobile robot</small>
          </div>
          <div>
            <span>Builds waiting</span>
            <strong>2</strong>
            <small>4.7.20 and 4.7.21</small>
          </div>
          <div>
            <span>Current decision</span>
            <strong className="summary-hold">HOLD</strong>
            <small>Build A needs a correction</small>
          </div>
        </div>
      </section>

      <section className="product-section-heading">
        <div>
          <p className="view-eyebrow">Release path</p>
          <h2>Four checks. One accountable decision.</h2>
        </div>
        <span className="section-helper">Demo workspace · deterministic fixture</span>
      </section>
      <ol className="release-path-list">
        <li className="release-path-item is-complete">
          <span className="path-step">1</span>
          <div>
            <strong>Set up the target</strong>
            <p>Site and robot context are ready for this workspace.</p>
          </div>
          <span className="path-state">READY</span>
        </li>
        <li className="release-path-item is-current">
          <span className="path-step">2</span>
          <div>
            <strong>Evaluate an exact build</strong>
            <p>Compare Build A and Build B against the same site workflow.</p>
          </div>
          <Link href="/app/evaluate" className="path-action">
            Review <span aria-hidden="true">→</span>
          </Link>
        </li>
        <li className="release-path-item">
          <span className="path-step">3</span>
          <div>
            <strong>Prepare the release</strong>
            <p>Only a clear, exact build can create a release request.</p>
          </div>
          <span className="path-state">WAITING</span>
        </li>
        <li className="release-path-item">
          <span className="path-step">4</span>
          <div>
            <strong>Human approval</strong>
            <p>The operator reviews the exact intent on Ledger hardware.</p>
          </div>
          <span className="path-state">WAITING</span>
        </li>
      </ol>

      <section className="overview-cards" aria-label="Workspace details">
        <article className="overview-detail-card">
          <div className="detail-card-topline">
            <span className="view-eyebrow">Builds</span>
            <Link href="/app/builds">View all →</Link>
          </div>
          <h3>Two candidate builds</h3>
          <p>
            Build A is held for three public violation families. Build B is the corrected route.
          </p>
          <div className="mini-build-row">
            <span className="mini-build-dot is-hold" aria-hidden="true" />
            <span>4.7.20 · Build A</span>
            <strong>HOLD</strong>
          </div>
          <div className="mini-build-row">
            <span className="mini-build-dot is-clear" aria-hidden="true" />
            <span>4.7.21 · Build B</span>
            <strong>CLEAR</strong>
          </div>
        </article>
        <article className="overview-detail-card">
          <div className="detail-card-topline">
            <span className="view-eyebrow">Technical proof</span>
            <Link href="/app/evidence">Open evidence →</Link>
          </div>
          <h3>Public evidence is ready</h3>
          <p>
            The workspace can show the public result, CRE boundary, registry identity, and Ledger
            handoff without exposing private evaluation inputs.
          </p>
          <div className="proof-line">
            <span>CRE simulation</span>
            <strong>
              {demo.creEvidence.unsafe} / {demo.creEvidence.corrected}
            </strong>
          </div>
          <div className="proof-line">
            <span>Registry</span>
            <strong>Sepolia · deployed</strong>
          </div>
        </article>
      </section>
    </div>
  );
}

export function ProductApp({
  demo,
  initialView,
  children,
}: {
  readonly demo: DemoPublicData;
  readonly initialView: ProductView;
  readonly children?: React.ReactNode;
}) {
  return (
    <main className="product-shell" id="main-content" data-product-view={initialView}>
      <WorkspaceSidebar view={initialView} />
      <div className="product-main">
        <ProductHeader view={initialView} />
        <div className="product-content">
          {initialView === "overview" ? (
            <OverviewView demo={demo} />
          ) : (
            (children ?? (
              <div className="product-empty-state">
                <p className="view-eyebrow">Coming next</p>
                <h1>Open this workspace from the review path.</h1>
                <Link href="/app/evaluate" className="view-primary-action">
                  Open evaluation <span aria-hidden="true">→</span>
                </Link>
              </div>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
