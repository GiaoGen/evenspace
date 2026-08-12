import {
  createInitialManualSpreads,
  ensureTrailingAddSpread,
  photosPerManualPage,
  type ZineManualPage,
  type ZineManualSpread,
  type ZinePageSide,
} from "./zine-manual-layout";
import {
  createNotesByPhotoId,
  createRecipeApplication,
  evaluateRecipeCompatibility,
  getRecipeDefinitionByRef,
  getRecipeForStyle,
  getLegacyStyleId,
  type RecipeRef,
  } from "./recipe-contract";
import { getActiveRecipeDefinition } from "./recipe-catalog";
import {
  createContentItemId,
  createPhotoFocusDefaults,
  normalizePlacement,
} from "./recipe-placement";

export const ZINE_NAME_LIMIT = 48;
export const ZINE_CAPTION_LIMIT = 120;

export const zineProgressSteps = ["name", "photos", "style", "review", "reader"] as const;

export type ZineStep = "name" | "photos" | "style" | "manual" | "overview" | "reader";
export type EditableZineStep = Exclude<ZineStep, "reader">;

export const zineStyleIds = ["editorial", "contact", "margin", "split", "night"] as const;
export type ZineStyleId = (typeof zineStyleIds)[number];

export type ZinePhoto = {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly fileName: string;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
  readonly defaultFocusX: number;
  readonly defaultFocusY: number;
};

export type ZineDraft = {
  readonly name: string;
  readonly photos: readonly ZinePhoto[];
  readonly styleId: ZineStyleId | null;
  readonly manualSpreads: readonly ZineManualSpread[] | null;
};

export type ZineCreatorState = {
  readonly step: ZineStep;
  readonly draft: ZineDraft;
};

export const initialZineCreatorState: ZineCreatorState = {
  step: "name",
  draft: {
    name: "",
    photos: [],
    styleId: null,
    manualSpreads: null,
  },
};

export type ZineCreatorAction =
  | { readonly type: "SET_NAME"; readonly value: string }
  | { readonly type: "ADD_PHOTOS"; readonly photos: readonly ZinePhoto[] }
  | { readonly type: "REMOVE_PHOTO"; readonly photoId: string }
  | { readonly type: "SET_CAPTION"; readonly photoId: string; readonly value: string }
  | {
      readonly type: "SET_PLACEMENT_FOCUS";
      readonly pageId: string;
      readonly placementId: string;
      readonly focusX: number;
      readonly focusY: number;
      readonly scale: number;
    }
  | { readonly type: "SET_STYLE"; readonly styleId: ZineStyleId }
  | { readonly type: "ADD_MANUAL_PAGE"; readonly spreadId: string; readonly side: ZinePageSide }
  | {
      readonly type: "PLACE_MANUAL_PHOTO";
      readonly pageId: string;
      readonly photoId: string;
      readonly replacePhotoId?: string;
    }
  | { readonly type: "APPLY_RECIPE"; readonly recipeRef: RecipeRef; readonly pageId: string }
  | { readonly type: "GO_TO"; readonly step: ZineStep };

export type ZineCreatorHistoryState = {
  readonly past: readonly ZineCreatorState[];
  readonly present: ZineCreatorState;
  readonly future: readonly ZineCreatorState[];
};

export type ZineCreatorHistoryAction =
  | ZineCreatorAction
  | { readonly type: "UNDO" }
  | { readonly type: "REDO" };

export const initialZineCreatorHistoryState: ZineCreatorHistoryState = {
  past: [],
  present: initialZineCreatorState,
  future: [],
};

