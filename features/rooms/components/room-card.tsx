import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import type { BoardItem, BoardPhoto, RoomSummary } from "@/core/domain/room";
import { getPhotoStackEntryKey, hasEnteredPhotoStack, markPhotoStackEntered, schedulePhotoStackEntryBatch, type PhotoStackEntryCandidate } from "@/features/rooms/model/photo-stack-entry";
import { getPhotoStackVisibleRadius, getPhotoStackWindow } from "@/features/rooms/model/photo-stack-window";
import styles from "./rooms-page.module.css";

function formatRoomMeta(room: RoomSummary) {
  const source = room.status === "active" ? room.endsAt : room.archivedAt;
  const date = source ? new Date(source) : null;
  const formatted = date ? new Intl.DateTimeFormat("en-US", room.status === "active" ? { hour: "numeric", minute: "2-digit", timeZone: room.timeZone } : { month: "short", day: "numeric", timeZone: room.timeZone }).format(date) : "—";
  return room.status === "active" ? `Ends ${formatted} · ${room.memberCount} people` : `Archived ${formatted} · ${room.memberCount} people`;
}

type PhotoStackEntryState = {
  readonly phase: "waiting" | "entering" | "visible" | "failed";
  readonly delayMs?: number;
};

function PhotoStack({ items, compact = false, roomHref, roomId, onOpen, prefetchRoom, cacheScope }: { readonly items: readonly BoardItem[]; readonly compact?: boolean; readonly roomHref?: string; readonly roomId: string; readonly onOpen?: () => void; readonly prefetchRoom?: () => void; readonly cacheScope?: string }) {
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
  const decodedPhotoIds = useRef(new Set<string>());
  const queuedDecodedIds = useRef(new Set<string>());
  const entryBatchTimer = useRef<number | null>(null);
  const entrySequenceTimer = useRef<number | null>(null);
  const entryStatesRef = useRef(new Map<string, PhotoStackEntryState>());
  const [entryStates, setEntryStates] = useState<ReadonlyMap<string, PhotoStackEntryState>>(() => new Map());

  const normalizedView = Math.max(0, Math.min(view, Math.max(0, source.length - 1)));
  const { visibleRadius, offsets } = getPhotoStackWindow(source.length, normalizedView, compact);
  const [entryCandidates] = useState<readonly PhotoStackEntryCandidate[]>(() =>
    offsets
      .filter((offset) => Math.abs(offset) <= visibleRadius)
      .map((offset) => ({ id: source[normalizedView + offset].id, offset })),
  );
  const entryCandidatesById = new Map(entryCandidates.map((candidate) => [candidate.id, candidate]));

  useEffect(() => () => {
    timers.current.forEach(window.clearTimeout);
    if (entryBatchTimer.current !== null) window.clearTimeout(entryBatchTimer.current);
    if (entrySequenceTimer.current !== null) window.clearTimeout(entrySequenceTimer.current);
  }, []);

  function setPhotoEntryState(photoId: string, state: PhotoStackEntryState) {
    const next = new Map(entryStatesRef.current);
    next.set(photoId, state);
    entryStatesRef.current = next;
    setEntryStates(next);
  }

  function flushDecodedPhotoEntries() {
    entryBatchTimer.current = null;
    const candidates = [...queuedDecodedIds.current]
      .flatMap((photoId) => entryCandidatesById.get(photoId) ?? []);
    queuedDecodedIds.current.clear();
    if (candidates.length === 0) return;

    const schedule = schedulePhotoStackEntryBatch({
      candidates,
      nowMs: 0,
      nextSlotAtMs: 0,
    });
    const next = new Map(entryStatesRef.current);
    schedule.entries.forEach((entry) => next.set(entry.id, { phase: "entering", delayMs: entry.delayMs }));
    entryStatesRef.current = next;
    setEntryStates(next);
    entrySequenceTimer.current = window.setTimeout(() => {
      entrySequenceTimer.current = null;
      if (queuedDecodedIds.current.size > 0) flushDecodedPhotoEntries();
    }, 70 + 110 * schedule.entries.length + 360);
  }

  function markPhotoDecoded(photoId: string) {
    decodedPhotoIds.current.add(photoId);
    const candidate = entryCandidatesById.get(photoId);
    if (!candidate) {
      setPhotoEntryState(photoId, { phase: "visible" });
      applyLayout(0);
      return;
    }

    const current = entryStatesRef.current.get(photoId)?.phase;
    if (current === "entering" || current === "visible" || current === "failed") {
      applyLayout(0);
      return;
    }

    const entryKey = getPhotoStackEntryKey(cacheScope, roomId, photoId);
    if (hasEnteredPhotoStack(entryKey) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setPhotoEntryState(photoId, { phase: "visible" });
      markPhotoStackEntered(entryKey);
    } else {
      queuedDecodedIds.current.add(photoId);
      if (entryBatchTimer.current === null && entrySequenceTimer.current === null) {
        entryBatchTimer.current = window.setTimeout(flushDecodedPhotoEntries, 140);
      }
    }
    applyLayout(0);
  }

  function markPhotoFailed(photoId: string) {
    queuedDecodedIds.current.delete(photoId);
    setPhotoEntryState(photoId, { phase: "failed" });
    applyLayout(0);
  }

  function markPhotoVisible(photoId: string) {
    const current = entryStatesRef.current.get(photoId);
    if (current?.phase !== "entering") return;
    setPhotoEntryState(photoId, { phase: "visible" });
    markPhotoStackEntered(getPhotoStackEntryKey(cacheScope, roomId, photoId));
  }

  function applyLayout(xPosition: number, duration = 0, locked = false, shifted = false) {
    const width = Math.max(1, pointer.current.width || deckRef.current?.clientWidth || 1);
    const visibleRadius = getPhotoStackVisibleRadius(compactRef.current);
    const reserveLevel = visibleRadius + 1;
    const layerLift = compactRef.current ? 4 : 8;
    const dragLift = compactRef.current ? 3 : 7;
    const factor = Math.max(-1, Math.min(1, xPosition / (width * .5)));
    const direction = factor >= 0 ? "left" : "right";
    const incomingSide = direction === "left" ? -1 : 1;
    const transition = duration ? `transform ${duration}ms linear` : "none";
    const hasIncomingReserve = cardRefs.current.has(incomingSide * reserveLevel);
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
        if (hasIncomingReserve && level === visibleRadius && sideSign === -incomingSide && Math.abs(factor) > .01) visible = false;
        if (isReserve) {
          visible = direction === (sideSign < 0 ? "left" : "right") && Math.abs(factor) > .01;
          if (shifted) {
            scale = 1 - .085 * visibleRadius;
            degree = sideSign * 2.8 * visibleRadius;
            xOffset = sideSign * (8 * visibleRadius + 2);
            yOffset = -layerLift * visibleRadius;
          }
          zIndex = -2;
        }
        card.style.transformOrigin = sideSign < 0 ? "0 100%" : "100% 100%";
      }
      card.style.transition = transition;
      const photoId = card.dataset.photoId;
      const requiresDecode = card.dataset.requiresDecode === "true";
      if (requiresDecode && (!photoId || !decodedPhotoIds.current.has(photoId))) visible = false;
      card.style.visibility = visible ? "visible" : "hidden";
      card.style.zIndex = String(zIndex);
      card.style.transform = `translate3d(-50%, -50%, 0) translate3d(${xOffset}px, ${yOffset}px, 0) rotate(${degree}deg) scale(${scale})`;
    });
  }

  useLayoutEffect(() => {
    compactRef.current = compact;
    if (!animating.current || resetAfterShuffle.current) applyLayout(0);
    resetAfterShuffle.current = false;
  }, [view, compact, source.length]);

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
    const targetPhoto = source[normalizedView - direction];
    const targetReady = Boolean(targetPhoto && (!targetPhoto.asset || decodedPhotoIds.current.has(targetPhoto.id)));
    const canShuffle = (direction === 1 ? normalizedView > 0 : normalizedView < source.length - 1) && targetReady;
    if (canShuffle && (Math.abs(deltaX) >= threshold || Math.abs(velocity) > .62)) finishShuffle(direction);
    else applyLayout(0, 100);
  }

  return <div ref={deckRef} className={styles.photoStack} aria-label="Swipe room photos" onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={finishPointer} onPointerCancel={finishPointer} onClickCapture={(event) => { if (dragged.current) { event.preventDefault(); event.stopPropagation(); dragged.current = false; } }}>
    {source.length === 0 ? <span className={styles.photoStackEmpty}>No photos yet.</span> : null}
    <div className={styles.photoStackDeck}>{offsets.map((offset) => {
      const photo = source[normalizedView + offset];
      const entry = entryStates.get(photo.id);
      const phase = entry?.phase ?? (photo.asset ? "waiting" : "visible");
      const eager = Math.abs(offset) <= visibleRadius + 1;
      const entryClassName = phase === "entering"
        ? styles.photoStackSurfaceEntering
        : phase === "visible"
          ? styles.photoStackSurfaceVisible
          : phase === "failed"
            ? styles.photoStackSurfaceFailed
            : styles.photoStackSurfaceWaiting;
      const entryStyle = phase === "entering" && entry?.delayMs !== undefined
        ? { "--photo-stack-entry-delay": `${entry.delayMs}ms` } as CSSProperties
        : undefined;
      const isVisible = phase === "visible";
      return <div className={styles.photoStackCard} data-photo-id={photo.id} data-requires-decode={Boolean(photo.asset)} ref={(element) => { if (element) cardRefs.current.set(offset, element); else cardRefs.current.delete(offset); }} key={photo.id}><div className={`${styles.photoStackSurface} ${entryClassName}`} style={entryStyle} aria-hidden={!isVisible} onAnimationEnd={(event) => { if (event.target === event.currentTarget) markPhotoVisible(photo.id); }}>{roomHref ? <Link href={roomHref} scroll={false} prefetch onPointerEnter={prefetchRoom} onFocus={prefetchRoom} onClick={onOpen} className={styles.photoStackPhotoLink} aria-label={`Open room photo: ${photo.imageName ?? "photo"}`} tabIndex={isVisible ? undefined : -1}><PinnedPhoto variant={photo.variant} asset={photo.asset} imageName={photo.imageName} bare eager={eager} reveal="manual" onDecoded={() => markPhotoDecoded(photo.id)} onError={() => markPhotoFailed(photo.id)} className={styles.photoStackImage} preferLocal={Boolean(cacheScope)} cacheScope={cacheScope} /></Link> : <PinnedPhoto variant={photo.variant} asset={photo.asset} imageName={photo.imageName} bare eager={eager} reveal="manual" onDecoded={() => markPhotoDecoded(photo.id)} onError={() => markPhotoFailed(photo.id)} className={styles.photoStackImage} preferLocal={Boolean(cacheScope)} cacheScope={cacheScope} />}</div></div>;
    })}</div>
  </div>;
}

