import { describe, expect, it } from "vitest";
import {
  initialZineCreatorState,
  splitPhotosIntoVisualRows,
  ZINE_CAPTION_LIMIT,
  ZINE_NAME_LIMIT,
  initialZineCreatorHistoryState,
  zineCreatorHistoryReducer,
  zineCreatorReducer,
  type ZinePhoto,
} from "./zine-draft";
import { createRecipeApplication } from "./recipe-contract";
import { phaseARecipeFixtures } from "./recipe-phase-a-fixtures";
import type { ZineManualSpread } from "./zine-manual-layout";

function photo(id: string, width: number, height: number): ZinePhoto {
  return {
    id,
    width,
    height,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    caption: "",
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

describe("zineCreatorReducer", () => {
  it("keeps name and caption values within their UI limits", () => {
    const named = zineCreatorReducer(initialZineCreatorState, {
      type: "SET_NAME",
      value: "n".repeat(ZINE_NAME_LIMIT + 4),
    });
    const withPhoto = zineCreatorReducer(named, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3)],
    });
    const captioned = zineCreatorReducer(withPhoto, {
      type: "SET_CAPTION",
      photoId: "one",
      value: "c".repeat(ZINE_CAPTION_LIMIT + 4),
    });

    expect(captioned.draft.name).toHaveLength(ZINE_NAME_LIMIT);
    expect(captioned.draft.photos[0]?.caption).toHaveLength(ZINE_CAPTION_LIMIT);
  });

  it("removes only the requested photo", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 3, 4)],
    });
    const next = zineCreatorReducer(withPhotos, { type: "REMOVE_PHOTO", photoId: "one" });

    expect(next.draft.photos.map((item) => item.id)).toEqual(["two"]);
  });

  it("stores the selected page style independently from photos", () => {
    const next = zineCreatorReducer(initialZineCreatorState, {
      type: "SET_STYLE",
      styleId: "margin",
    });

    expect(next.draft.styleId).toBe("margin");
    expect(next.draft.photos).toEqual([]);
  });

  it("stores bounded placement focus without mutating the photo asset", () => {
    const withPhoto = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhoto, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const pageId = manual.draft.manualSpreads?.[0]?.left?.id ?? "";
    const placementId = manual.draft.manualSpreads?.[0]?.left?.recipeApplication?.assignments[0]?.placementId ?? "";
    const positioned = zineCreatorReducer(manual, {
      type: "SET_PLACEMENT_FOCUS",
      pageId,
      placementId,
      focusX: -12,
      focusY: 118,
      scale: 0,
    });

    expect(positioned.draft.photos[0]).toMatchObject({ defaultFocusX: 50, defaultFocusY: 50 });
    expect(positioned.draft.manualSpreads?.[0]?.left?.recipeApplication?.assignments[0])
      .toMatchObject({ focusX: 0, focusY: 100, scale: 1 });
  });

  it("updates only the selected page placement when one photo is reused", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const leftPageId = manual.draft.manualSpreads?.[0]?.left?.id ?? "";
    const rightPageId = manual.draft.manualSpreads?.[0]?.right?.id ?? "";
    const leftPlacementId = manual.draft.manualSpreads?.[0]?.left?.recipeApplication?.assignments[0]?.placementId ?? "";
    const reused = zineCreatorReducer(manual, {
      type: "PLACE_MANUAL_PHOTO",
      pageId: rightPageId,
      photoId: "two",
    });
    const positioned = zineCreatorReducer(reused, {
      type: "SET_PLACEMENT_FOCUS",
      pageId: leftPageId,
      placementId: leftPlacementId,
      focusX: 12,
      focusY: 84,
      scale: 1.5,
    });

    const spread = positioned.draft.manualSpreads?.[0];
    const leftAssignment = spread?.left?.recipeApplication?.assignments[0];
    const rightAssignment = spread?.right?.recipeApplication?.assignments[0];
    expect(leftAssignment).toMatchObject({ photoId: "two", focusX: 12, focusY: 84, scale: 1.5 });
    expect(rightAssignment).toMatchObject({ photoId: "two", focusX: 50, focusY: 50, scale: 1 });
  });

  it("keeps surviving content item identity when a preceding photo is removed", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "split" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const page = manual.draft.manualSpreads?.[0]?.left;
    if (!page) return;
    const removedPhotoId = page.photoIds[0];
    const survivingContentItemId = page.contentItemIds[1];
    const next = zineCreatorReducer(manual, { type: "REMOVE_PHOTO", photoId: removedPhotoId ?? "" });

    expect(next.draft.manualSpreads?.[0]?.left?.contentItemIds).toEqual([survivingContentItemId]);
    expect(next.draft.manualSpreads?.[0]?.left?.photoIds).toHaveLength(1);
  });

  it("keeps both pages on the same cross-page Assignment after a placement update", () => {
    const recipe = phaseARecipeFixtures[1];
    expect(recipe).toBeDefined();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["bridge"],
        contentItemIds: ["bridge-content"],
        notesByPhotoId: {},
      },
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const spread: ZineManualSpread = {
      id: "spread-one",
      left: {
        id: "left-page",
        styleId: "editorial",
        photoIds: ["bridge"],
        contentItemIds: ["bridge-content"],
        recipeApplication: application,
      },
      right: {
        id: "right-page",
        styleId: "editorial",
        photoIds: ["bridge"],
        contentItemIds: ["bridge-content"],
        recipeApplication: application,
      },
    };
    const state = {
      ...initialZineCreatorState,
      step: "manual" as const,
      draft: {
        name: "Cross-page",
        photos: [photo("bridge", 16, 9)],
        styleId: "editorial" as const,
        manualSpreads: [spread],
      },
    };
    const updated = zineCreatorReducer(state, {
      type: "SET_PLACEMENT_FOCUS",
      pageId: "left-page",
      placementId: application.assignments[0]?.placementId ?? "",
      focusX: 14,
      focusY: 86,
      scale: 1.25,
    });
    const nextSpread = updated.draft.manualSpreads?.[0];
    const leftAssignment = nextSpread?.left?.recipeApplication?.assignments[0];
    const rightAssignment = nextSpread?.right?.recipeApplication?.assignments[0];

    expect(leftAssignment).toMatchObject({ focusX: 14, focusY: 86, scale: 1.25 });
    expect(rightAssignment).toEqual(leftAssignment);
    expect(nextSpread?.left?.recipeApplication?.assignments)
      .toEqual(nextSpread?.right?.recipeApplication?.assignments);
  });

  it("keeps at least one add-page slot at the end of manual spreads", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });

    expect(manual.draft.manualSpreads).toHaveLength(2);
    expect(manual.draft.manualSpreads?.at(-1)).toMatchObject({ left: null, right: null });

    const lastSpreadId = manual.draft.manualSpreads?.at(-1)?.id ?? "";
    const withPage = zineCreatorReducer(manual, {
      type: "ADD_MANUAL_PAGE",
      spreadId: lastSpreadId,
      side: "left",
    });
    expect(withPage.draft.manualSpreads?.at(-1)?.left).not.toBeNull();
    expect(withPage.draft.manualSpreads?.at(-1)?.right).toBeNull();
  });

  it("applies a recipe to a spread and places a photo on its focused page", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const firstPage = manual.draft.manualSpreads?.[0]?.left;
    const recipeApplied = zineCreatorReducer(manual, {
      type: "APPLY_RECIPE",
      pageId: firstPage?.id ?? "",
      recipeId: "recipe-split-v1",
    });
    const appliedPage = recipeApplied.draft.manualSpreads?.[0]?.left;
    const placed = zineCreatorReducer(recipeApplied, {
      type: "PLACE_MANUAL_PHOTO",
      pageId: appliedPage?.id ?? "",
      photoId: "two",
      replacePhotoId: "one",
    });

    expect(placed.draft.manualSpreads?.[0]?.left?.styleId).toBe("split");
    expect(placed.draft.manualSpreads?.[0]?.right?.styleId).toBe("editorial");
    expect(placed.draft.manualSpreads?.[0]?.left?.photoIds).toContain("two");
  });

  it("applies a spread Recipe atomically and keeps overflow photos unplaced", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const first = manual.draft.manualSpreads?.[0];
    if (!first?.left || !first.right) return;
    const applied = zineCreatorReducer(manual, {
      type: "APPLY_RECIPE",
      pageId: first.left.id,
      recipeId: "recipe-reference-cross-gutter-v1",
    });
    const nextSpread = applied.draft.manualSpreads?.[0];
    const leftApplication = nextSpread?.left?.recipeApplication;
    const rightApplication = nextSpread?.right?.recipeApplication;

    expect(leftApplication).toMatchObject({
      recipeId: "recipe-reference-cross-gutter-v1",
      scope: "spread",
      targetPageIds: [first.left.id, first.right.id],
      unplacedPhotoIds: [first.right.photoIds[0]],
    });
    expect(rightApplication).toEqual(leftApplication);
    expect(nextSpread?.left?.styleId).toBe("editorial");
    expect(nextSpread?.right?.styleId).toBe("editorial");

    const withReplacementPhoto = zineCreatorReducer(applied, {
      type: "ADD_PHOTOS",
      photos: [photo("three", 3, 4)],
    });
    const migrated = zineCreatorReducer(withReplacementPhoto, {
      type: "PLACE_MANUAL_PHOTO",
      pageId: first.left.id,
      photoId: "three",
    });
    const migratedSpread = migrated.draft.manualSpreads?.[0];
    expect(migratedSpread?.left?.recipeApplication?.assignments[0]?.photoId).toBe("three");
    expect(migratedSpread?.left?.recipeApplication).toEqual(migratedSpread?.right?.recipeApplication);
    expect(migratedSpread?.left?.recipeApplication?.unplacedPhotoIds).toEqual([first.right.photoIds[0]]);
  });

  it("undoes and redoes a Recipe application as one operation", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const history = {
      ...initialZineCreatorHistoryState,
      present: manual,
    };
    const pageId = manual.draft.manualSpreads?.[0]?.left?.id ?? "";
    const applied = zineCreatorHistoryReducer(history, {
      type: "APPLY_RECIPE",
      pageId,
      recipeId: "recipe-split-v1",
    });
    const undone = zineCreatorHistoryReducer(applied, { type: "UNDO" });
    const redone = zineCreatorHistoryReducer(undone, { type: "REDO" });

    expect(applied.past).toHaveLength(1);
    expect(applied.present.draft.manualSpreads?.[0]?.left?.styleId).toBe("split");
    expect(undone.present).toBe(manual);
    expect(redone.present).toBe(applied.present);
    expect(redone.future).toHaveLength(0);
  });

  it("does not put name, photos, caption, or style changes in the layout history", () => {
    const named = zineCreatorHistoryReducer(initialZineCreatorHistoryState, {
      type: "SET_NAME",
      value: "Before layout",
    });
    const withPhoto = zineCreatorHistoryReducer(named, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3)],
    });
    const captioned = zineCreatorHistoryReducer(withPhoto, {
      type: "SET_CAPTION",
      photoId: "one",
      value: "Caption",
    });
    const styled = zineCreatorHistoryReducer(captioned, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorHistoryReducer(styled, { type: "GO_TO", step: "manual" });
    const undone = zineCreatorHistoryReducer(manual, { type: "UNDO" });

    expect(manual.past).toHaveLength(0);
    expect(manual.present.step).toBe("manual");
    expect(undone).toBe(manual);
  });

  it("undoes and redoes a cross-page Recipe on both pages together", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const first = manual.draft.manualSpreads?.[0];
    if (!first?.left || !first.right) return;
    const history = { ...initialZineCreatorHistoryState, present: manual };
    const applied = zineCreatorHistoryReducer(history, {
      type: "APPLY_RECIPE",
      pageId: first.left.id,
      recipeId: "recipe-reference-cross-gutter-v1",
    });
    const undone = zineCreatorHistoryReducer(applied, { type: "UNDO" });
    const redone = zineCreatorHistoryReducer(undone, { type: "REDO" });

    expect(applied.present.draft.manualSpreads?.[0]?.left?.recipeApplication?.scope).toBe("spread");
    expect(applied.present.draft.manualSpreads?.[0]?.right?.recipeApplication).toEqual(
      applied.present.draft.manualSpreads?.[0]?.left?.recipeApplication,
    );
    expect(undone.present).toBe(manual);
    expect(redone.present).toBe(applied.present);
    expect(redone.present.draft.manualSpreads?.[0]?.right?.recipeApplication).toEqual(
      redone.present.draft.manualSpreads?.[0]?.left?.recipeApplication,
    );
  });

  it("does not partially apply a Recipe when compatibility fails", () => {
    const withPhotos = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3), photo("two", 4, 3)],
    });
    const styled = zineCreatorReducer(withPhotos, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const spreads = manual.draft.manualSpreads ?? [];
    const first = spreads[0];
    if (!first?.left || !first.right) return;
    const overfull = {
      ...manual,
      draft: {
        ...manual.draft,
        manualSpreads: [{
          ...first,
          left: {
            ...first.left,
            photoIds: ["one", "two"],
            contentItemIds: ["left:content-1", "left:content-2"],
          },
        }, ...spreads.slice(1)],
      },
    };
    const rejected = zineCreatorReducer(overfull, {
      type: "APPLY_RECIPE",
      pageId: first.left.id,
      recipeId: "recipe-editorial-v1",
    });

    expect(rejected).toBe(overfull);
    expect(rejected.draft.manualSpreads?.[0]?.left?.photoIds).toEqual(["one", "two"]);
    expect(rejected.draft.manualSpreads?.[0]?.right).toEqual(first.right);
  });
});

describe("splitPhotosIntoVisualRows", () => {
  it("balances visual rows without changing the photo collection", () => {
    const photos = [
      photo("wide", 16, 9),
      photo("portrait", 3, 4),
      photo("square", 1, 1),
      photo("wide-two", 3, 2),
    ];

    const rows = splitPhotosIntoVisualRows(photos);
    expect(rows.flat().map((item) => item.id).sort()).toEqual(
      photos.map((item) => item.id).sort(),
    );
    expect(rows.every((row) => row.length > 0)).toBe(true);
  });
});
