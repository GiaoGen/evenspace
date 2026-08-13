import {
  deriveSpreadEvidence,
  validateRecipeDefinition,
  type RecipeDefinition,
  type RecipeNoteMode,
  type RecipeRelationKind,
  type RecipeRef,
  type RecipeScope,
  type RecipeStatus,
} from "./recipe-contract";
import { runtimeRecipeDefinitions } from "./recipe-definition-registry";
import { QUIET_RECIPE_IDS, quietRecipeDefinitions } from "./quiet-recipe-definitions";
import {
  EDITORIAL_PREVIEW_SCENARIO_IDS,
  EDITORIAL_RECIPE_IDS,
  editorialRecipeDefinitions,
} from "./editorial-recipe-definitions";
import {
  GRID_CONTACT_PREVIEW_SCENARIO_IDS,
  GRID_CONTACT_RECIPE_IDS,
  gridContactRecipeDefinitions,
} from "./grid-contact-recipe-definitions";
import { referenceRecipeDefinitions } from "./reference-recipe-definitions";

export const RECIPE_CATALOG_SCHEMA_VERSION = 1 as const;

export const RECIPE_CATALOG_PREVIEW_SCENARIO_IDS = [
  "empty",
  "minimum",
  "maximum",
  "over-capacity",
  "landscape",
  "portrait",
  "square",
  "ultra-wide",
  "no-note",
  "short-note",
  "long-note",
  "note-overflow",
  "multi-note",
  "left-page",
  "right-page",
  "standard-spread",
  "cross-gutter",
  "dark-background",
  "color-system",
  ...EDITORIAL_PREVIEW_SCENARIO_IDS,
  ...GRID_CONTACT_PREVIEW_SCENARIO_IDS,
] as const;

export type RecipeCatalogPreviewScenarioId = (typeof RECIPE_CATALOG_PREVIEW_SCENARIO_IDS)[number];
export type RecipeImageRatio = "landscape" | "portrait" | "square" | "ultra-wide";
export type RecipeCatalogFamilyId = "editorial" | "grid-contact" | "quiet" | "dynamic" | "chromatic";
export type RecipeSlotTopology =
  | "single"
  | "diptych"
  | "stack"
  | "band"
  | "grid"
  | "mosaic"
  | "index"
  | "cross-gutter"
  | "cross-page-pair";
export type RecipeCompositionAxis = "horizontal" | "vertical" | "diagonal" | "center" | "edge" | "around";
export type RecipeReadingDirection = "ltr" | "rtl" | "top-down" | "bottom-up" | "inward" | "outward" | "radial";
export type RecipeColorStrategy = "paper" | "single-accent" | "zoned" | "rhythmic";
export type RecipePace = "slow" | "medium" | "fast";
export type RecipeRiskLevel = "low" | "medium" | "high";

export type RecipeCatalogEntry = {
  readonly catalogSchemaVersion: typeof RECIPE_CATALOG_SCHEMA_VERSION;
  readonly recipe: RecipeRef;
  readonly familyId: RecipeCatalogFamilyId;
  readonly status: RecipeStatus;
  readonly authoring: {
    readonly ratios: {
      readonly preferred: readonly RecipeImageRatio[];
      readonly risky: readonly RecipeImageRatio[];
    };
    readonly slotTopology: RecipeSlotTopology;
    readonly compositionAxis: RecipeCompositionAxis;
    readonly readingDirection: RecipeReadingDirection;
    readonly colorStrategy: RecipeColorStrategy;
    readonly pace: RecipePace;
    readonly subjectEdgeRisk: RecipeRiskLevel;
    readonly gutterRisk: RecipeRiskLevel;
  };
  readonly previewScenarioIds: readonly RecipeCatalogPreviewScenarioId[];
};

