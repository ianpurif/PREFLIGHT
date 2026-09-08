import Link from "next/link";

const steps = [
  {
    number: "01",
    title: "Set the target",
    body: "Choose the site, robot, and software build you are preparing to release.",
  },
  {
    number: "02",
    title: "Evaluate privately",
    body: "Run the exact build through the site's confidential evaluation workflow.",
  },
  {
    number: "03",
    title: "Understand the result",
    body: "See why a build is held or cleared without exposing the site's private rules.",
  },
  {
    number: "04",
    title: "Approve the release",
    body: "A human reviews the exact release details and confirms them on Ledger hardware.",
  },
] as const;

export function LandingPage() {
  return (
    <main className="landing-page" id="main-content">
      <div className="landing-noise" aria-hidden="true" />
      <header className="landing-nav">
        <Link className="brand-lockup" href="/" aria-label="Rovaulta home">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>Rovaulta</strong>
            <small>Deployment safety</small>
          </span>
        </Link>
        <nav className="landing-nav-links" aria-label="Primary navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#boundaries">Safety boundaries</a>
          <Link href="/app/evidence">Technical evidence</Link>
        </nav>
        <Link className="nav-quiet-link" href="/start">
          Get started <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className="landing-hero" aria-labelledby="landing-title">
        <div className="landing-hero-copy">
          <p className="landing-eyebrow">
            <span className="eyebrow-dot" aria-hidden="true" />
            Deployment gate for autonomous warehouse robots
          </p>
          <h1 id="landing-title">
            Release the build
            <br />
            you <em>actually evaluated.</em>
          </h1>
          <p className="landing-lede">
            Rovaulta checks an exact robot software build against a site&apos;s private evaluation
            rules, then gives a human the final say before release.
          </p>
          <div className="landing-actions">
            <Link className="landing-primary-action" href="/start">
              Get started <span aria-hidden="true">→</span>
            </Link>
            <a className="landing-secondary-action" href="#how-it-works">
              See how it works
            </a>
          </div>
          <p className="landing-note">
            Built for safety engineers, integrators, and teams shipping AMR software into real
            facilities.
          </p>
        </div>

        <div className="landing-hero-visual" role="img" aria-label="Rovaulta release flow preview">
          <div className="hero-visual-topline">
            <span>RELEASE REVIEW</span>
            <span className="hero-visual-live">
              <i aria-hidden="true" /> Example review
            </span>
          </div>
          <div className="hero-build-card">
            <div className="hero-build-meta">
              <span className="build-status-mark" aria-hidden="true">
                ✓
              </span>
              <div>
                <span className="hero-card-label">Exact build</span>
                <strong>Robot build / Candidate release</strong>
              </div>
              <span className="hero-clear-pill">CLEAR</span>
            </div>
            <div className="hero-build-route" aria-hidden="true">
              <span className="route-node route-node-start" />
              <span className="route-line route-line-one" />
              <span className="route-node route-node-mid" />
              <span className="route-line route-line-two" />
              <span className="route-node route-node-end" />
            </div>
            <div className="hero-build-footer">
              <span>Site target</span>
              <span>Evaluator version · expiry checked</span>
            </div>
          </div>
          <div className="hero-flow-list">
            <div className="hero-flow-row is-complete">
              <span className="hero-flow-icon" aria-hidden="true">
                ✓
              </span>
              <span>Confidential evaluation complete</span>
              <strong>CLEAR</strong>
            </div>
            <div className="hero-flow-row is-current">
              <span className="hero-flow-icon" aria-hidden="true">
                2
              </span>
              <span>Human release review</span>
              <strong>WAITING</strong>
            </div>
            <div className="hero-flow-row is-muted">
              <span className="hero-flow-icon" aria-hidden="true">
                3
              </span>
              <span>Robot activation</span>
              <strong>NOT STARTED</strong>
            </div>
          </div>
          <div className="hero-privacy-note">
            <span className="privacy-lock" aria-hidden="true">
              ◇
            </span>
            Private site rules stay inside the evaluation boundary.
          </div>
        </div>
      </section>

      <section className="landing-proof-strip" aria-label="Product principles">
        <div>
          <span className="proof-number">01</span>
          <strong>Exact-build binding</strong>
          <span>A clearance cannot be reused for a changed artifact.</span>
        </div>
        <div>
          <span className="proof-number">02</span>
          <strong>Private evaluation</strong>
          <span>Rules and restricted geometry are never sent to the browser.</span>
        </div>
        <div>
          <span className="proof-number">03</span>
          <strong>Human release gate</strong>
          <span>Automation prepares the release; a person approves the exact intent.</span>
        </div>
      </section>

      <section className="landing-section" id="how-it-works" aria-labelledby="how-title">
        <div className="landing-section-heading">
          <p className="landing-eyebrow">A clear path to release</p>
          <h2 id="how-title">Safety evidence before a button can ship.</h2>
          <p>
            Rovaulta keeps the operational question in focus: did this build pass this site&apos;s
            rules, and has the right person approved this exact release?
          </p>
        </div>
        <div className="landing-step-grid">
          {steps.map((step) => (
            <article className="landing-step-card" key={step.number}>
              <span className="step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section
        className="landing-boundary-section"
        id="boundaries"
        aria-labelledby="boundary-title"
      >
        <div>
          <p className="landing-eyebrow">Designed to fail closed</p>
          <h2 id="boundary-title">Useful automation. Clear limits.</h2>
        </div>
        <div className="boundary-copy">
          <p>
            Rovaulta can explain a result, prepare a release, and show the evidence behind it. It
            cannot see the private safety envelope, turn a hold into a clear, or sign on behalf of
            an operator.
          </p>
          <Link href="/app/evidence" className="text-link">
            See the evidence boundaries <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="brand-lockup brand-lockup-footer">
          <span className="brand-mark" aria-hidden="true">
            P
          </span>
          <span>
            <strong>Rovaulta</strong>
            <small>Confidential deployment gate</small>
          </span>
        </div>
        <Link href="/start">Start a workspace →</Link>
      </footer>
    </main>
  );
}
