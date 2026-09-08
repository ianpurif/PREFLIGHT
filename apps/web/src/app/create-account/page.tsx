import { Suspense } from "react";
import { AccountEntry } from "../onboarding-flow";

export const metadata = {
  title: "Create account — Preflight",
  description: "Create a Preflight deployment workspace.",
};

export default function CreateAccountPage() {
  return (
    <Suspense fallback={<AccountEntryLoading />}>
      <AccountEntry initialMode="register" />
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
