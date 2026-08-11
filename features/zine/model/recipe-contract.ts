import type { ZinePhoto, ZineStyleId } from "./zine-draft";
import {
  createContentItemId,
  createPlacementId,
  normalizePlacement,
  type PhotoDefaultFocus,
  type RecipePlacement,
} from "./recipe-placement";

export const RECIPE_SCHEMA_VERSION = 1 as const;

export type RecipeScope = "page" | "spread";
export type RecipeStatus = "draft" | "active" | "deprecated";
export type RecipeNoteMode = "none" | "optional" | "required";
export type RecipeSlotKind = "photo" | "note" | "static-text";
export type RecipeRelationKind =
  | "adjacent"
  | "aligned"
  | "edge-related"
  | "indexed"
  | "cross-page-pair"
  | "overlay";

export type RecipeRect = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type RecipeTextSource = "literal" | "title" | "page-number";

export type RecipeTheme = {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly photoBackground: string;
};

export type RecipeSlot = {
  readonly id: string;
  readonly kind: RecipeSlotKind;
  readonly rect: RecipeRect;
  readonly pageSide: "left" | "right" | "cross-spread";
  readonly required: boolean;
  readonly zIndex: number;
  readonly fit?: "cover";
  readonly allowBleed?: boolean;
  readonly allowGutterCrossing?: boolean;
  readonly maxLines?: number;
  readonly repeatable?: boolean;
  readonly text?: string;
  readonly textSource?: RecipeTextSource;
};

export type RecipeNoteRelation = {
  readonly photoSlotId: string;
  readonly noteSlotId: string;
  readonly kind: RecipeRelationKind;
};

export type RecipeDefinition = {
  readonly schemaVersion: typeof RECIPE_SCHEMA_VERSION;
  readonly id: string;
  readonly version: number;
  readonly familyId: string;
  readonly name: string;
  readonly description: string;
  readonly status: RecipeStatus;
  readonly scope: RecipeScope;
  readonly legacyStyleId: ZineStyleId;
  readonly capabilities: {
    readonly photos: { readonly min: number; readonly max: number };
    readonly notes: {
      readonly mode: RecipeNoteMode;
      readonly maxCharacters?: number;
      readonly maxLines?: number;
    };
    readonly allowsEmptyDraft: boolean;
  };
  readonly canvas: {
    readonly pageRatio: "3:4";
    readonly safeArea: RecipeRect;
    readonly gutter?: { readonly start: number; readonly end: number };
  };
  readonly theme?: RecipeTheme;
  readonly slots: readonly RecipeSlot[];
  readonly noteRelations: readonly RecipeNoteRelation[];
};

export type RecipeDefinitionIssue = {
  readonly code:
  | "schema"
  | "identity"
  | "scope"
  | "geometry"
  | "slot"
  | "note"
  | "photo-fit";
  readonly message: string;
};

export type RecipeValidation = {
  readonly valid: boolean;
  readonly issues: readonly RecipeDefinitionIssue[];
};

export type RecipeCompatibilityCode =
  | "compatible"
  | "compatible-with-hidden-notes"
  | "note-too-long"
  | "note-too-many-lines"
  | "needs-content"
  | "too-much-content"
  | "incompatible";

export type RecipeCompatibility = {
  readonly code: RecipeCompatibilityCode;
  readonly valid: boolean;
  readonly reason: string | null;
  readonly hiddenNotePhotoIds: readonly string[];
};

export type RecipeAssignment = {
  readonly placementId: string;
  readonly contentItemId: string;
  readonly photoSlotId: string;
  readonly photoId: string;
  readonly noteSlotId?: string;
  readonly noteOfPhotoId?: string;
} & RecipePlacement;

export type RecipeApplication = {
  readonly recipeId: string;
  readonly recipeVersion: number;
  readonly scope: RecipeScope;
  readonly anchorPageId: string;
  readonly targetPageIds: readonly string[];
  readonly assignments: readonly RecipeAssignment[];
  readonly unplacedPhotoIds: readonly string[];
  readonly hiddenNotePhotoIds: readonly string[];
};

export type RecipeContent = {
  readonly photoIds: readonly string[];
  readonly contentItemIds?: readonly string[];
  readonly notesByPhotoId: Readonly<Record<string, string>>;
  readonly defaultFocusByPhotoId?: Readonly<Record<string, PhotoDefaultFocus>>;
};

