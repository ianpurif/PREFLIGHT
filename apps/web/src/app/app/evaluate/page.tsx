import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Evaluate a build — Rovaulta",
  description: "Review a robot build against the deterministic site evaluation.",
};

export default function EvaluatePage() {
  return <ProductApp initialView="evaluate" />;
}
