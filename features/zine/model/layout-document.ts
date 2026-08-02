import { z } from "zod";

export const ZINE_LAYOUT_VERSION = "1" as const;
export const ZINE_MAX_PHOTOS = 48;
export const ZINE_COMMENT_WORD_LIMIT = 28;
export const ZINE_REFLECTION_WORD_LIMIT = 40;
export const QUIET_FIELD_GRID_COLUMNS = 12;
export const QUIET_FIELD_GRID_ROWS = 16;

const idSchema = z.string()
  .trim()
  .min(1)
  .max(96)
  .regex(/^[a-z0-9][a-z0-9_-]*$/i, "Use a stable alphanumeric id");

const imageSourceSchema = z.string().trim().min(1).refine((value) => {
  if (value.startsWith("/")) return !value.startsWith("//");
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}, "Image sources must be root-relative or HTTPS URLs");

export const zineGridFrameSchema = z.object({
  column: z.number().int().min(1).max(QUIET_FIELD_GRID_COLUMNS),
  row: z.number().int().min(1).max(QUIET_FIELD_GRID_ROWS),
  columnSpan: z.number().int().min(1).max(QUIET_FIELD_GRID_COLUMNS),
  rowSpan: z.number().int().min(1).max(QUIET_FIELD_GRID_ROWS),
}).strict().superRefine((frame, context) => {
  if (frame.column + frame.columnSpan - 1 > QUIET_FIELD_GRID_COLUMNS) {
    context.addIssue({ code: "custom", path: ["columnSpan"], message: "Frame exceeds the page columns" });
  }
  if (frame.row + frame.rowSpan - 1 > QUIET_FIELD_GRID_ROWS) {
    context.addIssue({ code: "custom", path: ["rowSpan"], message: "Frame exceeds the page rows" });
  }
});

const focalPointSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
}).strict();

const photoSourceSchema = z.object({
  id: idSchema,
  src: imageSourceSchema,
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  alt: z.string().trim().min(1).max(240),
  capturedAt: z.string().datetime({ offset: true }).nullable(),
  placeholderDataUrl: z.string().startsWith("data:image/").optional(),
}).strict();

const textSourceSchema = z.discriminatedUnion("kind", [
  z.object({
    id: idSchema,
    photoId: idSchema,
    kind: z.literal("comment"),
    body: z.string().trim().min(1),
    authorName: z.string().trim().min(1).max(80),
  }).strict(),
  z.object({
    id: idSchema,
    photoId: idSchema,
    kind: z.literal("reflection"),
    body: z.string().trim().min(1),
  }).strict(),
]);

const chapterSchema = z.object({
  id: idSchema,
  title: z.string().trim().min(1).max(48),
  timeLabel: z.string().trim().min(1).max(64).nullable(),
}).strict();

const placementSchema = z.object({
  photoId: idSchema,
  frame: zineGridFrameSchema,
  fit: z.enum(["contain", "cover"]),
  focalPoint: focalPointSchema,
  tone: z.enum(["natural", "muted"]).default("natural"),
}).strict();

const annotationSchema = z.object({
  textId: idSchema,
  frame: zineGridFrameSchema,
  corner: z.enum(["outer-top", "outer-bottom"]),
}).strict();

const compositionPageSchema = z.object({
  id: idSchema,
  kind: z.literal("composition"),
  chapterId: idSchema,
  placements: z.array(placementSchema).min(1).max(5),
  annotations: z.array(annotationSchema).max(5),
  folio: z.number().int().positive().nullable(),
}).strict();

const chapterPageSchema = z.object({
  id: idSchema,
  kind: z.literal("chapter"),
  chapterId: idSchema,
  folio: z.number().int().positive().nullable(),
}).strict();

const blankPageSchema = z.object({
  id: idSchema,
  kind: z.literal("blank"),
  folio: z.null(),
}).strict();

export const zinePageSchema = z.discriminatedUnion("kind", [
  compositionPageSchema,
  chapterPageSchema,
  blankPageSchema,
]);

const coverSchema = z.object({
  id: idSchema,
  kind: z.literal("cover"),
  composition: z.enum(["quiet-inset", "quiet-near-full", "quiet-corner-mark"]),
  placements: z.array(placementSchema).min(1).max(3),
  backgroundSourcePhotoId: idSchema,
  cornerMark: z.string().trim().min(1).max(48).nullable(),
}).strict();

