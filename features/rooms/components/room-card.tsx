import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import type { BoardItem, BoardPhoto, RoomSummary } from "@/core/domain/room";
import styles from "./rooms-page.module.css";

function formatRoomMeta(room: RoomSummary) {
  const source = room.status === "active" ? room.endsAt : room.archivedAt;
  const date = source ? new Date(source) : null;
  const formatted = date ? new Intl.DateTimeFormat("en-US", room.status === "active" ? { hour: "numeric", minute: "2-digit", timeZone: room.timeZone } : { month: "short", day: "numeric", timeZone: room.timeZone }).format(date) : "—";
  return room.status === "active" ? `Ends ${formatted} · ${room.memberCount} people` : `Archived ${formatted} · ${room.memberCount} people`;
}

function PhotoStack({ items, compact = false, roomHref, onOpen, prefetchRoom, cacheScope }: { readonly items: readonly BoardItem[]; readonly compact?: boolean; readonly roomHref?: string; readonly onOpen?: () => void; readonly prefetchRoom?: () => void; readonly cacheScope?: string }) {
  const photos = useMemo(() => items.filter((item): item is BoardPhoto => item.kind === "photo"), [items]);
  const source = photos;
  const [view, setView] = useState(() => Math.floor(Math.max(0, source.length - 1) / 2));
  const deckRef = useRef<HTMLDivElement | null>(null);
  const cardRefs = useRef(new Map<number, HTMLDivElement>());
  const compactRef = useRef(compact);
  const pointer = useRef({ id: -1, startX: 0, startY: 0, lastX: 0, lastTime: 0, horizontal: false, width: 0 });
  const dragged = useRef(false);
  const timers = useRef<number[]>([]);
  const animating = useRef(false);
  const resetAfterShuffle = useRef(false);

  useEffect(() => () => { timers.current.forEach(window.clearTimeout); }, []);
  useEffect(() => { compactRef.current = compact; }, [compact]);

  const normalizedView = Math.max(0, Math.min(view, Math.max(0, source.length - 1)));

  function applyLayout(xPosition: number, duration = 0, locked = false, shifted = false) {
    const width = Math.max(1, pointer.current.width || deckRef.current?.clientWidth || 1);
    const visibleRadius = compactRef.current ? 2 : 4;
    const reserveLevel = visibleRadius + 1;
    const layerLift = compactRef.current ? 4 : 8;
    const dragLift = compactRef.current ? 3 : 7;
    const factor = Math.max(-1, Math.min(1, xPosition / (width * .5)));
    const direction = factor >= 0 ? "left" : "right";
    const incomingSide = direction === "left" ? -1 : 1;
    const transition = duration ? `transform ${duration}ms linear` : "none";
    cardRefs.current.forEach((card, offset) => {
      const side = Math.sign(offset);
      const level = Math.abs(offset);
      const isReserve = level === reserveLevel;
      const sideFactor = side < 0 ? (direction === "left" ? Math.max(0, factor - .2) : Math.min(0, factor + .2)) : (direction === "left" ? Math.max(0, factor - .2) : Math.min(0, factor + .2));
      let scale = 1;
      let degree = 0;
      let xOffset = 0;
      let yOffset = 0;
      let zIndex = 2;
      let visible = !isReserve;
      if (offset === 0) {
        const activeFactor = factor * 4;
        scale = locked ? .915 : 1 - .085 * Math.abs(activeFactor);
        degree = locked ? (direction === "left" ? 2 : -2) : activeFactor * 2;
        xOffset = locked ? (direction === "left" ? 3 : -3) : xPosition * .8;
        yOffset = locked ? -5 : -5 * Math.abs(activeFactor);
        zIndex = locked ? 2 : 10;
        card.style.transformOrigin = direction === "left" ? "100% 100%" : "0 100%";
      } else {
        const baseLevel = Math.min(level, visibleRadius);
        const sideSign = side < 0 ? -1 : 1;
        scale = 1 - .085 * baseLevel + (sideSign < 0 ? sideFactor : -sideFactor) * .085;
        degree = sideSign * 2.8 * baseLevel + sideFactor * 2.8;
        xOffset = sideSign * (8 * baseLevel + 2) + sideFactor * 3;
        yOffset = -layerLift * baseLevel + (sideSign < 0 ? sideFactor : -sideFactor) * dragLift;
        zIndex = level === 1 ? (direction === (sideSign < 0 ? "left" : "right") ? 3 : 1) : 0;
        if (compactRef.current && level === visibleRadius && sideSign === -incomingSide && Math.abs(factor) > .01) visible = false;
        if (isReserve) {
          visible = direction === (sideSign < 0 ? "left" : "right") && Math.abs(factor) > .01;
          if (shifted) {
            if (compactRef.current) {
              scale = 1 - .085 * visibleRadius;
              degree = sideSign * 2.8 * visibleRadius;
              xOffset = sideSign * (8 * visibleRadius + 2);
              yOffset = -layerLift * visibleRadius;
            } else {
              xOffset = sideSign * 34;
              yOffset = -layerLift * 3;
              degree = sideSign * 11.2;
            }
          }
          zIndex = -2;
        }
        card.style.transformOrigin = sideSign < 0 ? "0 100%" : "100% 100%";
      }
      card.style.transition = transition;
      card.style.visibility = visible ? "visible" : "hidden";
      card.style.zIndex = String(zIndex);
      card.style.transform = `translate3d(-50%, -50%, 0) translate3d(${xOffset}px, ${yOffset}px, 0) rotate(${degree}deg) scale(${scale})`;
    });
  }

  useLayoutEffect(() => {
    if (!animating.current || resetAfterShuffle.current) applyLayout(0);
    resetAfterShuffle.current = false;
  }, [view]);

  function finishShuffle(direction: -1 | 1) {
    const width = pointer.current.width;
    const xPosition = direction * width * .6;
    animating.current = true;
    navigator.vibrate?.(8);
    applyLayout(xPosition, 80);
    timers.current.push(window.setTimeout(() => applyLayout(xPosition, 30, false, true), 50));
    timers.current.push(window.setTimeout(() => applyLayout(xPosition, 80, true, true), 100));
    timers.current.push(window.setTimeout(() => {
      resetAfterShuffle.current = true;
      animating.current = false;
      setView((current) => current - direction);
    }, 200));
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (animating.current || !event.isPrimary) return;
    pointer.current = { id: event.pointerId, startX: event.clientX, startY: event.clientY, lastX: event.clientX, lastTime: event.timeStamp, horizontal: false, width: event.currentTarget.clientWidth };
    dragged.current = false;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId !== pointer.current.id || animating.current) return;
    const deltaX = event.clientX - pointer.current.startX;
    const deltaY = event.clientY - pointer.current.startY;
    if (!pointer.current.horizontal) {
      if (Math.abs(deltaX) < 7 && Math.abs(deltaY) < 7) return;
      if (Math.abs(deltaX) <= Math.abs(deltaY)) return;
      pointer.current.horizontal = true;
    }
    dragged.current = true;
    pointer.current.lastX = event.clientX;
    pointer.current.lastTime = event.timeStamp;
    event.preventDefault();
    event.stopPropagation();
    applyLayout(Math.max(-pointer.current.width * .5, Math.min(pointer.current.width * .5, deltaX)));
  }

  function finishPointer(event: ReactPointerEvent<HTMLDivElement>) {
    if (event.pointerId !== pointer.current.id) return;
    const { horizontal, startX, lastX, lastTime } = pointer.current;
    pointer.current.id = -1;
    if (!horizontal) return;
    const deltaX = event.clientX - startX;
    const velocity = (event.clientX - lastX) / Math.max(1, event.timeStamp - lastTime);
    const threshold = pointer.current.width * .25;
    const direction = deltaX < 0 || velocity < 0 ? -1 : 1;
    const canShuffle = direction === 1 ? normalizedView > 0 : normalizedView < source.length - 1;
    if (canShuffle && (Math.abs(deltaX) >= threshold || Math.abs(velocity) > .62)) finishShuffle(direction);
    else applyLayout(0, 100);
  }

  const renderRadius = compact ? 3 : 5;
  const offsets = source.length === 0 ? [] : Array.from({ length: renderRadius * 2 + 1 }, (_, index) => index - renderRadius).filter((offset) => normalizedView + offset >= 0 && normalizedView + offset < source.length);

  return <div ref={deckRef} className={styles.photoStack} aria-label="Swipe room photos" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onClickCapture={(event) => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
    <div className={styles.photoStackPreload} aria-hidden="true">{source.map((photo) => <PinnedPhoto key={photo.id} variant={photo.variant} asset={photo.asset} imageName={photo.imageName} bare preferLocal={Boolean(cacheScope)} cacheScope={cacheScope} />)}</div>
    {source.length === 0 ? <span className={styles.photoStackEmpty}>No photos yet.</span> : null}
    <div className={styles.photoStackDeck}>{offsets.map((offset) => {
      const photo = source[normalizedView + offset];
      return <div className={styles.photoStackCard} ref={(element) => { if (element) cardRefs.current.set(offset, element); else cardRefs.current.delete(offset); }} key={offset}>{roomHref ? <Link href={roomHref} scroll={false} prefetch onPointerEnter={prefetchRoom} onFocus={prefetchRoom} onClick={onOpen} className={styles.photoStackPhotoLink} aria-label={`Open room photo: ${photo.imageName ?? "photo"}`}><PinnedPhoto variant={photo.variant} asset={photo.asset} imageName={photo.imageName} bare className={styles.photoStackImage} preferLocal={Boolean(cacheScope)} cacheScope={cacheScope} /></Link> : <PinnedPhoto variant={photo.variant} asset={photo.asset} imageName={photo.imageName} bare className={styles.photoStackImage} preferLocal={Boolean(cacheScope)} cacheScope={cacheScope} />}</div>;
    })}</div>
  </div>;
}

