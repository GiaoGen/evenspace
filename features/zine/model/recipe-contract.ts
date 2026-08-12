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
export type RecipeRef = {
  readonly id: string;
  readonly version: number;
};
export const RECIPE_COLOR_TOKENS = [
  "paper",
  "ink",
  "muted-ink",
  "photo-mat",
  "accent-1",
  "accent-2",
  "accent-3",
  "inverse-ink",
] as const;
export type RecipeColorToken = (typeof RECIPE_COLOR_TOKENS)[number];
export type RecipeColorTokenMap = Partial<Record<RecipeColorToken, string>>;
export type RecipeNoteMode = "none" | "optional" | "required";
export type RecipeSlotKind = "photo" | "note" | "static-text" | "color-field";
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

export type DerivedCanvasMetrics = {
  readonly pageCoordinateWidth: 1;
  readonly spreadCoordinateWidth: 2;
  readonly coordinateWidth: 1 | 2;
  readonly physicalSpreadRatio: {
    readonly width: number;
    readonly height: number;
  };
};

/**
 * Derives runtime canvas facts from the only persisted page ratio. These
 * metrics are intentionally not part of RecipeDefinition serialization.
 */
export function deriveCanvasMetrics(
  pageRatio: "3:4",
  scope: RecipeScope,
): DerivedCanvasMetrics {
  const [pageWidth, pageHeight] = pageRatio.split(":").map(Number);
  const physicalWidth = pageWidth * 2;
  const divisor = greatestCommonDivisor(physicalWidth, pageHeight);
  return {
    pageCoordinateWidth: 1,
    spreadCoordinateWidth: 2,
    coordinateWidth: scope === "spread" ? 2 : 1,
    physicalSpreadRatio: {
      width: physicalWidth / divisor,
      height: pageHeight / divisor,
    },
  };
}

export type RecipeTextSource = "literal" | "title" | "page-number";

export const RECIPE_TYPOGRAPHY_ROLES = [
  "title",
  "deck",
  "label",
  "folio",
  "caption",
  "note",
  "index",
] as const;
export type RecipeTypographyRole = (typeof RECIPE_TYPOGRAPHY_ROLES)[number];
export const RECIPE_TEXT_ALIGNS = ["start", "center", "end", "inward", "outward"] as const;
export type RecipeTextAlign = (typeof RECIPE_TEXT_ALIGNS)[number];
export const RECIPE_TYPOGRAPHY_SIZES = ["xs", "sm", "md", "lg", "xl"] as const;
export type RecipeTypographySize = (typeof RECIPE_TYPOGRAPHY_SIZES)[number];
export const RECIPE_TYPOGRAPHY_LINE_HEIGHTS = ["tight", "normal", "open"] as const;
export type RecipeTypographyLineHeight = (typeof RECIPE_TYPOGRAPHY_LINE_HEIGHTS)[number];
export const RECIPE_TYPOGRAPHY_WEIGHTS = [400, 500, 600, 700] as const;
export type RecipeTypographyWeight = (typeof RECIPE_TYPOGRAPHY_WEIGHTS)[number];
export const RECIPE_TYPOGRAPHY_TRACKING = ["tight", "normal", "wide"] as const;
export type RecipeTypographyTracking = (typeof RECIPE_TYPOGRAPHY_TRACKING)[number];
export const RECIPE_TYPOGRAPHY_TRANSFORMS = ["none", "uppercase"] as const;
export type RecipeTypographyTransform = (typeof RECIPE_TYPOGRAPHY_TRANSFORMS)[number];

export type RecipeTypographyToken = {
  readonly size: RecipeTypographySize;
  readonly lineHeight: RecipeTypographyLineHeight;
  readonly weight: RecipeTypographyWeight;
  readonly tracking: RecipeTypographyTracking;
  readonly transform: RecipeTypographyTransform;
};

export type RecipeTypographyTokenMap = Partial<Record<RecipeTypographyRole, RecipeTypographyToken>>;
export type ResolvedRecipeTypographyTokens = Readonly<Record<RecipeTypographyRole, RecipeTypographyToken>>;

/** Product-owned typography preset. Recipes may only select values from these finite scales. */
export const DEFAULT_RECIPE_TYPOGRAPHY: ResolvedRecipeTypographyTokens = {
  title: { size: "xl", lineHeight: "tight", weight: 700, tracking: "tight", transform: "none" },
  deck: { size: "lg", lineHeight: "normal", weight: 500, tracking: "normal", transform: "none" },
  label: { size: "sm", lineHeight: "tight", weight: 700, tracking: "wide", transform: "uppercase" },
  folio: { size: "xs", lineHeight: "tight", weight: 700, tracking: "wide", transform: "uppercase" },
  caption: { size: "sm", lineHeight: "normal", weight: 400, tracking: "normal", transform: "none" },
  note: { size: "sm", lineHeight: "normal", weight: 400, tracking: "normal", transform: "none" },
  index: { size: "xs", lineHeight: "open", weight: 500, tracking: "normal", transform: "none" },
};