export function zineCreatorReducer(
  state: ZineCreatorState,
  action: ZineCreatorAction,
  resolveRecipe: (ref: RecipeRef) => ReturnType<typeof getActiveRecipeDefinition> = getActiveRecipeDefinition,
): ZineCreatorState {
  if (action.type === "SET_NAME") {
    return {
      ...state,
      draft: { ...state.draft, name: action.value.slice(0, ZINE_NAME_LIMIT) },
    };
  }

  if (action.type === "ADD_PHOTOS") {
    return {
      ...state,
      draft: { ...state.draft, photos: [...state.draft.photos, ...action.photos] },
    };
  }

  if (action.type === "REMOVE_PHOTO") {
    const photos = state.draft.photos.filter((photo) => photo.id !== action.photoId);
    const manualSpreads = state.draft.manualSpreads?.map((spread) => ({
      ...spread,
      left: removePhotoFromManualPage(spread.left, action.photoId, photos),
      right: removePhotoFromManualPage(spread.right, action.photoId, photos),
    })) ?? null;
    return {
      ...state,
      draft: {
        ...state.draft,
        photos,
        manualSpreads: refreshSpreadApplications(manualSpreads, photos),
      },
    };
  }

  if (action.type === "SET_CAPTION") {
    return {
      ...state,
      draft: {
        ...state.draft,
        photos: state.draft.photos.map((photo) =>
          photo.id === action.photoId
            ? { ...photo, caption: action.value.slice(0, ZINE_CAPTION_LIMIT) }
            : photo,
        ),
      },
    };
  }

  if (action.type === "SET_PLACEMENT_FOCUS") {
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: state.draft.manualSpreads?.map((spread) => (
          updatePlacementOnSpread(spread, action)
        )) ?? null,
      },
    };
  }

  if (action.type === "SET_STYLE") {
    return {
      ...state,
      draft: { ...state.draft, styleId: action.styleId, manualSpreads: null },
    };
  }

  if (action.type === "ADD_MANUAL_PAGE") {
    const currentSpreads = state.draft.manualSpreads ?? createInitialManualSpreads(state.draft);
    const nextPageNumber = countManualPages(currentSpreads) + 1;
    const fallbackStyle = state.draft.styleId;
    if (!fallbackStyle) return state;
    const nextSpreads = currentSpreads.map((spread) => {
      if (spread.id !== action.spreadId || spread[action.side] !== null) return spread;
      return {
        ...spread,
        [action.side]: {
          id: `manual-page-${nextPageNumber}`,
          styleId: fallbackStyle,
          photoIds: [],
          contentItemIds: [],
          recipeApplication: createEmptyRecipeApplication(fallbackStyle, `manual-page-${nextPageNumber}`),
        },
      };
    });
    return {
      ...state,
      draft: { ...state.draft, manualSpreads: ensureTrailingAddSpread(nextSpreads) },
    };
  }

  if (action.type === "PLACE_MANUAL_PHOTO") {
    if (!state.draft.manualSpreads) return state;
    const manualSpreads = state.draft.manualSpreads.map((spread) => ({
      ...spread,
      left: placePhotoOnManualPage(spread.left, action, state.draft.photos),
      right: placePhotoOnManualPage(spread.right, action, state.draft.photos),
    }));
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: refreshSpreadApplications(manualSpreads, state.draft.photos),
      },
    };
  }

  if (action.type === "APPLY_RECIPE") {
    if (!state.draft.manualSpreads) return state;
    const recipe = resolveRecipe(action.recipeRef);
    if (!recipe) return state;
    const containingSpread = state.draft.manualSpreads.find((spread) => (
      spread.left?.id === action.pageId || spread.right?.id === action.pageId
    ));
    if (!containingSpread) return state;
    if (recipe.scope === "spread" && (containingSpread.left === null || containingSpread.right === null)) {
      return state;
    }
    const targetPages = recipe.scope === "spread"
      ? [containingSpread.left, containingSpread.right].filter((page) => page !== null)
      : [containingSpread.left?.id === action.pageId ? containingSpread.left : containingSpread.right].filter(
          (page) => page !== null,
        );
    const contentPages = recipe.scope === "spread"
      ? targetPages
      : targetPages.slice(0, 1);
    const photoIds = contentPages.flatMap((page) => page.photoIds);
    const contentItemIds = contentPages.flatMap((page) => page.contentItemIds);
    const compatibility = evaluateRecipeCompatibility(recipe, {
      photoIds,
      notesByPhotoId: createNotesByPhotoId(state.draft.photos),
    });
    if (!compatibility.valid) return state;
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds,
        contentItemIds,
        notesByPhotoId: createNotesByPhotoId(state.draft.photos),
        defaultFocusByPhotoId: createPhotoFocusDefaults(state.draft.photos),
      },
      anchorPageId: action.pageId,
      targetPageIds: targetPages.map((page) => page.id),
      previousApplications: contentPages.flatMap((page) => page.recipeApplication ? [page.recipeApplication] : []),
    });
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: state.draft.manualSpreads.map((spread) => spread.id === containingSpread.id
          ? applyRecipeToSpreadPages(spread, getLegacyStyleId(recipe) ?? spread.left?.styleId ?? spread.right?.styleId ?? "editorial", application, recipe.scope === "spread")
          : spread),
      },
    };
  }

  if (action.type === "GO_TO") {
    if (action.step === "manual" && state.draft.manualSpreads === null) {
      return {
        ...state,
        step: action.step,
        draft: { ...state.draft, manualSpreads: createInitialManualSpreads(state.draft) },
      };
    }
    return { ...state, step: action.step };
  }
  return state;
}

