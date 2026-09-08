import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Releases — Preflight",
  description: "Prepare an exact release and hand it to a human approval gate.",
};

export default function ReleasesPage() {
  return <ProductApp initialView="releases" />;
}
