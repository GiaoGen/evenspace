import { describe, expect, it } from "vitest";
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";
import { dynamicRecipeDefinitions } from "./dynamic-recipe-definitions";
import { formalRecipeDefinitions } from "./recipe-definition-registry";
import { createRecipeApplication, evaluateRecipeCompatibility, type RecipeDefinition } from "./recipe-contract";
import { developmentManualRecipeRuntimePolicy } from "./recipe-catalog";
import {
  getManualRecipeApplicability,
  initialZineCreatorHistoryState,
  initialZineCreatorState,
  zineCreatorHistoryReducer,
  zineCreatorReducer,
  type ZineCreatorState,
  type ZinePhoto,
} from "./zine-draft";
import type { ZineManualPage, ZineManualSpread } from "./zine-manual-layout";
import { getPhotoUseCounts } from "./photo-usage";

function photo(id: string): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    width: 4,
    height: 3,
    caption: id === "one" ? "Kept Photo Note" : "",
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

function page(id: string, photoIds: readonly string[] = [], recipeApplication: ZineManualPage["recipeApplication"] = null): ZineManualPage {
  return {
    id,
    styleId: "split",
    photoIds,
    contentItemIds: photoIds.map((_, index) => `${id}-content-${index + 1}`),
    recipeApplication,
  };
}

function stateFor(recipe: RecipeDefinition, photoIds: readonly string[]) {
  const left = page("page-left", photoIds);
  const spread: ZineManualSpread = { id: "spread-1", left, right: page("page-right") };
  return {
    step: "manual" as const,
    draft: {
      ...initialZineCreatorState.draft,
      styleId: "split" as const,
      photos: photoIds.map(photo),
      manualSpreads: [spread],
    },
    recipe,
  };
}

