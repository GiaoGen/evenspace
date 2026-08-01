"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, useSyncExternalStore, type CSSProperties } from "react";
import { AppHeader } from "@/components/app-header/app-header";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { filterRoomCollection, getRoomFilterCounts, type RoomCollectionItem, type RoomFilter } from "../model/room-collection";
import { rememberRoomCarouselItem, useRoomCarousel } from "../model/use-room-carousel";
import { useRoomsLayoutFade } from "../model/use-rooms-layout-fade";
import { RoomCard } from "./room-card";
import { RoomsCreateMenu } from "./rooms-create-menu";
import { RoomProgress } from "./room-progress";
import { RoomsToolbar } from "./rooms-toolbar";
import { rememberViewerCacheScope, saveRoomsRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import type { BackendAccount } from "@/data/supabase/backend-account";
import { rememberAccountCacheScope, saveAccountSnapshot } from "@/features/account/model/account-snapshot";
import type { AssetReference } from "@/core/domain/asset";
import { clearViewerAvatar, readViewerAvatar, saveViewerAvatar } from "@/features/account/model/viewer-avatar-cache";
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
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const grid = useSyncExternalStore(subscribeToGridPreference, readGridPreference, () => false);
  const editing = false;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [avatarUrl, setAvatarUrl] = useState(viewerAvatarUrl);
  const [avatarAsset, setAvatarAsset] = useState<AssetReference | null>(null);
  const counts = useMemo(() => getRoomFilterCounts(initialRooms), [initialRooms]);
  const visibleRooms = useMemo(() => filterRoomCollection(initialRooms, filter, query), [filter, initialRooms, query]);
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
        rooms: initialRooms,
        viewerInitials,
      });
    }
  }, [initialRooms, loading, viewerCacheScope, viewerInitials]);
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
    if (loading || viewerAvatarUrl) return;
    if (viewerAccountScope) {
      const cached = readViewerAvatar(viewerAccountScope);
      if (cached) queueMicrotask(() => setAvatarAsset(cached));
    }
    const controller = new AbortController();
    void fetch("/api/viewer/avatar", { signal: controller.signal })
      .then((response) => response.ok ? response.json() as Promise<{ asset?: AssetReference | null; url?: unknown }> : null)
      .then((result) => {
        if (result?.asset) {
          setAvatarAsset(result.asset);
          if (viewerAccountScope) saveViewerAvatar(viewerAccountScope, result.asset);
        } else if (result && viewerAccountScope) clearViewerAvatar(viewerAccountScope);
        if (typeof result?.url === "string") setAvatarUrl(result.url);
      })
      .catch(() => undefined);
    return () => controller.abort();
  }, [loading, viewerAccountScope, viewerAvatarUrl]);
  function closeSearch() { setSearchOpen(false); setQuery(""); }

  return (
    <div className={styles.page}>
      <AppHeader leading={<Link href="/account" className={styles.avatar} aria-label="Open account"><Avatar src={avatarUrl} asset={avatarAsset} cacheScope={viewerAccountScope} text={viewerInitials} displayName="Your account" decorative /></Link>} actions={<RoomsCreateMenu />} />
      <main className={styles.main}>
        <RoomsToolbar filter={filter} counts={counts} filterOpen={filterOpen} searchOpen={searchOpen} editing={editing} grid={grid} query={query} visibleCount={visibleRooms.length} canEdit={false} layoutFading={isTransitioning} setFilterOpen={setFilterOpen} setFilter={setFilter} openSearch={() => { setSearchOpen(true); setFilterOpen(false); }} closeSearch={closeSearch} setQuery={setQuery} toggleEditing={() => undefined} toggleGrid={toggleLayout} />
        {loading ? <RoomsCardsLoading grid={grid} /> : visibleRooms.length ? <section ref={containerRef} key={`${filter}:${grid}:${query}`} className={`${styles.cards} ${grid ? styles.cardsGrid : ""} ${isTransitioning ? styles.cardsLayoutFading : ""} ${layoutFadePhase === "out" ? styles.cardsFadeOut : layoutFadePhase === "in" ? styles.cardsFadeIn : ""}`} aria-label="Your rooms" aria-busy={isTransitioning || undefined}>{visibleRooms.map(({ room, boardItems }, index) => <RoomCard key={room.id} room={room} boardItems={boardItems} grid={grid} editing={editing} active={grid || index === activeIndex} index={index} toggleFavorite={() => undefined} requestDelete={() => undefined} rememberRoom={() => rememberRoomCarouselItem(room.publicId)} cacheScope={viewerCacheScope} />)}</section> : <section className={styles.empty}><Icon name="board" size={26} /><h1>No rooms here.</h1><p>{query ? "Try a different room name." : "The next shared moment will appear here."}</p></section>}
        {!loading && !grid && visibleRooms.length > 0 ? <RoomProgress activeIndex={activeIndex} total={visibleRooms.length} progress={progress} /> : null}
      </main>
    </div>
  );
}
