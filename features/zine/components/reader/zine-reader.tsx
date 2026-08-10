"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type TransitionEvent,
} from "react";
import type { PageFlip } from "page-flip";
import { Icon } from "@/components/ui/icon";
import type { ZineDraft } from "../../model/zine-draft";
import { createZineReaderPages } from "../../model/zine-pages";
import { ZineReaderPageView } from "./zine-reader-page";
import styles from "./zine-reader.module.css";

type PointerStart = {
  readonly pageIndex: number | null;
  readonly x: number;
  readonly y: number;
};

type LastTap = {
  readonly pageIndex: number;
  readonly at: number;
};

type CameraTransform = {
  readonly originX: number;
  readonly originY: number;
  readonly translateX: number;
  readonly translateY: number;
  readonly scale: number;
};

type CameraPhase = "spread" | "zooming-in" | "focused" | "zooming-out";

export function ZineReader({ draft, onClose }: { readonly draft: ZineDraft; readonly onClose: () => void }) {
  const pages = useMemo(() => createZineReaderPages(draft), [draft]);
  const sourceRef = useRef<HTMLDivElement>(null);
  const bookSlotRef = useRef<HTMLDivElement>(null);
  const viewportRef = useRef<HTMLElement>(null);
  const pageFlipRef = useRef<PageFlip | null>(null);
  const pointerStartRef = useRef<PointerStart | null>(null);
  const lastTapRef = useRef<LastTap | null>(null);
  const focusTapRef = useRef(0);
  const doubleTapTriggeredRef = useRef(false);
  const suppressNativeDoubleClickUntilRef = useRef(0);
  const cameraTransitionTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraPhaseRef = useRef<CameraPhase>("spread");
  const [currentPage, setCurrentPage] = useState(0);
  const [focusedPage, setFocusedPage] = useState<number | null>(null);
  const [cameraTransform, setCameraTransform] = useState<CameraTransform | null>(null);
  const [cameraPhase, setCameraPhase] = useState<CameraPhase>("spread");
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const lastPage = pages.length - 1;

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
          maxWidth: 420,
          minHeight: 160,
          maxHeight: 560,
          usePortrait: false,
          showCover: true,
          autoSize: true,
          drawShadow: true,
          maxShadowOpacity: 0.22,
          flippingTime: 520,
          mobileScrollSupport: true,
          swipeDistance: 12,
          disableFlipByClick: true,
          showPageCorners: true,
          useMouseEvents: true,
        });
        instance.on("flip", (event) => setCurrentPage(Number(event.data)));
        instance.loadFromHTML(pageElements);
        pageFlipRef.current = instance;
        setStatus("ready");
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
  }, [pages]);

  const clearFocusClasses = useCallback(() => {
    const slot = bookSlotRef.current;
    if (!slot) return;
    for (const page of slot.querySelectorAll<HTMLElement>("[data-zine-page-index]")) {
      page.classList.remove(styles.cameraTarget, styles.cameraOther);
    }
  }, []);

  const clearCameraTimer = useCallback(() => {
    if (!cameraTransitionTimerRef.current) return;
    clearTimeout(cameraTransitionTimerRef.current);
    cameraTransitionTimerRef.current = null;
  }, []);

  const finishZoomIn = useCallback(() => {
    if (cameraPhaseRef.current !== "zooming-in") return;
    clearCameraTimer();
    cameraPhaseRef.current = "focused";
    setCameraPhase("focused");
  }, [clearCameraTimer]);

  const finishZoomOut = useCallback(() => {
    if (cameraPhaseRef.current !== "zooming-out") return;
    clearCameraTimer();
    clearFocusClasses();
    setFocusedPage(null);
    cameraPhaseRef.current = "spread";
    setCameraPhase("spread");
  }, [clearCameraTimer, clearFocusClasses]);

  const closeFocusedPage = useCallback(() => {
    if (cameraPhaseRef.current !== "focused") return;
    clearCameraTimer();
    cameraPhaseRef.current = "zooming-out";
    setCameraPhase("zooming-out");
    clearFocusClasses();
    setCameraTransform(null);
    focusTapRef.current = 0;
    cameraTransitionTimerRef.current = setTimeout(finishZoomOut, 620);
  }, [clearCameraTimer, clearFocusClasses, finishZoomOut]);

  useEffect(() => {
    if (focusedPage === null) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") closeFocusedPage();
    }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [closeFocusedPage, focusedPage]);

  useEffect(() => () => {
    clearCameraTimer();
  }, [clearCameraTimer]);

  function openFocusedPage(pageIndex: number | null) {
    if (cameraPhaseRef.current !== "spread") return;
    if (pageIndex === null || pageIndex <= 0 || pageIndex >= lastPage) return;
    const transform = getCameraTransform(bookSlotRef.current, viewportRef.current, pageIndex);
    if (!transform) return;

    clearCameraTimer();
    const slot = bookSlotRef.current;
    if (!slot) return;
    for (const page of slot.querySelectorAll<HTMLElement>("[data-zine-page-index]")) {
      const isTarget = Number(page.dataset.zinePageIndex) === pageIndex;
      page.classList.toggle(styles.cameraTarget, isTarget);
      page.classList.toggle(styles.cameraOther, !isTarget);
    }
    focusTapRef.current = 0;
    cameraPhaseRef.current = "zooming-in";
    setCameraPhase("zooming-in");
    setFocusedPage(pageIndex);
    setCameraTransform(transform);
    cameraTransitionTimerRef.current = setTimeout(finishZoomIn, 620);
  }

  function handleBookClick(event: MouseEvent<HTMLDivElement>) {
    const pageIndex = getPageIndex(event.target);
    if (currentPage === 0 && pageIndex === 0) pageFlipRef.current?.flipNext();
  }

  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    const pageIndex = getPageIndex(event.target);
    if (event.pointerType !== "mouse") {
      const now = Date.now();
      const lastTap = lastTapRef.current;
      if (lastTap?.pageIndex === pageIndex && now - lastTap.at < 320) {
        event.preventDefault();
        suppressNativeDoubleClickUntilRef.current = now + 700;
        lastTapRef.current = null;
        pointerStartRef.current = null;
        doubleTapTriggeredRef.current = true;
        openFocusedPage(pageIndex);
        return;
      }
    }
    pointerStartRef.current = {
      pageIndex,
      x: event.clientX,
      y: event.clientY,
    };
  }

  function handlePointerUp(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    if (doubleTapTriggeredRef.current) {
      doubleTapTriggeredRef.current = false;
      return;
    }
    const start = pointerStartRef.current;
    const pageIndex = getPageIndex(event.target);
    pointerStartRef.current = null;
    if (!start || pageIndex === null || start.pageIndex !== pageIndex) return;
    if (Math.hypot(event.clientX - start.x, event.clientY - start.y) > 12) return;

    const now = Date.now();
    lastTapRef.current = { pageIndex, at: now };
  }

  function handleFocusPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (event.pointerType === "mouse") return;
    if (cameraPhaseRef.current !== "focused") return;
    const now = Date.now();
    if (now - focusTapRef.current < 320) {
      event.preventDefault();
      suppressNativeDoubleClickUntilRef.current = now + 700;
      focusTapRef.current = 0;
      closeFocusedPage();
    } else {
      focusTapRef.current = now;
    }
  }

  function handleCameraTransitionEnd(event: TransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.propertyName !== "transform") return;
    if (cameraPhaseRef.current === "zooming-in") finishZoomIn();
    else if (cameraPhaseRef.current === "zooming-out") finishZoomOut();
  }

  const stageClass = [
    styles.bookStage,
    currentPage === 0 ? styles.coverStage : "",
    currentPage === lastPage ? styles.backStage : "",
    cameraPhase !== "spread" ? styles.cameraStage : "",
  ].filter(Boolean).join(" ");

  const bookSlotStyle = cameraTransform ? {
    transformOrigin: `${cameraTransform.originX}px ${cameraTransform.originY}px`,
    transform: `translate3d(${cameraTransform.translateX}px, ${cameraTransform.translateY}px, 0) scale(${cameraTransform.scale})`,
  } : undefined;

  return (
    <main className={styles.reader}>
      <header className={styles.readerHeader}>
        <button type="button" onClick={onClose} aria-label="Return to zine overview">
          <Icon name="close" size={17} />
        </button>
        <div><strong>{draft.name}</strong><span>Reader</span></div>
        <span className={styles.readerStatus}>{status === "error" ? "Reader unavailable" : "Draft"}</span>
      </header>

      <section ref={viewportRef} className={styles.readerViewport} aria-label={`${draft.name} zine reader`}>
        <div
          className={stageClass}
          onClickCapture={handleBookClick}
          onDoubleClickCapture={(event) => {
            if (Date.now() < suppressNativeDoubleClickUntilRef.current) {
              event.preventDefault();
              event.stopPropagation();
              return;
            }
            if (cameraPhaseRef.current === "focused") closeFocusedPage();
            else if (cameraPhaseRef.current === "spread") openFocusedPage(getPageIndex(event.target));
          }}
          onPointerDownCapture={handlePointerDown}
          onPointerUpCapture={handlePointerUp}
        >
          <div
            ref={bookSlotRef}
            className={styles.bookSlot}
            style={bookSlotStyle}
            onTransitionEnd={handleCameraTransitionEnd}
          />
          {cameraPhase !== "spread" ? (
            <div
              className={styles.cameraGuard}
              onPointerDown={handleFocusPointerDown}
              aria-hidden="true"
            />
          ) : null}
        </div>

        <div ref={sourceRef} className={styles.sourcePages} aria-hidden="true">
          {pages.map((page, index) => (
            <ZineReaderPageView key={page.id} page={page} pageIndex={index} />
          ))}
        </div>

        {status === "loading" ? <p className={styles.loading}>Building your zine…</p> : null}
        {status === "error" ? <p className={styles.loading}>The page-turning engine could not start.</p> : null}

      </section>

      <footer className={styles.readerControls}>
        <button
          type="button"
          aria-label="Previous spread"
          disabled={currentPage === 0 || status !== "ready" || cameraPhase !== "spread"}
          onClick={() => pageFlipRef.current?.flipPrev()}
        >
          <Icon name="arrow" size={17} />
        </button>
        <div>
          <strong>{getProgressLabel(currentPage, lastPage)}</strong>
          <span>{cameraPhase !== "spread" ? "Double-click or double-tap to return" : currentPage === 0 ? "Click the cover to open" : "Swipe, drag, or double-click a page"}</span>
        </div>
        <button
          type="button"
          aria-label="Next spread"
          disabled={currentPage === lastPage || status !== "ready" || cameraPhase !== "spread"}
          onClick={() => pageFlipRef.current?.flipNext()}
        >
          <Icon name="arrow" size={17} />
        </button>
      </footer>
    </main>
  );
}

