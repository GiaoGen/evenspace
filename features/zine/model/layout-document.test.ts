import { describe, expect, it } from "vitest";

import { zineFixtureRepository, zineFixtureIds } from "@/data/mock/zine-layout-fixtures";
import {
  countEnglishWords,
  safeParseZineLayoutDocument,
  ZINE_COMMENT_WORD_LIMIT,
  ZINE_MAX_PHOTOS,
  ZINE_REFLECTION_WORD_LIMIT,
  type ZineLayoutDocument,
} from "./layout-document";

async function fixture(id = "quiet-10") {
  const document = await zineFixtureRepository.getLayoutById(id);
  if (!document) throw new Error(`Missing test fixture: ${id}`);
  return document;
}

function replaceFirstText(document: ZineLayoutDocument, body: string): unknown {
  return {
    ...document,
    texts: document.texts.map((text, index) => index === 0 ? { ...text, body } : text),
  };
}

describe("zine layout document v1", () => {
  it("validates the 1, 3, 10, and 48 photo proofs", async () => {
    const documents = await Promise.all(zineFixtureIds.map((id) => zineFixtureRepository.getLayoutById(id)));
    expect(documents.every(Boolean)).toBe(true);
    expect(documents.map((document) => document?.photos.length)).toEqual([1, 3, 10, 48]);
  });

  it("keeps every selected photo exactly once in the book pages", async () => {
    const document = await fixture("quiet-48");
    const uses = document.spreads
      .flatMap((spread) => [spread.left, spread.right])
      .flatMap((page) => page?.kind === "composition" ? page.placements.map((placement) => placement.photoId) : []);
    expect(uses).toHaveLength(ZINE_MAX_PHOTOS);
    expect(new Set(uses).size).toBe(ZINE_MAX_PHOTOS);
    expect(new Set(uses)).toEqual(new Set(document.photos.map((photo) => photo.id)));
  });

  it("rejects a forty-ninth selected photo", async () => {
    const document = await fixture("quiet-48");
    const invalid = {
      ...document,
      photos: [...document.photos, { ...document.photos[0], id: "photo_49" }],
    };
    const result = safeParseZineLayoutDocument(invalid);
    expect(result.success).toBe(false);
  });

  it("enforces separate comment and reflection limits", async () => {
    const document = await fixture();
    const commentResult = safeParseZineLayoutDocument(replaceFirstText(
      document,
      Array.from({ length: ZINE_COMMENT_WORD_LIMIT + 1 }, () => "word").join(" "),
    ));
    expect(commentResult.success).toBe(false);

    const reflection = document.texts.find((text) => text.kind === "reflection");
    if (!reflection) throw new Error("The fixture needs a reflection");
    const reflectionResult = safeParseZineLayoutDocument({
      ...document,
      texts: document.texts.map((text) => text.id === reflection.id
        ? { ...text, body: Array.from({ length: ZINE_REFLECTION_WORD_LIMIT + 1 }, () => "word").join(" ") }
        : text),
    });
    expect(reflectionResult.success).toBe(false);
  });

  it("rejects a cover background that is not on the cover", async () => {
    const document = await fixture();
    const result = safeParseZineLayoutDocument({
      ...document,
      cover: { ...document.cover, backgroundSourcePhotoId: document.photos[1].id },
    });
    expect(result.success).toBe(false);
  });

  it("rejects an annotation that overlaps its photograph", async () => {
    const document = await fixture();
    const result = safeParseZineLayoutDocument({
      ...document,
      spreads: document.spreads.map((spread) => ({
        ...spread,
        right: spread.right?.kind === "composition" && spread.right.annotations.length > 0
          ? {
            ...spread.right,
            annotations: spread.right.annotations.map((annotation, index) => index === 0
              ? { ...annotation, frame: spread.right && spread.right.kind === "composition" ? spread.right.placements[0].frame : annotation.frame }
              : annotation),
          }
          : spread.right,
      })),
    });
    expect(result.success).toBe(false);
  });

  it("counts contractions and hyphenated terms as one English word", () => {
    expect(countEnglishWords("We stayed—quietly. Don't rush the blue-green light.")).toBe(8);
  });
});
