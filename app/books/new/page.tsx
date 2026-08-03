import type { Metadata } from "next";

import { BookStart } from "@/features/zine/components/book-start";

export const metadata: Metadata = { title: "Create a book" };

export default function NewBookPage() {
  return <BookStart />;
}
