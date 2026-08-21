import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRecipeApplication,
  deriveSpreadEvidence,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type RecipeDefinition,
} from "./recipe-contract";
import {
  CHROMATIC_RECIPE_IDS,
  chromaticRecipeDefinitions,
  chromaticRecipeTheme,
  getChromaticRecipeDefinition,
} from "./chromatic-recipe-definitions";
import { chromaticCrossFieldMaximumNote } from "./chromatic-recipe-matrix";
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

function recipe(id: string) {
  const definition = getChromaticRecipeDefinition(id, 1) as RecipeDefinition | null;
  expect(definition).not.toBeNull();
  return definition!;
}

describe("Phase F3-B5 Chromatic formal Recipe Definitions", () => {
  it("validates three exact draft identities with the approved Chromatic P2 palette", () => {
    expect(chromaticRecipeDefinitions).toHaveLength(3);
    expect(chromaticRecipeDefinitions.every((definition) => validateRecipeDefinition(definition).valid)).toBe(true);
    expect(chromaticRecipeDefinitions.every((definition) => (
      definition.schemaVersion === 1
      && definition.version === 1
      && definition.familyId === "chromatic"
      && definition.status === "draft"
      && definition.capabilities.allowsEmptyDraft === false
      && definition.theme === chromaticRecipeTheme
      && definition.slots.filter((slot) => slot.kind === "photo").every((slot) => slot.fit === "cover")
      && !Object.hasOwn(definition, "legacy")
      && !Object.hasOwn(definition, "legacyStyleId")
    ))).toBe(true);
    expect(chromaticRecipeTheme).toEqual({
      background: "#F4F0E8",
      foreground: "#17191C",
      muted: "#55585D",
      photoBackground: "#D7D3CA",
      colorTokens: {
        paper: "#F4F0E8",
        ink: "#17191C",
        "muted-ink": "#55585D",
        "photo-mat": "#D7D3CA",
        "accent-1": "#164B8C",
        "accent-2": "#A83D2B",
        "accent-3": "#D49A18",
        "inverse-ink": "#FFFFFF",
      },
      typographyPreset: "photoessay-field",
    });
  });

  it("matches Entry Field exact threshold/photo geometry without text or Note", () => {
    const definition = recipe(CHROMATIC_RECIPE_IDS.entryField);
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" } },
      canvas: { pageRatio: "3:4", safeArea: { x: .05, y: .05, width: .90, height: .90 } },
      noteRelations: [],
      slots: [
        { id: "entry-field", kind: "color-field", rect: { x: .05, y: .06, width: .90, height: .18 }, pageSide: "left", required: true, zIndex: 0, fillToken: "accent-1" },
        { id: "entry-photo", kind: "photo", rect: { x: .05, y: .30, width: .90, height: .62 }, pageSide: "left", required: true, zIndex: 10, fit: "cover", allowBleed: false, allowGutterCrossing: false },
      ],
    });
    expect(definition.slots.some((slot) => slot.kind === "note" || slot.kind === "static-text")).toBe(false);
    expect(definition.slots[1]!.rect.y - (definition.slots[0]!.rect.y + definition.slots[0]!.rect.height)).toBeCloseTo(.06);
    expect(definition.slots[0]!.rect.width * definition.slots[0]!.rect.height).toBeCloseTo(.162);
    expect(definition.slots[1]!.rect.width * definition.slots[1]!.rect.height).toBeCloseTo(.558);
  });

  it("locks Four Beat to final option A: one LTR row, physical 9:16, A1-A2-A3-A1, and 01-04", () => {
    const definition = recipe(CHROMATIC_RECIPE_IDS.fourBeat);
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 4, max: 4 }, notes: { mode: "none" } },
      canvas: { pageRatio: "3:4", safeArea: { x: .05, y: .05, width: .90, height: .90 } },
      noteRelations: [],
    });
    const photos = definition.slots.filter((slot) => slot.kind === "photo");
    const fields = definition.slots.filter((slot) => slot.kind === "color-field");
    const indexes = definition.slots.filter((slot) => slot.kind === "static-text");
    expect(photos.map((slot) => slot.rect)).toEqual([.05, .28, .51, .74].map((x) => ({ x, y: .22, width: .21, height: .28 })));
    expect(photos.every((slot) => (slot.rect.width * 3) / (slot.rect.height * 4) === .5625)).toBe(true);
    expect(fields.map((slot) => ({ rect: slot.rect, fillToken: slot.fillToken }))).toEqual([
      { rect: { x: .05, y: .56, width: .21, height: .16 }, fillToken: "accent-1" },
      { rect: { x: .28, y: .56, width: .21, height: .16 }, fillToken: "accent-2" },
      { rect: { x: .51, y: .56, width: .21, height: .16 }, fillToken: "accent-3" },
      { rect: { x: .74, y: .56, width: .21, height: .16 }, fillToken: "accent-1" },
    ]);
    expect(indexes.map((slot) => slot.text)).toEqual(["01", "02", "03", "04"]);
    expect(indexes.map((slot) => slot.foregroundToken)).toEqual(["inverse-ink", "inverse-ink", "ink", "inverse-ink"]);
    expect(new Set(photos.map((slot) => slot.rect.y))).toEqual(new Set([.22]));
    expect(definition.slots.some((slot) => slot.kind === "note")).toBe(false);
  });

  it("matches Cross-field source/destination geometry and derives only the required Photo-Note pair", () => {
    const definition = recipe(CHROMATIC_RECIPE_IDS.crossFieldNote);
    expect(definition).toMatchObject({
      scope: "spread",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "required", maxCharacters: 90, maxLines: 4 } },
      canvas: {
        pageRatio: "3:4",
        safeArea: { x: .05, y: .05, width: 1.90, height: .90 },
        gutter: { start: .98, end: 1.02 },
      },
      noteRelations: [{ photoSlotId: "source-photo", noteSlotId: "field-note", kind: "cross-page-pair" }],
    });
    expect(definition.slots).toEqual([
      expect.objectContaining({ id: "source-field", kind: "color-field", rect: { x: .06, y: .82, width: .82, height: .12 }, pageSide: "left", zIndex: 0, fillToken: "accent-3" }),
      expect.objectContaining({ id: "note-field", kind: "color-field", rect: { x: 1.08, y: .10, width: .84, height: .72 }, pageSide: "right", zIndex: 0, fillToken: "accent-1" }),
      expect.objectContaining({ id: "source-photo", kind: "photo", rect: { x: .06, y: .10, width: .82, height: .68 }, pageSide: "left", zIndex: 10, fit: "cover" }),
      expect.objectContaining({ id: "source-label", kind: "static-text", rect: { x: .10, y: .855, width: .34, height: .035 }, pageSide: "left", zIndex: 20, text: "IMAGE 01", foregroundToken: "ink" }),
      expect.objectContaining({ id: "note-label", kind: "static-text", rect: { x: 1.16, y: .16, width: .42, height: .04 }, pageSide: "right", zIndex: 20, text: "FIELD NOTE", foregroundToken: "inverse-ink" }),
      expect.objectContaining({ id: "field-note", kind: "note", rect: { x: 1.16, y: .26, width: .68, height: .38 }, pageSide: "right", required: true, zIndex: 20, maxLines: 4, foregroundToken: "inverse-ink" }),
    ]);
    expect(deriveSpreadEvidence(definition)).toEqual([{ kind: "cross-page-pair", photoSlotId: "source-photo", noteSlotId: "field-note" }]);
    const colorOnly = { ...definition, noteRelations: [] };
    expect(deriveSpreadEvidence(colorOnly)).toEqual([]);
    expect(validateRecipeDefinition(colorOnly).valid).toBe(false);
  });

  it("enforces exact counts, preserves hidden Notes, and accepts 1-11 while rejecting only real Cross-field overflows", () => {
    const entry = recipe(CHROMATIC_RECIPE_IDS.entryField);
    const four = recipe(CHROMATIC_RECIPE_IDS.fourBeat);
    const cross = recipe(CHROMATIC_RECIPE_IDS.crossFieldNote);
    expect(evaluateRecipeCompatibility(entry, { photoIds: [], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(entry, { photoIds: ["one"], notesByPhotoId: {} })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(four, { photoIds: ["1", "2", "3"], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(four, { photoIds: ["1", "2", "3", "4"], notesByPhotoId: {} })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: { one: "A" } })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: { one: "Field note12" } })).toMatchObject({ code: "compatible", valid: true });
    expect(chromaticCrossFieldMaximumNote).toHaveLength(90);
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: { one: chromaticCrossFieldMaximumNote } })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: { one: `${chromaticCrossFieldMaximumNote}x` } })).toMatchObject({ code: "note-too-long", valid: false });
    expect(evaluateRecipeCompatibility(cross, { photoIds: ["one"], notesByPhotoId: { one: "one\ntwo\nthree\nfour\nfive" } })).toMatchObject({ code: "note-too-many-lines", valid: false });

    const hidden = createRecipeApplication({
      recipe: entry,
      content: { photoIds: ["one"], contentItemIds: ["one-content"], notesByPhotoId: { one: "Retained" } },
      anchorPageId: "page",
    });
    expect(hidden.hiddenNotePhotoIds).toEqual(["one"]);
  });

  it("keeps every actual text/surface pair above 4.5:1 and all z-index bands fixed", () => {
    const tokens = chromaticRecipeTheme.colorTokens!;
    const ratios = [
      contrast(tokens["inverse-ink"]!, tokens["accent-1"]!),
      contrast(tokens["inverse-ink"]!, tokens["accent-2"]!),
      contrast(tokens.ink!, tokens["accent-3"]!),
    ];
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    for (const definition of chromaticRecipeDefinitions) {
      expect(definition.slots.filter((slot) => slot.kind === "color-field").every((slot) => slot.zIndex >= 0 && slot.zIndex <= 9)).toBe(true);
      expect(definition.slots.filter((slot) => slot.kind === "photo").every((slot) => slot.zIndex >= 10 && slot.zIndex <= 19)).toBe(true);
      expect(definition.slots.filter((slot) => slot.kind === "note" || slot.kind === "static-text").every((slot) => slot.zIndex >= 20 && slot.zIndex <= 29)).toBe(true);
    }
  });

  it("registers exact active Catalog refs without changing Definition migration fields", () => {
    expect(formalRecipeDefinitions).toHaveLength(15);
    expect(runtimeRecipeDefinitions).toHaveLength(21);
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries()).toHaveLength(21);
    const formalIds = new Set<string>(chromaticRecipeDefinitions.map((definition) => definition.id));
    expect(getActiveRecipeCatalogEntries().filter((entry) => formalIds.has(entry.recipe.id))).toHaveLength(3);
    for (const definition of chromaticRecipeDefinitions) {
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 2 })).toBeNull();
      expect(getChromaticRecipeDefinition(definition.id, 2)).toBeNull();
      expect(resolveDevelopmentRecipe({ id: definition.id, version: 1 })).toMatchObject({
        entry: { familyId: "chromatic", status: "active" },
        definition,
        validation: { valid: true },
      });
      expect(definition.status).toBe("draft");
      expect(getActiveRecipeDefinition({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRecipeCatalogEntry({ id: definition.id, version: 1 })?.status).toBe("active");
    }
    expect(getRecipeCatalogEntry({ id: CHROMATIC_RECIPE_IDS.entryField, version: 1 })?.authoring).toMatchObject({
      slotTopology: "single",
      compositionAxis: "vertical",
      readingDirection: "top-down",
      colorStrategy: "single-accent",
    });
    expect(getRecipeCatalogEntry({ id: CHROMATIC_RECIPE_IDS.fourBeat, version: 1 })?.authoring).toMatchObject({
      ratios: { preferred: ["portrait"], risky: ["landscape", "ultra-wide"] },
      slotTopology: "band",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "rhythmic",
    });
    expect(getRecipeCatalogEntry({ id: CHROMATIC_RECIPE_IDS.crossFieldNote, version: 1 })?.authoring).toMatchObject({
      slotTopology: "cross-page-pair",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "zoned",
    });
  });

  it("contains no Chromatic recipe or slot branch and no arbitrary styling data", () => {
    const sources = [
      "features/zine/components/recipe-renderer.tsx",
      "features/zine/components/recipe-renderer-plan.ts",
      "features/zine/components/recipe-renderer.module.css",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));
    const forbiddenBranch = /chromatic-(?:entry|four|cross)|entry-field|entry-photo|beat-photo|beat-field|field-note|source-field|note-field/u;
    expect(sources.every((source) => !forbiddenBranch.test(source))).toBe(true);
    expect(JSON.stringify(chromaticRecipeDefinitions)).not.toMatch(/className|gradient|opacity|filter|blendMode|componentName/u);
  });
});

function contrast(foreground: string, background: string) {
  const luminance = (hex: string) => {
    const channels = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16) / 255);
    const [red, green, blue] = channels.map((channel) => (
      channel <= .03928 ? channel / 12.92 : ((channel + .055) / 1.055) ** 2.4
    ));
    return .2126 * red! + .7152 * green! + .0722 * blue!;
  };
  const first = luminance(foreground);
  const second = luminance(background);
  return (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
}
