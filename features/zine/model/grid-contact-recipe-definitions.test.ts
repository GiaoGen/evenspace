import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createRecipeApplication,
  deriveSpreadEvidence,
  estimateRecipeNoteLines,
  evaluateRecipeCompatibility,
  resolveRecipeTextSurface,
  validateRecipeDefinition,
  type RecipeDefinition,
} from "./recipe-contract";
import {
  GRID_CONTACT_RECIPE_IDS,
  getGridContactRecipeDefinition,
  gridContactRecipeDefinitions,
  gridContactRecipeTheme,
} from "./grid-contact-recipe-definitions";
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
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";
import {
  crossRegisterCjk18,
  crossRegisterLatin18,
  crossRegisterLongWord18,
  crossRegisterNumeric18,
} from "./grid-contact-recipe-matrix";
import type { ZinePhoto } from "./zine-draft";

function recipe(id: string) {
  const definition = getGridContactRecipeDefinition(id, 1) as RecipeDefinition | null;
  expect(definition).not.toBeNull();
  return definition!;
}

function photo(id: string, caption = ""): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `preview:${id}`,
    fileName: `${id}.jpg`,
    width: 1200,
    height: 1200,
    caption,
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

function content(photoIds: readonly string[], notesByPhotoId: Readonly<Record<string, string>> = {}) {
  return { photoIds, contentItemIds: photoIds.map((id) => `${id}-content`), notesByPhotoId };
}

function containsRect(
  outer: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
  inner: { readonly x: number; readonly y: number; readonly width: number; readonly height: number },
) {
  return inner.x >= outer.x
    && inner.y >= outer.y
    && inner.x + inner.width <= outer.x + outer.width
    && inner.y + inner.height <= outer.y + outer.height;
}

