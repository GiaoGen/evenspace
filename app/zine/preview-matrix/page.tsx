import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReferenceRecipeGate } from "@/features/zine/components/reference-recipe-gate";

export const metadata: Metadata = {
  title: "Reference Recipe Preview Matrix",
  description: "Development-only visual gate for the zine engine reference Recipes.",
};

export default function ReferenceRecipePreviewMatrixPage() {
  if (process.env.NODE_ENV !== "development") {
    notFound();
  }
  return <ReferenceRecipeGate />;
}
