"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ActorId } from "@/core/domain/ids";
import type { RoomCapabilities } from "@/core/domain/room";
import type { MockRoom } from "@/features/mock-session/model/mock-session";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { BoardPanel } from "./board-panel";
import { ChatPanel } from "./chat-panel";
import { ItineraryPanel } from "./itinerary-panel";
import { RoomControls, type RoomControl } from "./room-controls";
import styles from "./room-experience.module.css";

type RoomPage = "chat" | "board" | "itinerary";

const pages: readonly { readonly id: RoomPage; readonly label: string; readonly icon: IconName }[] = [
  { id: "chat", label: "Chat", icon: "chat" },
  { id: "board", label: "Board", icon: "board" },
  { id: "itinerary", label: "Itinerary", icon: "calendar" },
];

function formatEnd(value: string | null, timeZone: string) {
  return value ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value)) : null;
}

function formatCountdown(value: string | null, now: number) {
  if (!value) return "Active";
  const remaining = Math.max(0, Date.parse(value) - now);
  const totalMinutes = Math.ceil(remaining / 60_000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours <= 0) return `${minutes}m left`;
  if (hours < 24) return `${hours}h ${minutes}m left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

export function RoomExperience({ room, capabilities, viewerActorId }: { readonly room: MockRoom; readonly capabilities: RoomCapabilities; readonly viewerActorId: ActorId }) {
  const { dispatch } = useMockSession();
  const [page, setPage] = useState<RoomPage>("chat");
  const [visitedPages, setVisitedPages] = useState<ReadonlySet<RoomPage>>(() => new Set(["chat"]));
  const [control, setControl] = useState<RoomControl | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [boardSequence, setBoardSequence] = useState(false);
  const [boardMenuOpen, setBoardMenuOpen] = useState(false);
  const endTime = formatEnd(room.endsAt, room.timeZone);
  const lifecycleLabel = room.lifecycle === "active" ? formatCountdown(room.endsAt, now) : room.lifecycle === "archived" ? "Archived · Read-only" : "Preserving · Read-only";

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room.lifecycle !== "freezing" && room.lifecycle !== "archiving") return;
    const lifecycle = room.lifecycle === "freezing" ? "archiving" : "archived";
    const timer = window.setTimeout(() => dispatch({ type: "COMMAND", command: { type: "ADVANCE_ARCHIVE", roomPublicId: room.publicId, lifecycle, nowIso: new Date().toISOString() } }), room.lifecycle === "freezing" ? 650 : 850);
    return () => window.clearTimeout(timer);
  }, [dispatch, room.lifecycle, room.publicId]);

  function selectPage(nextPage: RoomPage) {
    setVisitedPages((current) => current.has(nextPage) ? current : new Set([...current, nextPage]));
    setPage(nextPage);
    if (nextPage !== "board") setBoardMenuOpen(false);
  }

  function selectBoardMode(nextSequence: boolean) {
    setBoardSequence(nextSequence);
    setBoardMenuOpen(false);
    selectPage("board");
  }

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={styles.headerLeft}><Link className={styles.backButton} href="/rooms" aria-label="Return to rooms"><Icon name="arrow" /></Link></div>
        <div className={styles.identity}><h1>{room.name}</h1><p><i /><span>{lifecycleLabel}</span><span className={styles.secondaryStatus}> · {room.mode === "host-led" ? "Host-led" : "Community-led"} · Local</span></p></div>
        <div className={styles.headerActions}>{room.lifecycle === "active" ? <button type="button" aria-label="Share room" onClick={() => setControl("share")}><Icon name="share" /><span>Share</span></button> : null}<button type="button" aria-label="Open members" onClick={() => setControl("members")}><Icon name="members" /><span>Members</span></button><button type="button" aria-label={room.lifecycle === "archived" ? "Archive options" : "More room actions"} onClick={() => setControl("more")}><Icon name="more" /></button></div>
      </header>
      <nav className={styles.roomTabs} aria-label="Room pages">
        {pages.map((item) => item.id === "board" ? <div className={styles.boardTabWrap} key={item.id}><button type="button" className={page === item.id ? styles.activeTab : ""} onClick={() => { if (page !== "board") { selectPage("board"); setBoardMenuOpen(false); } else setBoardMenuOpen((open) => !open); }} aria-current={page === item.id ? "page" : undefined} aria-expanded={boardMenuOpen}><Icon name={item.icon} size={16} /><span>{boardSequence ? "Sequence" : "Board"}</span><Icon name="chevron" size={13} /></button>{boardMenuOpen ? <div className={styles.boardTabMenu}><button type="button" className={!boardSequence ? styles.boardTabSelected : ""} onClick={() => selectBoardMode(false)}>Board</button><button type="button" className={boardSequence ? styles.boardTabSelected : ""} onClick={() => selectBoardMode(true)}>Sequence</button></div> : null}</div> : <button type="button" key={item.id} className={page === item.id ? styles.activeTab : ""} onClick={() => selectPage(item.id)} aria-current={page === item.id ? "page" : undefined}><Icon name={item.icon} size={16} /><span>{item.label}</span></button>)}
      </nav>
      <div className={styles.roomBody}>
        <main className={styles.roomContent}>
          <div className={styles.roomPages}>
            <section className={`${styles.roomPage} ${page === "chat" ? styles.activePage : ""}`} aria-hidden={page !== "chat"}><ChatPanel roomPublicId={room.publicId} messages={room.messages} poll={room.activePoll} pinnedMessageId={room.pinnedMessageId} members={room.members} viewerActorId={viewerActorId} timeZone={room.timeZone} canChat={capabilities.canChat} canVote={capabilities.canVote} canModerate={capabilities.canModerate} archived={room.lifecycle !== "active"} /></section>
            {visitedPages.has("board") ? <section className={`${styles.roomPage} ${page === "board" ? styles.activePage : ""}`} aria-hidden={page !== "board"}><BoardPanel roomPublicId={room.publicId} items={room.boardItems} members={room.members} canAdd={capabilities.canAddBoardItem} canModerate={capabilities.canModerate} viewerActorId={room.members.find((member) => member.actorId === viewerActorId)?.actorId ?? room.members[0].actorId} photoCount={room.photoCount} maxPhotos={room.maxPhotos} sequence={boardSequence} setSequence={setBoardSequence} boardBackground={room.boardBackground ?? "stone"} /></section> : null}
            {visitedPages.has("itinerary") ? <section className={`${styles.roomPage} ${page === "itinerary" ? styles.activePage : ""}`} aria-hidden={page !== "itinerary"}><ItineraryPanel roomPublicId={room.publicId} items={room.itinerary} timeZone={room.timeZone} canCreate={capabilities.canCreateItinerary} canVote={capabilities.canVote} canModerate={capabilities.canModerate} mode={room.mode} members={room.members} /></section> : null}
          </div>
        </main>
        <aside className={styles.sidebar}><section><p>About</p><span>{room.description}</span></section><section><p>{room.status === "active" ? "Ends at" : "Archived"}</p><strong>{room.status === "active" ? endTime : room.archivedAt ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: room.timeZone }).format(new Date(room.archivedAt)) : "—"}</strong><span>{room.timeZone.replace("_", " ")}</span></section><section><p>People · {room.memberCount}</p><div className={styles.avatarStack}>{room.members.slice(0,4).map((member) => <b key={member.actorId}>{member.initials}</b>)}{room.memberCount > 4 ? <b>+{room.memberCount - 4}</b> : null}</div></section>{room.itinerary[0] ? <section><p>Next</p><div className={styles.next}><time>{formatEnd(room.itinerary[0].startsAt, room.timeZone)}</time><div><strong>{room.itinerary[0].title}</strong><span>{room.itinerary[0].locationLabel ?? "No fixed location"}</span></div><Icon name="chevron" /></div></section> : null}</aside>
      </div>
      {room.lifecycle === "freezing" || room.lifecycle === "archiving" ? <div className={styles.lifecycle}><span /><div><strong>{room.lifecycle === "freezing" ? "Freezing the room…" : "Keeping this moment…"}</strong><p>Every write is now disabled while the read-only archive is prepared.</p></div></div> : null}
      {control ? <RoomControls active={control} room={room} capabilities={capabilities} close={() => setControl(null)} openControl={setControl} /> : null}
    </div>
  );
}
