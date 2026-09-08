import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Site & robot — Rovaulta",
  description: "Set the public target context for a Rovaulta release review.",
};

export default function SetupPage() {
  return <ProductApp initialView="setup" />;
}
