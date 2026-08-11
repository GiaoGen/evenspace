import {
  RECIPE_SCHEMA_VERSION,
  type RecipeDefinition,
  type RecipeRect,
  type RecipeSlot,
  type RecipeTheme,
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
};

const noteTheme: RecipeTheme = {
  background: "#fff7e8",
  foreground: "#252019",
  muted: "#806d58",
  photoBackground: "#dfc8a6",
};

const contactTheme: RecipeTheme = {
  background: "#ece8df",
  foreground: "#22221f",
  muted: "#726f67",
  photoBackground: "#d3d0c9",
};

const indexTheme: RecipeTheme = {
  background: "#e5eef0",
  foreground: "#18333a",
  muted: "#52727a",
  photoBackground: "#c1d5d6",
};

const spreadTheme: RecipeTheme = {
  background: "#252a2a",
  foreground: "#f7f0df",
  muted: "#b8b5a8",
  photoBackground: "#394648",
};

const colorTheme: RecipeTheme = {
  background: "#17384a",
  foreground: "#fff2ce",
  muted: "#b9e2d7",
  photoBackground: "#cc795a",
};

const staticHeaderSlots: readonly RecipeSlot[] = [
  {
    id: "reference-kicker",
    kind: "static-text",
    rect: { x: .08, y: .06, width: .42, height: .04 },
    pageSide: "left",
    required: false,
    zIndex: 3,
    text: "REFERENCE RECIPE",
    textSource: "literal",
  },
  {
    id: "reference-page-number",
    kind: "static-text",
    rect: { x: .84, y: .06, width: .08, height: .04 },
    pageSide: "left",
    required: false,
    zIndex: 3,
    textSource: "page-number",
  },
];

const photoSlot = (
  id: string,
  rect: RecipeRect,
  required: boolean,
): RecipeSlot => ({
  id,
  kind: "photo",
  rect,
  pageSide: "left",
  required,
  zIndex: 1,
  fit: "cover",
});

const noteSlot = (rect: RecipeRect): RecipeSlot => ({
  id: "note-1",
  kind: "note",
  rect,
  pageSide: "left",
  required: false,
  zIndex: 2,
  maxLines: 3,
  repeatable: true,
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
}: {
  readonly id: string;
  readonly familyId: string;
  readonly name: string;
  readonly description: string;
  readonly photos: readonly RecipeSlot[];
  readonly photoMin: number;
  readonly photoMax: number;
  readonly notes: "none" | "optional";
  readonly theme: RecipeTheme;
  readonly noteRect?: RecipeRect;
  readonly relation?: "adjacent" | "aligned" | "indexed";
}): RecipeDefinition => ({
  schemaVersion: RECIPE_SCHEMA_VERSION,
  id,
  version: 1,
  familyId,
  name,
  description,
  status: "draft",
  scope: "page",
  // Kept only for old persistence compatibility. Preview rendering never looks
  // up this field, which is why these definitions live outside the runtime catalog.
  legacyStyleId: "editorial",
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
    ...staticHeaderSlots,
    ...photos,
    ...(notes === "none" || !noteRect ? [] : [noteSlot(noteRect)]),
  ],
  noteRelations: notes === "none" || !relation
    ? []
    : photos.map((slot) => ({ photoSlotId: slot.id, noteSlotId: "note-1", kind: relation })),
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
    legacyStyleId: "editorial",
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
        zIndex: 1,
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
        zIndex: 2,
        text: "LEFT PAGE",
        textSource: "literal",
      },
      {
        id: "cross-gutter-right-label",
        kind: "static-text",
        rect: { x: 1.62, y: .06, width: .3, height: .04 },
        pageSide: "right",
        required: false,
        zIndex: 2,
        text: "RIGHT PAGE",
        textSource: "literal",
      },
    ],
    noteRelations: [],
  },
  pageRecipe({
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
  }),
];

export const referenceRecipeIds = referenceRecipeDefinitions.map((recipe) => recipe.id);