export type ApplyRecipeInput = {
  readonly recipe: RecipeDefinition;
  readonly content: RecipeContent;
  readonly anchorPageId: string;
  readonly targetPageIds?: readonly string[];
  readonly previousApplications?: readonly RecipeApplication[];
};

export const baseRecipeDefinitions: readonly RecipeDefinition[] = [
  createBaseRecipe({
    id: "recipe-editorial-v1",
    legacyStyleId: "editorial",
    name: "Editorial",
    description: "One clear image with a strong title and quiet text relationship.",
    familyId: "editorial",
    photoCount: [1, 1],
    noteMode: "optional",
    photoRects: [{ x: .16, y: .27, width: .76, height: .55 }],
    noteRect: { x: .16, y: .85, width: .76, height: .08 },
    relation: "adjacent",
    theme: { background: "#f5f1e9", foreground: "#20201d", muted: "#817c73", photoBackground: "#ded8cd" },
  }),
  createBaseRecipe({
    id: "recipe-contact-v1",
    legacyStyleId: "contact",
    name: "Contact sheet",
    description: "A compact rhythm of moments with optional indexed notes.",
    familyId: "contact",
    photoCount: [1, 4],
    noteMode: "optional",
    photoRects: [
      { x: .08, y: .18, width: .39, height: .29 },
      { x: .53, y: .18, width: .39, height: .29 },
      { x: .08, y: .51, width: .39, height: .29 },
      { x: .53, y: .51, width: .39, height: .29 },
    ],
    noteRect: { x: .08, y: .84, width: .84, height: .08 },
    relation: "aligned",
    theme: { background: "#eee9e1", foreground: "#25231f", muted: "#777168", photoBackground: "#ddd8cf" },
  }),
  createBaseRecipe({
    id: "recipe-margin-v1",
    legacyStyleId: "margin",
    name: "Wide margin",
    description: "A small photograph held by deliberate open space.",
    familyId: "margin",
    photoCount: [1, 1],
    noteMode: "optional",
    photoRects: [{ x: .18, y: .23, width: .64, height: .47 }],
    noteRect: { x: .18, y: .75, width: .64, height: .1 },
    relation: "aligned",
    theme: { background: "#f7f3eb", foreground: "#24221f", muted: "#8b8378", photoBackground: "#dcd6cc" },
  }),
  createBaseRecipe({
    id: "recipe-split-v1",
    legacyStyleId: "split",
    name: "Split frame",
    description: "Two photographs share a page with an equal visual axis.",
    familyId: "split",
    photoCount: [1, 2],
    noteMode: "optional",
    photoRects: [
      { x: .08, y: .19, width: .84, height: .31 },
      { x: .08, y: .55, width: .84, height: .27 },
    ],
    noteRect: { x: .08, y: .85, width: .84, height: .07 },
    relation: "aligned",
    theme: { background: "#f2eee6", foreground: "#24221f", muted: "#817a70", photoBackground: "#d9d4ca" },
  }),
  createBaseRecipe({
    id: "recipe-night-v1",
    legacyStyleId: "night",
    name: "Night index",
    description: "A dark, cinematic field with restrained optional text.",
    familyId: "night",
    photoCount: [1, 1],
    noteMode: "optional",
    photoRects: [{ x: .12, y: .2, width: .76, height: .54 }],
    noteRect: { x: .12, y: .79, width: .76, height: .1 },
    relation: "edge-related",
    theme: { background: "#20211f", foreground: "#f3efe7", muted: "#aaa79f", photoBackground: "#343532" },
  }),
];

/**
 * Phase D keeps one real spread Recipe in the executable catalog so the
 * atomic two-page path is exercised by the editor and the Reader, not only by
 * renderer fixtures.
 */
