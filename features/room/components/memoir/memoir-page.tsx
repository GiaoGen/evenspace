"use client";

import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { getBoardPhotoAspectRatio } from "@/core/domain/board-layout";
import type { BoardItem, PersonSummary } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import type { MemoirPage } from "./memoir-model";
import styles from "./memoir.module.css";

export function MemoirPageView({ page, members, side, editing = false, canRemove, onOpenPhoto, onRemove }: {
  readonly page: MemoirPage;
  readonly members: readonly PersonSummary[];
  readonly side: "left" | "right";
  readonly editing?: boolean;
  readonly canRemove?: (item: BoardItem) => boolean;
  readonly onOpenPhoto?: (photoId: string) => void;
  readonly onRemove?: (itemId: string) => void;
}) {
  const ownerNames = [...new Set(page.items.map((item) => members.find((member) => member.actorId === ((item.kind !== "drawing" ? item.sourceActorId : undefined) ?? item.ownerActorId))?.displayName ?? "A room member"))];

  return (
    <article className={`${styles.paperPage} ${styles[`paper${page.paperStyle}`]} ${side === "left" ? styles.leftPage : styles.rightPage}`} data-page-number={page.pageNumber}>
      <div className={styles.pageRule} />
      {page.items.length ? <div className={styles.pageContents} data-count={Math.min(page.items.length, 4)}>{page.items.map((item) => {
        const owner = members.find((member) => member.actorId === ((item.kind !== "drawing" ? item.sourceActorId : undefined) ?? item.ownerActorId));
        return <div className={`${styles.memoryItem} ${styles[`memory${item.kind}`]}`} key={item.id}>
          {item.kind === "photo" ? <button type="button" className={styles.memoryPhoto} disabled={editing} onClick={() => onOpenPhoto?.(item.id)} aria-label={`Open photo by ${owner?.displayName ?? "member"}`}><span className={styles.photoMount} style={{ aspectRatio: String(getBoardPhotoAspectRatio(item)) }}><PinnedPhoto variant={item.variant} note={null} asset={item.asset} imageName={item.imageName} bare className={styles.bookPhoto} /></span></button> : null}
          {item.kind === "drawing" ? <div className={styles.memoryDrawing}><LocalAssetImage asset={item.asset} alt={`Drawing by ${owner?.displayName ?? "member"}`} fill sizes="(max-width: 700px) 46vw, 360px" /></div> : null}
          {item.kind === "note" ? <blockquote className={styles.memoryNote}><p>{item.text}</p></blockquote> : null}
          {editing && canRemove?.(item) ? <button type="button" className={styles.removeMemory} onPointerDown={(event) => event.stopPropagation()} onClick={(event) => { event.stopPropagation(); onRemove?.(item.id); }} aria-label="Remove from this page"><Icon name="minus" size={12} /></button> : null}
        </div>;
      })}</div> : page.kind === "opening" ? <div className={styles.emptyMemory}><strong>Our pages begin here.</strong><span>Photos and notes will settle into this memoir.</span></div> : null}
      {page.items.length ? <footer className={styles.pageCredit}><span>{ownerNames.join(" · ")}</span><i /></footer> : null}
      <span className={styles.pageNumber}>{page.pageNumber}</span>
    </article>
  );
}
