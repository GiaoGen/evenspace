import {
  createRecipeApplication,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type RecipeApplication,
  type RecipeCompatibility,
  type RecipeContent,
  type RecipeDefinition,
  type RecipeTheme,
} from "./recipe-contract";
import {
  createContentItemId,
  createPhotoFocusDefaults,
  type RecipePlacement,
} from "./recipe-placement";
import {
  CHROMATIC_PREVIEW_SCENARIO_IDS,
  CHROMATIC_RECIPE_IDS,
  getChromaticRecipeDefinition,
} from "./chromatic-recipe-definitions";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export type ChromaticPreviewMode = "editor" | "reader";
export type ChromaticPreviewView = "left" | "right" | "spread";
export type ChromaticPreviewColorMode = "on" | "off";
export type ChromaticPreviewRecipeId = (typeof CHROMATIC_RECIPE_IDS)[keyof typeof CHROMATIC_RECIPE_IDS];
export type ChromaticPreviewScenarioId = (typeof CHROMATIC_PREVIEW_SCENARIO_IDS)[number];

type ChromaticPreviewPhotoDefinition = {
  readonly asset: ReferencePreviewAssetId;
  readonly caption?: string;
  readonly focusX?: number;
  readonly focusY?: number;
  readonly dimensions?: { readonly width: number; readonly height: number };
};

export type ChromaticPreviewScenarioDefinition = {
  readonly recipeId: ChromaticPreviewRecipeId;
  readonly id: ChromaticPreviewScenarioId;
  readonly label: string;
  readonly photos: readonly ChromaticPreviewPhotoDefinition[];
  readonly view?: ChromaticPreviewView;
  readonly placements?: readonly Partial<RecipePlacement>[];
  readonly colorMode?: ChromaticPreviewColorMode;
};

export type ChromaticPreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type ChromaticPreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: ChromaticPreviewScenarioId;
  readonly mode: ChromaticPreviewMode;
  readonly colorMode: ChromaticPreviewColorMode;
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly ChromaticPreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

export const chromaticCrossFieldMaximumNote = [
  "abcdefghijklmnopqrstuv",
  "abcdefghijklmnopqrstuv",
  "abcdefghijklmnopqrstuv",
  "abcdefghijklmnopqrstu",
].join("\n");

const entryFieldScenarios: readonly ChromaticPreviewScenarioDefinition[] = [
  scenario(CHROMATIC_RECIPE_IDS.entryField, "empty", "Empty · needs one entry photograph", []),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "exact-one", "Exactly one entry photograph", [photo("landscape")]),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "over-capacity-two", "Second photograph remains unplaced", photos(2, "landscape")),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "landscape", "Landscape entry source", [photo("landscape")]),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "square", "Square entry source", [photo("square")]),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "portrait", "Portrait crop pressure", [photo("portrait")]),
  scenario(
    CHROMATIC_RECIPE_IDS.entryField,
    "off-center-focus",
    "Off-center focus persists below the threshold",
    [photo("landscape", "", 74, 38)],
    "left",
    [{ focusX: 74, focusY: 38, scale: 1.3 }],
  ),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "left-page", "Left page topology", [photo("square")], "left"),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "right-page", "Right page uses the same page-local topology", [photo("square")], "right"),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "color-on", "Approved accent threshold", [photo("landscape")], "left", undefined, "on"),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "color-off", "Neutral threshold preserves the entry path", [photo("landscape")], "left", undefined, "off"),
  scenario(CHROMATIC_RECIPE_IDS.entryField, "photo-note-hidden", "Source Photo Note is retained but hidden", [photo("landscape", "Retained hidden Note.")]),
];

