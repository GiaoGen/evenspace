import {
  createInitialManualSpreads,
  ensureTrailingAddSpread,
  findManualPage,
  photosPerManualPage,
  type ZineManualPage,
  type ZineManualSpread,
  type ZinePageSide,
} from "./zine-manual-layout";
import {
  createNotesByPhotoId,
  createRecipeApplication,
  evaluateRecipeCompatibility,
  evaluateRecipeCompatibilityWithManualPhotoTolerance,
  getRecipeForStyle,
  getLegacyStyleId,
  createAuthoredTextOwner,
  selectAuthoredTextItemsForOwner,
  validateAuthoredTextItems,
  type AuthoredTextItem,
  type RecipeContent,
  type RecipeDefinition,
  type RecipeApplication,
  type RecipeRef,
  } from "./recipe-contract";
import { productionRecipeRuntimePolicy, type RecipeRuntimeResolver } from "./recipe-catalog";
import {
  createContentItemId,
  createPhotoFocusDefaults,
  createPlacementId,
  normalizePlacement,
} from "./recipe-placement";

export const ZINE_NAME_LIMIT = 48;
export const ZINE_CAPTION_LIMIT = 120;
export const ZINE_LOCALES = ["en", "zh-Hans", "zh-Hant"] as const;
export type ZineLocale = (typeof ZINE_LOCALES)[number];

export function isZineLocale(value: unknown): value is ZineLocale {
  return (ZINE_LOCALES as readonly unknown[]).includes(value);
}

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
  readonly locale: ZineLocale;
  readonly photos: readonly ZinePhoto[];
  readonly styleId: ZineStyleId | null;
  readonly manualSpreads: readonly ZineManualSpread[] | null;
  /** Optional keeps old drafts readable while authored text rolls out. */
  readonly authoredTextItems?: readonly AuthoredTextItem[];
};

export type ZineCreatorState = {
  readonly step: ZineStep;
  readonly draft: ZineDraft;
};

export const initialZineCreatorState: ZineCreatorState = {
  step: "name",
  draft: {
    name: "",
    locale: "en",
    photos: [],
    styleId: null,
    manualSpreads: null,
  },
};

