import {
  RECIPE_SCHEMA_VERSION,
  type RecipeDefinition,
  type RecipeTheme,
} from "./recipe-contract";

export const DYNAMIC_RECIPE_IDS = {
  edgeThrust: "dynamic-edge-thrust-v1",
  dropSequence: "dynamic-drop-sequence-v1",
  gutterSweep: "dynamic-gutter-sweep-v1",
} as const;

export const DYNAMIC_PREVIEW_SCENARIO_IDS = [
  "empty",
  "exact-one",
  "over-capacity-two",
  "landscape",
  "square",
  "portrait-risk",
  "ultra-wide-risk",
  "left-page",
  "right-page-direction-mismatch",
  "off-center-focus",
  "terminal-edge-pressure",
  "photo-note-hidden",
  "one-photo",
  "two-photos",
  "exact-three",
  "over-capacity-four",
  "three-landscape",
  "three-square",
  "three-portrait",
  "three-mixed-ratios",
  "three-independent-focus",
  "stable-sequence",
  "fixed-direction-gap",
  "right-page",
  "phase-edge-pressure",
  "complete-spread",
  "left-plan",
  "right-plan",
  "focus-continuity",
  "gutter-center-risk",
] as const;

export const dynamicRecipeTheme: RecipeTheme = {
  background: "#F4F0E8",
  foreground: "#17191C",
  muted: "#55585D",
  photoBackground: "#D7D3CA",
  typographyPreset: "photoessay-field",
};

export const dynamicRecipeDefinitions = [
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: DYNAMIC_RECIPE_IDS.edgeThrust,
    version: 1,
    familyId: "dynamic",
    name: "Edge Thrust",
    description: "One directional photograph enters from a single active outer edge and stops against a fixed paper endpoint.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .04, y: .05, width: .92, height: .90 },
    },
    theme: dynamicRecipeTheme,
    slots: [
      {
        id: "thrust-photo",
        kind: "photo",
        rect: { x: 0, y: .07, width: .92, height: .86 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: false,
      },
    ],
    noteRelations: [],
  },
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: DYNAMIC_RECIPE_IDS.dropSequence,
    version: 1,
    familyId: "dynamic",
    name: "Drop Sequence",
    description: "Two equal action phases move laterally before dropping into one larger impact photograph.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 3, max: 3 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .05, y: .05, width: .90, height: .90 },
    },
    theme: dynamicRecipeTheme,
    slots: [
      {
        id: "phase-01",
        kind: "photo",
        rect: { x: .05, y: .06, width: .40, height: .25 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      },
      {
        id: "phase-02",
        kind: "photo",
        rect: { x: .55, y: .06, width: .40, height: .25 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      },
      {
        id: "impact-photo",
        kind: "photo",
        rect: { x: .05, y: .41, width: .90, height: .54 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      },
    ],
    noteRelations: [],
  },
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: DYNAMIC_RECIPE_IDS.gutterSweep,
    version: 1,
    familyId: "dynamic",
    name: "Gutter Sweep",
    description: "One continuous high-density action photograph sweeps through the gutter and both outer trim edges.",
    status: "draft",
    scope: "spread",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .04, y: .05, width: 1.92, height: .90 },
      gutter: { start: .94, end: 1.06 },
    },
    theme: dynamicRecipeTheme,
    slots: [
      {
        id: "sweep-photo",
        kind: "photo",
        rect: { x: 0, y: .08, width: 2, height: .84 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: true,
      },
    ],
    noteRelations: [],
  },
] as const satisfies readonly RecipeDefinition[];

export function getDynamicRecipeDefinition(recipeId: string, version: number) {
  return dynamicRecipeDefinitions.find((recipe) => (
    recipe.id === recipeId && recipe.version === version
  )) ?? null;
}
