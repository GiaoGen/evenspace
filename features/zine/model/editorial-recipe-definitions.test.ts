import { describe, expect, it } from "vitest";
import {
  createRecipeApplication,
  deriveSpreadEvidence,
  evaluateRecipeCompatibility,
  estimateRecipeNoteLines,
  estimateRecipeTextLines,
  getRecipeCompatibilityLabel,
  validateRecipeDefinition,
  type AuthoredTextItem,
} from "./recipe-contract";
import {
  EDITORIAL_RECIPE_IDS,
  editorialRecipeDefinitions,
  editorialRecipeTheme,
} from "./editorial-recipe-definitions";
import {
  formalRecipeDefinitions,
  getRuntimeRecipeDefinitionByRef,
  runtimeRecipeDefinitions,
} from "./recipe-definition-registry";
import {
  getActiveRecipeCatalogEntries,
  getActiveRecipeDefinition,
  getRecipeCatalogEntry,
  resolveDevelopmentRecipe,
  validateRecipeCatalog,
} from "./recipe-catalog";
import {
  editorialAcrossMaximumNote,
  editorialEvidenceMaximumNote,
  editorialLeadMaximumDeck,
  editorialLeadMaximumTitle,
} from "./editorial-recipe-matrix";

describe("Phase F3-B2 Editorial formal Recipe Definitions", () => {
  it("matches the approved identities, geometry, neutral theme, and semantic bands", () => {
    expect(editorialRecipeDefinitions).toHaveLength(3);
    expect(editorialRecipeDefinitions.every((definition) => validateRecipeDefinition(definition).valid)).toBe(true);
    expect(editorialRecipeDefinitions.every((definition) => (
      definition.schemaVersion === 1
      && definition.version === 1
      && definition.familyId === "editorial"
      && definition.status === "draft"
      && definition.canvas.pageRatio === "3:4"
      && definition.theme === editorialRecipeTheme
      && !Object.hasOwn(definition, "legacy")
      && !Object.hasOwn(definition, "legacyStyleId")
      && definition.slots.filter((slot) => slot.kind === "photo").every((slot) => slot.fit === "cover")
    ))).toBe(true);
    expect(editorialRecipeTheme).toEqual({
      background: "#F4F0E8",
      foreground: "#17191C",
      muted: "#55585D",
      photoBackground: "#D7D3CA",
      typographyPreset: "photoessay-display",
    });

    expect(editorialRecipeDefinitions[0]).toMatchObject({
      id: EDITORIAL_RECIPE_IDS.evidenceAside,
      scope: "page",
      capabilities: { photos: { min: 2, max: 2 }, notes: { mode: "optional", maxCharacters: 60, maxLines: 4 }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .07, y: .08, width: .86, height: .84 } },
      slots: [
        { id: "photo-main", rect: { x: .07, y: .13, width: .62, height: .63 }, pageSide: "left", required: true, zIndex: 10, fit: "cover" },
        { id: "label-evidence", rect: { x: .71, y: .08, width: .22, height: .04 }, pageSide: "left", required: true, zIndex: 20, text: "EVIDENCE 02", textSource: "literal" },
        { id: "note-evidence", rect: { x: .71, y: .14, width: .22, height: .22 }, pageSide: "left", required: false, zIndex: 21, role: "note", maxLines: 4 },
        { id: "photo-evidence", rect: { x: .71, y: .47, width: .22, height: .37 }, pageSide: "left", required: true, zIndex: 11, fit: "cover" },
      ],
      noteRelations: [{ photoSlotId: "photo-evidence", noteSlotId: "note-evidence", kind: "adjacent" }],
    });

    expect(editorialRecipeDefinitions[1]).toMatchObject({
      id: EDITORIAL_RECIPE_IDS.acrossTheRecord,
      scope: "spread",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "required", maxCharacters: 120, maxLines: 4 }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .08, y: .08, width: 1.84, height: .84 }, gutter: { start: .98, end: 1.02 } },
      slots: [
        { id: "photo-record", rect: { x: .08, y: .08, width: .84, height: .84 }, pageSide: "left", required: true, zIndex: 10, fit: "cover" },
        { id: "label-record", rect: { x: 1.15, y: .12, width: .35, height: .05 }, pageSide: "right", text: "RECORD 01", textSource: "literal", zIndex: 20 },
        { id: "note-record", rect: { x: 1.15, y: .25, width: .60, height: .34 }, pageSide: "right", required: true, zIndex: 21, role: "note", maxLines: 4 },
      ],
      noteRelations: [{ photoSlotId: "photo-record", noteSlotId: "note-record", kind: "cross-page-pair" }],
    });
    expect(deriveSpreadEvidence(editorialRecipeDefinitions[1]!)).toEqual([
      { kind: "cross-page-pair", photoSlotId: "photo-record", noteSlotId: "note-record" },
    ]);

    expect(editorialRecipeDefinitions[2]).toMatchObject({
      id: EDITORIAL_RECIPE_IDS.leadStory,
      scope: "page",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" }, allowsEmptyDraft: false },
      slots: [
        { id: "title-lead", rect: { x: .08, y: .07, width: .84, height: .13 }, pageSide: "left", required: true, zIndex: 20, textSource: "authored", contentKey: "story-title", maxCharacters: 60, maxLines: 3, role: "title" },
        { id: "deck-lead", rect: { x: .08, y: .21, width: .54, height: .09 }, pageSide: "left", required: false, zIndex: 21, textSource: "authored", contentKey: "story-deck", maxCharacters: 76, maxLines: 2, role: "deck" },
        { id: "photo-lead", rect: { x: .08, y: .34, width: .84, height: .58 }, pageSide: "left", required: true, zIndex: 10, fit: "cover" },
      ],
      noteRelations: [],
    });
    expect(editorialRecipeDefinitions[2]!.slots.filter((slot) => slot.kind === "static-text").every((slot) => !Object.hasOwn(slot, "text"))).toBe(true);
  });

  it("registers only exact Editorial id/version refs without legacy mapping", () => {
    expect(formalRecipeDefinitions).toHaveLength(9);
    expect(runtimeRecipeDefinitions).toHaveLength(15);
    for (const definition of editorialRecipeDefinitions) {
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 2 })).toBeNull();
    }
    expect(editorialRecipeDefinitions.every((definition) => !Object.hasOwn(definition, "legacy"))).toBe(true);
  });

  it("keeps Editorial Catalog entries draft-only and development-valid", () => {
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries()).toHaveLength(6);
    for (const definition of editorialRecipeDefinitions) {
      const development = resolveDevelopmentRecipe({ id: definition.id, version: definition.version });
      expect(development.entry).toMatchObject({ familyId: "editorial", status: "draft" });
      expect(development.definition).toBe(definition);
      expect(development.validation?.valid).toBe(true);
      expect(getActiveRecipeDefinition({ id: definition.id, version: definition.version })).toBeNull();
    }
    expect(getRecipeCatalogEntry({ id: EDITORIAL_RECIPE_IDS.evidenceAside, version: 1 })?.authoring).toEqual({
      ratios: { preferred: ["landscape", "portrait", "square"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "medium",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    });
  });

  it("enforces Evidence Aside capacity, Note relation, no-note geometry, and measured overflow diagnostics", () => {
    const definition = editorialRecipeDefinitions[0]!;
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main"], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main", "evidence"], notesByPhotoId: {} })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main", "evidence", "extra"], notesByPhotoId: {} })).toMatchObject({ code: "too-much-content", valid: false });
    expect(editorialEvidenceMaximumNote).toHaveLength(60);
    expect(estimateRecipeNoteLines(definition, "photo-evidence", editorialEvidenceMaximumNote)).toBe(4);
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main", "evidence"], notesByPhotoId: { evidence: editorialEvidenceMaximumNote } })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main", "evidence"], notesByPhotoId: { evidence: `${editorialEvidenceMaximumNote}x` } })).toMatchObject({ code: "note-too-long", valid: false });
    const noteLineOverflow = "one\ntwo\nthree\nfour\nfive";
    expect(noteLineOverflow.length).toBeLessThanOrEqual(60);
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["main", "evidence"], notesByPhotoId: { evidence: noteLineOverflow } })).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(getRecipeCompatibilityLabel("note-too-long")).toBe("Note is too long");

    const noNote = createRecipeApplication({ recipe: definition, content: { photoIds: ["main", "evidence"], notesByPhotoId: {} }, anchorPageId: "page" });
    const mainNote = createRecipeApplication({ recipe: definition, content: { photoIds: ["main", "evidence"], notesByPhotoId: { main: "Main context." } }, anchorPageId: "page" });
    const evidenceNote = createRecipeApplication({ recipe: definition, content: { photoIds: ["main", "evidence"], notesByPhotoId: { evidence: "Evidence context." } }, anchorPageId: "page" });
    expect(noNote.assignments.every((assignment) => assignment.noteSlotId === undefined)).toBe(true);
    expect(mainNote.assignments.every((assignment) => assignment.noteSlotId === undefined)).toBe(true);
    expect(evidenceNote.assignments.find((assignment) => assignment.photoId === "evidence")).toMatchObject({ noteSlotId: "note-evidence", noteOfPhotoId: "evidence" });
    expect(evidenceNote.assignments.find((assignment) => assignment.photoId === "main")?.noteSlotId).toBeUndefined();
  });

  it("enforces Across the Record required relation, 120/4 bounds, and atomic assignment capacity", () => {
    const definition = editorialRecipeDefinitions[1]!;
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["photo"], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["photo"], notesByPhotoId: { photo: "A" } })).toMatchObject({ code: "compatible", valid: true });
    expect(editorialAcrossMaximumNote).toHaveLength(120);
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["photo"], notesByPhotoId: { photo: editorialAcrossMaximumNote } })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["photo"], notesByPhotoId: { photo: `${editorialAcrossMaximumNote}x` } })).toMatchObject({ code: "note-too-long", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["photo"], notesByPhotoId: { photo: "one\ntwo\nthree\nfour\nfive" } })).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["one", "two"], notesByPhotoId: { one: "A" } })).toMatchObject({ code: "too-much-content", valid: false });

    const application = createRecipeApplication({
      recipe: definition,
      content: { photoIds: ["photo"], contentItemIds: ["photo-content"], notesByPhotoId: { photo: "A" } },
      anchorPageId: "left",
      targetPageIds: ["left", "right"],
    });
    expect(application).toMatchObject({ recipeId: definition.id, recipeVersion: 1, scope: "spread", targetPageIds: ["left", "right"] });
    expect(application.assignments).toEqual([expect.objectContaining({ photoSlotId: "photo-record", noteSlotId: "note-record", noteOfPhotoId: "photo" })]);
    expect(deriveSpreadEvidence(definition)).toHaveLength(1);
  });

  it("enforces Lead Story authored title/deck boundaries without accepting global or literal substitutes", () => {
    const definition = editorialRecipeDefinitions[2]!;
    const owner = { kind: "page", pageId: "lead-page" } as const;
    const item = (contentKey: "story-title" | "story-deck", text: string): AuthoredTextItem => ({
      id: `${contentKey}-1`, owner, contentKey, roleHint: contentKey === "story-title" ? "title" : "deck", text,
    });
    const base = (items: readonly AuthoredTextItem[]) => ({
      photoIds: ["photo"],
      notesByPhotoId: {},
      authoredTextItems: items,
      owner,
    });

    expect(evaluateRecipeCompatibility(definition, base([]))).toMatchObject({ code: "authored-text-missing", contentKey: "story-title", slotId: "title-lead" });
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", "Title only.")]))).toMatchObject({ code: "compatible", valid: true });
    expect(editorialLeadMaximumTitle).toHaveLength(60);
    expect(editorialLeadMaximumDeck).toHaveLength(76);
    const deckSlot = definition.slots.find((slot) => slot.id === "deck-lead");
    expect(deckSlot?.kind).toBe("static-text");
    if (deckSlot?.kind === "static-text") {
      expect(estimateRecipeTextLines(definition, deckSlot, editorialLeadMaximumDeck)).toBe(2);
    }
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", editorialLeadMaximumTitle)]))).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", `${editorialLeadMaximumTitle}x`)]))).toMatchObject({ code: "authored-text-too-long", slotId: "title-lead" });
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", "one\ntwo\nthree\nfour")]))).toMatchObject({ code: "authored-text-too-many-lines", slotId: "title-lead" });
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", "Title."), item("story-deck", editorialLeadMaximumDeck)])).code).toBe("compatible");
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", "Title."), item("story-deck", `${editorialLeadMaximumDeck}x`)]))).toMatchObject({ code: "authored-text-too-long", slotId: "deck-lead" });
    const deckLineOverflow = "one\ntwo\nthree";
    expect(deckLineOverflow.length).toBeLessThanOrEqual(76);
    expect(evaluateRecipeCompatibility(definition, base([item("story-title", "Title."), item("story-deck", deckLineOverflow)]))).toMatchObject({ code: "authored-text-too-many-lines", slotId: "deck-lead" });

    const mismatchOwner = { kind: "spread", anchorPageId: "lead-page", targetPageIds: ["lead-page", "other-page"] } as const;
    expect(evaluateRecipeCompatibility(definition, {
      ...base([item("story-title", "Wrong page.")]),
      owner: mismatchOwner,
      authoredTextItems: [{ ...item("story-title", "Wrong page."), owner: { kind: "page", pageId: "other-page" } }],
    })).toMatchObject({ code: "authored-text-owner-mismatch", contentKey: "story-title" });
    expect((definition.slots as readonly { readonly kind: string }[]).some((slot) => slot.kind === "note")).toBe(false);
  });
});
