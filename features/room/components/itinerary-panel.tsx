"use client";

import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import type { ItineraryItem, PersonSummary, RoomMode } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockPoll } from "@/features/mock-session/model/mock-session";
import styles from "./room-experience.module.css";

const statusLabels = { "not-started": "Not started", "in-progress": "In progress", completed: "Completed" } as const;
const nextStatus = { "not-started": "in-progress", "in-progress": "completed", completed: "not-started" } as const;

function getTime(value: string, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", hour12: true, timeZone }).formatToParts(new Date(value));
  return { time: `${parts.find((part) => part.type === "hour")?.value}:${parts.find((part) => part.type === "minute")?.value}`, period: parts.find((part) => part.type === "dayPeriod")?.value ?? "" };
}
function getSafeMapsUrl(value: string | null) {
  if (!value) return null;
  try { const url = new URL(value); return url.protocol === "https:" && (url.hostname === "maps.google.com" || url.hostname.endsWith(".google.com") || url.hostname === "maps.apple.com") ? url.toString() : null; }
  catch { return null; }
}

export function ItineraryPanel({ roomPublicId, items, timeZone, canCreate, canVote, mode, memberCount, members }: { readonly roomPublicId: RoomPublicId; readonly items: readonly ItineraryItem[]; readonly timeZone: string; readonly canCreate: boolean; readonly canVote: boolean; readonly mode: RoomMode; readonly memberCount: number; readonly members: readonly PersonSummary[] }) {
  const { session, dispatch } = useMockSession();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [responsibleId, setResponsibleId] = useState<string>(session.viewer.actorId);
  const [capacity, setCapacity] = useState(memberCount);
  const viewer = members.find((member) => member.actorId === session.viewer.actorId) ?? members[0];
  const responsible = members.find((member) => member.actorId === responsibleId) ?? viewer;
  const room = session.rooms.find((item) => item.publicId === roomPublicId);
  const base = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!title.trim() || !startsAt || !viewer || !responsible) return;
    const submittedAt = new Date().toISOString();
    const submittedAtMs = Date.parse(submittedAt);
    const item: ItineraryItem = { id: `itinerary_${createUuid()}`, title: title.trim().slice(0,80), description: "Created in this local room.", startsAt: new Date(startsAt).toISOString(), locationLabel: location.trim() || null, mapsUrl: null, responsible, status: "not-started", capacity: Math.min(Math.max(capacity, 1), memberCount), goingCount: responsible.actorId === viewer.actorId ? 1 : 0, viewerAttendance: responsible.actorId === viewer.actorId ? "going" : null };
    if (mode === "community-led") {
      const closeMs = Math.min(submittedAtMs + 30 * 60_000, Date.parse(room?.endsAt ?? new Date(submittedAtMs + 30 * 60_000).toISOString()));
      const poll: MockPoll = { id: `poll_${createUuid()}`, question: `Add “${title.trim()}” to the itinerary?`, closesAt: new Date(closeMs).toISOString(), memberSnapshot: memberCount, requiredVotes: Math.floor(memberCount / 2) + 1, visibility: "public", choices: [{ id: "yes", label: "Add this plan", votes: 0 }, { id: "no", label: "Not this time", votes: 0 }], voterActorIds: [], resolvedChoiceId: null, proposal: { kind: "itinerary", item } };
      dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", ...base(), poll } });
    } else {
      dispatch({ type: "COMMAND", command: { type: "ADD_ITINERARY", ...base(), item } });
    }
    setTitle(""); setLocation(""); setStartsAt(""); setResponsibleId(session.viewer.actorId); setCapacity(memberCount); setOpen(false);
  }

  return <div className={styles.itineraryPanel}><header className={styles.itineraryHeading}><div><p>Today · {timeZone.replaceAll("_", " ")}</p><h2>Itinerary</h2></div>{canCreate || mode === "community-led" && canVote ? <button type="button" onClick={() => setOpen(true)}><Icon name="plus" />{mode === "community-led" ? "Propose" : "Add a plan"}</button> : null}</header>{items.length ? <div className={styles.timeline}>{items.map((item) => { const clock = getTime(item.startsAt, timeZone); const mapsUrl = getSafeMapsUrl(item.mapsUrl); const canLead = item.responsible.actorId === session.viewer.actorId || canCreate; return <article key={item.id}><time>{clock.time}<small>{clock.period}</small></time><i className={item.status === "in-progress" ? styles.now : ""} /><div><button type="button" className={styles.status} disabled={!canLead} onClick={() => dispatch({ type: "COMMAND", command: { type: "SET_ITINERARY_STATUS", ...base(), itemId: item.id, status: nextStatus[item.status] } })}>{statusLabels[item.status]}{canLead ? " · Change" : ""}</button><h3>{item.title}</h3><p>{item.locationLabel ?? "No fixed location"}{mapsUrl ? <> · <a href={mapsUrl} target="_blank" rel="noreferrer">Open in Maps</a></> : null}</p><div className={styles.responsible}><b>{item.responsible.initials}</b><strong>{item.responsible.displayName} is leading</strong><span>{item.goingCount} / {item.capacity} going</span></div><div className={styles.attendance}>{(["going","not-going","checked-in"] as const).map((attendance) => <button type="button" key={attendance} className={item.viewerAttendance === attendance ? styles.attendanceActive : ""} disabled={attendance !== "not-going" && item.goingCount >= item.capacity && item.viewerAttendance === "not-going"} onClick={() => dispatch({ type: "COMMAND", command: { type: "SET_ATTENDANCE", ...base(), itemId: item.id, attendance } })}>{attendance === "going" ? "Going" : attendance === "not-going" ? "Not going" : "Checked in"}</button>)}</div></div></article>; })}</div> : <div className={styles.panelEmpty}><p>No plans yet. Start with one clear next step.</p></div>}{open ? <form className={styles.planComposer} onSubmit={submit}><header><div><p>{mode === "community-led" ? "Community proposal" : "New itinerary item"}</p><strong>{mode === "community-led" ? "Put a plan to a vote." : "Add the next step."}</strong></div><button type="button" onClick={() => setOpen(false)}><Icon name="close" /></button></header><label>Plan name<input autoFocus value={title} onChange={(event) => setTitle(event.target.value.slice(0,80))} placeholder="Dinner, wherever we land" /></label><label>Start time<input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} max={room?.endsAt?.slice(0,16)} /></label><label>Location · Optional<input value={location} onChange={(event) => setLocation(event.target.value.slice(0,120))} placeholder="Riverside Walk" /></label><label>Responsible<select value={responsibleId} onChange={(event) => setResponsibleId(event.target.value)}>{members.map((member) => <option value={member.actorId} key={member.actorId}>{member.displayName}{member.isGuest ? " · guest" : ""}</option>)}</select></label><label>Capacity<input type="number" min={1} max={memberCount} value={capacity} onChange={(event) => setCapacity(Math.min(memberCount, Math.max(1, Number(event.target.value))))} /></label><button type="submit" className={styles.planSubmit} disabled={!title.trim() || !startsAt || Date.parse(startsAt) > Date.parse(room?.endsAt ?? startsAt)}>{mode === "community-led" ? "Create vote" : "Add to itinerary"}<Icon name="arrow" /></button><p>{mode === "community-led" ? "The plan, responsible person and capacity take effect only after a majority vote. This local build does not call a map API." : `Choose any current member, including a guest, to lead.`}</p></form> : null}</div>;
}
