import {
  countEnglishWords,
  parseZineLayoutDocument,
  type ZineGridFrame,
  type ZineLayoutDocument,
  type ZinePage,
  type ZineTextSource,
} from "./layout-document";
import { getZineTemplateManifest, type ZineStyle } from "./template-manifest";

export interface DeterministicPhotoInput {
  readonly id: string;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly alt: string;
  readonly capturedAt: string | null;
  readonly placeholderDataUrl?: string;
  readonly text?:
    | { readonly kind: "comment"; readonly body: string; readonly authorName: string }
    | { readonly kind: "reflection"; readonly body: string };
}

export interface DeterministicChapterInput {
  readonly id: string;
  readonly title: string;
  readonly timeLabel: string | null;
  readonly photoIds: readonly string[];
}

function truncateWords(value: string, limit: number) {
  const words = value.trim().split(/\s+/u).filter(Boolean);
  return words.length <= limit ? words.join(" ") : `${words.slice(0, limit).join(" ")}…`;
}

function photoFrame(style: ZineStyle, side: "left" | "right"): ZineGridFrame {
  if (style === "quiet-field") {
    return side === "left"
      ? { column: 4, row: 3, columnSpan: 7, rowSpan: 9 }
      : { column: 2, row: 3, columnSpan: 7, rowSpan: 9 };
  }
  return side === "left"
    ? { column: 4, row: 2, columnSpan: 9, rowSpan: 13 }
    : { column: 1, row: 2, columnSpan: 9, rowSpan: 13 };
}

function annotationFrame(style: ZineStyle, side: "left" | "right"): ZineGridFrame {
  if (side === "left") return { column: 1, row: 3, columnSpan: 2, rowSpan: 3 };
  return style === "quiet-field"
    ? { column: 10, row: 3, columnSpan: 3, rowSpan: 3 }
    : { column: 11, row: 2, columnSpan: 2, rowSpan: 3 };
}

function defaultChapters(photos: readonly DeterministicPhotoInput[]): DeterministicChapterInput[] {
  const formatter = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" });
  return Array.from({ length: Math.ceil(photos.length / 12) }, (_, index) => {
    const group = photos.slice(index * 12, (index + 1) * 12);
    const date = group.find((photo) => photo.capturedAt)?.capturedAt ?? null;
    return {
      id: `chapter_${index + 1}`,
      title: index === 0 ? "First light" : index === Math.ceil(photos.length / 12) - 1 ? "Last light" : `Along the way ${index + 1}`,
      timeLabel: date ? formatter.format(new Date(date)) : null,
      photoIds: group.map((photo) => photo.id),
    };
  });
}

export function buildDeterministicZineLayout(input: {
  readonly id: string;
  readonly title: string;
  readonly style: ZineStyle;
  readonly createdAt: string;
  readonly photos: readonly DeterministicPhotoInput[];
  readonly chapters?: readonly DeterministicChapterInput[];
}): ZineLayoutDocument {
  if (!input.photos.length) throw new Error("A deterministic zine needs at least one photo");
  const manifest = getZineTemplateManifest(input.style);
  const chapters = input.chapters?.length ? input.chapters : defaultChapters(input.photos);
  const photoById = new Map(input.photos.map((photo) => [photo.id, photo]));
  const pages: ZinePage[] = [];
  const texts: ZineTextSource[] = [];
  let folio = 1;

  chapters.forEach((chapter) => {
    if (pages.length % 2 === 1) pages.push({ id: `blank_${chapter.id}`, kind: "blank", folio: null });
    pages.push({ id: `page_${chapter.id}`, kind: "chapter", chapterId: chapter.id, folio: null });
    chapter.photoIds.forEach((photoId) => {
      const photo = photoById.get(photoId);
      if (!photo) return;
      const side = pages.length % 2 === 0 ? "left" : "right";
      const textId = `text_${photo.id}`;
      if (photo.text) {
        texts.push(photo.text.kind === "comment"
          ? { id: textId, photoId: photo.id, kind: "comment", body: truncateWords(photo.text.body, 28), authorName: photo.text.authorName }
          : { id: textId, photoId: photo.id, kind: "reflection", body: truncateWords(photo.text.body, 40) });
      }
      pages.push({
        id: `page_${String(folio).padStart(3, "0")}`,
        kind: "composition",
        chapterId: chapter.id,
        family: input.style === "quiet-field"
          ? folio % 2 === 0 ? "quiet-pause" : "quiet-single"
          : folio % 2 === 0 ? "sequence-detail" : "sequence-hero",
        folio,
        placements: [{
          photoId: photo.id,
          frame: photoFrame(input.style, side),
          fit: "cover",
          focalPoint: { x: 0.5, y: 0.5 },
          tone: "natural",
        }],
        annotations: photo.text ? [{ textId, frame: annotationFrame(input.style, side), corner: "outer-top" }] : [],
      });
      folio += 1;
    });
  });

  if (pages.length % 2 === 1) pages.push({ id: "blank_final", kind: "blank", folio: null });
  const first = input.photos[0];
  const document = {
    version: "1" as const,
    id: input.id,
    title: input.title,
    createdAt: input.createdAt,
    style: input.style,
    templateVersion: manifest.id,
    pageRatio: manifest.pageRatio,
    photos: input.photos.map((photo) => ({
      id: photo.id,
      src: photo.src,
      width: photo.width,
      height: photo.height,
      alt: photo.alt,
      capturedAt: photo.capturedAt,
      ...(photo.placeholderDataUrl ? { placeholderDataUrl: photo.placeholderDataUrl } : {}),
    })),
    texts,
    chapters: chapters.map((chapter) => ({ id: chapter.id, title: chapter.title, timeLabel: chapter.timeLabel })),
    cover: {
      id: "cover_front",
      kind: "cover" as const,
      composition: input.style === "quiet-field" ? "quiet-near-full" as const : "sequence-hero" as const,
      placements: [{
        photoId: first.id,
        frame: { column: 1, row: 1, columnSpan: 12, rowSpan: 16 },
        fit: "cover" as const,
        focalPoint: { x: 0.5, y: 0.5 },
        tone: "natural" as const,
      }],
      backgroundSourcePhotoId: first.id,
      cornerMark: null,
    },
    spreads: Array.from({ length: pages.length / 2 }, (_, index) => ({
      id: `spread_${String(index + 1).padStart(2, "0")}`,
      left: pages[index * 2],
      right: pages[index * 2 + 1],
    })),
    backCover: { id: "cover_back", kind: "back-cover" as const, mark: null },
  };

  if (texts.some((text) => countEnglishWords(text.body) > (text.kind === "comment" ? 28 : 40))) {
    throw new Error("Deterministic text exceeded its word budget");
  }
  return parseZineLayoutDocument(document);
}
