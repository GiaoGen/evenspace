import { describe, expect, it } from "vitest";
import {
  baseRecipeDefinitions,
  createRecipeApplication,
  estimateRecipeNoteLines,
  evaluateRecipeCompatibility,
  getRecipeForStyle,
  phaseDRecipeDefinitions,
  recipeDefinitions,
  validateRecipeDefinition,
  type RecipeDefinition,
} from "./recipe-contract";

describe("Recipe Contract v1", () => {
  it("keeps every base recipe statically valid", () => {
    expect(baseRecipeDefinitions).toHaveLength(5);
    expect(baseRecipeDefinitions.every((recipe) => validateRecipeDefinition(recipe).valid)).toBe(true);
  });

  it("keeps the executable Phase D catalog statically valid", () => {
    expect(phaseDRecipeDefinitions).toHaveLength(1);
    expect(recipeDefinitions).toHaveLength(6);
    expect(recipeDefinitions.every((recipe) => validateRecipeDefinition(recipe).valid)).toBe(true);
  });

  it("reports content compatibility without deleting notes", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).not.toBeNull();
    if (!recipe) return;

    const result = evaluateRecipeCompatibility(recipe, {
      photoIds: ["one", "two"],
      notesByPhotoId: { one: "Keep this note", two: "Another note" },
    });
    expect(result.code).toBe("too-much-content");
    expect(result.valid).toBe(false);
  });

  it("keeps hidden notes in the source data while a no-note recipe hides them", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const noNoteRecipe = {
      ...recipe,
      id: "recipe-no-note-v1",
      capabilities: {
        ...recipe.capabilities,
        notes: { ...recipe.capabilities.notes, mode: "none" as const },
      },
      slots: recipe.slots.filter((slot) => slot.kind !== "note"),
      noteRelations: [],
    };
    const content = {
      photoIds: ["one"],
      notesByPhotoId: { one: "Keep this note in the source." },
    };
    const compatibility = evaluateRecipeCompatibility(noNoteRecipe, content);
    const application = createRecipeApplication({ recipe: noNoteRecipe, content, anchorPageId: "page-one" });

    expect(compatibility).toMatchObject({
      code: "compatible-with-hidden-notes",
      valid: true,
      hiddenNotePhotoIds: ["one"],
    });
    expect(application.hiddenNotePhotoIds).toEqual(["one"]);
    expect(application.assignments[0]?.noteSlotId).toBeUndefined();
    expect(content.notesByPhotoId.one).toBe("Keep this note in the source.");
  });

  it("rejects long notes explicitly instead of silently truncating them", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const constrainedRecipe = {
      ...recipe,
      id: "recipe-short-note-v1",
      capabilities: {
        ...recipe.capabilities,
        notes: { ...recipe.capabilities.notes, maxCharacters: 8 },
      },
    };
    const result = evaluateRecipeCompatibility(constrainedRecipe, {
      photoIds: ["one"],
      notesByPhotoId: { one: "123456789" },
    });

    expect(result).toMatchObject({
      code: "note-too-long",
      valid: false,
    });
    expect(result.reason).toContain("8-character");
  });

  it("requires a Photo Note when a recipe declares required notes", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const requiredRecipe = {
      ...recipe,
      id: "recipe-required-note-v1",
      capabilities: {
        ...recipe.capabilities,
        notes: { ...recipe.capabilities.notes, mode: "required" as const },
      },
    };
    const result = evaluateRecipeCompatibility(requiredRecipe, {
      photoIds: ["one"],
      notesByPhotoId: { one: "" },
    });

    expect(result).toMatchObject({ code: "needs-content", valid: false });
  });

  it("rejects cross-page-pair relations outside a spread and on the same side", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;
    const pagePair = {
      ...base,
      id: "recipe-page-pair-v1",
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "note-1", kind: "cross-page-pair" as const }],
    } satisfies RecipeDefinition;
    const spreadSameSide = {
      ...pagePair,
      id: "recipe-spread-pair-same-side-v1",
      scope: "spread" as const,
    } satisfies RecipeDefinition;

    expect(validateRecipeDefinition(pagePair).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "cross-page-pair requires a spread recipe." }),
    ]));
    expect(validateRecipeDefinition(spreadSameSide).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "cross-page-pair requires photo and note slots on opposite page sides." }),
    ]));
  });

  it("accepts a cross-page-pair only when the related slots occupy opposite spread sides", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;
    const valid = {
      ...base,
      id: "recipe-spread-pair-v1",
      scope: "spread" as const,
      slots: base.slots.map((slot) => (
        slot.id === "photo-1"
          ? { ...slot, pageSide: "left" as const }
          : slot.id === "note-1"
            ? { ...slot, pageSide: "right" as const }
            : slot
      )),
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "note-1", kind: "cross-page-pair" as const }],
    } satisfies RecipeDefinition;

    expect(validateRecipeDefinition(valid)).toMatchObject({ valid: true, issues: [] });
  });

  it("rejects notes that exceed the rendered slot line budget before application", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;
    const constrained = {
      ...base,
      id: "recipe-narrow-note-v1",
      capabilities: {
        ...base.capabilities,
        notes: { ...base.capabilities.notes, maxCharacters: 200, maxLines: 2 },
      },
      slots: base.slots.map((slot) => slot.id === "note-1"
        ? { ...slot, rect: { ...slot.rect, width: .2 }, maxLines: undefined }
        : slot),
    } satisfies RecipeDefinition;
    const note = "This note is intentionally long enough to wrap across more than two rendered lines.";
    expect(estimateRecipeNoteLines(constrained, "photo-1", note)).toBeGreaterThan(2);

    const result = evaluateRecipeCompatibility(constrained, {
      photoIds: ["one"],
      notesByPhotoId: { one: note },
    });
    expect(result).toMatchObject({ code: "note-too-many-lines", valid: false });
    expect(result.reason).toContain("2-line");
  });

  it("creates deterministic photo and note assignments", () => {
    const recipe = getRecipeForStyle("split");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      anchorPageId: "page-right",
      content: {
        photoIds: ["photo-a", "photo-b"],
        notesByPhotoId: { "photo-a": "Left note", "photo-b": "Right note" },
      },
    });

    expect(application.scope).toBe("page");
    expect(application.targetPageIds).toEqual(["page-right"]);
    expect(application.assignments.map((assignment) => assignment.photoId)).toEqual([
      "photo-a",
      "photo-b",
    ]);
    expect(application.assignments[0]?.noteOfPhotoId).toBe("photo-a");
    const repeated = createRecipeApplication({
      recipe,
      anchorPageId: "page-right",
      content: {
        photoIds: ["photo-a", "photo-b"],
        notesByPhotoId: { "photo-a": "Left note", "photo-b": "Right note" },
      },
    });
    expect(repeated.assignments).toEqual(application.assignments);
  });

  it("keeps over-capacity content addressable as unplaced instead of dropping it", () => {
    const base = getRecipeForStyle("split");
    expect(base).not.toBeNull();
    if (!base) return;
    const roomy = {
      ...base,
      id: "recipe-roomy-split-v1",
      capabilities: {
        ...base.capabilities,
        photos: { ...base.capabilities.photos, max: 4 },
      },
    } satisfies RecipeDefinition;
    const content = {
      photoIds: ["one", "two", "three"],
      notesByPhotoId: {},
    };

    expect(evaluateRecipeCompatibility(roomy, content).valid).toBe(true);
    expect(createRecipeApplication({ recipe: roomy, content, anchorPageId: "page-one" }).unplacedPhotoIds)
      .toEqual(["three"]);
  });

  it("migrates normalized placement focus when switching recipes", () => {
    const editorial = getRecipeForStyle("editorial");
    const split = getRecipeForStyle("split");
    expect(editorial).not.toBeNull();
    expect(split).not.toBeNull();
    if (!editorial || !split) return;

    const first = createRecipeApplication({
      recipe: editorial,
      anchorPageId: "page-one",
      content: {
        photoIds: ["photo-a"],
        notesByPhotoId: {},
        defaultFocusByPhotoId: { "photo-a": { focusX: 18, focusY: 72 } },
      },
    });
    const switched = createRecipeApplication({
      recipe: split,
      anchorPageId: "page-one",
      content: { photoIds: ["photo-a"], notesByPhotoId: {} },
      previousApplications: [first],
    });
    const switchedBack = createRecipeApplication({
      recipe: editorial,
      anchorPageId: "page-one",
      content: { photoIds: ["photo-a"], notesByPhotoId: {} },
      previousApplications: [switched],
    });

    expect(switched.assignments[0]).toMatchObject({ focusX: 18, focusY: 72, scale: 1 });
    expect(switchedBack.assignments[0]).toMatchObject({ focusX: 18, focusY: 72, scale: 1 });
  });

  it("keeps duplicate photo instances independent during migration", () => {
    const recipe = getRecipeForStyle("split");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const nextRecipe = { ...recipe, id: "recipe-split-next-v1" };
    const previous = createRecipeApplication({
      recipe,
      anchorPageId: "page-one",
      content: {
        photoIds: ["same-photo", "same-photo"],
        contentItemIds: ["content-a", "content-b"],
        notesByPhotoId: {},
      },
    });
    const focused = {
      ...previous,
      assignments: previous.assignments.map((assignment, index) => ({
        ...assignment,
        focusX: index === 0 ? 12 : 78,
        focusY: index === 0 ? 88 : 24,
      })),
    };
    const migrated = createRecipeApplication({
      recipe: nextRecipe,
      anchorPageId: "page-one",
      content: {
        photoIds: ["same-photo", "same-photo"],
        contentItemIds: ["content-a", "content-b"],
        notesByPhotoId: {},
      },
      previousApplications: [focused],
    });

    expect(migrated.assignments).toMatchObject([
      { contentItemId: "content-a", focusX: 12, focusY: 88 },
      { contentItemId: "content-b", focusX: 78, focusY: 24 },
    ]);
    expect(migrated.assignments[0]?.placementId).not.toBe(migrated.assignments[1]?.placementId);
  });

  it("rejects page recipes that declare cross-spread slots", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const invalid = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.kind === "photo"
        ? { ...slot, pageSide: "cross-spread" as const }
        : slot),
    } satisfies RecipeDefinition;

    const validation = validateRecipeDefinition(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.issues.some((issue) => issue.code === "scope")).toBe(true);
  });
});