describe("Phase F3-B3 Grid/Contact formal Recipe Definitions", () => {
  it("validates three exact draft identities with one shared neutral Theme and no legacy mapping", () => {
    expect(gridContactRecipeDefinitions).toHaveLength(3);
    expect(gridContactRecipeDefinitions.every((definition) => validateRecipeDefinition(definition).valid)).toBe(true);
    expect(gridContactRecipeDefinitions.every((definition) => (
      definition.schemaVersion === 1
      && definition.version === 1
      && definition.familyId === "grid-contact"
      && definition.status === "draft"
      && definition.canvas.pageRatio === "3:4"
      && definition.theme === gridContactRecipeTheme
      && !Object.hasOwn(definition, "legacy")
      && !Object.hasOwn(definition, "legacyStyleId")
      && definition.slots.filter((slot) => slot.kind === "photo").every((slot) => (
        slot.fit === "cover" && slot.allowBleed === false && slot.allowGutterCrossing === false
      ))
    ))).toBe(true);
    expect(gridContactRecipeTheme).toEqual({
      background: "#F4F0E8",
      foreground: "#17191C",
      muted: "#55585D",
      photoBackground: "#D7D3CA",
      typographyPreset: "photoessay-register",
    });
  });

  it("matches Twin Register exact-2 equal geometry and literal A/B sources", () => {
    const definition = recipe(GRID_CONTACT_RECIPE_IDS.twinRegister);
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 2, max: 2 }, notes: { mode: "none" }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .07, y: .06, width: .86, height: .88 } },
      noteRelations: [],
    });
    expect(definition.slots).toEqual([
      expect.objectContaining({ id: "sample-a", kind: "photo", rect: { x: .07, y: .10, width: .86, height: .34 }, pageSide: "left", required: true, zIndex: 10 }),
      expect.objectContaining({ id: "sample-b", kind: "photo", rect: { x: .07, y: .56, width: .86, height: .34 }, pageSide: "left", required: true, zIndex: 10 }),
      expect.objectContaining({ id: "index-a", kind: "static-text", rect: { x: .07, y: .06, width: .10, height: .025 }, text: "A", textSource: "literal", role: "index", align: "start", foregroundToken: "muted-ink", zIndex: 20 }),
      expect.objectContaining({ id: "index-b", kind: "static-text", rect: { x: .07, y: .515, width: .10, height: .025 }, text: "B", textSource: "literal", role: "index", align: "start", foregroundToken: "muted-ink", zIndex: 20 }),
    ]);
    const photos = definition.slots.filter((slot) => slot.kind === "photo");
    expect(photos.map((slot) => slot.rect.width * slot.rect.height)).toEqual([.2924, .2924]);
    expect(definition.slots.some((slot) => slot.kind === "note" || (slot.kind === "static-text" && slot.role === "title"))).toBe(false);
  });

  it("matches Twelve-up exact-12 row-major 3×4 geometry, deliberate six-plus-six gap, and folio", () => {
    const definition = recipe(GRID_CONTACT_RECIPE_IDS.twelveUpLedger);
    const photoSlots = definition.slots.filter((slot) => slot.kind === "photo");
    expect(definition).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 12, max: 12 }, notes: { mode: "none" }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .055, y: .06, width: .89, height: .88 } },
    });
    expect(photoSlots.map(({ id, rect }) => ({ id, rect }))).toEqual([
      ["frame-01", .055, .10], ["frame-02", .365, .10], ["frame-03", .675, .10],
      ["frame-04", .055, .305], ["frame-05", .365, .305], ["frame-06", .675, .305],
      ["frame-07", .055, .555], ["frame-08", .365, .555], ["frame-09", .675, .555],
      ["frame-10", .055, .76], ["frame-11", .365, .76], ["frame-12", .675, .76],
    ].map(([id, x, y]) => ({ id, rect: { x, y, width: .27, height: .17 } })));
    expect(.555 - (.305 + .17)).toBeCloseTo(.08);
    expect(.305 - (.10 + .17)).toBeCloseTo(.035);
    expect(.76 - (.555 + .17)).toBeCloseTo(.035);
    expect(photoSlots.every((slot) => slot.required && slot.pageSide === "left" && slot.zIndex === 10)).toBe(true);
    expect(photoSlots[0]!.rect.width * photoSlots[0]!.rect.height).toBeCloseTo(.0459);
    expect(definition.slots.find((slot) => slot.id === "folio")).toMatchObject({
      kind: "static-text",
      rect: { x: .82, y: .065, width: .125, height: .02 },
      textSource: "page-number",
      role: "folio",
      align: "end",
      pageSide: "left",
      foregroundToken: "muted-ink",
      zIndex: 20,
    });
    expect(definition.slots.filter((slot) => slot.kind === "static-text")).toHaveLength(1);
  });

  it("matches Cross Register exact-4 atomic spread, four relations, and approved D01 folios", () => {
    const definition = recipe(GRID_CONTACT_RECIPE_IDS.crossRegister);
    expect(definition).toMatchObject({
      scope: "spread",
      capabilities: { photos: { min: 4, max: 4 }, notes: { mode: "required", maxCharacters: 18, maxLines: 1 }, allowsEmptyDraft: false },
      canvas: {
        safeArea: { x: .06, y: .07, width: 1.88, height: .86 },
        gutter: { start: .98, end: 1.02 },
      },
    });
    expect(definition.slots.filter((slot) => slot.kind === "photo").map(({ id, rect }) => ({ id, rect }))).toEqual([
      { id: "record-01", rect: { x: .07, y: .12, width: .39, height: .32 } },
      { id: "record-02", rect: { x: .54, y: .12, width: .39, height: .32 } },
      { id: "record-03", rect: { x: .07, y: .56, width: .39, height: .32 } },
      { id: "record-04", rect: { x: .54, y: .56, width: .39, height: .32 } },
    ]);
    expect(definition.slots.find((slot) => slot.id === "index-notes")).toMatchObject({
      kind: "note",
      rect: { x: 1.16, y: .22, width: .68, height: .48 },
      pageSide: "right",
      required: true,
      repeatable: true,
      role: "index",
      align: "start",
      foregroundToken: "ink",
      maxLines: 1,
      zIndex: 20,
    });
    expect(definition.noteRelations).toEqual(["record-01", "record-02", "record-03", "record-04"].map((photoSlotId) => ({
      photoSlotId,
      noteSlotId: "index-notes",
      kind: "cross-page-pair",
    })));
    expect(deriveSpreadEvidence(definition)).toEqual(definition.noteRelations.map(({ photoSlotId, noteSlotId }) => ({
      kind: "cross-page-pair",
      photoSlotId,
      noteSlotId,
    })));
    expect(deriveSpreadEvidence(definition)).toHaveLength(4);
    expect(definition.slots.some((slot) => slot.kind === "color-field" || slot.pageSide === "cross-spread")).toBe(false);

    const safeArea = definition.canvas.safeArea;
    const left = definition.slots.find((slot) => slot.id === "folio-left")!;
    const right = definition.slots.find((slot) => slot.id === "folio-right")!;
    expect(left).toMatchObject({ kind: "static-text", rect: { x: .06, y: .905, width: .125, height: .02 }, pageSide: "left", textSource: "page-number", role: "folio", align: "start", required: false, foregroundToken: "muted-ink", zIndex: 20 });
    expect(right).toMatchObject({ kind: "static-text", rect: { x: 1.815, y: .905, width: .125, height: .02 }, pageSide: "right", textSource: "page-number", role: "folio", align: "end", required: false, foregroundToken: "muted-ink", zIndex: 20 });
    expect(containsRect(safeArea, left.rect)).toBe(true);
    expect(containsRect(safeArea, right.rect)).toBe(true);
    expect(left.rect.x + left.rect.width).toBeLessThan(definition.canvas.gutter!.start);
    expect(right.rect.x).toBeGreaterThan(definition.canvas.gutter!.end);
    expect(left.kind).toBe("static-text");
    expect(right.kind).toBe("static-text");
    if (left.kind === "static-text" && right.kind === "static-text") {
      expect(resolveRecipeTextSurface(definition, left).surfaceToken).toBe("paper");
      expect(resolveRecipeTextSurface(definition, right).surfaceToken).toBe("paper");
    }
  });

  it("keeps four required Note bindings stable and rejects missing, over-character, and over-line states", () => {
    const definition = recipe(GRID_CONTACT_RECIPE_IDS.crossRegister);
    const ids = ["one", "two", "three", "four"];
    const notes = Object.fromEntries(ids.map((id, index) => [id, `Index ${index + 1}`]));
    expect(evaluateRecipeCompatibility(definition, content(ids, notes))).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, content(ids, { ...notes, four: "" }))).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(definition, content(ids, { ...notes, one: "x".repeat(19) }))).toMatchObject({ code: "note-too-long", valid: false });
    expect(evaluateRecipeCompatibility(definition, content(ids, { ...notes, one: "one\ntwo" }))).toMatchObject({ code: "note-too-many-lines", valid: false });

    const application = createRecipeApplication({
      recipe: definition,
      content: content(ids, notes),
      anchorPageId: "left",
      targetPageIds: ["left", "right"],
    });
    expect(application.assignments.map(({ photoSlotId, photoId, noteSlotId, noteOfPhotoId }) => ({ photoSlotId, photoId, noteSlotId, noteOfPhotoId }))).toEqual(
      ids.map((photoId, index) => ({
        photoSlotId: `record-0${index + 1}`,
        photoId,
        noteSlotId: "index-notes",
        noteOfPhotoId: photoId,
      })),
    );
    expect(new Set(application.assignments.map((assignment) => assignment.noteOfPhotoId)).size).toBe(4);
  });

  it("uses the shared estimator for ordinary Latin, numeric, CJK/full-width, and long-word 18/1 fixtures", () => {
    const definition = recipe(GRID_CONTACT_RECIPE_IDS.crossRegister);
    const fixtures = [crossRegisterLatin18, crossRegisterNumeric18, crossRegisterCjk18, crossRegisterLongWord18];
    expect(fixtures.every((value) => Array.from(value).length === 18)).toBe(true);
    for (const value of fixtures) {
      expect(estimateRecipeNoteLines(definition, "record-01", value)).toBe(1);
      expect(evaluateRecipeCompatibility(definition, content(
        ["one", "two", "three", "four"],
        { one: value, two: value, three: value, four: value },
      ))).toMatchObject({ code: "compatible", valid: true });
    }
  });

  it("keeps over-capacity photos unplaced and reads each Cross folio from its own page number", () => {
    const twelve = recipe(GRID_CONTACT_RECIPE_IDS.twelveUpLedger);
    const thirteen = Array.from({ length: 13 }, (_, index) => `photo-${index + 1}`);
    expect(createRecipeApplication({ recipe: twelve, content: content(thirteen), anchorPageId: "page" }).unplacedPhotoIds).toEqual(["photo-13"]);

    const cross = recipe(GRID_CONTACT_RECIPE_IDS.crossRegister);
    const ids = ["one", "two", "three", "four"];
    const notes = Object.fromEntries(ids.map((id) => [id, `Note ${id}`]));
    const application = createRecipeApplication({ recipe: cross, content: content(ids, notes), anchorPageId: "left", targetPageIds: ["left", "right"] });
    const images = ids.map((id) => photo(id, notes[id]));
    const base = { mode: "reader" as const, title: "Cross Register", locale: "en" as const };
    const leftPlan = createRecipeRenderPlan({ recipe: cross, application, photos: images, environment: { ...base, pageId: "left", pageSide: "left", pageNumber: 24 } });
    const rightPlan = createRecipeRenderPlan({ recipe: cross, application, photos: images, environment: { ...base, pageId: "right", pageSide: "right", pageNumber: 25 } });
    expect(leftPlan.slots.find((slot) => slot.id === "folio-left")?.text).toBe("24");
    expect(rightPlan.slots.find((slot) => slot.id === "folio-right")?.text).toBe("25");
    expect(leftPlan.slots.some((slot) => slot.id === "folio-right")).toBe(false);
    expect(rightPlan.slots.some((slot) => slot.id === "folio-left")).toBe(false);
  });

  it("registers exact active Catalog refs without legacy additions", () => {
    expect(formalRecipeDefinitions).toHaveLength(15);
    expect(runtimeRecipeDefinitions).toHaveLength(21);
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries()).toHaveLength(21);
    const formalIds = new Set<string>(gridContactRecipeDefinitions.map((definition) => definition.id));
    expect(getActiveRecipeCatalogEntries().filter((entry) => formalIds.has(entry.recipe.id))).toHaveLength(3);
    for (const definition of gridContactRecipeDefinitions) {
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 2 })).toBeNull();
      expect(getGridContactRecipeDefinition(definition.id, 2)).toBeNull();
      expect(resolveDevelopmentRecipe({ id: definition.id, version: 1 })).toMatchObject({
        entry: { familyId: "grid-contact", status: "active" },
        definition,
        validation: { valid: true },
      });
      expect(definition.status).toBe("draft");
      expect(getActiveRecipeDefinition({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRecipeCatalogEntry({ id: definition.id, version: 1 })?.status).toBe("active");
      expect(definition).not.toHaveProperty("legacy");
      expect(definition).not.toHaveProperty("legacyStyleId");
    }
  });

  it("contains no Grid Recipe/Slot branch in shared Renderer or Render Plan", () => {
    const rendererSource = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer.tsx"), "utf8");
    const planSource = readFileSync(join(process.cwd(), "features/zine/components/recipe-renderer-plan.ts"), "utf8");
    const forbidden = /grid-contact-(?:twin|twelve|cross)|sample-a|sample-b|frame-01|record-01|index-notes/u;
    expect(rendererSource).not.toMatch(forbidden);
    expect(planSource).not.toMatch(forbidden);
  });
});
