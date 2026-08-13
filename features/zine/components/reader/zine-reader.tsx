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
import { Icon } from "@/components/ui/icon";
import type { ZineDraft } from "../../model/zine-draft";
import { createZineReaderPages } from "../../model/zine-pages";
import { ZineReaderPageView } from "./zine-reader-page";
import styles from "./zine-reader.module.css";

type ViewMode = "spread" | "focus";
type CameraMotion = "idle" | "moving" | "flipping";

type CameraGeometry = {
  readonly focusWidth: number;
  readonly scale: number;
  readonly shift: number;
};

type PointerIntent = {
  readonly pointerId: number;
  readonly pageIndex: number | null;
  readonly startClientX: number;
  readonly startClientY: number;
  moved: boolean;
};

type LastTap = {
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

export function ZineReader({
  draft,
  onClose,
}: {
  readonly draft: ZineDraft;
  readonly onClose: () => void;
}) {
  const pages = useMemo(() => createZineReaderPages(draft), [draft]);
  const sourceRef = useRef<HTMLDivElement>(null);
  const bookSlotRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const currentPageRef = useRef(0);
  const viewModeRef = useRef<ViewMode>("spread");
  const cameraMotionRef = useRef<CameraMotion>("idle");
  const focusedPageRef = useRef<number | null>(null);
  const pointerIntentRef = useRef<PointerIntent | null>(null);
  const blockedPointerRef = useRef<number | null>(null);
  const pendingPageTurnRef = useRef<PendingPageTurn | null>(null);
  const lastTapRef = useRef<LastTap | null>(null);
  const suppressNativeDoubleClickUntilRef = useRef(0);
  const cameraTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pageTurnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>("spread");
  const [cameraMotion, setCameraMotion] = useState<CameraMotion>("idle");
  const [cameraGeometry, setCameraGeometry] = useState(defaultCameraGeometry);
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const lastPage = pages.length - 1;

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

    setCameraGeometry({
      focusWidth: scaledPageWidth + peek,
      scale,
      shift: Math.max(0, (scaledPageWidth - peek) / 2),
    });
  }, []);

  const openFocusedPage = useCallback((pageIndex: number | null) => {
    if (pageIndex === null || pageIndex <= 0 || pageIndex >= lastPage) return;
    if (cameraMotionRef.current === "flipping") return;
    lastTapRef.current = null;
    measureCameraGeometry();
    viewModeRef.current = "focus";
    setViewMode("focus");
    focusedPageRef.current = pageIndex;
    setFocusedPage(pageIndex);
    beginCameraMotion();
  }, [beginCameraMotion, lastPage, measureCameraGeometry]);

  const closeFocusedPage = useCallback(() => {
    if (viewModeRef.current !== "focus" || cameraMotionRef.current === "flipping") return;
    lastTapRef.current = null;
    focusedPageRef.current = null;
    setFocusedPage(null);
    viewModeRef.current = "spread";
    setViewMode("spread");
    beginCameraMotion();
  }, [beginCameraMotion]);

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
      if (pageFlip.getCurrentPageIndex() === getSpreadStart(pending.targetPage)) {
        completePageTurn();
      } else {
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
      if (!source || !slot || pages.length === 0) return;

      try {
        const pageFlipPackage = await import("page-flip");
        if (cancelled) return;

        engineRoot = document.createElement("div");
        engineRoot.className = styles.flipBook;
        slot.replaceChildren(engineRoot);
        const pageElements = Array.from(source.children, (element) => (
          element.cloneNode(true) as HTMLElement
        ));
        instance = new pageFlipPackage.PageFlip(engineRoot, {
          width: 360,
          height: 480,
          size: "stretch",
          minWidth: 120,
          maxWidth: 460,
          minHeight: 160,
          maxHeight: 614,
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
  }, [completePageTurn, measureCameraGeometry, pages]);

  useEffect(() => {
    function updateAfterResize() {
      window.requestAnimationFrame(() => window.requestAnimationFrame(measureCameraGeometry));
    }
    window.addEventListener("resize", updateAfterResize);
    return () => window.removeEventListener("resize", updateAfterResize);
  }, [measureCameraGeometry]);

  useEffect(() => {
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeFocusedPage();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeFocusedPage]);

  useEffect(() => () => {
    if (cameraTimerRef.current) clearTimeout(cameraTimerRef.current);
    if (pageTurnTimerRef.current) clearTimeout(pageTurnTimerRef.current);
  }, []);

  function handleBookClick(event: MouseEvent<HTMLDivElement>) {
    if (viewModeRef.current !== "spread") return;
    const pageIndex = getPageIndex(event.target);
    if (currentPageRef.current === 0 && pageIndex === 0) pageFlipRef.current?.flipNext();
  }

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
    const isFocus = viewModeRef.current === "focus";
    if (isFocus) blockPointerGesture(event);
    pointerIntentRef.current = {
      pointerId: event.pointerId,
      pageIndex: getPageIndex(event.target),
      startClientX: event.clientX,
      startClientY: event.clientY,
      moved: false,
    };
  }

  function handlePointerMove(event: PointerEvent<HTMLDivElement>) {
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
    const intent = pointerIntentRef.current;
    if (intent?.pointerId === event.pointerId) {
      pointerIntentRef.current = null;
      if (event.type !== "pointercancel" && intent.pageIndex !== null) {
        if (!intent.moved) confirmTap(intent.pageIndex, event.timeStamp);
        else if (viewModeRef.current === "focus") navigateFocusedPage(intent, event);
      }
    }
    if (blockedPointerRef.current === event.pointerId) finishBlockedPointer(event);
  }

  function confirmTap(pageIndex: number, at: number) {
    const lastTap = lastTapRef.current;
    if (lastTap?.pageIndex === pageIndex && at - lastTap.at < 340) {
      lastTapRef.current = null;
      suppressNativeDoubleClickUntilRef.current = at + 700;
      if (viewModeRef.current === "focus") closeFocusedPage();
      else openFocusedPage(pageIndex);
      return;
    }
    lastTapRef.current = { pageIndex, at };
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

  function blockPointerGesture(event: PointerEvent<HTMLDivElement>) {
    blockedPointerRef.current = event.pointerId;
    if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.setPointerCapture(event.pointerId);
    }
    event.preventDefault();
    event.stopPropagation();
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
  const stageClass = [
    styles.bookStage,
    currentPage === 0 ? styles.coverStage : "",
    currentPage === lastPage ? styles.backStage : "",
  ].filter(Boolean).join(" ");

  return (
    <main className={styles.reader} data-zine-locale={draft.locale} lang={draft.locale}>
      <header className={styles.readerHeader}>
        <button type="button" onClick={onClose} aria-label="Return to zine overview">
          <Icon name="close" size={17} />
        </button>
        <div><strong>{draft.name}</strong><span>Reader</span></div>
        <span className={styles.readerStatus}>{status === "error" ? "Reader unavailable" : "Draft"}</span>
      </header>

      <section ref={viewportRef} className={styles.readerViewport} aria-label={`${draft.name} zine reader`}>
        <div
          className={styles.cameraWindow}
          data-view-mode={viewMode}
          style={cameraWindowStyle}
          onClickCapture={handleBookClick}
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
            className={stageClass}
            style={bookStageStyle}
            onTransitionEnd={handleCameraTransitionEnd}
          >
            <div ref={bookSlotRef} className={styles.bookSlot} />
          </div>
        </div>

        <div ref={sourceRef} className={styles.sourcePages} aria-hidden="true">
          {pages.map((page, index) => (
            <ZineReaderPageView key={page.id} page={page} pageIndex={index} mode="reader" />
          ))}
        </div>

        {status === "loading" ? <p className={styles.loading}>Building your zine…</p> : null}
        {status === "error" ? <p className={styles.loading}>The page-turning engine could not start.</p> : null}
      </section>

      <footer className={styles.readerControls}>
        <button
          type="button"
          aria-label="Previous spread"
          disabled={currentPage === 0 || status !== "ready" || viewMode !== "spread" || cameraMotion !== "idle"}
          onClick={() => pageFlipRef.current?.flipPrev()}
        >
          <Icon name="arrow" size={17} />
        </button>
        <div>
          <strong>{getProgressLabel(currentPage, lastPage)}</strong>
          <span>{viewMode === "focus" ? "Double-click or double-tap to return" : currentPage === 0 ? "Click the cover to open" : "Swipe, drag, or double-click a page"}</span>
        </div>
        <button
          type="button"
          aria-label="Next spread"
          disabled={currentPage === lastPage || status !== "ready" || viewMode !== "spread" || cameraMotion !== "idle"}
          onClick={() => pageFlipRef.current?.flipNext()}
        >
          <Icon name="arrow" size={17} />
        </button>
      </footer>
    </main>
  );
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

function getProgressLabel(currentPage: number, lastPage: number) {
  if (currentPage === 0) return "Cover";
  if (currentPage === lastPage) return "Back cover";
  const right = Math.min(currentPage + 1, lastPage - 1);
  return `${currentPage}–${right} / ${lastPage - 1}`;
}
