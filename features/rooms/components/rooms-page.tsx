"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { AppHeader } from "@/components/app-header/app-header";
import { Icon } from "@/components/ui/icon";
import { filterRoomCollection, getRoomFilterCounts, type RoomCollectionItem, type RoomFilter } from "../model/room-collection";
import { rememberRoomCarouselItem, useRoomCarousel } from "../model/use-room-carousel";
import { RoomCard } from "./room-card";
import { RoomProgress } from "./room-progress";
import { RoomsToolbar } from "./rooms-toolbar";
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

export function RoomsPage({ initialRooms, viewerInitials }: { readonly initialRooms: readonly RoomCollectionItem[]; readonly viewerInitials: string }) {
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const grid = useSyncExternalStore(subscribeToGridPreference, readGridPreference, () => false);
  const editing = false;
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const counts = useMemo(() => getRoomFilterCounts(initialRooms), [initialRooms]);
  const visibleRooms = useMemo(() => filterRoomCollection(initialRooms, filter, query), [filter, initialRooms, query]);
  const roomKeys = useMemo(() => visibleRooms.map((item) => item.room.publicId), [visibleRooms]);
  const { containerRef, activeIndex, progress } = useRoomCarousel(roomKeys, !grid);
  function closeSearch() { setSearchOpen(false); setQuery(""); }

  return (
    <div className={styles.page}>
      <AppHeader leading={<Link href="/account" className={styles.avatar} aria-label="Open account">{viewerInitials}</Link>} actions={<Link href="/rooms/new" className={styles.topCreateAction} aria-label="Create a room"><Icon name="plus" size={17} /></Link>} />
      <main className={styles.main}>
        <RoomsToolbar filter={filter} counts={counts} filterOpen={filterOpen} searchOpen={searchOpen} editing={editing} grid={grid} query={query} visibleCount={visibleRooms.length} canEdit={false} setFilterOpen={setFilterOpen} setFilter={setFilter} openSearch={() => { setSearchOpen(true); setFilterOpen(false); }} closeSearch={closeSearch} setQuery={setQuery} toggleEditing={() => undefined} toggleGrid={() => updateGridPreference(!grid)} />
        {visibleRooms.length ? <section ref={containerRef} key={`${filter}:${grid}:${query}`} className={`${styles.cards} ${grid ? styles.cardsGrid : ""}`} aria-label="Your rooms">{visibleRooms.map(({ room, boardItems }, index) => <RoomCard key={room.id} room={room} boardItems={boardItems} grid={grid} editing={editing} active={grid || index === activeIndex} index={index} toggleFavorite={() => undefined} requestDelete={() => undefined} rememberRoom={() => rememberRoomCarouselItem(room.publicId)} />)}</section> : <section className={styles.empty}><Icon name="board" size={26} /><h1>No rooms here.</h1><p>{query ? "Try a different room name." : "The next shared moment will appear here."}</p></section>}
        {!grid && visibleRooms.length > 0 ? <RoomProgress activeIndex={activeIndex} total={visibleRooms.length} progress={progress} /> : null}
      </main>
    </div>
  );
}
