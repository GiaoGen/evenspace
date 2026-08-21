import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveSpreadEvidence } from "./recipe-contract";
import {
  DYNAMIC_RECIPE_IDS,
  dynamicRecipeDefinitions,
} from "./dynamic-recipe-definitions";
import {
  createDynamicPreviewMatrix,
  dynamicPreviewScenarios,
  type DynamicPreviewCell,
} from "./dynamic-recipe-matrix";

function getCell(
  matrix: readonly DynamicPreviewCell[],
  recipeId: string,
  scenario: string,
  mode: "editor" | "reader" = "reader",
) {
  const cell = matrix.find((candidate) => (
    candidate.recipeId === recipeId
    && candidate.scenario === scenario
    && candidate.mode === mode
  ));
  expect(cell).toBeDefined();
  return cell!;
}

function geometry(cell: DynamicPreviewCell) {
  return cell.plans.map((plan) => plan.slots.map((slot) => ({
    id: slot.id,
    kind: slot.kind,
    rect: slot.rect,
    photoId: slot.photoId,
    placementId: slot.placementId,
    focusX: slot.focusX,
    focusY: slot.focusY,
    scale: slot.scale,
    crossSpread: slot.crossSpread,
    imageStartPercent: slot.imageStartPercent,
    imageWidthPercent: slot.imageWidthPercent,
  })));
}

