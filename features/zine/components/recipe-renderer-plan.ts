import {
  validateRecipeDefinition,
  adaptRecipeSlot,
  adaptRecipeTheme,
  adaptRecipeTypography,
  estimateRecipeTextLayout,
  resolveRecipeTypographyFontRole,
  resolveRecipeTypographyPreset,
  resolveRecipeTextSurface,
  type RecipeApplication,
  type RecipeDefinition,
  type RecipeNoteRelation,
  type RecipeRect,
  type RecipeSlot,
  type RecipeSlotKind,
  type RecipeColorToken,
  type RecipeTheme,
  type RecipeTextAlign,
  type RecipeTypographyRole,
  type RecipeTypographyToken,
  type RecipeTypographyFontRole,
  type RecipeTypographyPresetId,
  type RecipeTextLayout,
  type AuthoredTextItem,
} from "../model/recipe-contract";
import { normalizePlacement } from "../model/recipe-placement";
import type { ZineLocale, ZinePhoto } from "../model/zine-draft";
import {
  createZineTypographyIssue,
  ZINE_TYPOGRAPHY_SYSTEM_ID,
  type ZineTypographySystemId,
  type ZineTypographyIssue,
} from "../model/zine-typography";

export type RecipeRenderPageSide = "left" | "right";
export type RecipeRenderMode = "editor" | "reader" | "preview";

/** Renderer-facing semantic palette; legacy four-color themes are adapted here. */
export function getRecipeRendererColorTokens(theme?: RecipeTheme) {
  return adaptRecipeTheme(theme);
}

export type RecipeRenderEnvironment = {
  readonly pageId: string;
  readonly pageSide: RecipeRenderPageSide;
  readonly mode: RecipeRenderMode;
  readonly pageNumber: number;
  readonly title: string;
  readonly locale: ZineLocale;
  readonly textBySlotId?: Readonly<Record<string, string>>;
  readonly authoredTextItems?: readonly AuthoredTextItem[];
};

export type RecipeRenderPlanSlot = {
  readonly id: string;
  readonly pageId: string;
  readonly kind: RecipeSlotKind;
  readonly rect: RecipeRect;
  readonly zIndex: number;
  readonly photoId?: string;
  readonly photo?: ZinePhoto;
  readonly placementId?: string;
  readonly placementKey?: string;
  readonly focusX?: number;
  readonly focusY?: number;
  readonly scale?: number;
  readonly showPhotoPlaceholder: boolean;
  readonly crossSpread: boolean;
  readonly imageStartPercent?: number;
  readonly imageWidthPercent?: number;
  readonly notes?: readonly RecipeRenderNote[];
  readonly text?: string;
  readonly textContentId?: string;
  readonly contentKey?: string;
  readonly fillToken?: RecipeColorToken;
  readonly foregroundToken?: RecipeColorToken;
  readonly surfaceToken?: RecipeColorToken;
  readonly typographyRole?: RecipeTypographyRole;
  readonly typographyToken?: RecipeTypographyToken;
  readonly typographyLayout?: RecipeTextLayout;
  readonly typographyPresetId?: RecipeTypographyPresetId;
  readonly typographyFontRole?: RecipeTypographyFontRole;
  readonly locale?: ZineLocale;
  readonly maxLines?: number;
  readonly textAlign?: "start" | "center" | "end";
};

export type RecipeRenderNote = {
  readonly photoSlotId: string;
  readonly noteSlotId: string;
  readonly photoId: string;
  readonly text: string;
  readonly relation: RecipeNoteRelation["kind"] | null;
  readonly index: number;
  readonly typographyLayout?: RecipeTextLayout;
};

export type RecipeRenderPlan = {
  readonly recipeId: string;
  readonly scope: RecipeDefinition["scope"];
  readonly valid: boolean;
  readonly issues: ReturnType<typeof validateRecipeDefinition>["issues"];
  readonly typographyIssues: readonly ZineTypographyIssue[];
  readonly slots: readonly RecipeRenderPlanSlot[];
};