export type DerivedRecipeFacts = {
  readonly scope: RecipeScope;
  readonly photoCountRange: {
    readonly min: number;
    readonly max: number;
    readonly slots: number;
  };
  readonly density: "low" | "medium" | "high";
  readonly dominantImageScale: "small" | "medium" | "large" | "full";
  readonly noteModeAndRelations: {
    readonly mode: RecipeNoteMode;
    readonly relations: readonly RecipeRelationKind[];
  };
  readonly bleedPattern: "none" | "partial" | "full" | "cross-gutter";
};

export type RecipeCatalogIssue = {
  readonly code:
    | "schema"
    | "definition-missing"
    | "definition-version"
    | "definition-invalid"
    | "duplicate"
    | "enum"
    | "preview-scenario"
    | "contradiction";
  readonly message: string;
};

export type RecipeCatalogValidation = {
  readonly valid: boolean;
  readonly issues: readonly RecipeCatalogIssue[];
  readonly definition: RecipeDefinition | null;
  readonly derivedFacts: DerivedRecipeFacts | null;
};

const catalogFamilyIds = new Set<RecipeCatalogFamilyId>([
  "editorial",
  "grid-contact",
  "quiet",
  "dynamic",
  "chromatic",
]);
const imageRatios = new Set<RecipeImageRatio>(["landscape", "portrait", "square", "ultra-wide"]);
const slotTopologies = new Set<RecipeSlotTopology>([
  "single",
  "diptych",
  "stack",
  "band",
  "grid",
  "mosaic",
  "index",
  "cross-gutter",
  "cross-page-pair",
]);
const compositionAxes = new Set<RecipeCompositionAxis>(["horizontal", "vertical", "diagonal", "center", "edge", "around"]);
const readingDirections = new Set<RecipeReadingDirection>(["ltr", "rtl", "top-down", "bottom-up", "inward", "outward", "radial"]);
const colorStrategies = new Set<RecipeColorStrategy>(["paper", "single-accent", "zoned", "rhythmic"]);
const paces = new Set<RecipePace>(["slow", "medium", "fast"]);
const riskLevels = new Set<RecipeRiskLevel>(["low", "medium", "high"]);
const statuses = new Set<RecipeStatus>(["draft", "active", "deprecated"]);

type CatalogDeclaration = Omit<RecipeCatalogEntry, "catalogSchemaVersion" | "recipe">;

const allCatalogDefinitions: readonly RecipeDefinition[] = [
  ...runtimeRecipeDefinitions,
  ...referenceRecipeDefinitions,
];

const commonScenarios = [
  "empty",
  "minimum",
  "maximum",
  "over-capacity",
  "landscape",
  "portrait",
  "square",
  "ultra-wide",
  "no-note",
  "short-note",
  "long-note",
  "note-overflow",
] as const satisfies readonly RecipeCatalogPreviewScenarioId[];

function createCatalogEntry(
  definition: RecipeDefinition,
  declaration: CatalogDeclaration,
): RecipeCatalogEntry {
  return {
    catalogSchemaVersion: RECIPE_CATALOG_SCHEMA_VERSION,
    recipe: { id: definition.id, version: definition.version },
    ...declaration,
  };
}

/**
 * These declarations describe the current runtime and Reference fixtures;
 * they do not introduce new Recipe layouts. Reference entries stay draft.
 */
