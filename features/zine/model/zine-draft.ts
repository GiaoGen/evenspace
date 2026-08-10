import {
  createInitialManualSpreads,
  ensureTrailingAddSpread,
  photosPerManualPage,
  type ZineManualPage,
  type ZineManualSpread,
  type ZinePageSide,
} from "./zine-manual-layout";

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
  readonly positionX: number;
  readonly positionY: number;
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
      readonly type: "SET_PHOTO_POSITION";
      readonly photoId: string;
      readonly positionX: number;
      readonly positionY: number;
    }
  | { readonly type: "SET_STYLE"; readonly styleId: ZineStyleId }
  | { readonly type: "ADD_MANUAL_PAGE"; readonly spreadId: string; readonly side: ZinePageSide }
  | {
      readonly type: "PLACE_MANUAL_PHOTO";
      readonly pageId: string;
      readonly photoId: string;
      readonly replacePhotoId?: string;
    }
  | { readonly type: "SET_MANUAL_SPREAD_STYLE"; readonly spreadId: string; readonly styleId: ZineStyleId }
  | { readonly type: "GO_TO"; readonly step: ZineStep };

export function zineCreatorReducer(
  state: ZineCreatorState,
  action: ZineCreatorAction,
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
    return {
      ...state,
      draft: {
        ...state.draft,
        photos: state.draft.photos.filter((photo) => photo.id !== action.photoId),
        manualSpreads: state.draft.manualSpreads?.map((spread) => ({
          ...spread,
          left: removePhotoFromManualPage(spread.left, action.photoId),
          right: removePhotoFromManualPage(spread.right, action.photoId),
        })) ?? null,
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

  if (action.type === "SET_PHOTO_POSITION") {
    return {
      ...state,
      draft: {
        ...state.draft,
        photos: state.draft.photos.map((photo) =>
          photo.id === action.photoId
            ? {
                ...photo,
                positionX: clampPercentage(action.positionX),
                positionY: clampPercentage(action.positionY),
              }
            : photo,
        ),
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
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: state.draft.manualSpreads.map((spread) => ({
          ...spread,
          left: placePhotoOnManualPage(spread.left, action),
          right: placePhotoOnManualPage(spread.right, action),
        })),
      },
    };
  }

  if (action.type === "SET_MANUAL_SPREAD_STYLE") {
    if (!state.draft.manualSpreads) return state;
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: state.draft.manualSpreads.map((spread) => spread.id === action.spreadId
          ? {
              ...spread,
              left: setManualPageStyle(spread.left, action.styleId),
              right: setManualPageStyle(spread.right, action.styleId),
            }
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

function countManualPages(spreads: readonly ZineManualSpread[]) {
  return spreads.reduce(
    (count, spread) => count + Number(spread.left !== null) + Number(spread.right !== null),
    0,
  );
}

function removePhotoFromManualPage(page: ZineManualPage | null, photoId: string) {
  return page ? { ...page, photoIds: page.photoIds.filter((id) => id !== photoId) } : null;
}

function placePhotoOnManualPage(
  page: ZineManualPage | null,
  action: Extract<ZineCreatorAction, { type: "PLACE_MANUAL_PHOTO" }>,
) {
  if (!page || page.id !== action.pageId) return page;
  const capacity = photosPerManualPage[page.styleId];
  const withoutIncoming = page.photoIds.filter((id) => id !== action.photoId);
  const replaceIndex = action.replacePhotoId
    ? withoutIncoming.indexOf(action.replacePhotoId)
    : -1;
  if (replaceIndex >= 0) {
    const photoIds = [...withoutIncoming];
    photoIds.splice(replaceIndex, 1, action.photoId);
    return { ...page, photoIds };
  }
  if (withoutIncoming.length < capacity) {
    return { ...page, photoIds: [...withoutIncoming, action.photoId] };
  }
  return { ...page, photoIds: [...withoutIncoming.slice(0, capacity - 1), action.photoId] };
}

function setManualPageStyle(page: ZineManualPage | null, styleId: ZineStyleId) {
  return page
    ? { ...page, styleId, photoIds: page.photoIds.slice(0, photosPerManualPage[styleId]) }
    : null;
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

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}
