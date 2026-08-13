import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveSpreadEvidence } from "./recipe-contract";
import {
  GRID_CONTACT_RECIPE_IDS,
  gridContactRecipeDefinitions,
} from "./grid-contact-recipe-definitions";
import {
  createGridContactPreviewMatrix,
  crossRegisterCjk18,
  crossRegisterLatin18,
  crossRegisterLongWord18,
  crossRegisterNumeric18,
  gridContactPreviewScenarios,
  type GridContactPreviewCell,
} from "./grid-contact-recipe-matrix";

function getCell(
  matrix: readonly GridContactPreviewCell[],
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

function planShape(cell: GridContactPreviewCell) {
  return cell.plans.map((plan) => plan.slots.map((slot) => ({
    id: slot.id,
    kind: slot.kind,
    rect: slot.rect,
    photoId: slot.photoId,
    text: slot.text,
    notes: slot.notes?.map((note) => ({
      photoSlotId: note.photoSlotId,
      noteSlotId: note.noteSlotId,
      photoId: note.photoId,
      text: note.text,
      relation: note.relation,
      index: note.index,
    })),
  })));
}

describe("Phase F3-B3 Grid/Contact formal Preview Matrix", () => {
  it("covers 54 declared groups / 108 Editor+Reader cells with draft formal Definitions", () => {
    const matrix = createGridContactPreviewMatrix();
    expect(gridContactPreviewScenarios).toHaveLength(54);
    expect(matrix).toHaveLength(108);
    expect(matrix.every((cell) => gridContactRecipeDefinitions.includes(cell.recipe as never))).toBe(true);
    expect(matrix.every((cell) => cell.recipe.status === "draft")).toBe(true);
    expect(matrix.every((cell) => cell.errors.length === 0 && cell.plans.every((plan) => plan.valid))).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);

    expect(matrix.filter((cell) => cell.recipeId === GRID_CONTACT_RECIPE_IDS.twinRegister)).toHaveLength(28);
    expect(matrix.filter((cell) => cell.recipeId === GRID_CONTACT_RECIPE_IDS.twelveUpLedger)).toHaveLength(32);
    expect(matrix.filter((cell) => cell.recipeId === GRID_CONTACT_RECIPE_IDS.crossRegister)).toHaveLength(48);
    for (const definition of gridContactRecipeDefinitions) {
      const cells = matrix.filter((cell) => cell.recipeId === definition.id);
      expect(new Set(cells.map((cell) => cell.mode))).toEqual(new Set(["editor", "reader"]));
    }
  });

  it("keeps Twin Register equal, ordered, fixed, and Note-free across content pressure", () => {
    const matrix = createGridContactPreviewMatrix();
    const exact = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "exact-two");
    const one = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "one-photo");
    const over = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "over-capacity-three");
    const focus = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "independent-focus");
    const hidden = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "photo-note-hidden");
    const editor = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "literal-source", "editor");
    const reader = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twinRegister, "literal-source", "reader");

    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(one.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[2]!.id]);
    const samples = exact.plans[0]!.slots.filter((slot) => slot.kind === "photo");
    expect(samples.map((slot) => slot.id)).toEqual(["sample-a", "sample-b"]);
    expect(samples[0]!.rect.width * samples[0]!.rect.height).toBe(samples[1]!.rect.width * samples[1]!.rect.height);
    expect(exact.plans[0]!.slots.filter((slot) => slot.kind === "static-text").map((slot) => slot.text)).toEqual(["A", "B"]);
    expect(focus.plans[0]!.slots.filter((slot) => slot.kind === "photo").map(({ focusX, focusY, scale }) => ({ focusX, focusY, scale }))).toEqual([
      { focusX: 18, focusY: 72, scale: 1.25 },
      { focusX: 82, focusY: 28, scale: 1.4 },
    ]);
    expect(hidden.application.hiddenNotePhotoIds).toHaveLength(2);
    expect(hidden.plans[0]!.slots.some((slot) => slot.kind === "note")).toBe(false);
    expect(planShape(reader)).toEqual(planShape(editor));
  });

  it("keeps Twelve-up Ledger row-major, exact-12, four-row-only, and independently focused", () => {
    const matrix = createGridContactPreviewMatrix();
    const eleven = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "eleven-photos");
    const exact = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "exact-twelve");
    const over = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "over-capacity-thirteen");
    const focus = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "twelve-independent-focus");

    expect(eleven.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.assignments).toHaveLength(12);
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[12]!.id]);
    expect(over.plans[0]!.slots.filter((slot) => slot.kind === "photo")).toHaveLength(12);
    expect(exact.application.assignments.map((assignment) => assignment.photoSlotId)).toEqual(
      Array.from({ length: 12 }, (_, index) => `frame-${String(index + 1).padStart(2, "0")}`),
    );
    const frames = exact.plans[0]!.slots.filter((slot) => slot.kind === "photo");
    expect(frames.map((slot) => slot.rect.y)).toEqual([.10, .10, .10, .305, .305, .305, .555, .555, .555, .76, .76, .76]);
    expect(frames[6]!.rect.y - (frames[3]!.rect.y + frames[3]!.rect.height)).toBeCloseTo(.08);
    expect(focus.plans[0]!.slots.filter((slot) => slot.kind === "photo").map(({ focusX, focusY, scale }) => ({ focusX, focusY, scale }))).toEqual(
      Array.from({ length: 12 }, (_, index) => ({ focusX: 8 + index * 7, focusY: 92 - index * 6, scale: 1 + index * .03 })),
    );
  });

  it("binds one Cross Register Note slot to four stable photo identities in record order", () => {
    const matrix = createGridContactPreviewMatrix();
    const cell = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "stable-photo-note-binding");
    const assignments = cell.application.assignments;
    expect(assignments).toHaveLength(4);
    expect(assignments.map(({ photoSlotId, photoId, noteSlotId, noteOfPhotoId }) => ({ photoSlotId, photoId, noteSlotId, noteOfPhotoId }))).toEqual(
      cell.photos.map((photo, index) => ({
        photoSlotId: `record-0${index + 1}`,
        photoId: photo.id,
        noteSlotId: "index-notes",
        noteOfPhotoId: photo.id,
      })),
    );
    const noteSlot = cell.plans[1]!.slots.find((slot) => slot.id === "index-notes");
    expect(noteSlot?.notes?.map(({ photoSlotId, photoId, text, relation, index }) => ({ photoSlotId, photoId, text, relation, index }))).toEqual(
      cell.photos.map((photo, index) => ({
        photoSlotId: `record-0${index + 1}`,
        photoId: photo.id,
        text: photo.caption,
        relation: "cross-page-pair",
        index,
      })),
    );
    expect(deriveSpreadEvidence(cell.recipe)).toHaveLength(4);
    expect(new Set(assignments.map((assignment) => assignment.noteSlotId))).toEqual(new Set(["index-notes"]));
    expect(new Set(assignments.map((assignment) => assignment.noteOfPhotoId))).toEqual(new Set(cell.photos.map((photo) => photo.id)));
  });

  it("diagnoses Cross Register minimum, required Note, over-capacity, character, and line pressure", () => {
    const matrix = createGridContactPreviewMatrix();
    const get = (scenario: string) => getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, scenario);
    expect(get("empty").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("one-note-photo").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("two-note-photos").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("three-note-photos").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("four-photos-no-notes").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("missing-one-required-note").compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(get("exact-four-valid-notes").compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(get("fifth-photo").compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(get("fifth-photo").application.unplacedPhotoIds).toHaveLength(1);
    expect(get("over-18-characters").compatibility).toMatchObject({ code: "note-too-long", valid: false });
    expect(get("within-18-over-one-line").compatibility).toMatchObject({ code: "note-too-many-lines", valid: false });
  });

  it("passes all exact 18/1 typography fixtures per rendered Note item", () => {
    const matrix = createGridContactPreviewMatrix();
    const cases = [
      ["exact-18-latin", crossRegisterLatin18],
      ["exact-18-numeric", crossRegisterNumeric18],
      ["exact-18-cjk", crossRegisterCjk18],
      ["long-word", crossRegisterLongWord18],
    ] as const;
    for (const [scenario, fixture] of cases) {
      expect(Array.from(fixture)).toHaveLength(18);
      const cell = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, scenario);
      expect(cell.compatibility).toMatchObject({ code: "compatible", valid: true });
      const notes = cell.plans.flatMap((plan) => plan.slots).find((slot) => slot.id === "index-notes")?.notes;
      expect(notes).toHaveLength(4);
      expect(notes?.every((note) => note.text === fixture && note.typographyLayout?.estimatedLines === 1 && note.typographyLayout.fits)).toBe(true);
    }
  });

  it("builds an atomic Cross spread with side-local geometry and side-local page-number folios", () => {
    const matrix = createGridContactPreviewMatrix();
    const complete = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "complete-spread");
    const leftOnly = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "left-plan");
    const rightOnly = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "right-plan");
    expect(complete.application.targetPageIds).toHaveLength(2);
    expect(complete.plans).toHaveLength(2);
    expect(complete.plans[0]!.slots.map((slot) => slot.id)).toEqual(["record-01", "record-02", "record-03", "record-04", "folio-left"]);
    expect(complete.plans[1]!.slots.map((slot) => slot.id)).toEqual(["index-notes", "index-label", "folio-right"]);
    expect(complete.plans[0]!.slots.find((slot) => slot.id === "folio-left")?.text).toBe("24");
    expect(complete.plans[1]!.slots.find((slot) => slot.id === "folio-right")?.text).toBe("25");
    expect(leftOnly.plans).toHaveLength(1);
    expect(leftOnly.plans[0]!.slots.some((slot) => slot.id === "folio-right" || slot.id === "index-notes")).toBe(false);
    expect(rightOnly.plans).toHaveLength(1);
    expect(rightOnly.plans[0]!.slots.some((slot) => slot.id === "folio-left" || slot.id.startsWith("record-"))).toBe(false);
    expect(new Set(complete.plans.flatMap((plan) => plan.slots.filter((slot) => slot.kind === "photo").map((slot) => slot.placementId))))
      .toEqual(new Set(complete.application.assignments.map((assignment) => assignment.placementId)));
  });

  it("reads page-number sources per side for Twelve-up and preserves Editor/Reader output", () => {
    const matrix = createGridContactPreviewMatrix();
    const twelveLeft = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "left-page");
    const twelveRight = getCell(matrix, GRID_CONTACT_RECIPE_IDS.twelveUpLedger, "right-page");
    const crossEditor = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "page-number-folios", "editor");
    const crossReader = getCell(matrix, GRID_CONTACT_RECIPE_IDS.crossRegister, "page-number-folios", "reader");
    expect(twelveLeft.plans[0]!.slots.find((slot) => slot.id === "folio")?.text).toBe("24");
    expect(twelveRight.plans[0]!.slots.find((slot) => slot.id === "folio")?.text).toBe("25");
    expect(crossEditor.plans[0]!.slots.find((slot) => slot.id === "folio-left")?.text).toBe("24");
    expect(crossEditor.plans[1]!.slots.find((slot) => slot.id === "folio-right")?.text).toBe("25");
    expect(planShape(crossReader)).toEqual(planShape(crossEditor));
  });

  it("suppresses Reader placeholders and uses only semantic shared CSS for indexed relations", () => {
    const matrix = createGridContactPreviewMatrix();
    for (const recipeId of Object.values(GRID_CONTACT_RECIPE_IDS)) {
      const editor = getCell(matrix, recipeId, "empty", "editor");
      const reader = getCell(matrix, recipeId, "empty", "reader");
      expect(editor.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).every((slot) => !Object.hasOwn(slot, "selected"))).toBe(true);
    }
    const css = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.module.css"), "utf8");
    expect(css).toContain('[data-typography-role="index"][data-note-relations~="cross-page-pair"]');
    expect(css).not.toMatch(/grid-contact-|record-0[1-4]|index-notes/u);
  });
});
