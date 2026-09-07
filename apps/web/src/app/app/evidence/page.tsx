import { createDemoPublicData } from "../../demo-data";
import { EvidenceView } from "../../evidence-view";
import { ProductApp } from "../../product-app";

export const metadata = {
  title: "Evidence — Preflight",
  description: "Review Preflight's public technical evidence and trust boundaries.",
};

export default function EvidencePage() {
  const demo = createDemoPublicData();
  return (
    <ProductApp demo={demo} initialView="evidence">
      <EvidenceView demo={demo} />
    </ProductApp>
  );
}
