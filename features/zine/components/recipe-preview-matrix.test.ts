import { describe, expect, it } from "vitest";
import { evaluateRecipeCompatibility, validateRecipeDefinition } from "../model/recipe-contract";
import { createRecipeRenderPlan } from "./recipe-renderer-plan";
import {
  createRecipePreviewMatrix,
  recipePreviewContentFixtures,
  recipePreviewPageFixtures,
} from "./recipe-preview-matrix";

describe("Phase E Recipe Preview Matrix", () => {
  it("declares the required content and page fixture dimensions", () => {
    const contentTags = new Set(recipePreviewContentFixtures.flatMap((fixture) => fixture.tags));
    const pageTags = new Set(recipePreviewPageFixtures.flatMap((fixture) => fixture.tags));

    for (const tag of [
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
      "multi-note",
    ] as const) {
      expect(contentTags.has(tag)).toBe(true);
    }
    for (const tag of [
      "left-page",
      "right-page",
      "standard-spread",
    ] as const) {
      expect(pageTags.has(tag)).toBe(true);
    }
  });

  it("renders every matrix case through the shared plan without PageFlip", () => {
    const matrix = createRecipePreviewMatrix();
    expect(matrix.length).toBeGreaterThanOrEqual(15);

    for (const fixture of matrix) {
      expect(validateRecipeDefinition(fixture.recipe).valid, fixture.id).toBe(true);
      const plans = fixture.environments.map((environment) => createRecipeRenderPlan({
        recipe: fixture.recipe,
        application: fixture.application,
        photos: fixture.photos,
        environment,
      }));

      expect(plans.every((plan) => plan.valid), fixture.id).toBe(true);
      expect(plans.every((plan) => plan.slots.every((slot) => (
        slot.kind !== "photo" || slot.showPhotoPlaceholder === (fixture.environments[0]?.mode === "editor")
      ))), fixture.id).toBe(true);
    }
  });

  it("covers the overflow and multiple-note boundaries", () => {
    const matrix = createRecipePreviewMatrix();
    const overCapacity = matrix.find((fixture) => fixture.id === "over-capacity");
    const multiNote = matrix.find((fixture) => fixture.id === "maximum-multi-note");
    expect(overCapacity).toBeDefined();
    expect(multiNote).toBeDefined();
    if (!overCapacity || !multiNote) return;

    expect(overCapacity.application.unplacedPhotoIds).toEqual(["over-3"]);
    expect(evaluateRecipeCompatibility(overCapacity.recipe, overCapacity.content).code).toBe("too-much-content");

    const noteSlot = multiNote
      ? createRecipeRenderPlan({
          recipe: multiNote.recipe,
          application: multiNote.application,
          photos: multiNote.photos,
          environment: multiNote.environments[0]!,
        }).slots.find((slot) => slot.kind === "note")
      : undefined;
    expect(noteSlot?.notes).toHaveLength(4);
    expect(noteSlot?.notes?.map((note) => note.index)).toEqual([0, 1, 2, 3]);
  });

  it("keeps both halves of spread and color cases data-driven", () => {
    const matrix = createRecipePreviewMatrix();
    const spread = matrix.find((fixture) => fixture.id === "dark-cross-gutter");
    const color = matrix.find((fixture) => fixture.id === "color-system");
    expect(spread).toBeDefined();
    expect(color).toBeDefined();
    if (!spread || !color) return;

    const plans = spread.environments.map((environment) => createRecipeRenderPlan({
      recipe: spread.recipe,
      application: spread.application,
      photos: spread.photos,
      environment,
    }));
    const placementIds = plans.flatMap((plan) => plan.slots
      .filter((slot) => slot.kind === "photo")
      .map((slot) => slot.placementId));

    expect(plans).toHaveLength(2);
    expect(placementIds).toEqual([
      spread.application.assignments[0]?.placementId,
      spread.application.assignments[0]?.placementId,
    ]);
    expect(spread.recipe.theme).toMatchObject({
      background: "#282722",
      foreground: "#f4f0e7",
    });
    expect(color.recipe.theme).toMatchObject({
      background: "#243b7a",
      foreground: "#fff7dc",
    });
  });
});