const fourBeatScenarios: readonly ChromaticPreviewScenarioDefinition[] = [
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "empty", "Empty · needs four ordered photographs", []),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "fewer-than-four", "Three photographs · one beat missing", photos(3, "portrait")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "exact-four", "Exactly four ordered photographs", photos(4, "portrait")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "over-capacity-five", "Fifth photograph remains unplaced", photos(5, "portrait")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "four-4-5", "Four preferred 4:5 single-subject sources", photos(4, "portrait", { width: 1000, height: 1250 })),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "four-square", "Four square sources", photos(4, "square")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "four-landscape-high-crop-risk", "Four landscape high-crop-risk sources", photos(4, "landscape", { width: 1500, height: 1000 })),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "mixed-ratios", "Mixed ratios remain a declared crop risk", [
    photo("portrait", "", 50, 50, { width: 1000, height: 1250 }),
    photo("square"),
    photo("landscape", "", 50, 50, { width: 1500, height: 1000 }),
    photo("portrait"),
  ]),
  scenario(
    CHROMATIC_RECIPE_IDS.fourBeat,
    "independent-focus",
    "Each beat persists independent focus",
    [photo("portrait", "", 14, 42), photo("portrait", "", 38, 28), photo("portrait", "", 66, 61), photo("portrait", "", 88, 47)],
    "left",
    [
      { focusX: 14, focusY: 42, scale: 1.1 },
      { focusX: 38, focusY: 28, scale: 1.2 },
      { focusX: 66, focusY: 61, scale: 1.25 },
      { focusX: 88, focusY: 47, scale: 1.35 },
    ],
  ),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "stable-01-04-order", "Stable literal 01–04 order", photos(4, "portrait")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "stable-a1-a2-a3-a1", "Stable A1 → A2 → A3 → A1 field order", photos(4, "portrait")),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "color-on", "Approved rhythmic palette", photos(4, "portrait"), "left", undefined, "on"),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "color-off", "Neutral rhythm preserves four-beat topology", photos(4, "portrait"), "left", undefined, "off"),
  scenario(CHROMATIC_RECIPE_IDS.fourBeat, "editor-reader-parity", "Editor and Reader share the same four-beat plan", photos(4, "portrait")),
];