export function zineCreatorHistoryReducer(
  state: ZineCreatorHistoryState,
  action: ZineCreatorHistoryAction,
): ZineCreatorHistoryState {
  if (action.type === "UNDO") {
    const previous = state.past.at(-1);
    if (!previous) return state;
    return {
      past: state.past.slice(0, -1),
      present: previous,
      future: [state.present, ...state.future],
    };
  }
  if (action.type === "REDO") {
    const next = state.future[0];
    if (!next) return state;
    return {
      past: [...state.past, state.present],
      present: next,
      future: state.future.slice(1),
    };
  }

  const next = zineCreatorReducer(state.present, action);
  if (next === state.present) return state;
  if (!isUndoableZineAction(action)) return { ...state, present: next };
  return {
    past: [...state.past, state.present],
    present: next,
    future: [],
  };
}

function isUndoableZineAction(action: ZineCreatorAction) {
  return action.type === "APPLY_RECIPE"
    || action.type === "PLACE_MANUAL_PHOTO"
    || action.type === "SET_PLACEMENT_FOCUS"
    || action.type === "ADD_MANUAL_PAGE";
}

function countManualPages(spreads: readonly ZineManualSpread[]) {
  return spreads.reduce(
    (count, spread) => count + Number(spread.left !== null) + Number(spread.right !== null),
    0,
  );
}

function removePhotoFromManualPage(
  page: ZineManualPage | null,
  photoId: string,
  photos: readonly ZinePhoto[],
) {
  if (!page) return null;
  return refreshPagePhotoEntries(
    page,
    getPagePhotoEntries(page).filter((entry) => entry.photoId !== photoId),
    photos,
  );
}

function placePhotoOnManualPage(
  page: ZineManualPage | null,
  action: Extract<ZineCreatorAction, { type: "PLACE_MANUAL_PHOTO" }>,
  photos: readonly ZinePhoto[],
) {
  if (!page || page.id !== action.pageId) return page;
  const capacity = photosPerManualPage[page.styleId];
  const incomingEntry = getPagePhotoEntries(page).find((entry) => entry.photoId === action.photoId);
  const withoutIncoming = getPagePhotoEntries(page).filter((entry) => entry.photoId !== action.photoId);
  const replaceIndex = action.replacePhotoId
    ? withoutIncoming.findIndex((entry) => entry.photoId === action.replacePhotoId)
    : -1;
  const replacementEntry = incomingEntry ?? {
    photoId: action.photoId,
    contentItemId: createContentItemId(page.id, page.contentItemIds.length),
  };
  if (replaceIndex >= 0) {
    const entries = [...withoutIncoming];
    entries.splice(replaceIndex, 1, replacementEntry);
    return refreshPagePhotoEntries(page, entries, photos);
  }
  if (withoutIncoming.length < capacity) {
    return refreshPagePhotoEntries(page, [...withoutIncoming, replacementEntry], photos);
  }
  return refreshPagePhotoEntries(
    page,
    [...withoutIncoming.slice(0, capacity - 1), replacementEntry],
    photos,
  );
}

