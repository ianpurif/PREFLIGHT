import { createDemoPublicData } from "../../demo-data";
import { ProductApp } from "../../product-app";
import { SetupView } from "../../workspace-views";

export const metadata = {
  title: "Site & robot — Preflight",
  description: "Set the public target context for a Preflight release review.",
};

export default function SetupPage() {
  return (
    <ProductApp demo={createDemoPublicData()} initialView="setup">
      <SetupView />
    </ProductApp>
  );
}