export function createRecipeRenderPlan({
  recipe,
  application,
  photos,
  environment,
  typographySystem = ZINE_TYPOGRAPHY_SYSTEM_ID,
}: {
  readonly recipe: RecipeDefinition;
  readonly application: RecipeApplication;
  readonly photos: readonly ZinePhoto[];
  readonly environment: RecipeRenderEnvironment;
  readonly typographySystem?: ZineTypographySystemId;
}): RecipeRenderPlan {
  const validation = validateRecipeDefinition(recipe);
  const typography = adaptRecipeTypography(recipe.theme);
  const typographyPresetId = resolveRecipeTypographyPreset(recipe.theme);
  const typographyIssues: ZineTypographyIssue[] = [];
  const photoById = new Map(photos.map((photo) => [photo.id, photo]));
  const assignmentByPhotoSlotId = new Map(
    application.assignments.map((assignment) => [assignment.photoSlotId, assignment]),
  );
  const relationsByPhotoSlotId = new Map(
    recipe.noteRelations.map((relation) => [relation.photoSlotId, relation]),
  );
  const assignmentsByNoteSlotId = new Map<string, RecipeRenderNote[]>();

  for (const assignment of application.assignments) {
    if (!assignment.noteSlotId || !assignment.noteOfPhotoId) continue;
    const text = photoById.get(assignment.noteOfPhotoId)?.caption.trim();
    if (!text) continue;
    const relation = relationsByPhotoSlotId.get(assignment.photoSlotId);
    const notes = assignmentsByNoteSlotId.get(assignment.noteSlotId) ?? [];
    notes.push({
      photoSlotId: assignment.photoSlotId,
      noteSlotId: assignment.noteSlotId,
      photoId: assignment.noteOfPhotoId,
      text,
      relation: relation?.kind ?? null,
      index: notes.length,
    });
    assignmentsByNoteSlotId.set(assignment.noteSlotId, notes);
  }

  const slots: RecipeRenderPlanSlot[] = [];
  for (const slot of recipe.slots) {
    const adaptedSlot = adaptRecipeSlot(slot);
    const localRect = getLocalSlotRect(recipe, adaptedSlot, environment.pageSide);
    if (!localRect) continue;

    if (adaptedSlot.kind === "color-field") {
      slots.push({
        id: adaptedSlot.id,
        pageId: environment.pageId,
        kind: adaptedSlot.kind,
        rect: localRect.rect,
        zIndex: adaptedSlot.zIndex,
        showPhotoPlaceholder: false,
        crossSpread: localRect.crossSpread,
        fillToken: adaptedSlot.fillToken,
      });
      continue;
    }

    if (adaptedSlot.kind === "photo") {
      const assignment = assignmentByPhotoSlotId.get(adaptedSlot.id);
      const photo = assignment ? photoById.get(assignment.photoId) : undefined;
      const placement = normalizePlacement(
        assignment,
        photo ? { focusX: photo.defaultFocusX, focusY: photo.defaultFocusY } : undefined,
      );
      slots.push({
        id: adaptedSlot.id,
        pageId: environment.pageId,
        kind: adaptedSlot.kind,
        rect: localRect.rect,
        zIndex: adaptedSlot.zIndex,
        photoId: photo?.id,
        photo,
        placementId: assignment?.placementId,
        placementKey: assignment ? `${environment.pageId}:${assignment.placementId}` : undefined,
        ...placement,
        showPhotoPlaceholder: environment.mode !== "reader",
        crossSpread: localRect.crossSpread,
        imageStartPercent: localRect.imageStartPercent,
        imageWidthPercent: localRect.imageWidthPercent,
      });
      continue;
    }

    if (adaptedSlot.kind === "note") {
      const notes = assignmentsByNoteSlotId.get(adaptedSlot.id) ?? [];
      if (notes.length === 0) continue;
      const notesWithLayout = notes.map((note) => ({
        ...note,
        typographyLayout: estimateRecipeTextLayout(recipe, adaptedSlot, note.text, environment.locale),
      }));
      const surface = resolveRecipeTextSurface(recipe, adaptedSlot);
      const typographyRole = adaptedSlot.role!;
      const typographyFontRole = resolveRecipeTypographyFontRole(recipe.theme, typographyRole);
      addTypographyIssue(
        typographyIssues,
        notes.map((note) => note.text).join("\n"),
        environment.locale,
        typographyPresetId,
        typographyFontRole,
        typography[typographyRole].weight,
        typographySystem,
      );
      slots.push({
        id: adaptedSlot.id,
        pageId: environment.pageId,
        kind: adaptedSlot.kind,
        rect: localRect.rect,
        zIndex: adaptedSlot.zIndex,
        showPhotoPlaceholder: false,
        crossSpread: localRect.crossSpread,
        notes: notesWithLayout,
        foregroundToken: adaptedSlot.foregroundToken,
        surfaceToken: surface.surfaceToken,
        typographyRole,
        typographyToken: typography[typographyRole],
        typographyLayout: estimateRecipeTextLayout(recipe, adaptedSlot, notes.map((note) => note.text).join("\n"), environment.locale),
        typographyPresetId,
        typographyFontRole,
        locale: environment.locale,
        maxLines: adaptedSlot.maxLines,
        textAlign: resolveRecipeTextAlign(adaptedSlot.align, environment.pageSide),
      });
      continue;
    }

    const authoredAssignment = adaptedSlot.textSource === "authored"
      ? application.textAssignments?.find((assignment) => (
          assignment.staticTextSlotId === adaptedSlot.id
          && assignment.contentKey === adaptedSlot.contentKey
        ))
      : undefined;
    const authoredItem = authoredAssignment
      ? environment.authoredTextItems?.find((item) => (
          item.id === authoredAssignment.textContentId
          && item.contentKey === adaptedSlot.contentKey
        ))
      : undefined;
    const text = resolveStaticText(adaptedSlot, environment, authoredItem?.text);
    if (!text) continue;
    const surface = resolveRecipeTextSurface(recipe, adaptedSlot);
    const typographyRole = adaptedSlot.role!;
    const typographyFontRole = resolveRecipeTypographyFontRole(recipe.theme, typographyRole);
    addTypographyIssue(
      typographyIssues,
      text,
      environment.locale,
      typographyPresetId,
      typographyFontRole,
      typography[typographyRole].weight,
      typographySystem,
    );
    slots.push({
      id: adaptedSlot.id,
      pageId: environment.pageId,
      kind: adaptedSlot.kind,
      rect: localRect.rect,
      zIndex: adaptedSlot.zIndex,
      showPhotoPlaceholder: false,
      crossSpread: localRect.crossSpread,
      text,
      textContentId: authoredAssignment?.textContentId,
      contentKey: adaptedSlot.contentKey,
      foregroundToken: adaptedSlot.foregroundToken,
      surfaceToken: surface.surfaceToken,
      typographyRole,
      typographyToken: typography[typographyRole],
      typographyLayout: estimateRecipeTextLayout(recipe, adaptedSlot, text, environment.locale),
      typographyPresetId,
      typographyFontRole,
      locale: environment.locale,
      maxLines: adaptedSlot.maxLines,
      textAlign: resolveRecipeTextAlign(adaptedSlot.align, environment.pageSide),
    });
  }

  return {
    recipeId: recipe.id,
    scope: recipe.scope,
    valid: validation.valid && typographyIssues.length === 0,
    issues: validation.issues,
    typographyIssues,
    slots: slots.toSorted((left, right) => left.zIndex - right.zIndex),
  };
}

