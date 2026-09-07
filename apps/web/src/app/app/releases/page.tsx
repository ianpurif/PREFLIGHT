import { createDemoPublicData } from "../../demo-data";
import { ProductApp } from "../../product-app";
import { ReleaseView } from "../../release-view";

export const metadata = {
  title: "Releases — Preflight",
  description: "Prepare an exact release and hand it to a human approval gate.",
};

export default function ReleasesPage() {
  const demo = createDemoPublicData();
  return (
    <ProductApp demo={demo} initialView="releases">
      <ReleaseView demo={demo} />
    </ProductApp>
  );
}
