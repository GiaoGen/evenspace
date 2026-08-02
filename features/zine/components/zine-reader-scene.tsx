"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";

import type { ZineLayoutDocument, ZinePage as ZinePageValue } from "@/features/zine/model/layout-document";
import { ZinePage } from "./zine-page";
import styles from "./zine-reader-scene.module.css";

type ReaderPhase = "front" | "inside" | "back";

function isPage(page: ZinePageValue | null): page is ZinePageValue {
  return page !== null;
}

export function ZineReaderScene({ document }: { readonly document: ZineLayoutDocument }) {
  const router = useRouter();
  const [phase, setPhase] = useState<ReaderPhase>("front");
  const [spreadIndex, setSpreadIndex] = useState(0);
  const [mobilePageIndex, setMobilePageIndex] = useState(0);
  const backgroundPhoto = document.photos.find((photo) => photo.id === document.cover.backgroundSourcePhotoId);
  const mobilePages = useMemo(
    () => document.spreads.flatMap((spread) => [spread.left, spread.right]).filter(isPage),
    [document.spreads],
  );
  const currentSpread = document.spreads[spreadIndex] ?? document.spreads[0];
  const currentMobilePage = mobilePages[mobilePageIndex] ?? mobilePages[0];
  const sceneStyle = {
    "--zine-page-ratio-number": document.pageRatio.width / document.pageRatio.height,
  } as CSSProperties;

  function openBook() {
    setSpreadIndex(0);
    setMobilePageIndex(0);
    setPhase("inside");
  }

  function previousDesktop() {
    if (phase === "back") {
      setSpreadIndex(document.spreads.length - 1);
      setPhase("inside");
      return;
    }
    if (phase !== "inside") return;
    setSpreadIndex((current) => {
      if (current === 0) setPhase("front");
      return Math.max(0, current - 1);
    });
  }

  function nextDesktop() {
    if (phase === "front") {
      openBook();
      return;
    }
    if (phase !== "inside") return;
    setSpreadIndex((current) => {
      if (current >= document.spreads.length - 1) setPhase("back");
      return Math.min(document.spreads.length - 1, current + 1);
    });
  }

  function previousMobile() {
    if (phase === "back") {
      setMobilePageIndex(mobilePages.length - 1);
      setPhase("inside");
      return;
    }
    if (phase !== "inside") return;
    setMobilePageIndex((current) => {
      if (current === 0) setPhase("front");
      return Math.max(0, current - 1);
    });
  }

  function nextMobile() {
    if (phase === "front") {
      openBook();
      return;
    }
    if (phase !== "inside") return;
    setMobilePageIndex((current) => {
      if (current >= mobilePages.length - 1) setPhase("back");
      return Math.min(mobilePages.length - 1, current + 1);
    });
  }

  function isMobilePaging() {
    return typeof window !== "undefined" && window.matchMedia("(max-width: 720px)").matches;
  }

  function previousForViewport() {
    if (isMobilePaging()) previousMobile();
    else previousDesktop();
  }

  function nextForViewport() {
    if (isMobilePaging()) nextMobile();
    else nextDesktop();
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      previousForViewport();
    } else if (event.key === "ArrowRight" || event.key === "Enter" && phase === "front") {
      event.preventDefault();
      nextForViewport();
    } else if (event.key === "Escape") {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <main className={styles.scene} style={sceneStyle} onKeyDown={handleKeyDown}>
      <div className={styles.background} aria-hidden="true">
        {backgroundPhoto ? (
          <Image
            src={backgroundPhoto.src}
            alt=""
            fill
            sizes="100vw"
            style={{ objectFit: "cover" }}
            placeholder={backgroundPhoto.placeholderDataUrl ? "blur" : "empty"}
            blurDataURL={backgroundPhoto.placeholderDataUrl}
            loading="eager"
            unoptimized
          />
        ) : null}
      </div>

      {phase === "front" ? (
        <button className={`${styles.reader} ${styles.readerClosed}`} type="button" onClick={openBook} aria-label={`Open ${document.title}`}>
          <ZinePage document={document} page={document.cover} side="closed" />
        </button>
      ) : phase === "back" ? (
        <button className={`${styles.reader} ${styles.readerClosed}`} type="button" onClick={previousForViewport} aria-label={`Return to the last spread of ${document.title}`}>
          <ZinePage document={document} page={document.backCover} side="closed" />
        </button>
      ) : (
        <div className={`${styles.reader} ${styles.readerOpen}`} role="group" aria-label={`${document.title}, open zine`}>
          <button className={`${styles.pageAction} ${styles.desktopLeft}`} type="button" onClick={previousDesktop} aria-label="Previous spread">
            {currentSpread.left ? <ZinePage document={document} page={currentSpread.left} side="left" eager /> : <span className={styles.missingPage} />}
          </button>
          <button className={`${styles.pageAction} ${styles.desktopRight}`} type="button" onClick={nextDesktop} aria-label="Next spread">
            {currentSpread.right ? <ZinePage document={document} page={currentSpread.right} side="right" eager /> : <span className={styles.missingPage} />}
          </button>
          <div className={styles.mobilePage}>
            <ZinePage document={document} page={currentMobilePage} side={mobilePageIndex % 2 === 0 ? "left" : "right"} eager />
            <button className={`${styles.mobileHitArea} ${styles.mobileHitPrevious}`} type="button" onClick={previousMobile} aria-label="Previous page" />
            <button className={`${styles.mobileHitArea} ${styles.mobileHitNext}`} type="button" onClick={nextMobile} aria-label="Next page" />
          </div>
        </div>
      )}
    </main>
  );
}
