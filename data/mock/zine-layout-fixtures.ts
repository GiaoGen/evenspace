import type { ZineLayoutRepository } from "@/data/contracts/zine-layout-repository";
import {
  parseZineLayoutDocument,
  type ZineGridFrame,
  type ZineLayoutDocument,
  type ZinePage,
  type ZineTextSource,
} from "@/features/zine/model/layout-document";
import {
  getZineTemplateManifest,
  type ZinePageFamily,
  type ZineStyle,
} from "@/features/zine/model/template-manifest";

const SAMPLE_IMAGES = [
  { src: "/board-backgrounds/herbarium.webp", width: 1600, height: 1200, alt: "Leaves and light after the rain" },
  { src: "/board-backgrounds/clover.webp", width: 1200, height: 1600, alt: "A quiet green detail from the walk" },
  { src: "/board-backgrounds/bluebell.webp", width: 1600, height: 1067, alt: "Blue flowers in the evening light" },
] as const;

const PROOFS = [
  { id: "quiet-1", style: "quiet-field", count: 1 },
  { id: "quiet-3", style: "quiet-field", count: 3 },
  { id: "quiet-10", style: "quiet-field", count: 10 },
  { id: "quiet-48", style: "quiet-field", count: 48 },
  { id: "sequence-1", style: "living-sequence", count: 1 },
  { id: "sequence-3", style: "living-sequence", count: 3 },
  { id: "sequence-10", style: "living-sequence", count: 10 },
  { id: "sequence-48", style: "living-sequence", count: 48 },
] as const satisfies ReadonlyArray<{ id: string; style: ZineStyle; count: number }>;

const CHAPTER_TITLES = ["After the rain", "Along the river", "The long table", "Last light"] as const;
const GROUP_PATTERNS: Record<ZineStyle, readonly number[]> = {
  "quiet-field": [1, 2, 1, 3, 1, 2],
  "living-sequence": [1, 3, 2, 5, 1],
};

type MutableFixture = {
  readonly pages: ZinePage[];
  readonly texts: ZineTextSource[];
};

type CompositionPage = Extract<ZinePage, { readonly kind: "composition" }>;

function sideForIndex(index: number): "left" | "right" {
  return index % 2 === 0 ? "left" : "right";
}

function quietSingleFrame(side: "left" | "right"): ZineGridFrame {
  return side === "left"
    ? { column: 4, row: 3, columnSpan: 7, rowSpan: 9 }
    : { column: 2, row: 3, columnSpan: 7, rowSpan: 9 };
}

function outerAnnotationFrame(
  style: ZineStyle,
  side: "left" | "right",
  corner: "outer-top" | "outer-bottom",
): ZineGridFrame {
  if (side === "left") return { column: 1, row: corner === "outer-top" ? 3 : 10, columnSpan: 2, rowSpan: 3 };
  return style === "quiet-field"
    ? { column: 10, row: corner === "outer-top" ? 3 : 9, columnSpan: 3, rowSpan: 3 }
    : { column: 11, row: corner === "outer-top" ? 2 : 11, columnSpan: 2, rowSpan: 3 };
}

