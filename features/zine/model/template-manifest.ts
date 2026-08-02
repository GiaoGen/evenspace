import { z } from "zod";

export const zineStyleSchema = z.enum(["quiet-field", "living-sequence"]);
export const zineCoverCompositionSchema = z.enum([
  "quiet-inset",
  "quiet-near-full",
  "quiet-corner-mark",
  "sequence-hero",
  "sequence-triptych",
  "sequence-corner-mark",
]);
export const zinePageFamilySchema = z.enum([
  "quiet-single",
  "quiet-dialogue",
  "quiet-rhythm",
  "quiet-pause",
  "sequence-hero",
  "sequence-dialogue",
  "sequence-establishing",
  "sequence-contact",
  "sequence-detail",
]);

const coverFamilySchema = z.object({
  id: zineCoverCompositionSchema,
  minPhotos: z.number().int().min(1).max(3),
  maxPhotos: z.number().int().min(1).max(3),
  supportsCornerMark: z.boolean(),
}).strict().refine((family) => family.minPhotos <= family.maxPhotos, {
  message: "Cover family photo range is invalid",
});

const pageFamilySchema = z.object({
  id: zinePageFamilySchema,
  minPhotos: z.number().int().min(1).max(5),
  maxPhotos: z.number().int().min(1).max(5),
  maxAnnotations: z.number().int().min(0).max(5),
  allowedFits: z.array(z.enum(["contain", "cover"])).min(1),
  density: z.enum(["sparse", "balanced", "dense"]),
}).strict().refine((family) => family.minPhotos <= family.maxPhotos, {
  message: "Page family photo range is invalid",
});

export const zineTemplateManifestSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+-v\d+$/),
  version: z.number().int().positive(),
  style: zineStyleSchema,
  label: z.string().trim().min(1).max(48),
  pageRatio: z.object({
    width: z.number().int().min(1).max(20),
    height: z.number().int().min(1).max(20),
  }).strict(),
  grid: z.object({
    columns: z.literal(12),
    rows: z.literal(16),
  }).strict(),
  palette: z.object({
    paper: z.string().regex(/^#[0-9a-f]{6}$/i),
    ink: z.string().regex(/^#[0-9a-f]{6}$/i),
    mutedInk: z.string().regex(/^#[0-9a-f]{6}$/i),
    accent: z.string().regex(/^#[0-9a-f]{6}$/i).nullable(),
  }).strict(),
  coverFamilies: z.array(coverFamilySchema).min(1),
  pageFamilies: z.array(pageFamilySchema).min(1),
  rhythm: z.object({
    maxConsecutiveSameFamily: z.number().int().min(1).max(4),
    maxConsecutiveDensePages: z.number().int().min(1).max(4),
  }).strict(),
  annotation: z.object({
    placement: z.literal("photo-outer-corner"),
    showCommentAuthor: z.literal(true),
    showReflectionAuthor: z.literal(false),
  }).strict(),
}).strict().superRefine((manifest, context) => {
  for (const field of ["coverFamilies", "pageFamilies"] as const) {
    const seen = new Set<string>();
    manifest[field].forEach((family, index) => {
      if (seen.has(family.id)) {
        context.addIssue({ code: "custom", path: [field, index, "id"], message: "Family ids must be unique" });
      }
      seen.add(family.id);
    });
  }
});

export type ZineStyle = z.infer<typeof zineStyleSchema>;
export type ZineCoverComposition = z.infer<typeof zineCoverCompositionSchema>;
export type ZinePageFamily = z.infer<typeof zinePageFamilySchema>;
export type ZineTemplateManifest = z.infer<typeof zineTemplateManifestSchema>;

const manifests = z.array(zineTemplateManifestSchema).length(2).parse([
  {
    id: "quiet-field-v1",
    version: 1,
    style: "quiet-field",
    label: "Quiet Field",
    pageRatio: { width: 3, height: 4 },
    grid: { columns: 12, rows: 16 },
    palette: { paper: "#fffefb", ink: "#171613", mutedInk: "#777168", accent: null },
    coverFamilies: [
      { id: "quiet-inset", minPhotos: 1, maxPhotos: 1, supportsCornerMark: false },
      { id: "quiet-near-full", minPhotos: 1, maxPhotos: 1, supportsCornerMark: false },
      { id: "quiet-corner-mark", minPhotos: 1, maxPhotos: 1, supportsCornerMark: true },
    ],
    pageFamilies: [
      { id: "quiet-single", minPhotos: 1, maxPhotos: 1, maxAnnotations: 1, allowedFits: ["contain", "cover"], density: "sparse" },
      { id: "quiet-dialogue", minPhotos: 2, maxPhotos: 2, maxAnnotations: 1, allowedFits: ["contain", "cover"], density: "balanced" },
      { id: "quiet-rhythm", minPhotos: 3, maxPhotos: 4, maxAnnotations: 0, allowedFits: ["contain", "cover"], density: "balanced" },
      { id: "quiet-pause", minPhotos: 1, maxPhotos: 1, maxAnnotations: 1, allowedFits: ["contain"], density: "sparse" },
    ],
    rhythm: { maxConsecutiveSameFamily: 2, maxConsecutiveDensePages: 1 },
    annotation: { placement: "photo-outer-corner", showCommentAuthor: true, showReflectionAuthor: false },
  },
  {
    id: "living-sequence-v1",
    version: 1,
    style: "living-sequence",
    label: "Living Sequence",
    pageRatio: { width: 3, height: 4 },
    grid: { columns: 12, rows: 16 },
    palette: { paper: "#fffdf8", ink: "#191816", mutedInk: "#69635b", accent: "#9a3f30" },
    coverFamilies: [
      { id: "sequence-hero", minPhotos: 1, maxPhotos: 1, supportsCornerMark: false },
      { id: "sequence-triptych", minPhotos: 3, maxPhotos: 3, supportsCornerMark: false },
      { id: "sequence-corner-mark", minPhotos: 1, maxPhotos: 1, supportsCornerMark: true },
    ],
    pageFamilies: [
      { id: "sequence-hero", minPhotos: 1, maxPhotos: 1, maxAnnotations: 1, allowedFits: ["cover"], density: "sparse" },
      { id: "sequence-dialogue", minPhotos: 2, maxPhotos: 2, maxAnnotations: 1, allowedFits: ["contain", "cover"], density: "balanced" },
      { id: "sequence-establishing", minPhotos: 2, maxPhotos: 3, maxAnnotations: 1, allowedFits: ["contain", "cover"], density: "balanced" },
      { id: "sequence-contact", minPhotos: 3, maxPhotos: 5, maxAnnotations: 0, allowedFits: ["cover"], density: "dense" },
      { id: "sequence-detail", minPhotos: 1, maxPhotos: 2, maxAnnotations: 1, allowedFits: ["contain", "cover"], density: "balanced" },
    ],
    rhythm: { maxConsecutiveSameFamily: 2, maxConsecutiveDensePages: 1 },
    annotation: { placement: "photo-outer-corner", showCommentAuthor: true, showReflectionAuthor: false },
  },
]);

export const zineTemplateManifests = manifests;

export function getZineTemplateManifest(style: ZineStyle): ZineTemplateManifest {
  const manifest = manifests.find((candidate) => candidate.style === style);
  if (!manifest) throw new Error(`No zine template manifest registered for ${style}`);
  return manifest;
}
