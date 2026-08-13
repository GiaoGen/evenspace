import {
  createAuthoredTextOwner,
  createRecipeApplication,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type AuthoredTextItem,
  type RecipeApplication,
  type RecipeCompatibility,
  type RecipeContent,
  type RecipeDefinition,
} from "./recipe-contract";
import {
  EDITORIAL_PREVIEW_SCENARIO_IDS,
  EDITORIAL_RECIPE_IDS,
  editorialRecipeDefinitions,
} from "./editorial-recipe-definitions";
import {
  createContentItemId,
  type RecipePlacement,
} from "./recipe-placement";
import { referencePreviewAssets, type ReferencePreviewAssetId } from "./reference-preview-assets";
import type { ZinePhoto } from "./zine-draft";
import {
  createRecipeRenderPlan,
  type RecipeRenderEnvironment,
  type RecipeRenderPlan,
} from "../components/recipe-renderer-plan";

export type EditorialPreviewMode = "editor" | "reader";
export type EditorialPreviewView = "left" | "right" | "spread";
export type EditorialPreviewRecipeId = (typeof EDITORIAL_RECIPE_IDS)[keyof typeof EDITORIAL_RECIPE_IDS];
export type EditorialPreviewScenarioId = (typeof EDITORIAL_PREVIEW_SCENARIO_IDS)[number];

type EditorialPreviewPhotoDefinition = {
  readonly asset: ReferencePreviewAssetId;
  readonly caption?: string;
  readonly focusX?: number;
  readonly focusY?: number;
};

type EditorialPreviewScenarioDefinition = {
  readonly recipeId: EditorialPreviewRecipeId;
  readonly id: EditorialPreviewScenarioId;
  readonly label: string;
  readonly photos: readonly EditorialPreviewPhotoDefinition[];
  readonly view?: EditorialPreviewView;
  readonly placements?: readonly Partial<RecipePlacement>[];
  readonly title?: string;
  readonly deck?: string;
  readonly authoredOwner?: "target" | "mismatch";
  readonly environmentTitle?: string;
  readonly textBySlotId?: Readonly<Record<string, string>>;
};

export type EditorialPreviewError = {
  readonly slotId: string;
  readonly message: string;
};

export type EditorialPreviewCell = {
  readonly id: string;
  readonly recipeId: string;
  readonly recipe: RecipeDefinition;
  readonly fixtureId: string;
  readonly fixtureLabel: string;
  readonly scenario: string;
  readonly mode: EditorialPreviewMode;
  readonly content: RecipeContent;
  readonly authoredTextItems: readonly AuthoredTextItem[];
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
  readonly plans: readonly RecipeRenderPlan[];
  readonly slotIds: readonly string[];
  readonly errors: readonly EditorialPreviewError[];
  readonly compatibility: RecipeCompatibility;
  readonly compatibilitySlotId: string;
};

export const editorialEvidenceMaximumNote = "Witnesses saw\ndawn by the rail\none detail holds\nrecord stays";
export const editorialAcrossMaximumNote = "A witness waits by the rail;\nsoft rain turns the street;\none gesture stays in view;\nthe record follows one steady light.";
export const editorialLeadMaximumTitle = "The morning report\nkeeps one witness\nclose to the soft light";
export const editorialLeadMaximumDeck = "Evidence remains visible in the frame;\none quiet detail carries the records.";

