import { Suspense } from "react";
import { AccountEntry } from "../onboarding-flow";

export const metadata = {
  title: "Sign in — Rovaulta",
  description: "Sign in to your Rovaulta deployment workspace.",
};

export default function SignInPage() {
  return (
    <Suspense fallback={<AccountEntryLoading />}>
      <AccountEntry initialMode="sign-in" />
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