const backCoverSchema = z.object({
  id: idSchema,
  kind: z.literal("back-cover"),
  mark: z.string().trim().min(1).max(48).nullable(),
}).strict();

const spreadSchema = z.object({
  id: idSchema,
  left: zinePageSchema.nullable(),
  right: zinePageSchema.nullable(),
}).strict().refine((spread) => spread.left !== null || spread.right !== null, {
  message: "A spread needs at least one page",
});

function framesOverlap(left: z.infer<typeof zineGridFrameSchema>, right: z.infer<typeof zineGridFrameSchema>) {
  const leftEnd = left.column + left.columnSpan;
  const rightEnd = right.column + right.columnSpan;
  const leftBottom = left.row + left.rowSpan;
  const rightBottom = right.row + right.rowSpan;
  return left.column < rightEnd && right.column < leftEnd && left.row < rightBottom && right.row < leftBottom;
}

function isOuterCorner(
  side: "left" | "right",
  photo: z.infer<typeof zineGridFrameSchema>,
  annotation: z.infer<typeof zineGridFrameSchema>,
) {
  const photoEnd = photo.column + photo.columnSpan;
  const annotationEnd = annotation.column + annotation.columnSpan;
  const horizontalGap = side === "left" ? photo.column - annotationEnd : annotation.column - photoEnd;
  const isOutside = side === "left" ? annotationEnd <= photo.column : annotation.column >= photoEnd;
  const topAligned = Math.abs(annotation.row - photo.row) <= 1;
  const bottomAligned = Math.abs(
    annotation.row + annotation.rowSpan - (photo.row + photo.rowSpan),
  ) <= 1;
  return isOutside && horizontalGap <= 1 && (topAligned || bottomAligned);
}

