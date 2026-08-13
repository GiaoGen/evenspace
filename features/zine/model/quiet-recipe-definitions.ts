import {
  RECIPE_SCHEMA_VERSION,
  type RecipeDefinition,
  type RecipeTheme,
} from "./recipe-contract";

export const QUIET_RECIPE_IDS = {
  heldField: "quiet-held-field-v1",
  scaleEcho: "quiet-scale-echo-v1",
  horizonBridge: "quiet-horizon-bridge-v1",
} as const;

export const quietRecipeTheme: RecipeTheme = {
  background: "#F4F0E8",
  foreground: "#17191C",
  muted: "#55585D",
  photoBackground: "#D7D3CA",
  typographyPreset: "photoessay-field",
};

export const quietRecipeDefinitions = [
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: QUIET_RECIPE_IDS.heldField,
    version: 1,
    familyId: "quiet",
    name: "Held Field",
    description: "One framed photograph creates a quiet, self-contained page pause without text.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .10, y: .10, width: .80, height: .80 },
    },
    theme: quietRecipeTheme,
    slots: [
      {
        id: "photo-primary",
        kind: "photo",
        rect: { x: .14, y: .16, width: .72, height: .60 },
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
    id: QUIET_RECIPE_IDS.scaleEcho,
    version: 1,
    familyId: "quiet",
    name: "Scale Echo",
    description: "A scene and a smaller detail form a restrained diagonal echo across fixed paper space.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 2, max: 2 },
      notes: { mode: "optional", maxCharacters: 60, maxLines: 3 },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .10, y: .10, width: .80, height: .82 },
    },
    theme: quietRecipeTheme,
    slots: [
      {
        id: "photo-scene",
        kind: "photo",
        rect: { x: .10, y: .13, width: .60, height: .40 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      },
      {
        id: "photo-echo",
        kind: "photo",
        rect: { x: .52, y: .60, width: .38, height: .32 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      },
      {
        id: "note-echo",
        kind: "note",
        rect: { x: .10, y: .70, width: .32, height: .18 },
        pageSide: "left",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        maxLines: 3,
        repeatable: false,
        role: "caption",
        align: "start",
      },
    ],
    noteRelations: [
      {
        photoSlotId: "photo-echo",
        noteSlotId: "note-echo",
        kind: "aligned",
      },
    ],
  },
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: QUIET_RECIPE_IDS.horizonBridge,
    version: 1,
    familyId: "quiet",
    name: "Horizon Bridge",
    description: "One framed panoramic photograph crosses the gutter as a quiet atomic spread.",
    status: "draft",
    scope: "spread",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .10, y: .10, width: 1.80, height: .80 },
      gutter: { start: .98, end: 1.02 },
    },
    theme: quietRecipeTheme,
    slots: [
      {
        id: "photo-horizon",
        kind: "photo",
        rect: { x: .28, y: .17, width: 1.44, height: .66 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: true,
      },
    ],
    noteRelations: [],
  },
] as const satisfies readonly RecipeDefinition[];

export function getQuietRecipeDefinition(recipeId: string) {
  return quietRecipeDefinitions.find((recipe) => recipe.id === recipeId) ?? null;
}
