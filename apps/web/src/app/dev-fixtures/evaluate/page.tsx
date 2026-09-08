import { createDemoPublicData } from "../../demo-data";
import { JudgeDashboard } from "../../judge-dashboard";

export const metadata = {
  title: "Deterministic fixture — Preflight",
  description: "Development-only P7 regression fixture.",
};

export default function DevelopmentEvaluatePage() {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.PREFLIGHT_ENABLE_DEMO_ROUTES !== "true"
  ) {
    return (
      <main className="fixture-disabled" id="main-content">
        <h1>Development fixture disabled</h1>
        <p>This route is not part of the normal account workspace.</p>
      </main>
    );
  }
  const demo = createDemoPublicData();
  return (
    <main className="fixture-shell" id="main-content">
      <p className="fixture-label">Development / regression fixture</p>
      <JudgeDashboard demo={demo} />
    </main>
  );
}