export const phaseDRecipeDefinitions: readonly RecipeDefinition[] = [
  {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: "recipe-reference-cross-gutter-v1",
    version: 1,
    familyId: "reference-cross-gutter",
    name: "Gutter bridge",
    description: "A single photograph crosses the gutter as one shared spread assignment.",
    status: "active",
    scope: "spread",
    legacyStyleId: "editorial",
    capabilities: {
      photos: { min: 1, max: 2 },
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
    },
    slots: [
      {
        id: "bridge-photo",
        kind: "photo",
        rect: { x: .72, y: .16, width: .56, height: .68 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 1,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: true,
      },
      {
        id: "bridge-label-left",
        kind: "static-text",
        rect: { x: .08, y: .06, width: .28, height: .04 },
        pageSide: "left",
        required: false,
        zIndex: 2,
        text: "REFERENCE SPREAD",
        textSource: "literal",
      },
      {
        id: "bridge-label-right",
        kind: "static-text",
        rect: { x: 1.64, y: .06, width: .28, height: .04 },
        pageSide: "right",
        required: false,
        zIndex: 2,
        text: "GUTTER BRIDGE",
        textSource: "literal",
      },
    ],
    noteRelations: [],
  },
];

export const recipeDefinitions: readonly RecipeDefinition[] = [
  ...baseRecipeDefinitions,
  ...phaseDRecipeDefinitions,
];

export function getRecipeDefinition(recipeId: string) {
  return recipeDefinitions.find((recipe) => recipe.id === recipeId) ?? null;
}

export function getRecipeForStyle(styleId: ZineStyleId) {
  return baseRecipeDefinitions.find((recipe) => recipe.legacyStyleId === styleId) ?? null;
}

export function validateRecipeDefinition(recipe: RecipeDefinition): RecipeValidation {
  const issues: RecipeDefinitionIssue[] = [];
  if (recipe.schemaVersion !== RECIPE_SCHEMA_VERSION) {
    issues.push({ code: "schema", message: "Unsupported recipe schema version." });
  }
  if (!recipe.id.trim() || recipe.version < 1 || !recipe.name.trim()) {
    issues.push({ code: "identity", message: "Recipe id, name and version are required." });
  }
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const noteSlots = recipe.slots.filter((slot) => slot.kind === "note");
  const slotIds = new Set<string>();
  for (const slot of recipe.slots) {
    if (slotIds.has(slot.id)) {
      issues.push({ code: "slot", message: `Duplicate slot id: ${slot.id}.` });
    }
    slotIds.add(slot.id);
    if (!isRectInsideCanvas(slot.rect, recipe.scope)) {
      issues.push({ code: "geometry", message: `Slot ${slot.id} is outside the recipe canvas.` });
    }
    if (slot.kind === "photo" && slot.fit !== "cover") {
      issues.push({ code: "photo-fit", message: `Photo slot ${slot.id} must use cover.` });
    }
    if (recipe.scope === "page" && slot.pageSide === "cross-spread") {
      issues.push({ code: "scope", message: "A page recipe cannot contain a cross-spread slot." });
    }
  }
  if (recipe.capabilities.photos.min !== photoSlots.filter((slot) => slot.required).length
    || recipe.capabilities.photos.max < recipe.capabilities.photos.min
    || recipe.capabilities.photos.max < photoSlots.length) {
    issues.push({ code: "slot", message: "Photo capability bounds do not match photo slots." });
  }
  for (const relation of recipe.noteRelations) {
    const photoSlot = photoSlots.find((slot) => slot.id === relation.photoSlotId);
    const noteSlot = noteSlots.find((slot) => slot.id === relation.noteSlotId);
    if (!photoSlot || !noteSlot) {
      issues.push({ code: "note", message: "Note relation references an unknown slot." });
      continue;
    }
    if (relation.kind === "cross-page-pair") {
      if (recipe.scope !== "spread") {
        issues.push({ code: "scope", message: "cross-page-pair requires a spread recipe." });
      }
      if (!areOppositePageSides(photoSlot.pageSide, noteSlot.pageSide)) {
        issues.push({
          code: "scope",
          message: "cross-page-pair requires photo and note slots on opposite page sides.",
        });
      }
    }
  }
  if (recipe.capabilities.notes.mode === "none" && recipe.noteRelations.length > 0) {
    issues.push({ code: "note", message: "A no-note recipe cannot declare note relations." });
  }
  if (recipe.capabilities.notes.mode !== "none" && noteSlots.length === 0) {
    issues.push({ code: "note", message: "A note-capable recipe needs at least one note slot." });
  }
  return { valid: issues.length === 0, issues };
}

export function evaluateRecipeCompatibility(
  recipe: RecipeDefinition,
  content: RecipeContent,
): RecipeCompatibility {
  const validation = validateRecipeDefinition(recipe);
  if (!validation.valid) {
    return {
      code: "incompatible",
      valid: false,
      reason: validation.issues[0]?.message ?? "Invalid recipe definition.",
      hiddenNotePhotoIds: [],
    };
  }
  const count = content.photoIds.length;
  const notePhotoIds = content.photoIds.filter((id) => Boolean(content.notesByPhotoId[id]?.trim()));
  if (count < recipe.capabilities.photos.min && !recipe.capabilities.allowsEmptyDraft) {
    return {
      code: "needs-content",
      valid: false,
      reason: `Needs at least ${recipe.capabilities.photos.min} photo${recipe.capabilities.photos.min === 1 ? "" : "s"}.`,
      hiddenNotePhotoIds: [],
    };
  }
  if (count > recipe.capabilities.photos.max) {
    return {
      code: "too-much-content",
      valid: false,
      reason: `Supports at most ${recipe.capabilities.photos.max} photos.`,
      hiddenNotePhotoIds: [],
    };
  }
  if (recipe.capabilities.notes.mode === "required"
    && notePhotoIds.length < Math.max(1, recipe.capabilities.photos.min)) {
    return {
      code: "needs-content",
      valid: false,
      reason: "This recipe requires a Photo Note.",
      hiddenNotePhotoIds: [],
    };
  }
  if (recipe.capabilities.notes.mode === "none" && notePhotoIds.length > 0) {
    return {
      code: "compatible-with-hidden-notes",
      valid: true,
      reason: "Photo Notes are retained but hidden by this recipe.",
      hiddenNotePhotoIds: notePhotoIds,
    };
  }
  const maxCharacters = recipe.capabilities.notes.maxCharacters;
  const overlongPhotoIds = maxCharacters === undefined
    ? []
    : content.photoIds.filter((id) => (
        (content.notesByPhotoId[id]?.trim().length ?? 0) > maxCharacters
      ));
  if (overlongPhotoIds.length > 0) {
    return {
      code: "note-too-long",
      valid: false,
      reason: `Photo Note exceeds the ${maxCharacters}-character limit.`,
      hiddenNotePhotoIds: [],
    };
  }
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const overflowingLinePhoto = content.photoIds
    .map((photoId, index) => ({ photoId, photoSlot: photoSlots[index] }))
    .find(({ photoId, photoSlot }) => {
      const noteSlot = photoSlot && getNoteSlotForPhoto(recipe, photoSlot.id);
      const maxLines = getRecipeNoteMaxLines(recipe, noteSlot);
      return Boolean(
        maxLines !== undefined
        && photoSlot
        && estimateRecipeNoteLines(recipe, photoSlot.id, content.notesByPhotoId[photoId] ?? "") > maxLines,
      );
    });
  if (overflowingLinePhoto) {
    const noteSlot = overflowingLinePhoto.photoSlot
      ? getNoteSlotForPhoto(recipe, overflowingLinePhoto.photoSlot.id)
      : undefined;
    const maxLines = getRecipeNoteMaxLines(recipe, noteSlot);
    return {
      code: "note-too-many-lines",
      valid: false,
      reason: `Photo Note exceeds the ${maxLines ?? 0}-line limit for this Recipe slot.`,
      hiddenNotePhotoIds: [],
    };
  }
  return { code: "compatible", valid: true, reason: null, hiddenNotePhotoIds: [] };
}

/**
 * Estimates the number of rendered lines before a Recipe is applied. The
 * editor and reader use the same slot geometry, so rejecting an overflow here
 * is safer than allowing Canvas text to clip after the assignment is created.
 */
export function estimateRecipeNoteLines(
  recipe: RecipeDefinition,
  photoSlotId: string,
  text: string,
) {
  const noteSlot = getNoteSlotForPhoto(recipe, photoSlotId);
  const normalized = text.trim();
  if (!noteSlot || !normalized) return 0;
  const width = Math.min(1, Math.max(.1, noteSlot.rect.width));
  const charactersPerLine = Math.max(8, Math.floor(width * 72));
  return normalized.split(/\r?\n/).reduce((lineCount, line) => (
    lineCount + Math.max(1, Math.ceil(Array.from(line).length / charactersPerLine))
  ), 0);
}

export function getRecipeCompatibilityLabel(code: RecipeCompatibilityCode) {
  switch (code) {
    case "compatible":
      return "Compatible";
    case "compatible-with-hidden-notes":
      return "Compatible · Notes hidden";
    case "needs-content":
      return "Needs content";
    case "too-much-content":
      return "Too much content";
    case "note-too-long":
      return "Note is too long";
    case "note-too-many-lines":
      return "Note has too many lines";
    case "incompatible":
      return "Incompatible";
  }
}

export function createRecipeApplication({
  recipe,
  content,
  anchorPageId,
  targetPageIds = [anchorPageId],
  previousApplications = [],
}: ApplyRecipeInput): RecipeApplication {
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const relationsByPhotoSlot = new Map(recipe.noteRelations.map((relation) => [relation.photoSlotId, relation]));
  const previousAssignments = previousApplications.flatMap((application) => application.assignments);
  const previousPlacementByContentItemId = new Map(
    previousAssignments.map((assignment) => [assignment.contentItemId, assignment]),
  );
  const previousPlacementByPlacementId = new Map(
    previousAssignments.map((assignment) => [assignment.placementId, assignment]),
  );
  const previousPlacementsByPhotoId = new Map<string, RecipeAssignment[]>();
  for (const assignment of previousAssignments) {
    const placements = previousPlacementsByPhotoId.get(assignment.photoId) ?? [];
    placements.push(assignment);
    previousPlacementsByPhotoId.set(assignment.photoId, placements);
  }
  const usedPreviousAssignments = new Set<RecipeAssignment>();
  const assignments: RecipeAssignment[] = [];
  for (const [index, photoId] of content.photoIds.entries()) {
    const slot = photoSlots[index];
    if (!slot) continue;
    const contentItemId = content.contentItemIds?.[index]?.trim()
      || createContentItemId(anchorPageId, index);
    const placementId = createPlacementId(contentItemId);
    const relation = relationsByPhotoSlot.get(slot.id);
    const note = content.notesByPhotoId[photoId]?.trim();
    const previousPlacement = findPreviousPlacement({
      contentItemId,
      placementId,
      photoId,
      previousPlacementByContentItemId,
      previousPlacementByPlacementId,
      previousPlacementsByPhotoId,
      usedPreviousAssignments,
    });
    const placement = normalizePlacement(previousPlacement ?? content.defaultFocusByPhotoId?.[photoId]);
    assignments.push({
      placementId,
      contentItemId,
      photoSlotId: slot.id,
      photoId,
      ...placement,
      noteSlotId: note ? relation?.noteSlotId : undefined,
      noteOfPhotoId: note ? photoId : undefined,
    });
  }
  return {
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    scope: recipe.scope,
    anchorPageId,
    targetPageIds,
    assignments,
    unplacedPhotoIds: content.photoIds.slice(photoSlots.length),
    hiddenNotePhotoIds: recipe.capabilities.notes.mode === "none"
      ? content.photoIds.filter((id) => Boolean(content.notesByPhotoId[id]?.trim()))
      : [],
  };
}

function findPreviousPlacement({
  contentItemId,
  placementId,
  photoId,
  previousPlacementByContentItemId,
  previousPlacementByPlacementId,
  previousPlacementsByPhotoId,
  usedPreviousAssignments,
}: {
  readonly contentItemId: string;
  readonly placementId: string;
  readonly photoId: string;
  readonly previousPlacementByContentItemId: ReadonlyMap<string, RecipeAssignment>;
  readonly previousPlacementByPlacementId: ReadonlyMap<string, RecipeAssignment>;
  readonly previousPlacementsByPhotoId: ReadonlyMap<string, readonly RecipeAssignment[]>;
  readonly usedPreviousAssignments: Set<RecipeAssignment>;
}) {
  const identityMatches = [
    previousPlacementByContentItemId.get(contentItemId),
    previousPlacementByPlacementId.get(placementId),
  ];
  const identityMatch = identityMatches.find((assignment) => (
    assignment?.photoId === photoId && !usedPreviousAssignments.has(assignment)
  ));
  if (identityMatch) {
    usedPreviousAssignments.add(identityMatch);
    return identityMatch;
  }

  const photoFallback = previousPlacementsByPhotoId.get(photoId)?.find(
    (assignment) => !usedPreviousAssignments.has(assignment),
  );
  if (photoFallback) usedPreviousAssignments.add(photoFallback);
  return photoFallback;
}

function createBaseRecipe({
  id,
  legacyStyleId,
  name,
  description,
  familyId,
  photoCount,
  noteMode,
  photoRects,
  noteRect,
  relation,
  theme,
}: {
  readonly id: string;
  readonly legacyStyleId: ZineStyleId;
  readonly name: string;
  readonly description: string;
  readonly familyId: string;
  readonly photoCount: readonly [number, number];
  readonly noteMode: RecipeNoteMode;
  readonly photoRects: readonly RecipeRect[];
  readonly noteRect: RecipeRect;
  readonly relation: RecipeRelationKind;
  readonly theme: RecipeTheme;
}): RecipeDefinition {
  const photoSlots: RecipeSlot[] = photoRects.map((rect, index) => ({
    id: `photo-${index + 1}`,
    kind: "photo",
    rect,
    pageSide: "left",
    required: index < photoCount[0],
    zIndex: 1,
    fit: "cover",
  }));
  const slots: RecipeSlot[] = noteMode === "none"
    ? photoSlots
    : [...photoSlots, {
        id: "note-1",
        kind: "note",
        rect: noteRect,
        pageSide: "left",
        required: noteMode === "required",
        zIndex: 2,
        maxLines: 3,
        repeatable: true,
      }];
  const staticSlots: RecipeSlot[] = [
    {
      id: "meta-label",
      kind: "static-text",
      rect: { x: .08, y: .06, width: .3, height: .04 },
      pageSide: "left",
      required: false,
      zIndex: 3,
      text: "EVENTSPACE",
      textSource: "literal",
    },
    {
      id: "page-number",
      kind: "static-text",
      rect: { x: .84, y: .06, width: .08, height: .04 },
      pageSide: "left",
      required: false,
      zIndex: 3,
      textSource: "page-number",
    },
  ];
  return {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id,
    version: 1,
    familyId,
    name,
    description,
    status: "active",
    scope: "page",
    legacyStyleId,
    capabilities: {
      photos: { min: photoCount[0], max: photoCount[1] },
      notes: { mode: noteMode, maxCharacters: 120, maxLines: 3 },
      allowsEmptyDraft: true,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .05, y: .05, width: .9, height: .9 },
      gutter: { start: .02, end: .02 },
    },
    theme,
    slots: [...staticSlots, ...slots],
    noteRelations: noteMode === "none" ? [] : photoSlots.map((slot) => ({
      photoSlotId: slot.id,
      noteSlotId: "note-1",
      kind: relation,
    })),
  };
}

