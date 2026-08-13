import {
  createRecipeApplication,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type RecipeApplication,
  type RecipeCompatibility,
  type RecipeContent,
  type RecipeDefinition,
} from "./recipe-contract";
import {
  createContentItemId,
  createPhotoFocusDefaults,
  type RecipePlacement,
} from "./recipe-placement";
import { QUIET_RECIPE_IDS, getQuietRecipeDefinition } from "./quiet-recipe-definitions";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export type QuietPreviewMode = "editor" | "reader";
export type QuietPreviewView = "left" | "right" | "spread";

type QuietPreviewPhotoDefinition = {
  readonly asset: ReferencePreviewAssetId;
  readonly caption?: string;
  readonly focusX?: number;
  readonly focusY?: number;
};

export type QuietPreviewScenarioDefinition = {
  readonly recipeId: (typeof QUIET_RECIPE_IDS)[keyof typeof QUIET_RECIPE_IDS];
  readonly id: string;
  readonly label: string;
  readonly photos: readonly QuietPreviewPhotoDefinition[];
  readonly view?: QuietPreviewView;
  readonly placements?: readonly Partial<RecipePlacement>[];
};

export type QuietPreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type QuietPreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: string;
  readonly mode: QuietPreviewMode;
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly QuietPreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

const shortEchoNote = "A quiet echo.";
export const scaleEchoMaximumNote = "12345678901234567890\n1234567890123456789\n1234567890123456789";
export const scaleEchoCharacterOverflowNote = "x".repeat(61);
export const scaleEchoLineOverflowNote = "one\ntwo\nthree\nfour";

const heldFieldScenarios: readonly QuietPreviewScenarioDefinition[] = [
  scenario(QUIET_RECIPE_IDS.heldField, "empty", "Empty · needs content", []),
  scenario(QUIET_RECIPE_IDS.heldField, "exact-one", "Minimum · exact one", [photo("landscape")]),
  scenario(QUIET_RECIPE_IDS.heldField, "maximum", "Maximum · one", [photo("square")]),
  scenario(QUIET_RECIPE_IDS.heldField, "over-capacity", "Over-capacity · two", [photo("landscape"), photo("portrait")]),
  scenario(QUIET_RECIPE_IDS.heldField, "landscape", "Landscape", [photo("landscape")]),
  scenario(QUIET_RECIPE_IDS.heldField, "portrait", "Portrait", [photo("portrait")]),
  scenario(QUIET_RECIPE_IDS.heldField, "square", "Square", [photo("square")]),
  scenario(QUIET_RECIPE_IDS.heldField, "ultra-wide", "Ultra-wide risk", [photo("ultraWide")]),
  scenario(QUIET_RECIPE_IDS.heldField, "hidden-note", "Photo Note retained but hidden", [photo("landscape", "This Note remains in source data.")]),
  scenario(QUIET_RECIPE_IDS.heldField, "left-page", "Left page", [photo("portrait")], "left"),
  scenario(QUIET_RECIPE_IDS.heldField, "right-page", "Right page", [photo("portrait")], "right"),
  scenario(
    QUIET_RECIPE_IDS.heldField,
    "off-center-focus",
    "Off-center persisted focus",
    [photo("landscape", "", 18, 72)],
    "left",
    [{ focusX: 18, focusY: 72, scale: 1.35 }],
  ),
];

