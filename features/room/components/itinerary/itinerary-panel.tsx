"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import type { ItineraryItem, PersonSummary } from "@/core/domain/room";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { getItinerarySummary } from "../../model/itinerary";
import { ItineraryComposer } from "./itinerary-composer";
import { ItineraryTimeline } from "./itinerary-timeline";
import styles from "./itinerary.module.css";

export function ItineraryPanel({ roomPublicId, items, timeZone, canCreate, canModerate, members }: { readonly roomPublicId: RoomPublicId; readonly items: readonly ItineraryItem[]; readonly timeZone: string; readonly canCreate: boolean; readonly canModerate: boolean; readonly members: readonly PersonSummary[] }) {
  const { session, dispatch } = useMockSession();
  const [now, setNow] = useState(() => Date.now());
  const [editor, setEditor] = useState<ItineraryItem | "new" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const room = session.rooms.find((item) => item.publicId === roomPublicId);
  const summary = getItinerarySummary(items, now);
  const base = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (didInitialScroll.current || !items.length) return;
    didInitialScroll.current = true;
    const frame = window.requestAnimationFrame(() => scrollRef.current?.querySelector<HTMLElement>("[data-itinerary-target='true']")?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" }));
    return () => window.cancelAnimationFrame(frame);
  }, [items.length]);

  function save(item: ItineraryItem) {
    dispatch({ type: "COMMAND", command: editor === "new" ? { type: "ADD_ITINERARY", ...base(), item } : { type: "UPDATE_ITINERARY", ...base(), item } });
    setEditor(null);
  }

  return <div className={styles.panel} ref={scrollRef}>
    <header className={styles.panelHeader}><div><span>{summary.label}</span><strong>{summary.detail}</strong></div>{canCreate ? <button type="button" onClick={() => setEditor("new")} aria-label="Add a plan"><Icon name="plus" /></button> : null}</header>
    {items.length ? <ItineraryTimeline items={items} now={now} timeZone={timeZone} viewerActorId={session.viewer.actorId} canModerate={canModerate} onEdit={setEditor} onEnd={(itemId) => dispatch({ type: "COMMAND", command: { type: "END_ITINERARY", ...base(), itemId } })} /> : <div className={styles.empty}><Icon name="calendar" size={26} /><strong>Give the day a shape.</strong><p>Start with one clear place and time.</p>{canCreate ? <button type="button" onClick={() => setEditor("new")}><Icon name="plus" size={16} />Add the first plan</button> : null}</div>}
    {editor ? <ItineraryComposer key={editor === "new" ? "new" : editor.id} item={editor === "new" ? null : editor} items={items} members={members} viewerActorId={session.viewer.actorId} roomEndsAt={room?.endsAt ?? null} onClose={() => setEditor(null)} onSave={save} onDelete={(itemId) => { dispatch({ type: "COMMAND", command: { type: "DELETE_ITINERARY", ...base(), itemId } }); setEditor(null); }} /> : null}
  </div>;
}