describe("manual photo tolerance", () => {
  it("keeps strict Compatibility unchanged while manual applicability accepts a deficit", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "quiet-scale-echo-v1", version: 1 })!;
    const state = stateFor(recipe, ["one"]);
    const strict = evaluateRecipeCompatibility(recipe, {
      photoIds: ["one"], notesByPhotoId: { one: "Kept Photo Note" },
    });
    const manual = getManualRecipeApplicability({ recipe, focusedPage: state.draft.manualSpreads![0]!.left, draft: state.draft });
    expect(strict.valid).toBe(false);
    expect(manual).toMatchObject({ canApplyInManualEditor: true, photoDeficit: 1, photoExcess: 0 });
  });

  it("allows a photo excess, preserving stable first slots and returning the tail to unplaced", () => {
    const recipe = dynamicRecipeDefinitions.find((candidate) => candidate.id === "dynamic-drop-sequence-v1")!;
    const initial = stateFor(recipe, ["one", "two", "three", "four"]);
    const next = zineCreatorReducer(initial, {
      type: "APPLY_RECIPE",
      pageId: "page-left",
      recipeRef: { id: recipe.id, version: recipe.version },
    }, developmentManualRecipeRuntimePolicy.resolve);
    const application = next.draft.manualSpreads![0]!.left!.recipeApplication!;
    expect(application.assignments.map((assignment) => assignment.photoId)).toEqual(["one", "two", "three"]);
    expect(application.unplacedPhotoIds).toEqual(["four"]);
  });

  it("creates a zero-photo manual Application with no fake assignment", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "quiet-held-field-v1", version: 1 })!;
    const initial = stateFor(recipe, []);
    const next = zineCreatorReducer(initial, {
      type: "APPLY_RECIPE", pageId: "page-left", recipeRef: { id: recipe.id, version: recipe.version },
    }, developmentManualRecipeRuntimePolicy.resolve);
    expect(next.draft.manualSpreads![0]!.left!.recipeApplication).toMatchObject({ recipeId: recipe.id, assignments: [] });
  });

  it("continues to reject missing authored text and incomplete spreads", () => {
    const lead = developmentManualRecipeRuntimePolicy.resolve({ id: "editorial-lead-story-v1", version: 1 })!;
    const leadState = stateFor(lead, ["one"]);
    expect(getManualRecipeApplicability({ recipe: lead, focusedPage: leadState.draft.manualSpreads![0]!.left, draft: leadState.draft })
      .canApplyInManualEditor).toBe(false);

    const spreadRecipe = developmentManualRecipeRuntimePolicy.resolve({ id: "quiet-horizon-bridge-v1", version: 1 })!;
    const incomplete = { ...leadState.draft, manualSpreads: [{ id: "spread-1", left: page("page-left", ["one"]), right: null }] };
    expect(getManualRecipeApplicability({ recipe: spreadRecipe, focusedPage: incomplete.manualSpreads![0]!.left, draft: incomplete })
      .canApplyInManualEditor).toBe(false);
  });

  it("shows empty slots in Editor plans but not Reader plans", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "quiet-scale-echo-v1", version: 1 })!;
    const application = createRecipeApplication({ recipe, content: { photoIds: ["one"], notesByPhotoId: { one: "Kept Photo Note" } }, anchorPageId: "page-left" });
    const common = { recipe, application, photos: [photo("one")] } as const;
    const editor = createRecipeRenderPlan({ ...common, environment: { pageId: "page-left", pageSide: "left", mode: "editor", pageNumber: 1, title: "", locale: "en" } });
    const reader = createRecipeRenderPlan({ ...common, environment: { pageId: "page-left", pageSide: "left", mode: "reader", pageNumber: 1, title: "", locale: "en" } });
    expect(editor.slots.filter((slot) => slot.kind === "photo" && !slot.photo)).toHaveLength(1);
    expect(editor.slots.find((slot) => slot.kind === "photo" && !slot.photo)?.interactivePhotoPlaceholder).toBe(true);
    expect(reader.slots.some((slot) => slot.kind === "photo" && !slot.photo && slot.showPhotoPlaceholder)).toBe(false);
  });

  it("removes an assignment without shifting the survivor, and fills an exact empty slot", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "recipe-split-v1", version: 1 })!;
    const application = createRecipeApplication({
      recipe,
      content: { photoIds: ["one", "two"], contentItemIds: ["one-content", "two-content"], notesByPhotoId: { one: "Kept Photo Note" } },
      anchorPageId: "page-left",
    });
    const first = application.assignments[0]!;
    const second = application.assignments[1]!;
    const initial: ZineCreatorState = {
      step: "manual",
      draft: {
        ...initialZineCreatorState.draft,
        styleId: "split",
        photos: [photo("one"), photo("two"), photo("three")],
        manualSpreads: [{ id: "spread-1", left: page("page-left", ["one", "two"], application), right: null }],
      },
    };
    const removed = zineCreatorReducer(initial, {
      type: "REMOVE_MANUAL_RECIPE_PHOTO", pageId: "page-left", placementId: first.placementId, photoSlotId: first.photoSlotId,
    });
    const afterRemoval = removed.draft.manualSpreads![0]!.left!.recipeApplication!;
    expect(afterRemoval.assignments).toEqual([second]);
    expect(afterRemoval.unplacedPhotoIds).toContain("one");
    expect(getPhotoUseCounts(removed.draft.manualSpreads).get("one")).toBeUndefined();

    const filled = zineCreatorReducer(removed, {
      type: "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT",
      pageId: "page-left",
      recipeRef: { id: recipe.id, version: recipe.version },
      photoSlotId: first.photoSlotId,
      photoId: "three",
    }, developmentManualRecipeRuntimePolicy.resolve);
    const afterFill = filled.draft.manualSpreads![0]!.left!.recipeApplication!;
    expect(afterFill.assignments.find((assignment) => assignment.photoSlotId === second.photoSlotId)).toMatchObject(second);
    expect(afterFill.assignments.find((assignment) => assignment.photoSlotId === first.photoSlotId)?.photoId).toBe("three");
  });

  it("moves an in-application photo instead of duplicating it and histories removal", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "recipe-split-v1", version: 1 })!;
    const application = createRecipeApplication({ recipe, content: { photoIds: ["one", "two"], notesByPhotoId: {} }, anchorPageId: "page-left" });
    const initial: ZineCreatorState = {
      step: "manual",
      draft: { ...initialZineCreatorState.draft, styleId: "split", photos: [photo("one"), photo("two")], manualSpreads: [{ id: "spread-1", left: page("page-left", ["one", "two"], application), right: null }] },
    };
    const moved = zineCreatorReducer(initial, {
      type: "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT", pageId: "page-left", recipeRef: { id: recipe.id, version: recipe.version }, photoSlotId: application.assignments[1]!.photoSlotId, photoId: "one",
    }, developmentManualRecipeRuntimePolicy.resolve);
    expect(moved.draft.manualSpreads![0]!.left!.recipeApplication!.assignments.filter((assignment) => assignment.photoId === "one")).toHaveLength(1);

    const history = zineCreatorHistoryReducer({ ...initialZineCreatorHistoryState, present: initial }, {
      type: "REMOVE_MANUAL_RECIPE_PHOTO", pageId: "page-left", placementId: application.assignments[0]!.placementId, photoSlotId: application.assignments[0]!.photoSlotId,
    });
    expect(history.past).toHaveLength(1);
    expect(zineCreatorHistoryReducer(history, { type: "UNDO" }).present).toBe(initial);
    expect(zineCreatorHistoryReducer({ ...initialZineCreatorHistoryState, present: initial }, {
      type: "REMOVE_MANUAL_RECIPE_PHOTO", pageId: "missing", placementId: "missing", photoSlotId: "missing",
    })).toEqual({ ...initialZineCreatorHistoryState, present: initial });
  });

  it("removes a cross-gutter spread placement atomically from either page", () => {
    const recipe = developmentManualRecipeRuntimePolicy.resolve({ id: "quiet-horizon-bridge-v1", version: 1 })!;
    const application = createRecipeApplication({
      recipe,
      content: { photoIds: ["one"], contentItemIds: ["bridge-content"], notesByPhotoId: { one: "Kept Photo Note" } },
      anchorPageId: "page-left",
      targetPageIds: ["page-left", "page-right"],
    });
    const assignment = application.assignments[0]!;
    const initial: ZineCreatorState = {
      step: "manual",
      draft: {
        ...initialZineCreatorState.draft,
        styleId: "split",
        photos: [photo("one")],
        authoredTextItems: [],
        manualSpreads: [{
          id: "spread-1",
          left: page("page-left", ["one"], application),
          right: page("page-right", [], application),
        }],
      },
    };
    const removed = zineCreatorReducer(initial, {
      type: "REMOVE_MANUAL_RECIPE_PHOTO",
      pageId: "page-right",
      placementId: assignment.placementId,
      photoSlotId: assignment.photoSlotId,
    });
    const spread = removed.draft.manualSpreads![0]!;
    expect(spread.left!.recipeApplication).toBe(spread.right!.recipeApplication);
    expect(spread.left!.recipeApplication!.assignments).toEqual([]);
    expect(removed.draft.photos[0]?.caption).toBe("Kept Photo Note");
  });

  it("allows every formal runtime Recipe to establish a deficient or excess manual applicability result", () => {
    for (const recipe of formalRecipeDefinitions) {
      const left = page("page-left", ["one", "two", "three", "four"]);
      const right = page("page-right");
      const draft = {
        ...initialZineCreatorState.draft,
        styleId: "split" as const,
        photos: [photo("one"), photo("two"), photo("three"), photo("four")],
        manualSpreads: [{ id: "spread-1", left, right }],
      };
      const result = getManualRecipeApplicability({ recipe, focusedPage: left, draft });
      expect(result.completionCompatibility).toBeDefined();
      expect(result.photoDeficit + result.photoExcess).toBeGreaterThanOrEqual(0);
      const partialApplication = createRecipeApplication({
        recipe,
        content: { photoIds: [], notesByPhotoId: {} },
        anchorPageId: "page-left",
        targetPageIds: recipe.scope === "spread" ? ["page-left", "page-right"] : ["page-left"],
      });
      const excessApplication = createRecipeApplication({
        recipe,
        content: { photoIds: ["one", "two", "three", "four"], notesByPhotoId: {} },
        anchorPageId: "page-left",
        targetPageIds: recipe.scope === "spread" ? ["page-left", "page-right"] : ["page-left"],
      });
      expect(partialApplication.assignments).toEqual([]);
      expect(excessApplication.assignments.length).toBeLessThanOrEqual(recipe.slots.filter((slot) => slot.kind === "photo").length);
    }
  });
});
