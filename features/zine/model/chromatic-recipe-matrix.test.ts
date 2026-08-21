import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { deriveSpreadEvidence, validateRecipeDefinition } from "./recipe-contract";
import { getRecipeRendererColorTokens } from "../components/recipe-renderer-plan";
import {
  CHROMATIC_RECIPE_IDS,
  chromaticRecipeDefinitions,
} from "./chromatic-recipe-definitions";
import {
  chromaticCrossFieldMaximumNote,
  chromaticPreviewScenarios,
  createChromaticPreviewMatrix,
  type ChromaticPreviewCell,
} from "./chromatic-recipe-matrix";

function getCell(
  matrix: readonly ChromaticPreviewCell[],
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

function geometry(cell: ChromaticPreviewCell) {
  return cell.plans.map((plan) => plan.slots.map((slot) => ({
    id: slot.id,
    kind: slot.kind,
    rect: slot.rect,
    zIndex: slot.zIndex,
    photoId: slot.photoId,
    placementId: slot.placementId,
    focusX: slot.focusX,
    focusY: slot.focusY,
    scale: slot.scale,
    fillToken: slot.fillToken,
    foregroundToken: slot.foregroundToken,
    surfaceToken: slot.surfaceToken,
    text: slot.text,
    crossSpread: slot.crossSpread,
  })));
}

function structure(cell: ChromaticPreviewCell) {
  return cell.plans.map((plan) => plan.slots.map((slot) => ({
    id: slot.id,
    kind: slot.kind,
    rect: slot.rect,
    zIndex: slot.zIndex,
    fillToken: slot.fillToken,
    foregroundToken: slot.foregroundToken,
    surfaceToken: slot.surfaceToken,
    text: slot.text,
    crossSpread: slot.crossSpread,
  })));
}

describe("Phase F3-B5 Chromatic formal Preview Matrix", () => {
  it("covers 43 declared groups / 86 Editor+Reader cells with valid draft formal structures", () => {
    const matrix = createChromaticPreviewMatrix();
    expect(chromaticPreviewScenarios).toHaveLength(43);
    expect(matrix).toHaveLength(86);
    expect(matrix.every((cell) => chromaticRecipeDefinitions.some((definition) => definition.id === cell.recipe.id))).toBe(true);
    expect(matrix.every((cell) => cell.recipe.status === "draft")).toBe(true);
    expect(matrix.every((cell) => cell.errors.length === 0 && cell.plans.every((plan) => plan.valid))).toBe(true);
    expect(matrix.every((cell) => cell.plans.every((plan) => plan.typographyIssues.length === 0))).toBe(true);
    expect(matrix.every((cell) => cell.photos.every((photo) => photo.previewUrl.startsWith("data:image/svg+xml,")))).toBe(true);
    expect(matrix.filter((cell) => cell.recipeId === CHROMATIC_RECIPE_IDS.entryField)).toHaveLength(24);
    expect(matrix.filter((cell) => cell.recipeId === CHROMATIC_RECIPE_IDS.fourBeat)).toHaveLength(28);
    expect(matrix.filter((cell) => cell.recipeId === CHROMATIC_RECIPE_IDS.crossFieldNote)).toHaveLength(34);
  });

  it("keeps Entry Field exact-one, page-local, focused, and Note-free", () => {
    const matrix = createChromaticPreviewMatrix();
    const empty = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "empty");
    const exact = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "exact-one");
    const over = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "over-capacity-two");
    const left = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "left-page");
    const right = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "right-page");
    const focus = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "off-center-focus");
    const hidden = getCell(matrix, CHROMATIC_RECIPE_IDS.entryField, "photo-note-hidden");

    expect(empty.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[1]!.id]);
    expect(exact.plans[0]!.slots).toEqual([
      expect.objectContaining({ id: "entry-field", kind: "color-field", rect: { x: .05, y: .06, width: .90, height: .18 }, fillToken: "accent-1" }),
      expect.objectContaining({ id: "entry-photo", kind: "photo", rect: { x: .05, y: .30, width: .90, height: .62 } }),
    ]);
    expect(left.plans[0]!.slots.map((slot) => slot.rect)).toEqual(right.plans[0]!.slots.map((slot) => slot.rect));
    expect(left.environments[0]!.pageSide).toBe("left");
    expect(right.environments[0]!.pageSide).toBe("right");
    expect(focus.plans[0]!.slots.find((slot) => slot.id === "entry-photo")).toMatchObject({ focusX: 74, focusY: 38, scale: 1.3 });
    expect(hidden.application.hiddenNotePhotoIds).toEqual([hidden.photos[0]!.id]);
    expect(hidden.plans[0]!.slots.some((slot) => slot.kind === "note" || slot.kind === "static-text")).toBe(false);
  });

  it("keeps Four Beat exact-4 in one LTR row with stable order, physical 9:16, and stated ratio facts", () => {
    const matrix = createChromaticPreviewMatrix();
    const fewer = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "fewer-than-four");
    const exact = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "exact-four");
    const over = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "over-capacity-five");
    const fourFive = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "four-4-5");
    const square = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "four-square");
    const landscape = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "four-landscape-high-crop-risk");

    expect(fewer.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(exact.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(over.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(over.application.unplacedPhotoIds).toEqual([over.photos[4]!.id]);
    expect(exact.application.assignments.map(({ photoSlotId, photoId }) => ({ photoSlotId, photoId }))).toEqual([
      { photoSlotId: "beat-photo-01", photoId: exact.photos[0]!.id },
      { photoSlotId: "beat-photo-02", photoId: exact.photos[1]!.id },
      { photoSlotId: "beat-photo-03", photoId: exact.photos[2]!.id },
      { photoSlotId: "beat-photo-04", photoId: exact.photos[3]!.id },
    ]);
    const photoSlots = exact.plans[0]!.slots.filter((slot) => slot.kind === "photo");
    expect(photoSlots.map((slot) => slot.id)).toEqual(["beat-photo-01", "beat-photo-02", "beat-photo-03", "beat-photo-04"]);
    expect(photoSlots.map((slot) => slot.rect)).toEqual([.05, .28, .51, .74].map((x) => ({ x, y: .22, width: .21, height: .28 })));
    expect(photoSlots.every((slot) => (slot.rect.width * 3) / (slot.rect.height * 4) === .5625)).toBe(true);
    expect(fourFive.photos.every((photo) => photo.width / photo.height === .8)).toBe(true);
    expect(square.photos.every((photo) => photo.width / photo.height === 1)).toBe(true);
    expect(landscape.photos.every((photo) => photo.width / photo.height === 1.5)).toBe(true);
  });

  it("keeps Four Beat literal and color rhythm stable with independent placement focus", () => {
    const matrix = createChromaticPreviewMatrix();
    const order = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "stable-01-04-order");
    const rhythm = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "stable-a1-a2-a3-a1");
    const focus = getCell(matrix, CHROMATIC_RECIPE_IDS.fourBeat, "independent-focus");
    expect(order.plans[0]!.slots.filter((slot) => slot.kind === "static-text").map((slot) => slot.text)).toEqual(["01", "02", "03", "04"]);
    expect(rhythm.plans[0]!.slots.filter((slot) => slot.kind === "color-field").map((slot) => slot.fillToken)).toEqual(["accent-1", "accent-2", "accent-3", "accent-1"]);
    expect(focus.plans[0]!.slots.filter((slot) => slot.kind === "photo").map(({ id, focusX, focusY, scale }) => ({ id, focusX, focusY, scale }))).toEqual([
      { id: "beat-photo-01", focusX: 14, focusY: 42, scale: 1.1 },
      { id: "beat-photo-02", focusX: 38, focusY: 28, scale: 1.2 },
      { id: "beat-photo-03", focusX: 66, focusY: 61, scale: 1.25 },
      { id: "beat-photo-04", focusX: 88, focusY: 47, scale: 1.35 },
    ]);
    expect(new Set(focus.application.assignments.map((assignment) => assignment.placementId)).size).toBe(4);
  });

  it("keeps approved color-on and neutral color-off geometry identical while retaining second-channel topology", () => {
    const matrix = createChromaticPreviewMatrix();
    for (const recipeId of Object.values(CHROMATIC_RECIPE_IDS)) {
      const on = getCell(matrix, recipeId, "color-on");
      const off = getCell(matrix, recipeId, "color-off");
      expect(structure(off)).toEqual(structure(on));
      const onTokens = getRecipeRendererColorTokens(on.recipe.theme);
      const offTokens = getRecipeRendererColorTokens(off.recipe.theme);
      expect(onTokens["accent-1"]).toBe("#164B8C");
      expect(offTokens["accent-1"]).toBe("#505050");
      if (recipeId === CHROMATIC_RECIPE_IDS.fourBeat) {
        expect([offTokens["accent-1"], offTokens["accent-2"], offTokens["accent-3"], offTokens["accent-1"]]).toEqual(["#505050", "#666666", "#A6A6A6", "#505050"]);
        expect(off.plans[0]!.slots.filter((slot) => slot.kind === "static-text").map((slot) => slot.text)).toEqual(["01", "02", "03", "04"]);
      }
      if (recipeId === CHROMATIC_RECIPE_IDS.crossFieldNote) {
        expect(off.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "static-text").map((slot) => slot.text)).toEqual(["IMAGE 01", "FIELD NOTE"]);
      }
    }
  });

  it("enforces Cross-field non-empty through 90/4, rejects true overflows, and never reflows geometry", () => {
    const matrix = createChromaticPreviewMatrix();
    const missingPhoto = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "missing-photo");
    const missingNote = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "missing-note");
    const one = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "one-to-eleven-characters");
    const twelve = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "exact-12-characters");
    const maximum = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "exact-90-four-lines");
    const overCharacters = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "over-90-characters");
    const overLines = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "over-four-lines");

    expect(missingPhoto.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(missingNote.compatibility).toMatchObject({ code: "needs-content", valid: false });
    expect(one.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(twelve.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(maximum.compatibility).toMatchObject({ code: "compatible", valid: true });
    expect(chromaticCrossFieldMaximumNote).toHaveLength(90);
    const maximumNoteSlot = maximum.plans.flatMap((plan) => plan.slots).find((slot) => slot.id === "field-note");
    expect(maximumNoteSlot).toMatchObject({ maxLines: 4, surfaceToken: "accent-1" });
    expect(maximumNoteSlot?.notes?.[0]?.typographyLayout).toMatchObject({ estimatedLines: 4, fits: true });
    expect(overCharacters.compatibility).toMatchObject({ code: "note-too-long", valid: false });
    expect(overLines.compatibility).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(structure(one)).toEqual(structure(twelve));
    expect(structure(twelve)).toEqual(structure(maximum));
  });

  it("keeps Cross-field one atomic Application, source/destination page duties, focus, and unplaced content", () => {
    const matrix = createChromaticPreviewMatrix();
    const complete = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "complete-spread");
    const left = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "left-plan");
    const right = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "right-plan");
    const focus = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "focus-continuity");
    const unplaced = getCell(matrix, CHROMATIC_RECIPE_IDS.crossFieldNote, "unplaced-content");

    expect(complete.application.targetPageIds).toHaveLength(2);
    expect(complete.application.assignments).toEqual([expect.objectContaining({
      photoSlotId: "source-photo",
      noteSlotId: "field-note",
      noteOfPhotoId: complete.photos[0]!.id,
    })]);
    expect(complete.plans).toHaveLength(2);
    expect(left.environments[0]).toMatchObject({ pageSide: "left", pageNumber: 40 });
    expect(left.plans[0]!.slots.map((slot) => slot.id)).toEqual(["source-field", "source-photo", "source-label"]);
    expect(right.environments[0]).toMatchObject({ pageSide: "right", pageNumber: 41 });
    expect(right.plans[0]!.slots.map((slot) => slot.id)).toEqual(["note-field", "note-label", "field-note"]);
    expect(focus.plans.flatMap((plan) => plan.slots).find((slot) => slot.id === "source-photo")).toMatchObject({ focusX: 72, focusY: 43, scale: 1.35 });
    expect(unplaced.compatibility).toMatchObject({ code: "too-much-content", valid: false });
    expect(unplaced.application.unplacedPhotoIds).toEqual([unplaced.photos[1]!.id]);
  });

  it("accepts only the required cross-page pair as Cross-field spread evidence", () => {
    const cell = getCell(createChromaticPreviewMatrix(), CHROMATIC_RECIPE_IDS.crossFieldNote, "valid-cross-page-pair-evidence");
    expect(deriveSpreadEvidence(cell.recipe)).toEqual([{ kind: "cross-page-pair", photoSlotId: "source-photo", noteSlotId: "field-note" }]);
    const colorOnly = { ...cell.recipe, noteRelations: [] };
    expect(deriveSpreadEvidence(colorOnly)).toEqual([]);
    expect(validateRecipeDefinition(colorOnly)).toMatchObject({ valid: false });
  });

  it("keeps Editor/Reader Render Plan geometry equal and Reader free of placeholders or controls", () => {
    const matrix = createChromaticPreviewMatrix();
    for (const [recipeId, scenario] of [
      [CHROMATIC_RECIPE_IDS.entryField, "exact-one"],
      [CHROMATIC_RECIPE_IDS.fourBeat, "editor-reader-parity"],
      [CHROMATIC_RECIPE_IDS.crossFieldNote, "editor-reader-parity"],
    ] as const) {
      const editor = getCell(matrix, recipeId, scenario, "editor");
      const reader = getCell(matrix, recipeId, scenario, "reader");
      expect(geometry(reader)).toEqual(geometry(editor));
      expect(reader.plans.flatMap((plan) => plan.slots).every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).every((slot) => !Object.hasOwn(slot, "selected"))).toBe(true);
    }
    for (const recipeId of Object.values(CHROMATIC_RECIPE_IDS)) {
      const editor = getCell(matrix, recipeId, recipeId === CHROMATIC_RECIPE_IDS.crossFieldNote ? "missing-photo" : "empty", "editor");
      const reader = getCell(matrix, recipeId, recipeId === CHROMATIC_RECIPE_IDS.crossFieldNote ? "missing-photo" : "empty", "reader");
      expect(editor.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.plans.flatMap((plan) => plan.slots).filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
    }
  });

  it("exposes an independent Chromatic gate without adding recipe-specific renderer code", () => {
    const gate = readFileSync(join(process.cwd(), "features/zine/components/reference-recipe-gate.tsx"), "utf8");
    const renderer = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.module.css"), "utf8");
    expect(gate).toContain("Chromatic Formal Draft Preview Matrix");
    expect(gate).toContain('data-chromatic-preview-cell={matrix === "chromatic" ? "true" : undefined}');
    expect(renderer).not.toMatch(/chromatic-(?:entry|four|cross)|entry-field|beat-photo|beat-field|field-note|source-field|note-field/u);
    expect(css).not.toMatch(/chromatic-(?:entry|four|cross)|entry-field|beat-photo|beat-field|field-note|source-field|note-field/u);
  });
});
