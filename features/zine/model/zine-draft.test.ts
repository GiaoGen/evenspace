import { describe, expect, it } from "vitest";
import {
  initialZineCreatorState,
  splitPhotosIntoVisualRows,
  ZINE_CAPTION_LIMIT,
  ZINE_NAME_LIMIT,
  zineCreatorReducer,
  type ZinePhoto,
} from "./zine-draft";

function photo(id: string, width: number, height: number): ZinePhoto {
  return {
    id,
    width,
    height,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    caption: "",
    positionX: 50,
    positionY: 50,
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

  it("stores bounded in-frame photo positions", () => {
    const withPhoto = zineCreatorReducer(initialZineCreatorState, {
      type: "ADD_PHOTOS",
      photos: [photo("one", 4, 3)],
    });
    const positioned = zineCreatorReducer(withPhoto, {
      type: "SET_PHOTO_POSITION",
      photoId: "one",
      positionX: -12,
      positionY: 118,
    });

    expect(positioned.draft.photos[0]).toMatchObject({ positionX: 0, positionY: 100 });
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
    const firstSpread = manual.draft.manualSpreads?.[0];
    const recipeApplied = zineCreatorReducer(manual, {
      type: "SET_MANUAL_SPREAD_STYLE",
      spreadId: firstSpread?.id ?? "",
      styleId: "split",
    });
    const firstPage = recipeApplied.draft.manualSpreads?.[0]?.left;
    const placed = zineCreatorReducer(recipeApplied, {
      type: "PLACE_MANUAL_PHOTO",
      pageId: firstPage?.id ?? "",
      photoId: "two",
      replacePhotoId: "one",
    });

    expect(placed.draft.manualSpreads?.[0]?.left?.styleId).toBe("split");
    expect(placed.draft.manualSpreads?.[0]?.right?.styleId).toBe("split");
    expect(placed.draft.manualSpreads?.[0]?.left?.photoIds).toContain("two");
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
