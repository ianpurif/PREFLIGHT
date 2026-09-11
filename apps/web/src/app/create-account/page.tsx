import Image from "next/image";
import { Suspense } from "react";
import { AccountEntry } from "../onboarding-flow";

export const metadata = {
  title: "Create account — Rovaulta",
  description: "Create a Rovaulta deployment workspace.",
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
        <Image
          className="brand-wordmark-image"
          src="/brand/rovaulta-wordmark.png"
          alt="Rovaulta"
          width={150}
          height={30}
        />
        <h1>Loading account entry</h1>
        <p>Preparing your secure workspace session.</p>
      </div>
    </main>
  );
}
