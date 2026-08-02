import type { ZineLayoutRepository } from "@/data/contracts/zine-layout-repository";
import {
  parseZineLayoutDocument,
  type ZineGridFrame,
  type ZineLayoutDocument,
  type ZinePage,
} from "@/features/zine/model/layout-document";

const SAMPLE_IMAGES = [
  { src: "/board-backgrounds/herbarium.webp", width: 1600, height: 1200, alt: "Leaves and light after the rain" },
  { src: "/board-backgrounds/clover.webp", width: 1200, height: 1600, alt: "A quiet green detail from the walk" },
  { src: "/board-backgrounds/bluebell.webp", width: 1600, height: 1067, alt: "Blue flowers in the evening light" },
] as const;

const SAMPLE_COUNTS = new Map([
  ["quiet-1", 1],
  ["quiet-3", 3],
  ["quiet-10", 10],
  ["quiet-48", 48],
] as const);

const CHAPTER_TITLES = ["After the rain", "Along the river", "The long table", "Last light"] as const;
const GROUP_PATTERN = [1, 2, 1, 3, 1, 2] as const;

type MutableFixture = {
  readonly pages: ZinePage[];
  readonly texts: Array<Record<string, unknown>>;
};

type CompositionPage = Extract<ZinePage, { readonly kind: "composition" }>;

function sideForIndex(index: number): "left" | "right" {
  return index % 2 === 0 ? "left" : "right";
}

function singlePhotoFrame(side: "left" | "right"): ZineGridFrame {
  return side === "left"
    ? { column: 4, row: 3, columnSpan: 7, rowSpan: 9 }
    : { column: 2, row: 3, columnSpan: 7, rowSpan: 9 };
}

function singleAnnotationFrame(side: "left" | "right", corner: "outer-top" | "outer-bottom"): ZineGridFrame {
  if (side === "left") return { column: 1, row: corner === "outer-top" ? 3 : 9, columnSpan: 2, rowSpan: 3 };
  return { column: 10, row: corner === "outer-top" ? 3 : 9, columnSpan: 3, rowSpan: 3 };
}

function groupFrames(side: "left" | "right", count: number): readonly ZineGridFrame[] {
  if (count === 1) return [singlePhotoFrame(side)];
  if (count === 2) {
    return side === "left"
      ? [
        { column: 4, row: 2, columnSpan: 8, rowSpan: 7 },
        { column: 2, row: 11, columnSpan: 5, rowSpan: 5 },
      ]
      : [
        { column: 1, row: 2, columnSpan: 8, rowSpan: 7 },
        { column: 6, row: 11, columnSpan: 6, rowSpan: 5 },
      ];
  }
  return side === "left"
    ? [
      { column: 5, row: 2, columnSpan: 8, rowSpan: 7 },
      { column: 1, row: 10, columnSpan: 4, rowSpan: 5 },
      { column: 7, row: 11, columnSpan: 5, rowSpan: 4 },
    ]
    : [
      { column: 1, row: 2, columnSpan: 8, rowSpan: 7 },
      { column: 9, row: 10, columnSpan: 4, rowSpan: 5 },
      { column: 2, row: 11, columnSpan: 5, rowSpan: 4 },
    ];
}

function appendCompositionPage(
  fixture: MutableFixture,
  photoIds: readonly string[],
  chapterId: string,
  folio: number,
) {
  const side = sideForIndex(fixture.pages.length);
  const frames = groupFrames(side, photoIds.length);
  const annotations: CompositionPage["annotations"][number][] = [];

  if (photoIds.length === 1 && folio % 3 !== 0) {
    const photoId = photoIds[0];
    const kind = fixture.texts.length % 2 === 0 ? "comment" : "reflection";
    const textId = `text_${photoId}`;
    const corner = folio % 4 === 0 ? "outer-bottom" : "outer-top";
    fixture.texts.push(kind === "comment"
      ? { id: textId, photoId, kind, body: "The air felt newly made, and nobody wanted to be the first to leave.", authorName: "Maya Lin" }
      : { id: textId, photoId, kind, body: "We stayed until the last reflection disappeared from the water." });
    annotations.push({ textId, frame: singleAnnotationFrame(side, corner), corner });
  }

  fixture.pages.push({
    id: `page_${String(folio).padStart(3, "0")}`,
    kind: "composition",
    chapterId,
    folio,
    placements: photoIds.map((photoId, index) => ({
      photoId,
      frame: frames[index],
      fit: index === 0 && photoIds.length > 1 ? "cover" : "contain",
      focalPoint: { x: index % 2 === 0 ? 0.48 : 0.56, y: 0.5 },
      tone: index === photoIds.length - 1 && photoIds.length > 1 ? "muted" : "natural",
    })),
    annotations,
  });
}

