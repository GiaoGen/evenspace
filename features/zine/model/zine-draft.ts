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
    return { ...state, draft: { ...state.draft, styleId: action.styleId } };
  }

  if (action.type === "GO_TO") return { ...state, step: action.step };
  return state;
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
