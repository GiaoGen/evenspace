import { describe, expect, it } from "vitest";
import type { ZineDraft, ZinePhoto } from "./zine-draft";
import { createManualEditorPages, createZineReaderPages, pacePhotosForReader } from "./zine-pages";

function photo(id: string): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    width: 4,
    height: 3,
    caption: "",
    positionX: 50,
    positionY: 50,
  };
}

describe("zine reader pagination", () => {
  it("paces reader photos independently from their Step 2 collection order", () => {
    const photos = [photo("one"), photo("two"), photo("three"), photo("four")];
    expect(pacePhotosForReader(photos).map((item) => item.id)).toEqual([
      "four",
      "one",
      "three",
      "two",
    ]);
  });

  it("keeps the cover and back as single hard pages around complete spreads", () => {
    const draft: ZineDraft = {
      name: "Night notes",
      photos: [photo("one"), photo("two"), photo("three")],
      styleId: "editorial",
      manualSpreads: null,
    };
    const pages = createZineReaderPages(draft);

    expect(pages[0]).toMatchObject({ kind: "cover", density: "hard" });
    expect(pages.at(-1)).toMatchObject({ kind: "back", density: "hard" });
    expect(pages.length % 2).toBe(0);
    expect(pages.some((page) => page.kind === "colophon")).toBe(true);
  });

  it("groups photos according to the selected page layout", () => {
    const draft: ZineDraft = {
      name: "Contact",
      photos: [photo("1"), photo("2"), photo("3"), photo("4"), photo("5")],
      styleId: "contact",
      manualSpreads: null,
    };
    const content = createZineReaderPages(draft).filter((page) => page.kind === "content");

    expect(content).toHaveLength(2);
    expect(content.map((page) => page.photos.length)).toEqual([4, 1]);
  });

  it("shows add pages only in the manual editor", () => {
    const draft: ZineDraft = {
      name: "Manual",
      photos: [photo("one"), photo("two")],
      styleId: "editorial",
      manualSpreads: [
        {
          id: "spread-1",
          left: { id: "page-1", styleId: "editorial", photoIds: ["one"] },
          right: { id: "page-2", styleId: "editorial", photoIds: ["two"] },
        },
        { id: "spread-2", left: null, right: null },
      ],
    };

    expect(createManualEditorPages(draft).filter((page) => page.kind === "add")).toHaveLength(2);
    expect(createZineReaderPages(draft).some((page) => page.kind === "add")).toBe(false);
  });
});
