import { createDemoPublicData } from "../../demo-data";
import { JudgeDashboard } from "../../judge-dashboard";
import { ProductApp } from "../../product-app";

type SearchParams = Promise<{ build?: string | string[] | undefined }>;

export const metadata = {
  title: "Evaluate a build — Preflight",
  description: "Review a robot build against the deterministic site evaluation.",
};

export default async function EvaluatePage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const rawBuild = Array.isArray(params.build) ? params.build[0] : params.build;
  const initialSelection = rawBuild === "corrected" ? "corrected" : "unsafe";
  const demo = createDemoPublicData();
  return (
    <ProductApp demo={demo} initialView="evaluate">
      <JudgeDashboard demo={demo} initialSelection={initialSelection} />
    </ProductApp>
  );
}
