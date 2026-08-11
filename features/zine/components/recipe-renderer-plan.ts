import {
  validateRecipeDefinition,
  type RecipeApplication,
  type RecipeDefinition,
  type RecipeNoteRelation,
  type RecipeRect,
  type RecipeSlot,
  type RecipeSlotKind,
} from "../model/recipe-contract";
import { normalizePlacement } from "../model/recipe-placement";
import type { ZinePhoto } from "../model/zine-draft";

export type RecipeRenderPageSide = "left" | "right";
export type RecipeRenderMode = "editor" | "reader" | "preview";

export type RecipeRenderEnvironment = {
  readonly pageId: string;
  readonly pageSide: RecipeRenderPageSide;
  readonly mode: RecipeRenderMode;
  readonly pageNumber: number;
  readonly title: string;
  readonly textBySlotId?: Readonly<Record<string, string>>;
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
};

export type RecipeRenderNote = {
  readonly photoSlotId: string;
  readonly noteSlotId: string;
  readonly photoId: string;
  readonly text: string;
  readonly relation: RecipeNoteRelation["kind"] | null;
  readonly index: number;
};

export type RecipeRenderPlan = {
  readonly recipeId: string;
  readonly scope: RecipeDefinition["scope"];
  readonly valid: boolean;
  readonly issues: ReturnType<typeof validateRecipeDefinition>["issues"];
  readonly slots: readonly RecipeRenderPlanSlot[];
};

export function createRecipeRenderPlan({
  recipe,
  application,
  photos,
  environment,
}: {
  readonly recipe: RecipeDefinition;
  readonly application: RecipeApplication;
  readonly photos: readonly ZinePhoto[];
  readonly environment: RecipeRenderEnvironment;
}): RecipeRenderPlan {
  const validation = validateRecipeDefinition(recipe);
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
    const localRect = getLocalSlotRect(recipe, slot, environment.pageSide);
    if (!localRect) continue;

    if (slot.kind === "photo") {
      const assignment = assignmentByPhotoSlotId.get(slot.id);
      const photo = assignment ? photoById.get(assignment.photoId) : undefined;
      const placement = normalizePlacement(
        assignment,
        photo ? { focusX: photo.defaultFocusX, focusY: photo.defaultFocusY } : undefined,
      );
      slots.push({
        id: slot.id,
        pageId: environment.pageId,
        kind: slot.kind,
        rect: localRect.rect,
        zIndex: slot.zIndex,
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

    if (slot.kind === "note") {
      const notes = assignmentsByNoteSlotId.get(slot.id) ?? [];
      if (notes.length === 0) continue;
      slots.push({
        id: slot.id,
        pageId: environment.pageId,
        kind: slot.kind,
        rect: localRect.rect,
        zIndex: slot.zIndex,
        showPhotoPlaceholder: false,
        crossSpread: localRect.crossSpread,
        notes,
      });
      continue;
    }

    const text = resolveStaticText(slot, environment);
    if (!text) continue;
    slots.push({
      id: slot.id,
      pageId: environment.pageId,
      kind: slot.kind,
      rect: localRect.rect,
      zIndex: slot.zIndex,
      showPhotoPlaceholder: false,
      crossSpread: localRect.crossSpread,
      text,
    });
  }

  return {
    recipeId: recipe.id,
    scope: recipe.scope,
    valid: validation.valid,
    issues: validation.issues,
    slots: slots.toSorted((left, right) => left.zIndex - right.zIndex),
  };
}

function resolveStaticText(
  slot: RecipeSlot,
  environment: RecipeRenderEnvironment,
) {
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