export type ZineCreatorAction =
  | { readonly type: "SET_NAME"; readonly value: string }
  | { readonly type: "SET_LOCALE"; readonly locale: ZineLocale }
  | { readonly type: "ADD_PHOTOS"; readonly photos: readonly ZinePhoto[] }
  | { readonly type: "REMOVE_PHOTO"; readonly photoId: string }
  | { readonly type: "SET_CAPTION"; readonly photoId: string; readonly value: string }
  | { readonly type: "UPSERT_AUTHORED_TEXT"; readonly item: AuthoredTextItem }
  | { readonly type: "UPDATE_AUTHORED_TEXT"; readonly textContentId: string; readonly text: string }
  | { readonly type: "DELETE_AUTHORED_TEXT"; readonly textContentId: string }
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
  | {
      readonly type: "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT";
      readonly pageId: string;
      readonly recipeRef: RecipeRef;
      readonly photoSlotId: string;
      readonly photoId: string;
    }
  | {
      readonly type: "REMOVE_MANUAL_RECIPE_PHOTO";
      readonly pageId: string;
      readonly placementId: string;
      readonly photoSlotId: string;
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

/**
 * One content/owner construction path for the menu and reducer.  Keeping this
 * here makes page/spread identity and authored-text diagnostics identical at
 * preview time and apply time.
 */
export function createRecipeContentForManualPages({
  recipe,
  anchorPageId,
  targetPages,
  photos,
  authoredTextItems,
}: {
  readonly recipe: RecipeDefinition;
  readonly anchorPageId: string;
  readonly targetPages: readonly ZineManualPage[];
  readonly photos: readonly ZinePhoto[];
  readonly authoredTextItems: readonly AuthoredTextItem[];
}): RecipeContent {
  const targetPageIds = targetPages.map((page) => page.id);
  const owner = createAuthoredTextOwner(recipe.scope, anchorPageId, targetPageIds);
  return {
    photoIds: targetPages.flatMap((page) => page.photoIds),
    contentItemIds: targetPages.flatMap((page) => page.contentItemIds),
    notesByPhotoId: createNotesByPhotoId(photos),
    defaultFocusByPhotoId: createPhotoFocusDefaults(photos),
    authoredTextItems: selectAuthoredTextItemsForOwner(authoredTextItems, owner),
    owner,
  };
}

export function createManualRecipeApplicationContext({
  recipe,
  manualSpreads,
  anchorPageId,
  photos,
  authoredTextItems,
}: {
  readonly recipe: RecipeDefinition;
  readonly manualSpreads: readonly ZineManualSpread[];
  readonly anchorPageId: string;
  readonly photos: readonly ZinePhoto[];
  readonly authoredTextItems: readonly AuthoredTextItem[];
}) {
  const containingSpread = manualSpreads.find((spread) => (
    spread.left?.id === anchorPageId || spread.right?.id === anchorPageId
  ));
  if (!containingSpread) return null;
  if (recipe.scope === "spread" && (containingSpread.left === null || containingSpread.right === null)) {
    return null;
  }
  const targetPages = recipe.scope === "spread"
    ? [containingSpread.left!, containingSpread.right!]
    : [containingSpread.left?.id === anchorPageId ? containingSpread.left : containingSpread.right]
      .filter((page): page is ZineManualPage => page !== null);
  const contentPages = recipe.scope === "spread" ? targetPages : targetPages.slice(0, 1);
  return {
    containingSpread,
    targetPages,
    contentPages,
    targetPageIds: targetPages.map((page) => page.id),
    content: createRecipeContentForManualPages({
      recipe,
      anchorPageId,
      targetPages: contentPages,
      photos,
      authoredTextItems,
    }),
  };
}

export type ManualRecipeApplicability = {
  readonly canApplyInManualEditor: boolean;
  readonly completionCompatibility: ReturnType<typeof evaluateRecipeCompatibility>;
  readonly manualCompatibility: ReturnType<typeof evaluateRecipeCompatibility>;
  readonly photoDeficit: number;
  readonly photoExcess: number;
  readonly emptyPhotoSlotIds: readonly string[];
  readonly reason: string | null;
};

/**
 * The only manual-only relaxation: photo count is allowed to be incomplete or
 * excessive while Definition, notes and authored-content diagnostics remain
 * Contract-strict.  Reducer and menu both use this result.
 */
export function getManualRecipeApplicability({
  recipe,
  focusedPage,
  draft,
}: {
  readonly recipe: RecipeDefinition;
  readonly focusedPage: ZineManualPage | null;
  readonly draft: ZineDraft;
}): ManualRecipeApplicability {
  if (!focusedPage || !draft.manualSpreads) {
    const compatibility = { code: "incompatible" as const, valid: false, reason: "Focus a page first.", hiddenNotePhotoIds: [] };
    return {
      canApplyInManualEditor: false,
      completionCompatibility: compatibility,
      manualCompatibility: compatibility,
      photoDeficit: 0,
      photoExcess: 0,
      emptyPhotoSlotIds: [],
      reason: compatibility.reason,
    };
  }
  const context = createManualRecipeApplicationContext({
    recipe,
    manualSpreads: draft.manualSpreads,
    anchorPageId: focusedPage.id,
    photos: draft.photos,
    authoredTextItems: draft.authoredTextItems ?? [],
  });
  if (!context) {
    const compatibility = { code: "incompatible" as const, valid: false, reason: "A spread Recipe needs both pages.", hiddenNotePhotoIds: [] };
    return {
      canApplyInManualEditor: false,
      completionCompatibility: compatibility,
      manualCompatibility: compatibility,
      photoDeficit: 0,
      photoExcess: 0,
      emptyPhotoSlotIds: [],
      reason: compatibility.reason,
    };
  }
  const photoSlots = recipe.slots.filter((slot) => slot.kind === "photo");
  const photoCount = context.content.photoIds.length;
  const completionCompatibility = evaluateRecipeCompatibility(recipe, context.content);
  const manualCompatibility = evaluateRecipeCompatibilityWithManualPhotoTolerance(recipe, context.content);
  const photoDeficit = Math.max(0, photoSlots.length - photoCount);
  const photoExcess = Math.max(0, photoCount - photoSlots.length);
  return {
    canApplyInManualEditor: manualCompatibility.valid,
    completionCompatibility,
    manualCompatibility,
    photoDeficit,
    photoExcess,
    emptyPhotoSlotIds: photoSlots.slice(Math.min(photoCount, photoSlots.length)).map((slot) => slot.id),
    reason: manualCompatibility.reason,
  };
}

export function zineCreatorReducer(
  state: ZineCreatorState,
  action: ZineCreatorAction,
  resolveRecipe: RecipeRuntimeResolver = productionRecipeRuntimePolicy.resolve,
): ZineCreatorState {
  if (action.type === "UPSERT_AUTHORED_TEXT") {
    const authoredTextItems = state.draft.authoredTextItems ?? [];
    if (validateAuthoredTextItems(authoredTextItems).length > 0) return state;
    if (validateAuthoredTextItems([action.item]).length > 0) return state;
    const existingIndex = authoredTextItems.findIndex((item) => item.id === action.item.id);
    const nextItems = existingIndex < 0
      ? [...authoredTextItems, action.item]
      : authoredTextItems.map((item, index) => index === existingIndex ? action.item : item);
    if (validateAuthoredTextItems(nextItems).length > 0) return state;
    const manualSpreads = rebuildAuthoredTextApplications(
      state.draft.manualSpreads,
      state.draft.photos,
      nextItems,
      action.item.id,
      resolveRecipe,
    );
    if (state.draft.manualSpreads !== null && manualSpreads === null) return state;
    return {
      ...state,
      draft: {
        ...state.draft,
        authoredTextItems: nextItems,
        manualSpreads,
      },
    };
  }

  if (action.type === "UPDATE_AUTHORED_TEXT") {
    const authoredTextItems = state.draft.authoredTextItems ?? [];
    if (typeof action.text !== "string") return state;
    if (validateAuthoredTextItems(authoredTextItems).length > 0) return state;
    if (!authoredTextItems.some((item) => item.id === action.textContentId)) return state;
    const nextItems = authoredTextItems.map((item) => item.id === action.textContentId
      ? { ...item, text: action.text }
      : item);
    if (validateAuthoredTextItems(nextItems).length > 0) return state;
    const manualSpreads = rebuildAuthoredTextApplications(
      state.draft.manualSpreads,
      state.draft.photos,
      nextItems,
      action.textContentId,
      resolveRecipe,
    );
    if (state.draft.manualSpreads !== null && manualSpreads === null) return state;
    return {
      ...state,
      draft: {
        ...state.draft,
        authoredTextItems: nextItems,
        manualSpreads,
      },
    };
  }

  if (action.type === "DELETE_AUTHORED_TEXT") {
    const authoredTextItems = state.draft.authoredTextItems ?? [];
    if (validateAuthoredTextItems(authoredTextItems).length > 0) return state;
    if (!authoredTextItems.some((item) => item.id === action.textContentId)) return state;
    const nextItems = authoredTextItems.filter((item) => item.id !== action.textContentId);
    const manualSpreads = rebuildAuthoredTextApplications(
      state.draft.manualSpreads,
      state.draft.photos,
      nextItems,
      action.textContentId,
      resolveRecipe,
    );
    if (state.draft.manualSpreads !== null && manualSpreads === null) return state;
    return {
      ...state,
      draft: {
        ...state.draft,
        authoredTextItems: nextItems,
        manualSpreads,
      },
    };
  }

  if (action.type === "SET_NAME") {
    return {
      ...state,
      draft: { ...state.draft, name: action.value.slice(0, ZINE_NAME_LIMIT) },
    };
  }

  if (action.type === "SET_LOCALE") {
    if (!isZineLocale(action.locale)) return state;
    return {
      ...state,
      draft: { ...state.draft, locale: action.locale },
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
      left: removePhotoFromManualPage(spread.left, action.photoId, photos, state.draft.authoredTextItems ?? [], resolveRecipe),
      right: removePhotoFromManualPage(spread.right, action.photoId, photos, state.draft.authoredTextItems ?? [], resolveRecipe),
    })) ?? null;
    return {
      ...state,
      draft: {
        ...state.draft,
        photos,
        manualSpreads: refreshSpreadApplications(manualSpreads, photos, state.draft.authoredTextItems ?? [], resolveRecipe),
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
          recipeApplication: createEmptyRecipeApplication(
            fallbackStyle,
            `manual-page-${nextPageNumber}`,
            state.draft.authoredTextItems ?? [],
          ),
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
      left: placePhotoOnManualPage(spread.left, action, state.draft.photos, state.draft.authoredTextItems ?? [], resolveRecipe),
      right: placePhotoOnManualPage(spread.right, action, state.draft.photos, state.draft.authoredTextItems ?? [], resolveRecipe),
    }));
    return {
      ...state,
      draft: {
        ...state.draft,
        manualSpreads: refreshSpreadApplications(manualSpreads, state.draft.photos, state.draft.authoredTextItems ?? [], resolveRecipe),
      },
    };
  }

  if (action.type === "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT") {
    return placePhotoInManualRecipeSlot(state, action, resolveRecipe);
  }

  if (action.type === "REMOVE_MANUAL_RECIPE_PHOTO") {
    return removePhotoFromManualRecipeSlot(state, action);
  }

  if (action.type === "APPLY_RECIPE") {
    if (!state.draft.manualSpreads) return state;
    const recipe = resolveRecipe(action.recipeRef);
    if (!recipe) return state;
    const focusedPage = findManualPage(state.draft.manualSpreads, action.pageId);
    const applicability = getManualRecipeApplicability({ recipe, focusedPage, draft: state.draft });
    const context = createManualRecipeApplicationContext({
      recipe,
      manualSpreads: state.draft.manualSpreads,
      anchorPageId: action.pageId,
      photos: state.draft.photos,
      authoredTextItems: state.draft.authoredTextItems ?? [],
    });
    if (!context) return state;
    const { containingSpread, contentPages, targetPageIds, content } = context;
    if (!applicability.canApplyInManualEditor) return state;
    const application = createRecipeApplication({
      recipe,
      content,
      anchorPageId: action.pageId,
      targetPageIds,
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
  resolveRecipe: RecipeRuntimeResolver = productionRecipeRuntimePolicy.resolve,
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

  const next = zineCreatorReducer(state.present, action, resolveRecipe);
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
    || action.type === "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT"
    || action.type === "REMOVE_MANUAL_RECIPE_PHOTO"
    || action.type === "SET_PLACEMENT_FOCUS"
    || action.type === "ADD_MANUAL_PAGE"
    || action.type === "UPSERT_AUTHORED_TEXT"
    || action.type === "UPDATE_AUTHORED_TEXT"
    || action.type === "DELETE_AUTHORED_TEXT";
}

function placePhotoInManualRecipeSlot(
  state: ZineCreatorState,
  action: Extract<ZineCreatorAction, { type: "PLACE_MANUAL_PHOTO_IN_RECIPE_SLOT" }>,
  resolveRecipe: RecipeRuntimeResolver,
): ZineCreatorState {
  const spreads = state.draft.manualSpreads;
  if (!spreads || !state.draft.photos.some((photo) => photo.id === action.photoId)) return state;
  const spread = spreads.find((candidate) => candidate.left?.id === action.pageId || candidate.right?.id === action.pageId);
  const page = spread?.left?.id === action.pageId ? spread.left : spread?.right?.id === action.pageId ? spread.right : null;
  const application = page?.recipeApplication;
  if (!spread || !page || !application
    || application.recipeId !== action.recipeRef.id
    || application.recipeVersion !== action.recipeRef.version
    || !application.targetPageIds.includes(action.pageId)) return state;
  const recipe = resolveRecipe(action.recipeRef);
  const photoSlots = recipe?.slots.filter((slot) => slot.kind === "photo") ?? [];
  if (!recipe || !photoSlots.some((slot) => slot.id === action.photoSlotId)) return state;

  const target = application.assignments.find((assignment) => assignment.photoSlotId === action.photoSlotId);
  const source = application.assignments.find((assignment) => assignment.photoId === action.photoId);
  const retained = application.assignments.filter((assignment) => assignment !== target && assignment !== source);
  const slotIndex = photoSlots.findIndex((slot) => slot.id === action.photoSlotId);
  const photo = state.draft.photos.find((candidate) => candidate.id === action.photoId)!;
  const relation = recipe.noteRelations.find((candidate) => candidate.photoSlotId === action.photoSlotId);
  const contentItemId = target?.contentItemId ?? source?.contentItemId ?? createContentItemId(application.anchorPageId, slotIndex);
  const placement = normalizePlacement(source ?? undefined, {
    focusX: photo.defaultFocusX,
    focusY: photo.defaultFocusY,
  });
  const nextAssignment = {
    placementId: target?.placementId ?? source?.placementId ?? createPlacementId(contentItemId),
    contentItemId,
    photoSlotId: action.photoSlotId,
    photoId: action.photoId,
    ...placement,
    noteSlotId: photo.caption.trim() ? relation?.noteSlotId : undefined,
    noteOfPhotoId: photo.caption.trim() ? action.photoId : undefined,
  };
  const displacedPhotoId = target?.photoId;
  const nextApplication: RecipeApplication = {
    ...application,
    assignments: [...retained, nextAssignment],
    unplacedPhotoIds: [...new Set([
      ...application.unplacedPhotoIds.filter((photoId) => photoId !== action.photoId),
      ...(displacedPhotoId && displacedPhotoId !== action.photoId ? [displacedPhotoId] : []),
    ])],
  };
  return replaceManualApplication(state, spread.id, application, nextApplication, (candidate) => {
    const entries = getPagePhotoEntries(candidate)
      .filter((entry) => entry.photoId !== displacedPhotoId || displacedPhotoId === action.photoId);
    const alreadyHasPhoto = entries.some((entry) => entry.photoId === action.photoId);
    const nextEntries = candidate.id === action.pageId && !alreadyHasPhoto
      ? [...entries, { photoId: action.photoId, contentItemId }]
      : entries;
    return { ...candidate, photoIds: nextEntries.map((entry) => entry.photoId), contentItemIds: nextEntries.map((entry) => entry.contentItemId) };
  });
}

function removePhotoFromManualRecipeSlot(
  state: ZineCreatorState,
  action: Extract<ZineCreatorAction, { type: "REMOVE_MANUAL_RECIPE_PHOTO" }>,
): ZineCreatorState {
  const spreads = state.draft.manualSpreads;
  if (!spreads) return state;
  const spread = spreads.find((candidate) => candidate.left?.id === action.pageId || candidate.right?.id === action.pageId);
  const page = spread?.left?.id === action.pageId ? spread.left : spread?.right?.id === action.pageId ? spread.right : null;
  const application = page?.recipeApplication;
  const assignment = application?.assignments.find((candidate) => (
    candidate.placementId === action.placementId && candidate.photoSlotId === action.photoSlotId
  ));
  if (!spread || !page || !application || !assignment || !application.targetPageIds.includes(action.pageId)) return state;
  const nextApplication: RecipeApplication = {
    ...application,
    assignments: application.assignments.filter((candidate) => candidate !== assignment),
    unplacedPhotoIds: [...new Set([...application.unplacedPhotoIds, assignment.photoId])],
  };
  return replaceManualApplication(state, spread.id, application, nextApplication, (candidate) => {
    const entries = getPagePhotoEntries(candidate).filter((entry) => entry.photoId !== assignment.photoId);
    return { ...candidate, photoIds: entries.map((entry) => entry.photoId), contentItemIds: entries.map((entry) => entry.contentItemId) };
  });
}

function replaceManualApplication(
  state: ZineCreatorState,
  spreadId: string,
  previous: RecipeApplication,
  next: RecipeApplication,
  updatePage: (page: ZineManualPage) => ZineManualPage,
): ZineCreatorState {
  return {
    ...state,
    draft: {
      ...state.draft,
      manualSpreads: state.draft.manualSpreads?.map((spread) => spread.id !== spreadId ? spread : {
        ...spread,
        left: spread.left && spread.left.recipeApplication === previous
          ? { ...updatePage(spread.left), recipeApplication: next }
          : spread.left,
        right: spread.right && spread.right.recipeApplication === previous
          ? { ...updatePage(spread.right), recipeApplication: next }
          : spread.right,
      }) ?? null,
    },
  };
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
  authoredTextItems: readonly AuthoredTextItem[],
  resolveRecipe: RecipeRuntimeResolver,
) {
  if (!page) return null;
  return refreshPagePhotoEntries(
    page,
    getPagePhotoEntries(page).filter((entry) => entry.photoId !== photoId),
    photos,
    authoredTextItems,
    resolveRecipe,
  );
}

function placePhotoOnManualPage(
  page: ZineManualPage | null,
  action: Extract<ZineCreatorAction, { type: "PLACE_MANUAL_PHOTO" }>,
  photos: readonly ZinePhoto[],
  authoredTextItems: readonly AuthoredTextItem[],
  resolveRecipe: RecipeRuntimeResolver,
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
    return refreshPagePhotoEntries(page, entries, photos, authoredTextItems, resolveRecipe);
  }
  if (withoutIncoming.length < capacity) {
    return refreshPagePhotoEntries(page, [...withoutIncoming, replacementEntry], photos, authoredTextItems, resolveRecipe);
  }
  return refreshPagePhotoEntries(
    page,
    [...withoutIncoming.slice(0, capacity - 1), replacementEntry],
    photos,
    authoredTextItems,
    resolveRecipe,
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
  authoredTextItems: readonly AuthoredTextItem[],
  resolveRecipe: RecipeRuntimeResolver,
) {
  return refreshPagePhotoIds(
    page,
    entries.map((entry) => entry.photoId),
    photos,
    entries.map((entry) => entry.contentItemId),
    authoredTextItems,
    resolveRecipe,
  );
}

function refreshPagePhotoIds(
  page: ZineManualPage,
  photoIds: readonly string[],
  photos: readonly ZinePhoto[],
  explicitContentItemIds?: readonly string[],
  authoredTextItems: readonly AuthoredTextItem[] = [],
  resolveRecipe: RecipeRuntimeResolver = productionRecipeRuntimePolicy.resolve,
) {
  const contentItemIds = photoIds.map((_, index) => (
    explicitContentItemIds?.[index] ?? page.contentItemIds[index] ?? createContentItemId(page.id, index)
  ));
  if (!page.recipeApplication || page.recipeApplication.scope === "spread") {
    return { ...page, photoIds, contentItemIds };
  }
  const recipe = resolveRecipe({
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
      content: createRecipeContentForManualPages({
        recipe,
        anchorPageId: page.recipeApplication.anchorPageId,
        targetPages: [{ ...page, photoIds, contentItemIds }],
        photos,
        authoredTextItems,
      }),
      anchorPageId: page.recipeApplication.anchorPageId,
      targetPageIds: page.recipeApplication.targetPageIds,
      previousApplications: [page.recipeApplication],
    }),
  };
}

function refreshSpreadApplications(
  spreads: readonly ZineManualSpread[] | null,
  photos: readonly ZinePhoto[],
  authoredTextItems: readonly AuthoredTextItem[] = [],
  resolveRecipe: RecipeRuntimeResolver = productionRecipeRuntimePolicy.resolve,
) {
  if (!spreads) return null;
  return spreads.map((spread) => {
    const application = spread.left?.recipeApplication?.scope === "spread"
      ? spread.left.recipeApplication
      : spread.right?.recipeApplication?.scope === "spread"
        ? spread.right.recipeApplication
        : null;
    if (!application) return spread;
    const recipe = resolveRecipe({
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
      content: createRecipeContentForManualPages({
        recipe,
        anchorPageId: application.anchorPageId,
        targetPages,
        photos,
        authoredTextItems,
      }),
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

function createEmptyRecipeApplication(
  styleId: ZineStyleId,
  pageId: string,
  authoredTextItems: readonly AuthoredTextItem[],
) {
  const recipe = getRecipeForStyle(styleId);
  return recipe
    ? createRecipeApplication({
        recipe,
        content: {
          photoIds: [],
          notesByPhotoId: {},
          authoredTextItems,
          owner: createAuthoredTextOwner("page", pageId, [pageId]),
        },
        anchorPageId: pageId,
      })
    : null;
}

function rebuildAuthoredTextApplications(
  spreads: readonly ZineManualSpread[] | null,
  photos: readonly ZinePhoto[],
  authoredTextItems: readonly AuthoredTextItem[],
  changedTextContentId: string,
  resolveRecipe: RecipeRuntimeResolver,
) {
  if (!spreads) return null;
  let rejected = false;
  const nextSpreads = spreads.map((spread) => {
    const spreadApplication = spread.left?.recipeApplication?.scope === "spread"
      ? spread.left.recipeApplication
      : spread.right?.recipeApplication?.scope === "spread"
        ? spread.right.recipeApplication
        : null;
    if (spreadApplication) {
      const nextApplication = rebuildAuthoredTextApplication({
        spread,
        application: spreadApplication,
        photos,
        authoredTextItems,
        changedTextContentId,
        resolveRecipe,
      });
      if (!nextApplication) {
        rejected = true;
        return spread;
      }
      return replaceSharedApplication(spread, spreadApplication, nextApplication);
    }

    let nextSpread = spread;
    for (const side of ["left", "right"] as const) {
      const page = nextSpread[side];
      const application = page?.recipeApplication;
      if (!page || !application || application.scope !== "page") continue;
      const nextApplication = rebuildAuthoredTextApplication({
        spread,
        application,
        photos,
        authoredTextItems,
        changedTextContentId,
        resolveRecipe,
      });
      if (!nextApplication) {
        rejected = true;
        continue;
      }
      nextSpread = {
        ...nextSpread,
        [side]: { ...page, recipeApplication: nextApplication },
      };
    }
    return nextSpread;
  });
  return rejected ? null : nextSpreads;
}

function rebuildAuthoredTextApplication({
  spread,
  application,
  photos,
  authoredTextItems,
  changedTextContentId,
  resolveRecipe,
}: {
  readonly spread: ZineManualSpread;
  readonly application: RecipeApplication;
  readonly photos: readonly ZinePhoto[];
  readonly authoredTextItems: readonly AuthoredTextItem[];
  readonly changedTextContentId: string;
  readonly resolveRecipe: RecipeRuntimeResolver;
}): RecipeApplication | null {
  const recipe = resolveRecipe({ id: application.recipeId, version: application.recipeVersion });
  if (!recipe) return application;
  const targetPages = [spread.left, spread.right].filter((page): page is ZineManualPage => (
    page !== null
      && application.targetPageIds.includes(page.id)
      && hasSameRecipeApplicationIdentity(page.recipeApplication, application)
  ));
  if (targetPages.length !== application.targetPageIds.length) return application;
  const content = createRecipeContentForManualPages({
    recipe,
    anchorPageId: application.anchorPageId,
    targetPages,
    photos,
    authoredTextItems,
  });
  const compatibility = evaluateRecipeCompatibility(recipe, content);
  const nextApplication = createRecipeApplication({
    recipe,
    content,
    anchorPageId: application.anchorPageId,
    targetPageIds: application.targetPageIds,
    previousApplications: [application],
  });
  const currentAssignment = application.textAssignments?.some((assignment) => (
    assignment.textContentId === changedTextContentId
  )) ?? false;
  const nextAssignment = nextApplication.textAssignments?.some((assignment) => (
    assignment.textContentId === changedTextContentId
  )) ?? false;

  if (compatibility.valid) return nextApplication;
  if (currentAssignment) return null;
  if (
    compatibility.slotId
    && (compatibility.code === "authored-text-missing" || compatibility.code === "authored-text-owner-mismatch")
    && recipe.slots.some((slot) => slot.id === compatibility.slotId && slot.kind === "static-text" && slot.required)
  ) {
    return null;
  }
  if (!nextAssignment) return application;
  if (
    nextAssignment
    && (compatibility.code === "authored-text-too-long" || compatibility.code === "authored-text-too-many-lines")
    && compatibility.slotId
    && recipe.slots.some((slot) => slot.id === compatibility.slotId && slot.kind === "static-text" && !slot.required)
  ) {
    return {
      ...nextApplication,
      textAssignments: nextApplication.textAssignments?.filter((assignment) => (
        assignment.textContentId !== changedTextContentId
      )),
      unplacedTextContentIds: [...new Set([
        ...(nextApplication.unplacedTextContentIds ?? []),
        changedTextContentId,
      ])],
    };
  }
  return application;
}

function replaceSharedApplication(
  spread: ZineManualSpread,
  previous: RecipeApplication,
  next: RecipeApplication,
) {
  return {
    ...spread,
    left: spread.left && hasSameRecipeApplicationIdentity(spread.left.recipeApplication, previous)
      ? { ...spread.left, recipeApplication: next }
      : spread.left,
    right: spread.right && hasSameRecipeApplicationIdentity(spread.right.recipeApplication, previous)
      ? { ...spread.right, recipeApplication: next }
      : spread.right,
  };
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
