import { describe, expect, it } from "vitest";
import {
  createRecipeApplication,
  deriveSpreadEvidence,
  estimateRecipeNoteLines,
  evaluateRecipeCompatibility,
  validateRecipeDefinition,
  type RecipeDefinition,
} from "./recipe-contract";
import {
  formalRecipeDefinitions,
  getRuntimeRecipeDefinitionByRef,
  runtimeRecipeDefinitions,
} from "./recipe-definition-registry";
import {
  QUIET_RECIPE_IDS,
  getQuietRecipeDefinition,
  quietRecipeDefinitions,
  quietRecipeTheme,
} from "./quiet-recipe-definitions";
import {
  getActiveRecipeDefinition,
  getActiveRecipeCatalogEntries,
  getRecipeCatalogEntry,
  resolveDevelopmentRecipe,
  validateRecipeCatalog,
} from "./recipe-catalog";
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";
import type { ZinePhoto } from "./zine-draft";

function recipe(id: string) {
  const definition = getQuietRecipeDefinition(id) as RecipeDefinition | null;
  expect(definition).not.toBeNull();
  return definition!;
}

function photo(id: string, caption = ""): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `preview:${id}`,
    fileName: `${id}.jpg`,
    width: 1600,
    height: 900,
    caption,
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

const maxSixtyCharacters = "12345678901234567890\n1234567890123456789\n1234567890123456789";