function quietFrames(side: "left" | "right", count: number): readonly ZineGridFrame[] {
  if (count === 1) return [quietSingleFrame(side)];
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

function sequenceFrames(side: "left" | "right", count: number): readonly ZineGridFrame[] {
  if (count === 1) {
    return [side === "left"
      ? { column: 4, row: 2, columnSpan: 9, rowSpan: 13 }
      : { column: 1, row: 2, columnSpan: 9, rowSpan: 13 }];
  }
  if (count === 2) {
    return side === "left"
      ? [
        { column: 2, row: 2, columnSpan: 10, rowSpan: 8 },
        { column: 5, row: 11, columnSpan: 7, rowSpan: 5 },
      ]
      : [
        { column: 1, row: 2, columnSpan: 10, rowSpan: 8 },
        { column: 1, row: 11, columnSpan: 7, rowSpan: 5 },
      ];
  }
  if (count === 3) {
    return side === "left"
      ? [
        { column: 1, row: 1, columnSpan: 8, rowSpan: 7 },
        { column: 7, row: 9, columnSpan: 6, rowSpan: 4 },
        { column: 1, row: 11, columnSpan: 4, rowSpan: 5 },
      ]
      : [
        { column: 5, row: 1, columnSpan: 8, rowSpan: 7 },
        { column: 1, row: 9, columnSpan: 6, rowSpan: 4 },
        { column: 9, row: 11, columnSpan: 4, rowSpan: 5 },
      ];
  }
  if (count === 4) {
    return side === "left"
      ? [
        { column: 1, row: 1, columnSpan: 7, rowSpan: 7 },
        { column: 9, row: 1, columnSpan: 4, rowSpan: 5 },
        { column: 1, row: 9, columnSpan: 4, rowSpan: 7 },
        { column: 6, row: 8, columnSpan: 7, rowSpan: 8 },
      ]
      : [
        { column: 6, row: 1, columnSpan: 7, rowSpan: 7 },
        { column: 1, row: 1, columnSpan: 4, rowSpan: 5 },
        { column: 9, row: 9, columnSpan: 4, rowSpan: 7 },
        { column: 1, row: 8, columnSpan: 7, rowSpan: 8 },
      ];
  }
  return side === "left"
    ? [
      { column: 1, row: 1, columnSpan: 7, rowSpan: 6 },
      { column: 9, row: 1, columnSpan: 4, rowSpan: 6 },
      { column: 1, row: 8, columnSpan: 4, rowSpan: 4 },
      { column: 6, row: 8, columnSpan: 7, rowSpan: 4 },
      { column: 2, row: 13, columnSpan: 10, rowSpan: 4 },
    ]
    : [
      { column: 6, row: 1, columnSpan: 7, rowSpan: 6 },
      { column: 1, row: 1, columnSpan: 4, rowSpan: 6 },
      { column: 9, row: 8, columnSpan: 4, rowSpan: 4 },
      { column: 1, row: 8, columnSpan: 7, rowSpan: 4 },
      { column: 2, row: 13, columnSpan: 10, rowSpan: 4 },
    ];
}

function familyFor(style: ZineStyle, photoCount: number, folio: number): ZinePageFamily {
  if (style === "quiet-field") {
    if (photoCount === 1) return folio % 5 === 0 ? "quiet-pause" : "quiet-single";
    if (photoCount === 2) return "quiet-dialogue";
    return "quiet-rhythm";
  }
  if (photoCount === 1) return "sequence-hero";
  if (photoCount === 2) return folio % 3 === 0 ? "sequence-detail" : "sequence-dialogue";
  if (photoCount === 3 && folio % 4 !== 0) return "sequence-establishing";
  return "sequence-contact";
}

function appendCompositionPage(
  fixture: MutableFixture,
  style: ZineStyle,
  photoIds: readonly string[],
  chapterId: string,
  folio: number,
) {
  const side = sideForIndex(fixture.pages.length);
  const family = familyFor(style, photoIds.length, folio);
  const frames = style === "quiet-field" ? quietFrames(side, photoIds.length) : sequenceFrames(side, photoIds.length);
  const annotations: CompositionPage["annotations"][number][] = [];

  if (photoIds.length === 1 && folio % 3 !== 0) {
    const photoId = photoIds[0];
    const kind = fixture.texts.length % 2 === 0 ? "comment" : "reflection";
    const textId = `text_${photoId}`;
    const corner = folio % 4 === 0 ? "outer-bottom" : "outer-top";
    fixture.texts.push(kind === "comment"
      ? { id: textId, photoId, kind, body: "The air felt newly made, and nobody wanted to be the first to leave.", authorName: "Maya Lin" }
      : { id: textId, photoId, kind, body: "We stayed until the last reflection disappeared from the water." });
    annotations.push({ textId, frame: outerAnnotationFrame(style, side, corner), corner });
  }

  fixture.pages.push({
    id: `page_${String(folio).padStart(3, "0")}`,
    kind: "composition",
    chapterId,
    family,
    folio,
    placements: photoIds.map((photoId, index) => ({
      photoId,
      frame: frames[index],
      fit: family === "sequence-hero" || family === "sequence-contact"
        ? "cover"
        : index === 0 && photoIds.length > 1 ? "cover" : "contain",
      focalPoint: { x: index % 2 === 0 ? 0.48 : 0.56, y: 0.5 },
      tone: index === photoIds.length - 1 && photoIds.length > 1 ? "muted" : "natural",
    })),
    annotations,
  });
}

function createFixture(style: ZineStyle, photoCount: number): ZineLayoutDocument {
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
  const pattern = GROUP_PATTERNS[style];
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
      const requestedSize = pattern[patternIndex % pattern.length];
      const size = Math.min(requestedSize, chapterEnd - photoIndex);
      const photoIds = photos.slice(photoIndex, photoIndex + size).map((photo) => photo.id);
      appendCompositionPage(fixture, style, photoIds, chapter.id, folio);
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
  const manifest = getZineTemplateManifest(style);
  const triptych = style === "living-sequence" && photoCount >= 3;

  return parseZineLayoutDocument({
    version: "1",
    id: `${style.replace("-", "_")}_${photoCount}`,
    title: "After the rain",
    createdAt: "2026-08-03T12:00:00+08:00",
    style,
    templateVersion: manifest.id,
    pageRatio: manifest.pageRatio,
    photos,
    texts: fixture.texts,
    chapters,
    cover: {
      id: "cover_front",
      kind: "cover",
      composition: style === "quiet-field"
        ? photoCount === 1 ? "quiet-near-full" : "quiet-inset"
        : triptych ? "sequence-triptych" : "sequence-hero",
      placements: triptych
        ? [
          { photoId: photos[0].id, frame: { column: 1, row: 1, columnSpan: 8, rowSpan: 10 }, fit: "cover", focalPoint: { x: 0.5, y: 0.5 }, tone: "natural" },
          { photoId: photos[1].id, frame: { column: 9, row: 1, columnSpan: 4, rowSpan: 5 }, fit: "cover", focalPoint: { x: 0.5, y: 0.5 }, tone: "muted" },
          { photoId: photos[2].id, frame: { column: 7, row: 12, columnSpan: 6, rowSpan: 5 }, fit: "cover", focalPoint: { x: 0.5, y: 0.5 }, tone: "natural" },
        ]
        : [{
          photoId: firstPhotoId,
          frame: style === "living-sequence" || photoCount === 1
            ? { column: 1, row: 1, columnSpan: 12, rowSpan: style === "living-sequence" ? 16 : 15 }
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

const fixtureCache = new Map<string, ZineLayoutDocument>();

function getFixture(style: ZineStyle, photoCount: number) {
  const key = `${style}:${photoCount}`;
  const cached = fixtureCache.get(key);
  if (cached) return cached;
  const fixture = createFixture(style, photoCount);
  fixtureCache.set(key, fixture);
  return fixture;
}

export const zineFixtureRepository: ZineLayoutRepository = {
  async getLayoutById(id) {
    if (id === "error") throw new Error("The fixture repository could not load this proof.");
    const proof = PROOFS.find((candidate) => candidate.id === id);
    return proof ? getFixture(proof.style, proof.count) : null;
  },
};

export const zineFixtureIds = PROOFS.map((proof) => proof.id);