export type RecipeTheme = {
  readonly background: string;
  readonly foreground: string;
  readonly muted: string;
  readonly photoBackground: string;
  readonly colorTokens?: RecipeColorTokenMap;
  readonly typography?: RecipeTypographyTokenMap;
};

export type ResolvedRecipeColorTokens = Record<RecipeColorToken, string | undefined>;

/** Maps legacy four-color Theme fields into the semantic Color Field vocabulary. */
export function adaptRecipeTheme(theme?: RecipeTheme): ResolvedRecipeColorTokens {
  return {
    paper: theme?.colorTokens?.paper ?? theme?.background,
    ink: theme?.colorTokens?.ink ?? theme?.foreground,
    "muted-ink": theme?.colorTokens?.["muted-ink"] ?? theme?.muted,
    "photo-mat": theme?.colorTokens?.["photo-mat"] ?? theme?.photoBackground,
    "accent-1": theme?.colorTokens?.["accent-1"],
    "accent-2": theme?.colorTokens?.["accent-2"],
    "accent-3": theme?.colorTokens?.["accent-3"],
    "inverse-ink": theme?.colorTokens?.["inverse-ink"],
  };
}

/** Supplies the product preset for legacy Themes while preserving finite author overrides. */
export function adaptRecipeTypography(theme?: RecipeTheme): ResolvedRecipeTypographyTokens {
  return Object.fromEntries(RECIPE_TYPOGRAPHY_ROLES.map((role) => [
    role,
    theme?.typography?.[role] ?? DEFAULT_RECIPE_TYPOGRAPHY[role],
  ])) as ResolvedRecipeTypographyTokens;
}

/** Adds only semantic defaults to old Slots; geometry and relative z-order are unchanged. */
export function adaptRecipeSlot(slot: RecipeSlot): RecipeSlot {
  if (slot.kind === "note") {
    return { ...slot, foregroundToken: slot.foregroundToken ?? "ink", role: slot.role ?? "note" };
  }
  if (slot.kind === "static-text") {
    return {
      ...slot,
      foregroundToken: slot.foregroundToken ?? "muted-ink",
      role: slot.role ?? (slot.textSource === "page-number" ? "folio" : "label"),
      align: slot.align ?? (slot.textSource === "page-number" ? "end" : "start"),
    };
  }
  return slot;
}

export type RecipeLegacyCompatibility = {
  readonly styleId: ZineStyleId;
};

type RecipeSlotBase = {
  readonly id: string;
  readonly rect: RecipeRect;
  readonly pageSide: "left" | "right" | "cross-spread";
  readonly required: boolean;
  readonly zIndex: number;
};

export type RecipePhotoSlot = RecipeSlotBase & {
  readonly kind: "photo";
  readonly fit?: "cover";
  readonly allowBleed?: boolean;
  readonly allowGutterCrossing?: boolean;
  readonly fillToken?: never;
  readonly foregroundToken?: never;
};

export type RecipeNoteSlot = RecipeSlotBase & {
  readonly kind: "note";
  readonly fillToken?: never;
  readonly foregroundToken?: RecipeColorToken;
  readonly maxLines?: number;
  readonly repeatable?: boolean;
  readonly role?: RecipeTypographyRole;
  readonly align?: RecipeTextAlign;
};

export type RecipeStaticTextSlot = RecipeSlotBase & {
  readonly kind: "static-text";
  readonly fillToken?: never;
  readonly foregroundToken?: RecipeColorToken;
  readonly text?: string;
  readonly textSource?: RecipeTextSource;
  readonly role?: RecipeTypographyRole;
  readonly align?: RecipeTextAlign;
};

export type RecipeColorFieldSlot = RecipeSlotBase & {
  readonly kind: "color-field";
  readonly fillToken: RecipeColorToken;
  readonly foregroundToken?: never;
};

export type RecipeTextSlot = RecipeNoteSlot | RecipeStaticTextSlot;

/** v1.1 semantic slots. A color-field is the only slot that can paint a fill. */
export type SemanticRecipeSlot =
  | RecipePhotoSlot
  | RecipeNoteSlot
  | RecipeStaticTextSlot
  | RecipeColorFieldSlot;

/** Legacy slots intentionally exclude Color Field and are adapted at runtime. */
export type LegacyRecipeSlot = RecipePhotoSlot | RecipeNoteSlot | RecipeStaticTextSlot;

export type RecipeSlot = SemanticRecipeSlot;

