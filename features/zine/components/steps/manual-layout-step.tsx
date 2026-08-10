"use client";

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
import type { PageFlip } from "page-flip";
import type { ZineDraft } from "../../model/zine-draft";
import { createZineReaderPages } from "../../model/zine-pages";
import { ZineReaderPageView } from "../reader/zine-reader-page";
import styles from "./manual-layout-step.module.css";

type ViewMode = "spread" | "focus";
type CameraMotion = "idle" | "moving" | "flipping";

type CameraGeometry = {
  readonly focusWidth: number;
  readonly scale: number;
  readonly shift: number;
};

type PhotoDrag = {
  readonly pointerId: number;
  readonly photoId: string;
  readonly pageIndex: number;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly startPositionX: number;
  readonly startPositionY: number;
  readonly overflowX: number;
  readonly overflowY: number;
  positionX: number;
  positionY: number;
  moved: boolean;
};

type PointerIntent = {
  readonly pointerId: number;
  readonly pageIndex: number | null;
  readonly photoId: string | null;
  readonly startClientX: number;
  readonly startClientY: number;
  readonly allowFocusNavigation: boolean;
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

export function ManualLayoutStep({
  draft,
  onPhotoPositionChange,
}: {
  readonly draft: ZineDraft;
  readonly onPhotoPositionChange: (
    photoId: string,
    positionX: number,
    positionY: number,
  ) => void;
}) {
  const pages = useMemo(() => createZineReaderPages(draft), [draft]);
  const photoById = useMemo(
    () => new Map(draft.photos.map((photo) => [photo.id, photo])),
    [draft.photos],
  );
  const structureKey = useMemo(
    () => JSON.stringify({
      name: draft.name,
      styleId: draft.styleId,
      photos: draft.photos.map((photo) => ({ id: photo.id, caption: photo.caption })),
    }),
    [draft.name, draft.photos, draft.styleId],
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
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const lastPage = pages.length - 1;

  const setPhotoSelection = useCallback((photoId: string | null) => {
    selectedPhotoIdRef.current = photoId;
    setSelectedPhotoId(photoId);
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
    setPhotoSelection(null);
    measureCameraGeometry();
    viewModeRef.current = "focus";
    setViewMode("focus");
    focusedPageRef.current = pageIndex;
    setFocusedPage(pageIndex);
    beginCameraMotion();
  }, [beginCameraMotion, lastPage, measureCameraGeometry, setPhotoSelection]);

  const closeFocusedPage = useCallback(() => {
    if (viewModeRef.current !== "focus" || cameraMotionRef.current === "flipping") return;
    setPhotoSelection(null);
    lastTapRef.current = null;
    focusedPageRef.current = null;
    setFocusedPage(null);
    viewModeRef.current = "spread";
    setViewMode("spread");
    beginCameraMotion();
  }, [beginCameraMotion, setPhotoSelection]);

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
  }, [completePageTurn]);

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
        figure.dataset.zinePhotoId === selectedPhotoId,
      );
    }
  }, [selectedPhotoId, status]);

  useEffect(() => {
    function updateAfterResize() {
      window.requestAnimationFrame(() => window.requestAnimationFrame(measureCameraGeometry));
    }
    window.addEventListener("resize", updateAfterResize);
    return () => window.removeEventListener("resize", updateAfterResize);
  }, [measureCameraGeometry]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && selectedPhotoIdRef.current === null) closeFocusedPage();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeFocusedPage]);

  useEffect(() => () => {
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current);
    if (pageTurnTimerRef.current) clearTimeout(pageTurnTimerRef.current);
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
    const photoId = frame?.dataset.zinePhotoId ?? null;
    const pageIndex = getPageIndex(event.target);
    const selectedId = selectedPhotoIdRef.current;

    if (selectedId !== null) {
      blockPointerGesture(event);
      if (!frame || !photoId) {
        setPhotoSelection(null);
        lastTapRef.current = null;
        return;
      }
      if (selectedId === photoId) {
        beginPhotoDrag(event, frame, photoId, pageIndex);
        return;
      }
      pointerIntentRef.current = createPointerIntent(
        event,
        pageIndex,
        photoId,
        false,
      );
      return;
    }

    const isFocus = viewModeRef.current === "focus";
    if (isFocus) blockPointerGesture(event);
    pointerIntentRef.current = createPointerIntent(
      event,
      pageIndex,
      photoId,
      isFocus,
    );
  }

  function beginPhotoDrag(
    event: PointerEvent<HTMLDivElement>,
    frame: HTMLElement,
    photoId: string,
    pageIndex: number | null,
  ) {
    const photo = photoById.get(photoId);
    if (!photo || pageIndex === null) return;
    const imageFrame = frame.querySelector<HTMLElement>(":scope > div");
    if (!imageFrame) return;
    const overflow = getRenderedOverflow(
      imageFrame.getBoundingClientRect(),
      photo.width,
      photo.height,
    );
    photoDragRef.current = {
      pointerId: event.pointerId,
      photoId,
      pageIndex,
      startClientX: event.clientX,
      startClientY: event.clientY,
      startPositionX: photo.positionX,
      startPositionY: photo.positionY,
      overflowX: overflow.x,
      overflowY: overflow.y,
      positionX: photo.positionX,
      positionY: photo.positionY,
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
      photoDrag.positionX = photoDrag.overflowX > 0
        ? clampPercentage(photoDrag.startPositionX - (deltaX / photoDrag.overflowX) * 100)
        : photoDrag.startPositionX;
      photoDrag.positionY = photoDrag.overflowY > 0
        ? clampPercentage(photoDrag.startPositionY - (deltaY / photoDrag.overflowY) * 100)
        : photoDrag.startPositionY;
      photoDrag.moved ||= Math.hypot(deltaX, deltaY) > 2;
      setVisiblePhotoPosition(photoDrag.photoId, photoDrag.positionX, photoDrag.positionY);
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
        onPhotoPositionChange(photoDrag.photoId, photoDrag.positionX, photoDrag.positionY);
      } else if (event.type !== "pointercancel") {
        confirmTap(`photo:${photoDrag.photoId}`, photoDrag.pageIndex, event.timeStamp);
      }
      finishBlockedPointer(event);
      return;
    }

    const intent = pointerIntentRef.current;
    if (intent?.pointerId === event.pointerId) {
      pointerIntentRef.current = null;
      if (event.type !== "pointercancel") {
        if (!intent.moved && intent.pageIndex !== null) {
          if (intent.photoId) setPhotoSelection(intent.photoId);
          confirmTap(
            intent.photoId ? `photo:${intent.photoId}` : `page:${intent.pageIndex}`,
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

  function setVisiblePhotoPosition(photoId: string, positionX: number, positionY: number) {
    const viewport = viewportRef.current;
    if (!viewport) return;
    for (const image of viewport.querySelectorAll<HTMLImageElement>(
      `[data-zine-photo-id="${CSS.escape(photoId)}"] img`,
    )) {
      image.style.objectPosition = `${positionX}% ${positionY}%`;
    }
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
              <ZineReaderPageView key={page.id} page={page} pageIndex={index} />
            ))}
          </div>

          {status === "loading" ? <p className={styles.stageMessage}>Building your zine…</p> : null}
          {status === "error" ? <p className={styles.stageMessage}>The live book could not start.</p> : null}
        </div>
      </div>
    </section>
  );
}

