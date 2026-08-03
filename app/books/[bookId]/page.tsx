import { notFound } from "next/navigation";

import { getPublishedZineLayout, getZineStudio } from "@/data/supabase/zine-studio-repository";
import { BookStudio } from "@/features/zine/components/book-studio";
import { ZineReaderScene } from "@/features/zine/components/zine-reader-scene";

export default async function BookPage({ params }: { readonly params: Promise<{ readonly bookId: string }> }) {
  const { bookId } = await params;
  const published = await getPublishedZineLayout(bookId);
  if (published) return <ZineReaderScene document={published} />;
  const studio = await getZineStudio(bookId);
  if (!studio) notFound();
  return <BookStudio studio={studio} />;
}
