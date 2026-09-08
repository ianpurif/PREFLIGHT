import { ProductApp } from "../product-app";

export const metadata = {
  title: "Workspace — Rovaulta",
  description: "Rovaulta deployment review workspace.",
};

export default function AppPage() {
  return <ProductApp initialView="overview" />;
}
