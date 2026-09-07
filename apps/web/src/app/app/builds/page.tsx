import { createDemoPublicData } from "../../demo-data";
import { ProductApp } from "../../product-app";
import { BuildsView } from "../../workspace-views";

export const metadata = {
  title: "Builds — Preflight",
  description: "Choose an exact robot build for evaluation.",
};

export default function BuildsPage() {
  const demo = createDemoPublicData();
  return (
    <ProductApp demo={demo} initialView="builds">
      <BuildsView demo={demo} />
    </ProductApp>
  );
}
