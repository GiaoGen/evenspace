import {
  createRecipeApplication,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type RecipeContent,
  type RecipeCompatibility,
  type RecipeDefinition,
} from "./recipe-contract";
import { createContentItemId, createPhotoFocusDefaults } from "./recipe-placement";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import { referenceRecipeDefinitions } from "./reference-recipe-definitions";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export const referencePreviewScenarios = [
  { id: "empty", label: "Empty content" },
  { id: "minimum", label: "Minimum content" },
  { id: "maximum", label: "Maximum content" },
  { id: "over-capacity", label: "Over-capacity content" },
  { id: "landscape", label: "Landscape ratio" },
  { id: "portrait", label: "Portrait ratio" },
  { id: "square", label: "Square ratio" },
  { id: "ultra-wide", label: "Ultra-wide ratio" },
  { id: "no-note", label: "No Note" },
  { id: "short-note", label: "Short Note" },
  { id: "long-note", label: "Long Note" },
  { id: "note-overflow", label: "Note overflow" },
] as const;

export type ReferencePreviewScenario = (typeof referencePreviewScenarios)[number]["id"];
export type ReferencePreviewMode = "editor" | "reader";

export type ReferencePreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type ReferencePreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: ReferencePreviewScenario;
  readonly mode: ReferencePreviewMode;
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: ReturnType<typeof createRecipeApplication>;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly ReferencePreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

const shortNote = "A short Photo Note for the reference gate.";
const longNote = "A long Photo Note tests wrapping without hiding the final word.";
const overflowNote = "This deliberately overlong Photo Note exercises the Compatibility guard before Canvas text can be clipped. ".repeat(4);

export function createReferencePreviewMatrix(): readonly ReferencePreviewCell[] {
  return referenceRecipeDefinitions.flatMap((recipe) => (
    referencePreviewScenarios.flatMap(({ id: scenario, label }) => (
      (["editor", "reader"] as const).map((mode) => (
        createReferencePreviewCell(recipe, scenario, mode, label)
      ))
    ))
  ));
}

export function createReferencePreviewCell(
  recipe: RecipeDefinition,
  scenario: ReferencePreviewScenario,
  mode: ReferencePreviewMode,
  scenarioLabel: string = scenario,
): ReferencePreviewCell {
  const fixtureId = `fixture-${recipe.id}-${scenario}`;
  const content = createReferenceContent(recipe, fixtureId, scenario);
  const pageIds = recipe.scope === "spread"
    ? [`${fixtureId}:left`, `${fixtureId}:right`]
    : [`${fixtureId}:page`];
  const environments = pageIds.map((pageId, index) => ({
    pageId,
    pageSide: recipe.scope === "spread" && index === 1 ? "right" : "left",
    mode,
    pageNumber: index + 1,
    title: recipe.name,
  } satisfies RecipeRenderEnvironment));
  const application = createRecipeApplication({
    recipe,
    content: {
      ...content,
      defaultFocusByPhotoId: createPhotoFocusDefaults(content.photos),
    },
    anchorPageId: pageIds[0] ?? fixtureId,
    targetPageIds: pageIds,
  });
  const plans = environments.map((environment) => createRecipeRenderPlan({
    recipe,
    application,
    photos: content.photos,
    environment,
  }));
  const validation = validateRecipeDefinition(recipe);
  const compatibility = evaluateRecipeCompatibility(recipe, {
    photoIds: content.photoIds,
    notesByPhotoId: content.notesByPhotoId,
  });
  const errors = validation.issues.map((issue) => ({
    slotId: locateIssueSlotId(issue.message, recipe),
    message: issue.message,
  }));
  const slotIds = [...new Set(plans.flatMap((plan) => plan.slots.map((slot) => slot.id)))];

  return {
    id: `${recipe.id}:${scenario}:${mode}`,
    recipeId: recipe.id,
    recipe,
    fixtureId,
    fixtureLabel: `${scenarioLabel} · ${mode === "editor" ? "Editor" : "Reader"}`,
    scenario,
    mode,
    content,
    photos: content.photos,
    application,
    environments,
    plans,
    slotIds,
    errors,
    compatibility,
    compatibilitySlotId: locateCompatibilitySlotId(compatibility, recipe),
  };
}

