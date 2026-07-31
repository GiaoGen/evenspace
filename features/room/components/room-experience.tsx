"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ActorId } from "@/core/domain/ids";
import type { RoomCapabilities } from "@/core/domain/room";
import type { MockRoom } from "@/features/mock-session/model/mock-session";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { ChatPanel } from "./chat-panel";
import { ItineraryPanel } from "./itinerary/itinerary-panel";
import { PhotosPanel } from "./photos-panel";
import { RoomControls, type RoomControl } from "./room-controls";
import styles from "./room-experience.module.css";
import type { RoomSecondaryState } from "./backend-room-route";

type RoomPage = "chat" | "photos" | "itinerary";

const pages: readonly RoomPage[] = ["chat", "photos", "itinerary"];
const INITIAL_ROOM_PAGE: RoomPage = "photos";
const pageIcons: Readonly<Record<RoomPage, IconName>> = {
  chat: "chat",
  photos: "image",
  itinerary: "calendar",
};

const SCROLL_SETTLE_DELAY_MS = 140;
const PAGE_JUMP_FEEDBACK_MS = 240;

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

export function RoomExperience({ room, capabilities, viewerActorId, cacheScope = viewerActorId, secondaryState = "ready" }: { readonly room: MockRoom; readonly capabilities: RoomCapabilities; readonly viewerActorId: ActorId; readonly cacheScope?: string; readonly secondaryState?: RoomSecondaryState }) {
  const { dispatch } = useMockSession();
  const [page, setPage] = useState<RoomPage>(INITIAL_ROOM_PAGE);
  const [control, setControl] = useState<RoomControl | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [headerView, setHeaderView] = useState<"title" | "countdown">("title");
  const [jumpingPage, setJumpingPage] = useState<RoomPage | null>(null);
  const pagesRef = useRef<HTMLDivElement | null>(null);
  const pagesReadyRef = useRef(false);
  const initialPageGuardRef = useRef(true);
  const pagePositionFrameRef = useRef<number | null>(null);
  const pageJumpTimerRef = useRef<number | null>(null);
  const scrollSettleTimerRef = useRef<number | null>(null);
  const endTime = formatEnd(room.endsAt, room.timeZone);
  const lifecycleLabel = room.lifecycle === "archived" ? "Archived · Read-only" : "Preserving · Read-only";
  const roomStart = Date.parse(room.createdAt);
  const roomEnd = Date.parse(room.endsAt ?? "");
  const durationProgress = Number.isFinite(roomStart) && Number.isFinite(roomEnd) && roomEnd > roomStart ? Math.min(1, Math.max(0, (now - roomStart) / (roomEnd - roomStart))) : 0;
  const alternatePages = pages.filter((candidate) => candidate !== page);
  const leftPage = alternatePages[0];
  const rightPage = alternatePages[1];

  const alignPageImmediately = useCallback((targetPage: RoomPage) => {
    const container = pagesRef.current;
    const target = container?.children.item(pages.indexOf(targetPage));
    if (!container || !(target instanceof HTMLElement)) return;
    const pagesElement = container;
    const targetElement = target;
    if (pagePositionFrameRef.current !== null) window.cancelAnimationFrame(pagePositionFrameRef.current);

    pagesReadyRef.current = false;
    pagesElement.style.overflowX = "hidden";
    pagesElement.style.scrollSnapType = "none";

    function align() {
      pagesElement.scrollLeft = targetElement.offsetLeft;
    }

    align();
    pagePositionFrameRef.current = window.requestAnimationFrame(() => {
      align();
      pagesElement.style.removeProperty("overflow-x");
      pagesElement.style.removeProperty("scroll-snap-type");
      pagesReadyRef.current = true;
      pagePositionFrameRef.current = null;
    });
  }, []);

  useLayoutEffect(() => {
    const pagesElement = pagesRef.current;
    initialPageGuardRef.current = true;
    alignPageImmediately(INITIAL_ROOM_PAGE);

    return () => {
      if (pagePositionFrameRef.current !== null) window.cancelAnimationFrame(pagePositionFrameRef.current);
      pagesElement?.style.removeProperty("overflow-x");
      pagesElement?.style.removeProperty("scroll-snap-type");
      pagesReadyRef.current = false;
    };
  }, [alignPageImmediately]);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (room.lifecycle !== "active") return;
    const timer = window.setTimeout(() => setHeaderView((current) => current === "title" ? "countdown" : "title"), headerView === "title" ? 5000 : 3000);
    return () => window.clearTimeout(timer);
  }, [headerView, room.lifecycle]);

  useEffect(() => {
    if (room.lifecycle !== "freezing" && room.lifecycle !== "archiving") return;
    const lifecycle = room.lifecycle === "freezing" ? "archiving" : "archived";
    const timer = window.setTimeout(() => dispatch({ type: "COMMAND", command: { type: "ADVANCE_ARCHIVE", roomPublicId: room.publicId, lifecycle, nowIso: new Date().toISOString() } }), room.lifecycle === "freezing" ? 650 : 850);
    return () => window.clearTimeout(timer);
  }, [dispatch, room.lifecycle, room.publicId]);

  const commitSettledPage = useCallback(() => {
    const container = pagesRef.current;
    if (!container?.clientWidth) return;
    if (!pagesReadyRef.current) return;
    if (initialPageGuardRef.current) return;
    const index = Math.max(0, Math.min(pages.length - 1, Math.round(container.scrollLeft / container.clientWidth)));
    const nextPage = pages[index];
    setPage((current) => current === nextPage ? current : nextPage);
  }, []);

  useEffect(() => {
    const container = pagesRef.current;
    if (!container) return;

    function handleScrollEnd() {
      if (scrollSettleTimerRef.current !== null) {
        window.clearTimeout(scrollSettleTimerRef.current);
        scrollSettleTimerRef.current = null;
      }
      commitSettledPage();
    }

    container.addEventListener("scrollend", handleScrollEnd);
    return () => {
      container.removeEventListener("scrollend", handleScrollEnd);
      if (scrollSettleTimerRef.current !== null) window.clearTimeout(scrollSettleTimerRef.current);
      if (pageJumpTimerRef.current !== null) window.clearTimeout(pageJumpTimerRef.current);
    };
  }, [commitSettledPage]);

  useEffect(() => {
    const container = pagesRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;
    let previousWidth = container.clientWidth;
    const observer = new ResizeObserver(() => {
      const nextWidth = container.clientWidth;
      if (!nextWidth || nextWidth === previousWidth) return;
      previousWidth = nextWidth;
      alignPageImmediately(page);
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [alignPageImmediately, page]);

  function schedulePageSettlement() {
    if (!pagesReadyRef.current) return;
    if (initialPageGuardRef.current) return;
    if (scrollSettleTimerRef.current !== null) window.clearTimeout(scrollSettleTimerRef.current);
    scrollSettleTimerRef.current = window.setTimeout(() => {
      scrollSettleTimerRef.current = null;
      commitSettledPage();
    }, SCROLL_SETTLE_DELAY_MS);
  }

  function navigateToPage(targetPage: RoomPage) {
    const container = pagesRef.current;
    if (!container?.clientWidth || targetPage === page) return;
    if (scrollSettleTimerRef.current !== null) window.clearTimeout(scrollSettleTimerRef.current);
    if (pageJumpTimerRef.current !== null) window.clearTimeout(pageJumpTimerRef.current);
    releaseInitialPageGuard();

    alignPageImmediately(targetPage);
    setPage(targetPage);
    setJumpingPage(targetPage);
    pageJumpTimerRef.current = window.setTimeout(() => {
      pageJumpTimerRef.current = null;
      setJumpingPage(null);
    }, PAGE_JUMP_FEEDBACK_MS);
  }

  function releaseInitialPageGuard() {
    initialPageGuardRef.current = false;
    if (pagePositionFrameRef.current !== null) {
      window.cancelAnimationFrame(pagePositionFrameRef.current);
      pagePositionFrameRef.current = null;
      const container = pagesRef.current;
      container?.style.removeProperty("overflow-x");
      container?.style.removeProperty("scroll-snap-type");
      pagesReadyRef.current = true;
    }
  }

  return (
    <div className={styles.room}>
      <header className={styles.roomHeader}>
        <div className={`${styles.headerSide} ${styles.headerLeft}`}><button type="button" className={styles.pageNavButton} onClick={() => navigateToPage(leftPage)} aria-label={`Open ${leftPage}`}><span key={`${page}-${leftPage}`} className={styles.pageNavIcon}><Icon name={pageIcons[leftPage]} /></span></button></div>
        <button type="button" className={styles.identity} onClick={() => setControl("more")} aria-label={room.lifecycle === "archived" ? "Open archive options" : "Open room options"} aria-live="polite"><span className={`${styles.headerIdentityView} ${headerView === "title" || room.lifecycle !== "active" ? styles.headerIdentityVisible : ""}`}><span className={styles.roomTitle}>{room.name}</span>{room.lifecycle !== "active" ? <span className={styles.identityMeta}>{lifecycleLabel}</span> : null}</span>{room.lifecycle === "active" ? <span className={`${styles.headerIdentityView} ${styles.headerCountdown} ${headerView === "countdown" ? styles.headerIdentityVisible : ""}`}><strong>{formatCountdown(room.endsAt, now)}</strong><span><i style={{ transform: `scaleX(${durationProgress})` }} /></span></span> : null}</button>
        <div className={`${styles.headerSide} ${styles.headerRight}`}><button type="button" className={styles.pageNavButton} onClick={() => navigateToPage(rightPage)} aria-label={`Open ${rightPage}`}><span key={`${page}-${rightPage}`} className={styles.pageNavIcon}><Icon name={pageIcons[rightPage]} /></span></button></div>
      </header>
      <div className={styles.roomBody}>
        <main className={styles.roomContent}>
          <div ref={pagesRef} className={styles.roomPages} onPointerDown={releaseInitialPageGuard} onWheel={releaseInitialPageGuard} onScroll={schedulePageSettlement}>
            <section className={`${styles.roomPage} ${jumpingPage === "chat" ? styles.roomPageJumping : ""}`} aria-hidden={page !== "chat"} inert={page !== "chat"}><ChatPanel roomPublicId={room.publicId} messages={room.messages} pinnedMessageId={room.pinnedMessageId} members={room.members} viewerActorId={viewerActorId} cacheScope={cacheScope} timeZone={room.timeZone} canChat={capabilities.canChat} canModerate={capabilities.canModerate} archived={room.lifecycle !== "active"} dataState={secondaryState} /></section>
            <section className={`${styles.roomPage} ${jumpingPage === "photos" ? styles.roomPageJumping : ""}`} aria-hidden={page !== "photos"} inert={page !== "photos"}><PhotosPanel roomPublicId={room.publicId} items={room.boardItems} comments={room.boardComments} members={room.members} viewerActorId={viewerActorId} photoCount={room.photoCount} maxPhotos={room.maxPhotos} canAdd={capabilities.canAddBoardItem} canModerate={capabilities.canModerate} archived={room.lifecycle !== "active"} /></section>
            <section className={`${styles.roomPage} ${jumpingPage === "itinerary" ? styles.roomPageJumping : ""}`} aria-hidden={page !== "itinerary"} inert={page !== "itinerary"}><ItineraryPanel roomPublicId={room.publicId} items={room.itinerary} timeZone={room.timeZone} canCreate={capabilities.canCreateItinerary} canModerate={capabilities.canModerate} members={room.members} active={page === "itinerary"} /></section>
          </div>
        </main>
        <aside className={styles.sidebar}><section><p>About</p><span>{room.description}</span></section><section><p>{room.status === "active" ? "Ends at" : "Archived"}</p><strong>{room.status === "active" ? endTime : room.archivedAt ? new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", timeZone: room.timeZone }).format(new Date(room.archivedAt)) : "—"}</strong><span>{room.timeZone.replace("_", " ")}</span></section><section><p>People · {room.memberCount}</p><div className={styles.avatarStack}>{room.members.slice(0,4).map((member) => <Avatar key={member.actorId} src={member.avatarUrl} asset={member.avatarAsset} cacheScope={cacheScope} text={member.initials} displayName={member.displayName} decorative />)}{room.memberCount > 4 ? <b>+{room.memberCount - 4}</b> : null}</div></section>{room.itinerary[0] ? <section><p>Next</p><div className={styles.next}><time>{formatEnd(room.itinerary[0].startsAt, room.timeZone)}</time><div><strong>{room.itinerary[0].title}</strong><span>{room.itinerary[0].locationLabel ?? "No fixed location"}</span></div><Icon name="chevron" /></div></section> : null}</aside>
      </div>
      {room.lifecycle === "freezing" || room.lifecycle === "archiving" ? <div className={styles.lifecycle}><span /><div><strong>{room.lifecycle === "freezing" ? "Freezing the room…" : "Keeping this moment…"}</strong><p>Every write is now disabled while the read-only archive is prepared.</p></div></div> : null}
      {control ? <RoomControls active={control} room={room} capabilities={capabilities} close={() => setControl(null)} openControl={setControl} /> : null}
    </div>
  );
}
