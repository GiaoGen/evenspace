"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type CSSProperties } from "react";
import { hideRoomAction, setRoomFavoriteAction } from "@/app/rooms/actions";
import { AppHeader } from "@/components/app-header/app-header";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { filterRoomCollection, getRoomFilterCounts, type RoomCollectionItem, type RoomFilter } from "../model/room-collection";
import { rememberRoomCarouselItem, useRoomCarousel } from "../model/use-room-carousel";
import { useRoomsLayoutFade } from "../model/use-rooms-layout-fade";
import { RoomCard } from "./room-card";
import { RoomDeleteSheet } from "./room-delete-sheet";
import { RoomsCreateMenu } from "./rooms-create-menu";
import { RoomProgress } from "./room-progress";
import { RoomsToolbar } from "./rooms-toolbar";
import { rememberViewerCacheScope, saveRoomsRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import type { BackendAccount } from "@/data/supabase/backend-account";
import { rememberAccountCacheScope, saveAccountSnapshot } from "@/features/account/model/account-snapshot";
import type { AssetReference } from "@/core/domain/asset";
import { getCachedLocalAssetBlob } from "@/features/local-assets/model/local-asset-repository";
import { clearViewerAvatar, hasFreshViewerAvatarValidation, markViewerAvatarValidated, readViewerAvatar, saveViewerAvatar } from "@/features/account/model/viewer-avatar-cache";
import styles from "./rooms-page.module.css";

const GRID_PREFERENCE_KEY = "eventspace:rooms:grid";
const GRID_PREFERENCE_EVENT = "eventspace:rooms:grid-change";

function readGridPreference() {
  try { return window.sessionStorage.getItem(GRID_PREFERENCE_KEY) === "true"; }
  catch { return false; }
}

function subscribeToGridPreference(onChange: () => void) {
  function handleStorage(event: StorageEvent) {
    if (event.storageArea === window.sessionStorage && event.key === GRID_PREFERENCE_KEY) onChange();
  }

  window.addEventListener(GRID_PREFERENCE_EVENT, onChange);
  window.addEventListener("storage", handleStorage);
  return () => {
    window.removeEventListener(GRID_PREFERENCE_EVENT, onChange);
    window.removeEventListener("storage", handleStorage);
  };
}

function updateGridPreference(grid: boolean) {
  try { window.sessionStorage.setItem(GRID_PREFERENCE_KEY, String(grid)); }
  catch { /* Storage is optional; the current page can still switch views. */ }
  window.dispatchEvent(new Event(GRID_PREFERENCE_EVENT));
}

function RoomsCardsLoading({ grid }: { readonly grid: boolean }) {
  return <section className={`${styles.cards} ${grid ? styles.cardsGrid : ""}`} aria-label="Loading rooms" aria-busy="true">
    {[0, 1, 2].map((index) => <article className={`${styles.card} ${styles.loadingCard} ${grid ? styles.cardGrid : ""}`} key={index} style={{ "--card-index": Math.min(index, 5) } as CSSProperties}>
      <div className={styles.loadingCardLayout}><div className={styles.loadingBoard} /><div className={styles.loadingInfo}><i /><span /><b /></div></div>
    </article>)}
  </section>;
}

export function RoomsPage({ initialRooms, viewerInitials, viewerAvatarUrl, viewerCacheScope, viewerAccountScope, loading = false }: { readonly initialRooms: readonly RoomCollectionItem[]; readonly viewerInitials: string; readonly viewerAvatarUrl: string | null; readonly viewerCacheScope?: string; readonly viewerAccountScope?: string; readonly loading?: boolean }) {
  const [rooms, setRooms] = useState(initialRooms);
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const grid = useSyncExternalStore(subscribeToGridPreference, readGridPreference, () => false);
  const [editing, setEditing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const pendingRoomIds = useRef(new Set<string>());
  const [avatarUrl, setAvatarUrl] = useState(viewerAvatarUrl);
  const [avatarAsset, setAvatarAsset] = useState<AssetReference | null>(null);
  const counts = useMemo(() => getRoomFilterCounts(rooms), [rooms]);
  const visibleRooms = useMemo(() => filterRoomCollection(rooms, filter, query), [filter, query, rooms]);
  const roomPendingDelete = useMemo(
    () => rooms.find((item) => item.room.publicId === deleteTarget)?.room ?? null,
    [deleteTarget, rooms],
  );
  const roomKeys = useMemo(() => visibleRooms.map((item) => item.room.publicId), [visibleRooms]);
  const { containerRef, activeIndex, progress } = useRoomCarousel(roomKeys, !grid);
  const activeRoomKey = roomKeys[activeIndex];
  const { isTransitioning, phase: layoutFadePhase, toggleLayout } = useRoomsLayoutFade({
    containerRef,
    grid,
    activeRoomKey,
    setGrid: updateGridPreference,
  });
  useEffect(() => {
    if (loading) return;
    rememberViewerCacheScope(viewerCacheScope);
    if (viewerCacheScope) {
      saveRoomsRouteSnapshot({
        scope: viewerCacheScope,
        viewerAccountScope,
        rooms: initialRooms,
        viewerInitials,
      });
    }
  }, [initialRooms, loading, viewerAccountScope, viewerCacheScope, viewerInitials]);
  useEffect(() => {
    if (loading || !viewerAccountScope) return;
    rememberAccountCacheScope(viewerAccountScope);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      void fetch("/api/account/snapshot", { cache: "no-store", signal: controller.signal })
        .then((response) => response.ok ? response.json() as Promise<BackendAccount> : null)
        .then((account) => { if (account?.cacheScope === viewerAccountScope) saveAccountSnapshot(account); })
        .catch(() => undefined);
    }, 1200);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [loading, viewerAccountScope]);
  useEffect(() => {
    if (loading || viewerAvatarUrl || !viewerAccountScope) return;
    const accountScope = viewerAccountScope;
    const cached = readViewerAvatar(accountScope);
    if (cached) queueMicrotask(() => setAvatarAsset(cached));
    let active = true;
    const controller = new AbortController();
    async function resolveAvatar() {
      const hasCachedBlob = cached
        ? Boolean(await getCachedLocalAssetBlob(cached, { scope: accountScope, variant: "display" }))
        : false;
      if (!active || (hasCachedBlob && hasFreshViewerAvatarValidation(accountScope))) return;
      const response = await fetch("/api/viewer/avatar", { cache: "no-store", signal: controller.signal });
      const result = response.ok ? await response.json() as { asset?: AssetReference | null; url?: unknown } : null;
      if (!active || !result) return;
      markViewerAvatarValidated(accountScope);
      if (result.asset) {
        const sameRevision = cached?.id === result.asset.id
          && (cached.revision ?? 1) === (result.asset.revision ?? 1);
        if (!hasCachedBlob || !sameRevision) setAvatarAsset(result.asset);
        saveViewerAvatar(accountScope, result.asset);
      } else {
        setAvatarAsset(null);
        clearViewerAvatar(accountScope);
      }
      if (typeof result.url === "string") setAvatarUrl(result.url);
    }
    void resolveAvatar().catch(() => undefined);
    return () => {
      active = false;
      controller.abort();
    };
  }, [loading, viewerAccountScope, viewerAvatarUrl]);
  function closeSearch() { setSearchOpen(false); setQuery(""); }
  function toggleEditing() {
    setEditing((current) => !current);
    setFilterOpen(false);
    closeSearch();
    setActionError(null);
  }
  async function toggleFavorite(roomPublicId: string) {
    if (pendingRoomIds.current.has(roomPublicId)) return;
    const item = rooms.find((candidate) => candidate.room.publicId === roomPublicId);
    if (!item) return;
    const previous = item.room.isFavorite;
    const next = !previous;
    pendingRoomIds.current.add(roomPublicId);
    setActionError(null);
    setRooms((current) => current.map((candidate) => candidate.room.publicId === roomPublicId
      ? { ...candidate, room: { ...candidate.room, isFavorite: next } }
      : candidate));
    const result = await setRoomFavoriteAction({ roomPublicId, isFavorite: next });
    pendingRoomIds.current.delete(roomPublicId);
    if (result.status === "ok") return;
    setRooms((current) => current.map((candidate) => candidate.room.publicId === roomPublicId
      ? { ...candidate, room: { ...candidate.room, isFavorite: previous } }
      : candidate));
    setActionError("The favorite change could not be saved. Please try again.");
  }
  async function confirmHideRoom() {
    if (!deleteTarget || pendingRoomIds.current.has(deleteTarget)) return;
    const removedIndex = rooms.findIndex((candidate) => candidate.room.publicId === deleteTarget);
    const removed = rooms[removedIndex];
    if (!removed) return;
    const roomPublicId = deleteTarget;
    pendingRoomIds.current.add(roomPublicId);
    setDeleteTarget(null);
    setActionError(null);
    setRooms((current) => current.filter((candidate) => candidate.room.publicId !== roomPublicId));
    const result = await hideRoomAction({ roomPublicId });
    pendingRoomIds.current.delete(roomPublicId);
    if (result.status === "ok") return;
    setRooms((current) => {
      if (current.some((candidate) => candidate.room.publicId === roomPublicId)) return current;
      const restored = [...current];
      restored.splice(Math.min(removedIndex, restored.length), 0, removed);
      return restored;
    });
    setActionError("The room could not be removed from your list. Please try again.");
  }

  return (
    <div className={styles.page}>
      <AppHeader leading={<Link href="/account" className={styles.avatar} aria-label="Open account"><Avatar src={avatarUrl} asset={avatarAsset} cacheScope={viewerAccountScope} text={viewerInitials} displayName="Your account" decorative /></Link>} actions={<RoomsCreateMenu />} />
      <main className={styles.main}>
        <RoomsToolbar filter={filter} counts={counts} filterOpen={filterOpen} searchOpen={searchOpen} editing={editing} grid={grid} query={query} visibleCount={visibleRooms.length} canEdit={!loading && rooms.length > 0} layoutFading={isTransitioning} setFilterOpen={setFilterOpen} setFilter={setFilter} openSearch={() => { setSearchOpen(true); setFilterOpen(false); }} closeSearch={closeSearch} setQuery={setQuery} toggleEditing={toggleEditing} toggleGrid={toggleLayout} />
        {actionError ? <p className={styles.actionError} role="status">{actionError}</p> : null}
        {loading ? <RoomsCardsLoading grid={grid} /> : visibleRooms.length ? <section ref={containerRef} key={`${filter}:${grid}:${query}`} className={`${styles.cards} ${grid ? styles.cardsGrid : ""} ${isTransitioning ? styles.cardsLayoutFading : ""} ${layoutFadePhase === "out" ? styles.cardsFadeOut : layoutFadePhase === "in" ? styles.cardsFadeIn : ""}`} aria-label="Your rooms" aria-busy={isTransitioning || undefined}>{visibleRooms.map(({ room, boardItems, memberPreviews = [] }, index) => <RoomCard key={room.id} room={room} boardItems={boardItems} memberPreviews={memberPreviews} grid={grid} editing={editing} active={grid || index === activeIndex} index={index} toggleFavorite={() => void toggleFavorite(room.publicId)} requestDelete={() => setDeleteTarget(room.publicId)} rememberRoom={() => rememberRoomCarouselItem(room.publicId)} cacheScope={viewerCacheScope} />)}</section> : <section className={styles.empty}><Icon name="board" size={26} /><h1>No rooms here.</h1><p>{query ? "Try a different room name." : "The next shared moment will appear here."}</p></section>}
        {!loading && !grid && visibleRooms.length > 0 ? <RoomProgress activeIndex={activeIndex} total={visibleRooms.length} progress={progress} /> : null}
      </main>
      {roomPendingDelete ? <RoomDeleteSheet roomName={roomPendingDelete.name} close={() => setDeleteTarget(null)} confirm={() => void confirmHideRoom()} /> : null}
    </div>
  );
}
