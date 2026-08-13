import { describe, expect, it } from "vitest";
import { estimateRecipeNoteLines, estimateRecipeTextLayout, estimateRecipeTextLines, validateAuthoredTextItems } from "./recipe-contract";
import { EDITORIAL_RECIPE_IDS, editorialRecipeDefinitions } from "./editorial-recipe-definitions";
import {
  createEditorialPreviewMatrix,
  editorialEvidenceMaximumNote,
  editorialLeadMaximumDeck,
  editorialPreviewScenarios,
  type EditorialPreviewCell,
} from "./editorial-recipe-matrix";

function getCell(
  matrix: readonly EditorialPreviewCell[],
  recipeId: string,
  scenario: string,
  mode: "editor" | "reader" = "reader",
) {
  const cell = matrix.find((candidate) => candidate.recipeId === recipeId && candidate.scenario === scenario && candidate.mode === mode);
  expect(cell).toBeDefined();
  return cell!;
}

describe("Phase F3-B2 Editorial formal Preview Matrix", () => {
  it("covers every approved Editorial scenario in Editor and Reader with real data-URL fixtures", () => {
    const matrix = createEditorialPreviewMatrix();
    expect(matrix).toHaveLength(editorialPreviewScenarios.length * 2);
    expect(matrix).toHaveLength(132);
    expect(matrix.every((cell) => editorialRecipeDefinitions.some((recipe) => recipe.id === cell.recipeId && recipe === cell.recipe))).toBe(true);
    expect(matrix.every((cell) => cell.errors.length === 0 && cell.plans.every((plan) => plan.valid))).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);
    expect(matrix.every((cell) => cell.recipe.status === "draft")).toBe(true);

    for (const definition of editorialRecipeDefinitions) {
      const scenarios = editorialPreviewScenarios.filter((scenario) => scenario.recipeId === definition.id);
      const cells = matrix.filter((cell) => cell.recipeId === definition.id);
      expect(cells).toHaveLength(scenarios.length * 2);
      expect(new Set(cells.map((cell) => cell.mode))).toEqual(new Set(["editor", "reader"]));
      expect(new Set(cells.map((cell) => cell.scenario))).toEqual(new Set(scenarios.map((scenario) => scenario.id)));
    }
  });

  it("keeps Evidence Aside main/evidence responsibilities, fixed no-Note geometry, and capacity diagnostics", () => {
    const matrix = createEditorialPreviewMatrix();
    const exact = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "exact-two");
    const one = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "one-photo");
    const over = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "over-capacity-three");
    const noNote = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "no-note");
    const note = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "short-note");
    const maximum = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "max-60-four-lines");
    const overCharacters = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "over-60");
    const overLines = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "over-four-lines");
    const normalLatin = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "normal-latin-note");
    const numeric = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "numeric-note");
    const cjk = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "cjk-note");
    const longWord = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "long-word-note");
    const wrongBinding = getCell(matrix, EDITORIAL_RECIPE_IDS.evidenceAside, "main-photo-note-no-evidence");

    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(one.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toHaveLength(1);
    expect(maximum.content.notesByPhotoId[maximum.photos[1]!.id]).toHaveLength(60);
    expect(estimateRecipeNoteLines(maximum.recipe, "photo-evidence", editorialEvidenceMaximumNote)).toBe(4);
    const maximumNoteSlot = maximum.recipe.slots.find((slot) => slot.id === "note-evidence");
    expect(maximumNoteSlot?.kind).toBe("note");
    if (maximumNoteSlot?.kind === "note") {
      expect(estimateRecipeTextLayout(maximum.recipe, maximumNoteSlot, editorialEvidenceMaximumNote).estimatedLines).toBe(4);
    }
    expect(maximum.plans[0]!.slots.find((slot) => slot.id === "note-evidence")?.typographyLayout).toMatchObject({
      estimatedLines: 4,
      fits: true,
    });
    expect(maximum.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(overCharacters.content.notesByPhotoId[overCharacters.photos[1]!.id]).toHaveLength(61);
    expect(overCharacters.compatibility).toMatchObject({ code: "note-too-long", valid: false });
    expect(overLines.content.notesByPhotoId[overLines.photos[1]!.id]!.length).toBeLessThanOrEqual(60);
    expect(overLines.compatibility).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(normalLatin.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(numeric.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(cjk.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(longWord.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(note.application.assignments.find((assignment) => assignment.photoSlotId === "photo-evidence")).toMatchObject({ noteSlotId: "note-evidence" });
    expect(note.application.assignments.find((assignment) => assignment.photoSlotId === "photo-main")?.noteSlotId).toBeUndefined();
    expect(wrongBinding.application.assignments.every((assignment) => assignment.noteSlotId === undefined)).toBe(true);
    expect(wrongBinding.compatibility).toMatchObject({ code: "compatible", valid: true });

    const photoGeometry = (cell: EditorialPreviewCell) => cell.plans[0]!.slots
      .filter((slot) => slot.kind === "photo")
      .map(({ id, rect }) => ({ id, rect }));
    expect(photoGeometry(noNote)).toEqual(photoGeometry(note));
    expect(noNote.plans[0]!.slots.some((slot) => slot.id === "note-evidence")).toBe(false);
    expect(noNote.plans[0]!.slots.find((slot) => slot.id === "label-evidence")?.text).toBe("EVIDENCE 02");
  });

  it("keeps Across the Record atomic across the gutter and diagnoses required Note/content pressure", () => {
    const matrix = createEditorialPreviewMatrix();
    const emptyNote = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "empty-note");
    const complete = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "complete-spread");
    const max = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "max-120-four-lines");
    const overNote = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-120");
    const overLines = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-four-lines");
    const overPhotos = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "over-capacity-two");
    const left = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "left-plan");
    const right = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "right-plan");
    const cjk = getCell(matrix, EDITORIAL_RECIPE_IDS.acrossTheRecord, "across-cjk-note");

    expect(emptyNote.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(max.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(max.plans[1]!.slots.find((slot) => slot.id === "note-record")?.typographyLayout).toMatchObject({
      estimatedLines: 4,
      fits: true,
    });
    expect(overNote.compatibility).toMatchObject({ code: "note-too-long", valid: false });
    expect(overLines.compatibility).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(overPhotos.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(overPhotos.application.unplacedPhotoIds).toHaveLength(1);
    expect(cjk.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(complete.application.assignments).toHaveLength(1);
    expect(complete.application.targetPageIds).toHaveLength(2);
    expect(complete.plans).toHaveLength(2);
    expect(complete.plans[0]!.slots.some((slot) => slot.id === "note-record")).toBe(false);
    expect(complete.plans[1]!.slots.some((slot) => slot.id === "photo-record")).toBe(false);
    expect(complete.plans[1]!.slots.find((slot) => slot.id === "note-record")?.notes?.[0]).toMatchObject({
      photoSlotId: "photo-record",
      noteSlotId: "note-record",
      relation: "cross-page-pair",
    });
    expect(left.plans).toHaveLength(1);
    expect(left.plans[0]!.slots.some((slot) => slot.id === "note-record")).toBe(false);
    expect(right.plans).toHaveLength(1);
    expect(right.plans[0]!.slots.some((slot) => slot.id === "photo-record")).toBe(false);
  });

  it("uses real AuthoredTextItem/application data for Lead Story and keeps Editor/Reader text identical", () => {
    const matrix = createEditorialPreviewMatrix();
    const title = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "short-title-deck");
    const editor = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "short-title-deck", "editor");
    const reader = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "short-title-deck", "reader");
    const missing = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "photo-title-missing");
    const ownerMismatch = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "owner-mismatch");
    const titleOverride = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "environment-title-ignored");
    const textOverride = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "text-by-slot-ignored");
    const noDeck = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "deck-absence-fixed-geometry");
    const hiddenNote = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "photo-note-hidden");
    const focus = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "off-center-focus");
    const maximumDeckEditor = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "max-76-deck-two-lines", "editor");
    const maximumDeckReader = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "max-76-deck-two-lines", "reader");
    const overDeck = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "deck-over-76");
    const overDeckLines = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "deck-over-two-lines");
    const cjkTitleDeck = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "cjk-title-deck");
    const longLatinDeck = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "long-latin-deck");

    expect(validateAuthoredTextItems(title.authoredTextItems)).toEqual([]);
    expect(title.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(title.application.textAssignments).toEqual([
      { textContentId: expect.stringContaining("story-title"), staticTextSlotId: "title-lead", contentKey: "story-title" },
      { textContentId: expect.stringContaining("story-deck"), staticTextSlotId: "deck-lead", contentKey: "story-deck" },
    ]);
    expect(editor.plans[0]!.slots.find((slot) => slot.id === "title-lead")).toMatchObject({ text: "A clear report." });
    expect(reader.plans[0]!.slots.filter((slot) => slot.kind === "static-text").map((slot) => ({ id: slot.id, text: slot.text })))
      .toEqual(editor.plans[0]!.slots.filter((slot) => slot.kind === "static-text").map((slot) => ({ id: slot.id, text: slot.text })));
    expect(missing.compatibility).toMatchObject({ code: "authored-text-missing", slotId: "title-lead" });
    expect(ownerMismatch.compatibility).toMatchObject({ code: "authored-text-owner-mismatch", contentKey: "story-title" });
    expect(titleOverride.plans[0]!.slots.find((slot) => slot.id === "title-lead")?.text).toBe("Authored story title.");
    expect(textOverride.plans[0]!.slots.find((slot) => slot.id === "title-lead")?.text).toBe("Authored assignment.");
    expect(noDeck.plans[0]!.slots.some((slot) => slot.id === "deck-lead")).toBe(false);
    expect(noDeck.plans[0]!.slots.find((slot) => slot.id === "photo-lead")?.rect).toEqual({ x: .08, y: .34, width: .84, height: .58 });
    expect(hiddenNote.compatibility).toMatchObject({ code: "compatible-with-hidden-notes", valid: true });
    expect(hiddenNote.application.hiddenNotePhotoIds).toHaveLength(1);
    expect(focus.plans[0]!.slots.find((slot) => slot.id === "photo-lead")).toMatchObject({ focusX: 18, focusY: 72, scale: 1.35 });
    expect(maximumDeckEditor.authoredTextItems.find((item) => item.contentKey === "story-deck")?.text).toBe(editorialLeadMaximumDeck);
    expect(maximumDeckEditor.authoredTextItems.find((item) => item.contentKey === "story-deck")?.text).toHaveLength(76);
    const maximumDeckSlot = maximumDeckEditor.recipe.slots.find((slot) => slot.id === "deck-lead");
    expect(maximumDeckSlot?.kind).toBe("static-text");
    if (maximumDeckSlot?.kind === "static-text") {
      expect(estimateRecipeTextLines(maximumDeckEditor.recipe, maximumDeckSlot, editorialLeadMaximumDeck)).toBe(2);
    }
    expect(maximumDeckEditor.plans[0]!.slots.find((slot) => slot.id === "deck-lead")?.typographyLayout).toMatchObject({
      estimatedLines: 2,
      fits: true,
    });
    const maximumTitle = getCell(matrix, EDITORIAL_RECIPE_IDS.leadStory, "max-60-three-lines");
    expect(maximumTitle.plans[0]!.slots.find((slot) => slot.id === "title-lead")?.typographyLayout).toMatchObject({
      estimatedLines: 3,
      fits: true,
    });
    expect(maximumDeckEditor.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(maximumDeckReader.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(cjkTitleDeck.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(longLatinDeck.compatibility).toMatchObject({ code: "compatible", valid: true });
    const slotGeometryAndText = (cell: EditorialPreviewCell) => cell.plans[0]!.slots.map(({ id, kind, rect, text }) => ({ id, kind, rect, text }));
    expect(slotGeometryAndText(maximumDeckReader)).toEqual(slotGeometryAndText(maximumDeckEditor));
    expect(maximumDeckReader.plans[0]!.slots.map(({ id, typographyRole, typographyToken, typographyLayout }) => ({ id, typographyRole, typographyToken, typographyLayout })))
      .toEqual(maximumDeckEditor.plans[0]!.slots.map(({ id, typographyRole, typographyToken, typographyLayout }) => ({ id, typographyRole, typographyToken, typographyLayout })));
    expect(maximumDeckReader.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
    expect(overDeck.authoredTextItems.find((item) => item.contentKey === "story-deck")?.text).toHaveLength(77);
    expect(overDeck.compatibility).toMatchObject({ code: "authored-text-too-long", slotId: "deck-lead", valid: false });
    expect(overDeckLines.authoredTextItems.find((item) => item.contentKey === "story-deck")?.text.length).toBeLessThanOrEqual(76);
    expect(overDeckLines.compatibility).toMatchObject({ code: "authored-text-too-many-lines", slotId: "deck-lead", valid: false });
    expect(reader.plans[0]!.slots.filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
    expect(editor.plans[0]!.slots.filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder || Boolean(slot.photo))).toBe(true);
  });
});