export const recipeCatalogEntries: readonly RecipeCatalogEntry[] = [
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-editorial-v1")!, {
    familyId: "editorial",
    status: "active",
    authoring: {
      ratios: { preferred: ["portrait"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-contact-v1")!, {
    familyId: "grid-contact",
    status: "active",
    authoring: {
      ratios: { preferred: ["square", "portrait"], risky: ["ultra-wide"] },
      slotTopology: "grid",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "fast",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-margin-v1")!, {
    familyId: "quiet",
    status: "active",
    authoring: {
      ratios: { preferred: ["portrait"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "low",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-split-v1")!, {
    familyId: "dynamic",
    status: "active",
    authoring: {
      ratios: { preferred: ["landscape", "square"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "vertical",
      readingDirection: "top-down",
      colorStrategy: "single-accent",
      pace: "medium",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-night-v1")!, {
    familyId: "chromatic",
    status: "active",
    authoring: {
      ratios: { preferred: ["portrait", "landscape"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "single-accent",
      pace: "slow",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(runtimeRecipeDefinitions.find((recipe) => recipe.id === "recipe-reference-cross-gutter-v1")!, {
    familyId: "dynamic",
    status: "active",
    authoring: {
      ratios: { preferred: ["landscape", "ultra-wide"], risky: ["portrait"] },
      slotTopology: "cross-gutter",
      compositionAxis: "horizontal",
      readingDirection: "inward",
      colorStrategy: "single-accent",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "high",
    },
    previewScenarioIds: ["minimum", "maximum", "over-capacity", "landscape", "portrait", "standard-spread", "cross-gutter"],
  }),
  createCatalogEntry(quietRecipeDefinitions.find((recipe) => recipe.id === QUIET_RECIPE_IDS.heldField)!, {
    familyId: "quiet",
    status: "draft",
    authoring: {
      ratios: { preferred: ["portrait", "square"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(quietRecipeDefinitions.find((recipe) => recipe.id === QUIET_RECIPE_IDS.scaleEcho)!, {
    familyId: "quiet",
    status: "draft",
    authoring: {
      ratios: { preferred: ["square", "portrait", "landscape"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "diagonal",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(quietRecipeDefinitions.find((recipe) => recipe.id === QUIET_RECIPE_IDS.horizonBridge)!, {
    familyId: "quiet",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape"], risky: ["portrait", "ultra-wide"] },
      slotTopology: "cross-gutter",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "high",
      gutterRisk: "high",
    },
    previewScenarioIds: ["empty", "minimum", "maximum", "over-capacity", "landscape", "portrait", "square", "ultra-wide", "no-note", "left-page", "right-page", "standard-spread", "cross-gutter"],
  }),
  createCatalogEntry(editorialRecipeDefinitions.find((recipe) => recipe.id === EDITORIAL_RECIPE_IDS.evidenceAside)!, {
    familyId: "editorial",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape", "portrait", "square"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    },
    previewScenarioIds: EDITORIAL_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "one-photo",
      "exact-two",
      "over-capacity-three",
      "no-note",
      "short-note",
      "normal-latin-note",
      "numeric-note",
      "cjk-note",
      "long-word-note",
      "max-60-four-lines",
      "over-60",
      "over-four-lines",
      "main-landscape-evidence-portrait",
      "portrait-main-square-evidence",
      "landscape-evidence-severe-crop",
      "square-pair",
      "ultra-wide-risk",
      "left-page",
      "right-page",
      "two-independent-focus",
      "main-photo-note-no-evidence",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(editorialRecipeDefinitions.find((recipe) => recipe.id === EDITORIAL_RECIPE_IDS.acrossTheRecord)!, {
    familyId: "editorial",
    status: "draft",
    authoring: {
      ratios: { preferred: ["portrait", "square"], risky: ["landscape", "ultra-wide"] },
      slotTopology: "cross-page-pair",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "medium",
    },
    previewScenarioIds: EDITORIAL_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "empty-note",
      "one-character-note",
      "short-note",
      "across-cjk-note",
      "max-120-four-lines",
      "over-120",
      "over-four-lines",
      "over-capacity-two",
      "portrait",
      "square",
      "landscape-risk",
      "ultra-wide-risk",
      "complete-spread",
      "left-plan",
      "right-plan",
      "focus-continuity",
      "required-relation",
      "no-color-field",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(editorialRecipeDefinitions.find((recipe) => recipe.id === EDITORIAL_RECIPE_IDS.leadStory)!, {
    familyId: "editorial",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape", "square"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "vertical",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    },
    previewScenarioIds: EDITORIAL_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "photo-title-missing",
      "required-short-title",
      "required-title-without-deck",
      "short-title-deck",
      "cjk-title-deck",
      "long-latin-deck",
      "max-60-three-lines",
      "title-over-60",
      "title-over-three-lines",
      "max-76-deck-two-lines",
      "deck-over-76",
      "deck-over-two-lines",
      "owner-mismatch",
      "left-page-owned",
      "right-page-owned",
      "landscape",
      "portrait",
      "square",
      "ultra-wide",
      "off-center-focus",
      "photo-note-hidden",
      "deck-absence-fixed-geometry",
      "environment-title-ignored",
      "text-by-slot-ignored",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(gridContactRecipeDefinitions.find((recipe) => recipe.id === GRID_CONTACT_RECIPE_IDS.twinRegister)!, {
    familyId: "grid-contact",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape"], risky: ["portrait", "ultra-wide"] },
      slotTopology: "stack",
      compositionAxis: "vertical",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    },
    previewScenarioIds: GRID_CONTACT_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "one-photo",
      "exact-two",
      "over-capacity-three",
      "landscape-pair",
      "square-pair",
      "portrait-pair",
      "mixed-ratios",
      "ultra-wide-risk",
      "left-page",
      "right-page",
      "independent-focus",
      "photo-note-hidden",
      "literal-source",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(gridContactRecipeDefinitions.find((recipe) => recipe.id === GRID_CONTACT_RECIPE_IDS.twelveUpLedger)!, {
    familyId: "grid-contact",
    status: "draft",
    authoring: {
      ratios: { preferred: ["square", "landscape"], risky: ["portrait", "ultra-wide"] },
      slotTopology: "grid",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "fast",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    },
    previewScenarioIds: GRID_CONTACT_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "one-photo",
      "eleven-photos",
      "exact-twelve",
      "over-capacity-thirteen",
      "twelve-square",
      "twelve-landscape",
      "twelve-portrait",
      "twelve-mixed-ratios",
      "twelve-independent-focus",
      "edge-subject-pressure",
      "three-by-four-topology",
      "six-plus-six-group-gap",
      "folio-page-number",
      "left-page",
      "right-page",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(gridContactRecipeDefinitions.find((recipe) => recipe.id === GRID_CONTACT_RECIPE_IDS.crossRegister)!, {
    familyId: "grid-contact",
    status: "draft",
    authoring: {
      ratios: { preferred: ["square", "portrait"], risky: ["landscape", "ultra-wide"] },
      slotTopology: "cross-page-pair",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "high",
    },
    previewScenarioIds: GRID_CONTACT_PREVIEW_SCENARIO_IDS.filter((scenarioId) => [
      "empty",
      "one-note-photo",
      "two-note-photos",
      "three-note-photos",
      "four-photos-no-notes",
      "missing-one-required-note",
      "exact-four-valid-notes",
      "fifth-photo",
      "short-notes",
      "exact-18-latin",
      "exact-18-numeric",
      "exact-18-cjk",
      "over-18-characters",
      "within-18-over-one-line",
      "long-word",
      "four-independent-focus",
      "complete-spread",
      "left-plan",
      "right-plan",
      "focus-continuity",
      "four-cross-page-evidence",
      "stable-photo-note-binding",
      "stable-ordering",
      "page-number-folios",
    ].includes(scenarioId)) as readonly RecipeCatalogPreviewScenarioId[],
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-single-photo-no-note-v1")!, {
    familyId: "quiet",
    status: "draft",
    authoring: {
      ratios: { preferred: ["portrait"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "low",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-single-photo-note-v1")!, {
    familyId: "editorial",
    status: "draft",
    authoring: {
      ratios: { preferred: ["portrait"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-multi-photo-no-note-v1")!, {
    familyId: "grid-contact",
    status: "draft",
    authoring: {
      ratios: { preferred: ["square", "portrait"], risky: ["ultra-wide"] },
      slotTopology: "grid",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "fast",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-multi-photo-indexed-note-v1")!, {
    familyId: "grid-contact",
    status: "draft",
    authoring: {
      ratios: { preferred: ["square", "portrait"], risky: ["ultra-wide"] },
      slotTopology: "index",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "fast",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-cross-gutter-v1")!, {
    familyId: "dynamic",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape", "ultra-wide"], risky: ["portrait"] },
      slotTopology: "cross-gutter",
      compositionAxis: "horizontal",
      readingDirection: "inward",
      colorStrategy: "single-accent",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "high",
    },
    previewScenarioIds: ["minimum", "maximum", "over-capacity", "landscape", "portrait", "standard-spread", "cross-gutter"],
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-cross-page-pairs-v1")!, {
    familyId: "editorial",
    status: "draft",
    authoring: {
      ratios: { preferred: ["portrait", "landscape"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "horizontal",
      readingDirection: "inward",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "medium",
      gutterRisk: "medium",
    },
    previewScenarioIds: ["minimum", "maximum", "over-capacity", "landscape", "portrait", "standard-spread"],
  }),
  createCatalogEntry(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-multi-color-system-v1")!, {
    familyId: "chromatic",
    status: "draft",
    authoring: {
      ratios: { preferred: ["landscape", "square"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "zoned",
      pace: "medium",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    },
    previewScenarioIds: commonScenarios,
  }),
];

function getCoordinateWidth(recipe: RecipeDefinition) {
  return recipe.scope === "spread" ? 2 : 1;
}

export function deriveRecipeFacts(recipe: RecipeDefinition): DerivedRecipeFacts {
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const photoArea = photoSlots.reduce((sum, slot) => sum + slot.rect.width * slot.rect.height, 0);
  const canvasArea = getCoordinateWidth(recipe);
  const densityRatio = photoArea / canvasArea;
  const largestPhotoRatio = photoSlots.reduce(
    (largest, slot) => Math.max(largest, slot.rect.width * slot.rect.height / canvasArea),
    0,
  );
  const evidence = deriveSpreadEvidence(recipe);
  const hasBleed = photoSlots.some((slot) => slot.allowBleed === true);
  const hasFullBleed = photoSlots.some((slot) => {
    const maxX = getCoordinateWidth(recipe);
    return slot.allowBleed === true && (
      slot.rect.x <= 0 || slot.rect.y <= 0 || slot.rect.x + slot.rect.width >= maxX || slot.rect.y + slot.rect.height >= 1
    );
  });
  const relations = [...new Set(recipe.noteRelations.map((relation) => relation.kind))];

  return {
    scope: recipe.scope,
    photoCountRange: {
      min: recipe.capabilities.photos.min,
      max: recipe.capabilities.photos.max,
      slots: photoSlots.length,
    },
    density: densityRatio < .2 ? "low" : densityRatio < .5 ? "medium" : "high",
    dominantImageScale: largestPhotoRatio < .2 ? "small" : largestPhotoRatio < .45 ? "medium" : largestPhotoRatio < .75 ? "large" : "full",
    noteModeAndRelations: {
      mode: recipe.capabilities.notes.mode,
      relations,
    },
    bleedPattern: evidence.some((item) => item.kind === "cross-gutter-photo")
      ? "cross-gutter"
      : !hasBleed
        ? "none"
        : hasFullBleed
          ? "full"
          : "partial",
  };
}

function findCatalogDefinition(ref: RecipeRef, definitions: readonly RecipeDefinition[]) {
  return definitions.find((definition) => (
    definition.id === ref.id && definition.version === ref.version
  )) ?? null;
}

export function getRecipeCatalogEntry(
  ref: RecipeRef,
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
) {
  return entries.find((entry) => (
    entry.recipe.id === ref.id && entry.recipe.version === ref.version
  )) ?? null;
}

export type ActiveRecipeResolution = {
  readonly entry: RecipeCatalogEntry;
  readonly definition: RecipeDefinition;
  readonly validation: RecipeCatalogValidation;
};

export type DevelopmentRecipeResolution = {
  readonly entry: RecipeCatalogEntry | null;
  readonly definition: RecipeDefinition | null;
  readonly validation: RecipeCatalogValidation | null;
};

/** Production resolver: only exact, active, valid Catalog/Definition pairs pass. */
export function resolveActiveRecipe(
  ref: RecipeRef,
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
  definitions: readonly RecipeDefinition[] = allCatalogDefinitions,
): ActiveRecipeResolution | null {
  const entry = getRecipeCatalogEntry(ref, entries);
  if (!entry || entry.status !== "active") return null;
  const validation = validateRecipeCatalogEntry(entry, definitions);
  if (!validation.valid || !validation.definition) return null;
  if (validation.definition.id !== ref.id || validation.definition.version !== ref.version) return null;
  return { entry, definition: validation.definition, validation };
}

export function getActiveRecipeDefinition(
  ref: RecipeRef,
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
  definitions: readonly RecipeDefinition[] = allCatalogDefinitions,
) {
  return resolveActiveRecipe(ref, entries, definitions)?.definition ?? null;
}

/** Development-only query: keeps draft/deprecated/invalid diagnostics visible. */
export function resolveDevelopmentRecipe(
  ref: RecipeRef,
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
  definitions: readonly RecipeDefinition[] = allCatalogDefinitions,
): DevelopmentRecipeResolution {
  const entry = getRecipeCatalogEntry(ref, entries);
  if (!entry) return { entry: null, definition: null, validation: null };
  const validation = validateRecipeCatalogEntry(entry, definitions);
  return { entry, definition: validation.definition, validation };
}

export function getDevelopmentRecipeCatalogEntry(
  ref: RecipeRef,
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
) {
  return getRecipeCatalogEntry(ref, entries);
}

export function validateRecipeCatalogEntry(
  entry: RecipeCatalogEntry,
  definitions: readonly RecipeDefinition[] = allCatalogDefinitions,
): RecipeCatalogValidation {
  const issues: RecipeCatalogIssue[] = [];
  if (entry.catalogSchemaVersion !== RECIPE_CATALOG_SCHEMA_VERSION) {
    issues.push({ code: "schema", message: "Unsupported Recipe Catalog schema version." });
  }
  if (!catalogFamilyIds.has(entry.familyId)) {
    issues.push({ code: "enum", message: `Unknown Catalog family '${entry.familyId}'.` });
  }
  if (!statuses.has(entry.status)) {
    issues.push({ code: "enum", message: `Unknown Catalog status '${entry.status}'.` });
  }
  if (!slotTopologies.has(entry.authoring.slotTopology)) {
    issues.push({ code: "enum", message: `Unknown slot topology '${entry.authoring.slotTopology}'.` });
  }
  if (!compositionAxes.has(entry.authoring.compositionAxis)) {
    issues.push({ code: "enum", message: `Unknown composition axis '${entry.authoring.compositionAxis}'.` });
  }
  if (!readingDirections.has(entry.authoring.readingDirection)) {
    issues.push({ code: "enum", message: `Unknown reading direction '${entry.authoring.readingDirection}'.` });
  }
  if (!colorStrategies.has(entry.authoring.colorStrategy)) {
    issues.push({ code: "enum", message: `Unknown color strategy '${entry.authoring.colorStrategy}'.` });
  }
  if (!paces.has(entry.authoring.pace)) {
    issues.push({ code: "enum", message: `Unknown pace '${entry.authoring.pace}'.` });
  }
  if (!riskLevels.has(entry.authoring.subjectEdgeRisk) || !riskLevels.has(entry.authoring.gutterRisk)) {
    issues.push({ code: "enum", message: "Unknown subject-edge or gutter risk level." });
  }
  for (const ratio of [...entry.authoring.ratios.preferred, ...entry.authoring.ratios.risky]) {
    if (!imageRatios.has(ratio)) {
      issues.push({ code: "enum", message: `Unknown image ratio '${ratio}'.` });
    }
  }
  const definition = findCatalogDefinition(entry.recipe, definitions);
  if (!definition) {
    const hasSameId = definitions.some((candidate) => candidate.id === entry.recipe.id);
    issues.push(hasSameId
      ? { code: "definition-version", message: `Definition ${entry.recipe.id} version does not match the Catalog entry.` }
      : { code: "definition-missing", message: `Definition ${entry.recipe.id} is missing.` });
    return { valid: false, issues, definition: null, derivedFacts: null };
  }
  const definitionValidation = validateRecipeDefinition(definition);
  if (!definitionValidation.valid) {
    issues.push({
      code: "definition-invalid",
      message: definitionValidation.issues[0]?.message ?? `Definition ${entry.recipe.id} is invalid.`,
    });
  }
  const derivedFacts = deriveRecipeFacts(definition);
  const evidence = deriveSpreadEvidence(definition);
  const knownPreviewIds = new Set<string>(RECIPE_CATALOG_PREVIEW_SCENARIO_IDS);
  for (const scenarioId of entry.previewScenarioIds) {
    if (!knownPreviewIds.has(scenarioId)) {
      issues.push({ code: "preview-scenario", message: `Unknown Preview scenario '${scenarioId}'.` });
    }
  }
  const topology = entry.authoring.slotTopology;
  const colorFieldCount = definition.slots.filter((slot) => slot.kind === "color-field").length;
  if (topology === "single" && derivedFacts.photoCountRange.slots !== 1) {
    issues.push({ code: "contradiction", message: "single topology requires exactly one photo slot." });
  }
  if (topology === "diptych" && derivedFacts.photoCountRange.slots !== 2) {
    issues.push({ code: "contradiction", message: "diptych topology requires exactly two photo slots." });
  }
  if (topology === "grid" && derivedFacts.photoCountRange.slots < 3) {
    issues.push({ code: "contradiction", message: "grid topology requires at least three photo slots." });
  }
  if (topology === "index" && !derivedFacts.noteModeAndRelations.relations.includes("indexed")) {
    issues.push({ code: "contradiction", message: "index topology requires an indexed Note relation." });
  }
  if (topology === "cross-gutter" && !evidence.some((item) => item.kind === "cross-gutter-photo")) {
    issues.push({ code: "contradiction", message: "cross-gutter topology requires cross-gutter-photo evidence." });
  }
  if (evidence.some((item) => item.kind === "cross-gutter-photo") && topology !== "cross-gutter") {
    issues.push({ code: "contradiction", message: "A cross-gutter photo must be declared with cross-gutter topology." });
  }
  if (topology === "cross-page-pair" && !evidence.some((item) => item.kind === "cross-page-pair")) {
    issues.push({ code: "contradiction", message: "cross-page-pair topology requires cross-page-pair evidence." });
  }
  if (entry.authoring.colorStrategy === "zoned" && colorFieldCount < 2) {
    issues.push({ code: "contradiction", message: "zoned color strategy requires at least two Color Field slots." });
  }
  if (entry.authoring.colorStrategy === "rhythmic" && colorFieldCount < 3) {
    issues.push({ code: "contradiction", message: "rhythmic color strategy requires at least three Color Field slots." });
  }
  if (topology === "cross-gutter" && entry.authoring.gutterRisk === "low") {
    issues.push({ code: "contradiction", message: "cross-gutter topology cannot declare low gutter risk." });
  }
  return { valid: issues.length === 0, issues, definition, derivedFacts };
}

export function validateRecipeCatalog(
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
): readonly RecipeCatalogIssue[] {
  const issues: RecipeCatalogIssue[] = [];
  const refs = new Set<string>();
  for (const entry of entries) {
    const refKey = `${entry.recipe.id}@${entry.recipe.version}`;
    if (refs.has(refKey)) {
      issues.push({ code: "duplicate", message: `Duplicate Catalog reference ${refKey}.` });
    }
    refs.add(refKey);
    issues.push(...validateRecipeCatalogEntry(entry).issues);
  }
  return issues;
}

export function getActiveRecipeCatalogEntries(
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
  definitions: readonly RecipeDefinition[] = allCatalogDefinitions,
) {
  return entries.filter((entry) => resolveActiveRecipe(entry.recipe, entries, definitions) !== null);
}

export function getDevelopmentRecipeCatalogEntries(
  entries: readonly RecipeCatalogEntry[] = recipeCatalogEntries,
) {
  return entries;
}
