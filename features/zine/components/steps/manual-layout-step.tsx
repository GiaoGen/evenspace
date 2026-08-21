"use client";

import Image from "next/image";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type PointerEvent,
  type TouchEvent,
  type TransitionEvent,
} from "react";
import { createPortal } from "react-dom";
import type { PageFlip } from "page-flip";
import { Icon } from "@/components/ui/icon";
import { createUuid } from "@/core/domain/uuid";
import {
  getAuthoredTextEditorFields,
  getAuthoredTextEditorValidation,
  type AuthoredTextEditorField,
} from "../../model/authored-text-editor";
import {
  createManualRecipeApplicationContext,
  getManualRecipeApplicability,
  splitPhotosIntoVisualRows,
  type ZineDraft,
} from "../../model/zine-draft";
import type { ZineManualPage, ZinePageSide } from "../../model/zine-manual-layout";
import type { AuthoredTextItem, RecipeDefinition, RecipeRef } from "../../model/recipe-contract";
import { createManualEditorPages } from "../../model/zine-pages";
import { getPhotoUseCounts } from "../../model/photo-usage";
import { evaluateRecipeCompatibility, getRecipeCompatibilityLabel } from "../../model/recipe-contract";
import type { RecipeRuntimePolicy } from "../../model/recipe-catalog";
import { normalizePlacement } from "../../model/recipe-placement";
import { syncVisiblePlacementFocus } from "../placement-focus-dom";
import { StylePagePreview } from "../style-page-preview";
import { ZineReaderPageView } from "../reader/zine-reader-page";
import styles from "./manual-layout-step.module.css";

type ViewMode = "spread" | "focus";
type CameraMotion = "idle" | "moving" | "flipping";
type DrawerKind = "photos" | "layout";

type CameraGeometry = {
  readonly focusWidth: number;
  readonly scale: number;
  readonly shift: number;
};

type PhotoDrag = {
  readonly pointerId: number;
  readonly placementId: string;
  readonly pageId: string;
  readonly photoId: string;
  readonly pageIndex: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startFocusX: number;
  readonly startFocusY: number;
  readonly scale: number;
  readonly overflowX: number;
  readonly overflowY: number;
  focusX: number;
  focusY: number;
  moved: boolean;
};

type PlacementTarget = {
  readonly placementId: string;
  readonly pageId: string;
  readonly photoSlotId: string;
  readonly photoId: string;
};

type EmptyPhotoSlotTarget = {
  readonly pageId: string;
  readonly recipeRef: RecipeRef;
  readonly photoSlotId: string;
  readonly applicationAnchorPageId: string;
  readonly targetPageIds: readonly string[];
};

type PointerIntent = {
  readonly pointerId: number;
  readonly pageIndex: number | null;
  readonly placement: PlacementTarget | null;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly allowFocusNavigation: boolean;
  readonly addPage: { readonly spreadId: string; readonly side: ZinePageSide } | null;
  readonly emptyPhotoSlot: { readonly pageId: string; readonly photoSlotId: string } | null;
  readonly removePhoto: { readonly pageId: string; readonly placementId: string; readonly photoSlotId: string } | null;
  moved: boolean;
};

type LastTap = {
  readonly key: string;
  readonly pageIndex: number;
  readonly at: number;
};

type PendingPageTurn = {
  readonly targetPage: number;
};

const defaultCameraGeometry: CameraGeometry = {
  focusWidth: 510,
  scale: 1,
  shift: 205,
};

function commitAuthoredTextField({
  recipe,
  field,
  text,
  locale,
  onUpsert,
  onUpdate,
  onDelete,
}: {
  readonly recipe: RecipeDefinition | null;
  readonly field: AuthoredTextEditorField;
  readonly text: string;
  readonly locale: ZineDraft["locale"];
  readonly onUpsert: (item: AuthoredTextItem) => void;
  readonly onUpdate: (textContentId: string, text: string) => void;
  readonly onDelete: (textContentId: string) => void;
}) {
  if (!recipe) return;
  const validation = getAuthoredTextEditorValidation(recipe, field, text, locale);
  if (!text.trim()) {
    if (!field.required && field.item) onDelete(field.item.id);
    return;
  }
  if (!validation.valid) return;
  if (field.item) {
    if (field.item.text !== text) onUpdate(field.item.id, text);
    return;
  }
  onUpsert({
    id: createUuid(),
    owner: field.owner,
    contentKey: field.contentKey,
    roleHint: field.role,
    text,
  });
}

function getAuthoredTextOwnerLabel(owner: AuthoredTextItem["owner"]) {
  return owner.kind === "page"
    ? `Page · ${owner.pageId}`
    : `Spread · ${owner.targetPageIds.join(" + ")}`;
}

export function getManualRecipeCompatibility({
  recipe,
  focusedPage,
  draft,
}: {
  readonly recipe: RecipeDefinition;
  readonly focusedPage: ZineManualPage | null;
  readonly draft: ZineDraft;
}) {
  if (!focusedPage) {
    return { code: "incompatible" as const, valid: false, reason: "Focus a page first.", hiddenNotePhotoIds: [] };
  }
  const context = draft.manualSpreads && createManualRecipeApplicationContext({
    recipe,
    manualSpreads: draft.manualSpreads,
    anchorPageId: focusedPage.id,
    photos: draft.photos,
    authoredTextItems: draft.authoredTextItems ?? [],
  });
  if (!context) {
    return { code: "incompatible" as const, valid: false, reason: "A spread Recipe needs both pages.", hiddenNotePhotoIds: [] };
  }
  return evaluateRecipeCompatibility(recipe, context.content);
}

