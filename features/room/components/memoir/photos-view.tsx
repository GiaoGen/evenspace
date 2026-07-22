"use client";

import type { PersonSummary } from "@/core/domain/room";
import type { MemoirDocument } from "./memoir-model";
import { EditableMemoirPage } from "./editable-page";
import styles from "./memoir.module.css";

export function PhotosView({ document, members, canEdit, onEditSpread, onOpenPhoto, onAddPage }: {
  readonly document: MemoirDocument;
  readonly members: readonly PersonSummary[];
  readonly canEdit: boolean;
  readonly onEditSpread: (spreadId: string, pageNumber: number) => void;
  readonly onOpenPhoto: (photoId: string) => void;
  readonly onAddPage: () => void;
}) {
  const lastPageNumber = document.pages.reduce((latest, page) => Math.max(latest, page.pageNumber), 2);
  return (
    <div className={styles.photosView}>
      <header className={styles.photosIntro}>
        <><span>{document.pages.reduce((count, page) => count + page.items.length, 0)} memories</span><p>Every spread, in the order it was kept.</p></>
      </header>
      <div className={styles.spreadList}>
        {document.spreads.map((spread, index) => {
          const finalSpread = spread.left.pageNumber === lastPageNumber || spread.right.pageNumber === lastPageNumber;
          return <div className={`${styles.spreadEntry} ${finalSpread && canEdit ? styles.lastSpreadEntry : ""}`} key={spread.id}>
            <section className={styles.memoirSpread} aria-label={`Memoir spread ${index + 1}`}>
              <EditableMemoirPage page={spread.left} members={members} side="left" spreadId={spread.id} onEdit={canEdit ? onEditSpread : () => {}} onOpenPhoto={onOpenPhoto} />
              <EditableMemoirPage page={spread.right} members={members} side="right" spreadId={spread.id} onEdit={canEdit ? onEditSpread : () => {}} onOpenPhoto={onOpenPhoto} />
            </section>
            {finalSpread && canEdit ? <button type="button" className={styles.addPageOutside} onClick={onAddPage}>Add</button> : null}
          </div>;
        })}
      </div>
    </div>
  );
}
