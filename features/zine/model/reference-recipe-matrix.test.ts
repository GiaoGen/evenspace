import { describe, expect, it } from "vitest";
import { validateRecipeDefinition } from "./recipe-contract";
import { createReferencePreviewMatrix, referencePreviewScenarios } from "./reference-recipe-matrix";
import { referenceRecipeDefinitions } from "./reference-recipe-definitions";

describe("Reference Recipe Gate", () => {
  it("defines six semantic reference recipes independently of the runtime style catalog", () => {
    expect(referenceRecipeDefinitions.map((recipe) => recipe.id)).toEqual([
      "reference-single-photo-no-note-v1",
      "reference-single-photo-note-v1",
      "reference-multi-photo-no-note-v1",
      "reference-multi-photo-indexed-note-v1",
      "reference-cross-gutter-v1",
      "reference-multi-color-system-v1",
    ]);
    expect(referenceRecipeDefinitions.every((recipe) => validateRecipeDefinition(recipe).valid)).toBe(true);

    const noNoteRecipes = referenceRecipeDefinitions.filter((recipe) => recipe.capabilities.notes.mode === "none");
    expect(noNoteRecipes).toHaveLength(3);
    expect(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-cross-gutter-v1")?.scope).toBe("spread");
    expect(referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-multi-color-system-v1")?.theme?.background).toBe("#17384a");
    expect(referenceRecipeDefinitions.every((recipe) => recipe.status === "draft")).toBe(true);

    const noteRecipe = referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-single-photo-note-v1");
    const notePhoto = noteRecipe?.slots.find((slot) => slot.id === "hero-photo");
    const noteSlot = noteRecipe?.slots.find((slot) => slot.kind === "note");
    expect(notePhoto?.rect.x).toBeLessThan(noteSlot?.rect.x ?? 0);
    expect(notePhoto?.rect.y).toBe(noteSlot?.rect.y);
    expect(noteRecipe?.noteRelations).toContainEqual({
      photoSlotId: "hero-photo",
      noteSlotId: "note-1",
      kind: "aligned",
    });
  });

  it("covers minimum, maximum, over-capacity, ratios, Notes, and both render modes", () => {
    const matrix = createReferencePreviewMatrix();
    expect(matrix).toHaveLength(referenceRecipeDefinitions.length * referencePreviewScenarios.length * 2);
    expect(matrix.every((cell) => cell.errors.length === 0)).toBe(true);
    expect(matrix.every((cell) => cell.compatibility.code.length > 0)).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);
    expect(matrix.every((cell) => cell.recipeId && cell.fixtureId && cell.mode && cell.slotIds.length > 0)).toBe(true);

    for (const recipe of referenceRecipeDefinitions) {
      const recipeCells = matrix.filter((cell) => cell.recipeId === recipe.id);
      expect(new Set(recipeCells.map((cell) => cell.scenario))).toEqual(
        new Set(referencePreviewScenarios.map((scenario) => scenario.id)),
      );
      expect(new Set(recipeCells.map((cell) => cell.mode))).toEqual(new Set(["editor", "reader"]));
      expect(recipeCells.filter((cell) => cell.scenario === "over-capacity")[0]?.application.unplacedPhotoIds).toHaveLength(1);
      expect(recipeCells.find((cell) => cell.scenario === "over-capacity")?.compatibility).toMatchObject({
        code: "too-much-content",
        valid: false,
      });
    }
  });

  it("shows a real empty fixture and explicit compatibility failures", () => {
    const matrix = createReferencePreviewMatrix();
    const emptyEditor = matrix.find((cell) => (
      cell.recipeId === "reference-single-photo-note-v1"
      && cell.scenario === "empty"
      && cell.mode === "editor"
    ));
    expect(emptyEditor?.application.assignments).toHaveLength(0);
    expect(emptyEditor?.plans[0]?.slots.some((slot) => slot.kind === "photo" && slot.showPhotoPlaceholder)).toBe(true);

    const noteOverflow = matrix.find((cell) => (
      cell.recipeId === "reference-single-photo-note-v1"
      && cell.scenario === "note-overflow"
      && cell.mode === "reader"
    ));
    expect(noteOverflow?.compatibility).toMatchObject({ code: "note-too-long", valid: false });
    expect(noteOverflow?.compatibilitySlotId).toBe("note-1");
  });

  it("keeps editor placeholders visible while reader hides empty photo slots", () => {
    const matrix = createReferencePreviewMatrix();
    const editor = matrix.find((cell) => cell.recipeId === "reference-multi-photo-no-note-v1" && cell.scenario === "minimum" && cell.mode === "editor");
    const reader = matrix.find((cell) => cell.recipeId === "reference-multi-photo-no-note-v1" && cell.scenario === "minimum" && cell.mode === "reader");
    expect(editor?.plans[0]?.slots.filter((slot) => slot.kind === "photo" && !slot.photo)).toHaveLength(2);
    expect(editor?.plans[0]?.slots.filter((slot) => slot.kind === "photo" && !slot.photo && slot.showPhotoPlaceholder)).toHaveLength(2);
    expect(reader?.plans[0]?.slots.filter((slot) => slot.kind === "photo" && !slot.photo && slot.showPhotoPlaceholder)).toHaveLength(0);
  });

  it("renders one cross-gutter assignment into both page plans", () => {
    const matrix = createReferencePreviewMatrix();
    const cell = matrix.find((candidate) => (
      candidate.recipeId === "reference-cross-gutter-v1"
      && candidate.scenario === "maximum"
      && candidate.mode === "reader"
    ));
    expect(cell?.environments).toHaveLength(2);
    expect(cell?.application.targetPageIds).toHaveLength(2);
    expect(cell?.plans.every((plan) => plan.slots.some((slot) => slot.id === "cross-gutter-photo" && slot.crossSpread))).toBe(true);
    expect(new Set(cell?.plans.flatMap((plan) => plan.slots
      .filter((slot) => slot.id === "cross-gutter-photo")
      .map((slot) => slot.placementId)))).toEqual(new Set([cell?.application.assignments[0]?.placementId]));
  });

  it("keeps no, short, and long Note fixtures observable in Note-capable recipes", () => {
    const matrix = createReferencePreviewMatrix();
    for (const scenario of ["no-note", "short-note", "long-note"] as const) {
      const cell = matrix.find((candidate) => (
        candidate.recipeId === "reference-single-photo-note-v1"
        && candidate.scenario === scenario
        && candidate.mode === "reader"
      ));
      const noteSlots = cell?.plans[0]?.slots.filter((slot) => slot.kind === "note") ?? [];
      if (scenario === "no-note") {
        expect(noteSlots).toHaveLength(0);
      } else {
        expect(noteSlots[0]?.notes?.[0]?.text).toContain("Photo Note");
      }
    }
  });

  it("feeds short and long Notes through no-note recipes so hidden-note behavior is exercised", () => {
    const matrix = createReferencePreviewMatrix();
    for (const scenario of ["short-note", "long-note"] as const) {
      const cell = matrix.find((candidate) => (
        candidate.recipeId === "reference-single-photo-no-note-v1"
        && candidate.scenario === scenario
        && candidate.mode === "reader"
      ));
      expect(cell?.application.hiddenNotePhotoIds).toHaveLength(1);
      expect(cell?.plans[0]?.slots.some((slot) => slot.kind === "note")).toBe(false);
    }
  });
});