function createFixture(photoCount: number): ZineLayoutDocument {
  const photos = Array.from({ length: photoCount }, (_, index) => {
    const image = SAMPLE_IMAGES[index % SAMPLE_IMAGES.length];
    return {
      id: `photo_${String(index + 1).padStart(2, "0")}`,
      src: image.src,
      width: image.width,
      height: image.height,
      alt: `${image.alt}, frame ${index + 1}`,
      capturedAt: new Date(Date.UTC(2026, 6, 14, 10, index * 7)).toISOString(),
    };
  });
  const chapterCount = Math.max(1, Math.ceil(photoCount / 12));
  const chapters = Array.from({ length: chapterCount }, (_, index) => ({
    id: `chapter_${index + 1}`,
    title: CHAPTER_TITLES[index] ?? `Chapter ${index + 1}`,
    timeLabel: index === 0 ? "14 July · Taipei" : null,
  }));
  const fixture: MutableFixture = { pages: [], texts: [] };
  let photoIndex = 0;
  let folio = 1;
  let patternIndex = 0;

  chapters.forEach((chapter, chapterIndex) => {
    if (fixture.pages.length % 2 === 1) {
      fixture.pages.push({ id: `blank_before_${chapter.id}`, kind: "blank", folio: null });
    }
    fixture.pages.push({ id: `page_${chapter.id}`, kind: "chapter", chapterId: chapter.id, folio: null });
    const chapterEnd = Math.min(photoCount, (chapterIndex + 1) * 12);
    while (photoIndex < chapterEnd) {
      const requestedSize = GROUP_PATTERN[patternIndex % GROUP_PATTERN.length];
      const size = Math.min(requestedSize, chapterEnd - photoIndex);
      const photoIds = photos.slice(photoIndex, photoIndex + size).map((photo) => photo.id);
      appendCompositionPage(fixture, photoIds, chapter.id, folio);
      photoIndex += size;
      folio += 1;
      patternIndex += 1;
    }
  });

  if (fixture.pages.length % 2 === 1) {
    fixture.pages.push({ id: "blank_final", kind: "blank", folio: null });
  }
  const spreads = Array.from({ length: fixture.pages.length / 2 }, (_, index) => ({
    id: `spread_${String(index + 1).padStart(2, "0")}`,
    left: fixture.pages[index * 2],
    right: fixture.pages[index * 2 + 1],
  }));
  const firstPhotoId = photos[0].id;

  return parseZineLayoutDocument({
    version: "1",
    id: `quiet_${photoCount}`,
    title: "After the rain",
    createdAt: "2026-08-03T12:00:00+08:00",
    style: "quiet-field",
    templateVersion: "quiet-field-v1",
    pageRatio: { width: 3, height: 4 },
    photos,
    texts: fixture.texts,
    chapters,
    cover: {
      id: "cover_front",
      kind: "cover",
      composition: photoCount === 1 ? "quiet-near-full" : "quiet-inset",
      placements: [{
        photoId: firstPhotoId,
        frame: photoCount === 1
          ? { column: 1, row: 1, columnSpan: 12, rowSpan: 15 }
          : { column: 3, row: 3, columnSpan: 8, rowSpan: 11 },
        fit: "cover",
        focalPoint: { x: 0.5, y: 0.5 },
        tone: "natural",
      }],
      backgroundSourcePhotoId: firstPhotoId,
      cornerMark: null,
    },
    spreads,
    backCover: { id: "cover_back", kind: "back-cover", mark: null },
  });
}

const fixtureCache = new Map<number, ZineLayoutDocument>();

function getFixture(photoCount: number) {
  const cached = fixtureCache.get(photoCount);
  if (cached) return cached;
  const fixture = createFixture(photoCount);
  fixtureCache.set(photoCount, fixture);
  return fixture;
}

export const zineFixtureRepository: ZineLayoutRepository = {
  async getLayoutById(id) {
    if (id === "error") throw new Error("The fixture repository could not load this proof.");
    const count = (SAMPLE_COUNTS as ReadonlyMap<string, number>).get(id);
    return count ? getFixture(count) : null;
  },
};

export const zineFixtureIds = [...SAMPLE_COUNTS.keys()];
