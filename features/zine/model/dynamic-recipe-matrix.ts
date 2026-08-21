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
import {
  DYNAMIC_PREVIEW_SCENARIO_IDS,
  DYNAMIC_RECIPE_IDS,
  getDynamicRecipeDefinition,
} from "./dynamic-recipe-definitions";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export type DynamicPreviewMode = "editor" | "reader";
export type DynamicPreviewView = "left" | "right" | "spread";
export type DynamicPreviewRecipeId = (typeof DYNAMIC_RECIPE_IDS)[keyof typeof DYNAMIC_RECIPE_IDS];
export type DynamicPreviewScenarioId = (typeof DYNAMIC_PREVIEW_SCENARIO_IDS)[number];

type DynamicPreviewPhotoDefinition = {
  readonly asset: ReferencePreviewAssetId;
  readonly caption?: string;
  readonly focusX?: number;
  readonly focusY?: number;
};

export type DynamicPreviewScenarioDefinition = {
  readonly recipeId: DynamicPreviewRecipeId;
  readonly id: DynamicPreviewScenarioId;
  readonly label: string;
  readonly photos: readonly DynamicPreviewPhotoDefinition[];
  readonly view?: DynamicPreviewView;
  readonly placements?: readonly Partial<RecipePlacement>[];
};

export type DynamicPreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type DynamicPreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: DynamicPreviewScenarioId;
  readonly mode: DynamicPreviewMode;
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly DynamicPreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

const edgeThrustScenarios: readonly DynamicPreviewScenarioDefinition[] = [
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "empty", "Empty · needs one directional photograph", []),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "exact-one", "Exact one directional photograph", [photo("landscape")]),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "over-capacity-two", "Second photograph remains unplaced", photos(2, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "landscape", "Landscape directional source", [photo("landscape")]),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "square", "Square crop pressure", [photo("square")]),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "portrait-risk", "Portrait severe crop risk", [photo("portrait")]),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "ultra-wide-risk", "Ultra-wide endpoint risk", [photo("ultraWide")]),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "left-page", "Left page · x=0 remains the declared active edge", [photo("landscape")], "left"),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "right-page-direction-mismatch", "Right page · geometry is not silently mirrored", [photo("landscape")], "right"),
  scenario(
    DYNAMIC_RECIPE_IDS.edgeThrust,
    "off-center-focus",
    "Persisted focus moves the subject toward the safe endpoint",
    [photo("landscape", "", 68, 46)],
    "left",
    [{ focusX: 68, focusY: 46, scale: 1.3 }],
  ),
  scenario(
    DYNAMIC_RECIPE_IDS.edgeThrust,
    "terminal-edge-pressure",
    "Subject pressure at the right paper endpoint",
    [photo("portrait", "", 91, 52)],
    "left",
    [{ focusX: 91, focusY: 52, scale: 1.2 }],
  ),
  scenario(DYNAMIC_RECIPE_IDS.edgeThrust, "photo-note-hidden", "Source Photo Note is retained but not rendered", [photo("landscape", "Hidden source Note.")]),
];