export type RecipeNoteRelation = {
  readonly photoSlotId: string;
  readonly noteSlotId: string;
  readonly kind: RecipeRelationKind;
};

export type DerivedSpreadEvidence =
  | {
      readonly kind: "cross-gutter-photo";
      readonly photoSlotId: string;
    }
  | {
      readonly kind: "cross-page-pair";
      readonly photoSlotId: string;
      readonly noteSlotId: string;
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
  /** @deprecated Read through the legacy registry during v1.1 migration. */
  readonly legacyStyleId?: ZineStyleId;
  readonly legacy?: RecipeLegacyCompatibility;
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
  | "photo-fit"
  | "color"
  | "layer"
  | "contrast"
  | "typography"
  | "legacy";
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
      typography: DEFAULT_RECIPE_TYPOGRAPHY,
    },
    slots: [
      {
        id: "bridge-photo",
        kind: "photo",
        rect: { x: .72, y: .16, width: .56, height: .68 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
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
        zIndex: 20,
        foregroundToken: "ink",
        text: "REFERENCE SPREAD",
        textSource: "literal",
        role: "label",
        align: "outward",
      },
      {
        id: "bridge-label-right",
        kind: "static-text",
        rect: { x: 1.64, y: .06, width: .28, height: .04 },
        pageSide: "right",
        required: false,
        zIndex: 20,
        foregroundToken: "ink",
        text: "GUTTER BRIDGE",
        textSource: "literal",
        role: "label",
        align: "outward",
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

export function getRecipeDefinitionByRef(ref: RecipeRef) {
  return recipeDefinitions.find((recipe) => (
    recipe.id === ref.id && recipe.version === ref.version
  )) ?? null;
}

export type LegacyRecipeMapping = {
  readonly styleId: ZineStyleId;
  readonly recipe: { readonly id: string; readonly version: number };
};

export type LegacyRecipeResolution =
  | {
      readonly status: "resolved";
      readonly styleId: string;
      readonly recipe: RecipeDefinition;
    }
  | {
      readonly status: "unknown" | "ambiguous";
      readonly styleId: string;
      readonly recipe: null;
      readonly message: string;
    };

/**
 * The only legacy style -> Recipe mapping. New Recipe Definitions do not need
 * to carry a legacy field; old style entry points resolve through this table.
 */
export const legacyRecipeRegistry: readonly LegacyRecipeMapping[] = [
  { styleId: "editorial", recipe: { id: "recipe-editorial-v1", version: 1 } },
  { styleId: "contact", recipe: { id: "recipe-contact-v1", version: 1 } },
  { styleId: "margin", recipe: { id: "recipe-margin-v1", version: 1 } },
  { styleId: "split", recipe: { id: "recipe-split-v1", version: 1 } },
  { styleId: "night", recipe: { id: "recipe-night-v1", version: 1 } },
];

export function resolveLegacyRecipe(
  styleId: string,
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
  definitions: readonly RecipeDefinition[] = recipeDefinitions,
): LegacyRecipeResolution {
  const matches = registry.filter((mapping) => mapping.styleId === styleId);
  if (matches.length === 0) {
    return {
      status: "unknown",
      styleId,
      recipe: null,
      message: `No Recipe mapping exists for legacy style '${styleId}'.`,
    };
  }
  if (matches.length > 1) {
    return {
      status: "ambiguous",
      styleId,
      recipe: null,
      message: `Legacy style '${styleId}' maps to multiple Recipe targets.`,
    };
  }
  const mapping = matches[0];
  const recipe = definitions.find((candidate) => (
    candidate.id === mapping.recipe.id && candidate.version === mapping.recipe.version
  ));
  if (!recipe) {
    return {
      status: "unknown",
      styleId,
      recipe: null,
      message: `Legacy style '${styleId}' points to missing Recipe ${mapping.recipe.id}@${mapping.recipe.version}.`,
    };
  }
  return { status: "resolved", styleId, recipe };
}

export function getRecipeDefinitionByLegacyStyleId(
  styleId: string,
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
  definitions: readonly RecipeDefinition[] = recipeDefinitions,
) {
  const resolution = resolveLegacyRecipe(styleId, registry, definitions);
  return resolution.status === "resolved" ? resolution.recipe : null;
}

/** Backward-compatible name for the old Style query entry point. */
export function getRecipeForStyle(
  styleId: ZineStyleId,
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
  definitions: readonly RecipeDefinition[] = recipeDefinitions,
) {
  return getRecipeDefinitionByLegacyStyleId(styleId, registry, definitions);
}

export function getLegacyStyleId(recipe: RecipeDefinition) {
  return legacyRecipeRegistry.find((mapping) => (
    mapping.recipe.id === recipe.id && mapping.recipe.version === recipe.version
  ))?.styleId ?? null;
}

export function validateLegacyRecipeRegistry(
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
): readonly string[] {
  const issues: string[] = [];
  const mappingsByStyle = new Map<string, LegacyRecipeMapping[]>();
  for (const mapping of registry) {
    const mappings = mappingsByStyle.get(mapping.styleId) ?? [];
    mappings.push(mapping);
    mappingsByStyle.set(mapping.styleId, mappings);
  }
  for (const [styleId, mappings] of mappingsByStyle) {
    if (mappings.length > 1) {
      issues.push(`Legacy style '${styleId}' maps to multiple active Recipe targets.`);
    }
  }
  for (const mapping of registry) {
    const recipe = recipeDefinitions.find((candidate) => (
      candidate.id === mapping.recipe.id && candidate.version === mapping.recipe.version
    ));
    if (!recipe) {
      issues.push(`Legacy style '${mapping.styleId}' points to missing Recipe ${mapping.recipe.id}@${mapping.recipe.version}.`);
    }
  }
  return issues;
}

export function deriveSpreadEvidence(
  recipe: RecipeDefinition,
): readonly DerivedSpreadEvidence[] {
  if (recipe.scope !== "spread") return [];

  const slotsById = new Map(recipe.slots.map((slot) => [slot.id, slot]));
  const evidence: DerivedSpreadEvidence[] = [];

  for (const slot of recipe.slots) {
    const crossesGutter = slot.rect.x < 1 && slot.rect.x + slot.rect.width > 1;
    if (
      slot.kind === "photo"
      && slot.pageSide === "cross-spread"
      && crossesGutter
      && slot.allowGutterCrossing === true
    ) {
      evidence.push({ kind: "cross-gutter-photo", photoSlotId: slot.id });
    }
  }

  for (const relation of recipe.noteRelations) {
    if (relation.kind !== "cross-page-pair") continue;
    const photoSlot = slotsById.get(relation.photoSlotId);
    const noteSlot = slotsById.get(relation.noteSlotId);
    if (
      photoSlot?.kind === "photo"
      && noteSlot?.kind === "note"
      && areOppositePageSides(photoSlot.pageSide, noteSlot.pageSide)
    ) {
      evidence.push({
        kind: "cross-page-pair",
        photoSlotId: photoSlot.id,
        noteSlotId: noteSlot.id,
      });
    }
  }

  return evidence;
}

export function validateRecipeDefinition(recipe: RecipeDefinition): RecipeValidation {
  const issues: RecipeDefinitionIssue[] = [];
  const canvasMetrics = deriveCanvasMetrics(recipe.canvas.pageRatio, recipe.scope);
  if (recipe.schemaVersion !== RECIPE_SCHEMA_VERSION) {
    issues.push({ code: "schema", message: "Unsupported recipe schema version." });
  }
  if (!recipe.id.trim() || recipe.version < 1 || !recipe.name.trim()) {
    issues.push({ code: "identity", message: "Recipe id, name and version are required." });
  }
  if (recipe.legacy && recipe.legacyStyleId && recipe.legacy.styleId !== recipe.legacyStyleId) {
    issues.push({ code: "legacy", message: "Legacy compatibility fields disagree." });
  }
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const noteSlots = recipe.slots.filter((slot) => slot.kind === "note");
  const slotIds = new Set<string>();
  for (const slot of recipe.slots) {
    if (slotIds.has(slot.id)) {
      issues.push({ code: "slot", message: `Duplicate slot id: ${slot.id}.` });
    }
    slotIds.add(slot.id);
    if (!isRectInsideCanvas(slot.rect, canvasMetrics.coordinateWidth)) {
      issues.push({ code: "geometry", message: `Slot ${slot.id} is outside the recipe canvas.` });
    }
    if (slot.kind === "photo" && slot.fit !== "cover") {
      issues.push({ code: "photo-fit", message: `Photo slot ${slot.id} must use cover.` });
    }
    if (recipe.scope === "page" && slot.pageSide === "cross-spread") {
      issues.push({ code: "scope", message: "A page recipe cannot contain a cross-spread slot." });
    }
    if (recipe.scope === "spread" && slot.kind === "photo" && slot.pageSide === "cross-spread") {
      const crossesGutter = slot.rect.x < 1 && slot.rect.x + slot.rect.width > 1;
      if (!crossesGutter) {
        issues.push({
          code: "scope",
          message: `Cross-gutter photo slot ${slot.id} must cross the gutter at x=1.`,
        });
      } else if (slot.allowGutterCrossing !== true) {
        issues.push({
          code: "scope",
          message: `Cross-gutter photo slot ${slot.id} must allow gutter crossing.`,
        });
      }
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
  if (recipe.scope === "spread" && deriveSpreadEvidence(recipe).length === 0) {
    issues.push({
      code: "scope",
      message: "A spread recipe must contain a cross-gutter photo or a valid cross-page-pair.",
    });
  }
  issues.push(...validateColorFieldContract(recipe));
  issues.push(...validateTypographyContract(recipe));
  return { valid: issues.length === 0, issues };
}

/** A Definition is Legacy only when its exact id/version is registered. */
export function isLegacyRecipeDefinition(
  recipe: RecipeDefinition,
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
) {
  return registry.some((mapping) => (
    mapping.recipe.id === recipe.id && mapping.recipe.version === recipe.version
  ));
}

/** Every Definition outside the exact Legacy registry uses the v1.1 bands. */
export function isSemanticRecipeDefinition(
  recipe: RecipeDefinition,
  registry: readonly LegacyRecipeMapping[] = legacyRecipeRegistry,
) {
  return !isLegacyRecipeDefinition(recipe, registry);
}

export type RecipeTextSurfaceResolution = {
  readonly valid: boolean;
  readonly surfaceToken: RecipeColorToken;
  readonly surfaceSlotId?: string;
  readonly reason?: string;
};

/** Resolves a text slot's complete color surface without depending on DOM/CSS. */
export function resolveRecipeTextSurface(
  recipe: RecipeDefinition,
  slot: RecipeTextSlot,
): RecipeTextSurfaceResolution {
  const colorFields = recipe.slots.filter((candidate): candidate is RecipeColorFieldSlot => (
    candidate.kind === "color-field"
  ));
  if (colorFields.length === 0) {
    return { valid: true, surfaceToken: "paper" };
  }

  const intersecting = colorFields.filter((field) => rectanglesIntersect(field.rect, slot.rect));
  if (intersecting.some((field) => !containsRect(field.rect, slot.rect))) {
    return {
      valid: false,
      surfaceToken: "paper",
      reason: `Text slot ${slot.id} crosses or is only partially covered by a color-field surface.`,
    };
  }
  const complete = intersecting.filter((field) => containsRect(field.rect, slot.rect));
  if (complete.length === 0) {
    if (intersecting.length === 0) {
      return { valid: true, surfaceToken: "paper" };
    }
    return {
      valid: false,
      surfaceToken: "paper",
      reason: `Text slot ${slot.id} has no complete color-field surface.`,
    };
  }
  const highestZIndex = Math.max(...complete.map((field) => field.zIndex));
  const highest = complete.filter((field) => field.zIndex === highestZIndex);
  if (highest.length !== 1 || !isRecipeColorToken(highest[0]?.fillToken)) {
    return {
      valid: false,
      surfaceToken: "paper",
      reason: `Text slot ${slot.id} has an ambiguous color-field surface.`,
    };
  }
  return {
    valid: true,
    surfaceToken: highest[0].fillToken,
    surfaceSlotId: highest[0].id,
  };
}

export function validateColorFieldContract(recipe: RecipeDefinition): readonly RecipeDefinitionIssue[] {
  const issues: RecipeDefinitionIssue[] = [];
  const colorFields = recipe.slots.filter((slot): slot is RecipeColorFieldSlot => slot.kind === "color-field");
  const hasColorFields = colorFields.length > 0;
  const semanticDefinition = isSemanticRecipeDefinition(recipe);
  const tokens = adaptRecipeTheme(recipe.theme);

  for (const [token, value] of Object.entries(recipe.theme?.colorTokens ?? {})) {
    if (!isRecipeColorToken(token)) {
      issues.push({ code: "color", message: `Unknown semantic color token '${token}'.` });
      continue;
    }
    if (!isOpaqueColor(value)) {
      issues.push({ code: "color", message: `Color token '${token}' must be an opaque, parseable color.` });
    }
  }
  for (const [token, value] of Object.entries(tokens)) {
    if (value !== undefined && !isOpaqueColor(value)) {
      issues.push({ code: "color", message: `Color token '${token}' must be an opaque, parseable color.` });
    }
  }

  for (const slot of recipe.slots) {
    validateRecipeSlotShape(slot, issues);
    if (slot.kind === "color-field") {
      if (!isRecipeColorToken(slot.fillToken)) {
        issues.push({ code: "color", message: `Color field ${slot.id} must reference a controlled fillToken.` });
      } else if (!tokens[slot.fillToken]) {
        issues.push({ code: "color", message: `Color field ${slot.id} references a missing color token '${slot.fillToken}'.` });
      }
      if (slot.zIndex < 0 || slot.zIndex > 9) {
        issues.push({ code: "layer", message: `Color field ${slot.id} must use zIndex 0..9.` });
      }
      validateColorFieldPageSide(recipe, slot, issues);
    }
  }

  // Legacy Definitions retain their old relative layers and visual behavior.
  if (!semanticDefinition && !hasColorFields) return issues;

  for (const slot of recipe.slots) {
    const adaptedSlot = adaptRecipeSlot(slot);
    if (adaptedSlot.kind === "color-field") continue;

    const band = adaptedSlot.kind === "photo" ? [10, 19] : [20, 29];
    if (adaptedSlot.zIndex < band[0] || adaptedSlot.zIndex > band[1]) {
      issues.push({ code: "layer", message: `${adaptedSlot.kind} slot ${adaptedSlot.id} must use zIndex ${band[0]}..${band[1]}.` });
    }
    if (adaptedSlot.kind === "photo") continue;

    const overlappingPhoto = recipe.slots.find((candidate) => (
      candidate.kind === "photo"
      && rectanglesIntersect(candidate.rect, adaptedSlot.rect)
    ));
    if (semanticDefinition && overlappingPhoto) {
      issues.push({
        code: "contrast",
        message: `Text slot ${slot.id} cannot overlap photo slot ${overlappingPhoto.id}.`,
      });
      continue;
    }
    if (semanticDefinition && !isRecipeColorToken(slot.foregroundToken)) {
      issues.push({ code: "color", message: `Text slot ${slot.id} must reference a controlled foregroundToken.` });
      continue;
    }
    const resolution = resolveRecipeTextSurface(recipe, adaptedSlot);
    if (!resolution.valid) {
      issues.push({ code: "contrast", message: resolution.reason ?? `Text slot ${slot.id} has no deterministic surface.` });
      continue;
    }
    const foregroundToken = adaptedSlot.foregroundToken;
    if (!isRecipeColorToken(foregroundToken)) continue;
    const foreground = tokens[foregroundToken];
    const background = tokens[resolution.surfaceToken];
    if (!foreground || !background || contrastRatio(foreground, background) < 4.5) {
      issues.push({ code: "contrast", message: `Text slot ${slot.id} must meet the 4.5:1 contrast threshold.` });
    }
  }

  return issues;
}

export function isOpaqueColor(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const color = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(color) || /^#[0-9a-f]{6}$/i.test(color)) return true;
  const match = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  return match !== null && match.slice(1).every((channel) => Number(channel) <= 255);
}

export function contrastRatio(foreground: string, background: string) {
  const foregroundLuminance = relativeLuminance(parseOpaqueColor(foreground));
  const backgroundLuminance = relativeLuminance(parseOpaqueColor(background));
  if (foregroundLuminance === null || backgroundLuminance === null) return 0;
  return (Math.max(foregroundLuminance, backgroundLuminance) + .05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + .05);
}

function isRecipeColorToken(value: unknown): value is RecipeColorToken {
  return typeof value === "string" && (RECIPE_COLOR_TOKENS as readonly string[]).includes(value);
}

const forbiddenVisualProperties = [
  "className",
  "css",
  "style",
  "component",
  "background",
  "backgroundColor",
  "color",
  "boxShadow",
  "border",
  "borderRadius",
  "transform",
  "clipPath",
  "mask",
  "fontFamily",
  "gradient",
  "opacity",
  "filter",
  "mixBlendMode",
] as const;

const recipeSlotAllowedKeys: Readonly<Record<RecipeSlotKind, readonly string[]>> = {
  photo: ["id", "kind", "rect", "pageSide", "required", "zIndex", "fit", "allowBleed", "allowGutterCrossing"],
  note: ["id", "kind", "rect", "pageSide", "required", "zIndex", "foregroundToken", "maxLines", "repeatable", "role", "align"],
  "static-text": ["id", "kind", "rect", "pageSide", "required", "zIndex", "foregroundToken", "text", "textSource", "role", "align"],
  "color-field": ["id", "kind", "rect", "pageSide", "required", "zIndex", "fillToken"],
};

function validateRecipeSlotShape(slot: RecipeSlot, issues: RecipeDefinitionIssue[]) {
  const candidate = slot as unknown as Record<string, unknown>;
  const kind = candidate.kind;
  const allowedKeys = recipeSlotAllowedKeys[kind as RecipeSlotKind];
  if (allowedKeys) {
    const unexpectedKeys = Object.keys(candidate).filter((key) => !allowedKeys.includes(key));
    if (unexpectedKeys.length > 0) {
      issues.push({
        code: "slot",
        message: `Slot ${slot.id} has unsupported ${kind} field(s): ${unexpectedKeys.join(", ")}.`,
      });
    }
  }
  if (!(RECIPE_COLOR_TOKENS as readonly unknown[]).includes(candidate.fillToken)
    && candidate.fillToken !== undefined
    && candidate.fillToken !== null) {
    issues.push({ code: "color", message: `Slot ${slot.id} contains an invalid fillToken.` });
  }
  if (forbiddenVisualProperties.some((key) => candidate[key] !== undefined)) {
    issues.push({ code: "color", message: `Slot ${slot.id} contains an unsupported visual injection.` });
  }

  if (kind !== "photo" && kind !== "note" && kind !== "static-text" && kind !== "color-field") {
    issues.push({ code: "slot", message: `Slot ${slot.id} has an invalid kind.` });
    return;
  }
  if (kind === "color-field") {
    if (candidate.foregroundToken !== undefined) {
      issues.push({ code: "color", message: `Color field ${slot.id} cannot declare a foregroundToken.` });
    }
    if (["fit", "allowBleed", "allowGutterCrossing", "maxLines", "repeatable", "text", "textSource"]
      .some((key) => candidate[key] !== undefined)) {
      issues.push({ code: "color", message: `Color field ${slot.id} contains properties from another slot kind.` });
    }
    return;
  }
  if (kind === "photo") {
    if (candidate.fillToken !== undefined || candidate.foregroundToken !== undefined) {
      issues.push({ code: "color", message: `Photo slot ${slot.id} cannot declare fillToken or foregroundToken.` });
    }
    return;
  }
  if (candidate.foregroundToken !== undefined && !isRecipeColorToken(candidate.foregroundToken)) {
    issues.push({ code: "color", message: `Text slot ${slot.id} contains an invalid foregroundToken.` });
  }
  if (candidate.fillToken !== undefined) {
    issues.push({ code: "color", message: `Text slot ${slot.id} cannot declare a fillToken.` });
  }
}

const typographyTokenAllowedKeys = ["size", "lineHeight", "weight", "tracking", "transform"] as const;

export function validateTypographyContract(recipe: RecipeDefinition): readonly RecipeDefinitionIssue[] {
  const issues: RecipeDefinitionIssue[] = [];
  const semanticDefinition = isSemanticRecipeDefinition(recipe);
  const declaredTypography = recipe.theme?.typography;
  const rawTheme = recipe.theme as unknown as Record<string, unknown> | undefined;
  const allowedThemeKeys = ["background", "foreground", "muted", "photoBackground", "colorTokens", "typography"];
  const unexpectedThemeKeys = rawTheme ? Object.keys(rawTheme).filter((key) => !allowedThemeKeys.includes(key)) : [];
  if (unexpectedThemeKeys.length > 0) {
    issues.push({ code: "typography", message: `Theme contains unsupported field(s): ${unexpectedThemeKeys.join(", ")}.` });
  }

  for (const [role, token] of Object.entries(declaredTypography ?? {})) {
    if (!isRecipeTypographyRole(role)) {
      issues.push({ code: "typography", message: `Unknown typography role '${role}'.` });
      continue;
    }
    if (!isRecipeTypographyToken(token)) {
      issues.push({ code: "typography", message: `Typography role '${role}' must use a complete controlled token.` });
    }
  }

  for (const slot of recipe.slots) {
    if (slot.kind !== "note" && slot.kind !== "static-text") continue;
    const candidate = slot as RecipeTextSlot;
    if (!isRecipeTypographyRole(candidate.role)) {
      if (semanticDefinition) {
        issues.push({ code: "typography", message: `Text slot ${slot.id} must declare a controlled typography role.` });
      }
      continue;
    }
    if (semanticDefinition && !declaredTypography?.[candidate.role]) {
      issues.push({ code: "typography", message: `Theme must provide a typography token for role '${candidate.role}'.` });
    }
    if (candidate.align !== undefined && !isRecipeTextAlign(candidate.align)) {
      issues.push({ code: "typography", message: `Text slot ${slot.id} has an invalid alignment token.` });
    }
    if (slot.kind === "note" && !(["caption", "note", "index"] as readonly string[]).includes(candidate.role)) {
      issues.push({ code: "typography", message: `Note slot ${slot.id} may only use caption, note, or index.` });
    }
    if (slot.kind === "static-text") {
      if (candidate.role === "folio" && slot.textSource !== "page-number") {
        issues.push({ code: "typography", message: `Folio slot ${slot.id} must use the page-number text source.` });
      }
      if (slot.textSource === "page-number" && candidate.role !== "folio") {
        issues.push({ code: "typography", message: `Page-number slot ${slot.id} must use the folio role.` });
      }
      if (candidate.role === "title" && slot.textSource !== "title" && slot.textSource !== "literal") {
        issues.push({ code: "typography", message: `Title slot ${slot.id} must use title or literal text.` });
      }
    }
  }
  return issues;
}

function isRecipeTypographyRole(value: unknown): value is RecipeTypographyRole {
  return typeof value === "string" && (RECIPE_TYPOGRAPHY_ROLES as readonly string[]).includes(value);
}

function isRecipeTextAlign(value: unknown): value is RecipeTextAlign {
  return typeof value === "string" && (RECIPE_TEXT_ALIGNS as readonly string[]).includes(value);
}

function isRecipeTypographyToken(value: unknown): value is RecipeTypographyToken {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const token = value as Record<string, unknown>;
  if (Object.keys(token).some((key) => !typographyTokenAllowedKeys.includes(key as typeof typographyTokenAllowedKeys[number]))) {
    return false;
  }
  return (RECIPE_TYPOGRAPHY_SIZES as readonly unknown[]).includes(token.size)
    && (RECIPE_TYPOGRAPHY_LINE_HEIGHTS as readonly unknown[]).includes(token.lineHeight)
    && (RECIPE_TYPOGRAPHY_WEIGHTS as readonly unknown[]).includes(token.weight)
    && (RECIPE_TYPOGRAPHY_TRACKING as readonly unknown[]).includes(token.tracking)
    && (RECIPE_TYPOGRAPHY_TRANSFORMS as readonly unknown[]).includes(token.transform);
}

function validateColorFieldPageSide(
  recipe: RecipeDefinition,
  slot: RecipeColorFieldSlot,
  issues: RecipeDefinitionIssue[],
) {
  if (recipe.scope === "page" && slot.pageSide === "cross-spread") {
    issues.push({ code: "scope", message: `Color field ${slot.id} cannot be cross-spread in a page recipe.` });
    return;
  }
  if (recipe.scope !== "spread") return;
  const crossesGutter = slot.rect.x < 1 && slot.rect.x + slot.rect.width > 1;
  if (slot.pageSide === "cross-spread" && !crossesGutter) {
    issues.push({ code: "scope", message: `Cross-spread color field ${slot.id} must cross the gutter at x=1.` });
  }
  if (slot.pageSide === "left" && (slot.rect.x < 0 || slot.rect.x + slot.rect.width > 1)) {
    issues.push({ code: "scope", message: `Left color field ${slot.id} must stay on the left page.` });
  }
  if (slot.pageSide === "right" && (slot.rect.x < 1 || slot.rect.x + slot.rect.width > 2)) {
    issues.push({ code: "scope", message: `Right color field ${slot.id} must stay on the right page.` });
  }
}

function containsRect(outer: RecipeRect, inner: RecipeRect) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

function rectanglesIntersect(left: RecipeRect, right: RecipeRect) {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

function parseOpaqueColor(value: string): readonly [number, number, number] | null {
  const color = value.trim();
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    const normalized = hex.length === 3 ? hex.split("").map((channel) => channel + channel).join("") : hex;
    return [0, 2, 4].map((index) => Number.parseInt(normalized.slice(index, index + 2), 16)) as [number, number, number];
  }
  const rgb = color.match(/^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i);
  if (!rgb || rgb.slice(1).some((channel) => Number(channel) > 255)) return null;
  return [Number(rgb[1]), Number(rgb[2]), Number(rgb[3])];
}

function relativeLuminance(color: readonly [number, number, number] | null) {
  if (!color) return null;
  const channels = color.map((channel) => {
    const normalized = channel / 255;
    return normalized <= .03928 ? normalized / 12.92 : ((normalized + .055) / 1.055) ** 2.4;
  });
  return .2126 * channels[0]! + .7152 * channels[1]! + .0722 * channels[2]!;
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

function isRectInsideCanvas(rect: RecipeRect, coordinateWidth: 1 | 2) {
  return rect.width > 0 && rect.height > 0
    && rect.x >= 0 && rect.y >= 0
    && rect.x + rect.width <= coordinateWidth
    && rect.y + rect.height <= 1;
}

function greatestCommonDivisor(a: number, b: number): number {
  let left = Math.abs(a);
  let right = Math.abs(b);
  while (right !== 0) {
    const remainder = left % right;
    left = right;
    right = remainder;
  }
  return left || 1;
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
    ? recipe.slots.find((slot): slot is RecipeNoteSlot => slot.kind === "note" && slot.id === relation.noteSlotId)
    : undefined;
}

function getRecipeNoteMaxLines(recipe: RecipeDefinition, noteSlot: RecipeNoteSlot | undefined) {
  const limits = [noteSlot?.maxLines, recipe.capabilities.notes.maxLines]
    .filter((value): value is number => value !== undefined);
  return limits.length > 0 ? Math.min(...limits) : undefined;
}

export function createNotesByPhotoId(photos: readonly ZinePhoto[]) {
  return Object.fromEntries(photos.map((photo) => [photo.id, photo.caption])) as Readonly<Record<string, string>>;
}
