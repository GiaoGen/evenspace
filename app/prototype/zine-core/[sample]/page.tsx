import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { zineFixtureRepository } from "@/data/mock/zine-layout-fixtures";
import { ZineReaderScene } from "@/features/zine/components/zine-reader-scene";

export const metadata: Metadata = {
  title: "Zine Core Proof",
  description: "Deterministic Quiet Field and Living Sequence renderer proof for EventSpace.",
};

export default async function ZineCoreSamplePage({
  params,
}: {
  readonly params: Promise<{ readonly sample: string }>;
}) {
  const { sample } = await params;
  const document = await zineFixtureRepository.getLayoutById(sample);
  if (!document) notFound();
  return <ZineReaderScene document={document} />;
}
