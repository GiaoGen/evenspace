import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TypographySpecimenGate } from "@/features/zine/components/typography-specimen-gate";

export const metadata: Metadata = {
  title: "Zine Typography Specimen Gate",
  description: "Development-only Phase F3-T2 S1/S2 typography reality matrix.",
};

export default function TypographySpecimenPage() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <TypographySpecimenGate />;
}
