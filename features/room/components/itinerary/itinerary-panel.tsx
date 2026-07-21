"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import type { ItineraryItem, PersonSummary, RoomMode } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockPoll } from "@/features/mock-session/model/mock-session";
import { getItinerarySummary } from "../../model/itinerary";
import { ItineraryComposer } from "./itinerary-composer";
import { ItineraryTimeline } from "./itinerary-timeline";
import styles from "./itinerary.module.css";

export function ItineraryPanel({ roomPublicId, items, timeZone, canCreate, canVote, canModerate, mode, members }: { readonly roomPublicId: RoomPublicId; readonly items: readonly ItineraryItem[]; readonly timeZone: string; readonly canCreate: boolean; readonly canVote: boolean; readonly canModerate: boolean; readonly mode: RoomMode; readonly members: readonly PersonSummary[] }) {
  const { session, dispatch } = useMockSession();
  const [now, setNow] = useState(() => Date.now());
  const [editor, setEditor] = useState<ItineraryItem | "new" | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const didInitialScroll = useRef(false);
  const room = session.rooms.find((item) => item.publicId === roomPublicId);
  const summary = getItinerarySummary(items, now);
  const canAdd = canCreate || mode === "community-led" && canVote;
  const base = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (didInitialScroll.current || !items.length) return;
    didInitialScroll.current = true;
    const frame = window.requestAnimationFrame(() => {
      const target = scrollRef.current?.querySelector<HTMLElement>("[data-itinerary-target='true']");
      target?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [items.length]);

  function save(item: ItineraryItem) {
    if (editor !== "new") {
      dispatch({ type: "COMMAND", command: { type: "UPDATE_ITINERARY", ...base(), item } });
    } else if (mode === "community-led") {
      const submittedAt = Date.now();
      const closesAt = new Date(Math.min(submittedAt + 30 * 60_000, Date.parse(room?.endsAt ?? new Date(submittedAt + 30 * 60_000).toISOString()))).toISOString();
      const poll: MockPoll = { id: `poll_${createUuid()}`, question: `Add “${item.title}” to the itinerary?`, closesAt, memberSnapshot: room?.memberCount ?? members.length, requiredVotes: Math.floor((room?.memberCount ?? members.length) / 2) + 1, visibility: "public", choices: [{ id: "yes", label: "Add this plan", votes: 0 }, { id: "no", label: "Not this time", votes: 0 }], voterActorIds: [], resolvedChoiceId: null, proposal: { kind: "itinerary", item } };
      dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", ...base(), poll } });
    } else {
      dispatch({ type: "COMMAND", command: { type: "ADD_ITINERARY", ...base(), item } });
    }
    setEditor(null);
  }

  function remove(itemId: string) {
    dispatch({ type: "COMMAND", command: { type: "DELETE_ITINERARY", ...base(), itemId } });
    setEditor(null);
  }

  function end(itemId: string) {
    dispatch({ type: "COMMAND", command: { type: "END_ITINERARY", ...base(), itemId } });
  }

  return (
    <div className={styles.panel} ref={scrollRef}>
      <header className={styles.panelHeader}>
        <div><span>{summary.label}</span><strong>{summary.detail}</strong></div>
        {canAdd ? <button type="button" onClick={() => setEditor("new")} aria-label={mode === "community-led" ? "Propose a plan" : "Add a plan"}><Icon name="plus" /></button> : null}
      </header>
      {items.length ? <ItineraryTimeline items={items} now={now} timeZone={timeZone} viewerActorId={session.viewer.actorId} canModerate={canModerate} onEdit={setEditor} onEnd={end} /> : <div className={styles.empty}><Icon name="calendar" size={26} /><strong>Give the day a shape.</strong><p>Start with one clear place and time.</p>{canAdd ? <button type="button" onClick={() => setEditor("new")}><Icon name="plus" size={16} />{mode === "community-led" ? "Propose a plan" : "Add the first plan"}</button> : null}</div>}
      {editor ? <ItineraryComposer key={editor === "new" ? "new" : editor.id} item={editor === "new" ? null : editor} items={items} members={members} viewerActorId={session.viewer.actorId} roomEndsAt={room?.endsAt ?? null} communityProposal={mode === "community-led"} onClose={() => setEditor(null)} onSave={save} onDelete={remove} /> : null}
    </div>
  );
}
