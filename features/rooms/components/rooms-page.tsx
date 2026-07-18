"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AppHeader } from "@/components/app-header/app-header";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { BOARD_UNIT, computeBoardFit, getBoardItemPixelSize } from "@/core/domain/board-layout";
import type { BoardItem, RoomStatus, RoomSummary } from "@/core/domain/room";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { selectVisibleRooms, toRoomSummary } from "@/features/mock-session/model/mock-session";
import styles from "./rooms-page.module.css";

function formatRoomMeta(room: RoomSummary) {
  const source = room.status === "active" ? room.endsAt : room.archivedAt;
  const date = source ? new Date(source) : null;
  const formatted = date ? new Intl.DateTimeFormat("en-US", room.status === "active" ? { hour: "numeric", minute: "2-digit", timeZone: room.timeZone } : { month: "short", day: "numeric", timeZone: room.timeZone }).format(date) : "—";
  return room.status === "active" ? `Ends ${formatted} · ${room.memberCount} people` : `Archived ${formatted} · ${room.memberCount} people`;
}

function BoardSnapshot({ items }: { readonly items: readonly BoardItem[] }) {
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [fit, setFit] = useState({ x: 0, y: 0, scale: 1 });

  useEffect(() => {
    const element = previewRef.current;
    if (!element) return;
    function update() {
      const rect = element!.getBoundingClientRect();
      setFit(computeBoardFit(items, rect));
    }
    update();
    const observer = new ResizeObserver(update);
    observer.observe(element);
    return () => observer.disconnect();
  }, [items]);

  function itemStyle(item: BoardItem): CSSProperties {
    const size = getBoardItemPixelSize(item);
    return {
      left: `${item.x * BOARD_UNIT}px`,
      top: `${item.y * BOARD_UNIT}px`,
      width: `${size.width}px`,
      height: `${size.height}px`,
      transform: `rotate(${item.rotation}deg)`,
    };
  }

  return (
    <div ref={previewRef} className={styles.boardPreview}>
      <div className={styles.boardWorld} style={{ transform: `translate3d(${fit.x}px, ${fit.y}px, 0) scale(${fit.scale})` }}>
        {items.map((item) => item.kind === "photo" ? (
          <div key={item.id} className={styles.boardSnapshotItem} style={itemStyle(item)}>
            <PinnedPhoto variant={item.variant} imageDataUrl={item.imageDataUrl} imageName={item.imageName} note={item.imageDataUrl ? null : item.note} className={styles.boardSnapshotPhoto} />
          </div>
        ) : item.kind === "drawing" ? (
          <div key={item.id} className={styles.boardSnapshotDrawing} style={itemStyle(item)}><Image src={item.imageDataUrl} alt="Board drawing" fill sizes="220px" unoptimized /></div>
        ) : (
          <div key={item.id} className={styles.boardSnapshotNote} style={itemStyle(item)}>{item.text}</div>
        ))}
      </div>
      {items.length === 0 ? <span className={styles.emptyBoard}>No board items yet.</span> : null}
    </div>
  );
}

type RoomFilter = "all" | RoomStatus | "favorite";

const filterLabels: Record<RoomFilter, string> = { all: "All", active: "Active", archived: "Achieved", favorite: "Favorite" };
const filterOptions: readonly RoomFilter[] = ["all", "active", "archived", "favorite"];

function getDisplayRoom(room: RoomSummary, nowIso: string): RoomSummary {
  const expired = room.status === "active" && room.endsAt !== null && Number.isFinite(Date.parse(room.endsAt)) && Date.parse(room.endsAt) <= Date.parse(nowIso);
  return expired ? { ...room, status: "archived", archivedAt: room.endsAt } : room;
}

function RoomCard({ room, boardItems, grid, editing, toggleFavorite, removeRoom }: { readonly room: RoomSummary; readonly boardItems: readonly BoardItem[]; readonly grid: boolean; readonly editing: boolean; readonly toggleFavorite: () => void; readonly removeRoom: () => void }) {
  return (
    <article className={`${styles.card} ${grid ? styles.cardGrid : ""} ${editing ? styles.cardEditing : ""}`}>
      {editing ? <button className={`${styles.favorite} ${room.isFavorite ? styles.favoriteActive : ""}`} onClick={toggleFavorite} aria-label={room.isFavorite ? `Remove ${room.name} from favorites` : `Favorite ${room.name}`}><Icon name="heart" size={16} /><span>Favorite</span></button> : null}
      {editing ? <button className={styles.deleteRoom} onClick={removeRoom} aria-label={`Delete ${room.name}`}><Icon name="minus" size={16} /></button> : null}
      <Link href={`/rooms/${room.publicId}`} className={styles.cardLink}>
        <BoardSnapshot items={boardItems} />
        <div className={styles.cardInfo}><div><h2>{room.name}</h2><p><i className={room.status === "active" ? styles.liveDot : ""} />{formatRoomMeta(room)}</p></div><span><Icon name="arrow" /></span></div>
      </Link>
    </article>
  );
}

