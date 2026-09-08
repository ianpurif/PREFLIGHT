import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Evidence — Preflight",
  description: "Review Preflight's public technical evidence and trust boundaries.",
};

export default function EvidencePage() {
  return <ProductApp initialView="evidence" />;
}