function getPagePhotoEntries(page: ZineManualPage) {
  return page.photoIds.map((photoId, index) => ({
    photoId,
    contentItemId: page.contentItemIds[index] ?? createContentItemId(page.id, index),
  }));
}

function refreshPagePhotoEntries(
  page: ZineManualPage,
  entries: readonly { readonly photoId: string; readonly contentItemId: string }[],
  photos: readonly ZinePhoto[],
) {
  return refreshPagePhotoIds(
    page,
    entries.map((entry) => entry.photoId),
    photos,
    entries.map((entry) => entry.contentItemId),
  );
}

function refreshPagePhotoIds(
  page: ZineManualPage,
  photoIds: readonly string[],
  photos: readonly ZinePhoto[],
  explicitContentItemIds?: readonly string[],
) {
  const contentItemIds = photoIds.map((_, index) => (
    explicitContentItemIds?.[index] ?? page.contentItemIds[index] ?? createContentItemId(page.id, index)
  ));
  if (!page.recipeApplication || page.recipeApplication.scope === "spread") {
    return { ...page, photoIds, contentItemIds };
  }
  const recipe = getRecipeDefinitionByRef({
    id: page.recipeApplication.recipeId,
    version: page.recipeApplication.recipeVersion,
  });
  if (!recipe) return { ...page, photoIds };
  return {
    ...page,
    photoIds,
    contentItemIds,
    recipeApplication: createRecipeApplication({
      recipe,
      content: {
        photoIds,
        contentItemIds,
        notesByPhotoId: createNotesByPhotoId(photos),
        defaultFocusByPhotoId: createPhotoFocusDefaults(photos),
      },
      anchorPageId: page.recipeApplication.anchorPageId,
      targetPageIds: page.recipeApplication.targetPageIds,
      previousApplications: [page.recipeApplication],
    }),
  };
}

function refreshSpreadApplications(
  spreads: readonly ZineManualSpread[] | null,
  photos: readonly ZinePhoto[],
) {
  if (!spreads) return null;
  return spreads.map((spread) => {
    const application = spread.left?.recipeApplication?.scope === "spread"
      ? spread.left.recipeApplication
      : spread.right?.recipeApplication?.scope === "spread"
        ? spread.right.recipeApplication
        : null;
    if (!application) return spread;
    const recipe = getRecipeDefinitionByRef({
      id: application.recipeId,
      version: application.recipeVersion,
    });
    if (!recipe) return spread;
    const targetPages = [spread.left, spread.right].filter((page): page is ZineManualPage => (
      page !== null
      && application.targetPageIds.includes(page.id)
      && hasSameRecipeApplicationIdentity(page.recipeApplication, application)
    ));
    if (targetPages.length !== application.targetPageIds.length) return spread;
    const nextApplication = createRecipeApplication({
      recipe,
      content: {
        photoIds: targetPages.flatMap((page) => page.photoIds),
        contentItemIds: targetPages.flatMap((page) => page.contentItemIds),
        notesByPhotoId: createNotesByPhotoId(photos),
        defaultFocusByPhotoId: createPhotoFocusDefaults(photos),
      },
      anchorPageId: application.anchorPageId,
      targetPageIds: application.targetPageIds,
      previousApplications: targetPages.flatMap((page) => page.recipeApplication ? [page.recipeApplication] : []),
    });
    return {
      ...spread,
      left: spread.left && application.targetPageIds.includes(spread.left.id) && hasSameRecipeApplicationIdentity(spread.left.recipeApplication, application)
        ? { ...spread.left, recipeApplication: nextApplication }
        : spread.left,
      right: spread.right && application.targetPageIds.includes(spread.right.id) && hasSameRecipeApplicationIdentity(spread.right.recipeApplication, application)
        ? { ...spread.right, recipeApplication: nextApplication }
        : spread.right,
    };
  });
}