const dropSequenceScenarios: readonly DynamicPreviewScenarioDefinition[] = [
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "empty", "Empty · needs three ordered action phases", []),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "one-photo", "One photograph · needs two more phases", photos(1, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "two-photos", "Two photographs · impact is missing", photos(2, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "exact-three", "Exact three · two phases and one impact", photos(3, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "over-capacity-four", "Fourth photograph remains unplaced", photos(4, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "three-landscape", "Three landscape action frames", photos(3, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "three-square", "Three square action frames", photos(3, "square")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "three-portrait", "Three portrait crop risks", photos(3, "portrait")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "three-mixed-ratios", "Mixed phase and impact ratios", [photo("landscape"), photo("square"), photo("portrait")]),
  scenario(
    DYNAMIC_RECIPE_IDS.dropSequence,
    "three-independent-focus",
    "Each action phase persists its own focus",
    [photo("landscape", "", 16, 42), photo("square", "", 52, 28), photo("landscape", "", 84, 66)],
    "left",
    [
      { focusX: 16, focusY: 42, scale: 1.1 },
      { focusX: 52, focusY: 28, scale: 1.2 },
      { focusX: 84, focusY: 66, scale: 1.35 },
    ],
  ),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "stable-sequence", "Stable phase-01 → phase-02 → impact order", photos(3, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "fixed-direction-gap", "Fixed .10 vertical drop gap", photos(3, "landscape")),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "left-page", "Left page topology", photos(3, "square"), "left"),
  scenario(DYNAMIC_RECIPE_IDS.dropSequence, "right-page", "Right page uses the same topology", photos(3, "square"), "right"),
  scenario(
    DYNAMIC_RECIPE_IDS.dropSequence,
    "phase-edge-pressure",
    "Action extremities pressure both phase edges",
    [photo("portrait", "", 5, 35), photo("portrait", "", 95, 45), photo("landscape", "", 50, 90)],
    "left",
    [{ focusX: 5, focusY: 35 }, { focusX: 95, focusY: 45 }, { focusX: 50, focusY: 90 }],
  ),
];

const gutterSweepScenarios: readonly DynamicPreviewScenarioDefinition[] = [
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "empty", "Empty · needs one continuous wide photograph", [], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "exact-one", "Exact one atomic spread photograph", [photo("landscape")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "over-capacity-two", "Second photograph remains unplaced", photos(2, "landscape"), "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "landscape", "Landscape sweep", [photo("landscape")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "ultra-wide-risk", "Ultra-wide continuous environment", [photo("ultraWide")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "square", "Square crop pressure", [photo("square")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "portrait-risk", "Portrait incompatibility risk", [photo("portrait")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "photo-note-hidden", "Source Photo Note remains hidden", [photo("landscape", "Hidden source Note.")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "complete-spread", "Complete left-to-right atomic spread", [photo("landscape")], "spread"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "left-plan", "Left local Render Plan", [photo("landscape")], "left"),
  scenario(DYNAMIC_RECIPE_IDS.gutterSweep, "right-plan", "Right local Render Plan", [photo("landscape")], "right"),
  scenario(
    DYNAMIC_RECIPE_IDS.gutterSweep,
    "focus-continuity",
    "One placement and focus continue across both pages",
    [photo("landscape", "", 72, 44)],
    "spread",
    [{ focusX: 72, focusY: 44, scale: 1.35 }],
  ),
  scenario(
    DYNAMIC_RECIPE_IDS.gutterSweep,
    "gutter-center-risk",
    "Center subject pressure exposes the gutter risk",
    [photo("square", "", 50, 50)],
    "spread",
    [{ focusX: 50, focusY: 50, scale: 1.15 }],
  ),
];

export const dynamicPreviewScenarios: readonly DynamicPreviewScenarioDefinition[] = [
  ...edgeThrustScenarios,
  ...dropSequenceScenarios,
  ...gutterSweepScenarios,
];

export function createDynamicPreviewMatrix(): readonly DynamicPreviewCell[] {
  return dynamicPreviewScenarios.flatMap((definition) => (
    (["editor", "reader"] as const).map((mode) => createDynamicPreviewCell(definition, mode))
  ));
}

export function createDynamicPreviewCell(
  definition: DynamicPreviewScenarioDefinition,
  mode: DynamicPreviewMode,
): DynamicPreviewCell {
  const recipe = getDynamicRecipeDefinition(definition.recipeId, 1) as RecipeDefinition | null;
  if (!recipe) throw new Error(`Missing Dynamic Recipe Definition ${definition.recipeId}@1.`);

  const fixtureId = `dynamic-fixture-${definition.recipeId}-${definition.id}`;
  const createdPhotos = definition.photos.map((item, index) => createDynamicPhoto(fixtureId, item, index));
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
  const environments = createDynamicEnvironments(recipe, view, fixtureId, mode);
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
    content,
    photos: createdPhotos,
    application,
    environments,
    plans,
    slotIds: [...new Set(plans.flatMap((plan) => plan.slots.map((slot) => slot.id)))],
    errors,
    compatibility,
    compatibilitySlotId: compatibility.code === "too-much-content" ? "content-capacity" : "recipe-content",
  };
}

function scenario(
  recipeId: DynamicPreviewRecipeId,
  id: DynamicPreviewScenarioId,
  label: string,
  scenarioPhotos: readonly DynamicPreviewPhotoDefinition[],
  view: DynamicPreviewView = "left",
  placements?: readonly Partial<RecipePlacement>[],
): DynamicPreviewScenarioDefinition {
  return { recipeId, id, label, photos: scenarioPhotos, view, placements };
}

function photo(
  asset: ReferencePreviewAssetId,
  caption = "",
  focusX = 50,
  focusY = 50,
): DynamicPreviewPhotoDefinition {
  return { asset, caption, focusX, focusY };
}

function photos(count: number, asset: ReferencePreviewAssetId) {
  return Array.from({ length: count }, () => photo(asset));
}

function createDynamicPhoto(
  fixtureId: string,
  definition: DynamicPreviewPhotoDefinition,
  index: number,
): ZinePhoto {
  const dimensions = getAssetDimensions(definition.asset);
  return {
    id: `${fixtureId}:photo-${String(index + 1).padStart(2, "0")}`,
    file: {} as File,
    previewUrl: referencePreviewAssets[definition.asset],
    fileName: `${definition.asset}-dynamic-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption: definition.caption ?? "",
    defaultFocusX: definition.focusX ?? 50,
    defaultFocusY: definition.focusY ?? 50,
  };
}

function createDynamicEnvironments(
  recipe: RecipeDefinition,
  view: DynamicPreviewView,
  fixtureId: string,
  mode: DynamicPreviewMode,
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
    pageNumber: pageSide === "left" ? 30 : 31,
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
