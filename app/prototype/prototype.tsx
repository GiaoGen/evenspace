"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import styles from "./prototype.module.css";

type View = "landing" | "rooms" | "room";
type RoomTab = "chat" | "board" | "itinerary";
export type IconName =
  | "arrow"
  | "board"
  | "calendar"
  | "chat"
  | "check"
  | "chevron"
  | "clock"
  | "close"
  | "copy"
  | "flag"
  | "grid"
  | "heart"
  | "home"
  | "list"
  | "lock"
  | "mail"
  | "members"
  | "moon"
  | "more"
  | "plus"
  | "search"
  | "send"
  | "share"
  | "shield"
  | "sun"
  | "trash"
  | "voice";

const roomCards = [
  {
    title: "After the rain",
    meta: "2h 41m left · 7 people",
    variant: "one",
    active: true,
  },
  {
    title: "Sunday, slowly",
    meta: "Archived Jul 12 · 6 people",
    variant: "two",
    active: false,
  },
  {
    title: "A very long table",
    meta: "Archived Jun 28 · 9 people",
    variant: "three",
    active: false,
  },
] as const;

function subscribeToSystemTheme(onChange: () => void) {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  query.addEventListener("change", onChange);
  return () => query.removeEventListener("change", onChange);
}

function getSystemTheme() {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function getServerTheme() {
  return false;
}

export function Icon({ name, size = 18 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  const paths: Record<IconName, React.ReactNode> = {
    arrow: <><path d="M5 12h14" /><path d="m14 7 5 5-5 5" /></>,
    board: <><rect x="3.5" y="4" width="17" height="16" rx="3" /><path d="m8 15 2.8-3 2.1 2 2.9-3.3L19 15" /><circle cx="8.5" cy="8.5" r="1" /></>,
    calendar: <><rect x="3.5" y="5.5" width="17" height="15" rx="3" /><path d="M8 3.5v4M16 3.5v4M3.5 10h17" /></>,
    chat: <><path d="M20 11.5a7.5 7.5 0 0 1-8 7.5 9 9 0 0 1-3.6-.8L4 20l1.4-4a7.3 7.3 0 0 1-.9-3.5A7.5 7.5 0 0 1 12 5h.5A7.5 7.5 0 0 1 20 11.5Z" /></>,
    check: <path d="m5 12.5 4.2 4.2L19 7" />,
    chevron: <path d="m9 6 6 6-6 6" />,
    clock: <><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5l3.5 2" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    copy: <><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3" /></>,
    flag: <><path d="M6 21V4" /><path d="M6 5h10l-2 3 2 3H6" /></>,
    grid: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
    heart: <path d="M20.8 8.7c0 5-8.8 10-8.8 10s-8.8-5-8.8-10A4.7 4.7 0 0 1 12 6.3a4.7 4.7 0 0 1 8.8 2.4Z" />,
    home: <><path d="m4 10 8-6 8 6" /><path d="M6.5 9v10h11V9M10 19v-5h4v5" /></>,
    list: <><path d="M9 6h11M9 12h11M9 18h11" /><circle cx="4.5" cy="6" r=".7" fill="currentColor" stroke="none" /><circle cx="4.5" cy="12" r=".7" fill="currentColor" stroke="none" /><circle cx="4.5" cy="18" r=".7" fill="currentColor" stroke="none" /></>,
    lock: <><rect x="4.5" y="10" width="15" height="10" rx="3" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3" /><path d="m4 7 8 6 8-6" /></>,
    members: <><circle cx="9" cy="8" r="3" /><path d="M3.8 19c.5-3.2 2.2-5 5.2-5s4.8 1.8 5.2 5" /><path d="M15 6.5a2.5 2.5 0 0 1 0 4.9M16 14c2.2.5 3.5 2.2 3.8 4.5" /></>,
    moon: <path d="M20 15.2A8.5 8.5 0 0 1 8.8 4a8.5 8.5 0 1 0 11.2 11.2Z" />,
    more: <><circle cx="5" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="12" cy="12" r="1" fill="currentColor" stroke="none" /><circle cx="19" cy="12" r="1" fill="currentColor" stroke="none" /></>,
    plus: <><path d="M12 5v14M5 12h14" /></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" /></>,
    send: <><path d="m5 12 14-7-4 14-3-6-7-1Z" /><path d="m12 13 7-8" /></>,
    share: <><circle cx="18" cy="5" r="2.5" /><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="19" r="2.5" /><path d="m8.2 10.8 7.6-4.5M8.2 13.2l7.6 4.5" /></>,
    shield: <path d="M12 3 5 6v5c0 4.7 2.7 8 7 10 4.3-2 7-5.3 7-10V6l-7-3Z" />,
    sun: <><circle cx="12" cy="12" r="3.5" /><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5.3 5.3l1.4 1.4M17.3 17.3l1.4 1.4M18.7 5.3l-1.4 1.4M6.7 17.3l-1.4 1.4" /></>,
    trash: <><path d="M4 7h16M9 3h6l1 4H8l1-4ZM7 7l1 14h8l1-14M10 11v6M14 11v6" /></>,
    voice: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0 0 12 0M12 17v4M9 21h6" /></>,
  };

  return <svg {...common}>{paths[name]}</svg>;
}

export function Wordmark() {
  return <span className={styles.wordmark}>EventSpace</span>;
}

function PhotoArt({ variant = "one" }: { variant?: "one" | "two" | "three" | "four" }) {
  return (
    <div className={`${styles.photoArt} ${styles[`photoArt${variant}`]}`} aria-hidden="true">
      <span className={styles.artShapeA} />
      <span className={styles.artShapeB} />
      <span className={styles.artShapeC} />
    </div>
  );
}

export function PinnedPhoto({
  variant,
  className = "",
  note,
}: {
  variant: "one" | "two" | "three" | "four";
  className?: string;
  note?: string;
}) {
  return (
    <div className={`${styles.pinnedPhoto} ${className}`}>
      <div className={styles.pinStrip}><span className={styles.pin} /></div>
      <PhotoArt variant={variant} />
      {note ? <p>{note}</p> : null}
    </div>
  );
}

function PrototypeBar({
  view,
  setView,
  dark,
  setDark,
}: {
  view: View;
  setView: (view: View) => void;
  dark: boolean;
  setDark: (value: boolean) => void;
}) {
  const visibleViews: View[] = view === "landing" ? ["landing"] : ["rooms", "room"];

  return (
    <div className={styles.prototypeBar}>
      <div className={styles.prototypeStatus}><span />Static prototype</div>
      <div className={styles.prototypeViews}>
        {visibleViews.map((item) => (
          <button key={item} className={view === item ? styles.isSelected : ""} onClick={() => setView(item)}>
            {item === "landing" ? "Landing" : item === "rooms" ? "Rooms" : "Room"}
          </button>
        ))}
      </div>
      <button className={styles.themeButton} onClick={() => setDark(!dark)} aria-label="Toggle color theme">
        <Icon name={dark ? "sun" : "moon"} size={17} />
      </button>
    </div>
  );
}

function LandingView({ onCreate, onRooms }: { onCreate: () => void; onRooms: () => void }) {
  return (
    <div className={styles.landing}>
      <header className={styles.siteHeader}>
        <Wordmark />
        <div className={styles.headerActions}>
          <button className={styles.textButton}>Log in</button>
          <button className={styles.roundButton} aria-label="Open menu"><Icon name="more" /></button>
        </div>
      </header>

      <main>
        <section className={styles.hero}>
          <div className={styles.heroArt} aria-hidden="true">
            <PinnedPhoto variant="one" className={styles.heroPhotoOne} />
            <PinnedPhoto variant="two" className={styles.heroPhotoTwo} />
            <PinnedPhoto variant="three" className={styles.heroPhotoThree} />
            <div className={styles.heroNote}>
              <span>07:30 PM</span>
              <strong>Meet by the river</strong>
              <small>6 people are going</small>
            </div>
            <div className={styles.heroChat}>
              <span className={styles.miniAvatar}>M</span>
              <p><strong>Maya</strong>Save me a seat?</p>
              <time>6:42</time>
            </div>
          </div>

          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>Private rooms for shared moments</p>
            <h1>Make the moment<br />live <em>longer.</em></h1>
            <p className={styles.heroLead}>A temporary place to talk, pin photos, and keep the plan moving—then preserve it when the moment is over.</p>
            <div className={styles.heroButtons}>
              <button className={styles.primaryButton} onClick={onCreate}>Create a room <Icon name="arrow" /></button>
              <button className={styles.secondaryButton} onClick={onRooms}>Join with a link</button>
            </div>
          </div>

          <div className={styles.scrollCue}><span />Scroll to explore</div>
        </section>

        <section className={styles.features}>
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>One room, three spaces</p>
            <h2>Everything the moment needs.<br /><em>Nothing it doesn&apos;t.</em></h2>
          </div>
          <div className={styles.featureGrid}>
            <article className={styles.featureCard}>
              <div className={styles.featureTop}><span>01</span><Icon name="chat" size={23} /></div>
              <h3>Chat</h3><p>Keep every decision together, without letting photos disappear into the conversation.</p>
              <div className={styles.chatPreview}><span className={styles.miniAvatar}>M</span><div><strong>Maya</strong><p>See you by the entrance.</p></div><time>6:42</time></div>
            </article>
            <article className={`${styles.featureCard} ${styles.featureCardBoard}`}>
              <div className={styles.featureTop}><span>02</span><Icon name="board" size={23} /></div>
              <h3>Board</h3><p>Pin the photos worth keeping. Arrange them freely, or revisit them in order.</p>
              <div className={styles.miniBoard}><PinnedPhoto variant="two" /><PinnedPhoto variant="four" /><span className={styles.tinyNote}>That light.</span></div>
            </article>
            <article className={styles.featureCard}>
              <div className={styles.featureTop}><span>03</span><Icon name="calendar" size={23} /></div>
              <h3>Itinerary</h3><p>Give the event a shape. Everyone knows what&apos;s next, who&apos;s leading, and where to go.</p>
              <div className={styles.itineraryPreview}><time>7:00</time><div><strong>Meet by the river</strong><span>In 28 minutes · Maya</span></div><Icon name="chevron" /></div>
            </article>
          </div>
        </section>
      </main>

      <footer className={styles.footer}><Wordmark /><span>Private by default. Temporary by design.</span><nav><button>Privacy</button><button>Terms</button></nav></footer>
    </div>
  );
}

function RoomCard({ room, grid, onOpen }: { room: (typeof roomCards)[number]; grid: boolean; onOpen: () => void }) {
  return (
    <article className={`${styles.roomCard} ${grid ? styles.roomCardGrid : ""}`} onClick={onOpen}>
      <button className={styles.favoriteButton} aria-label={`Favorite ${room.title}`} onClick={(event) => event.stopPropagation()}><Icon name="heart" size={17} /></button>
      <div className={`${styles.roomBoardPreview} ${styles[`board${room.variant}`]}`}>
        <PinnedPhoto variant={room.variant === "three" ? "three" : room.variant} />
        <PinnedPhoto variant={room.variant === "one" ? "four" : "one"} />
        <span className={styles.boardNote}>{room.variant === "one" ? "after the rain" : room.variant === "two" ? "stay a little longer" : "one very long table"}</span>
        <span className={styles.boardLine} />
      </div>
      <div className={styles.roomCardInfo}>
        <div><h3>{room.title}</h3><p><span className={room.active ? styles.liveDot : styles.archiveDot} />{room.meta}</p></div>
        <button aria-label={`Open ${room.title}`}><Icon name="arrow" /></button>
      </div>
    </article>
  );
}

function RoomsView({ onOpenRoom }: { onOpenRoom: () => void }) {
  const [grid, setGrid] = useState(false);
  const [archived, setArchived] = useState(false);

  const visibleRooms = roomCards.filter((room) => room.active !== archived);

  return (
    <div className={styles.roomsView}>
      <header className={styles.appHeader}><Wordmark /><div className={styles.headerActions}><button className={styles.roundButton} aria-label="Create a room"><Icon name="plus" /></button><button className={styles.roundButton} aria-label="Search rooms"><Icon name="search" /></button><button className={styles.avatarButton}>AM</button></div></header>
      <main className={styles.roomsMain}>
        <div className={styles.roomsControls}>
          <div className={styles.segmentedControl}><button className={!archived ? styles.isActive : ""} onClick={() => setArchived(false)}>Active <span>1</span></button><button className={archived ? styles.isActive : ""} onClick={() => setArchived(true)}>Archived <span>2</span></button></div>
          <div className={styles.viewControl}><button className={!grid ? styles.isActive : ""} onClick={() => setGrid(false)} aria-label="Magazine view"><Icon name="list" /></button><button className={grid ? styles.isActive : ""} onClick={() => setGrid(true)} aria-label="Grid view"><Icon name="grid" /></button></div>
        </div>
        <section className={`${styles.roomCards} ${grid ? styles.roomCardsGrid : ""}`}>
          {visibleRooms.map((room) => <RoomCard key={room.title} room={room} grid={grid} onOpen={onOpenRoom} />)}
        </section>
        {!grid && <div className={styles.carouselHint}><span>{archived ? "01" : "01"}</span><div><i /><i /></div><span>0{visibleRooms.length}</span></div>}
      </main>
      <button className={styles.mobileCreate}><Icon name="plus" /><span>Create</span></button>
    </div>
  );
}

function ChatPanel() {
  return (
    <div className={styles.chatPanel}>
      <div className={styles.chatScroll}>
        <button className={styles.pinnedMessage}><span><Icon name="chat" size={15} />Pinned</span><strong>Bring something warm for later.</strong><Icon name="chevron" size={16} /></button>
        <div className={styles.messageDate}>Today · 6:18 PM</div>
        <div className={styles.systemMessage}>Maya changed the room name to “After the rain”</div>
        <div className={styles.messageGroup}>
          <span className={`${styles.messageAvatar} ${styles.avatarWarm}`}>M</span>
          <div><p className={styles.messageAuthor}>Maya <time>6:42 PM</time></p><div className={styles.messageBubble}>The light is unreal right now.</div><div className={styles.messageBubble}>Meet by the lower entrance?</div><span className={styles.reaction}>♡ 3</span></div>
        </div>
        <div className={`${styles.messageGroup} ${styles.ownMessage}`}>
          <span className={styles.messageAvatar}>A</span>
          <div><p className={styles.messageAuthor}>You <time>6:43 PM</time></p><div className={styles.messageBubble}>Yes. I&apos;ll bring the speaker.</div></div>
        </div>
        <div className={styles.voteCard}>
          <div className={styles.voteHeader}><span>Community vote</span><time>12m left</time></div>
          <h3>Move dinner to 8:30?</h3>
          <button><span>Yes, take it slow</span><b>4</b></button>
          <button><span>Keep it at 8:00</span><b>2</b></button>
          <p>4 of 7 members have voted</p>
        </div>
      </div>
      <div className={styles.messageComposer}><button aria-label="Voice message"><Icon name="voice" /></button><div><span>Message everyone...</span></div><button className={styles.sendButton} aria-label="Send"><Icon name="send" size={17} /></button></div>
    </div>
  );
}

function BoardPanel() {
  return (
    <div className={styles.boardPanel}>
      <div className={styles.boardMode}><button className={styles.isActive}>Board</button><button>Sequence</button></div>
      <div className={styles.boardCanvas}>
        <PinnedPhoto variant="one" className={styles.canvasPhotoOne} note="the air after the rain" />
        <PinnedPhoto variant="two" className={styles.canvasPhotoTwo} />
        <PinnedPhoto variant="three" className={styles.canvasPhotoThree} note="7:16 pm" />
        <PinnedPhoto variant="four" className={styles.canvasPhotoFour} />
        <span className={styles.canvasNote}>Don&apos;t rush<br />this part.</span>
        <span className={styles.canvasCaption}>after the rain</span>
      </div>
      <div className={styles.boardActions}><button><Icon name="home" /></button><button className={styles.boardAdd}><Icon name="plus" /></button></div>
    </div>
  );
}

function ItineraryPanel() {
  return (
    <div className={styles.itineraryPanel}>
      <div className={styles.itineraryHeading}><div><p className={styles.eyebrow}>Today · July 14</p><h2>Keep the night <em>moving.</em></h2></div><button><Icon name="plus" />Propose a plan</button></div>
      <div className={styles.timeline}>
        <article className={styles.timelineCard}>
          <time>7:00<small>PM</small></time><span className={`${styles.timelineDot} ${styles.nowDot}`} />
          <div><span className={styles.timelineStatus}>In progress</span><h3>Meet by the lower entrance</h3><p>Riverside Walk · Open in Maps ↗</p><div className={styles.responsible}><span className={styles.avatarWarm}>M</span><strong>Maya is leading</strong><span>6 / 7 going</span></div></div>
        </article>
        <article className={styles.timelineCard}>
          <time>8:00<small>PM</small></time><span className={styles.timelineDot} />
          <div><span className={styles.timelineStatus}>Not started</span><h3>Dinner, wherever we land</h3><p>Place to be decided together</p><div className={styles.responsible}><span>J</span><strong>Jon is leading</strong><span>5 / 7 going</span></div></div>
        </article>
        <article className={styles.timelineCard}>
          <time>10:30<small>PM</small></time><span className={styles.timelineDot} />
          <div><span className={styles.timelineStatus}>Not started</span><h3>One last walk</h3><p>No fixed location</p><div className={styles.responsible}><span>A</span><strong>You are leading</strong><span>4 / 7 going</span></div></div>
        </article>
      </div>
    </div>
  );
}

function RoomView() {
  const [tab, setTab] = useState<RoomTab>("chat");
  const [pagePickerOpen, setPagePickerOpen] = useState(false);
  const dragStartX = useRef<number | null>(null);
  const dragStartY = useRef<number | null>(null);
  const dragStartedAt = useRef(0);
  const dragOffsetRef = useRef(0);
  const trackRef = useRef<HTMLDivElement | null>(null);
  const frameRef = useRef<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const tabs: RoomTab[] = ["chat", "board", "itinerary"];
  const tabIndex = tabs.indexOf(tab);
  const currentIcon: IconName = tab === "itinerary" ? "calendar" : tab;

  function moveTab(direction: -1 | 1, fromIndex = tabIndex) {
    const nextIndex = Math.min(Math.max(fromIndex + direction, 0), tabs.length - 1);
    setTab(tabs[nextIndex]);
  }

  function finishDrag(cancelled = false) {
    if (dragStartX.current === null) return;
    const elapsed = performance.now() - dragStartedAt.current;
    const finalOffset = dragOffsetRef.current;
    const quickFlick = elapsed < 280 && Math.abs(finalOffset) > 28;
    const committed = Math.abs(finalOffset) > 72 || quickFlick;

    if (!cancelled && committed) moveTab(finalOffset < 0 ? 1 : -1);

    dragStartX.current = null;
    dragStartY.current = null;
    dragOffsetRef.current = 0;
    setDragging(false);
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = requestAnimationFrame(() => {
      const finalIndex = !cancelled && committed
        ? Math.min(Math.max(tabIndex + (finalOffset < 0 ? 1 : -1), 0), tabs.length - 1)
        : tabIndex;
      if (trackRef.current) trackRef.current.style.transform = `translate3d(${-finalIndex * 100}%, 0, 0)`;
      frameRef.current = null;
    });
  }

  return (
    <div className={styles.roomView}>
      <header className={styles.roomHeader}>
        <div className={styles.roomHeaderLeft}>
          <div className={styles.pageSelector}>
            <button className={styles.currentPageButton} onClick={() => setPagePickerOpen(!pagePickerOpen)} aria-label={`Current page: ${tab}`}><Icon name={currentIcon} /></button>
            {pagePickerOpen && <div className={styles.pagePicker}>{tabs.filter((item) => item !== tab).map((item) => <button key={item} onClick={() => { setTab(item); setPagePickerOpen(false); }} aria-label={`Open ${item}`}><Icon name={item === "itinerary" ? "calendar" : item} /></button>)}</div>}
          </div>
        </div>
        <div className={styles.roomIdentity}><h1>After the rain</h1><p><span />2h 41m left · Community-led</p></div>
        <div className={styles.roomHeaderActions}><button><Icon name="share" /><span>Share</span></button><button><Icon name="members" /><span>Members</span></button><button><Icon name="more" /></button></div>
      </header>
      <div className={styles.roomBody}>
        <main
          className={`${styles.roomContent} ${dragging ? styles.isDragging : ""}`}
          onPointerDown={(event) => {
            if (event.pointerType === "mouse" && event.button !== 0) return;
            if ((event.target as HTMLElement).closest("button, input, textarea, a, [data-no-swipe]")) return;
            dragStartX.current = event.clientX;
            dragStartY.current = event.clientY;
            dragStartedAt.current = performance.now();
          }}
          onPointerMove={(event) => {
            if (dragStartX.current === null || dragStartY.current === null) return;
            const deltaX = event.clientX - dragStartX.current;
            const deltaY = event.clientY - dragStartY.current;
            if (!dragging && Math.abs(deltaX) < 7) return;
            if (!dragging && Math.abs(deltaY) > Math.abs(deltaX)) {
              dragStartX.current = null;
              dragStartY.current = null;
              return;
            }
            if (!dragging) {
              setDragging(true);
              event.currentTarget.setPointerCapture(event.pointerId);
            }
            const atBoundary = (tabIndex === 0 && deltaX > 0) || (tabIndex === tabs.length - 1 && deltaX < 0);
            const nextOffset = atBoundary ? deltaX * 0.28 : deltaX;
            dragOffsetRef.current = nextOffset;
            if (frameRef.current === null) {
              frameRef.current = requestAnimationFrame(() => {
                if (trackRef.current) trackRef.current.style.transform = `translate3d(calc(${-tabIndex * 100}% + ${dragOffsetRef.current}px), 0, 0)`;
                frameRef.current = null;
              });
            }
          }}
          onPointerUp={() => finishDrag()}
          onPointerCancel={() => finishDrag(true)}
        >
          <div ref={trackRef} className={styles.roomTrack} style={{ transform: `translate3d(${-tabIndex * 100}%, 0, 0)` }}>
            <section className={styles.roomPage}><ChatPanel /></section>
            <section className={styles.roomPage}><BoardPanel /></section>
            <section className={styles.roomPage}><ItineraryPanel /></section>
          </div>
        </main>
        <aside className={styles.roomSidebar}>
          <section><p className={styles.sidebarLabel}>About</p><p>Rain stopped. Nobody wanted to go home yet.</p></section>
          <section><p className={styles.sidebarLabel}>Time left</p><strong className={styles.bigTime}>02:41:18</strong><span>Ends at 10:30 PM</span></section>
          <section><p className={styles.sidebarLabel}>People · 7</p><div className={styles.avatarStack}><span>M</span><span>J</span><span>A</span><span>R</span><span>+3</span></div></section>
          <section><p className={styles.sidebarLabel}>Next</p><div className={styles.nextPlan}><time>8:00</time><div><strong>Dinner</strong><span>Place to be decided</span></div><Icon name="chevron" /></div></section>
        </aside>
      </div>
    </div>
  );
}

export function Prototype() {
  const [view, setView] = useState<View>("landing");
  const systemDark = useSyncExternalStore(subscribeToSystemTheme, getSystemTheme, getServerTheme);
  const [themeOverride, setThemeOverride] = useState<boolean | null>(null);
  const dark = themeOverride ?? systemDark;
  const [showInstall, setShowInstall] = useState(true);

  return (
    <div className={`${styles.prototype} ${dark ? styles.dark : ""}`}>
      <PrototypeBar view={view} setView={setView} dark={dark} setDark={setThemeOverride} />
      <div className={styles.viewport}>
        {view === "landing" ? <LandingView onCreate={() => setView("rooms")} onRooms={() => setView("rooms")} /> : view === "rooms" ? <RoomsView onOpenRoom={() => setView("room")} /> : <RoomView />}
      </div>
      {showInstall && <aside className={styles.installPrompt}><div className={styles.installMark}>E</div><div><strong>Keep EventSpace close</strong><span>Add it to your home screen.</span></div><button>Add</button><button className={styles.installClose} onClick={() => setShowInstall(false)} aria-label="Dismiss"><Icon name="close" size={15} /></button></aside>}
    </div>
  );
}