function createPointerIntent(
  event: PointerEvent<HTMLDivElement>,
  pageIndex: number | null,
  photoId: string | null,
  allowFocusNavigation: boolean,
): PointerIntent {
  return {
    pointerId: event.pointerId,
    pageIndex,
    photoId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    allowFocusNavigation,
    moved: false,
  };
}

function getPhotoFrame(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  return target.closest<HTMLElement>("[data-zine-photo-id]");
}

function getPageIndex(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  const page = target.closest<HTMLElement>("[data-zine-page-index]");
  if (!page) return null;
  const value = Number(page.dataset.zinePageIndex);
  return Number.isInteger(value) ? value : null;
}

function getSpreadStart(pageIndex: number) {
  return pageIndex % 2 === 1 ? pageIndex : pageIndex - 1;
}

function getRenderedOverflow(
  frame: Pick<DOMRect, "width" | "height">,
  imageWidth: number,
  imageHeight: number,
) {
  if (frame.width <= 0 || frame.height <= 0 || imageWidth <= 0 || imageHeight <= 0) {
    return { x: 0, y: 0 };
  }
  const scale = Math.max(frame.width / imageWidth, frame.height / imageHeight);
  return {
    x: Math.max(0, imageWidth * scale - frame.width),
    y: Math.max(0, imageHeight * scale - frame.height),
  };
}

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}