function addTypographyIssue(
  issues: ZineTypographyIssue[],
  text: string,
  locale: ZineLocale,
  presetId: RecipeTypographyPresetId,
  fontRole: RecipeTypographyFontRole,
  weight: RecipeTypographyToken["weight"],
  system: ZineTypographySystemId,
) {
  const issue = createZineTypographyIssue({ text, locale, presetId, fontRole, weight, system });
  if (!issue) return;
  const key = `${issue.system}:${issue.locale}:${issue.presetId}:${issue.fontRole}:${issue.codePoints.join(",")}`;
  if (!issues.some((candidate) => (
    `${candidate.system}:${candidate.locale}:${candidate.presetId}:${candidate.fontRole}:${candidate.codePoints.join(",")}` === key
  ))) issues.push(issue);
}

export function resolveRecipeTextAlign(
  align: RecipeTextAlign | undefined,
  pageSide: RecipeRenderPageSide,
): "start" | "center" | "end" {
  if (align === "center" || align === "end") return align;
  if (align === "inward") return pageSide === "left" ? "end" : "start";
  if (align === "outward") return pageSide === "left" ? "start" : "end";
  return "start";
}

function resolveStaticText(
  slot: Extract<RecipeSlot, { kind: "static-text" }>,
  environment: RecipeRenderEnvironment,
  authoredText?: string,
) {
  if (slot.textSource === "authored") return authoredText?.trim() ?? "";
  const override = environment.textBySlotId?.[slot.id];
  if (override !== undefined) return override.trim();
  if (slot.textSource === "title") return environment.title.trim();
  if (slot.textSource === "page-number") return String(environment.pageNumber).padStart(2, "0");
  if (slot.textSource === "literal" || slot.textSource === undefined) return slot.text?.trim() ?? "";
  return "";
}

function getLocalSlotRect(
  recipe: RecipeDefinition,
  slot: RecipeSlot,
  pageSide: RecipeRenderPageSide,
) {
  if (recipe.scope === "page") {
    return { rect: slot.rect, crossSpread: false };
  }

  const pageOffset = pageSide === "left" ? 0 : 1;
  if (slot.pageSide === "left" && pageSide !== "left") return null;
  if (slot.pageSide === "right" && pageSide !== "right") return null;

  if (slot.pageSide !== "cross-spread") {
    return {
      rect: { ...slot.rect, x: slot.rect.x - pageOffset },
      crossSpread: false,
    };
  }

  const start = Math.max(0, slot.rect.x - pageOffset);
  const end = Math.min(1, slot.rect.x + slot.rect.width - pageOffset);
  if (end <= start) return null;
  const width = end - start;
  const imageStartPercent = ((start + pageOffset - slot.rect.x) / slot.rect.width) * 100;
  const imageWidthPercent = (slot.rect.width / width) * 100;
  return {
    rect: { x: start, y: slot.rect.y, width, height: slot.rect.height },
    crossSpread: true,
    imageStartPercent,
    imageWidthPercent,
  };
}
