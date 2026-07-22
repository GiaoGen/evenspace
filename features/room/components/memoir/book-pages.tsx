import type { PersonSummary } from "@/core/domain/room";
import type { MemoirDocument } from "./memoir-model";
import { MemoirPageView } from "./memoir-page";
import styles from "./book-reader.module.css";

export function BookPages({ document, members, onOpenPhoto }: {
  readonly document: MemoirDocument;
  readonly members: readonly PersonSummary[];
  readonly onOpenPhoto: (photoId: string) => void;
}) {
  return (
    <>
      <article className={`${styles.cover} ${styles.frontCover}`} data-density="hard" data-book-page>
        <div className={styles.coverRule} />
        <span className={styles.coverKicker}>EventSpace memoir</span>
        <h2>{document.title}</h2>
        <p>Collected in the moments we shared.</p>
        <small>Private edition</small>
      </article>
      <article className={`${styles.bookPaper} ${styles.insideCover}`} data-book-page>
        <span>Kept together,</span>
        <strong>one page at a time.</strong>
      </article>
      {document.pages.map((page, index) => (
        <div className={styles.bookPaper} data-book-page key={page.id}>
          <MemoirPageView
            page={page}
            members={members}
            side={index % 2 === 0 ? "right" : "left"}
            onOpenPhoto={onOpenPhoto}
          />
        </div>
      ))}
      <article className={`${styles.bookPaper} ${styles.insideBackCover}`} data-book-page>
        <span className={styles.colophon}>Made together in EventSpace</span>
      </article>
      <article className={`${styles.cover} ${styles.backCover}`} data-density="hard" data-book-page>
        <div className={styles.coverRule} />
        <small>EventSpace</small>
      </article>
    </>
  );
}
