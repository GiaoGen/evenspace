import Image from "next/image";
import type { CSSProperties } from "react";

import type {
  ZineGridFrame,
  ZineLayoutDocument,
  ZinePage as ZinePageValue,
} from "@/features/zine/model/layout-document";
import styles from "./zine-page.module.css";

type RenderablePage = ZineLayoutDocument["cover"] | ZineLayoutDocument["backCover"] | ZinePageValue;

function frameStyle(frame: ZineGridFrame): CSSProperties {
  return {
    gridColumn: `${frame.column} / span ${frame.columnSpan}`,
    gridRow: `${frame.row} / span ${frame.rowSpan}`,
  };
}

function PhotoPlacement({
  document,
  placement,
  cover,
  eager,
}: {
  readonly document: ZineLayoutDocument;
  readonly placement: ZineLayoutDocument["cover"]["placements"][number];
  readonly cover?: boolean;
  readonly eager?: boolean;
}) {
  const photo = document.photos.find((candidate) => candidate.id === placement.photoId);
  if (!photo) return null;
  return (
    <figure
      className={`${styles.photo} ${placement.tone === "muted" ? styles.photoMuted : ""}`}
      style={frameStyle(placement.frame)}
    >
      <Image
        src={photo.src}
        alt={cover ? `Cover photograph. ${photo.alt}` : photo.alt}
        fill
        sizes={cover ? "(max-width: 720px) 82vw, 34vw" : "(max-width: 720px) 76vw, 30vw"}
        style={{
          objectFit: placement.fit,
          objectPosition: `${placement.focalPoint.x * 100}% ${placement.focalPoint.y * 100}%`,
        }}
        placeholder={photo.placeholderDataUrl ? "blur" : "empty"}
        blurDataURL={photo.placeholderDataUrl}
        loading={cover || eager ? "eager" : "lazy"}
        unoptimized
      />
    </figure>
  );
}

function Folio({ value }: { readonly value: number | null }) {
  return value ? <span className={styles.folio}>{String(value).padStart(2, "0")}</span> : null;
}

export function ZinePage({
  document,
  page,
  side,
  eager = false,
}: {
  readonly document: ZineLayoutDocument;
  readonly page: RenderablePage;
  readonly side: "left" | "right" | "closed";
  readonly eager?: boolean;
}) {
  const pageStyle = {
    "--zine-page-ratio": `${document.pageRatio.width} / ${document.pageRatio.height}`,
  } as CSSProperties;

  if (page.kind === "cover") {
    return (
      <article
        className={`${styles.page} ${styles.cover} ${styles[page.composition]}`}
        data-page-side="closed"
        style={pageStyle}
        aria-label={`Cover of ${document.title}`}
      >
        <div className={styles.grid}>
          {page.placements.map((placement) => (
            <PhotoPlacement key={placement.photoId} document={document} placement={placement} cover eager />
          ))}
          {page.cornerMark ? <span className={styles.cornerMark}>{page.cornerMark}</span> : null}
        </div>
      </article>
    );
  }

  if (page.kind === "back-cover") {
    return (
      <article
        className={`${styles.page} ${styles.backCover}`}
        data-page-side="closed"
        style={pageStyle}
        aria-label={`Back cover of ${document.title}`}
      >
        {page.mark ? <span className={styles.backMark}>{page.mark}</span> : null}
      </article>
    );
  }

  if (page.kind === "blank") {
    return <article className={`${styles.page} ${styles.blank}`} data-page-side={side} style={pageStyle} aria-label="Blank page" />;
  }

  if (page.kind === "chapter") {
    const chapter = document.chapters.find((candidate) => candidate.id === page.chapterId);
    return (
      <article className={`${styles.page} ${styles.chapter}`} data-page-side={side} style={pageStyle} aria-label={`Chapter: ${chapter?.title ?? "Untitled"}`}>
        <div className={styles.chapterContent}>
          {chapter?.timeLabel ? <p>{chapter.timeLabel}</p> : null}
          <h2>{chapter?.title ?? "Untitled"}</h2>
        </div>
        <Folio value={page.folio} />
      </article>
    );
  }

  return (
    <article className={`${styles.page} ${styles.composition}`} data-page-side={side} style={pageStyle} aria-label={`Page ${page.folio ?? ""}`.trim()}>
      <div className={styles.grid}>
        {page.placements.map((placement) => (
          <PhotoPlacement key={placement.photoId} document={document} placement={placement} eager={eager} />
        ))}
        {page.annotations.map((annotation) => {
          const text = document.texts.find((candidate) => candidate.id === annotation.textId);
          if (!text) return null;
          return (
            <blockquote
              key={annotation.textId}
              className={`${styles.annotation} ${annotation.corner === "outer-bottom" ? styles.annotationBottom : ""}`}
              style={frameStyle(annotation.frame)}
            >
              <p>{text.body}</p>
              {text.kind === "comment" ? <cite>{text.authorName}</cite> : null}
            </blockquote>
          );
        })}
      </div>
      <Folio value={page.folio} />
    </article>
  );
}
