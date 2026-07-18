"use client";

import Image from "next/image";
import { useEffect, useState, type CSSProperties, type MouseEvent, type PointerEvent } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { BOARD_UNIT, getBoardItemPixelSize } from "@/core/domain/board-layout";
import type { ActorId } from "@/core/domain/ids";
import type { BoardItem, PersonSummary } from "@/core/domain/room";
import { PhotoConversation } from "./photo-conversation";
import { useBoardInteraction } from "./use-board-interaction";
import styles from "./board.module.css";

type ResizeState = { readonly itemId: string; readonly pointerId: number; readonly startX: number; readonly startY: number; readonly startWidth: number; readonly startHeight: number; readonly width: number; readonly height: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

export function BoardCanvas({ items, members, viewerActorId, selectedItemId, onSelect, onClear, onMove, onResize, onComment, onFitReady }: {
  readonly items: readonly BoardItem[];
  readonly members: readonly PersonSummary[];
  readonly viewerActorId: ActorId;
  readonly selectedItemId: string | null;
  readonly onSelect: (item: BoardItem) => void;
  readonly onClear: () => void;
  readonly onMove: (item: BoardItem, dx: number, dy: number) => void;
  readonly onResize: (itemId: string, width: number, height: number) => void;
  readonly onComment: (itemId: string, body: string) => void;
  readonly onFitReady: (fit: () => void) => void;
}) {
  const [resize, setResize] = useState<ResizeState | null>(null);
  const { viewportRef, pan, scale, drag, fit, canvasHandlers, itemHandlers } = useBoardInteraction({ items, viewerActorId, onSelect, onClear: () => { setResize(null); onClear(); }, onMove });
  useEffect(() => { onFitReady(fit); }, [fit, onFitReady]);

  function itemStyle(item: BoardItem): CSSProperties {
    const size = getBoardItemPixelSize(item);
    const activeResize = resize?.itemId === item.id ? resize : null;
    const activeDrag = drag?.itemId === item.id ? drag : null;
    return {
      left: item.x * BOARD_UNIT,
      top: item.y * BOARD_UNIT,
      width: (activeResize?.width ?? size.width / BOARD_UNIT) * BOARD_UNIT,
      height: (activeResize?.height ?? size.height / BOARD_UNIT) * BOARD_UNIT,
      transform: `translate3d(${activeDrag?.dx ?? 0}px,${activeDrag?.dy ?? 0}px,0) rotate(${clamp(item.rotation, -8, 8)}deg)`,
    };
  }

  function beginResize(event: PointerEvent<HTMLButtonElement>, item: BoardItem) {
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    const size = getBoardItemPixelSize(item);
    setResize({ itemId: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, startWidth: size.width / BOARD_UNIT, startHeight: size.height / BOARD_UNIT, width: size.width / BOARD_UNIT, height: size.height / BOARD_UNIT });
  }

  function moveResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.stopPropagation();
    setResize({ ...resize, width: clamp(resize.startWidth + (event.clientX - resize.startX) / scale / BOARD_UNIT, 10, 42), height: clamp(resize.startHeight + (event.clientY - resize.startY) / scale / BOARD_UNIT, 6, 34) });
  }

  function endResize(event: PointerEvent<HTMLButtonElement>) {
    if (!resize || resize.pointerId !== event.pointerId) return;
    event.stopPropagation();
    onResize(resize.itemId, resize.width, resize.height);
    setResize(null);
  }

  function ownerFor(item: BoardItem) {
    return members.find((member) => member.actorId === item.ownerActorId) ?? null;
  }

  return <div ref={viewportRef} className={styles.canvasViewport} {...canvasHandlers}>
    <div className={styles.canvasWorld} style={{ transform: `translate3d(${pan.x}px,${pan.y}px,0) scale(${scale})` }}>
      {items.map((item) => {
        const selected = selectedItemId === item.id;
        const movable = item.ownerActorId === viewerActorId;
        const pointerProps = {
          onPointerDown: (event: PointerEvent<HTMLElement>) => itemHandlers.onPointerDown(event, item),
          onPointerMove: itemHandlers.onPointerMove,
          onPointerUp: (event: PointerEvent<HTMLElement>) => itemHandlers.onPointerUp(event, item),
          onPointerCancel: (event: PointerEvent<HTMLElement>) => itemHandlers.onPointerCancel(event, item),
          onContextMenu: (event: MouseEvent<HTMLElement>) => event.preventDefault(),
        };
        if (item.kind === "photo") return <article key={item.id} className={`${styles.canvasItem} ${styles.canvasPhoto} ${selected ? styles.itemSelected : ""} ${drag?.itemId === item.id ? styles.itemDragging : ""}`} style={itemStyle(item)} {...pointerProps}>
          <PinnedPhoto variant={item.variant} note={item.imageDataUrl ? null : item.note} imageDataUrl={item.imageDataUrl} imageName={item.imageName} className={styles.pinnedPhoto} />
          {selected ? <PhotoConversation photo={item} owner={ownerFor(item)} onComment={(body) => onComment(item.id, body)} /> : null}
        </article>;
        if (item.kind === "drawing") return <article key={item.id} className={`${styles.canvasItem} ${styles.canvasDrawing} ${selected ? styles.itemSelected : ""} ${drag?.itemId === item.id ? styles.itemDragging : ""}`} style={itemStyle(item)} {...pointerProps}>
          <Image src={item.imageDataUrl} alt="Board drawing" fill sizes="280px" unoptimized />
          {selected && movable ? <button type="button" className={styles.resizeHandle} aria-label="Resize drawing" onPointerDown={(event) => beginResize(event, item)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} /> : null}
        </article>;
        return <article key={item.id} className={`${styles.canvasItem} ${styles.canvasNote} ${styles[`note${item.variant ?? "paper"}`]} ${selected ? styles.itemSelected : ""} ${drag?.itemId === item.id ? styles.itemDragging : ""}`} style={itemStyle(item)} {...pointerProps}>
          <span>{item.text}</span>
          {selected && movable ? <button type="button" className={styles.resizeHandle} aria-label="Resize text card" onPointerDown={(event) => beginResize(event, item)} onPointerMove={moveResize} onPointerUp={endResize} onPointerCancel={endResize} /> : null}
        </article>;
      })}
    </div>
    {!items.length ? <div className={styles.emptyBoard}><span>+</span><strong>Pin the first memory.</strong><small>Photos, notes and drawings live here.</small></div> : null}
  </div>;
}
