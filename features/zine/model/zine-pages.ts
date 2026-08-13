import type { ZineDraft, ZineLocale, ZinePhoto, ZineStyleId } from "./zine-draft";
import {
  createInitialManualSpreads,
  pacePhotosForZine,
  type ZineManualPage,
  type ZineManualSpread,
  type ZinePageSide,
} from "./zine-manual-layout";
import {
  createNotesByPhotoId,
  createRecipeApplication,
  getRecipeForStyle,
  type AuthoredTextItem,
  type RecipeApplication,
} from "./recipe-contract";
import {
  createContentItemIds,
  createPhotoFocusDefaults,
} from "./recipe-placement";

export type ZineReaderPage =
  | {
      readonly locale: ZineLocale;
      readonly id: "cover";
      readonly kind: "cover";
      readonly density: "hard";
      readonly title: string;
    }
  | {
      readonly locale: ZineLocale;
      readonly id: "back";
      readonly kind: "back";
      readonly density: "hard";
      readonly title: string;
    }
  | {
      readonly locale: ZineLocale;
      readonly id: string;
      readonly kind: "content";
      readonly density: "soft";
      readonly title: string;
      readonly styleId: ZineStyleId;
      readonly photos: readonly ZinePhoto[];
      readonly pageNumber: number;
      readonly side: "left" | "right";
      readonly recipeApplication: RecipeApplication | null;
      readonly authoredTextItems?: readonly AuthoredTextItem[];
    }
  | {
      readonly locale: ZineLocale;
      readonly id: string;
      readonly kind: "blank";
      readonly density: "soft";
      readonly title: string;
      readonly pageNumber: number;
      readonly side: "left" | "right";
    }
  | {
      readonly locale: ZineLocale;
      readonly id: string;
      readonly kind: "add";
      readonly density: "soft";
      readonly title: string;
      readonly pageNumber: number;
      readonly side: ZinePageSide;
      readonly spreadId: string;
    }
  | {
      readonly locale: ZineLocale;
      readonly id: "colophon";
      readonly kind: "colophon";
      readonly density: "soft";
      readonly title: string;
      readonly pageNumber: number;
      readonly side: "left" | "right";
    };

const photosPerPage: Readonly<Record<ZineStyleId, number>> = {
  editorial: 1,
  contact: 4,
  margin: 1,
  split: 2,
  night: 1,
};

/**
 * Builds the physical book independently from Step 2's card lanes. Reader
 * pacing starts at the end of the upload collection, then alternates inward.
 */
export function createZineReaderPages(draft: ZineDraft): readonly ZineReaderPage[] {
  if (!draft.styleId) return [];

  if (draft.manualSpreads !== null) {
    return createPagesFromManualSpreads(draft, draft.manualSpreads, false);
  }

  const orderedPhotos = pacePhotosForReader(draft.photos);
  const contentPages = chunk(orderedPhotos, photosPerPage[draft.styleId]).map(
    (photos, index): ZineReaderPage => ({
      id: `content-${index + 1}`,
      locale: draft.locale,
      kind: "content",
      density: "soft",
      title: draft.name,
      styleId: draft.styleId as ZineStyleId,
      photos,
      pageNumber: index + 1,
      side: (index + 1) % 2 === 1 ? "left" : "right",
      recipeApplication: createReaderRecipeApplication(draft, photos, `content-${index + 1}`),
      authoredTextItems: draft.authoredTextItems ?? [],
    }),
  );

  const pages: ZineReaderPage[] = [
    { id: "cover", kind: "cover", density: "hard", title: draft.name, locale: draft.locale },
    ...contentPages,
  ];

  if (contentPages.length % 2 === 1) {
    pages.push({
      id: "colophon",
      locale: draft.locale,
      kind: "colophon",
      density: "soft",
      title: draft.name,
      pageNumber: contentPages.length + 1,
      side: "right",
    });
  }

  pages.push({ id: "back", kind: "back", density: "hard", title: draft.name, locale: draft.locale });
  return pages;
}

export function createManualEditorPages(draft: ZineDraft): readonly ZineReaderPage[] {
  if (!draft.styleId) return [];
  const spreads = draft.manualSpreads ?? createInitialManualSpreads(draft);
  return createPagesFromManualSpreads(draft, spreads, true);
}