function isRectInsideCanvas(rect: RecipeRect, scope: RecipeScope) {
  const maxX = scope === "spread" ? 2 : 1;
  return rect.width > 0 && rect.height > 0
    && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= maxX
    && rect.y + rect.height <= 1;
}

function areOppositePageSides(
  photoSide: RecipeSlot["pageSide"],
  noteSide: RecipeSlot["pageSide"],
) {
  return (photoSide === "left" && noteSide === "right")
    || (photoSide === "right" && noteSide === "left");
}

function getNoteSlotForPhoto(recipe: RecipeDefinition, photoSlotId: string) {
  const relation = recipe.noteRelations.find((item) => item.photoSlotId === photoSlotId);
  return relation
    ? recipe.slots.find((slot) => slot.kind === "note" && slot.id === relation.noteSlotId)
    : undefined;
}

function getRecipeNoteMaxLines(recipe: RecipeDefinition, noteSlot: RecipeSlot | undefined) {
  const limits = [noteSlot?.maxLines, recipe.capabilities.notes.maxLines]
    .filter((value): value is number => value !== undefined);
  return limits.length > 0 ? Math.min(...limits) : undefined;
}

export function createNotesByPhotoId(photos: readonly ZinePhoto[]) {
  return Object.fromEntries(photos.map((photo) => [photo.id, photo.caption])) as Readonly<Record<string, string>>;
}
