import type { ZineDraft, ZinePhoto, ZineStyleId } from "./zine-draft";
import {
  createNotesByPhotoId,
  createRecipeApplication,
  getRecipeForStyle,
  type RecipeApplication,
} from "./recipe-contract";
import {
  createContentItemIds,
  createPhotoFocusDefaults,
} from "./recipe-placement";

export type ZineManualPage = {
  readonly id: string;
  readonly styleId: ZineStyleId;
  readonly photoIds: readonly string[];
  readonly contentItemIds: readonly string[];
  readonly recipeApplication: RecipeApplication | null;
};

export type ZineManualSpread = {
  readonly id: string;
  readonly left: ZineManualPage | null;
  readonly right: ZineManualPage | null;
};

export type ZinePageSide = "left" | "right";

export const photosPerManualPage: Readonly<Record<ZineStyleId, number>> = {
  editorial: 1,
  contact: 4,
  margin: 1,
  split: 2,
  night: 1,
};

export function createInitialManualSpreads(draft: ZineDraft): readonly ZineManualSpread[] {
  if (!draft.styleId) return [];
  const styleId = draft.styleId;
  const pacedPhotos = pacePhotosForZine(draft.photos);
  const pages: ZineManualPage[] = [];
  const pageSize = photosPerManualPage[styleId];

  for (let index = 0; index < pacedPhotos.length; index += pageSize) {
    const pageId = `manual-page-${pages.length + 1}`;
    const photoIds = pacedPhotos.slice(index, index + pageSize).map((photo) => photo.id);
    const recipe = getRecipeForStyle(styleId);
    pages.push({
      id: pageId,
      styleId,
      photoIds,
      contentItemIds: createContentItemIds(pageId, photoIds.length),
      recipeApplication: recipe
        ? createRecipeApplication({
            recipe,
            content: {
              photoIds,
              contentItemIds: createContentItemIds(pageId, photoIds.length),
              notesByPhotoId: createNotesByPhotoId(draft.photos),
              defaultFocusByPhotoId: createPhotoFocusDefaults(draft.photos),
              authoredTextItems: draft.authoredTextItems ?? [],
            },
            anchorPageId: pageId,
          })
        : null,
    });
  }

  const spreads: ZineManualSpread[] = [];
  for (let index = 0; index < pages.length; index += 2) {
    spreads.push({
      id: `manual-spread-${spreads.length + 1}`,
      left: pages[index] ?? null,
      right: pages[index + 1] ?? null,
    });
  }
  return ensureTrailingAddSpread(spreads);
}

export function ensureTrailingAddSpread(
  spreads: readonly ZineManualSpread[],
): readonly ZineManualSpread[] {
  const normalized = [...spreads];
  const last = normalized.at(-1);
  if (!last || (last.left !== null && last.right !== null)) {
    normalized.push({
      id: `manual-spread-${normalized.length + 1}`,
      left: null,
      right: null,
    });
  }
  return normalized;
}

export function pacePhotosForZine<T extends Pick<ZinePhoto, "id">>(
  photos: readonly T[],
): readonly T[] {
  const paced: T[] = [];
  let left = 0;
  let right = photos.length - 1;

  while (left <= right) {
    const rightPhoto = photos[right];
    if (rightPhoto) paced.push(rightPhoto);
    right -= 1;
    if (left <= right) {
      const leftPhoto = photos[left];
      if (leftPhoto) paced.push(leftPhoto);
      left += 1;
    }
  }
  return paced;
}

export function findManualPage(
  spreads: readonly ZineManualSpread[],
  pageId: string,
) {
  for (const spread of spreads) {
    if (spread.left?.id === pageId) return spread.left;
    if (spread.right?.id === pageId) return spread.right;
  }
  return null;
}
