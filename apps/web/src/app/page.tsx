const boundaries = ["Chainlink CRE", "Ledger DMK", "Foundry", "Deterministic simulation"];

export default function Home() {
  return (
    <main className="shell">
      <p className="eyebrow">PRE-FLIGHT / BOILERPLATE</p>
      <h1>Development harness ready.</h1>
      <p className="lede">
        Product behavior is intentionally not implemented. Start from docs/planning/CURRENT.md.
      </p>
      <div className="grid">
        {boundaries.map((item) => (
          <div className="card" key={item}>
            <span>{item}</span>
            <strong>scaffolded</strong>
          </div>
        ))}
      </div>
    </main>
  );
}
