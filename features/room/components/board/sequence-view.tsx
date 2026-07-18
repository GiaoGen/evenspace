"use client";

import Image from "next/image";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { getBoardPhotoFrameAspectRatio } from "@/core/domain/board-layout";
import type { BoardItem, PersonSummary } from "@/core/domain/room";
import { PhotoConversation } from "./photo-conversation";
import styles from "./board.module.css";

export function SequenceView({ items, members, selectedItemId, onSelect, onClear, onComment }: { readonly items: readonly BoardItem[]; readonly members: readonly PersonSummary[]; readonly selectedItemId: string | null; readonly onSelect: (item: BoardItem) => void; readonly onClear: () => void; readonly onComment: (itemId: string, body: string) => void }) {
  return <div className={styles.sequence} onPointerDown={(event) => { if (event.target === event.currentTarget) onClear(); }}>
    {items.map((item) => {
      if (item.kind === "photo") return <article key={item.id} className={styles.sequencePhoto} style={{ aspectRatio: String(getBoardPhotoFrameAspectRatio(item)) }} onClick={() => onSelect(item)}>
        <PinnedPhoto variant={item.variant} note={item.imageDataUrl ? null : item.note} imageDataUrl={item.imageDataUrl} imageName={item.imageName} className={styles.sequencePinnedPhoto} />
        {selectedItemId === item.id ? <PhotoConversation photo={item} owner={members.find((member) => member.actorId === item.ownerActorId) ?? null} onComment={(body) => onComment(item.id, body)} /> : null}
      </article>;
      if (item.kind === "drawing") return <article key={item.id} className={styles.sequenceDrawing} onClick={() => onSelect(item)}><Image src={item.imageDataUrl} alt="Board drawing" width={960} height={720} unoptimized /></article>;
      return <article key={item.id} className={`${styles.sequenceNote} ${styles[`note${item.variant ?? "paper"}`]}`} onClick={() => onSelect(item)}>{item.text}</article>;
    })}
    {!items.length ? <div className={styles.emptySequence}><strong>Nothing pinned yet.</strong><span>The story will arrange itself here.</span></div> : null}
  </div>;
}
