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
  DYNAMIC_RECIPE_IDS,
  dynamicRecipeDefinitions,
  dynamicRecipeTheme,
  getDynamicRecipeDefinition,
} from "./dynamic-recipe-definitions";
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
  const definition = getDynamicRecipeDefinition(id, 1) as RecipeDefinition | null;
  expect(definition).not.toBeNull();
  return definition!;
}

function content(photoIds: readonly string[]) {
  return {
    photoIds,
    contentItemIds: photoIds.map((id) => `${id}-content`),
    notesByPhotoId: {},
  };
}

describe("Phase F3-B4 Dynamic formal Recipe Definitions", () => {
  it("validates three exact draft identities with the approved neutral P2 theme", () => {
    expect(dynamicRecipeDefinitions).toHaveLength(3);
    expect(dynamicRecipeDefinitions.every((definition) => validateRecipeDefinition(definition).valid)).toBe(true);
    expect(dynamicRecipeDefinitions.every((definition) => (
      definition.schemaVersion === 1
      && definition.version === 1
      && definition.familyId === "dynamic"
      && definition.status === "draft"
      && definition.capabilities.allowsEmptyDraft === false
      && definition.capabilities.notes.mode === "none"
      && definition.theme === dynamicRecipeTheme
      && definition.slots.every((slot) => slot.kind === "photo" && slot.fit === "cover")
      && !Object.hasOwn(definition, "legacy")
      && !Object.hasOwn(definition, "legacyStyleId")
    ))).toBe(true);
    expect(dynamicRecipeTheme).toEqual({
      background: "#F4F0E8",
      foreground: "#17191C",
      muted: "#55585D",
      photoBackground: "#D7D3CA",
      typographyPreset: "photoessay-field",
    });
  });

  it("matches Edge Thrust exact geometry and only one controlled bleed edge", () => {
    const definition = recipe(DYNAMIC_RECIPE_IDS.edgeThrust);
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" } },
      canvas: { pageRatio: "3:4", safeArea: { x: .04, y: .05, width: .92, height: .90 } },
      noteRelations: [],
      slots: [{
        id: "thrust-photo",
        kind: "photo",
        rect: { x: 0, y: .07, width: .92, height: .86 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: false,
      }],
    });
    const slot = definition.slots[0]!;
    expect(slot.rect.width * slot.rect.height).toBeCloseTo(.7912);
    expect(slot.rect.x).toBe(0);
    expect(slot.rect.x + slot.rect.width).toBe(.92);
    expect(slot.rect.y).toBeGreaterThan(0);
    expect(slot.rect.y + slot.rect.height).toBeLessThan(1);
  });

  it("matches Drop Sequence ordered exact-3 geometry, fixed gap, and 1:4.86 jump", () => {
    const definition = recipe(DYNAMIC_RECIPE_IDS.dropSequence);
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 3, max: 3 }, notes: { mode: "none" } },
      canvas: { pageRatio: "3:4", safeArea: { x: .05, y: .05, width: .90, height: .90 } },
      noteRelations: [],
    });
    expect(definition.slots).toEqual([
      expect.objectContaining({ id: "phase-01", kind: "photo", rect: { x: .05, y: .06, width: .40, height: .25 }, pageSide: "left", required: true, zIndex: 10, allowBleed: false, allowGutterCrossing: false }),
      expect.objectContaining({ id: "phase-02", kind: "photo", rect: { x: .55, y: .06, width: .40, height: .25 }, pageSide: "left", required: true, zIndex: 10, allowBleed: false, allowGutterCrossing: false }),
      expect.objectContaining({ id: "impact-photo", kind: "photo", rect: { x: .05, y: .41, width: .90, height: .54 }, pageSide: "left", required: true, zIndex: 10, allowBleed: false, allowGutterCrossing: false }),
    ]);
    const [phaseOne, phaseTwo, impact] = definition.slots;
    expect(phaseOne.rect.width * phaseOne.rect.height).toBeCloseTo(.10);
    expect(phaseTwo.rect.width * phaseTwo.rect.height).toBeCloseTo(.10);
    expect(impact.rect.width * impact.rect.height).toBeCloseTo(.486);
    expect((impact.rect.width * impact.rect.height) / (phaseOne.rect.width * phaseOne.rect.height)).toBeCloseTo(4.86);
    expect(impact.rect.y - (phaseOne.rect.y + phaseOne.rect.height)).toBeCloseTo(.10);
  });

  it("matches Gutter Sweep full spread geometry and derives only cross-gutter-photo evidence", () => {
    const definition = recipe(DYNAMIC_RECIPE_IDS.gutterSweep);
    expect(definition).toMatchObject({
      scope: "spread",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" } },
      canvas: {
        pageRatio: "3:4",
        safeArea: { x: .04, y: .05, width: 1.92, height: .90 },
        gutter: { start: .94, end: 1.06 },
      },
      noteRelations: [],
      slots: [{
        id: "sweep-photo",
        kind: "photo",
        rect: { x: 0, y: .08, width: 2, height: .84 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: true,
        allowGutterCrossing: true,
      }],
    });
    expect(definition.slots[0]!.rect.width * definition.slots[0]!.rect.height / 2).toBeCloseTo(.84);
    expect(deriveSpreadEvidence(definition)).toEqual([{ kind: "cross-gutter-photo", photoSlotId: "sweep-photo" }]);
  });

  it("keeps exact-count Compatibility and excess photographs unplaced", () => {
    const cases = [
      [recipe(DYNAMIC_RECIPE_IDS.edgeThrust), 1],
      [recipe(DYNAMIC_RECIPE_IDS.dropSequence), 3],
      [recipe(DYNAMIC_RECIPE_IDS.gutterSweep), 1],
    ] as const;
    for (const [definition, exact] of cases) {
      const exactIds = Array.from({ length: exact }, (_, index) => `photo-${index + 1}`);
      const overIds = [...exactIds, "photo-extra"];
      expect(evaluateRecipeCompatibility(definition, content([]))).toMatchObject({ code: "needs-content", valid: false });
      expect(evaluateRecipeCompatibility(definition, content(exactIds))).toMatchObject({ code: "compatible", valid: true });
      expect(evaluateRecipeCompatibility(definition, content(overIds))).toMatchObject({ code: "too-much-content", valid: false });
      expect(createRecipeApplication({ recipe: definition, content: content(overIds), anchorPageId: "page" }).unplacedPhotoIds).toEqual(["photo-extra"]);
    }
  });

  it("registers exact active Catalog refs without changing Definition migration fields", () => {
    expect(formalRecipeDefinitions).toHaveLength(15);
    expect(runtimeRecipeDefinitions).toHaveLength(21);
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries()).toHaveLength(21);
    const formalIds = new Set<string>(dynamicRecipeDefinitions.map((definition) => definition.id));
    expect(getActiveRecipeCatalogEntries().filter((entry) => formalIds.has(entry.recipe.id))).toHaveLength(3);
    for (const definition of dynamicRecipeDefinitions) {
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 2 })).toBeNull();
      expect(getDynamicRecipeDefinition(definition.id, 2)).toBeNull();
      expect(resolveDevelopmentRecipe({ id: definition.id, version: 1 })).toMatchObject({
        entry: { familyId: "dynamic", status: "active" },
        definition,
        validation: { valid: true },
      });
      expect(definition.status).toBe("draft");
      expect(getActiveRecipeDefinition({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRecipeCatalogEntry({ id: definition.id, version: 1 })?.status).toBe("active");
    }
    expect(getRecipeCatalogEntry({ id: DYNAMIC_RECIPE_IDS.edgeThrust, version: 1 })?.authoring).toMatchObject({
      slotTopology: "single",
      compositionAxis: "edge",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "fast",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    });
    expect(getRecipeCatalogEntry({ id: DYNAMIC_RECIPE_IDS.dropSequence, version: 1 })?.authoring.slotTopology).toBe("mosaic");
    expect(getRecipeCatalogEntry({ id: DYNAMIC_RECIPE_IDS.gutterSweep, version: 1 })?.authoring).toMatchObject({
      slotTopology: "cross-gutter",
      compositionAxis: "horizontal",
      gutterRisk: "high",
    });
  });

  it("contains no Dynamic recipe or slot branch in shared Renderer, Render Plan, or CSS", () => {
    const sources = [
      "features/zine/components/recipe-renderer.tsx",
      "features/zine/components/recipe-renderer-plan.ts",
      "features/zine/components/recipe-renderer.module.css",
    ].map((file) => readFileSync(join(process.cwd(), file), "utf8"));
    const forbidden = /dynamic-(?:edge|drop|gutter)|thrust-photo|phase-01|phase-02|impact-photo|sweep-photo/u;
    expect(sources.every((source) => !forbidden.test(source))).toBe(true);
  });
});