export function ManualLayoutStep({
  draft,
  recipeRuntimePolicy,
  onPlacementFocusChange,
  onAddPage,
  onPlacePhoto,
  onPlacePhotoInRecipeSlot,
  onRemoveRecipePhoto,
  onApplyRecipe,
  onUpsertAuthoredText,
  onUpdateAuthoredText,
  onDeleteAuthoredText,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
}: {
  readonly draft: ZineDraft;
  readonly recipeRuntimePolicy: RecipeRuntimePolicy;
  readonly onPlacementFocusChange: (
    pageId: string,
    placementId: string,
    focusX: number,
    focusY: number,
    scale: number,
  ) => void;
  readonly onAddPage: (spreadId: string, side: ZinePageSide) => void;
  readonly onPlacePhoto: (
    pageId: string,
    photoId: string,
    replacePhotoId?: string,
  ) => void;
  readonly onPlacePhotoInRecipeSlot: (
    pageId: string,
    recipeRef: RecipeRef,
    photoSlotId: string,
    photoId: string,
  ) => void;
  readonly onRemoveRecipePhoto: (pageId: string, placementId: string, photoSlotId: string) => void;
  readonly onApplyRecipe: (pageId: string, recipeRef: RecipeRef) => void;
  readonly onUpsertAuthoredText: (item: AuthoredTextItem) => void;
  readonly onUpdateAuthoredText: (textContentId: string, text: string) => void;
  readonly onDeleteAuthoredText: (textContentId: string) => void;
  readonly canUndo: boolean;
  readonly canRedo: boolean;
  readonly onUndo: () => void;
  readonly onRedo: () => void;
}) {
  const recipeWaterfallRows = useMemo(() => [
    recipeRuntimePolicy.choices.filter((_, index) => index % 2 === 0),
    recipeRuntimePolicy.choices.filter((_, index) => index % 2 === 1),
  ] as const, [recipeRuntimePolicy]);
  const activeRecipeCount = recipeRuntimePolicy.choices.length;
  const pages = useMemo(() => createManualEditorPages(draft), [draft]);
  const photoById = useMemo(
    () => new Map(draft.photos.map((photo) => [photo.id, photo])),
    [draft.photos],
  );
  const structureKey = useMemo(
    () => JSON.stringify({
      name: draft.name,
      locale: draft.locale,
      styleId: draft.styleId,
      photos: draft.photos.map((photo) => ({ id: photo.id, caption: photo.caption })),
      manualSpreads: draft.manualSpreads,
    }),
    [draft.locale, draft.manualSpreads, draft.name, draft.photos, draft.styleId],
  );
  const sourceRef = useRef<HTMLDivElement>(null);
  const bookSlotRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const initialPage = pages.length > 2 ? 1 : 0;
  const currentPageRef = useRef(initialPage);
  const viewModeRef = useRef<ViewMode>("spread");
  const cameraMotionRef = useRef<CameraMotion>("idle");
  const selectedPhotoIdRef = useRef<string | null>(null);
  const selectedPlacementIdRef = useRef<string | null>(null);
  const focusedPageRef = useRef<number | null>(null);
  const photoDragRef = useRef<PhotoDrag | null>(null);
  const pointerIntentRef = useRef<PointerIntent | null>(null);
  const blockedPointerRef = useRef<number | null>(null);
  const pendingPageTurnRef = useRef<PendingPageTurn | null>(null);
  const lastTapRef = useRef<LastTap | null>(null);
  const suppressNativeDoubleClickUntilRef = useRef(0);
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [viewMode, setViewMode] = useState<ViewMode>("spread");
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>("idle");
  const [cameraGeometry, setCameraGeometry] = useState(defaultCameraGeometry);
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [portalReady, setPortalReady] = useState(false);
  const [drawerKind, setDrawerKind] = useState<DrawerKind | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [preparedRecipeRef, setPreparedRecipeRef] = useState<RecipeRef | null>(null);
  const [authoredTextDrafts, setAuthoredTextDrafts] = useState<Record<string, string>>({});
  const [emptyPhotoSlotTarget, setEmptyPhotoSlotTarget] = useState<EmptyPhotoSlotTarget | null>(null);
  const drawerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const commitAuthoredTextRef = useRef<() => void>(() => {});
  const lastPage = pages.length - 1;

  const setPhotoSelection = useCallback((placement: PlacementTarget | null) => {
    selectedPhotoIdRef.current = placement?.photoId ?? null;
    selectedPlacementIdRef.current = placement?.placementId ?? null;
    setSelectedPhotoId(placement?.photoId ?? null);
    setSelectedPlacementId(placement?.placementId ?? null);
  }, []);

  const closeDrawer = useCallback(() => {
    if (drawerKind === "layout") commitAuthoredTextRef.current();
    if (drawerKind === "photos") setEmptyPhotoSlotTarget(null);
    setDrawerOpen(false);
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current);
    drawerTimerRef.current = setTimeout(() => {
      setDrawerKind(null);
      drawerTimerRef.current = null;
    }, 240);
  }, [drawerKind]);

  const openDrawer = useCallback((kind: DrawerKind) => {
    if (cameraMotionRef.current !== "idle") return;
    if (drawerTimerRef.current) {
      clearTimeout(drawerTimerRef.current);
      drawerTimerRef.current = null;
    }
    setDrawerKind(kind);
    setDrawerOpen(false);
    window.requestAnimationFrame(() => setDrawerOpen(true));
  }, []);

  const finishCameraMotion = useCallback(() => {
    if (cameraMotionRef.current !== "moving") return;
    if (cameraTimerRef.current) {
      clearTimeout(cameraTimerRef.current);
      cameraTimerRef.current = null;
    }
    cameraMotionRef.current = "idle";
    setCameraMotion("idle");
  }, []);

  const beginCameraMotion = useCallback(() => {
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current);
    cameraMotionRef.current = "moving";
    setCameraMotion("moving");
    cameraTimerRef.current = setTimeout(() => {
      cameraMotionRef.current = "idle";
      setCameraMotion("idle");
      cameraTimerRef.current = null;
    }, 430);
  }, []);

  const measureCameraGeometry = useCallback(() => {
    const pageFlip = pageFlipRef.current;
    const viewport = viewportRef.current;
    if (!pageFlip || !viewport) return;
    const bounds = pageFlip.getBoundsRect();
    if (bounds.pageWidth <= 0 || bounds.height <= 0) return;

    const viewportRect = viewport.getBoundingClientRect();
    const maxFocusWidth = Math.max(1, viewportRect.width - 16);
    const expectedPeek = Math.min(54, Math.max(30, maxFocusWidth * .1));
    const widthLimitedPage = Math.max(1, maxFocusWidth - expectedPeek);
    const heightLimitedPage = Math.max(
      1,
      (viewportRect.height - 24) * (bounds.pageWidth / bounds.height),
    );
    const minimumZoomedPage = Math.min(widthLimitedPage, bounds.pageWidth * 1.18);
    const targetPageWidth = Math.min(
      widthLimitedPage,
      Math.max(minimumZoomedPage, heightLimitedPage),
    );
    const scale = Math.min(2.4, targetPageWidth / bounds.pageWidth);
    const scaledPageWidth = bounds.pageWidth * scale;
    const peek = Math.min(
      Math.max(24, maxFocusWidth - scaledPageWidth),
      Math.min(54, Math.max(30, scaledPageWidth * .11)),
    );
    const focusWidth = scaledPageWidth + peek;

    setCameraGeometry({
      focusWidth,
      scale,
      shift: Math.max(0, (scaledPageWidth - peek) / 2),
    });
  }, []);

  const openFocusedPage = useCallback((pageIndex: number | null) => {
    if (pageIndex === null || pageIndex <= 0 || pageIndex >= lastPage) return;
    if (cameraMotionRef.current === "flipping") return;
    lastTapRef.current = null;
    closeDrawer();
    setPhotoSelection(null);
    measureCameraGeometry();
    viewModeRef.current = "focus";
    setViewMode("focus");
    focusedPageRef.current = pageIndex;
    setFocusedPage(pageIndex);
    beginCameraMotion();
  }, [beginCameraMotion, closeDrawer, lastPage, measureCameraGeometry, setPhotoSelection]);

  const closeFocusedPage = useCallback(() => {
    if (viewModeRef.current !== "focus" || cameraMotionRef.current === "flipping") return;
    closeDrawer();
    setPhotoSelection(null);
    lastTapRef.current = null;
    focusedPageRef.current = null;
    setFocusedPage(null);
    viewModeRef.current = "spread";
    setViewMode("spread");
    beginCameraMotion();
  }, [beginCameraMotion, closeDrawer, setPhotoSelection]);

  const completePageTurn = useCallback(() => {
    const pending = pendingPageTurnRef.current;
    if (!pending || viewModeRef.current !== "focus") return;
    pendingPageTurnRef.current = null;
    if (pageTurnTimerRef.current) {
      clearTimeout(pageTurnTimerRef.current);
      pageTurnTimerRef.current = null;
    }
    focusedPageRef.current = pending.targetPage;
    setFocusedPage(pending.targetPage);
    beginCameraMotion();
  }, [beginCameraMotion]);

  const startPageTurn = useCallback((targetPage: number, direction: 1 | -1) => {
    const pageFlip = pageFlipRef.current;
    if (!pageFlip || pendingPageTurnRef.current) return;
    closeDrawer();
    pendingPageTurnRef.current = { targetPage };
    cameraMotionRef.current = "flipping";
    setCameraMotion("flipping");
    if (direction === 1) pageFlip.flipNext();
    else pageFlip.flipPrev();

    if (pageTurnTimerRef.current) clearTimeout(pageTurnTimerRef.current);
    pageTurnTimerRef.current = setTimeout(() => {
      const pending = pendingPageTurnRef.current;
      if (!pending) return;
      const expectedSpread = getSpreadStart(pending.targetPage);
      if (pageFlip.getCurrentPageIndex() === expectedSpread) completePageTurn();
      else {
        pendingPageTurnRef.current = null;
        cameraMotionRef.current = "idle";
        setCameraMotion("idle");
      }
      pageTurnTimerRef.current = null;
    }, 900);
  }, [closeDrawer, completePageTurn]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setPortalReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let instance: PageFlip | null = null;
    let engineRoot: HTMLDivElement | null = null;

    async function mountBook() {
      const source = sourceRef.current;
      const slot = bookSlotRef.current;
      if (!source || !slot || lastPage < 0) return;

      try {
        setStatus("loading");
        const pageFlipPackage = await import("page-flip");
        if (cancelled) return;

        engineRoot = document.createElement("div");
        engineRoot.className = styles.flipBook;
        slot.replaceChildren(engineRoot);
        const pageElements = Array.from(source.children, (element) => (
          element.cloneNode(true) as HTMLElement
        ));
        const startPage = Math.min(
          Math.max(0, currentPageRef.current),
          Math.max(0, lastPage),
        );
        instance = new pageFlipPackage.PageFlip(engineRoot, {
          width: 360,
          height: 480,
          size: "stretch",
          minWidth: 120,
          maxWidth: 460,
          minHeight: 160,
          maxHeight: 614,
          startPage,
          usePortrait: false,
          showCover: true,
          autoSize: true,
          drawShadow: true,
          maxShadowOpacity: 0.22,
          flippingTime: 560,
          mobileScrollSupport: true,
          swipeDistance: 20,
          disableFlipByClick: true,
          showPageCorners: true,
          useMouseEvents: true,
        });
        instance.on("init", () => {
          window.requestAnimationFrame(measureCameraGeometry);
        });
        instance.on("flip", (event) => {
          const nextPage = Number(event.data);
          currentPageRef.current = nextPage;
          setCurrentPage(nextPage);
          if (viewModeRef.current === "spread") setPhotoSelection(null);
        });
        instance.on("changeState", (event) => {
          if (String(event.data) === "read" && pendingPageTurnRef.current) {
            completePageTurn();
          }
        });
        instance.loadFromHTML(pageElements);
        pageFlipRef.current = instance;
        setStatus("ready");
        window.requestAnimationFrame(measureCameraGeometry);
      } catch {
        engineRoot?.remove();
        if (!cancelled) setStatus("error");
      }
    }

    void mountBook();
    return () => {
      cancelled = true;
      pageFlipRef.current = null;
      if (instance) instance.destroy();
      else engineRoot?.remove();
    };
  }, [completePageTurn, lastPage, measureCameraGeometry, setPhotoSelection, structureKey]);

  useEffect(() => {
    const viewport = viewportRef.current;
    if (!viewport) return;
    for (const figure of viewport.querySelectorAll<HTMLElement>("[data-zine-photo-id]")) {
      figure.dataset.zinePhotoSelected = String(
        figure.dataset.zinePlacementId === selectedPlacementId,
      );
    }
  }, [selectedPlacementId, status]);

  useEffect(() => {
    function updateAfterResize() {
      window.requestAnimationFrame(() => window.requestAnimationFrame(measureCameraGeometry));
    }
    window.addEventListener("resize", updateAfterResize);
    return () => window.removeEventListener("resize", updateAfterResize);
  }, [measureCameraGeometry]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (drawerKind !== null) {
        closeDrawer();
        return;
      }
      if (selectedPhotoIdRef.current === null) closeFocusedPage();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeDrawer, closeFocusedPage, drawerKind]);

  useEffect(() => () => {
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current);
    if (pageTurnTimerRef.current) clearTimeout(pageTurnTimerRef.current);
    if (drawerTimerRef.current) clearTimeout(drawerTimerRef.current);
  }, []);

  function handleDoubleClick(event: MouseEvent<HTMLDivElement>) {
    if (event.timeStamp < suppressNativeDoubleClickUntilRef.current) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    if (viewModeRef.current === "focus") closeFocusedPage();
    else openFocusedPage(getPageIndex(event.target));
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (cameraMotionRef.current !== "idle") {
      blockPointerGesture(event);
      return;
    }

    const frame = getPhotoFrame(event.target);
    const placement = getPlacementTarget(event.target);
    const emptyPhotoSlot = getEmptyPhotoSlotTarget(event.target);
    const removePhoto = getRemovePhotoTarget(event.target);
    const pageIndex = getPageIndex(event.target);
    const selectedPlacementId = selectedPlacementIdRef.current;

    if (emptyPhotoSlot || removePhoto) {
      blockPointerGesture(event);
      pointerIntentRef.current = createPointerIntent(event, pageIndex, null, false, emptyPhotoSlot, removePhoto);
      return;
    }

    if (selectedPlacementId !== null) {
      blockPointerGesture(event);
      if (!frame || !placement) {
        setPhotoSelection(null);
        lastTapRef.current = null;
        return;
      }
      if (selectedPlacementId === placement.placementId) {
        beginPhotoDrag(event, frame, placement, pageIndex);
        return;
      }
      pointerIntentRef.current = createPointerIntent(
        event,
        pageIndex,
        placement,
        false,
      );
      return;
    }

    const isFocus = viewModeRef.current === "focus";
    if (isFocus) blockPointerGesture(event);
    pointerIntentRef.current = createPointerIntent(
      event,
      pageIndex,
      placement,
      isFocus,
    );
  }

  function beginPhotoDrag(
    event: PointerEvent<HTMLDivElement>,
    frame: HTMLElement,
    placement: PlacementTarget,
    pageIndex: number | null,
  ) {
    const photo = photoById.get(placement.photoId);
    if (!photo || pageIndex === null) return;
    const imageFrame = frame.querySelector<HTMLElement>(":scope > div");
    if (!imageFrame) return;
    const currentPlacement = getCurrentPlacement(placement);
    const overflow = getRenderedOverflow(
      imageFrame.getBoundingClientRect(),
      photo.width,
      photo.height,
      currentPlacement.scale,
    );
    photoDragRef.current = {
      pointerId: event.pointerId,
      placementId: placement.placementId,
      pageId: placement.pageId,
      photoId: placement.photoId,
      pageIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startFocusX: currentPlacement.focusX,
      startFocusY: currentPlacement.focusY,
      scale: currentPlacement.scale,
      overflowX: overflow.x,
      overflowY: overflow.y,
      focusX: currentPlacement.focusX,
      focusY: currentPlacement.focusY,
      moved: false,
    };
  }

  function blockPointerGesture(event: PointerEvent<HTMLDivElement>) {
    blockedPointerRef.current = event.pointerId;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
    const photoDrag = photoDragRef.current;
    if (photoDrag?.pointerId === event.pointerId) {
      const deltaX = event.clientX - photoDrag.startClientX;
      const deltaY = event.clientY - photoDrag.startClientY;
      photoDrag.focusX = photoDrag.overflowX > 0
        ? clampPercentage(photoDrag.startFocusX - (deltaX / photoDrag.overflowX) * 100)
        : photoDrag.startFocusX;
      photoDrag.focusY = photoDrag.overflowY > 0
        ? clampPercentage(photoDrag.startFocusY - (deltaY / photoDrag.overflowY) * 100)
        : photoDrag.startFocusY;
      photoDrag.moved ||= Math.hypot(deltaX, deltaY) > 2;
      syncVisiblePlacementFocus(
        viewportRef.current,
        photoDrag.placementId,
        photoDrag.focusX,
        photoDrag.focusY,
        photoDrag.scale,
      );
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    const intent = pointerIntentRef.current;
    if (intent?.pointerId === event.pointerId) {
      intent.moved ||= Math.hypot(
        event.clientX - intent.startClientX,
        event.clientY - intent.startClientY,
      ) > 4;
    }

    if (blockedPointerRef.current === event.pointerId) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  function finishPointerGesture(event: PointerEvent<HTMLDivElement>) {
    const photoDrag = photoDragRef.current;
    if (photoDrag?.pointerId === event.pointerId) {
      photoDragRef.current = null;
      if (photoDrag.moved) {
        onPlacementFocusChange(
          photoDrag.pageId,
          photoDrag.placementId,
          photoDrag.focusX,
          photoDrag.focusY,
          photoDrag.scale,
        );
      } else if (event.type !== "pointercancel") {
        confirmTap(`placement:${photoDrag.placementId}`, photoDrag.pageIndex, event.timeStamp);
      }
      finishBlockedPointer(event);
      return;
    }

    const intent = pointerIntentRef.current;
    if (intent?.pointerId === event.pointerId) {
      pointerIntentRef.current = null;
      if (event.type !== "pointercancel") {
        if (!intent.moved && intent.pageIndex !== null) {
          if (intent.emptyPhotoSlot) {
            const page = pages.find((candidate) => candidate.kind === "content" && candidate.id === intent.emptyPhotoSlot!.pageId);
            const application = page?.kind === "content" ? page.recipeApplication : null;
            if (application) {
              setEmptyPhotoSlotTarget({
                pageId: intent.emptyPhotoSlot.pageId,
                recipeRef: { id: application.recipeId, version: application.recipeVersion },
                photoSlotId: intent.emptyPhotoSlot.photoSlotId,
                applicationAnchorPageId: application.anchorPageId,
                targetPageIds: application.targetPageIds,
              });
              openDrawer("photos");
            }
            finishBlockedPointer(event);
            return;
          }
          if (intent.removePhoto) {
            onRemoveRecipePhoto(
              intent.removePhoto.pageId,
              intent.removePhoto.placementId,
              intent.removePhoto.photoSlotId,
            );
            setPhotoSelection(null);
            finishBlockedPointer(event);
            return;
          }
          const addPage = intent.addPage;
          if (addPage) {
            onAddPage(addPage.spreadId, addPage.side);
            finishBlockedPointer(event);
            return;
          }
          if (intent.placement) setPhotoSelection(intent.placement);
          confirmTap(
            intent.placement ? `placement:${intent.placement.placementId}` : `page:${intent.pageIndex}`,
            intent.pageIndex,
            event.timeStamp,
          );
        } else if (intent.moved && intent.allowFocusNavigation) {
          navigateFocusedPage(intent, event);
        }
      }
      if (blockedPointerRef.current === event.pointerId) finishBlockedPointer(event);
      return;
    }

    if (blockedPointerRef.current === event.pointerId) finishBlockedPointer(event);
  }

  function confirmTap(key: string, pageIndex: number, at: number) {
    const lastTap = lastTapRef.current;
    if (lastTap?.key === key && lastTap.pageIndex === pageIndex && at - lastTap.at < 340) {
      lastTapRef.current = null;
      suppressNativeDoubleClickUntilRef.current = at + 700;
      if (viewModeRef.current === "focus") closeFocusedPage();
      else openFocusedPage(pageIndex);
      return;
    }
    lastTapRef.current = { key, pageIndex, at };
  }

  function navigateFocusedPage(intent: PointerIntent, event: PointerEvent<HTMLDivElement>) {
    const focused = focusedPageRef.current;
    if (focused === null || cameraMotionRef.current !== "idle") return;
    const deltaX = event.clientX - intent.startClientX;
    const deltaY = event.clientY - intent.startClientY;
    if (Math.abs(deltaX) <= Math.abs(deltaY) * 1.15) return;
    const threshold = Math.min(48, Math.max(24, cameraGeometry.focusWidth * .07));
    const direction = deltaX < -threshold ? 1 : deltaX > threshold ? -1 : 0;
    if (direction === 0) return;

    const targetPage = focused + direction;
    if (targetPage <= 0 || targetPage >= lastPage) return;
    if (getSpreadStart(targetPage) === getSpreadStart(focused)) {
      focusedPageRef.current = targetPage;
      setFocusedPage(targetPage);
      beginCameraMotion();
      return;
    }
    startPageTurn(targetPage, direction as 1 | -1);
  }

  function finishBlockedPointer(event: PointerEvent<HTMLDivElement>) {
    blockedPointerRef.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
  }

  function blockNativeBookGesture(event: MouseEvent<HTMLDivElement> | TouchEvent<HTMLDivElement>) {
    if (blockedPointerRef.current === null) return;
    event.preventDefault();
    event.stopPropagation();
  }

  function handleCameraTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    finishCameraMotion();
  }

  function getCurrentPlacement(target: PlacementTarget) {
    const page = pages.find((candidate) => candidate.kind === "content" && candidate.id === target.pageId);
    const assignment = page?.kind === "content"
      ? page.recipeApplication?.assignments.find((item) => item.placementId === target.placementId)
      : undefined;
    const photo = photoById.get(target.photoId);
    return normalizePlacement(
      assignment,
      photo ? { focusX: photo.defaultFocusX, focusY: photo.defaultFocusY } : undefined,
    );
  }


  const focusSide = focusedPage === null ? null : focusedPage % 2 === 1 ? "left" : "right";
  const cameraX = focusSide === "left"
    ? cameraGeometry.shift
    : focusSide === "right" ? -cameraGeometry.shift : 0;
  const bookStageStyle = {
    "--camera-scale": focusSide ? String(cameraGeometry.scale) : "1",
    "--camera-x": `${cameraX}px`,
  } as CSSProperties;
  const cameraWindowStyle = {
    width: viewMode === "focus" ? `${cameraGeometry.focusWidth}px` : "100%",
  } as CSSProperties;
  const stageClassName = [
    styles.bookStage,
    currentPage === 0 ? styles.coverStage : "",
    currentPage === lastPage ? styles.backStage : "",
  ].filter(Boolean).join(" ");
  const focusedPageData = focusedPage === null ? null : pages[focusedPage] ?? null;
  const focusedContentPage = focusedPageData?.kind === "content" ? focusedPageData : null;
  const focusedSpread = focusedContentPage
    ? draft.manualSpreads?.find((spread) => (
        spread.left?.id === focusedContentPage.id || spread.right?.id === focusedContentPage.id
      )) ?? null
    : null;
  const focusedManualPage = focusedContentPage
    ? [focusedSpread?.left, focusedSpread?.right].find((page): page is ZineManualPage => page?.id === focusedContentPage.id) ?? null
    : null;
  const photoRows = useMemo(() => splitPhotosIntoVisualRows(draft.photos), [draft.photos]);
  const photoUseCounts = useMemo(
    () => getPhotoUseCounts(draft.manualSpreads),
    [draft.manualSpreads],
  );
  const preparedRecipe = preparedRecipeRef ? recipeRuntimePolicy.resolve(preparedRecipeRef) : null;
  const preparedAuthoredTextOwner = !preparedRecipe || !focusedManualPage || !draft.manualSpreads
    ? null
    : createManualRecipeApplicationContext({
      recipe: preparedRecipe,
      manualSpreads: draft.manualSpreads,
      anchorPageId: focusedManualPage.id,
      photos: draft.photos,
      authoredTextItems: draft.authoredTextItems ?? [],
    })?.content.owner ?? null;
  const authoredTextFields = preparedRecipe && preparedAuthoredTextOwner
    ? getAuthoredTextEditorFields({
        recipe: preparedRecipe,
        owner: preparedAuthoredTextOwner,
        authoredTextItems: draft.authoredTextItems ?? [],
      })
    : [];

  function prepareAuthoredText(recipeRef: RecipeRef) {
    const recipe = recipeRuntimePolicy.resolve(recipeRef);
    if (!recipe || !focusedManualPage || !draft.manualSpreads) return;
    const context = createManualRecipeApplicationContext({
      recipe,
      manualSpreads: draft.manualSpreads,
      anchorPageId: focusedManualPage.id,
      photos: draft.photos,
      authoredTextItems: draft.authoredTextItems ?? [],
    });
    if (!context?.content.owner) return;
    const fields = getAuthoredTextEditorFields({
      recipe,
      owner: context.content.owner,
      authoredTextItems: draft.authoredTextItems ?? [],
    });
    setPreparedRecipeRef(recipeRef);
    setAuthoredTextDrafts(Object.fromEntries(fields.map((field) => [field.contentKey, field.item?.text ?? ""])));
  }

  useEffect(() => {
    commitAuthoredTextRef.current = () => {
      const fields = preparedRecipe && preparedAuthoredTextOwner
        ? getAuthoredTextEditorFields({
            recipe: preparedRecipe,
            owner: preparedAuthoredTextOwner,
            authoredTextItems: draft.authoredTextItems ?? [],
          })
        : [];
      for (const field of fields) {
        commitAuthoredTextField({
          recipe: preparedRecipe,
          field,
          text: authoredTextDrafts[field.contentKey] ?? field.item?.text ?? "",
          locale: draft.locale,
          onUpsert: onUpsertAuthoredText,
          onUpdate: onUpdateAuthoredText,
          onDelete: onDeleteAuthoredText,
        });
      }
    };
  }, [authoredTextDrafts, draft.authoredTextItems, draft.locale, onDeleteAuthoredText, onUpdateAuthoredText, onUpsertAuthoredText, preparedAuthoredTextOwner, preparedRecipe]);

  function openLayoutDrawer() {
    const application = focusedContentPage?.recipeApplication;
    if (application) {
      prepareAuthoredText({ id: application.recipeId, version: application.recipeVersion });
    } else {
      setPreparedRecipeRef(null);
      setAuthoredTextDrafts({});
    }
    openDrawer("layout");
  }

  return (
    <section className={styles.manualLayoutStep} aria-labelledby="manual-layout-heading">
      <h1 id="manual-layout-heading" className={styles.srOnly}>Arrange your zine</h1>
      <div className={styles.manualStage}>
        <div
          ref={viewportRef}
          className={styles.bookViewport}
          data-photo-selected={selectedPhotoId !== null}
          data-camera-motion={cameraMotion}
          onDoubleClickCapture={handleDoubleClick}
          onMouseDownCapture={blockNativeBookGesture}
          onTouchStartCapture={blockNativeBookGesture}
          onTouchMoveCapture={blockNativeBookGesture}
          onTouchEndCapture={blockNativeBookGesture}
          onPointerDownCapture={handlePointerDown}
          onPointerMoveCapture={handlePointerMove}
          onPointerUpCapture={finishPointerGesture}
          onPointerCancelCapture={finishPointerGesture}
        >
          <div
            className={styles.cameraWindow}
            data-view-mode={viewMode}
            data-focus-side={focusSide ?? undefined}
            style={cameraWindowStyle}
          >
            <div
              className={stageClassName}
              style={bookStageStyle}
              onTransitionEnd={handleCameraTransitionEnd}
            >
              <div ref={bookSlotRef} className={styles.bookSlot} />
            </div>
          </div>

          <div ref={sourceRef} className={styles.sourcePages} aria-hidden="true">
            {pages.map((page, index) => (
              <ZineReaderPageView
                key={page.id}
                page={page}
                pageIndex={index}
                mode="editor"
                resolveRecipe={recipeRuntimePolicy.resolve}
              />
            ))}
          </div>

          {status === "loading" ? <p className={styles.stageMessage}>Building your zine…</p> : null}
          {status === "error" ? <p className={styles.stageMessage}>The live book could not start.</p> : null}
        </div>
      </div>
      {portalReady ? createPortal(
        <>
          {viewMode === "focus" && focusedContentPage ? (
            <div className={styles.focusTools} aria-label="Page tools">
              <button type="button" aria-label="Undo layout change" disabled={!canUndo} onClick={onUndo}>
                <span>Undo</span>
              </button>
              <button type="button" aria-label="Redo layout change" disabled={!canRedo} onClick={onRedo}>
                <span>Redo</span>
              </button>
              <button type="button" onClick={() => openDrawer("photos")}>
                <Icon name="image" size={16} />
                <span>Photos</span>
              </button>
              <button type="button" onClick={openLayoutDrawer}>
                <Icon name="grid" size={16} />
                <span>排版</span>
              </button>
            </div>
          ) : null}

          {drawerKind ? (
            <div
              className={styles.drawerBackdrop}
              data-open={drawerOpen}
              onPointerDown={closeDrawer}
            >
              <section
                className={`${styles.drawer} ${drawerKind === "photos" ? styles.topDrawer : styles.bottomDrawer}`}
                data-open={drawerOpen}
                role="dialog"
                aria-modal="true"
                aria-label={drawerKind === "photos" ? "Choose photos" : "Choose page layout"}
                onPointerDown={(event) => event.stopPropagation()}
              >
                <header className={styles.drawerHeader}>
                  <div>
                    <span>{drawerKind === "photos" ? "Photo library" : "Recipe library"}</span>
                    <strong>{drawerKind === "photos" ? "Add a photograph" : "Choose a page recipe"}</strong>
                  </div>
                  <small>{drawerKind === "photos" ? `${draft.photos.length} photos` : `${activeRecipeCount} available recipes`}</small>
                </header>

                {drawerKind === "layout" && focusedContentPage?.recipeApplication?.unplacedPhotoIds.length ? (
                  <p className={styles.drawerNotice}>
                    <strong>{focusedContentPage.recipeApplication.unplacedPhotoIds.length} photo(s) remain unplaced by the current Recipe.</strong>
                    <small>
                      {focusedContentPage.recipeApplication.unplacedPhotoIds.map((photoId) => (
                        photoById.get(photoId)?.fileName ?? photoId
                      )).join(", ")}
                    </small>
                  </p>
                ) : null}

                {drawerKind === "layout" && preparedRecipe && authoredTextFields.length > 0 ? (
                  <section className={styles.authoredTextEditor} aria-label={`${preparedRecipe.name} text`}>
                    <div className={styles.authoredTextEditorHeading}>
                      <strong>Prepare text · {preparedRecipe.name}</strong>
                      <small>{preparedRecipe.scope === "spread" ? "Shared across this spread" : "This page only"} · {preparedAuthoredTextOwner ? getAuthoredTextOwnerLabel(preparedAuthoredTextOwner) : "No owner"}</small>
                    </div>
                    <div className={styles.authoredTextFields}>
                      {authoredTextFields.map((field) => {
                        const text = authoredTextDrafts[field.contentKey] ?? field.item?.text ?? "";
                        const validation = getAuthoredTextEditorValidation(preparedRecipe, field, text, draft.locale);
                        return (
                          <label className={styles.authoredTextField} data-invalid={!validation.valid} key={field.contentKey}>
                            <span>
                              <strong>{field.role}</strong>
                              <small>{field.required ? "Required" : "Optional"} · {text.trim().length}/{field.maxCharacters} characters · {validation.layout.estimatedLines}/{field.maxLines} lines</small>
                            </span>
                            <textarea
                              value={text}
                              rows={Math.min(3, Math.max(1, field.maxLines))}
                              aria-label={`${field.role} text`}
                              aria-describedby={`${field.contentKey}-validation`}
                              onChange={(event) => setAuthoredTextDrafts((current) => ({
                                ...current,
                                [field.contentKey]: event.target.value,
                              }))}
                              onBlur={() => commitAuthoredTextField({
                                recipe: preparedRecipe,
                                field,
                                text: authoredTextDrafts[field.contentKey] ?? field.item?.text ?? "",
                                locale: draft.locale,
                                onUpsert: onUpsertAuthoredText,
                                onUpdate: onUpdateAuthoredText,
                                onDelete: onDeleteAuthoredText,
                              })}
                            />
                            <small id={`${field.contentKey}-validation`}>
                              {validation.valid ? (field.required ? "Ready to apply." : "Leave empty to remove.") : validation.reason}
                            </small>
                          </label>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {drawerKind === "photos" ? (
                  <div className={styles.horizontalWaterfall}>
                    {photoRows.map((row, rowIndex) => (
                      <div className={styles.waterfallRow} key={rowIndex}>
                        {row.map((photo) => {
                          const useCount = photoUseCounts.get(photo.id) ?? 0;
                          return (
                            <button
                              type="button"
                              className={styles.photoChoice}
                              key={photo.id}
                              style={{ "--photo-ratio": getPhotoRatio(photo) } as CSSProperties}
                              onClick={() => {
                                if (!focusedContentPage) return;
                                if (emptyPhotoSlotTarget) {
                                  onPlacePhotoInRecipeSlot(
                                    emptyPhotoSlotTarget.pageId,
                                    emptyPhotoSlotTarget.recipeRef,
                                    emptyPhotoSlotTarget.photoSlotId,
                                    photo.id,
                                  );
                                  setEmptyPhotoSlotTarget(null);
                                  setPhotoSelection(null);
                                  closeDrawer();
                                  return;
                                }
                                const replacePhotoId = selectedPhotoId && focusedContentPage.photos.some(
                                  (item) => item.id === selectedPhotoId,
                                ) ? selectedPhotoId : undefined;
                                onPlacePhoto(focusedContentPage.id, photo.id, replacePhotoId);
                                setPhotoSelection(null);
                                closeDrawer();
                              }}
                            >
                              <Image
                                unoptimized
                                src={photo.previewUrl}
                                alt={photo.fileName}
                                width={photo.width}
                                height={photo.height}
                                sizes="160px"
                              />
                              {useCount > 0 ? <span>{useCount}× used</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={`${styles.horizontalWaterfall} ${styles.recipeWaterfall}`}>
                    {recipeWaterfallRows.map((row, rowIndex) => (
                      <div className={styles.waterfallRow} key={rowIndex}>
                        {row.map(({ entry, recipe }) => {
                          const selected = focusedContentPage?.recipeApplication?.recipeId === recipe.id
                            && focusedContentPage.recipeApplication.recipeVersion === entry.recipe.version;
                          const recipePhotoIds = recipe.scope === "spread"
                            ? [focusedSpread?.left, focusedSpread?.right].flatMap((page) => page?.photoIds ?? [])
                            : focusedContentPage?.photos.map((photo) => photo.id) ?? [];
                          const previewPhotos = recipePhotoIds.length > 0
                            ? recipePhotoIds.flatMap((photoId) => {
                                const photo = photoById.get(photoId);
                                return photo ? [photo] : [];
                              })
                            : draft.photos;
                          const applicability = getManualRecipeApplicability({
                            recipe,
                            focusedPage: focusedManualPage,
                            draft,
                          });
                          const compatibility = applicability.manualCompatibility;
                          const compatibilityLabel = applicability.canApplyInManualEditor
                            ? getManualApplicabilityLabel(applicability)
                            : getRecipeCompatibilityLabel(compatibility.code);
                          const canPrepareAuthoredText = compatibility.code === "authored-text-missing"
                            || compatibility.code === "authored-text-too-long"
                            || compatibility.code === "authored-text-too-many-lines"
                            || compatibility.code === "authored-text-owner-mismatch"
                            || compatibility.code === "authored-text-invalid";
                          const preparingText = preparedRecipe?.id === recipe.id
                            && preparedRecipe.version === entry.recipe.version;
                          return (
                            <button
                              type="button"
                              className={styles.recipeChoice}
                              data-selected={selected}
                              data-preparing-text={preparingText}
                              disabled={!applicability.canApplyInManualEditor && !canPrepareAuthoredText}
                              title={applicability.reason ?? recipe.description}
                              key={`${entry.recipe.id}@${entry.recipe.version}`}
                              onClick={() => {
                                if (!focusedContentPage) return;
                                if (applicability.canApplyInManualEditor) {
                                  onApplyRecipe(focusedContentPage.id, entry.recipe);
                                  closeDrawer();
                                  return;
                                }
                                if (canPrepareAuthoredText) prepareAuthoredText(entry.recipe);
                              }}
                            >
                              <StylePagePreview recipe={recipe} photos={previewPhotos} locale={draft.locale} compact />
                              <small className={styles.recipeStatus} data-status={applicability.canApplyInManualEditor ? "compatible" : compatibility.code}>
                                {preparingText ? "Prepare text" : compatibilityLabel}
                              </small>
                              <span><strong>{recipe.name}{entry.status === "draft" ? " · Draft" : ""}</strong><small>{applicability.canApplyInManualEditor ? `${recipe.scope === "spread" ? "双页 · " : "单页 · "}${recipe.capabilities.notes.mode === "none" ? "无文字" : recipe.capabilities.notes.mode === "required" ? "需要 Note" : "可选 Note"}` : compatibility.reason}</small></span>
                            </button>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="button"
                  className={styles.drawerCollapse}
                  onClick={closeDrawer}
                  aria-label={drawerKind === "photos" ? "Collapse photo menu" : "Collapse layout menu"}
                >
                  <Icon name="chevron" size={18} />
                </button>
              </section>
            </div>
          ) : null}
        </>,
        document.body,
      ) : null}
    </section>
  );
}

function createPointerIntent(
  event: PointerEvent<HTMLDivElement>,
  pageIndex: number | null,
  placement: PlacementTarget | null,
  allowFocusNavigation: boolean,
  emptyPhotoSlot: PointerIntent["emptyPhotoSlot"] = null,
  removePhoto: PointerIntent["removePhoto"] = null,
): PointerIntent {
  return {
    pointerId: event.pointerId,
    pageIndex,
    placement,
    startClientX: event.clientX,
    startClientY: event.clientY,
    allowFocusNavigation,
    addPage: getAddPageTarget(event.target),
    emptyPhotoSlot,
    removePhoto,
    moved: false,
  };
}

function getPhotoFrame(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-zine-photo-id]");
}

function getPlacementTarget(target: EventTarget): PlacementTarget | null {
  if (!(target instanceof Element)) return null;
  const frame = target.closest<HTMLElement>("[data-zine-placement-id]");
  const placementId = frame?.dataset.zinePlacementId;
  const pageId = frame?.dataset.zinePageId;
  const photoSlotId = frame?.dataset.zineSlotId;
  const photoId = frame?.dataset.zinePhotoId;
  if (!placementId || !pageId || !photoSlotId || !photoId) return null;
  return { placementId, pageId, photoSlotId, photoId };
}

function getEmptyPhotoSlotTarget(target: EventTarget): PointerIntent["emptyPhotoSlot"] {
  if (!(target instanceof Element)) return null;
  const slot = target.closest<HTMLElement>("[data-zine-empty-photo-slot]");
  const pageId = slot?.dataset.zinePageId;
  const photoSlotId = slot?.dataset.zineSlotId;
  return pageId && photoSlotId ? { pageId, photoSlotId } : null;
}

function getRemovePhotoTarget(target: EventTarget): PointerIntent["removePhoto"] {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLElement>("[data-zine-remove-photo]");
  const pageId = button?.dataset.zinePageId;
  const placementId = button?.dataset.zinePlacementId;
  const photoSlotId = button?.dataset.zineSlotId;
  return pageId && placementId && photoSlotId ? { pageId, placementId, photoSlotId } : null;
}

function getPageIndex(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  const page = target.closest<HTMLElement>("[data-zine-page-index]");
  if (!page) return null;
  const value = Number(page.dataset.zinePageIndex);
  return Number.isInteger(value) ? value : null;
}

function getAddPageTarget(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  const button = target.closest<HTMLElement>("[data-zine-add-page]");
  const spreadId = button?.dataset.zineSpreadId;
  const side = button?.dataset.zinePageSide;
  if (!spreadId || (side !== "left" && side !== "right")) return null;
  return { spreadId, side } as const;
}

function getPhotoRatio(photo: { readonly width: number; readonly height: number }) {
  if (photo.width <= 0 || photo.height <= 0) return "1";
  return String(Math.min(1.8, Math.max(.72, photo.width / photo.height)));
}

function getManualApplicabilityLabel(applicability: ReturnType<typeof getManualRecipeApplicability>) {
  const incomplete = applicability.completionCompatibility.valid
    ? ""
    : ` · ${getRecipeCompatibilityLabel(applicability.completionCompatibility.code)}`;
  if (applicability.photoDeficit > 0) {
    return `Can apply · ${applicability.photoDeficit} empty slot${applicability.photoDeficit === 1 ? "" : "s"}${incomplete}`;
  }
  if (applicability.photoExcess > 0) {
    return `Can apply · ${applicability.photoExcess} photo${applicability.photoExcess === 1 ? "" : "s"} returns unused${incomplete}`;
  }
  return "Compatible";
}

function getSpreadStart(pageIndex: number) {
  return pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
}

function getRenderedOverflow(
  frame: Pick<DOMRect, "width" | "height">,
  imageWidth: number,
  imageHeight: number,
  placementScale = 1,
) {
  if (frame.width <= 0 || frame.height <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.max(frame.width / imageWidth, frame.height / imageHeight) * placementScale;
  return {
    x: Math.max(0, imageWidth * scale - frame.width),
    y: Math.max(0, imageHeight * scale - frame.height),
  };
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}
