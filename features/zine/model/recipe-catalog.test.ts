import { describe, expect, it } from "vitest";
import {
  adaptRecipeSlot,
  baseRecipeDefinitions,
  DEFAULT_RECIPE_TYPOGRAPHY,
  deriveSpreadEvidence,
  evaluateRecipeCompatibility,
  getRecipeForStyle,
  getLegacyStyleId,
  phaseDRecipeDefinitions,
  type RecipeDefinition,
  validateLegacyRecipeRegistry,
} from "./recipe-contract";
import {
  deriveRecipeFacts,
  getActiveRecipeCatalogEntries,
  getActiveRecipeDefinition,
  getDevelopmentRecipeCatalogEntries,
  getRecipeCatalogEntry,
  resolveActiveRecipe,
  resolveDevelopmentRecipe,
  recipeCatalogEntries,
  validateRecipeCatalog,
  validateRecipeCatalogEntry,
} from "./recipe-catalog";
import { resolveLegacyRecipe } from "./recipe-contract";
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";

describe("Recipe Catalog v1.1", () => {
  it("keeps Catalog entries independently valid and keeps Reference Recipes draft", () => {
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries().every((entry) => entry.status === "active")).toBe(true);
    expect(getDevelopmentRecipeCatalogEntries().some((entry) => entry.status === "draft")).toBe(true);
    expect(getDevelopmentRecipeCatalogEntries()
      .filter((entry) => entry.recipe.id.startsWith("reference-"))
      .every((entry) => entry.status === "draft")).toBe(true);
  });

  it("resolves Definitions by the exact Catalog id and version", () => {
    const entry = getRecipeCatalogEntry({ id: "recipe-editorial-v1", version: 1 });
    expect(entry).not.toBeNull();
    if (!entry) return;
    expect(getActiveRecipeDefinition(entry.recipe)?.id).toBe("recipe-editorial-v1");
    expect(getRecipeCatalogEntry({ id: entry.recipe.id, version: entry.recipe.version + 1 })).toBeNull();
  });

  it("keeps same-ID versions exact regardless of Catalog array order", () => {
    const source = recipeCatalogEntries[0];
    const sourceDefinition = baseRecipeDefinitions[0];
    expect(source).toBeDefined();
    expect(sourceDefinition).toBeDefined();
    if (!source || !sourceDefinition) return;
    const modernize = (version: number) => ({
      ...sourceDefinition,
      id: "recipe-versioned",
      version,
      theme: { ...sourceDefinition.theme!, typography: DEFAULT_RECIPE_TYPOGRAPHY },
      slots: sourceDefinition.slots.map((slot) => slot.kind === "photo"
        ? { ...slot, zIndex: 10 }
        : { ...adaptRecipeSlot(slot), zIndex: 20, foregroundToken: "ink" as const }),
    }) as unknown as RecipeDefinition;
    const definitionV1 = modernize(1);
    const definitionV2 = modernize(2);
    const entryV1 = { ...source, recipe: { id: "recipe-versioned", version: 1 } };
    const entryV2 = { ...source, recipe: { id: "recipe-versioned", version: 2 } };
    const definitions = [definitionV1, definitionV2] satisfies readonly RecipeDefinition[];

    expect(getRecipeCatalogEntry(entryV2.recipe, [entryV2, entryV1])).toBe(entryV2);
    expect(getRecipeCatalogEntry(entryV1.recipe, [entryV2, entryV1])).toBe(entryV1);
    expect(resolveActiveRecipe(entryV2.recipe, [entryV2, entryV1], definitions)?.definition.version).toBe(2);
    expect(resolveActiveRecipe(entryV1.recipe, [entryV1, entryV2], definitions)?.definition.version).toBe(1);
  });

  it("keeps draft, deprecated, invalid, unknown-version, and missing Definitions out of production", () => {
    const source = recipeCatalogEntries[0];
    const definition = baseRecipeDefinitions[0];
    expect(source).toBeDefined();
    expect(definition).toBeDefined();
    if (!source || !definition) return;
    const refs = [
      { entry: { ...source, status: "draft" as const }, ref: source.recipe },
      { entry: { ...source, status: "deprecated" as const }, ref: source.recipe },
      { entry: { ...source, recipe: { ...source.recipe, version: 2 } }, ref: { ...source.recipe, version: 2 } },
      { entry: { ...source, recipe: { id: "missing-recipe", version: 1 } }, ref: { id: "missing-recipe", version: 1 } },
    ];
    for (const { entry, ref } of refs) {
      expect(resolveActiveRecipe(ref, [entry], [definition])).toBeNull();
    }
    const invalidDefinition = {
      ...definition,
      slots: definition.slots.map((slot) => slot.kind === "photo" ? { ...slot, fit: undefined } : slot),
    } satisfies RecipeDefinition;
    expect(resolveActiveRecipe(source.recipe, [source], [invalidDefinition])).toBeNull();
    expect(resolveDevelopmentRecipe(source.recipe, [
      { ...source, status: "draft" as const },
    ], [definition]).entry?.status).toBe("draft");
  });

  it("derives runtime facts without duplicating them into Catalog declarations", () => {
    const entry = getRecipeCatalogEntry({ id: "recipe-reference-cross-gutter-v1", version: 1 });
    expect(entry).not.toBeNull();
    if (!entry) return;
    const recipe = resolveActiveRecipe(entry.recipe)?.definition;
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const facts = deriveRecipeFacts(recipe);
    expect(facts).toMatchObject({
      scope: "spread",
      photoCountRange: { min: 1, max: 2, slots: 1 },
      bleedPattern: "cross-gutter",
      noteModeAndRelations: { mode: "none", relations: [] },
    });
    expect(entry).not.toHaveProperty("scope");
    expect(entry).not.toHaveProperty("density");
    expect(entry).not.toHaveProperty("noteModeAndRelations");
  });

  it("rejects missing or mismatched Definition references and invalid active Definitions", () => {
    const entry = recipeCatalogEntries[0];
    expect(entry).toBeDefined();
    if (!entry) return;
    expect(validateRecipeCatalogEntry({
      ...entry,
      recipe: { id: "missing-recipe", version: 1 },
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "definition-missing" }),
    ]));
    expect(validateRecipeCatalogEntry({
      ...entry,
      recipe: { id: entry.recipe.id, version: 2 },
    }).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "definition-version" }),
    ]));

    const invalidDefinition = {
      ...baseRecipeDefinitions[0],
      slots: baseRecipeDefinitions[0]!.slots.map((slot) => slot.kind === "photo"
        ? { ...slot, fit: undefined }
        : slot),
    } satisfies RecipeDefinition;
    expect(validateRecipeCatalogEntry(entry, [invalidDefinition]).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "definition-invalid" }),
    ]));
  });

  it("rejects invalid enum, preview scenario, and authoring contradictions", () => {
    const base = getRecipeCatalogEntry({ id: "recipe-contact-v1", version: 1 });
    expect(base).not.toBeNull();
    if (!base) return;

    const invalid = {
      ...base,
      authoring: {
        ...base.authoring,
        slotTopology: "single",
        ratios: { preferred: ["not-a-ratio"], risky: [] },
      },
      previewScenarioIds: [...base.previewScenarioIds, "not-a-scenario"],
    } as unknown as typeof base;
    const result = validateRecipeCatalogEntry(invalid);
    expect(result.issues).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "enum" }),
      expect.objectContaining({ code: "preview-scenario" }),
      expect.objectContaining({ code: "contradiction" }),
    ]));
  });

  it("requires cross-gutter topology to be backed by cross-gutter photo evidence", () => {
    const base = getRecipeCatalogEntry({ id: "recipe-editorial-v1", version: 1 });
    expect(base).not.toBeNull();
    if (!base) return;
    const invalid = {
      ...base,
      authoring: { ...base.authoring, slotTopology: "cross-gutter", gutterRisk: "high" },
    } as typeof base;
    expect(validateRecipeCatalogEntry(invalid).issues).toEqual(expect.arrayContaining([
      expect.objectContaining({
        code: "contradiction",
        message: "cross-gutter topology requires cross-gutter-photo evidence.",
      }),
    ]));
  });

  it("does not let Catalog metadata change Compatibility or Renderer Plan", () => {
    const entry = getRecipeCatalogEntry({ id: "recipe-editorial-v1", version: 1 });
    expect(entry).not.toBeNull();
    if (!entry) return;
    const recipe = getActiveRecipeDefinition(entry.recipe);
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const content = { photoIds: ["photo-1"], notesByPhotoId: { "photo-1": "A note." } };
    const compatibilityBefore = evaluateRecipeCompatibility(recipe, content);
    const planBefore = createRecipeRenderPlan({
      recipe,
      application: {
        recipeId: recipe.id,
        recipeVersion: recipe.version,
        scope: recipe.scope,
        anchorPageId: "page-1",
        targetPageIds: ["page-1"],
        assignments: [],
        unplacedPhotoIds: [],
        hiddenNotePhotoIds: [],
      },
      photos: [],
      environment: { pageId: "page-1", pageSide: "left", mode: "reader", pageNumber: 1, title: "Test", locale: "en" },
    });
    const changedEntry = {
      ...entry,
      authoring: { ...entry.authoring, pace: "fast" as const },
    };
    expect(validateRecipeCatalogEntry(changedEntry).derivedFacts).toEqual(deriveRecipeFacts(recipe));
    expect(evaluateRecipeCompatibility(recipe, content)).toEqual(compatibilityBefore);
    expect(createRecipeRenderPlan({
      recipe,
      application: {
        recipeId: recipe.id,
        recipeVersion: recipe.version,
        scope: recipe.scope,
        anchorPageId: "page-1",
        targetPageIds: ["page-1"],
        assignments: [],
        unplacedPhotoIds: [],
        hiddenNotePhotoIds: [],
      },
      photos: [],
      environment: { pageId: "page-1", pageSide: "left", mode: "reader", pageNumber: 1, title: "Test", locale: "en" },
    })).toEqual(planBefore);
  });

  it("keeps one diagnosable Legacy registry and the old Style query entry point", () => {
    expect(validateLegacyRecipeRegistry()).toEqual([]);
    expect(getRecipeForStyle("editorial")?.id).toBe("recipe-editorial-v1");
    expect(getRecipeForStyle("unknown-style" as never)).toBeNull();
    expect(getRecipeForStyle("editorial", [], baseRecipeDefinitions)).toBeNull();
    expect(resolveLegacyRecipe("unknown-style")).toMatchObject({
      status: "unknown",
      message: "No Recipe mapping exists for legacy style 'unknown-style'.",
    });
    expect(phaseDRecipeDefinitions[0]).not.toHaveProperty("legacyStyleId");
    expect(baseRecipeDefinitions.every((recipe) => !recipe.legacy && !recipe.legacyStyleId)).toBe(true);
    const conflictingLegacyInput = {
      ...baseRecipeDefinitions[0],
      legacy: { styleId: "contact" as const },
      legacyStyleId: "contact" as const,
    };
    expect(getLegacyStyleId(conflictingLegacyInput)).toBe("editorial");
    expect(validateLegacyRecipeRegistry([
      { styleId: "editorial", recipe: { id: "recipe-editorial-v1", version: 1 } },
      { styleId: "editorial", recipe: { id: "recipe-contact-v1", version: 1 } },
    ])).toEqual(expect.arrayContaining([
      "Legacy style 'editorial' maps to multiple active Recipe targets.",
    ]));
    expect(validateLegacyRecipeRegistry([
      { styleId: "editorial", recipe: { id: "missing-recipe", version: 1 } },
    ])).toEqual(expect.arrayContaining([
      "Legacy style 'editorial' points to missing Recipe missing-recipe@1.",
    ]));
    expect(phaseDRecipeDefinitions.every((recipe) => deriveSpreadEvidence(recipe).length > 0)).toBe(true);
  });
});
