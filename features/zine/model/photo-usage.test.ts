import { describe, expect, it } from "vitest";
import {
  createRecipeApplication,
  getRecipeDefinition,
  getRecipeForStyle,
} from "./recipe-contract";
import { getPhotoUseCounts } from "./photo-usage";
import type { ZineManualPage, ZineManualSpread } from "./zine-manual-layout";

function page(
  id: string,
  photoIds: readonly string[],
  application: ZineManualPage["recipeApplication"],
): ZineManualPage {
  return {
    id,
    styleId: "editorial",
    photoIds,
    contentItemIds: photoIds.map((_, index) => `${id}:content-${index + 1}`),
    recipeApplication: application,
  };
}

function spread(
  left: ZineManualPage,
  right: ZineManualPage,
): ZineManualSpread {
  return { id: `${left.id}-${right.id}`, left, right };
}

describe("Photo menu usage counts", () => {
  it("counts an assigned photo once and ignores an unplaced photo", () => {
    const recipe = getRecipeDefinition("recipe-reference-cross-gutter-v1");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["assigned", "unplaced"],
        contentItemIds: ["left:content-1", "right:content-1"],
        notesByPhotoId: {},
      },
      anchorPageId: "left",
      targetPageIds: ["left", "right"],
    });

    const counts = getPhotoUseCounts([
      spread(
        page("left", ["assigned"], application),
        page("right", ["unplaced"], application),
      ),
    ]);

    expect(counts.get("assigned")).toBe(1);
    expect(counts.get("unplaced") ?? 0).toBe(0);
  });

  it("counts one cross-page Assignment once even when both pages render it", () => {
    const recipe = getRecipeDefinition("recipe-reference-cross-gutter-v1");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["bridge"],
        contentItemIds: ["bridge:content-1"],
        notesByPhotoId: {},
      },
      anchorPageId: "left",
      targetPageIds: ["left", "right"],
    });

    const counts = getPhotoUseCounts([
      spread(
        page("left", ["bridge"], application),
        page("right", ["bridge"], application),
      ),
    ]);

    expect(counts.get("bridge")).toBe(1);
  });

  it("counts two placements of the same photo independently", () => {
    const recipe = getRecipeForStyle("split");
    expect(recipe).not.toBeNull();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["same-photo", "same-photo"],
        contentItemIds: ["placement-a", "placement-b"],
        notesByPhotoId: {},
      },
      anchorPageId: "page",
    });

    const counts = getPhotoUseCounts([
      spread(page("page", ["same-photo", "same-photo"], application), page("empty", [], null)),
    ]);

    expect(application.assignments[0]?.placementId).not.toBe(application.assignments[1]?.placementId);
    expect(counts.get("same-photo")).toBe(2);
  });
});
