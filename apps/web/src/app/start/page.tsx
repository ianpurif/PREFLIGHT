import { Suspense } from "react";
import { OnboardingFlow } from "../onboarding-flow";

export const metadata = {
  title: "Get started — Rovaulta",
  description: "Set up a Rovaulta deployment review workspace.",
};

export default function StartPage() {
  return (
    <Suspense fallback={<AccountEntryLoading />}>
      <OnboardingFlow />
    </Suspense>
  );
}

function AccountEntryLoading() {
  return (
    <main className="product-loading" id="main-content">
      <div className="real-loading-card">
        <h1>Loading account entry</h1>
        <p>Preparing your secure workspace session.</p>
      </div>
    </main>
  );
}
