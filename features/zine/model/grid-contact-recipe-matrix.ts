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
  GRID_CONTACT_PREVIEW_SCENARIO_IDS,
  GRID_CONTACT_RECIPE_IDS,
  getGridContactRecipeDefinition,
} from "./grid-contact-recipe-definitions";
import { createContentItemId, type RecipePlacement } from "./recipe-placement";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export type GridContactPreviewMode = "editor" | "reader";
export type GridContactPreviewView = "left" | "right" | "spread";
export type GridContactPreviewRecipeId = (typeof GRID_CONTACT_RECIPE_IDS)[keyof typeof GRID_CONTACT_RECIPE_IDS];
export type GridContactPreviewScenarioId = (typeof GRID_CONTACT_PREVIEW_SCENARIO_IDS)[number];

type GridContactPreviewPhotoDefinition = {
  readonly asset: ReferencePreviewAssetId;
  readonly caption?: string;
  readonly focusX?: number;
  readonly focusY?: number;
};

export type GridContactPreviewScenarioDefinition = {
  readonly recipeId: GridContactPreviewRecipeId;
  readonly id: GridContactPreviewScenarioId;
  readonly label: string;
  readonly photos: readonly GridContactPreviewPhotoDefinition[];
  readonly view?: GridContactPreviewView;
  readonly placements?: readonly Partial<RecipePlacement>[];
};

export type GridContactPreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type GridContactPreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: GridContactPreviewScenarioId;
  readonly mode: GridContactPreviewMode;
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly GridContactPreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

export const crossRegisterLatin18 = "Archival frame one";
export const crossRegisterNumeric18 = "202608140102030405";
export const crossRegisterCjk18 = "甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未";
export const crossRegisterLongWord18 = "characteristically";

const twinRegisterScenarios: readonly GridContactPreviewScenarioDefinition[] = [
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "empty", "Empty · needs two photos", []),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "one-photo", "One photo · needs content", photos(1, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "exact-two", "Exact two equal-weight samples", photos(2, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "over-capacity-three", "Over-capacity · third remains unplaced", photos(3, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "landscape-pair", "Landscape pair", photos(2, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "square-pair", "Square pair", photos(2, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "portrait-pair", "Portrait pair crop pressure", photos(2, "portrait")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "mixed-ratios", "Mixed landscape / portrait", [photo("landscape"), photo("portrait")]),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "ultra-wide-risk", "Ultra-wide pair risk", photos(2, "ultraWide")),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "left-page", "Left page", photos(2, "landscape"), "left"),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "right-page", "Right page", photos(2, "landscape"), "right"),
  scenario(
    GRID_CONTACT_RECIPE_IDS.twinRegister,
    "independent-focus",
    "Independent focus for both equal samples",
    [photo("landscape", "", 18, 72), photo("landscape", "", 82, 28)],
    "left",
    [{ focusX: 18, focusY: 72, scale: 1.25 }, { focusX: 82, focusY: 28, scale: 1.4 }],
  ),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "photo-note-hidden", "Photo Notes retained but hidden", [
    photo("landscape", "Hidden Note A."),
    photo("landscape", "Hidden Note B."),
  ]),
  scenario(GRID_CONTACT_RECIPE_IDS.twinRegister, "literal-source", "A/B literal source", photos(2, "landscape")),
];

