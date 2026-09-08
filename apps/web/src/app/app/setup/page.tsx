import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Site & robot — Preflight",
  description: "Set the public target context for a Preflight release review.",
};

export default function SetupPage() {
  return <ProductApp initialView="setup" />;
}