describe("Phase F3-B1 Quiet formal Recipe Definitions", () => {
  it("matches the approved identities, scopes, geometry, and shared neutral theme", () => {
    expect(quietRecipeDefinitions).toHaveLength(3);
    expect(quietRecipeDefinitions.every((definition) => validateRecipeDefinition(definition).valid)).toBe(true);
    expect(quietRecipeDefinitions.every((definition) => (
      definition.schemaVersion === 1
      && definition.version === 1
      && definition.familyId === "quiet"
      && definition.status === "draft"
      && definition.canvas.pageRatio === "3:4"
      && definition.theme === quietRecipeTheme
      && !Object.hasOwn(definition, "legacy")
      && !Object.hasOwn(definition, "legacyStyleId")
      && definition.slots.filter((slot) => slot.kind === "photo").every((slot) => slot.fit === "cover")
    ))).toBe(true);
    expect(quietRecipeTheme).toEqual({
      background: "#F4F0E8",
      foreground: "#17191C",
      muted: "#55585D",
      photoBackground: "#D7D3CA",
      typographyPreset: "photoessay-field",
    });

    expect(recipe(QUIET_RECIPE_IDS.heldField)).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .10, y: .10, width: .80, height: .80 } },
      noteRelations: [],
      slots: [{
        id: "photo-primary",
        kind: "photo",
        rect: { x: .14, y: .16, width: .72, height: .60 },
        pageSide: "left",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: false,
      }],
    });
    expect(recipe(QUIET_RECIPE_IDS.scaleEcho)).toMatchObject({
      scope: "page",
      capabilities: { photos: { min: 2, max: 2 }, notes: { mode: "optional", maxCharacters: 60, maxLines: 3 }, allowsEmptyDraft: false },
      canvas: { safeArea: { x: .10, y: .10, width: .80, height: .82 } },
      slots: [
        { id: "photo-scene", kind: "photo", rect: { x: .10, y: .13, width: .60, height: .40 }, pageSide: "left", required: true, zIndex: 10 },
        { id: "photo-echo", kind: "photo", rect: { x: .52, y: .60, width: .38, height: .32 }, pageSide: "left", required: true, zIndex: 10 },
        { id: "note-echo", kind: "note", rect: { x: .10, y: .70, width: .32, height: .18 }, pageSide: "left", required: false, zIndex: 20, foregroundToken: "ink", maxLines: 3, repeatable: false, role: "caption", align: "start" },
      ],
      noteRelations: [{ photoSlotId: "photo-echo", noteSlotId: "note-echo", kind: "aligned" }],
    });
    expect(recipe(QUIET_RECIPE_IDS.horizonBridge)).toMatchObject({
      scope: "spread",
      capabilities: { photos: { min: 1, max: 1 }, notes: { mode: "none" }, allowsEmptyDraft: false },
      canvas: {
        safeArea: { x: .10, y: .10, width: 1.80, height: .80 },
        gutter: { start: .98, end: 1.02 },
      },
      noteRelations: [],
      slots: [{
        id: "photo-horizon",
        kind: "photo",
        rect: { x: .28, y: .17, width: 1.44, height: .66 },
        pageSide: "cross-spread",
        required: true,
        zIndex: 10,
        fit: "cover",
        allowBleed: false,
        allowGutterCrossing: true,
      }],
    });
  });

  it("adds formal Definitions through one non-circular runtime registry", () => {
    expect(formalRecipeDefinitions).toHaveLength(15);
    expect(formalRecipeDefinitions.slice(0, 3)).toEqual(quietRecipeDefinitions);
    expect(runtimeRecipeDefinitions).toHaveLength(21);
    for (const definition of quietRecipeDefinitions) {
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 1 })).toBe(definition);
      expect(getRuntimeRecipeDefinitionByRef({ id: definition.id, version: 2 })).toBeNull();
    }
    expect(runtimeRecipeDefinitions.filter((definition) => definition.id.startsWith("recipe-")).length).toBe(6);
  });

  it("keeps Quiet Definitions migration-draft while Catalog entries are active", () => {
    expect(validateRecipeCatalog()).toEqual([]);
    expect(getActiveRecipeCatalogEntries()).toHaveLength(21);
    const formalIds = new Set<string>(quietRecipeDefinitions.map((definition) => definition.id));
    expect(getActiveRecipeCatalogEntries().filter((entry) => formalIds.has(entry.recipe.id))).toHaveLength(3);
    for (const definition of quietRecipeDefinitions) {
      const development = resolveDevelopmentRecipe({ id: definition.id, version: definition.version });
      expect(definition.status).toBe("draft");
      expect(development.entry).toMatchObject({ familyId: "quiet", status: "active" });
      expect(development.definition).toBe(definition);
      expect(development.validation?.valid).toBe(true);
      expect(getActiveRecipeDefinition({ id: definition.id, version: definition.version })).toBe(definition);
    }
    expect(getRecipeCatalogEntry({ id: QUIET_RECIPE_IDS.heldField, version: 1 })?.authoring).toEqual({
      ratios: { preferred: ["portrait", "square"], risky: ["ultra-wide"] },
      slotTopology: "single",
      compositionAxis: "center",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "medium",
      gutterRisk: "low",
    });
    expect(getRecipeCatalogEntry({ id: QUIET_RECIPE_IDS.scaleEcho, version: 1 })?.authoring).toEqual({
      ratios: { preferred: ["square", "portrait", "landscape"], risky: ["ultra-wide"] },
      slotTopology: "diptych",
      compositionAxis: "diagonal",
      readingDirection: "top-down",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "high",
      gutterRisk: "low",
    });
    expect(getRecipeCatalogEntry({ id: QUIET_RECIPE_IDS.horizonBridge, version: 1 })?.authoring).toEqual({
      ratios: { preferred: ["landscape"], risky: ["portrait", "ultra-wide"] },
      slotTopology: "cross-gutter",
      compositionAxis: "horizontal",
      readingDirection: "ltr",
      colorStrategy: "paper",
      pace: "slow",
      subjectEdgeRisk: "high",
      gutterRisk: "high",
    });
  });

  it("enforces Held Field capacity and retains hidden Photo Notes", () => {
    const definition = recipe(QUIET_RECIPE_IDS.heldField);
    expect(evaluateRecipeCompatibility(definition, { photoIds: [], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["one"], notesByPhotoId: {} })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["one", "two"], notesByPhotoId: {} })).toMatchObject({ code: "too-much-content", valid: false });

    const content = { photoIds: ["one"], notesByPhotoId: { one: "Retain this Note." } };
    const application = createRecipeApplication({ recipe: definition, content, anchorPageId: "held-left" });
    expect(evaluateRecipeCompatibility(definition, content)).toMatchObject({
      code: "compatible-with-hidden-notes",
      valid: true,
      hiddenNotePhotoIds: ["one"],
    });
    expect(application.hiddenNotePhotoIds).toEqual(["one"]);
    expect(application.assignments[0]?.noteSlotId).toBeUndefined();
    expect(content.notesByPhotoId.one).toBe("Retain this Note.");

    const over = createRecipeApplication({
      recipe: definition,
      content: { photoIds: ["one", "two"], notesByPhotoId: {} },
      anchorPageId: "held-left",
    });
    expect(over.unplacedPhotoIds).toEqual(["two"]);
  });

  it("binds only the second Scale Echo photo and enforces the 60-character / 3-line boundary", () => {
    const definition = recipe(QUIET_RECIPE_IDS.scaleEcho);
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["scene"], notesByPhotoId: {} })).toMatchObject({ code: "needs-content", valid: false });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["scene", "echo"], notesByPhotoId: {} })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, { photoIds: ["scene", "echo", "extra"], notesByPhotoId: {} })).toMatchObject({ code: "too-much-content", valid: false });

    const content = {
      photoIds: ["scene", "echo"],
      contentItemIds: ["scene-content", "echo-content"],
      notesByPhotoId: { scene: "", echo: "The second image carries this Note." },
    };
    const application = createRecipeApplication({ recipe: definition, content, anchorPageId: "scale-left" });
    expect(application.assignments).toEqual([
      expect.objectContaining({ photoSlotId: "photo-scene", photoId: "scene", noteSlotId: undefined }),
      expect.objectContaining({ photoSlotId: "photo-echo", photoId: "echo", noteSlotId: "note-echo", noteOfPhotoId: "echo" }),
    ]);

    expect(maxSixtyCharacters).toHaveLength(60);
    expect(estimateRecipeNoteLines(definition, "photo-echo", maxSixtyCharacters)).toBe(3);
    expect(evaluateRecipeCompatibility(definition, {
      photoIds: ["scene", "echo"],
      notesByPhotoId: { scene: "", echo: maxSixtyCharacters },
    })).toMatchObject({ code: "compatible", valid: true });
    expect(evaluateRecipeCompatibility(definition, {
      photoIds: ["scene", "echo"],
      notesByPhotoId: { scene: "", echo: "x".repeat(61) },
    })).toMatchObject({ code: "note-too-long", valid: false });
    expect(evaluateRecipeCompatibility(definition, {
      photoIds: ["scene", "echo"],
      notesByPhotoId: { scene: "", echo: "one\ntwo\nthree\nfour" },
    })).toMatchObject({ code: "note-too-many-lines", valid: false });
  });

  it("keeps Scale Echo geometry fixed when its optional Note is absent", () => {
    const definition = recipe(QUIET_RECIPE_IDS.scaleEcho);
    const withoutNote = createRecipeApplication({
      recipe: definition,
      content: { photoIds: ["scene", "echo"], notesByPhotoId: {} },
      anchorPageId: "scale-left",
    });
    const withNote = createRecipeApplication({
      recipe: definition,
      content: { photoIds: ["scene", "echo"], notesByPhotoId: { echo: "Echo Note" } },
      anchorPageId: "scale-left",
    });
    const environment = { pageId: "scale-left", pageSide: "left" as const, mode: "reader" as const, pageNumber: 1, title: "Scale Echo", locale: "en" as const };
    const photos = [photo("scene"), photo("echo", "Echo Note")];
    const withoutPlan = createRecipeRenderPlan({ recipe: definition, application: withoutNote, photos, environment });
    const withPlan = createRecipeRenderPlan({ recipe: definition, application: withNote, photos, environment });
    const photoGeometry = (plan: typeof withoutPlan) => plan.slots
      .filter((slot) => slot.kind === "photo")
      .map(({ id, rect }) => ({ id, rect }));
    expect(photoGeometry(withoutPlan)).toEqual(photoGeometry(withPlan));
    expect(withoutPlan.slots.some((slot) => slot.id === "note-echo")).toBe(false);
    expect(withPlan.slots.find((slot) => slot.id === "note-echo")?.notes?.[0]).toMatchObject({
      photoId: "echo",
      photoSlotId: "photo-echo",
      relation: "aligned",
    });
  });

  it("derives only Horizon Bridge cross-gutter evidence and shares one placement across both page plans", () => {
    const definition = recipe(QUIET_RECIPE_IDS.horizonBridge);
    expect(deriveSpreadEvidence(definition)).toEqual([{ kind: "cross-gutter-photo", photoSlotId: "photo-horizon" }]);
    const application = createRecipeApplication({
      recipe: definition,
      content: {
        photoIds: ["horizon", "extra"],
        contentItemIds: ["horizon-content", "extra-content"],
        notesByPhotoId: {},
        defaultFocusByPhotoId: { horizon: { focusX: 73, focusY: 41 } },
      },
      anchorPageId: "spread-left",
      targetPageIds: ["spread-left", "spread-right"],
    });
    expect(application.targetPageIds).toEqual(["spread-left", "spread-right"]);
    expect(application.unplacedPhotoIds).toEqual(["extra"]);
    expect(application.assignments).toHaveLength(1);

    const persisted = {
      ...application,
      assignments: application.assignments.map((assignment) => ({ ...assignment, focusX: 73, focusY: 41, scale: 1.4 })),
    };
    const refreshed = createRecipeApplication({
      recipe: definition,
      content: {
        photoIds: ["horizon"],
        contentItemIds: ["horizon-content"],
        notesByPhotoId: {},
      },
      anchorPageId: "spread-left",
      targetPageIds: ["spread-left", "spread-right"],
      previousApplications: [persisted],
    });
    const environment = { mode: "reader" as const, pageNumber: 1, title: "Horizon Bridge", locale: "en" as const };
    const image = photo("horizon");
    const left = createRecipeRenderPlan({ recipe: definition, application: refreshed, photos: [image], environment: { ...environment, pageId: "spread-left", pageSide: "left" } });
    const right = createRecipeRenderPlan({ recipe: definition, application: refreshed, photos: [image], environment: { ...environment, pageId: "spread-right", pageSide: "right", pageNumber: 2 } });
    const leftSlot = left.slots.find((slot) => slot.id === "photo-horizon");
    const rightSlot = right.slots.find((slot) => slot.id === "photo-horizon");
    expect(leftSlot).toMatchObject({ photoId: "horizon", placementId: "placement:horizon-content", focusX: 73, focusY: 41, scale: 1.4, crossSpread: true });
    expect(rightSlot).toMatchObject({ photoId: "horizon", placementId: leftSlot?.placementId, focusX: 73, focusY: 41, scale: 1.4, crossSpread: true });
    expect(leftSlot?.rect).not.toEqual(rightSlot?.rect);
  });

  it("uses generic Editor placeholders while Reader plans suppress empty output and editing state", () => {
    for (const definition of quietRecipeDefinitions) {
      const targetPageIds = definition.scope === "spread" ? ["left", "right"] : ["left"];
      const application = createRecipeApplication({
        recipe: definition,
        content: { photoIds: [], notesByPhotoId: {} },
        anchorPageId: "left",
        targetPageIds,
      });
      const base = { pageId: "left", pageSide: "left" as const, pageNumber: 1, title: definition.name, locale: "en" as const };
      const editor = createRecipeRenderPlan({ recipe: definition, application, photos: [], environment: { ...base, mode: "editor" } });
      const reader = createRecipeRenderPlan({ recipe: definition, application, photos: [], environment: { ...base, mode: "reader" } });
      expect(editor.slots.filter((slot) => slot.kind === "photo").every((slot) => slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.slots.filter((slot) => slot.kind === "photo").every((slot) => !slot.showPhotoPlaceholder)).toBe(true);
      expect(reader.slots.every((slot) => !Object.hasOwn(slot, "selected") && !Object.hasOwn(slot, "editorControls"))).toBe(true);
    }
  });
});