export function countEnglishWords(value: string) {
  return value.trim().match(/[\p{L}\p{N}]+(?:['’\-][\p{L}\p{N}]+)*/gu)?.length ?? 0;
}

export const zineLayoutDocumentSchema = z.object({
  version: z.literal(ZINE_LAYOUT_VERSION),
  id: idSchema,
  title: z.string().trim().min(1).max(80),
  createdAt: z.string().datetime({ offset: true }),
  style: z.literal("quiet-field"),
  templateVersion: z.string().trim().min(1).max(32),
  pageRatio: z.object({
    width: z.number().int().min(1).max(20),
    height: z.number().int().min(1).max(20),
  }).strict(),
  photos: z.array(photoSourceSchema).min(1).max(ZINE_MAX_PHOTOS),
  texts: z.array(textSourceSchema).max(ZINE_MAX_PHOTOS),
  chapters: z.array(chapterSchema).min(1).max(24),
  cover: coverSchema,
  spreads: z.array(spreadSchema).min(1).max(80),
  backCover: backCoverSchema,
}).strict().superRefine((document, context) => {
  const photos = new Map(document.photos.map((photo) => [photo.id, photo]));
  const texts = new Map(document.texts.map((text) => [text.id, text]));
  const chapters = new Map(document.chapters.map((chapter) => [chapter.id, chapter]));
  const photoUsage = new Map(document.photos.map((photo) => [photo.id, 0]));
  const textUsage = new Map(document.texts.map((text) => [text.id, 0]));
  const pageIds = new Set<string>();

  function reportDuplicateIds<T extends { readonly id: string }>(items: readonly T[], path: string, label: string) {
    const seen = new Set<string>();
    items.forEach((item, index) => {
      if (seen.has(item.id)) context.addIssue({ code: "custom", path: [path, index, "id"], message: `Duplicate ${label} id` });
      seen.add(item.id);
    });
  }

  reportDuplicateIds(document.photos, "photos", "photo");
  reportDuplicateIds(document.texts, "texts", "text");
  reportDuplicateIds(document.chapters, "chapters", "chapter");

  document.texts.forEach((text, index) => {
    if (!photos.has(text.photoId)) {
      context.addIssue({ code: "custom", path: ["texts", index, "photoId"], message: "Text references an unknown photo" });
    }
    const words = countEnglishWords(text.body);
    const limit = text.kind === "comment" ? ZINE_COMMENT_WORD_LIMIT : ZINE_REFLECTION_WORD_LIMIT;
    if (words > limit) {
      context.addIssue({ code: "custom", path: ["texts", index, "body"], message: `${text.kind} exceeds ${limit} words` });
    }
  });

  document.cover.placements.forEach((placement, index) => {
    if (!photos.has(placement.photoId)) {
      context.addIssue({ code: "custom", path: ["cover", "placements", index, "photoId"], message: "Cover references an unknown photo" });
    }
  });
  if (!document.cover.placements.some((placement) => placement.photoId === document.cover.backgroundSourcePhotoId)) {
    context.addIssue({ code: "custom", path: ["cover", "backgroundSourcePhotoId"], message: "Background source must be on the selected cover" });
  }

  document.spreads.forEach((spread, spreadIndex) => {
    (["left", "right"] as const).forEach((side) => {
      const page = spread[side];
      if (!page) return;
      const path = ["spreads", spreadIndex, side] as const;
      if (pageIds.has(page.id)) context.addIssue({ code: "custom", path: [...path, "id"], message: "Duplicate page id" });
      pageIds.add(page.id);
      if (page.kind === "chapter") {
        if (!chapters.has(page.chapterId)) context.addIssue({ code: "custom", path: [...path, "chapterId"], message: "Page references an unknown chapter" });
        return;
      }
      if (page.kind !== "composition") return;
      if (!chapters.has(page.chapterId)) context.addIssue({ code: "custom", path: [...path, "chapterId"], message: "Page references an unknown chapter" });
      const placementByPhoto = new Map<string, z.infer<typeof placementSchema>>();
      page.placements.forEach((placement, placementIndex) => {
        if (!photos.has(placement.photoId)) {
          context.addIssue({ code: "custom", path: [...path, "placements", placementIndex, "photoId"], message: "Page references an unknown photo" });
        }
        if (placementByPhoto.has(placement.photoId)) {
          context.addIssue({ code: "custom", path: [...path, "placements", placementIndex, "photoId"], message: "A photo can appear only once on a page" });
        }
        placementByPhoto.set(placement.photoId, placement);
        photoUsage.set(placement.photoId, (photoUsage.get(placement.photoId) ?? 0) + 1);
        page.placements.slice(0, placementIndex).forEach((previous) => {
          if (framesOverlap(previous.frame, placement.frame)) {
            context.addIssue({ code: "custom", path: [...path, "placements", placementIndex, "frame"], message: "Photo frames cannot overlap" });
          }
        });
      });
      page.annotations.forEach((annotation, annotationIndex) => {
        const text = texts.get(annotation.textId);
        if (!text) {
          context.addIssue({ code: "custom", path: [...path, "annotations", annotationIndex, "textId"], message: "Annotation references unknown text" });
          return;
        }
        const placement = placementByPhoto.get(text.photoId);
        if (!placement) {
          context.addIssue({ code: "custom", path: [...path, "annotations", annotationIndex, "textId"], message: "Annotation text must share a page with its photo" });
          return;
        }
        textUsage.set(text.id, (textUsage.get(text.id) ?? 0) + 1);
        if (!isOuterCorner(side, placement.frame, annotation.frame)) {
          context.addIssue({ code: "custom", path: [...path, "annotations", annotationIndex, "frame"], message: "Annotation must sit at the photo's outer corner" });
        }
        if (page.placements.some((candidate) => framesOverlap(candidate.frame, annotation.frame))) {
          context.addIssue({ code: "custom", path: [...path, "annotations", annotationIndex, "frame"], message: "Annotation cannot overlap a photo" });
        }
      });
    });
  });

  photoUsage.forEach((uses, photoId) => {
    if (uses !== 1) context.addIssue({ code: "custom", path: ["photos"], message: `Photo ${photoId} must appear exactly once in the book pages` });
  });
  textUsage.forEach((uses, textId) => {
    if (uses !== 1) context.addIssue({ code: "custom", path: ["texts"], message: `Text ${textId} must appear exactly once` });
  });
});

export type ZineGridFrame = z.infer<typeof zineGridFrameSchema>;
export type ZinePage = z.infer<typeof zinePageSchema>;
export type ZineLayoutDocument = z.infer<typeof zineLayoutDocumentSchema>;
export type ZinePhotoSource = ZineLayoutDocument["photos"][number];
export type ZineTextSource = ZineLayoutDocument["texts"][number];

export function parseZineLayoutDocument(input: unknown): ZineLayoutDocument {
  return zineLayoutDocumentSchema.parse(input);
}

export function safeParseZineLayoutDocument(input: unknown) {
  return zineLayoutDocumentSchema.safeParse(input);
}
