import { DEFAULT_RECIPE_TYPOGRAPHY, RECIPE_SCHEMA_VERSION, type RecipeDefinition } from "./recipe-contract";

/**
 * Phase A fixtures are intentionally not added to the active catalog. They
 * prove that a new layout can be expressed as data consumed by the shared
 * renderer without adding a new JSX branch.
 */
export const phaseARecipeFixtures: readonly RecipeDefinition[] = [
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: "phase-a-offset-photo",
    version: 1,
    familyId: "phase-a-fixtures",
    name: "Offset photo fixture",
    description: "A data-only single page with a title, photo and note.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "optional", maxCharacters: 240, maxLines: 6 },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .05, y: .05, width: .9, height: .9 },
    },
    theme: {
      background: "#f2eadf",
      foreground: "#22201c",
      muted: "#756c61",
      photoBackground: "#d8cec0",
      typography: DEFAULT_RECIPE_TYPOGRAPHY,
    },
    slots: [
      {
      id: "title",
        kind: "static-text",
        rect: { x: .1, y: .08, width: .8, height: .08 },
        pageSide: "left",
        required: true,
        zIndex: 29,
        foregroundToken: "ink",
        textSource: "title",
        role: "title",
        align: "start",
      },
      {
        id: "photo",
        kind: "photo",
        rect: { x: .22, y: .24, width: .64, height: .5 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
      },
      {
        id: "note",
        kind: "note",
        rect: { x: .22, y: .78, width: .64, height: .12 },
        pageSide: "left",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        maxLines: 6,
        role: "note",
        align: "start",
      },
    ],
    noteRelations: [{ photoSlotId: "photo", noteSlotId: "note", kind: "adjacent" }],
  },
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: "phase-a-gutter-bridge",
    version: 1,
    familyId: "phase-a-fixtures",
    name: "Gutter bridge fixture",
    description: "A data-only spread with one photo crossing the gutter.",
    status: "draft",
    scope: "spread",
    capabilities: {
      photos: { min: 1, max: 1 },
      notes: { mode: "none" },
      allowsEmptyDraft: false,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .05, y: .05, width: 1.9, height: .9 },
      gutter: { start: .98, end: 1.02 },
    },
    theme: {
      background: "#282722",
      foreground: "#f4f0e7",
      muted: "#b6b0a4",
      photoBackground: "#343532",
      typography: DEFAULT_RECIPE_TYPOGRAPHY,
    },
    slots: [{
      id: "bridge-photo",
      kind: "photo",
      rect: { x: .72, y: .16, width: .56, height: .68 },
      pageSide: "cross-spread",
      required: true,
      zIndex: 10,
      fit: "cover",
      allowBleed: true,
      allowGutterCrossing: true,
    }],
    noteRelations: [],
  },
];