const evidenceAsideScenarios: readonly EditorialPreviewScenarioDefinition[] = [
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "empty", "Empty · needs two photos", []),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "one-photo", "One photo · needs content", [photo("landscape")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "exact-two", "Exact two photos", [photo("landscape"), photo("portrait")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "over-capacity-three", "Over-capacity · three photos", [photo("landscape"), photo("portrait"), photo("square")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "no-note", "No Note · fixed evidence lane", [photo("landscape"), photo("portrait")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "short-note", "Short Note on evidence photo", [photo("landscape"), photo("portrait", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "normal-latin-note", "Normal Latin Note", [photo("landscape"), photo("portrait", "A measured note keeps the evidence lane calm.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "numeric-note", "Numeric Note", [photo("landscape"), photo("portrait", "2026-08-13 / frame 02 / east platform")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "cjk-note", "CJK Note", [photo("landscape"), photo("portrait", "清晨的站台留下安靜的證詞")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "long-word-note", "Indivisible Latin word", [photo("landscape"), photo("portrait", "pneumonoultramicroscopicsilicovolcanoconiosis")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "max-60-four-lines", "60 characters · four logical lines", [photo("landscape"), photo("portrait", editorialEvidenceMaximumNote)]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "over-60", "Over 60 characters", [photo("landscape"), photo("portrait", `${editorialEvidenceMaximumNote}x`)]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "over-four-lines", "Within 60 characters · over four lines", [photo("landscape"), photo("portrait", "one\ntwo\nthree\nfour\nfive")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "main-landscape-evidence-portrait", "Landscape main · portrait evidence", [photo("landscape"), photo("portrait", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "portrait-main-square-evidence", "Portrait main · square evidence", [photo("portrait"), photo("square", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "landscape-evidence-severe-crop", "Landscape evidence · severe crop risk", [photo("portrait"), photo("landscape", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "square-pair", "Square pair", [photo("square"), photo("square", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "ultra-wide-risk", "Ultra-wide evidence risk", [photo("portrait"), photo("ultraWide", "Evidence detail.")]),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "left-page", "Left page", [photo("landscape"), photo("portrait", "Evidence detail.")], "left"),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "right-page", "Right page", [photo("landscape"), photo("portrait", "Evidence detail.")], "right"),
  scenario(
    EDITORIAL_RECIPE_IDS.evidenceAside,
    "two-independent-focus",
    "Two independent persisted focuses",
    [photo("landscape", "", 22, 36), photo("portrait", "Evidence detail.", 78, 67)],
    "left",
    [{ focusX: 22, focusY: 36, scale: 1.15 }, { focusX: 78, focusY: 67, scale: 1.35 }],
  ),
  scenario(EDITORIAL_RECIPE_IDS.evidenceAside, "main-photo-note-no-evidence", "Main photo Note is not rebound to evidence lane", [photo("landscape", "Main context."), photo("portrait")]),
];

const acrossTheRecordScenarios: readonly EditorialPreviewScenarioDefinition[] = [
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "empty", "Empty · needs photo and Note", [], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "empty-note", "Photo with empty required Note", [photo("portrait")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "one-character-note", "One-character Note", [photo("portrait", "A")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "short-note", "Short Note", [photo("portrait", "A short record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "across-cjk-note", "CJK Note", [photo("portrait", "清晨的站台仍保留一束安靜的光")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "max-120-four-lines", "120 characters · four logical lines", [photo("portrait", editorialAcrossMaximumNote)], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-120", "Over 120 characters", [photo("portrait", `${editorialAcrossMaximumNote}x`)], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-four-lines", "Over four lines", [photo("portrait", "one\ntwo\nthree\nfour\nfive")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-capacity-two", "Over-capacity · two photos", [photo("portrait", "A record."), photo("square")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "portrait", "Portrait", [photo("portrait", "A record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "square", "Square", [photo("square", "A record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "landscape-risk", "Landscape crop risk", [photo("landscape", "A record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "ultra-wide-risk", "Ultra-wide risk", [photo("ultraWide", "A record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "complete-spread", "Complete spread", [photo("portrait", "A complete record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "left-plan", "Left page plan", [photo("portrait", "Left visual evidence.")], "left"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "right-plan", "Right page plan", [photo("portrait", "Right page still carries only the record.")], "right"),
  scenario(
    EDITORIAL_RECIPE_IDS.acrossTheRecord,
    "focus-continuity",
    "Shared placement focus continuity",
    [photo("portrait", "A focused record.", 73, 41)],
    "spread",
    [{ focusX: 73, focusY: 41, scale: 1.4 }],
  ),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "required-relation", "Required cross-page-pair relation", [photo("portrait", "Bound record.")], "spread"),
  scenario(EDITORIAL_RECIPE_IDS.acrossTheRecord, "no-color-field", "No Color Field · paper surface", [photo("portrait", "Paper record.")], "spread"),
];

const leadStoryScenarios: readonly EditorialPreviewScenarioDefinition[] = [
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "empty", "Empty · needs photo and title", []),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "photo-title-missing", "Photo present · title missing", [photo("landscape")]),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "required-short-title", "Required short title", [photo("landscape")], "left", undefined, "A clear report."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "required-title-without-deck", "Required title without optional deck", [photo("square")], "left", undefined, "A title stands alone."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "short-title-deck", "Short title + deck", [photo("landscape")], "left", undefined, "A clear report.", "Context follows the image."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "cjk-title-deck", "CJK title + deck", [photo("landscape")], "left", undefined, "清晨的站台留下清楚的證詞", "雨後的車站仍保留一束安靜的光"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "long-latin-deck", "Indivisible Latin deck word", [photo("landscape")], "left", undefined, "A clear report.", "pneumonoultramicroscopicsilicovolcanoconiosis"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "max-60-three-lines", "60-character title · three logical lines", [photo("landscape")], "left", undefined, editorialLeadMaximumTitle),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "title-over-60", "Title over 60 characters", [photo("landscape")], "left", undefined, `${editorialLeadMaximumTitle}x`),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "title-over-three-lines", "Title over three lines", [photo("landscape")], "left", undefined, "one\ntwo\nthree\nfour"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "max-76-deck-two-lines", "76-character deck · two logical lines", [photo("landscape")], "left", undefined, "A title.", editorialLeadMaximumDeck),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "deck-over-76", "Deck over 76 characters", [photo("landscape")], "left", undefined, "A title.", `${editorialLeadMaximumDeck}x`),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "deck-over-two-lines", "Within 76 characters · over two lines", [photo("landscape")], "left", undefined, "A title.", "one\ntwo\nthree"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "owner-mismatch", "Authored title owner mismatch", [photo("landscape")], "left", undefined, "Wrong-owner title", undefined, "mismatch"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "left-page-owned", "Left page-owned title/deck", [photo("landscape")], "left", undefined, "Left page story", "Left page deck."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "right-page-owned", "Right page-owned title/deck", [photo("landscape")], "right", undefined, "Right page story", "Right page deck."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "landscape", "Landscape", [photo("landscape")], "left", undefined, "Landscape story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "portrait", "Portrait", [photo("portrait")], "left", undefined, "Portrait story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "square", "Square", [photo("square")], "left", undefined, "Square story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "ultra-wide", "Ultra-wide risk", [photo("ultraWide")], "left", undefined, "Ultra-wide story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "off-center-focus", "Off-center persisted focus", [photo("landscape", "", 18, 72)], "left", [{ focusX: 18, focusY: 72, scale: 1.35 }], "Focused story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "photo-note-hidden", "Photo Note retained but hidden", [photo("landscape", "Retained Photo Note.")], "left", undefined, "No Note slot story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "deck-absence-fixed-geometry", "Deck absence keeps fixed geometry", [photo("landscape")], "left", undefined, "Fixed geometry story."),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "environment-title-ignored", "Environment title cannot replace authored title", [photo("landscape")], "left", undefined, "Authored story title.", undefined, undefined, "Global Zine title"),
  scenario(EDITORIAL_RECIPE_IDS.leadStory, "text-by-slot-ignored", "textBySlotId cannot replace authored assignment", [photo("landscape")], "left", undefined, "Authored assignment.", undefined, undefined, undefined, { "title-lead": "Injected override must be ignored." }),
];

export const editorialPreviewScenarios: readonly EditorialPreviewScenarioDefinition[] = [
  ...evidenceAsideScenarios,
  ...acrossTheRecordScenarios,
  ...leadStoryScenarios,
];

export function createEditorialPreviewMatrix(): readonly EditorialPreviewCell[] {
  return editorialPreviewScenarios.flatMap((definition) => (
    (["editor", "reader"] as const).map((mode) => createEditorialPreviewCell(definition, mode))
  ));
}

export function createEditorialPreviewCell(
  definition: EditorialPreviewScenarioDefinition,
  mode: EditorialPreviewMode,
): EditorialPreviewCell {
  const recipe = editorialRecipeDefinitions.find((candidate) => candidate.id === definition.recipeId) as RecipeDefinition | undefined;
  if (!recipe) throw new Error(`Missing Editorial Recipe Definition ${definition.recipeId}.`);

  const fixtureId = `editorial-fixture-${definition.recipeId}-${definition.id}`;
  const photos = definition.photos.map((item, index) => createEditorialPhoto(fixtureId, item, index));
  const view = definition.view ?? "left";
  const targetPageIds = recipe.scope === "spread"
    ? [`${fixtureId}:left`, `${fixtureId}:right`]
    : [`${fixtureId}:${view === "right" ? "right" : "left"}`];
  const targetOwner = createAuthoredTextOwner(recipe.scope, targetPageIds[0]!, targetPageIds);
  const authoredTextItems = createEditorialAuthoredTextItems({
    recipe,
    definition,
    fixtureId,
    targetPageIds,
    targetOwner,
  });
  const owner = definition.authoredOwner === "mismatch"
    ? {
        kind: "spread",
        anchorPageId: targetPageIds[0]!,
        targetPageIds: [targetPageIds[0]!, `${fixtureId}:right`],
      } as const
    : targetOwner;
  const content = {
    photoIds: photos.map((item) => item.id),
    contentItemIds: photos.map((_, index) => createContentItemId(fixtureId, index)),
    notesByPhotoId: Object.fromEntries(photos.map((item) => [item.id, item.caption])),
    defaultFocusByPhotoId: Object.fromEntries(photos.map((item) => [item.id, { focusX: item.defaultFocusX, focusY: item.defaultFocusY }])),
    authoredTextItems,
    owner,
  } satisfies RecipeContent;
  const application = createApplicationWithPersistedPlacement({
    recipe,
    content,
    anchorPageId: targetPageIds[0]!,
    targetPageIds,
    placements: definition.placements,
  });
  const environments = createEditorialEnvironments({ recipe, definition, fixtureId, mode, authoredTextItems });
  const plans = environments.map((environment) => createRecipeRenderPlan({ recipe, application, photos, environment }));
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
    authoredTextItems,
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
  recipeId: EditorialPreviewRecipeId,
  id: EditorialPreviewScenarioId,
  label: string,
  photos: readonly EditorialPreviewPhotoDefinition[],
  view: EditorialPreviewView = "left",
  placements?: readonly Partial<RecipePlacement>[],
  title?: string,
  deck?: string,
  authoredOwner?: "target" | "mismatch",
  environmentTitle?: string,
  textBySlotId?: Readonly<Record<string, string>>,
): EditorialPreviewScenarioDefinition {
  return { recipeId, id, label, photos, view, placements, title, deck, authoredOwner, environmentTitle, textBySlotId };
}

function photo(
  asset: ReferencePreviewAssetId,
  caption = "",
  focusX = 50,
  focusY = 50,
): EditorialPreviewPhotoDefinition {
  return { asset, caption, focusX, focusY };
}

function createEditorialPhoto(
  fixtureId: string,
  definition: EditorialPreviewPhotoDefinition,
  index: number,
): ZinePhoto {
  const dimensions = getAssetDimensions(definition.asset);
  return {
    id: `${fixtureId}:photo-${index + 1}`,
    file: {} as File,
    previewUrl: referencePreviewAssets[definition.asset],
    fileName: `${definition.asset}-editorial-fixture.svg`,
    width: dimensions.width,
    height: dimensions.height,
    caption: definition.caption ?? "",
    defaultFocusX: definition.focusX ?? 50,
    defaultFocusY: definition.focusY ?? 50,
  };
}

function createEditorialAuthoredTextItems({
  recipe,
  definition,
  fixtureId,
  targetPageIds,
  targetOwner,
}: {
  readonly recipe: RecipeDefinition;
  readonly definition: EditorialPreviewScenarioDefinition;
  readonly fixtureId: string;
  readonly targetPageIds: readonly string[];
  readonly targetOwner: AuthoredTextItem["owner"];
}): readonly AuthoredTextItem[] {
  if (recipe.id !== EDITORIAL_RECIPE_IDS.leadStory) return [];
  const owner = definition.authoredOwner === "mismatch"
    ? { kind: "page", pageId: targetPageIds[1] ?? `${fixtureId}:right` } as const
    : targetOwner;
  const items: AuthoredTextItem[] = [];
  if (definition.title !== undefined) {
    items.push({ id: `${fixtureId}:story-title`, owner, contentKey: "story-title", roleHint: "title", text: definition.title });
  }
  if (definition.deck !== undefined) {
    items.push({ id: `${fixtureId}:story-deck`, owner, contentKey: "story-deck", roleHint: "deck", text: definition.deck });
  }
  return items;
}

function createEditorialEnvironments({
  recipe,
  definition,
  fixtureId,
  mode,
  authoredTextItems,
}: {
  readonly recipe: RecipeDefinition;
  readonly definition: EditorialPreviewScenarioDefinition;
  readonly fixtureId: string;
  readonly mode: EditorialPreviewMode;
  readonly authoredTextItems: readonly AuthoredTextItem[];
}): readonly RecipeRenderEnvironment[] {
  const pageIds = recipe.scope === "spread"
    ? definition.view === "left"
      ? ["left"] as const
      : definition.view === "right"
        ? ["right"] as const
        : ["left", "right"] as const
    : [definition.view === "right" ? "right" : "left"] as const;
  return pageIds.map((pageSide) => ({
    pageId: `${fixtureId}:${pageSide}`,
    pageSide,
    mode,
    pageNumber: pageSide === "left" ? 1 : 2,
    title: definition.environmentTitle ?? recipe.name,
    locale: "en",
    textBySlotId: definition.textBySlotId,
    authoredTextItems,
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
  if (compatibility.slotId) return compatibility.slotId;
  if (compatibility.contentKey) {
    return recipe.slots.find((slot) => slot.kind === "static-text" && slot.contentKey === compatibility.contentKey)?.id ?? compatibility.contentKey;
  }
  if (compatibility.code === "note-too-long" || compatibility.code === "note-too-many-lines") {
    return recipe.slots.find((slot) => slot.kind === "note")?.id ?? "recipe-content";
  }
  return compatibility.code === "too-much-content" ? "content-capacity" : "recipe-content";
}
