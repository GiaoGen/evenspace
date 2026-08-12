import {
  DEFAULT_RECIPE_TYPOGRAPHY,
  RECIPE_SCHEMA_VERSION,
  type RecipeDefinition,
  type RecipeNoteSlot,
  type RecipePhotoSlot,
  type RecipeRect,
  type RecipeStaticTextSlot,
  type RecipeTheme,
  type RecipeTypographyRole,
} from "./recipe-contract";

const pageCanvas = {
  pageRatio: "3:4",
  safeArea: { x: .05, y: .05, width: .9, height: .9 },
  gutter: { start: .02, end: .02 },
} as const;

const spreadCanvas = {
  pageRatio: "3:4",
  safeArea: { x: .04, y: .05, width: 1.92, height: .9 },
  gutter: { start: .98, end: 1.02 },
} as const;

const paperTheme: RecipeTheme = {
  background: "#f3ede2",
  foreground: "#20201b",
  muted: "#736c61",
  photoBackground: "#d9d0c2",
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const noteTheme: RecipeTheme = {
  background: "#fff7e8",
  foreground: "#252019",
  muted: "#806d58",
  photoBackground: "#dfc8a6",
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const contactTheme: RecipeTheme = {
  background: "#ece8df",
  foreground: "#22221f",
  muted: "#726f67",
  photoBackground: "#d3d0c9",
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const indexTheme: RecipeTheme = {
  background: "#e5eef0",
  foreground: "#18333a",
  muted: "#52727a",
  photoBackground: "#c1d5d6",
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const spreadTheme: RecipeTheme = {
  background: "#252a2a",
  foreground: "#f7f0df",
  muted: "#b8b5a8",
  photoBackground: "#394648",
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const colorTheme: RecipeTheme = {
  background: "#17384a",
  foreground: "#fff2ce",
  muted: "#b9e2d7",
  photoBackground: "#cc795a",
  colorTokens: {
    paper: "#f7ead0",
    ink: "#17384a",
    "muted-ink": "#52727a",
    "photo-mat": "#cc795a",
    "accent-1": "#17384a",
    "accent-2": "#b84a3a",
    "accent-3": "#e0a33a",
    "inverse-ink": "#fff2ce",
  },
  typography: DEFAULT_RECIPE_TYPOGRAPHY,
};

const staticHeaderSlots = (kickerRole: RecipeTypographyRole): readonly RecipeStaticTextSlot[] => [
  {
    id: "reference-kicker",
    kind: "static-text",
    rect: { x: .08, y: .06, width: .42, height: .04 },
    pageSide: "left",
    required: false,
    zIndex: 20,
    foregroundToken: "ink",
    text: "REFERENCE RECIPE",
    textSource: "literal",
    role: kickerRole,
    align: "start",
  },
  {
    id: "reference-page-number",
    kind: "static-text",
    rect: { x: .84, y: .06, width: .08, height: .04 },
    pageSide: "left",
    required: false,
    zIndex: 20,
    foregroundToken: "ink",
    textSource: "page-number",
    role: "folio",
    align: "end",
  },
];

const photoSlot = (
  id: string,
  rect: RecipeRect,
  required: boolean,
): RecipePhotoSlot => ({
  id,
  kind: "photo",
  rect,
  pageSide: "left",
  required,
  zIndex: 10,
  fit: "cover",
});

const noteSlot = (rect: RecipeRect, role: "caption" | "note" | "index"): RecipeNoteSlot => ({
  id: "note-1",
  kind: "note",
  rect,
  pageSide: "left",
  required: false,
  zIndex: 20,
  foregroundToken: "ink",
  maxLines: 3,
  repeatable: true,
  role,
  align: "start",
});

const pageRecipe = ({
  id,
  familyId,
  name,
  description,
  photos,
  photoMin,
  photoMax,
  notes,
  theme,
  noteRect,
  relation,
  kickerRole = "label",
  noteRole = "note",
}: {
  readonly id: string;
  readonly familyId: string;
  readonly name: string;
  readonly description: string;
  readonly photos: readonly RecipePhotoSlot[];
  readonly photoMin: number;
  readonly photoMax: number;
  readonly notes: "none" | "optional";
  readonly theme: RecipeTheme;
  readonly noteRect?: RecipeRect;
  readonly relation?: "adjacent" | "aligned" | "indexed";
  readonly kickerRole?: RecipeTypographyRole;
  readonly noteRole?: "caption" | "note" | "index";
}): RecipeDefinition => ({
  schemaVersion: RECIPE_SCHEMA_VERSION,
  id,
  version: 1,
  familyId,
  name,
  description,
  status: "draft",
  scope: "page",
  capabilities: {
    photos: { min: photoMin, max: photoMax },
    notes: notes === "none"
      ? { mode: "none" }
      : { mode: "optional", maxCharacters: 140, maxLines: 3 },
    allowsEmptyDraft: true,
  },
  canvas: pageCanvas,
  theme,
  slots: [
    ...staticHeaderSlots(kickerRole),
    ...photos,
    ...(notes === "none" || !noteRect ? [] : [noteSlot(noteRect, noteRole)]),
  ],
  noteRelations: notes === "none" || !relation
    ? []
    : photos.map((slot) => ({ photoSlotId: slot.id, noteSlotId: "note-1", kind: relation })),
});

const multiColorBase = pageRecipe({
  id: "reference-multi-color-system-v1",
  familyId: "reference-multi-color-system",
  name: "Multi-color system",
  description: "A two-image color system with a deliberately contrasting paper field.",
  photos: [
    photoSlot("color-photo-1", { x: .08, y: .19, width: .47, height: .54 }, true),
    photoSlot("color-photo-2", { x: .59, y: .19, width: .33, height: .3 }, false),
  ],
  photoMin: 1,
  photoMax: 2,
  notes: "optional",
  noteRect: { x: .59, y: .56, width: .33, height: .18 },
  relation: "aligned",
  theme: colorTheme,
});

export const referenceRecipeDefinitions: readonly RecipeDefinition[] = [
  pageRecipe({
    id: "reference-single-photo-no-note-v1",
    familyId: "reference-single-photo-no-note",
    name: "Single photo / no Note",
    description: "One deliberate image with no text relationship.",
    photos: [photoSlot("hero-photo", { x: .1, y: .18, width: .8, height: .68 }, true)],
    photoMin: 1,
    photoMax: 1,
    notes: "none",
    theme: paperTheme,
  }),
  pageRecipe({
    id: "reference-single-photo-note-v1",
    familyId: "reference-single-photo-note",
    name: "Single photo / Photo Note",
    description: "A left-column image with a vertically aligned right-column Photo Note.",
    photos: [photoSlot("hero-photo", { x: .08, y: .24, width: .42, height: .48 }, true)],
    photoMin: 1,
    photoMax: 1,
    notes: "optional",
    noteRect: { x: .58, y: .24, width: .34, height: .48 },
    relation: "aligned",
    kickerRole: "deck",
    noteRole: "caption",
    theme: noteTheme,
  }),
  pageRecipe({
    id: "reference-multi-photo-no-note-v1",
    familyId: "reference-multi-photo-no-note",
    name: "Multiple photos / no Note",
    description: "A three-slot contact rhythm with no text layer.",
    photos: [
      photoSlot("photo-1", { x: .08, y: .17, width: .39, height: .31 }, true),
      photoSlot("photo-2", { x: .53, y: .17, width: .39, height: .31 }, false),
      photoSlot("photo-3", { x: .08, y: .54, width: .84, height: .28 }, false),
    ],
    photoMin: 1,
    photoMax: 3,
    notes: "none",
    theme: contactTheme,
  }),
  pageRecipe({
    id: "reference-multi-photo-indexed-note-v1",
    familyId: "reference-multi-photo-indexed-note",
    name: "Multiple photos / indexed Note",
    description: "Four images share one repeatable, indexed Note area.",
    photos: [
      photoSlot("photo-1", { x: .08, y: .15, width: .39, height: .27 }, true),
      photoSlot("photo-2", { x: .53, y: .15, width: .39, height: .27 }, false),
      photoSlot("photo-3", { x: .08, y: .47, width: .39, height: .27 }, false),
      photoSlot("photo-4", { x: .53, y: .47, width: .39, height: .27 }, false),
    ],
    photoMin: 1,
    photoMax: 4,
    notes: "optional",
    noteRect: { x: .08, y: .8, width: .84, height: .12 },
    relation: "indexed",
    kickerRole: "title",
    noteRole: "index",
    theme: indexTheme,
  }),
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: "reference-cross-gutter-v1",
    version: 1,
    familyId: "reference-cross-gutter",
    name: "True cross-gutter photo",
    description: "One placement owns both halves of a photograph across the book spine.",
    status: "draft",
    scope: "spread",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: true,
    },
    canvas: spreadCanvas,
    theme: spreadTheme,
    slots: [
      {
        id: "cross-gutter-photo",
        kind: "photo",
        rect: { x: .68, y: .14, width: .64, height: .72 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: true,
      },
      {
        id: "cross-gutter-left-label",
        kind: "static-text",
        rect: { x: .08, y: .06, width: .3, height: .04 },
        pageSide: "left",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        text: "LEFT PAGE",
        textSource: "literal",
        role: "label",
        align: "outward",
      },
      {
        id: "cross-gutter-right-label",
        kind: "static-text",
        rect: { x: 1.62, y: .06, width: .3, height: .04 },
        pageSide: "right",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        text: "RIGHT PAGE",
        textSource: "literal",
        role: "label",
        align: "outward",
      },
    ],
    noteRelations: [],
  },
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: "reference-cross-page-pairs-v1",
    version: 1,
    familyId: "reference-cross-page-pairs",
    name: "Bidirectional cross-page pairs",
    description: "Two Photo Notes prove both left-to-right and right-to-left content relationships.",
    status: "draft",
    scope: "spread",
    capabilities: {
      photos: { min: 2, max: 2 },
      notes: { mode: "optional", maxCharacters: 140, maxLines: 3 },
      allowsEmptyDraft: true,
    },
    canvas: spreadCanvas,
    theme: spreadTheme,
    slots: [
      photoSlot("pair-photo-left", { x: .08, y: .18, width: .4, height: .32 }, true),
      { ...photoSlot("pair-photo-right", { x: 1.52, y: .56, width: .4, height: .32 }, true), pageSide: "right" },
      {
        ...noteSlot({ x: 1.52, y: .18, width: .4, height: .22 }, "caption"),
        id: "pair-note-right",
        pageSide: "right",
        align: "inward",
      },
      {
        ...noteSlot({ x: .08, y: .66, width: .4, height: .22 }, "note"),
        id: "pair-note-left",
        align: "inward",
      },
      {
        id: "pair-label-left",
        kind: "static-text",
        rect: { x: .08, y: .06, width: .4, height: .04 },
        pageSide: "left",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        text: "LEFT PHOTO / RIGHT NOTE",
        textSource: "literal",
        role: "label",
        align: "outward",
      },
      {
        id: "pair-label-right",
        kind: "static-text",
        rect: { x: 1.52, y: .06, width: .4, height: .04 },
        pageSide: "right",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        text: "RIGHT PHOTO / LEFT NOTE",
        textSource: "literal",
        role: "label",
        align: "outward",
      },
    ],
    noteRelations: [
      { photoSlotId: "pair-photo-left", noteSlotId: "pair-note-right", kind: "cross-page-pair" },
      { photoSlotId: "pair-photo-right", noteSlotId: "pair-note-left", kind: "cross-page-pair" },
    ],
  },
  {
    ...multiColorBase,
    slots: [
      {
        id: "color-paper-field",
        kind: "color-field",
        rect: { x: .05, y: .05, width: .48, height: .9 },
        pageSide: "left",
        required: true,
        zIndex: 0,
        fillToken: "paper",
      },
      {
        id: "color-accent-field",
        kind: "color-field",
        rect: { x: .53, y: .05, width: .42, height: .9 },
        pageSide: "left",
        required: true,
        zIndex: 1,
        fillToken: "accent-1",
      },
      ...multiColorBase.slots
        .filter((slot) => slot.kind !== "color-field")
        .map((slot) => slot.kind === "photo"
          ? { ...slot, zIndex: 10 }
          : slot.kind === "note"
            ? { ...slot, zIndex: 20, foregroundToken: "inverse-ink" as const }
            : { ...slot, zIndex: 20, foregroundToken: slot.id === "reference-page-number" ? "inverse-ink" as const : "ink" as const }),
    ],
  },
];

export const referenceRecipeIds = referenceRecipeDefinitions.map((recipe) => recipe.id);
