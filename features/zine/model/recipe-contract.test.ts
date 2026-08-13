import { describe, expect, it } from "vitest";
import {
  baseRecipeDefinitions,
  DEFAULT_RECIPE_TYPOGRAPHY,
  adaptRecipeSlot,
  adaptRecipeTypography,
  adaptRecipeTheme,
  contrastRatio,
  createRecipeApplication,
  deriveCanvasMetrics,
  deriveSpreadEvidence,
  estimateRecipeTextLayout,
  estimateRecipeNoteLines,
  evaluateRecipeCompatibility,
  getRecipeForStyle,
  getRecipeTypographyLayoutMetrics,
  isLegacyRecipeDefinition,
  phaseDRecipeDefinitions,
  measureRecipeTextLineWidth,
  resolveRecipeTextSurface,
  recipeDefinitions,
  validateRecipeDefinition,
  validateColorFieldContract,
  validateTypographyContract,
  type RecipeDefinition,
} from "./recipe-contract";
import { referenceRecipeDefinitions } from "./reference-recipe-definitions";

describe("Recipe Contract v1", () => {
  function modernNoColorRecipe() {
    const base = getRecipeForStyle("editorial");
    if (!base) throw new Error("editorial fixture missing");
    return {
      ...base,
      id: "modern-no-color-field-v1",
      theme: {
        ...base.theme!,
        colorTokens: {
          paper: base.theme!.background,
          ink: base.theme!.foreground,
          "muted-ink": base.theme!.muted,
          "photo-mat": base.theme!.photoBackground,
        },
        typography: DEFAULT_RECIPE_TYPOGRAPHY,
      },
      slots: base.slots.map(modernizeSlot),
    } as unknown as RecipeDefinition;
  }

  function modernizeSlot(slot: RecipeDefinition["slots"][number]) {
    if (slot.kind === "photo") return { ...slot, zIndex: 10 };
    if (slot.kind === "color-field") return slot;
    return { ...adaptRecipeSlot(slot), zIndex: 20, foregroundToken: "ink" as const };
  }

  function modernizeTheme(recipe: RecipeDefinition) {
    return { ...recipe.theme!, typography: DEFAULT_RECIPE_TYPOGRAPHY };
  }

  it("derives page and spread canvas metrics without adding a persisted spread ratio", () => {
    expect(deriveCanvasMetrics("3:4", "page")).toEqual({
      pageCoordinateWidth: 1,
      spreadCoordinateWidth: 2,
      coordinateWidth: 1,
      physicalSpreadRatio: { width: 3, height: 2 },
    });
    expect(deriveCanvasMetrics("3:4", "spread")).toEqual({
      pageCoordinateWidth: 1,
      spreadCoordinateWidth: 2,
      coordinateWidth: 2,
      physicalSpreadRatio: { width: 3, height: 2 },
    });
  });

  it("keeps every base recipe statically valid", () => {
    expect(baseRecipeDefinitions).toHaveLength(5);
    expect(baseRecipeDefinitions.every((recipe) => validateRecipeDefinition(recipe).valid)).toBe(true);
  });

  it("adapts legacy Theme colors without changing their semantic values", () => {
    const theme = baseRecipeDefinitions[0]?.theme;
    expect(theme).toBeDefined();
    expect(adaptRecipeTheme(theme)).toMatchObject({
      paper: theme?.background,
      ink: theme?.foreground,
      "muted-ink": theme?.muted,
      "photo-mat": theme?.photoBackground,
    });
  });

  it("resolves all seven typography roles from the finite product preset", () => {
    expect(Object.keys(adaptRecipeTypography())).toEqual([
      "title", "deck", "label", "folio", "caption", "note", "index",
    ]);
    expect(adaptRecipeTypography().folio).toEqual(DEFAULT_RECIPE_TYPOGRAPHY.folio);
    expect(adaptRecipeTypography({
      ...baseRecipeDefinitions[0]!.theme!,
      typography: {
        title: { size: "lg", lineHeight: "tight", weight: 600, tracking: "normal", transform: "none" },
      },
    }).title).toMatchObject({ size: "lg", weight: 600 });
  });

  it("uses one canvas-relative typography metric source for roles and line fitting", () => {
    const recipe = getRecipeForStyle("editorial");
    expect(recipe).toBeDefined();
    if (!recipe) return;
    const noteSlot = recipe.slots.find((slot) => slot.kind === "note");
    expect(noteSlot?.kind).toBe("note");
    if (noteSlot?.kind !== "note") return;

    const noteMetrics = getRecipeTypographyLayoutMetrics("note", DEFAULT_RECIPE_TYPOGRAPHY.note);
    const titleMetrics = getRecipeTypographyLayoutMetrics("title", DEFAULT_RECIPE_TYPOGRAPHY.title);
    const wideMetrics = getRecipeTypographyLayoutMetrics("note", { ...DEFAULT_RECIPE_TYPOGRAPHY.note, tracking: "wide" });
    expect(titleMetrics.normalizedFontSize).toBeGreaterThan(noteMetrics.normalizedFontSize);
    expect(titleMetrics.lineHeight).toBe(1.1);
    expect(measureRecipeTextLineWidth("record", wideMetrics)).toBeGreaterThan(measureRecipeTextLineWidth("record", noteMetrics));

    const latin = estimateRecipeTextLayout(recipe, { ...noteSlot, rect: { ...noteSlot.rect, width: .1, height: .5 } }, "abcde");
    const cjk = estimateRecipeTextLayout(recipe, { ...noteSlot, rect: { ...noteSlot.rect, width: .1, height: .5 } }, "清晨車站光");
    const explicit = estimateRecipeTextLayout(recipe, { ...noteSlot, rect: { ...noteSlot.rect, width: .5, height: .5 } }, "one\ntwo");
    const longWord = estimateRecipeTextLayout(recipe, { ...noteSlot, rect: { ...noteSlot.rect, width: .1, height: .5 } }, "pneumonoultramicroscopicsilicovolcanoconiosis");
    expect(cjk.estimatedLines).toBeGreaterThan(latin.estimatedLines);
    expect(explicit.estimatedLines).toBe(2);
    expect(longWord.estimatedLines).toBeGreaterThan(1);
    expect(explicit.fits).toBe(true);
    expect(explicit.lineBoxHeight).toBeLessThan(explicit.slotHeight);
  });

  it("adapts legacy text slots to folio, note, and label without using slot ids", () => {
    const legacyStatic = adaptRecipeSlot({
      id: "anything",
      kind: "static-text",
      rect: { x: 0, y: 0, width: .1, height: .1 },
      pageSide: "left",
      required: false,
      zIndex: 1,
      textSource: "page-number",
    });
    const legacyLabel = adaptRecipeSlot({
      id: "anything-else",
      kind: "static-text",
      rect: { x: 0, y: 0, width: .1, height: .1 },
      pageSide: "left",
      required: false,
      zIndex: 1,
      textSource: "literal",
    });
    const legacyNote = adaptRecipeSlot({
      id: "legacy-note",
      kind: "note",
      rect: { x: 0, y: 0, width: .1, height: .1 },
      pageSide: "left",
      required: false,
      zIndex: 2,
    });
    expect(legacyStatic).toMatchObject({ role: "folio", align: "end" });
    expect(legacyLabel).toMatchObject({ role: "label", align: "start" });
    expect(legacyNote).toMatchObject({ role: "note" });
  });

  it("rejects unknown typography roles, incomplete tokens, source contradictions, and visual injection", () => {
    const base = phaseDRecipeDefinitions[0]!;
    const label = base.slots.find((slot) => slot.kind === "static-text")!;
    const invalidRole = { ...base, slots: base.slots.map((slot) => slot.id === label.id ? { ...slot, role: "display" } : slot) } as unknown as RecipeDefinition;
    const missingRoleToken = { ...base, theme: { ...base.theme!, typography: {} } } as RecipeDefinition;
    const badFolio = {
      ...base,
      slots: base.slots.map((slot) => slot.id === label.id ? { ...slot, role: "folio" as const, textSource: "literal" as const } : slot),
    } as RecipeDefinition;
    const badToken = {
      ...base,
      theme: { ...base.theme!, typography: { ...base.theme!.typography, label: { ...DEFAULT_RECIPE_TYPOGRAPHY.label, size: "xxl" } } },
    } as unknown as RecipeDefinition;
    const injectedFont = { ...base, theme: { ...base.theme!, fontFamily: "Injected Font" } } as unknown as RecipeDefinition;
    for (const invalid of [invalidRole, missingRoleToken, badFolio, badToken, injectedFont]) {
      expect(validateTypographyContract(invalid).length).toBeGreaterThan(0);
      expect(validateRecipeDefinition(invalid).valid).toBe(false);
    }
  });

  it("limits Note slots to caption, note, or index roles", () => {
    const recipe = referenceRecipeDefinitions.find((candidate) => candidate.id === "reference-single-photo-note-v1")!;
    const invalid = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.kind === "note" ? { ...slot, role: "deck" as const } : slot),
    } as RecipeDefinition;
    expect(validateTypographyContract(invalid)).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "typography", message: expect.stringContaining("caption, note, or index") }),
    ]));
  });

  it("keeps legacy slot order while enforcing semantic bands for modern recipes without Color Fields", () => {
    const legacy = baseRecipeDefinitions[0];
    expect(legacy).toBeDefined();
    if (!legacy) return;
    const legacyAdapted = legacy.slots.map(adaptRecipeSlot);
    expect(legacyAdapted.map((slot) => slot.zIndex)).toEqual(legacy.slots.map((slot) => slot.zIndex));
    const modern = modernNoColorRecipe();
    expect(validateRecipeDefinition(modern)).toMatchObject({ valid: true, issues: [] });

    const badPhotoBand = {
      ...modern,
      slots: modern.slots.map((slot) => slot.kind === "photo" ? { ...slot, zIndex: 1 } : slot),
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(badPhotoBand).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "layer", message: expect.stringContaining("10..19") }),
    ]));
  });

  it("rejects kind-specific visual properties in untrusted persisted slots", () => {
    const recipe = modernNoColorRecipe();
    const photo = recipe.slots.find((slot) => slot.kind === "photo");
    const note = recipe.slots.find((slot) => slot.kind === "note");
    const color = referenceRecipeDefinitions
      .find((candidate) => candidate.id === "reference-multi-color-system-v1")
      ?.slots.find((slot) => slot.kind === "color-field");
    expect(photo).toBeDefined();
    expect(note).toBeDefined();
    expect(color).toBeDefined();
    if (!photo || !note || !color) return;
    for (const slot of [
      { ...photo, fillToken: "paper" },
      { ...note, fillToken: "paper" },
      { ...color, foregroundToken: "ink" },
      { ...color, className: "not-allowed" },
    ]) {
      const invalid = { ...recipe, slots: [slot] } as unknown as RecipeDefinition;
      expect(validateRecipeDefinition(invalid).valid).toBe(false);
    }
  });

  it("resolves paper by default, highest nested surface, and rejects partial or ambiguous surfaces", () => {
    const recipe = modernNoColorRecipe();
    const note = recipe.slots.find((slot) => slot.kind === "note");
    expect(note).toBeDefined();
    if (!note) return;
    expect(resolveRecipeTextSurface(recipe, note)).toEqual({ valid: true, surfaceToken: "paper" });

    const withNested = {
      ...recipe,
      slots: [
        ...recipe.slots,
        { id: "outer", kind: "color-field" as const, rect: { x: .5, y: .2, width: .45, height: .6 }, pageSide: "left" as const, required: false, zIndex: 1, fillToken: "accent-1" as const },
        { id: "inner", kind: "color-field" as const, rect: { x: .58, y: .5, width: .35, height: .2 }, pageSide: "left" as const, required: false, zIndex: 5, fillToken: "accent-2" as const },
      ],
    } as unknown as RecipeDefinition;
    const nestedNote = { ...note, rect: { x: .6, y: .55, width: .2, height: .08 } };
    expect(resolveRecipeTextSurface(withNested, nestedNote)).toMatchObject({
      valid: true,
      surfaceToken: "accent-2",
      surfaceSlotId: "inner",
    });

    const partial = { ...withNested, slots: withNested.slots.filter((slot) => slot.id !== "inner") } as RecipeDefinition;
    expect(resolveRecipeTextSurface(partial, { ...note, rect: { x: .9, y: .55, width: .2, height: .08 } })).toMatchObject({ valid: false });
    expect(resolveRecipeTextSurface(partial, { ...note, rect: { x: .08, y: .05, width: .2, height: .08 } })).toEqual({
      valid: true,
      surfaceToken: "paper",
    });
    const ambiguous = {
      ...withNested,
      slots: withNested.slots.map((slot) => slot.id === "inner" ? { ...slot, zIndex: 1 } : slot),
    } as unknown as RecipeDefinition;
    expect(resolveRecipeTextSurface(ambiguous, nestedNote)).toMatchObject({ valid: false });
  });

  it("uses exact Legacy registry identity and migrates every other Definition to semantic bands", () => {
    const legacy = baseRecipeDefinitions[0];
    const modern = { ...legacy!, id: "recipe-editorial-v1-modern", version: 1 } as RecipeDefinition;
    expect(isLegacyRecipeDefinition(legacy!)).toBe(true);
    expect(isLegacyRecipeDefinition(modern)).toBe(false);
    expect(validateRecipeDefinition(modern).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "layer", message: expect.stringContaining("10..19") }),
    ]));
  });

  it("rejects modern text/photo overlap", () => {
    const recipe = modernNoColorRecipe();
    const photo = recipe.slots.find((slot) => slot.kind === "photo");
    const note = recipe.slots.find((slot) => slot.kind === "note");
    expect(photo).toBeDefined();
    expect(note).toBeDefined();
    if (!photo || !note) return;
    const overlapping = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === note.id
        ? { ...slot, rect: { ...photo.rect, x: photo.rect.x + .05, y: photo.rect.y + .05, width: .2, height: .1 } }
        : slot),
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(overlapping).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "contrast", message: expect.stringContaining("cannot overlap photo") }),
    ]));
  });

  it("rejects unexpected persisted fields for every Slot kind", () => {
    const recipe = modernNoColorRecipe();
    const color = referenceRecipeDefinitions
      .find((candidate) => candidate.id === "reference-multi-color-system-v1")
      ?.slots.find((slot) => slot.kind === "color-field");
    const slots = [
      recipe.slots.find((slot) => slot.kind === "photo"),
      recipe.slots.find((slot) => slot.kind === "note"),
      recipe.slots.find((slot) => slot.kind === "static-text"),
      color,
    ];
    for (const slot of slots) {
      expect(slot).toBeDefined();
      if (!slot) continue;
      const invalid = { ...recipe, slots: [{ ...slot, arbitraryPersistedField: true }] } as unknown as RecipeDefinition;
      expect(validateRecipeDefinition(invalid).issues).toEqual(expect.arrayContaining([
        expect.objectContaining({ code: "slot", message: expect.stringContaining("unsupported") }),
      ]));
    }
  });

  it("requires Color Field pageSide to agree with spread geometry", () => {
    const base = referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-cross-gutter-v1");
    const color = referenceRecipeDefinitions
      .find((recipe) => recipe.id === "reference-multi-color-system-v1")
      ?.slots.find((slot) => slot.kind === "color-field");
    expect(base).toBeDefined();
    expect(color).toBeDefined();
    if (!base || !color) return;
    const invalid = {
      ...base,
      id: "spread-color-side-mismatch-v1",
      slots: [
        ...base.slots,
        { ...color, id: "bad-cross-field", pageSide: "cross-spread" as const, rect: { x: 0, y: .1, width: .8, height: .2 } },
        { ...color, id: "bad-left-field", pageSide: "left" as const, rect: { x: .8, y: .4, width: .4, height: .2 } },
        { ...color, id: "bad-right-field", pageSide: "right" as const, rect: { x: .8, y: .7, width: .4, height: .2 } },
      ],
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(invalid).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "scope", message: expect.stringContaining("must cross the gutter") }),
      expect.objectContaining({ code: "scope", message: expect.stringContaining("left page") }),
      expect.objectContaining({ code: "scope", message: expect.stringContaining("right page") }),
    ]));
  });

  it("validates controlled Color Field tokens, layers, and text contrast", () => {
    const recipe = referenceRecipeDefinitions.find((candidate) => candidate.id === "reference-multi-color-system-v1");
    expect(recipe).toBeDefined();
    if (!recipe) return;
    expect(validateColorFieldContract(recipe)).toEqual([]);
    expect(validateRecipeDefinition(recipe)).toMatchObject({ valid: true, issues: [] });

    const unknownToken = {
      ...recipe,
      theme: { ...recipe.theme!, colorTokens: { ...recipe.theme?.colorTokens, "not-a-token": "#ffffff" } },
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(unknownToken).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "color", message: expect.stringContaining("Unknown semantic color token") }),
    ]));

    const missingFill = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.kind === "color-field" ? { ...slot, fillToken: undefined } : slot),
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(missingFill).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "color", message: expect.stringContaining("controlled fillToken") }),
    ]));

    const transparent = {
      ...recipe,
      theme: { ...recipe.theme!, colorTokens: { ...recipe.theme?.colorTokens, paper: "rgba(0, 0, 0, .2)" } },
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(transparent).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "color", message: expect.stringContaining("opaque") }),
    ]));

    const outOfBand = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.kind === "color-field" ? { ...slot, zIndex: 10 } : slot),
    } satisfies RecipeDefinition;
    expect(validateRecipeDefinition(outOfBand).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "layer" }),
    ]));

    const injectedCss = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.kind === "color-field"
        ? { ...slot, className: "arbitrary-css", opacity: .5 }
        : slot),
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(injectedCss).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "color", message: expect.stringContaining("unsupported visual injection") }),
    ]));
  });

  it("rejects a color-field-only spread but accepts cross-line fields with independent evidence", () => {
    const page = referenceRecipeDefinitions.find((candidate) => candidate.id === "reference-multi-color-system-v1");
    const spread = referenceRecipeDefinitions.find((candidate) => candidate.id === "reference-cross-gutter-v1");
    expect(page).toBeDefined();
    expect(spread).toBeDefined();
    if (!page || !spread) return;
    const colorField = page.slots.find((slot) => slot.kind === "color-field");
    expect(colorField).toBeDefined();
    if (!colorField) return;
    const spreadOnly = {
      ...page,
      id: "recipe-color-only-spread-v1",
      scope: "spread" as const,
      canvas: { ...spread.canvas },
      slots: [{ ...colorField, rect: { x: .8, y: .1, width: .5, height: .7 }, pageSide: "cross-spread" as const }],
    } satisfies RecipeDefinition;
    expect(validateRecipeDefinition(spreadOnly).valid).toBe(false);
    expect(deriveSpreadEvidence(spreadOnly)).toEqual([]);

    const withEvidence = {
      ...spread,
      id: "recipe-color-with-photo-evidence-v1",
      slots: [
        ...spread.slots
          .filter((slot) => slot.kind !== "color-field")
          .map((slot) => slot.kind === "photo" ? { ...slot, zIndex: 10 } : { ...slot, zIndex: 20 }),
        { ...colorField, id: "cross-line-color", rect: { x: 0, y: 0, width: 2, height: 1 }, pageSide: "cross-spread" as const },
      ],
    } satisfies RecipeDefinition;
    expect(validateRecipeDefinition(withEvidence).issues).toEqual([]);
    expect(deriveSpreadEvidence(withEvidence)).toEqual([{
      kind: "cross-gutter-photo",
      photoSlotId: "cross-gutter-photo",
    }]);
    expect(deriveSpreadEvidence({ ...withEvidence, slots: withEvidence.slots.filter((slot) => slot.kind !== "color-field") })).toEqual([
      { kind: "cross-gutter-photo", photoSlotId: "cross-gutter-photo" },
    ]);
  });

  it("enforces the 4.5:1 ordinary text contrast boundary", () => {
    expect(contrastRatio("#000000", "#777777")).toBeGreaterThan(4.5);
    expect(contrastRatio("#777777", "#ffffff")).toBeLessThan(4.5);
    const recipe = referenceRecipeDefinitions.find((candidate) => candidate.id === "reference-multi-color-system-v1");
    expect(recipe).toBeDefined();
    if (!recipe) return;
    const lowContrast = {
      ...recipe,
      theme: { ...recipe.theme!, colorTokens: { ...recipe.theme?.colorTokens, ink: "#777777" } },
      slots: recipe.slots.map((slot) => slot.id === "reference-kicker" ? { ...slot, foregroundToken: "ink" as const } : slot),
    } as unknown as RecipeDefinition;
    expect(validateRecipeDefinition(lowContrast).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "contrast", message: expect.stringContaining("4.5:1") }),
    ]));
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
    const modernRecipe = {
      ...recipe,
      id: "modern-no-note-v1",
      theme: modernizeTheme(recipe),
      slots: recipe.slots.map(modernizeSlot),
    } as unknown as RecipeDefinition;
    const noNoteRecipe = {
      ...modernRecipe,
      id: "recipe-no-note-v1",
      capabilities: {
        ...recipe.capabilities,
        notes: { ...recipe.capabilities.notes, mode: "none" as const },
      },
      slots: modernRecipe.slots.filter((slot) => slot.kind !== "note"),
      noteRelations: [],
    } as unknown as RecipeDefinition;
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
      theme: modernizeTheme(recipe),
      slots: recipe.slots.map(modernizeSlot),
    } as unknown as RecipeDefinition;
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
      theme: modernizeTheme(recipe),
      slots: recipe.slots.map(modernizeSlot),
    } as unknown as RecipeDefinition;
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
    } as unknown as RecipeDefinition;
    const spreadSameSide = {
      ...pagePair,
      id: "recipe-spread-pair-same-side-v1",
      scope: "spread" as const,
    } as unknown as RecipeDefinition;

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
      theme: modernizeTheme(base),
      slots: base.slots.map(modernizeSlot).map((slot) => (
        slot.id === "photo-1"
          ? { ...slot, pageSide: "left" as const, zIndex: 10 }
          : slot.id === "note-1"
            ? { ...slot, pageSide: "right" as const, zIndex: 20, foregroundToken: "ink" as const }
            : slot.kind === "photo"
              ? { ...slot, zIndex: 10 }
              : { ...slot, zIndex: 20, foregroundToken: "ink" as const }
      )),
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "note-1", kind: "cross-page-pair" as const }],
    } as unknown as RecipeDefinition;

    expect(validateRecipeDefinition(valid)).toMatchObject({ valid: true, issues: [] });
    expect(deriveSpreadEvidence(valid)).toEqual([{
      kind: "cross-page-pair",
      photoSlotId: "photo-1",
      noteSlotId: "note-1",
    }]);
  });

  it("accepts the existing cross-gutter definitions and derives photo evidence", () => {
    const crossGutterRecipes = [
      ...phaseDRecipeDefinitions,
      ...referenceRecipeDefinitions.filter((recipe) => recipe.scope === "spread" && recipe.slots.some((slot) => slot.pageSide === "cross-spread")),
    ];
    for (const recipe of crossGutterRecipes) {
      expect(validateRecipeDefinition(recipe)).toMatchObject({ valid: true, issues: [] });
      expect(deriveSpreadEvidence(recipe)).toEqual([{
        kind: "cross-gutter-photo",
        photoSlotId: recipe.slots.find((slot) => slot.kind === "photo")?.id,
      }]);
    }
  });

  it("rejects a spread with only left-side slots, only right-side slots, or independent left/right slots", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;

    const leftOnly = { ...base, id: "recipe-spread-left-only-v1", scope: "spread" as const };
    const rightOnly = {
      ...leftOnly,
      id: "recipe-spread-right-only-v1",
      slots: leftOnly.slots.map((slot) => ({ ...slot, pageSide: "right" as const })),
    };
    const independentSides = {
      ...leftOnly,
      id: "recipe-spread-independent-sides-v1",
      slots: leftOnly.slots.map((slot) => slot.id === "page-number"
        ? { ...slot, pageSide: "right" as const }
        : slot),
    };

    expect(validateRecipeDefinition(leftOnly)).toMatchObject({ valid: false });
    expect(validateRecipeDefinition(leftOnly).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "A spread recipe must contain a cross-gutter photo or a valid cross-page-pair." }),
    ]));
    expect(validateRecipeDefinition(rightOnly)).toMatchObject({ valid: false });
    expect(validateRecipeDefinition(rightOnly).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: "A spread recipe must contain a cross-gutter photo or a valid cross-page-pair." }),
    ]));
    expect(deriveSpreadEvidence(rightOnly)).toEqual([]);
    expect(validateRecipeDefinition(independentSides)).toMatchObject({ valid: false });
    expect(deriveSpreadEvidence(independentSides)).toEqual([]);
  });

  it("rejects cross-gutter photos that do not strictly cross x=1 or lack permission", () => {
    const base = referenceRecipeDefinitions.find((recipe) => recipe.id === "reference-cross-gutter-v1");
    expect(base).toBeDefined();
    if (!base) return;
    const photo = base.slots.find((slot) => slot.kind === "photo");
    expect(photo).toBeDefined();
    if (!photo) return;

    const atGutterBoundary = {
      ...base,
      id: "recipe-cross-gutter-boundary-v1",
      slots: base.slots.map((slot) => slot.id === photo.id
        ? { ...slot, rect: { ...slot.rect, x: 1, width: .32 } }
        : slot),
    };
    const endingAtGutter = {
      ...base,
      id: "recipe-cross-gutter-ending-at-boundary-v1",
      slots: base.slots.map((slot) => slot.id === photo.id
        ? { ...slot, rect: { ...slot.rect, x: .68, width: .32 } }
        : slot),
    };
    const withoutPermission = {
      ...base,
      id: "recipe-cross-gutter-without-permission-v1",
      slots: base.slots.map((slot) => slot.id === photo.id
        ? { ...slot, allowGutterCrossing: false }
        : slot),
    };

    for (const invalid of [atGutterBoundary, endingAtGutter, withoutPermission]) {
      expect(validateRecipeDefinition(invalid).valid).toBe(false);
      expect(deriveSpreadEvidence(invalid)).toEqual([]);
    }
    expect(validateRecipeDefinition(atGutterBoundary).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining("must cross the gutter") }),
    ]));
    expect(validateRecipeDefinition(withoutPermission).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ message: expect.stringContaining("must allow gutter crossing") }),
    ]));
  });

  it("accepts a right-page photo paired with a left-page Note", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;
    const valid = {
      ...base,
      id: "recipe-spread-right-photo-left-note-v1",
      scope: "spread" as const,
      theme: modernizeTheme(base),
      slots: base.slots.map(modernizeSlot).map((slot) => (
        slot.id === "photo-1"
          ? { ...slot, pageSide: "right" as const, zIndex: 10, rect: { ...slot.rect, x: 1.1 } }
          : slot.id === "note-1"
            ? { ...slot, pageSide: "left" as const, zIndex: 20, foregroundToken: "ink" as const }
            : slot.kind === "photo"
              ? { ...slot, zIndex: 10 }
              : { ...slot, zIndex: 20, foregroundToken: "ink" as const }
      )),
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "note-1", kind: "cross-page-pair" as const }],
    } as unknown as RecipeDefinition;

    expect(validateRecipeDefinition(valid)).toMatchObject({ valid: true, issues: [] });
    expect(deriveSpreadEvidence(valid)).toEqual([{
      kind: "cross-page-pair",
      photoSlotId: "photo-1",
      noteSlotId: "note-1",
    }]);
  });

  it("rejects unknown and same-side cross-page-pair relations as spread evidence", () => {
    const base = getRecipeForStyle("editorial");
    expect(base).not.toBeNull();
    if (!base) return;

    const unknownSlot = {
      ...base,
      id: "recipe-spread-unknown-pair-v1",
      scope: "spread" as const,
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "missing-note", kind: "cross-page-pair" as const }],
    } as unknown as RecipeDefinition;
    const sameSide = {
      ...base,
      id: "recipe-spread-same-side-pair-v1",
      scope: "spread" as const,
      noteRelations: [{ photoSlotId: "photo-1", noteSlotId: "note-1", kind: "cross-page-pair" as const }],
    } as unknown as RecipeDefinition;

    expect(validateRecipeDefinition(unknownSlot).valid).toBe(false);
    expect(validateRecipeDefinition(sameSide).valid).toBe(false);
    expect(deriveSpreadEvidence(unknownSlot)).toEqual([]);
    expect(deriveSpreadEvidence(sameSide)).toEqual([]);
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
      theme: modernizeTheme(base),
      slots: base.slots.map(modernizeSlot).map((slot) => slot.id === "note-1"
        ? { ...slot, rect: { ...slot.rect, width: .2 }, maxLines: undefined, zIndex: 20, foregroundToken: "ink" as const }
        : slot.kind === "photo"
          ? { ...slot, zIndex: 10 }
          : { ...slot, zIndex: 20, foregroundToken: "ink" as const }),
    } as unknown as RecipeDefinition;
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
      theme: modernizeTheme(base),
      slots: base.slots.map(modernizeSlot),
    } as unknown as RecipeDefinition;
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