function createEmptyRecipeApplication(styleId: ZineStyleId, pageId: string) {
  const recipe = getRecipeForStyle(styleId);
  return recipe
    ? createRecipeApplication({ recipe, content: { photoIds: [], notesByPhotoId: {} }, anchorPageId: pageId })
    : null;
}

function updatePlacementOnSpread(
  spread: ZineManualSpread,
  action: Extract<ZineCreatorAction, { type: "SET_PLACEMENT_FOCUS" }>,
) {
  const anchorPage = spread.left?.id === action.pageId ? spread.left : spread.right?.id === action.pageId ? spread.right : null;
  const application = anchorPage?.recipeApplication;
  if (!application) return spread;
  const targetPageIds = application.scope === "spread"
    ? application.targetPageIds
    : [action.pageId];
  const nextApplication = {
    ...application,
    assignments: application.assignments.map((assignment) => assignment.placementId === action.placementId
      ? { ...assignment, ...normalizePlacement(action, assignment) }
      : assignment),
  };
  return {
    ...spread,
    left: spread.left && targetPageIds.includes(spread.left.id) && hasSameRecipeApplicationIdentity(spread.left.recipeApplication, application)
      ? { ...spread.left, recipeApplication: nextApplication }
      : spread.left,
    right: spread.right && targetPageIds.includes(spread.right.id) && hasSameRecipeApplicationIdentity(spread.right.recipeApplication, application)
      ? { ...spread.right, recipeApplication: nextApplication }
      : spread.right,
  };
}

function hasSameRecipeApplicationIdentity(
  candidate: ZineManualPage["recipeApplication"],
  expected: NonNullable<ZineManualPage["recipeApplication"]>,
) {
  return candidate?.recipeId === expected.recipeId
    && candidate.recipeVersion === expected.recipeVersion;
}

function applyRecipeToSpreadPages(
  spread: ZineManualSpread,
  styleId: ZineStyleId,
  application: ReturnType<typeof createRecipeApplication>,
  applyBoth: boolean,
) {
  return {
    ...spread,
    left: spread.left && (applyBoth || spread.left.id === application.anchorPageId)
      ? { ...spread.left, styleId, recipeApplication: application }
      : spread.left,
    right: spread.right && (applyBoth || spread.right.id === application.anchorPageId)
      ? { ...spread.right, styleId, recipeApplication: application }
      : spread.right,
  };
}

/**
 * Balances visual weight across two horizontal lanes. This is deliberately a
 * presentation-only grouping: neither lane nor card position defines reader order.
 */
export function splitPhotosIntoVisualRows(
  photos: readonly ZinePhoto[],
): readonly [readonly ZinePhoto[], readonly ZinePhoto[]] {
  const rows: [ZinePhoto[], ZinePhoto[]] = [[], []];
  const weights = [0, 0];

  for (const photo of photos) {
    const rowIndex = weights[0] <= weights[1] ? 0 : 1;
    rows[rowIndex].push(photo);
    weights[rowIndex] += getVisualWidthWeight(photo);
  }

  return rows;
}

function getVisualWidthWeight(photo: Pick<ZinePhoto, "width" | "height">) {
  const ratio = photo.height > 0 ? photo.width / photo.height : 1;
  return Math.min(1.75, Math.max(0.72, ratio)) + 0.12;
}
