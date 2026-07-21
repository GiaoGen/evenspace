import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { BOARD_UNIT, computeBoardFit, getBoardItemPixelSize } from "@/core/domain/board-layout";
import type { BoardBackground, BoardItem, RoomSummary } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import styles from "./rooms-page.module.css";

const boardPreviewBackgroundClasses: Record<BoardBackground, string> = {
  stone: styles.boardPreviewStone,
  linen: styles.boardPreviewLinen,
  charcoal: styles.boardPreviewCharcoal,
  herbarium: styles.boardPreviewHerbarium,
  clover: styles.boardPreviewClover,
  bluebell: styles.boardPreviewBluebell,
};

function formatRoomMeta(room: RoomSummary) {
  const source = room.status === "active" ? room.endsAt : room.archivedAt;
  const date = source ? new Date(source) : null;
  const formatted = date ? new Intl.DateTimeFormat("en-US", room.status === "active" ? { hour: "numeric", minute: "2-digit", timeZone: room.timeZone } : { month: "short", day: "numeric", timeZone: room.timeZone }).format(date) : "—";
  return room.status === "active" ? `Ends ${formatted} · ${room.memberCount} people` : `Archived ${formatted} · ${room.memberCount} people`;
}

function BoardSnapshot({ items, background }: { readonly items: readonly BoardItem[]; readonly background: BoardBackground }) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    function update() { setFit(computeBoardFit(items, element!.getBoundingClientRect())); }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  function itemStyle(item: BoardItem): CSSProperties {
    const size = getBoardItemPixelSize(item);
    return { left: `${item.x * BOARD_UNIT}px`, top: `${item.y * BOARD_UNIT}px`, width: `${size.width}px`, height: `${size.height}px`, transform: `rotate(${item.rotation}deg)` };
  }

  return (
    <div ref={previewRef} className={`${styles.boardPreview} ${boardPreviewBackgroundClasses[background]}`}>
      <div className={styles.boardWorld} style={{ transform: `translate3d(${fit.x}px, ${fit.y}px, 0) scale(${fit.scale})` }}>
        {items.map((item) => item.kind === "photo" ? <div key={item.id} className={styles.boardSnapshotItem} style={itemStyle(item)}><PinnedPhoto variant={item.variant} frameVariant={item.frameVariant} asset={item.asset} imageName={item.imageName} note={item.asset ? null : item.note} className={styles.boardSnapshotPhoto} /></div> : item.kind === "drawing" ? <div key={item.id} className={styles.boardSnapshotDrawing} style={itemStyle(item)}><LocalAssetImage asset={item.asset} alt="Board drawing" fill sizes="220px" /></div> : <div key={item.id} className={`${styles.boardSnapshotNote} ${styles[`boardSnapshotNote${item.variant ?? "paper"}`]}`} style={itemStyle(item)}>{item.text}</div>)}
      </div>
      {items.length === 0 ? <span className={styles.emptyBoard}>No board items yet.</span> : null}
    </div>
  );
}

export function RoomCard({ room, boardItems, grid, editing, active, index, toggleFavorite, requestDelete }: { readonly room: RoomSummary; readonly boardItems: readonly BoardItem[]; readonly grid: boolean; readonly editing: boolean; readonly active: boolean; readonly index: number; readonly toggleFavorite: () => void; readonly requestDelete: () => void }) {
  return (
    <article data-room-card className={`${styles.card} ${grid ? styles.cardGrid : ""} ${editing ? styles.cardEditing : ""} ${active ? styles.cardActive : styles.cardInactive}`} style={{ "--card-index": Math.min(index, 5) } as CSSProperties}>
      {editing ? <button className={`${styles.favorite} ${room.isFavorite ? styles.favoriteActive : ""}`} onClick={toggleFavorite} aria-label={room.isFavorite ? `Remove ${room.name} from favorites` : `Favorite ${room.name}`}><Icon name="heart" size={16} /><span>Favorite</span></button> : null}
      {editing ? <button className={styles.deleteRoom} onClick={requestDelete} aria-label={`Delete ${room.name}`}><Icon name="minus" size={16} /></button> : null}
      <Link href={`/rooms/${room.publicId}`} className={styles.cardLink}>
        <BoardSnapshot items={boardItems} background={room.boardBackground} />
        <div className={styles.cardInfo}><div><h2>{room.name}</h2><p><i className={room.status === "active" ? styles.liveDot : ""} />{formatRoomMeta(room)}</p></div><span><Icon name="arrow" /></span></div>
      </Link>
    </article>
  );
}