export function RoomCard({ room, boardItems, grid, editing, active, index, toggleFavorite, requestDelete, rememberRoom, cacheScope }: { readonly room: RoomSummary; readonly boardItems: readonly BoardItem[]; readonly grid: boolean; readonly editing: boolean; readonly active: boolean; readonly index: number; readonly toggleFavorite: () => void; readonly requestDelete: () => void; readonly rememberRoom: () => void; readonly cacheScope?: string }) {
  const router = useRouter();
  const roomHref = `/rooms/${room.publicId}`;
  const prefetchRoom = () => router.prefetch(roomHref);
  return (
    <article data-room-card data-room-key={room.publicId} className={`${styles.card} ${grid ? styles.cardGrid : ""} ${editing ? styles.cardEditing : ""} ${active ? styles.cardActive : styles.cardInactive}`} style={{ "--card-index": Math.min(index, 5) } as CSSProperties}>
      {editing ? <button className={`${styles.favorite} ${room.isFavorite ? styles.favoriteActive : ""}`} onClick={toggleFavorite} aria-label={room.isFavorite ? `Remove ${room.name} from favorites` : `Favorite ${room.name}`}><Icon name="heart" size={16} /><span>Favorite</span></button> : null}
      {editing ? <button className={styles.deleteRoom} onClick={requestDelete} aria-label={`Delete ${room.name}`}><Icon name="minus" size={16} /></button> : null}
      {grid ? <PhotoStack items={boardItems} compact roomHref={roomHref} roomId={room.id} onOpen={rememberRoom} prefetchRoom={prefetchRoom} cacheScope={cacheScope} /> : <Link href={roomHref} scroll={false} prefetch onPointerEnter={prefetchRoom} onFocus={prefetchRoom} onClick={rememberRoom} className={styles.cardLink}>
        <PhotoStack items={boardItems} roomId={room.id} prefetchRoom={prefetchRoom} cacheScope={cacheScope} />
        <div className={styles.cardInfo}><div><h2>{room.name}</h2><p><i className={room.status === "active" ? styles.liveDot : ""} />{formatRoomMeta(room)}</p></div><span><Icon name="arrow" /></span></div>
      </Link>}
    </article>
  );
}