export function pacePhotosForReader(photos: readonly ZinePhoto[]): readonly ZinePhoto[] {
  return pacePhotosForZine(photos);
}

function createPagesFromManualSpreads(
  draft: ZineDraft,
  spreads: readonly ZineManualSpread[],
  includeAddPages: boolean,
) {
  const photoById = new Map(draft.photos.map((photo) => [photo.id, photo]));
  const pages: ZineReaderPage[] = [
    { id: "cover", kind: "cover", density: "hard", title: draft.name, locale: draft.locale },
  ];
  const visibleSpreads = includeAddPages
    ? spreads
    : spreads.filter((spread) => spread.left !== null || spread.right !== null);

  for (const spread of visibleSpreads) {
    pages.push(
      createManualSidePage(draft, spread, "left", pages.length, photoById, includeAddPages),
      createManualSidePage(draft, spread, "right", pages.length + 1, photoById, includeAddPages),
    );
  }
  pages.push({ id: "back", kind: "back", density: "hard", title: draft.name, locale: draft.locale });
  return pages;
}

function createManualSidePage(
  draft: ZineDraft,
  spread: ZineManualSpread,
  side: ZinePageSide,
  pageNumber: number,
  photoById: ReadonlyMap<string, ZinePhoto>,
  includeAddPages: boolean,
): ZineReaderPage {
  const manualPage = spread[side];
  if (manualPage) return manualPageToReaderPage(draft, spread, manualPage, side, pageNumber, photoById);
  if (includeAddPages) {
    return {
      id: `add-${spread.id}-${side}`,
      locale: draft.locale,
      kind: "add",
      density: "soft",
      title: draft.name,
      pageNumber,
      side,
      spreadId: spread.id,
    };
  }
  return {
    id: `blank-${spread.id}-${side}`,
    locale: draft.locale,
    kind: "blank",
    density: "soft",
    title: draft.name,
    pageNumber,
    side,
  };
}

function manualPageToReaderPage(
  draft: ZineDraft,
  spread: ZineManualSpread,
  page: ZineManualPage,
  side: ZinePageSide,
  pageNumber: number,
  photoById: ReadonlyMap<string, ZinePhoto>,
): ZineReaderPage {
  const recipeApplication = page.recipeApplication ?? createReaderRecipeApplication(
    draft,
    page.photoIds.flatMap((id) => {
      const photo = photoById.get(id);
      return photo ? [photo] : [];
    }),
    page.id,
  );
  const visiblePhotoIds = recipeApplication?.scope === "spread"
    ? [spread.left, spread.right]
        .filter((candidate): candidate is ZineManualPage => (
          candidate !== null && recipeApplication.targetPageIds.includes(candidate.id)
        ))
        .flatMap((candidate) => candidate.photoIds)
    : page.photoIds;
  return {
    id: page.id,
    locale: draft.locale,
    kind: "content",
    density: "soft",
    title: draft.name,
    styleId: page.styleId,
    photos: visiblePhotoIds.flatMap((id) => {
      const photo = photoById.get(id);
      return photo ? [photo] : [];
    }),
    pageNumber,
    side,
    recipeApplication,
    authoredTextItems: draft.authoredTextItems ?? [],
  };
}

function createReaderRecipeApplication(
  draft: ZineDraft,
  photos: readonly ZinePhoto[],
  pageId: string,
): RecipeApplication | null {
  if (!draft.styleId) return null;
  const recipe = getRecipeForStyle(draft.styleId);
  if (!recipe) return null;
  return createRecipeApplication({
    recipe,
    content: {
      photoIds: photos.map((photo) => photo.id),
      contentItemIds: createContentItemIds(pageId, photos.length),
      notesByPhotoId: createNotesByPhotoId(draft.photos),
      defaultFocusByPhotoId: createPhotoFocusDefaults(draft.photos),
      authoredTextItems: draft.authoredTextItems ?? [],
    },
    anchorPageId: pageId,
  });
}

function chunk<T>(items: readonly T[], size: number): readonly (readonly T[])[] {
  const groups: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    groups.push(items.slice(index, index + size));
  }
  return groups;
}