function createReferenceContent(
  recipe: RecipeDefinition,
  fixtureId: string,
  scenario: ReferencePreviewScenario,
) {
  const photoCount = getPhotoCount(recipe, scenario);
  const photos = Array.from({ length: photoCount }, (_, index) => createReferencePhoto({
    id: `${fixtureId}:photo-${index + 1}`,
    recipeId: recipe.id,
    scenario,
    index,
    caption: getCaption(recipe, scenario, index),
  }));
  return {
    photoIds: photos.map((photo) => photo.id),
    contentItemIds: photos.map((_, index) => createContentItemId(fixtureId, index)),
    notesByPhotoId: Object.fromEntries(photos.map((photo) => [photo.id, photo.caption])),
    photos,
  } satisfies RecipeContent & { readonly photos: readonly ZinePhoto[] };
}

function getPhotoCount(recipe: RecipeDefinition, scenario: ReferencePreviewScenario) {
  if (scenario === "empty") return 0;
  if (scenario === "minimum") return recipe.capabilities.photos.min;
  if (scenario === "maximum") return recipe.capabilities.photos.max;
  if (scenario === "over-capacity") return recipe.capabilities.photos.max + 1;
  return 1;
}

function getCaption(recipe: RecipeDefinition, scenario: ReferencePreviewScenario, index: number) {
  if (scenario === "no-note") return "";
  if (scenario === "note-overflow") return overflowNote;
  if (scenario === "long-note") return longNote;
  if (scenario === "short-note") return shortNote;
  if (recipe.capabilities.notes.mode === "none") return "";
  if (scenario === "minimum") return index === 0 ? shortNote : `Indexed Note ${index + 1}.`;
  if (scenario === "maximum" || scenario === "over-capacity") return `Indexed Note ${index + 1}.`;
  return `${scenario[0]?.toUpperCase() ?? ""}${scenario.slice(1)} ratio Note.`;
}

function createReferencePhoto({
  id,
  recipeId,
  scenario,
  index,
  caption,
}: {
  readonly id: string;
  readonly recipeId: string;
  readonly scenario: ReferencePreviewScenario;
  readonly index: number;
  readonly caption: string;
}): ZinePhoto {
  const assetId = getAssetId(recipeId, scenario, index);
  const dimensions = getAssetDimensions(assetId);
  return {
    id,
    file: {} as File,
    previewUrl: referencePreviewAssets[assetId],
    fileName: `${assetId}-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption,
    defaultFocusX: index % 2 === 0 ? 44 : 62,
    defaultFocusY: index % 2 === 0 ? 48 : 56,
  };
}

function getAssetId(
  recipeId: string,
  scenario: ReferencePreviewScenario,
  index: number,
): ReferencePreviewAssetId {
  if (recipeId.includes("color-system")) return "color";
  if (scenario === "portrait") return "portrait";
  if (scenario === "square") return "square";
  if (scenario === "ultra-wide") return "ultraWide";
  if (scenario === "maximum" || scenario === "over-capacity") {
    return (["landscape", "portrait", "square", "ultraWide"] as const)[index % 4] ?? "landscape";
  }
  return "landscape";
}

function getAssetDimensions(assetId: ReferencePreviewAssetId) {
  switch (assetId) {
    case "portrait": return { width: 900, height: 1600 };
    case "square": return { width: 1200, height: 1200 };
    case "ultraWide": return { width: 2400, height: 700 };
    case "color": return { width: 1200, height: 1200 };
    case "landscape": return { width: 1600, height: 900 };
  }
}

function locateIssueSlotId(message: string, recipe: RecipeDefinition) {
  const matchedSlot = recipe.slots.find((slot) => message.includes(slot.id));
  return matchedSlot?.id ?? "recipe-definition";
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
