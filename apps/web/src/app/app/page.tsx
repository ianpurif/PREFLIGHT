import { createDemoPublicData } from "../demo-data";
import { ProductApp } from "../product-app";

export const metadata = {
  title: "Workspace — Preflight",
  description: "Preflight deployment review workspace.",
};

export default function AppPage() {
  return <ProductApp demo={createDemoPublicData()} initialView="overview" />;
}