function getCameraTransform(
  slot: HTMLDivElement | null,
  viewport: HTMLElement | null,
  pageIndex: number,
): CameraTransform | null {
  if (!slot || !viewport) return null;
  const candidates = slot.querySelectorAll<HTMLElement>(`[data-zine-page-index="${pageIndex}"]`);
  const target = Array.from(candidates).find((page) => {
    const rect = page.getBoundingClientRect();
    return rect.width > 1 && rect.height > 1 && getComputedStyle(page).display !== "none";
  });
  if (!target) return null;

  const pageRect = target.getBoundingClientRect();
  const slotRect = slot.getBoundingClientRect();
  const viewportRect = viewport.getBoundingClientRect();
  const availableWidth = Math.max(1, viewportRect.width - 28);
  const availableHeight = Math.max(1, viewportRect.height - 28);
  const scale = Math.max(1, Math.min(2, availableWidth / pageRect.width, availableHeight / pageRect.height));
  const pageCenterX = pageRect.left + pageRect.width / 2;
  const pageCenterY = pageRect.top + pageRect.height / 2;

  return {
    originX: pageCenterX - slotRect.left,
    originY: pageCenterY - slotRect.top,
    translateX: viewportRect.left + viewportRect.width / 2 - pageCenterX,
    translateY: viewportRect.top + viewportRect.height / 2 - pageCenterY,
    scale,
  };
}

function getPageIndex(target: EventTarget) {
  if (!(target instanceof Element)) return null;
  const page = target.closest<HTMLElement>("[data-zine-page-index]");
  if (!page) return null;
  const value = Number(page.dataset.zinePageIndex);
  return Number.isInteger(value) ? value : null;
}

function getProgressLabel(currentPage: number, lastPage: number) {
  if (currentPage === 0) return "Cover";
  if (currentPage === lastPage) return "Back cover";
  const right = Math.min(currentPage + 1, lastPage - 1);
  return `${currentPage}–${right} / ${lastPage - 1}`;
}