const scaleEchoScenarios: readonly QuietPreviewScenarioDefinition[] = [
  scenario(QUIET_RECIPE_IDS.scaleEcho, "empty", "Empty · needs content", []),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "one-photo", "One photo · needs content", [photo("landscape")]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "exact-two", "Exact two", [photo("landscape"), photo("portrait")]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "over-capacity", "Over-capacity · three", [photo("landscape"), photo("portrait"), photo("square")]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "no-note", "No Note · fixed geometry", [photo("landscape"), photo("portrait")]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "short-note", "Short echo Note", [photo("landscape"), photo("portrait", shortEchoNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "max-60-three-lines", "60 characters · three lines", [photo("landscape"), photo("portrait", scaleEchoMaximumNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "over-60", "Over 60 characters", [photo("landscape"), photo("portrait", scaleEchoCharacterOverflowNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "over-three-lines", "Over three lines", [photo("landscape"), photo("portrait", scaleEchoLineOverflowNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "landscape-detail-portrait", "Landscape scene + portrait detail", [photo("landscape"), photo("portrait", shortEchoNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "square-pair", "Square pair", [photo("square"), photo("square", shortEchoNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "ultra-wide-pair", "Ultra-wide risk pair", [photo("ultraWide"), photo("ultraWide", shortEchoNote)]),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "left-page", "Left page", [photo("landscape"), photo("square", shortEchoNote)], "left"),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "right-page", "Right page", [photo("landscape"), photo("square", shortEchoNote)], "right"),
  scenario(
    QUIET_RECIPE_IDS.scaleEcho,
    "distinct-focus",
    "Independent persisted focus",
    [photo("landscape", "", 22, 36), photo("portrait", shortEchoNote, 78, 67)],
    "left",
    [{ focusX: 22, focusY: 36, scale: 1.15 }, { focusX: 78, focusY: 67, scale: 1.45 }],
  ),
  scenario(QUIET_RECIPE_IDS.scaleEcho, "echo-note-binding", "Note bound to photo-echo", [photo("landscape"), photo("portrait", "Bound only to the echo photograph.")]),
];

const horizonBridgeScenarios: readonly QuietPreviewScenarioDefinition[] = [
  scenario(QUIET_RECIPE_IDS.horizonBridge, "empty", "Empty · needs content", [], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "exact-one", "Minimum · exact one", [photo("landscape")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "maximum", "Maximum · one", [photo("landscape")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "over-capacity", "Over-capacity · two", [photo("landscape"), photo("square")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "landscape", "Landscape", [photo("landscape")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "square", "Square", [photo("square")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "portrait-risk", "Portrait risk", [photo("portrait")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "ultra-wide-risk", "Ultra-wide risk", [photo("ultraWide")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "hidden-note", "Photo Note retained but hidden", [photo("landscape", "A retained Note is never rendered here.")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "full-spread", "Complete spread", [photo("landscape")], "spread"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "left-plan", "Left page plan", [photo("landscape")], "left"),
  scenario(QUIET_RECIPE_IDS.horizonBridge, "right-plan", "Right page plan", [photo("landscape")], "right"),
  scenario(
    QUIET_RECIPE_IDS.horizonBridge,
    "focus-continuity",
    "Shared placement and continuous focus",
    [photo("landscape", "", 73, 41)],
    "spread",
    [{ focusX: 73, focusY: 41, scale: 1.4 }],
  ),
];

export const quietPreviewScenarios: readonly QuietPreviewScenarioDefinition[] = [
  ...heldFieldScenarios,
  ...scaleEchoScenarios,
  ...horizonBridgeScenarios,
];

export function createQuietPreviewMatrix(): readonly QuietPreviewCell[] {
  return quietPreviewScenarios.flatMap((definition) => (
    (["editor", "reader"] as const).map((mode) => createQuietPreviewCell(definition, mode))
  ));
}

export function createQuietPreviewCell(
  definition: QuietPreviewScenarioDefinition,
  mode: QuietPreviewMode,
): QuietPreviewCell {
  const recipe = getQuietRecipeDefinition(definition.recipeId) as RecipeDefinition | null;
  if (!recipe) throw new Error(`Missing Quiet Recipe Definition ${definition.recipeId}.`);
  const fixtureId = `quiet-fixture-${definition.recipeId}-${definition.id}`;
  const photos = definition.photos.map((item, index) => createQuietPhoto(fixtureId, item, index));
  const content = {
    photoIds: photos.map((item) => item.id),
    contentItemIds: photos.map((_, index) => createContentItemId(fixtureId, index)),
    notesByPhotoId: Object.fromEntries(photos.map((item) => [item.id, item.caption])),
    defaultFocusByPhotoId: createPhotoFocusDefaults(photos),
  } satisfies RecipeContent;
  const targetPageIds = recipe.scope === "spread"
    ? [`${fixtureId}:left`, `${fixtureId}:right`]
    : [`${fixtureId}:${definition.view === "right" ? "right" : "left"}`];
  const environments = createQuietEnvironments(recipe, definition, fixtureId, mode);
  const application = createApplicationWithPersistedPlacement({
    recipe,
    content,
    anchorPageId: targetPageIds[0] ?? fixtureId,
    targetPageIds,
    placements: definition.placements,
  });
  const plans = environments.map((environment) => createRecipeRenderPlan({
    recipe,
    application,
    photos,
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
    content,
    photos,
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
  recipeId: QuietPreviewScenarioDefinition["recipeId"],
  id: string,
  label: string,
  photos: readonly QuietPreviewPhotoDefinition[],
  view: QuietPreviewView = "left",
  placements?: readonly Partial<RecipePlacement>[],
): QuietPreviewScenarioDefinition {
  return { recipeId, id, label, photos, view, placements };
}

function photo(
  asset: ReferencePreviewAssetId,
  caption = "",
  focusX = 50,
  focusY = 50,
): QuietPreviewPhotoDefinition {
  return { asset, caption, focusX, focusY };
}

function createQuietPhoto(
  fixtureId: string,
  definition: QuietPreviewPhotoDefinition,
  index: number,
): ZinePhoto {
  const dimensions = getAssetDimensions(definition.asset);
  return {
    id: `${fixtureId}:photo-${index + 1}`,
    file: {} as File,
    previewUrl: referencePreviewAssets[definition.asset],
    fileName: `${definition.asset}-quiet-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption: definition.caption ?? "",
    defaultFocusX: definition.focusX ?? 50,
    defaultFocusY: definition.focusY ?? 50,
  };
}

function createQuietEnvironments(
  recipe: RecipeDefinition,
  definition: QuietPreviewScenarioDefinition,
  fixtureId: string,
  mode: QuietPreviewMode,
): readonly RecipeRenderEnvironment[] {
  if (recipe.scope === "page") {
    const pageSide = definition.view === "right" ? "right" : "left";
    return [{
      pageId: `${fixtureId}:${pageSide}`,
      pageSide,
      mode,
      pageNumber: pageSide === "left" ? 1 : 2,
      title: recipe.name,
      locale: "en",
    }];
  }
  const sides = definition.view === "left"
    ? ["left"] as const
    : definition.view === "right"
      ? ["right"] as const
      : ["left", "right"] as const;
  return sides.map((pageSide) => ({
    pageId: `${fixtureId}:${pageSide}`,
    pageSide,
    mode,
    pageNumber: pageSide === "left" ? 1 : 2,
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
  if (compatibility.code === "note-too-long" || compatibility.code === "note-too-many-lines") {
    return recipe.slots.find((slot) => slot.kind === "note")?.id ?? "recipe-content";
  }
  return compatibility.code === "too-much-content" ? "content-capacity" : "recipe-content";
}
