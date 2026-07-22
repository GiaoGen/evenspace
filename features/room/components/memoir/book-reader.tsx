"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { PersonSummary } from "@/core/domain/room";
import { BookPages } from "./book-pages";
import type { MemoirDocument } from "./memoir-model";
import styles from "./book-reader.module.css";
import { useBookPageFlip } from "./use-book-page-flip";

type ReaderView = "single" | "spread";
type PageSide = "left" | "right";

const SWIPE_DISTANCE = 44;
const SWIPE_SLOPE = 0.7;

export function BookReader({ document, members, onOpenPhoto }: {
  readonly document: MemoirDocument;
  readonly members: readonly PersonSummary[];
  readonly onOpenPhoto: (photoId: string) => void;
}) {
  const [view, setView] = useState<ReaderView>("spread");
  const [focusSide, setFocusSide] = useState<PageSide>("right");
  const [currentPage, setCurrentPage] = useState(0);
  const viewRef = useRef<ReaderView>(view);
  const pointerStartRef = useRef<{ readonly id: number; readonly x: number; readonly y: number } | null>(null);
  const contentKey = useMemo(
    () => document.pages.map((page) => `${page.id}:${page.paperStyle}:${page.items.map((item) => item.id).join(",")}`).join("|"),
    [document.pages],
  );

  const handlePageChange = useCallback((nextPage: number) => {
    setCurrentPage((previousPage) => {
      if (viewRef.current === "single" && nextPage !== previousPage) {
        setFocusSide(nextPage > previousPage ? "left" : "right");
      }
      return nextPage;
    });
  }, []);

  const { stageRef, mountRef, ready, pageCount, update, flipNext, flipPrevious } = useBookPageFlip({
    contentKey,
    onPageChange: handlePageChange,
  });

  useEffect(() => {
    viewRef.current = view;
    let secondFrame = 0;
    const firstFrame = window.requestAnimationFrame(() => {
      update();
      secondFrame = window.requestAnimationFrame(update);
    });
    return () => {
      window.cancelAnimationFrame(firstFrame);
      window.cancelAnimationFrame(secondFrame);
    };
  }, [update, view]);

  const moveForward = useCallback(() => {
    if (pageCount > 0 && currentPage >= pageCount - 1) return;
    if (view === "single" && focusSide === "left") {
      setFocusSide("right");
      return;
    }
    flipNext();
  }, [currentPage, flipNext, focusSide, pageCount, view]);

  const moveBackward = useCallback(() => {
    if (currentPage === 0) return;
    if (view === "single" && focusSide === "right") {
      setFocusSide("left");
      return;
    }
    flipPrevious();
  }, [currentPage, flipPrevious, focusSide, view]);

  function handlePointerDown(event: React.PointerEvent<HTMLDivElement>) {
    if (!event.isPrimary) return;
    pointerStartRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLDivElement>) {
    const start = pointerStartRef.current;
    pointerStartRef.current = null;
    if (!start || start.id !== event.pointerId) return;
    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    if (Math.abs(deltaX) < SWIPE_DISTANCE || Math.abs(deltaY) > Math.abs(deltaX) * SWIPE_SLOPE) return;
    if (deltaX < 0) moveForward();
    else moveBackward();
  }

  const totalMemories = document.pages.reduce((count, page) => count + page.items.length, 0);
  const pageLabel = getPageLabel(currentPage, document.pages.length, pageCount);
  const progress = pageCount > 1 ? Math.min(1, currentPage / (pageCount - 1)) : 0;
  const atBeginning = currentPage === 0;
  const atEnd = pageCount > 0 && currentPage >= pageCount - 1;

  return (
    <div className={styles.reader}>
      <header className={styles.readerHeader}>
        <div>
          <span>{pageLabel}</span>
          <span>{totalMemories} memories</span>
        </div>
        <div className={styles.progressTrack} aria-hidden="true">
          <i style={{ transform: `scaleX(${progress})` }} />
        </div>
      </header>

      <div
        ref={stageRef}
        className={`${styles.stage} ${ready ? styles.ready : styles.preparing} ${view === "single" ? styles.single : styles.spread} ${focusSide === "left" ? styles.focusLeft : styles.focusRight}`}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerCancel={() => { pointerStartRef.current = null; }}
      >
        <div className={styles.loadingCover} aria-hidden="true">
          <span>EventSpace memoir</span>
          <strong>{document.title}</strong>
        </div>
        <div className={styles.track}>
          <div ref={mountRef} className={styles.pageFlipMount} key={contentKey}>
            <BookPages document={document} members={members} onOpenPhoto={onOpenPhoto} />
          </div>
        </div>
      </div>

      <nav className={styles.readerControls} aria-label="Book controls">
        <button type="button" onClick={moveBackward} disabled={atBeginning} aria-label="Previous page" title="Previous page">
          <Icon name="chevron" size={18} />
        </button>
        <div className={styles.viewSwitch} aria-label="Book view">
          <button type="button" className={view === "single" ? styles.activeView : ""} onClick={() => setView("single")} aria-pressed={view === "single"}>
            <Icon name="image" size={15} /><span>Single</span>
          </button>
          <button type="button" className={view === "spread" ? styles.activeView : ""} onClick={() => setView("spread")} aria-pressed={view === "spread"}>
            <Icon name="grid" size={15} /><span>Spread</span>
          </button>
        </div>
        <button type="button" onClick={moveForward} disabled={atEnd} aria-label="Next page" title="Next page">
          <Icon name="chevron" size={18} />
        </button>
      </nav>
    </div>
  );
}

function getPageLabel(currentPage: number, documentPageCount: number, enginePageCount: number) {
  if (currentPage === 0) return "Cover";
  if (enginePageCount > 0 && currentPage >= enginePageCount - 1) return "Back cover";

  const visibleDocumentPages = [currentPage, currentPage + 1]
    .map((enginePage) => enginePage - 1)
    .filter((documentPage) => documentPage >= 1 && documentPage <= documentPageCount);
  if (visibleDocumentPages.length === 0) return "Inside cover";

  const firstPage = visibleDocumentPages[0];
  const lastPage = visibleDocumentPages.at(-1) ?? firstPage;
  return firstPage === lastPage ? `Page ${firstPage}` : `Pages ${firstPage}-${lastPage}`;
}