const twelveUpScenarios: readonly GridContactPreviewScenarioDefinition[] = [
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "empty", "Empty · needs twelve photos", []),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "one-photo", "One photo · needs content", photos(1, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "eleven-photos", "Eleven photos · needs content", photos(11, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "exact-twelve", "Exact twelve", photos(12, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "over-capacity-thirteen", "Thirteenth photo remains unplaced", photos(13, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "twelve-square", "Twelve square photographs", photos(12, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "twelve-landscape", "Twelve landscape photographs", photos(12, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "twelve-portrait", "Twelve portrait photographs", photos(12, "portrait")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "twelve-mixed-ratios", "Twelve mixed ratios in stable input order", photos(12, (index) => (["square", "landscape", "portrait", "ultraWide"] as const)[index % 4]!)),
  scenario(
    GRID_CONTACT_RECIPE_IDS.twelveUpLedger,
    "twelve-independent-focus",
    "Twelve independently persisted focuses",
    photos(12, "square", (index) => ({ focusX: 8 + index * 7, focusY: 92 - index * 6 })),
    "left",
    Array.from({ length: 12 }, (_, index) => ({ focusX: 8 + index * 7, focusY: 92 - index * 6, scale: 1 + index * .03 })),
  ),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "edge-subject-pressure", "Subject-edge pressure across all modules", photos(12, "portrait", (index) => ({ focusX: index % 2 === 0 ? 5 : 95, focusY: index < 6 ? 8 : 92 }))),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "three-by-four-topology", "3×4 topology", photos(12, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "six-plus-six-group-gap", "Six-plus-six group gap", photos(12, "landscape")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "folio-page-number", "Folio from page number", photos(12, "square")),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "left-page", "Left page", photos(12, "square"), "left"),
  scenario(GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "right-page", "Right page", photos(12, "square"), "right"),
];

const validNotes = ["Index one", "Index two", "Index three", "Index four"] as const;
const shortNotes = ["A", "B2", "C-3", "D004"] as const;
const exactLatinNotes = Array.from({ length: 4 }, () => crossRegisterLatin18);
const exactNumericNotes = Array.from({ length: 4 }, () => crossRegisterNumeric18);
const exactCjkNotes = Array.from({ length: 4 }, () => crossRegisterCjk18);
const exactLongWordNotes = Array.from({ length: 4 }, () => crossRegisterLongWord18);

const crossRegisterScenarios: readonly GridContactPreviewScenarioDefinition[] = [
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "empty", "Empty · needs four photos and four Notes", [], "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "one-note-photo", "One photo with Note", notePhotos(["Index one"]), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "two-note-photos", "Two photos with Notes", notePhotos(validNotes.slice(0, 2)), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "three-note-photos", "Three photos with Notes", notePhotos(validNotes.slice(0, 3)), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "four-photos-no-notes", "Four photos · all required Notes missing", photos(4, "square"), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "missing-one-required-note", "One required Note missing", notePhotos([validNotes[0], validNotes[1], validNotes[2], ""]), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "exact-four-valid-notes", "Exact four photos + four valid Notes", notePhotos(validNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "fifth-photo", "Fifth photo remains unplaced", [...notePhotos(validNotes), photo("square", "Extra")], "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "short-notes", "Four short Notes", notePhotos(shortNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "exact-18-latin", "Four exact 18-character Latin Notes", notePhotos(exactLatinNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "exact-18-numeric", "Four exact 18-character numeric Notes", notePhotos(exactNumericNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "exact-18-cjk", "Four exact 18-character CJK/full-width Notes", notePhotos(exactCjkNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "over-18-characters", "Nineteen characters · rejected", notePhotos(["x".repeat(19), ...validNotes.slice(1)]), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "within-18-over-one-line", "Within 18 characters · explicit two-line rejection", notePhotos(["one\ntwo", ...validNotes.slice(1)]), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "long-word", "Exact 18-character indivisible word", notePhotos(exactLongWordNotes), "spread"),
  scenario(
    GRID_CONTACT_RECIPE_IDS.crossRegister,
    "four-independent-focus",
    "Four independently persisted focuses",
    notePhotos(validNotes, (index) => ({ focusX: [12, 88, 24, 76][index]!, focusY: [18, 32, 82, 68][index]! })),
    "spread",
    [
      { focusX: 12, focusY: 18, scale: 1.1 },
      { focusX: 88, focusY: 32, scale: 1.2 },
      { focusX: 24, focusY: 82, scale: 1.3 },
      { focusX: 76, focusY: 68, scale: 1.4 },
    ],
  ),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "complete-spread", "Complete atomic spread", notePhotos(validNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "left-plan", "Left plan · matrix and left folio only", notePhotos(validNotes), "left"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "right-plan", "Right plan · INDEX, four Notes, right folio", notePhotos(validNotes), "right"),
  scenario(
    GRID_CONTACT_RECIPE_IDS.crossRegister,
    "focus-continuity",
    "Shared Application identity and focus continuity",
    notePhotos(validNotes, (index) => ({ focusX: 20 + index * 20, focusY: 75 - index * 15 })),
    "spread",
    Array.from({ length: 4 }, (_, index) => ({ focusX: 20 + index * 20, focusY: 75 - index * 15, scale: 1.15 + index * .1 })),
  ),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "four-cross-page-evidence", "Exactly four cross-page-pair evidence items", notePhotos(validNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "stable-photo-note-binding", "Stable photoId → Note binding", notePhotos(validNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "stable-ordering", "Stable record-01 → record-04 ordering", notePhotos(validNotes), "spread"),
  scenario(GRID_CONTACT_RECIPE_IDS.crossRegister, "page-number-folios", "Left and right page-number folios", notePhotos(validNotes), "spread"),
];

export const gridContactPreviewScenarios: readonly GridContactPreviewScenarioDefinition[] = [
  ...twinRegisterScenarios,
  ...twelveUpScenarios,
  ...crossRegisterScenarios,
];

export function createGridContactPreviewMatrix(): readonly GridContactPreviewCell[] {
  return gridContactPreviewScenarios.flatMap((definition) => (
    (["editor", "reader"] as const).map((mode) => createGridContactPreviewCell(definition, mode))
  ));
}

export function createGridContactPreviewCell(
  definition: GridContactPreviewScenarioDefinition,
  mode: GridContactPreviewMode,
): GridContactPreviewCell {
  const recipe = getGridContactRecipeDefinition(definition.recipeId, 1) as RecipeDefinition | null;
  if (!recipe) throw new Error(`Missing Grid/Contact Recipe Definition ${definition.recipeId}@1.`);

  const fixtureId = `grid-contact-fixture-${definition.recipeId}-${definition.id}`;
  const createdPhotos = definition.photos.map((item, index) => createGridContactPhoto(fixtureId, item, index));
  const content = {
    photoIds: createdPhotos.map((item) => item.id),
    contentItemIds: createdPhotos.map((_, index) => createContentItemId(fixtureId, index)),
    notesByPhotoId: Object.fromEntries(createdPhotos.map((item) => [item.id, item.caption])),
    defaultFocusByPhotoId: Object.fromEntries(createdPhotos.map((item) => [item.id, {
      focusX: item.defaultFocusX,
      focusY: item.defaultFocusY,
    }])),
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
  const environments = createGridContactEnvironments(recipe, view, fixtureId, mode);
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
    compatibilitySlotId: locateCompatibilitySlotId(compatibility, recipe),
  };
}

function scenario(
  recipeId: GridContactPreviewRecipeId,
  id: GridContactPreviewScenarioId,
  label: string,
  scenarioPhotos: readonly GridContactPreviewPhotoDefinition[],
  view: GridContactPreviewView = "left",
  placements?: readonly Partial<RecipePlacement>[],
): GridContactPreviewScenarioDefinition {
  return { recipeId, id, label, photos: scenarioPhotos, view, placements };
}

function photo(
  asset: ReferencePreviewAssetId,
  caption = "",
  focusX = 50,
  focusY = 50,
): GridContactPreviewPhotoDefinition {
  return { asset, caption, focusX, focusY };
}

function photos(
  count: number,
  asset: ReferencePreviewAssetId | ((index: number) => ReferencePreviewAssetId),
  focus?: (index: number) => { readonly focusX: number; readonly focusY: number },
) {
  return Array.from({ length: count }, (_, index) => {
    const selectedAsset = typeof asset === "function" ? asset(index) : asset;
    const selectedFocus = focus?.(index);
    return photo(selectedAsset, "", selectedFocus?.focusX ?? 50, selectedFocus?.focusY ?? 50);
  });
}

function notePhotos(
  notes: readonly string[],
  focus?: (index: number) => { readonly focusX: number; readonly focusY: number },
) {
  return notes.map((note, index) => {
    const selectedFocus = focus?.(index);
    return photo(index % 2 === 0 ? "square" : "portrait", note, selectedFocus?.focusX ?? 50, selectedFocus?.focusY ?? 50);
  });
}

function createGridContactPhoto(
  fixtureId: string,
  definition: GridContactPreviewPhotoDefinition,
  index: number,
): ZinePhoto {
  const dimensions = getAssetDimensions(definition.asset);
  return {
    id: `${fixtureId}:photo-${String(index + 1).padStart(2, "0")}`,
    file: {} as File,
    previewUrl: referencePreviewAssets[definition.asset],
    fileName: `${definition.asset}-grid-contact-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption: definition.caption ?? "",
    defaultFocusX: definition.focusX ?? 50,
    defaultFocusY: definition.focusY ?? 50,
  };
}

function createGridContactEnvironments(
  recipe: RecipeDefinition,
  view: GridContactPreviewView,
  fixtureId: string,
  mode: GridContactPreviewMode,
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
    pageNumber: pageSide === "left" ? 24 : 25,
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
