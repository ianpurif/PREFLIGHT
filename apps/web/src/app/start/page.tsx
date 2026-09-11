import { Suspense } from "react";
import { OnboardingFlow, StartAccountEntryLoading } from "../onboarding-flow";

export const metadata = {
  title: "Get started — Rovaulta",
  description: "Set up a Rovaulta deployment review workspace.",
};

export default function StartPage() {
  return (
    <Suspense fallback={<StartAccountEntryLoading />}>
      <OnboardingFlow />
    </Suspense>
  );
}