describe("Phase F3-B4 Dynamic formal Preview Matrix", () => {
  it("covers 40 declared groups / 80 Editor+Reader cells with draft formal Definitions", () => {
    const matrix = createDynamicPreviewMatrix();
    expect(dynamicPreviewScenarios).toHaveLength(40);
    expect(matrix).toHaveLength(80);
    expect(matrix.every((cell) => dynamicRecipeDefinitions.includes(cell.recipe as never))).toBe(true);
    expect(matrix.every((cell) => cell.recipe.status === "draft")).toBe(true);
    expect(matrix.every((cell) => cell.errors.length === 0 && cell.plans.every((plan) => plan.valid))).toBe(true);
    expect(matrix.every((cell) => cell.plans.every((plan) => plan.typographyIssues.length === 0))).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);
    expect(matrix.filter((cell) => cell.recipeId === DYNAMIC_RECIPE_IDS.edgeThrust)).toHaveLength(24);
    expect(matrix.filter((cell) => cell.recipeId === DYNAMIC_RECIPE_IDS.dropSequence)).toHaveLength(30);
    expect(matrix.filter((cell) => cell.recipeId === DYNAMIC_RECIPE_IDS.gutterSweep)).toHaveLength(26);
  });

  it("keeps Edge Thrust exact-one, unmirrored, focused, and Note-free", () => {
    const matrix = createDynamicPreviewMatrix();
    const empty = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "empty");
    const exact = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "exact-one");
    const over = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "over-capacity-two");
    const left = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "left-page");
    const right = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "right-page-direction-mismatch");
    const focus = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "off-center-focus");
    const hidden = getCell(matrix, DYNAMIC_RECIPE_IDS.edgeThrust, "photo-note-hidden");

    expect(empty.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[1]!.id]);
    expect(exact.plans[0]!.slots).toEqual([expect.objectContaining({
      id: "thrust-photo",
      rect: { x: 0, y: .07, width: .92, height: .86 },
      crossSpread: false,
    })]);
    expect(left.plans[0]!.slots[0]!.rect).toEqual(right.plans[0]!.slots[0]!.rect);
    expect(left.environments[0]!.pageSide).toBe("left");
    expect(right.environments[0]!.pageSide).toBe("right");
    expect(focus.plans[0]!.slots[0]).toMatchObject({ focusX: 68, focusY: 46, scale: 1.3 });
    expect(hidden.application.hiddenNotePhotoIds).toEqual([hidden.photos[0]!.id]);
    expect(hidden.plans[0]!.slots.some((slot) => slot.kind === "note" || slot.kind === "static-text")).toBe(false);
  });

  it("keeps Drop Sequence exact-3 assignment order and fixed small-small-large geometry", () => {
    const matrix = createDynamicPreviewMatrix();
    const one = getCell(matrix, DYNAMIC_RECIPE_IDS.dropSequence, "one-photo");
    const two = getCell(matrix, DYNAMIC_RECIPE_IDS.dropSequence, "two-photos");
    const exact = getCell(matrix, DYNAMIC_RECIPE_IDS.dropSequence, "stable-sequence");
    const over = getCell(matrix, DYNAMIC_RECIPE_IDS.dropSequence, "over-capacity-four");

    expect(one.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(two.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[3]!.id]);
    expect(exact.application.assignments.map(({ photoSlotId, photoId }) => ({ photoSlotId, photoId }))).toEqual([
      { photoSlotId: "phase-01", photoId: exact.photos[0]!.id },
      { photoSlotId: "phase-02", photoId: exact.photos[1]!.id },
      { photoSlotId: "impact-photo", photoId: exact.photos[2]!.id },
    ]);
    const slots = exact.plans[0]!.slots;
    expect(slots.map((slot) => slot.id)).toEqual(["phase-01", "phase-02", "impact-photo"]);
    expect(slots.map((slot) => slot.rect)).toEqual([
      { x: .05, y: .06, width: .40, height: .25 },
      { x: .55, y: .06, width: .40, height: .25 },
      { x: .05, y: .41, width: .90, height: .54 },
    ]);
    expect(slots[2]!.rect.y - (slots[0]!.rect.y + slots[0]!.rect.height)).toBeCloseTo(.10);
    expect((slots[2]!.rect.width * slots[2]!.rect.height) / (slots[0]!.rect.width * slots[0]!.rect.height)).toBeCloseTo(4.86);
  });

  it("persists independent Drop Sequence focus without reordering placements", () => {
    const cell = getCell(createDynamicPreviewMatrix(), DYNAMIC_RECIPE_IDS.dropSequence, "three-independent-focus");
    expect(cell.plans[0]!.slots.map(({ id, focusX, focusY, scale }) => ({ id, focusX, focusY, scale }))).toEqual([
      { id: "phase-01", focusX: 16, focusY: 42, scale: 1.1 },
      { id: "phase-02", focusX: 52, focusY: 28, scale: 1.2 },
      { id: "impact-photo", focusX: 84, focusY: 66, scale: 1.35 },
    ]);
    expect(new Set(cell.application.assignments.map((assignment) => assignment.placementId)).size).toBe(3);
  });

  it("keeps page-scoped Dynamic geometry identical in Editor and Reader", () => {
    const matrix = createDynamicPreviewMatrix();
    for (const [recipeId, scenario] of [
      [DYNAMIC_RECIPE_IDS.edgeThrust, "exact-one"],
      [DYNAMIC_RECIPE_IDS.dropSequence, "exact-three"],
    ] as const) {
      const editor = getCell(matrix, recipeId, scenario, "editor");
      const reader = getCell(matrix, recipeId, scenario, "reader");
      expect(geometry(reader)).toEqual(geometry(editor));
    }
  });

  it("renders Gutter Sweep as one atomic placement with continuous left/right crop", () => {
    const matrix = createDynamicPreviewMatrix();
    const complete = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "complete-spread");
    const focus = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "focus-continuity");
    const leftOnly = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "left-plan");
    const rightOnly = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "right-plan");

    expect(complete.application.assignments).toHaveLength(1);
    expect(complete.application.targetPageIds).toHaveLength(2);
    expect(complete.plans).toHaveLength(2);
    expect(deriveSpreadEvidence(complete.recipe)).toEqual([{ kind: "cross-gutter-photo", photoSlotId: "sweep-photo" }]);
    const [left, right] = complete.plans.map((plan) => plan.slots[0]!);
    expect(left).toMatchObject({ id: "sweep-photo", rect: { x: 0, y: .08, width: 1, height: .84 }, crossSpread: true, imageStartPercent: 0, imageWidthPercent: 200 });
    expect(right).toMatchObject({ id: "sweep-photo", rect: { x: 0, y: .08, width: 1, height: .84 }, crossSpread: true, imageStartPercent: 50, imageWidthPercent: 200 });
    expect(new Set([left.placementId, right.placementId])).toEqual(new Set([complete.application.assignments[0]!.placementId]));
    expect(new Set([left.photoId, right.photoId])).toEqual(new Set([complete.photos[0]!.id]));
    expect(focus.plans.flatMap((plan) => plan.slots).every((slot) => slot.focusX === 72 && slot.focusY === 44 && slot.scale === 1.35)).toBe(true);
    expect(leftOnly.plans).toHaveLength(1);
    expect(leftOnly.environments[0]!.pageSide).toBe("left");
    expect(rightOnly.plans).toHaveLength(1);
    expect(rightOnly.environments[0]!.pageSide).toBe("right");
  });

  it("keeps Gutter Sweep empty/over-capacity and hidden-Note behavior explicit", () => {
    const matrix = createDynamicPreviewMatrix();
    const empty = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "empty");
    const exact = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "exact-one");
    const over = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "over-capacity-two");
    const hidden = getCell(matrix, DYNAMIC_RECIPE_IDS.gutterSweep, "photo-note-hidden");
    expect(empty.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[1]!.id]);
    expect(hidden.application.hiddenNotePhotoIds).toEqual([hidden.photos[0]!.id]);
    expect(hidden.plans.flatMap((plan) => plan.slots).every((slot) => slot.kind === "photo")).toBe(true);
  });

  it("shows Editor empty placeholders and suppresses them in Reader", () => {
    const matrix = createDynamicPreviewMatrix();
    for (const recipeId of Object.values(DYNAMIC_RECIPE_IDS)) {
      const editor = getCell(matrix, recipeId, "empty", "editor");
      const reader = getCell(matrix, recipeId, "empty", "reader");
      expect(editor.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).every((slot) => !Object.hasOwn(slot, "selected"))).toBe(true);
    }
  });

  it("exposes an independent Dynamic gate without adding recipe-specific renderer code", () => {
    const gate = readFileSync(join(process.cwd(), "features/zine/components/reference-recipe-gate.tsx"), "utf8");
    const renderer = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.module.css"), "utf8");
    expect(gate).toContain("Dynamic Formal Draft Preview Matrix");
    expect(gate).toContain('data-dynamic-preview-cell={matrix === "dynamic" ? "true" : undefined}');
    expect(renderer).not.toMatch(/dynamic-(?:edge|drop|gutter)|thrust-photo|phase-01|impact-photo|sweep-photo/u);
    expect(css).not.toMatch(/dynamic-(?:edge|drop|gutter)|thrust-photo|phase-01|impact-photo|sweep-photo/u);
  });
});
