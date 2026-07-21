"use client";

import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { getBoardPhotoFrameAspectRatio } from "@/core/domain/board-layout";
import type { BoardItem } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import styles from "./board.module.css";

export function SequenceView({ items, onSelect, onClear }: { readonly items: readonly BoardItem[]; readonly onSelect: (item: BoardItem) => void; readonly onClear: () => void }) {
  return <div className={styles.sequence} onPointerDown={(event) => { if (event.target === event.currentTarget) onClear(); }}>
    {items.map((item) => {
      if (item.kind === "photo") return <article key={item.id} className={styles.sequencePhoto} style={{ aspectRatio: String(getBoardPhotoFrameAspectRatio(item)) }} onClick={() => onSelect(item)}>
        <PinnedPhoto variant={item.variant} frameVariant={item.frameVariant} note={item.asset ? null : item.note} asset={item.asset} imageName={item.imageName} className={styles.sequencePinnedPhoto} />
      </article>;
      if (item.kind === "drawing") return <article key={item.id} className={styles.sequenceDrawing} onClick={() => onSelect(item)}><LocalAssetImage asset={item.asset} alt="Board drawing" width={960} height={720} /></article>;
      return <article key={item.id} className={`${styles.sequenceNote} ${styles[`note${item.variant ?? "paper"}`]}`} onClick={() => onSelect(item)}>{item.text}</article>;
    })}
    {!items.length ? <div className={styles.emptySequence}><strong>Nothing pinned yet.</strong><span>The story will arrange itself here.</span></div> : null}
  </div>;
}