export function RoomCard({ room, boardItems, grid, editing, active, index, toggleFavorite, requestDelete, rememberRoom, cacheScope }: { readonly room: RoomSummary; readonly boardItems: readonly BoardItem[]; readonly grid: boolean; readonly editing: boolean; readonly active: boolean; readonly index: number; readonly toggleFavorite: () => void; readonly requestDelete: () => void; readonly rememberRoom: () => void; readonly cacheScope?: string }) {
  const router = useRouter();
  const roomHref = `/rooms/${room.publicId}`;
  const prefetchRoom = () => router.prefetch(roomHref);
  return (
    <article data-room-card className={`${styles.card} ${grid ? styles.cardGrid : ""} ${editing ? styles.cardEditing : ""} ${active ? styles.cardActive : styles.cardInactive}`} style={{ "--card-index": Math.min(index, 5) } as CSSProperties}>
      {editing ? <button className={`${styles.favorite} ${room.isFavorite ? styles.favoriteActive : ""}`} onClick={toggleFavorite} aria-label={room.isFavorite ? `Remove ${room.name} from favorites` : `Favorite ${room.name}`}><Icon name="heart" size={16} /><span>Favorite</span></button> : null}
      {editing ? <button className={styles.deleteRoom} onClick={requestDelete} aria-label={`Delete ${room.name}`}><Icon name="minus" size={16} /></button> : null}
      {grid ? <PhotoStack items={boardItems} compact roomHref={roomHref} onOpen={rememberRoom} prefetchRoom={prefetchRoom} cacheScope={cacheScope} /> : <Link href={roomHref} scroll={false} prefetch onPointerEnter={prefetchRoom} onFocus={prefetchRoom} onClick={rememberRoom} className={styles.cardLink}>
        <PhotoStack items={boardItems} prefetchRoom={prefetchRoom} cacheScope={cacheScope} />
        <div className={styles.cardInfo}><div><h2>{room.name}</h2><p><i className={room.status === "active" ? styles.liveDot : ""} />{formatRoomMeta(room)}</p></div><span><Icon name="arrow" /></span></div>
      </Link>}
    </article>
  );
}
