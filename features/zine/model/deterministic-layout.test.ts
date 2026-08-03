import { describe, expect, it } from "vitest";

import { buildDeterministicZineLayout } from "./deterministic-layout";

function photos(count: number) {
  return Array.from({ length: count }, (_, index) => ({
    id: `71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    src: `/api/books/zine_12345678901234567890/photos/71000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
    width: index % 2 ? 900 : 1600,
    height: index % 2 ? 1600 : 900,
    alt: `Photograph ${index + 1}`,
    capturedAt: new Date(Date.UTC(2026, 6, 1, 8, index)).toISOString(),
    ...(index === 0 ? { text: { kind: "comment" as const, body: "A small moment at the edge of the afternoon.", authorName: "Ada" } } : {}),
  }));
}

describe("deterministic zine fallback", () => {
  it.each(["quiet-field", "living-sequence"] as const)("builds a valid %s book at the 48-photo boundary", (style) => {
    const layout = buildDeterministicZineLayout({
      id: `fallback_${style.replace("-", "_")}`,
      title: "A private journey",
      style,
      createdAt: "2026-08-03T12:00:00.000Z",
      photos: photos(48),
    });
    expect(layout.photos).toHaveLength(48);
    expect(layout.spreads.flatMap((spread) => [spread.left, spread.right]).filter((page) => page?.kind === "composition")).toHaveLength(48);
    expect(layout.cover.placements.every((placement) => placement.fit === "cover")).toBe(true);
    expect(layout.spreads.flatMap((spread) => [spread.left, spread.right]).flatMap((page) => page?.kind === "composition" ? page.placements : []).every((placement) => placement.fit === "cover")).toBe(true);
  });

  it("keeps the comment attached to the outside corner of its photograph", () => {
    const layout = buildDeterministicZineLayout({ id: "fallback_comment", title: "Words", style: "quiet-field", createdAt: "2026-08-03T12:00:00.000Z", photos: photos(1) });
    const page = layout.spreads.flatMap((spread) => [spread.left, spread.right]).find((candidate) => candidate?.kind === "composition");
    expect(page?.kind).toBe("composition");
    if (page?.kind === "composition") expect(page.annotations).toHaveLength(1);
    expect(layout.texts[0]).toMatchObject({ kind: "comment", authorName: "Ada" });
  });
});
