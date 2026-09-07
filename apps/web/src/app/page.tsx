import { createDemoPublicData } from "./demo-data";
import { JudgeDashboard } from "./judge-dashboard";

export default function Home() {
  return <JudgeDashboard demo={createDemoPublicData()} />;
}