const crossFieldScenarios: readonly ChromaticPreviewScenarioDefinition[] = [
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "missing-photo", "Missing source photograph", [], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "missing-note", "Source photograph with empty required Note", [photo("square")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "one-to-eleven-characters", "One character is runtime-valid", [photo("square", "A")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "exact-12-characters", "Exactly 12 characters · recommended target begins", [photo("square", "Field note12")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "exact-90-four-lines", "Exactly 90 characters / four lines", [photo("square", chromaticCrossFieldMaximumNote)], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "over-90-characters", "Over 90 characters", [photo("square", `${chromaticCrossFieldMaximumNote}x`)], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "over-four-lines", "Within 90 characters / over four lines", [photo("square", "one\ntwo\nthree\nfour\nfive")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "complete-spread", "Complete source-to-destination atomic spread", [photo("square", "A complete field Note.")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "left-plan", "Left source Render Plan", [photo("square", "A bound Note.")], "left"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "right-plan", "Right destination Render Plan", [photo("square", "A bound Note.")], "right"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "unplaced-content", "Second photograph remains unplaced", [photo("square", "Primary Note."), photo("portrait", "Unplaced Note.")], "spread"),
  scenario(
    CHROMATIC_RECIPE_IDS.crossFieldNote,
    "focus-continuity",
    "Source focus persists while destination geometry remains fixed",
    [photo("square", "A focused field Note.", 72, 43)],
    "spread",
    [{ focusX: 72, focusY: 43, scale: 1.35 }],
  ),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "color-on", "Approved source/destination palette", [photo("square", "Color-on Note.")], "spread", undefined, "on"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "color-off", "Neutral source/destination duties remain", [photo("square", "Color-off Note.")], "spread", undefined, "off"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "valid-cross-page-pair-evidence", "Required Photo–Note pair is the only spread evidence", [photo("square", "Evidence Note.")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "color-field-only-spread-rejection", "Color Fields alone cannot prove spread", [photo("square", "Relation still required.")], "spread"),
  scenario(CHROMATIC_RECIPE_IDS.crossFieldNote, "editor-reader-parity", "Editor and Reader share source/destination plans", [photo("square", "Parity Note.")], "spread"),
];

export const chromaticPreviewScenarios: readonly ChromaticPreviewScenarioDefinition[] = [
  ...entryFieldScenarios,
  ...fourBeatScenarios,
  ...crossFieldScenarios,
];

export function createChromaticPreviewMatrix(): readonly ChromaticPreviewCell[] {
  return chromaticPreviewScenarios.flatMap((definition) => (
    (["editor", "reader"] as const).map((mode) => createChromaticPreviewCell(definition, mode))
  ));
}

export function createChromaticPreviewCell(
  definition: ChromaticPreviewScenarioDefinition,
  mode: ChromaticPreviewMode,
): ChromaticPreviewCell {
  const baseRecipe = getChromaticRecipeDefinition(definition.recipeId, 1) as RecipeDefinition | null;
  if (!baseRecipe) throw new Error(`Missing Chromatic Recipe Definition ${definition.recipeId}@1.`);
  const colorMode = definition.colorMode ?? "on";
  const recipe = colorMode === "off" ? createColorOffRecipe(baseRecipe) : baseRecipe;
  const fixtureId = `chromatic-fixture-${definition.recipeId}-${definition.id}`;
  const createdPhotos = definition.photos.map((item, index) => createChromaticPhoto(fixtureId, item, index));
  const content = {
    photoIds: createdPhotos.map((item) => item.id),
    contentItemIds: createdPhotos.map((_, index) => createContentItemId(fixtureId, index)),
    notesByPhotoId: Object.fromEntries(createdPhotos.map((item) => [item.id, item.caption])),
    defaultFocusByPhotoId: createPhotoFocusDefaults(createdPhotos),
  } satisfies RecipeContent;
  const view = definition.view ?? (recipe.scope === "spread" ? "spread" : "left");
  const targetPageIds = recipe.scope === "spread"
    ? [`${fixtureId}:left`, `${fixtureId}:right`]
    : [`${fixtureId}:${view === "right" ? "right" : "left"}`];
  const application = createApplicationWithPersistedPlacement({
    recipe,
    content,
    anchorPageId: targetPageIds[0]!,
    targetPageIds,
    placements: definition.placements,
  });
  const environments = createChromaticEnvironments(recipe, view, fixtureId, mode);
  const plans = environments.map((environment) => createRecipeRenderPlan({
    recipe,
    application,
    photos: createdPhotos,
    environment,
  }));
  const validation = validateRecipeDefinition(recipe);
  const compatibility = evaluateRecipeCompatibility(recipe, content);
  const errors = validation.issues.map((issue) => ({
    slotId: locateIssueSlotId(issue.message, recipe),
    message: issue.message,
  }));

  return {
    id: `${recipe.id}:${definition.id}:${mode}`,
    recipeId: recipe.id,
    recipe,
    fixtureId,
    fixtureLabel: `${definition.label} · ${mode === "editor" ? "Editor" : "Reader"}`,
    scenario: definition.id,
    mode,
    colorMode,
    content,
    photos: createdPhotos,
    application,
    environments,
    plans,
    slotIds: [...new Set(plans.flatMap((plan) => plan.slots.map((slot) => slot.id)))],
    errors,
    compatibility,
    compatibilitySlotId: locateCompatibilitySlotId(compatibility, recipe),
  };
}

function scenario(
  recipeId: ChromaticPreviewRecipeId,
  id: ChromaticPreviewScenarioId,
  label: string,
  scenarioPhotos: readonly ChromaticPreviewPhotoDefinition[],
  view: ChromaticPreviewView = "left",
  placements?: readonly Partial<RecipePlacement>[],
  colorMode?: ChromaticPreviewColorMode,
): ChromaticPreviewScenarioDefinition {
  return { recipeId, id, label, photos: scenarioPhotos, view, placements, colorMode };
}

function photo(
  asset: ReferencePreviewAssetId,
  caption = "",
  focusX = 50,
  focusY = 50,
  dimensions?: ChromaticPreviewPhotoDefinition["dimensions"],
): ChromaticPreviewPhotoDefinition {
  return { asset, caption, focusX, focusY, dimensions };
}

function photos(
  count: number,
  asset: ReferencePreviewAssetId,
  dimensions?: ChromaticPreviewPhotoDefinition["dimensions"],
) {
  return Array.from({ length: count }, () => photo(asset, "", 50, 50, dimensions));
}

function createChromaticPhoto(
  fixtureId: string,
  definition: ChromaticPreviewPhotoDefinition,
  index: number,
): ZinePhoto {
  const dimensions = definition.dimensions ?? getAssetDimensions(definition.asset);
  return {
    id: `${fixtureId}:photo-${String(index + 1).padStart(2, "0")}`,
    file: {} as File,
    previewUrl: referencePreviewAssets[definition.asset],
    fileName: `${definition.asset}-chromatic-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption: definition.caption ?? "",
    defaultFocusX: definition.focusX ?? 50,
    defaultFocusY: definition.focusY ?? 50,
  };
}

function createChromaticEnvironments(
  recipe: RecipeDefinition,
  view: ChromaticPreviewView,
  fixtureId: string,
  mode: ChromaticPreviewMode,
): readonly RecipeRenderEnvironment[] {
  const sides = recipe.scope === "page"
    ? [view === "right" ? "right" : "left"] as const
    : view === "left"
      ? ["left"] as const
      : view === "right"
        ? ["right"] as const
        : ["left", "right"] as const;
  return sides.map((pageSide) => ({
    pageId: `${fixtureId}:${pageSide}`,
    pageSide,
    mode,
    pageNumber: pageSide === "left" ? 40 : 41,
    title: recipe.name,
    locale: "en",
  }));
}

function createApplicationWithPersistedPlacement({
  recipe,
  content,
  anchorPageId,
  targetPageIds,
  placements,
}: {
  readonly recipe: RecipeDefinition;
  readonly content: RecipeContent;
  readonly anchorPageId: string;
  readonly targetPageIds: readonly string[];
  readonly placements?: readonly Partial<RecipePlacement>[];
}) {
  const initial = createRecipeApplication({ recipe, content, anchorPageId, targetPageIds });
  if (!placements || placements.length === 0) return initial;
  const persisted = {
    ...initial,
    assignments: initial.assignments.map((assignment, index) => ({
      ...assignment,
      ...placements[index],
    })),
  } satisfies RecipeApplication;
  return createRecipeApplication({
    recipe,
    content,
    anchorPageId,
    targetPageIds,
    previousApplications: [persisted],
  });
}

function createColorOffRecipe(recipe: RecipeDefinition): RecipeDefinition {
  const colorTokens = {
    ...recipe.theme?.colorTokens,
    "accent-1": "#505050",
    "accent-2": "#666666",
    "accent-3": "#A6A6A6",
  } satisfies NonNullable<RecipeTheme["colorTokens"]>;
  return {
    ...recipe,
    theme: { ...recipe.theme!, colorTokens },
  };
}

function getAssetDimensions(asset: ReferencePreviewAssetId) {
  switch (asset) {
    case "portrait": return { width: 900, height: 1600 };
    case "square": return { width: 1200, height: 1200 };
    case "ultraWide": return { width: 2400, height: 700 };
    case "color": return { width: 1200, height: 1200 };
    case "landscape": return { width: 1600, height: 900 };
  }
}

function locateIssueSlotId(message: string, recipe: RecipeDefinition) {
  return recipe.slots.find((slot) => message.includes(slot.id))?.id ?? "recipe-definition";
}

function locateCompatibilitySlotId(
  compatibility: RecipeCompatibility,
  recipe: RecipeDefinition,
) {
  if (compatibility.slotId) return compatibility.slotId;
  if (compatibility.code === "note-too-long" || compatibility.code === "note-too-many-lines") {
    return recipe.slots.find((slot) => slot.kind === "note")?.id ?? "recipe-content";
  }
  return compatibility.code === "too-much-content" ? "content-capacity" : "recipe-content";
}