export function RoomsPage() {
  const { session, dispatch } = useMockSession();
  const [nowIso] = useState(() => new Date().toISOString());
  const rooms = useMemo(() => selectVisibleRooms(session, nowIso).map((room) => {
    return { room: getDisplayRoom(toRoomSummary(room), nowIso), boardItems: room.boardItems };
  }), [nowIso, session]);
  const [status, setStatus] = useState<RoomFilter>("all");
  const [filterOpen, setFilterOpen] = useState(false);
  const [grid, setGrid] = useState(false);
  const [editing, setEditing] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");

  const counts = useMemo(() => ({ all: rooms.length, active: rooms.filter((item) => item.room.status === "active").length, archived: rooms.filter((item) => item.room.status === "archived").length, favorite: rooms.filter((item) => item.room.isFavorite).length }), [rooms]);
  const visibleRooms = useMemo(() => rooms
    .filter((item) => (status === "all" || status === "favorite" && item.room.isFavorite || item.room.status === status) && item.room.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))
    .sort((left, right) => Number(right.room.status === "active") - Number(left.room.status === "active")), [query, rooms, status]);
  const otherFilters = filterOptions.filter((item) => item !== status);

  return (
    <div className={styles.page}>
      <AppHeader actions={<><span className={styles.mockBadge}>Local data</span><Link className={styles.createButton} href="/rooms/new" aria-label="Create a room"><Icon name="plus" /></Link><button className={styles.iconButton} onClick={() => setSearchOpen(!searchOpen)} aria-label="Search rooms"><Icon name="search" /></button><Link href="/account" className={styles.avatar} aria-label="Open account">{session.viewer.initials}</Link></>} />
      <main className={styles.main}>
        {searchOpen ? <div className={styles.search}><Icon name="search" /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} placeholder="Search your rooms" aria-label="Search your rooms" /><button onClick={() => { setQuery(""); setSearchOpen(false); }} aria-label="Close search"><Icon name="close" size={16} /></button></div> : null}
        <div className={styles.controls}>
          <div className={styles.filterCluster}>
            <div className={styles.filterMenu}>
              <button type="button" className={styles.filterButton} aria-expanded={filterOpen} onClick={() => setFilterOpen((open) => !open)}>{filterLabels[status]}<span>{counts[status]}</span><Icon name="chevron" size={14} /></button>
              {filterOpen ? <div className={styles.filterOptions}>{otherFilters.map((item) => <button type="button" key={item} onClick={() => { setStatus(item); setFilterOpen(false); }}>{filterLabels[item]}<span>{counts[item]}</span></button>)}</div> : null}
            </div>
            <button type="button" className={`${styles.editButton} ${editing ? styles.editButtonActive : ""}`} onClick={() => setEditing((value) => !value)} aria-pressed={editing}><Icon name={editing ? "check" : "more"} size={14} />Edit</button>
          </div>
          <div className={styles.views}><button className={!grid ? styles.selected : ""} onClick={() => setGrid(false)} aria-label="Magazine view"><Icon name="list" /></button><button className={grid ? styles.selected : ""} onClick={() => setGrid(true)} aria-label="Grid view"><Icon name="grid" /></button></div>
        </div>
        {visibleRooms.length ? <section className={`${styles.cards} ${grid ? styles.cardsGrid : ""}`}>{visibleRooms.map(({ room, boardItems }) => <RoomCard key={room.id} room={room} boardItems={boardItems} grid={grid} editing={editing} toggleFavorite={() => dispatch({ type: "COMMAND", command: { type: "TOGGLE_FAVORITE", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso } })} removeRoom={() => dispatch({ type: "COMMAND", command: { type: "REMOVE_OWN_ROOM", roomPublicId: room.publicId, actorId: session.viewer.actorId } })} />)}</section> : <section className={styles.empty}><Icon name="board" size={26} /><h1>No rooms here.</h1><p>{query ? "Try a different room name." : "The next shared moment will appear here."}</p></section>}
        {!grid && visibleRooms.length > 0 ? <div className={styles.progress}><span>01</span><i><b style={{ width: `${100 / visibleRooms.length}%` }} /></i><span>{String(visibleRooms.length).padStart(2, "0")}</span></div> : null}
      </main>
      <Link className={styles.mobileCreate} href="/rooms/new"><Icon name="plus" /><span>Create</span></Link>
    </div>
  );
}
