import type { BoardItem, MemoirPaperStyle } from "@/core/domain/room";

export interface MemoirPage {
  readonly id: string;
  readonly items: readonly BoardItem[];
  readonly pageNumber: number;
  readonly kind: "memory" | "opening" | "closing" | "blank";
  readonly paperStyle: MemoirPaperStyle;
}

export interface MemoirSpread {
  readonly id: string;
  readonly left: MemoirPage;
  readonly right: MemoirPage;
}

export interface MemoirDocument {
  readonly title: string;
  readonly pages: readonly MemoirPage[];
  readonly spreads: readonly MemoirSpread[];
}

export function createMemoirDocument(title: string, items: readonly BoardItem[], pageStyles: Readonly<Record<string, MemoirPaperStyle>> = {}, pageCount = 2): MemoirDocument {
  const pagesByNumber = new Map<number, BoardItem[]>();
  items.forEach((item, index) => {
    const pageNumber = item.memoirPage ?? index + 1;
    pagesByNumber.set(pageNumber, [...(pagesByNumber.get(pageNumber) ?? []), item]);
  });
  const styledPages = Object.keys(pageStyles).map(Number).filter((page) => Number.isInteger(page) && page > 0);
  const requestedPageCount = Math.max(2, pageCount, ...pagesByNumber.keys(), ...styledPages);
  const lastPage = requestedPageCount + requestedPageCount % 2;
  const pages = Array.from({ length: lastPage }, (_, index): MemoirPage => {
    const pageNumber = index + 1;
    const pageItems = pagesByNumber.get(pageNumber) ?? [];
    return {
      id: `page-${pageNumber}`,
      items: pageItems,
      pageNumber,
      kind: pageItems.length ? "memory" : items.length === 0 && pageNumber === 1 ? "opening" : "blank",
      paperStyle: pageStyles[String(pageNumber)] ?? "ivory",
    };
  });
  const spreads = Array.from({ length: pages.length / 2 }, (_, index): MemoirSpread => ({
    id: `spread-${index}`,
    left: pages[index * 2],
    right: pages[index * 2 + 1],
  }));

  return { title, pages, spreads };
}

// The editor will produce this document shape; Photos and Book remain read-only consumers.
export interface MemoirEditorDraft {
  readonly roomPublicId: string;
  readonly document: MemoirDocument;
  readonly updatedAt: string;
}
