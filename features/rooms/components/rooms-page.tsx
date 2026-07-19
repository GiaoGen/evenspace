"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AppHeader } from "@/components/app-header/app-header";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { filterRoomCollection, getRoomCollection, getRoomFilterCounts, type RoomFilter } from "../model/room-collection";
import { useRoomCarousel } from "../model/use-room-carousel";
import { RoomCard } from "./room-card";
import { RoomDeleteSheet } from "./room-delete-sheet";
import { RoomProgress } from "./room-progress";
import { RoomsToolbar } from "./rooms-toolbar";
import styles from "./rooms-page.module.css";

export function RoomsPage() {
  const { session, dispatch } = useMockSession();
  const [nowIso] = useState(() => new Date().toISOString());
  const [filter, setFilter] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [editing, setEditing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<RoomPublicId | null>(null);
  const rooms = useMemo(() => getRoomCollection(session, nowIso), [nowIso, session]);
  const counts = useMemo(() => getRoomFilterCounts(rooms), [rooms]);
  const visibleRooms = useMemo(() => filterRoomCollection(rooms, filter, query), [filter, query, rooms]);
  const roomKeys = useMemo(() => visibleRooms.map((item) => item.room.publicId), [visibleRooms]);
  const { containerRef, activeIndex, progress } = useRoomCarousel(roomKeys, !grid);
  const pendingDelete = deleteTarget ? visibleRooms.find((item) => item.room.publicId === deleteTarget)?.room ?? rooms.find((item) => item.room.publicId === deleteTarget)?.room ?? null : null;

  function toggleEditing() {
    setEditing((value) => !value);
    setFilterOpen(false);
    setSearchOpen(false);
  }

  function closeSearch() { setSearchOpen(false); setQuery(""); }

  function confirmDelete() {
    if (!deleteTarget) return;
    dispatch({ type: "COMMAND", command: { type: "REMOVE_OWN_ROOM", roomPublicId: deleteTarget, actorId: session.viewer.actorId } });
    setDeleteTarget(null);
  }

  return (
    <div className={styles.page}>
      <AppHeader actions={<><Link className={styles.createButton} href="/rooms/new" aria-label="Create a room"><Icon name="plus" /></Link><Link href="/account" className={styles.avatar} aria-label="Open account">{session.viewer.initials}</Link></>} />
      <main className={styles.main}>
        <RoomsToolbar filter={filter} counts={counts} filterOpen={filterOpen} searchOpen={searchOpen} editing={editing} grid={grid} query={query} visibleCount={visibleRooms.length} setFilterOpen={setFilterOpen} setFilter={setFilter} openSearch={() => { setSearchOpen(true); setFilterOpen(false); }} closeSearch={closeSearch} setQuery={setQuery} toggleEditing={toggleEditing} toggleGrid={() => setGrid((value) => !value)} />
        {visibleRooms.length ? <section ref={containerRef} key={`${filter}:${grid}:${query}`} className={`${styles.cards} ${grid ? styles.cardsGrid : ""}`} aria-label="Your rooms">{visibleRooms.map(({ room, boardItems }, index) => <RoomCard key={room.id} room={room} boardItems={boardItems} grid={grid} editing={editing} active={grid || index === activeIndex} index={index} toggleFavorite={() => dispatch({ type: "COMMAND", command: { type: "TOGGLE_FAVORITE", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso } })} requestDelete={() => setDeleteTarget(room.publicId)} />)}</section> : <section className={styles.empty}><Icon name="board" size={26} /><h1>No rooms here.</h1><p>{query ? "Try a different room name." : "The next shared moment will appear here."}</p></section>}
        {!grid && visibleRooms.length > 0 ? <RoomProgress activeIndex={activeIndex} total={visibleRooms.length} progress={progress} /> : null}
      </main>
      <Link className={styles.mobileCreate} href="/rooms/new"><Icon name="plus" /><span>Create</span></Link>
      {pendingDelete ? <RoomDeleteSheet roomName={pendingDelete.name} close={() => setDeleteTarget(null)} confirm={confirmDelete} /> : null}
    </div>
  );
}
