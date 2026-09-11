import Image from "next/image";
import Link from "next/link";
import styles from "./landing-page.module.css";

const stages = [
  {
    number: "01",
    title: "Declare the target",
    body: "Bind a site, robot, and software build to one release request.",
  },
  {
    number: "02",
    title: "Evaluate in private",
    body: "Run the declared behavior against the facility's confidential envelope.",
  },
  {
    number: "03",
    title: "Inspect the result",
    body: "Review the public evidence without exposing restricted rules or geometry.",
  },
  {
    number: "04",
    title: "Approve on device",
    body: "A human confirms the exact release intent on Ledger before the gate opens.",
  },
] as const;

const boundarySignals = [
  {
    number: "01",
    title: "Exact-build binding",
    body: "A changed artifact cannot inherit an earlier clearance.",
  },
  {
    number: "02",
    title: "Private evaluation",
    body: "Private site rules stay inside the evaluation boundary.",
  },
  {
    number: "03",
    title: "Human release gate",
    body: "Automation prepares; the operator approves the final intent.",
  },
] as const;

export function LandingPage() {
  return (
    <main className={styles.page} id="main-content">
      <div className={styles.gridField} aria-hidden="true" />
      <div className={styles.topRule} aria-hidden="true" />

      <header className={styles.nav}>
        <Link className={styles.brand} href="/" aria-label="Rovaulta home">
          <span className={styles.brandIdentity}>
            <Image
              className={styles.wordmark}
              src="/brand/rovaulta-wordmark.png"
              alt=""
              width={150}
              height={30}
            />
            <span className={styles.brandDescriptor}>Release control for robots</span>
          </span>
        </Link>

        <nav className={styles.navLinks} aria-label="Primary navigation">
          <a href="#how-it-works">Workflow</a>
          <a href="#boundaries">Boundaries</a>
          <Link href="/app/evidence">Technical evidence</Link>
        </nav>

        <Link className={`${styles.button} ${styles.navAction}`} href="/start">
          Get started <span aria-hidden="true">↗</span>
        </Link>
      </header>

      <section className={styles.hero} aria-labelledby="landing-title">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>
            <span className={styles.eyebrowMark} aria-hidden="true" />
            Robot software release control / 01
          </p>
          <h1 id="landing-title">
            Release the build
            <span className={styles.heroTitleAccent}> you actually evaluated.</span>
          </h1>
          <p className={styles.lede}>
            Rovaulta verifies an exact robot build against a site's private evaluation envelope,
            then keeps a human in control of the release decision.
          </p>
          <div className={styles.actions}>
            <Link className={`${styles.button} ${styles.primaryAction}`} href="/start">
              Open the operator console <span aria-hidden="true">→</span>
            </Link>
            <a className={`${styles.button} ${styles.secondaryAction}`} href="#how-it-works">
              See the workflow <span aria-hidden="true">↓</span>
            </a>
          </div>
        </div>

        <section
          className={styles.heroVisual}
          aria-labelledby="review-title"
          aria-describedby="review-summary"
        >
          <div className={styles.visualHeader}>
            <span>Illustrative release review</span>
            <span className={styles.visualStatus}>
              <i aria-hidden="true" />
              CONTROL PLANE / READY
            </span>
          </div>

          <div className={styles.visualBody}>
            <div className={styles.visualIntro}>
              <span className={styles.visualKicker} id="review-title">
                Release request
              </span>
              <span className={styles.visualMeta}>PUBLIC PROJECTION · NOT A LIVE CLEARANCE</span>
            </div>

            <p className={styles.srOnly} id="review-summary">
              Public projection for the exact warehouse-nav candidate-17 build. The site commitment
              is bound and the current boundary is human approval required. Status: hold. This is
              not a live clearance.
            </p>

            <div className={styles.buildIdentity}>
              <div>
                <span className={styles.fieldLabel}>Exact build</span>
                <strong>warehouse-nav / candidate-17</strong>
              </div>
              <code>build_7F2A…19C4</code>
            </div>

            <div className={styles.route}>
              <div className={styles.routeStep}>
                <span className={`${styles.routeMarker} ${styles.routeMarkerDone}`}>✓</span>
                <span>Declared</span>
              </div>
              <span className={styles.routeLine} />
              <div className={styles.routeStep}>
                <span className={`${styles.routeMarker} ${styles.routeMarkerDone}`}>✓</span>
                <span>Evaluated</span>
              </div>
              <span className={`${styles.routeLine} ${styles.routeLinePending}`} />
              <div className={styles.routeStep}>
                <span className={`${styles.routeMarker} ${styles.routeMarkerCurrent}`}>03</span>
                <span>Approved</span>
              </div>
            </div>

            <div className={styles.gateFrame}>
              <div className={styles.gateSignal} aria-hidden="true">
                <span className={styles.gateSignalDot} />
              </div>
              <div className={styles.gateCopy}>
                <span className={styles.fieldLabel}>Current boundary</span>
                <strong>Human approval required</strong>
                <small>The exact intent is reviewed on Ledger hardware.</small>
              </div>
              <span className={styles.gateTag}>HOLD</span>
            </div>

            <dl className={styles.visualFacts}>
              <div>
                <dt>Site commitment</dt>
                <dd>bound</dd>
              </div>
              <div>
                <dt>Evaluator</dt>
                <dd>warehouse-rules-v1</dd>
              </div>
              <div>
                <dt>Next action</dt>
                <dd>operator review</dd>
              </div>
            </dl>
          </div>
        </section>
      </section>

      <section className={styles.signalStrip} aria-label="Rovaulta product boundaries">
        {boundarySignals.map((signal) => (
          <div className={styles.signal} key={signal.number}>
            <span className={styles.signalNumber}>{signal.number}</span>
            <div>
              <strong>{signal.title}</strong>
              <p>{signal.body}</p>
            </div>
          </div>
        ))}
      </section>

      <section className={styles.section} id="how-it-works" aria-labelledby="how-title">
        <div className={styles.sectionHeading}>
          <p className={styles.eyebrow}>A controlled path to release</p>
          <h2 id="how-title">Evidence first. Authorization last.</h2>
          <p>
            The workflow is intentionally linear: establish the exact target, evaluate it inside the
            right boundary, and stop for human confirmation before release.
          </p>
        </div>

        <div className={styles.stageList}>
          {stages.map((stage) => (
            <article className={styles.stage} key={stage.number}>
              <span className={styles.stageNumber}>{stage.number}</span>
              <div>
                <h3>{stage.title}</h3>
                <p>{stage.body}</p>
              </div>
              <span className={styles.stageArrow} aria-hidden="true">
                ↗
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.boundarySection} id="boundaries" aria-labelledby="boundary-title">
        <div>
          <p className={styles.eyebrow}>Designed to fail closed</p>
          <h2 id="boundary-title">Useful automation. Clear limits.</h2>
        </div>
        <div className={styles.boundaryCopy}>
          <p>
            Rovaulta can explain a public result and prepare an exact release request. It cannot see
            a facility's private rules, turn a hold into a clear, or sign on behalf of an operator.
          </p>
          <Link className={styles.textLink} href="/app/evidence">
            Read the evidence boundaries <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerBrand}>
          <Image
            className={styles.footerMark}
            src="/brand/rovaulta-mark.png"
            alt=""
            width={24}
            height={28}
          />
          <span className={styles.brandText}>
            <strong>Rovaulta</strong>
            <small>Confidential deployment gate</small>
          </span>
        </div>
        <span className={styles.footerTagline}>
          Exact build · private evaluation · human approval
        </span>
        <Link href="/start">Start a workspace →</Link>
      </footer>
    </main>
  );
}
