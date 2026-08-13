import { describe, expect, it } from "vitest";
import { validateRecipeDefinition } from "./recipe-contract";
import { QUIET_RECIPE_IDS, quietRecipeDefinitions } from "./quiet-recipe-definitions";
import {
  createQuietPreviewMatrix,
  quietPreviewScenarios,
  scaleEchoMaximumNote,
} from "./quiet-recipe-matrix";

describe("Phase F3-B1 Quiet formal Preview Matrix", () => {
  it("covers every declared scenario in both Editor and Reader without duplicating formal Definitions", () => {
    const matrix = createQuietPreviewMatrix();
    expect(matrix).toHaveLength(quietPreviewScenarios.length * 2);
    expect(matrix).toHaveLength(82);
    expect(matrix.every((cell) => quietRecipeDefinitions.includes(cell.recipe as never))).toBe(true);
    expect(matrix.every((cell) => validateRecipeDefinition(cell.recipe).valid && cell.errors.length === 0)).toBe(true);
    expect(matrix.every((cell) => cell.plans.every((plan) => plan.valid))).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);

    for (const definition of quietRecipeDefinitions) {
      const cells = matrix.filter((cell) => cell.recipeId === definition.id);
      expect(new Set(cells.map((cell) => cell.mode))).toEqual(new Set(["editor", "reader"]));
      expect(new Set(cells.map((cell) => cell.scenario))).toEqual(new Set(
        quietPreviewScenarios.filter((scenario) => scenario.recipeId === definition.id).map((scenario) => scenario.id),
      ));
    }
    expect(matrix.filter((cell) => cell.recipeId === QUIET_RECIPE_IDS.heldField)).toHaveLength(24);
    expect(matrix.filter((cell) => cell.recipeId === QUIET_RECIPE_IDS.scaleEcho)).toHaveLength(32);
    expect(matrix.filter((cell) => cell.recipeId === QUIET_RECIPE_IDS.horizonBridge)).toHaveLength(26);
  });

  it("uses exact-count ratio fixtures for Scale Echo instead of one-photo stand-ins", () => {
    const ratioScenarios = new Set([
      "landscape-detail-portrait",
      "square-pair",
      "ultra-wide-pair",
    ]);
    const cells = createQuietPreviewMatrix().filter((cell) => (
      cell.recipeId === QUIET_RECIPE_IDS.scaleEcho && ratioScenarios.has(cell.scenario)
    ));
    expect(cells).toHaveLength(ratioScenarios.size * 2);
    expect(cells.every((cell) => cell.photos.length === 2 && cell.application.assignments.length === 2)).toBe(true);
  });

  it("exposes capacity, hidden Note, and fixed optional Note states with correct Compatibility", () => {
    const matrix = createQuietPreviewMatrix();
    const get = (recipeId: string, scenario: string, mode = "reader") => matrix.find((cell) => (
      cell.recipeId === recipeId && cell.scenario === scenario && cell.mode === mode
    ));

    expect(get(QUIET_RECIPE_IDS.heldField, "empty")?.compatibility.code).toBe("needs-content");
    expect(get(QUIET_RECIPE_IDS.heldField, "exact-one")?.compatibility.code).toBe("compatible");
    expect(get(QUIET_RECIPE_IDS.heldField, "over-capacity")?.application.unplacedPhotoIds).toHaveLength(1);
    expect(get(QUIET_RECIPE_IDS.heldField, "hidden-note")).toMatchObject({
      compatibility: { code: "compatible-with-hidden-notes", valid: true },
      application: { hiddenNotePhotoIds: [expect.any(String)] },
    });

    expect(get(QUIET_RECIPE_IDS.scaleEcho, "one-photo")?.compatibility.code).toBe("needs-content");
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "exact-two")?.compatibility.code).toBe("compatible");
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "over-capacity")?.compatibility.code).toBe("too-much-content");
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "over-capacity")?.application.unplacedPhotoIds).toHaveLength(1);
    expect(scaleEchoMaximumNote).toHaveLength(60);
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "max-60-three-lines")?.compatibility.code).toBe("compatible");
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "over-60")?.compatibility.code).toBe("note-too-long");
    expect(get(QUIET_RECIPE_IDS.scaleEcho, "over-three-lines")?.compatibility.code).toBe("note-too-many-lines");

    expect(get(QUIET_RECIPE_IDS.horizonBridge, "empty")?.compatibility.code).toBe("needs-content");
    expect(get(QUIET_RECIPE_IDS.horizonBridge, "exact-one")?.compatibility.code).toBe("compatible");
    expect(get(QUIET_RECIPE_IDS.horizonBridge, "over-capacity")?.compatibility.code).toBe("too-much-content");
    expect(get(QUIET_RECIPE_IDS.horizonBridge, "hidden-note")?.application.hiddenNotePhotoIds).toHaveLength(1);
  });

  it("binds Scale Echo Note only to photo-echo and does not reflow without it", () => {
    const matrix = createQuietPreviewMatrix();
    const noteCell = matrix.find((cell) => (
      cell.recipeId === QUIET_RECIPE_IDS.scaleEcho
      && cell.scenario === "echo-note-binding"
      && cell.mode === "reader"
    ));
    const noNoteCell = matrix.find((cell) => (
      cell.recipeId === QUIET_RECIPE_IDS.scaleEcho
      && cell.scenario === "no-note"
      && cell.mode === "reader"
    ));
    const note = noteCell?.plans[0]?.slots.find((slot) => slot.id === "note-echo")?.notes?.[0];
    expect(note).toMatchObject({ photoSlotId: "photo-echo", noteSlotId: "note-echo", relation: "aligned" });
    expect(noteCell?.application.assignments.find((assignment) => assignment.photoSlotId === "photo-scene")?.noteSlotId).toBeUndefined();
    expect(noNoteCell?.plans[0]?.slots.some((slot) => slot.id === "note-echo")).toBe(false);
    expect(noNoteCell?.plans[0]?.slots.filter((slot) => slot.kind === "photo").map(({ id, rect }) => ({ id, rect })))
      .toEqual(noteCell?.plans[0]?.slots.filter((slot) => slot.kind === "photo").map(({ id, rect }) => ({ id, rect })));
  });

  it("keeps Horizon Bridge atomic, continuous, and locally understandable on both sides", () => {
    const cell = createQuietPreviewMatrix().find((candidate) => (
      candidate.recipeId === QUIET_RECIPE_IDS.horizonBridge
      && candidate.scenario === "focus-continuity"
      && candidate.mode === "reader"
    ));
    expect(cell?.application.targetPageIds).toHaveLength(2);
    expect(cell?.application.assignments).toHaveLength(1);
    expect(cell?.plans).toHaveLength(2);
    const slots = cell?.plans.map((plan) => plan.slots.find((slot) => slot.id === "photo-horizon"));
    expect(new Set(slots?.map((slot) => slot?.placementId))).toEqual(new Set([cell?.application.assignments[0]?.placementId]));
    expect(new Set(slots?.map((slot) => slot?.photoId))).toEqual(new Set([cell?.photos[0]?.id]));
    expect(slots?.every((slot) => slot?.crossSpread && slot.focusX === 73 && slot.focusY === 41 && slot.scale === 1.4)).toBe(true);
    expect(slots?.[0]?.rect).not.toEqual(slots?.[1]?.rect);
    expect(slots?.[0]?.imageStartPercent).not.toBe(slots?.[1]?.imageStartPercent);
  });

  it("keeps Editor empty placeholders and suppresses Reader placeholder/edit output", () => {
    const matrix = createQuietPreviewMatrix();
    for (const recipeId of Object.values(QUIET_RECIPE_IDS)) {
      const editor = matrix.find((cell) => cell.recipeId === recipeId && cell.scenario === "empty" && cell.mode === "editor");
      const reader = matrix.find((cell) => cell.recipeId === recipeId && cell.scenario === "empty" && cell.mode === "reader");
      expect(editor?.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => slot.showPhotoPlaceholder)).toBe(true);
      expect(reader?.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
      expect(reader?.plans.flatMap((plan) => plan.slots).every((slot) => !Object.hasOwn(slot, "selected"))).toBe(true);
    }
  });
});
