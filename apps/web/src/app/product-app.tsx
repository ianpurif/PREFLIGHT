"use client";

import { RealProductApp, type ProductView } from "./real-workspace";

export type { ProductView } from "./real-workspace";

export function ProductApp({ initialView }: { readonly initialView: ProductView }) {
  return <RealProductApp initialView={initialView} />;
}
