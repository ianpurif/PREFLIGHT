import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Builds — Rovaulta",
  description: "Choose an exact robot build for evaluation.",
};

export default function BuildsPage() {
  return <ProductApp initialView="builds" />;
}
