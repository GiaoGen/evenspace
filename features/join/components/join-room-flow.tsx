"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import { actorId, type RoomPublicId } from "@/core/domain/ids";
import { createCompactId, createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import styles from "./join-room-flow.module.css";

const initialsFor = (name: string) => name.trim().split(/\s+/).slice(0,2).map((part) => part[0]?.toLocaleUpperCase() ?? "").join("");

export function JoinRoomFlow({ publicId, inviteRevision }: { readonly publicId: RoomPublicId; readonly inviteRevision: number }) {
  const { session, dispatch } = useMockSession();
  const router = useRouter();
  const room = session.rooms.find((item) => item.publicId === publicId);
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [submittedActorId, setSubmittedActorId] = useState<ReturnType<typeof actorId> | null>(null);
  const [avatarStyle, setAvatarStyle] = useState<"initials" | "single" | "ring">("initials");
  const [error, setError] = useState("");
  const initials = useMemo(() => initialsFor(name) || "?", [name]);
  const avatarInitials = avatarStyle === "single" ? initials.slice(0, 1) : avatarStyle === "ring" ? `○${initials.slice(0, 1)}` : initials;
  if (!room || room.lifecycle !== "active" || room.inviteRevision !== inviteRevision) return <main className={styles.unavailable}><Wordmark /><p>Invitation unavailable</p><h1>This private link is no longer active.</h1><span>The Host may have replaced it, or the room may have ended.</span><Link href="/">Return home</Link></main>;
  const activeRoom = room;
  const end = room.endsAt ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: room.timeZone }).format(new Date(room.endsAt)) : "soon";
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = name.trim();
    if (!clean) { setError("Choose a name people will recognize."); return; }
    if (activeRoom.members.some((member) => member.displayName.toLocaleLowerCase() === clean.toLocaleLowerCase()) || activeRoom.joinRequests.some((request) => request.state === "pending" && request.displayName.toLocaleLowerCase() === clean.toLocaleLowerCase())) { setError("That name is already used in this room."); return; }
    const request = { id: `request_${createUuid()}`, actorId: actorId(`actor_${createCompactId(12)}`), displayName: clean.slice(0,60), initials: avatarInitials.slice(0,3), note: note.trim().slice(0,240), requestedAt: new Date().toISOString(), state: "pending" as const };
    dispatch({ type: "COMMAND", command: { type: "REQUEST_JOIN", roomPublicId: activeRoom.publicId, request, inviteRevision } });
    if (!activeRoom.requiresApproval) {
      dispatch({ type: "COMMAND", command: { type: "ASSUME_JOIN_IDENTITY", roomPublicId: activeRoom.publicId, actorId: request.actorId } });
      router.push(`/rooms/${activeRoom.publicId}`);
      return;
    }
    setSubmittedActorId(request.actorId); setError("");
  }
  function approveAndEnter() {
    if (!submittedActorId) return;
    const request = activeRoom.joinRequests.find((item) => item.actorId === submittedActorId);
    if (!request) return;
    const nowIso = new Date().toISOString();
    if (activeRoom.mode === "community-led") dispatch({ type: "COMMAND", command: { type: "COMPLETE_COMMUNITY_JOIN_DEMO", requestId: request.id, roomPublicId: activeRoom.publicId, actorId: session.viewer.actorId, nowIso } });
    else dispatch({ type: "COMMAND", command: { type: "REVIEW_JOIN", decision: "approved", requestId: request.id, roomPublicId: activeRoom.publicId, actorId: session.viewer.actorId, nowIso } });
    dispatch({ type: "COMMAND", command: { type: "ASSUME_JOIN_IDENTITY", roomPublicId: activeRoom.publicId, actorId: submittedActorId } });
    router.push(`/rooms/${activeRoom.publicId}`);
  }
  if (submittedActorId) return <div className={styles.page}><header><Wordmark /><span>Local request</span></header><main className={styles.waiting}><div className={styles.pulse}><b>{avatarInitials}</b><i /><i /></div><p>Request sent</p><h1>Someone inside<br /><em>will let you in.</em></h1><span>{room.mode === "community-led" ? "This local build can simulate the required majority, then hand the browser state to the invited guest." : "The Host or an admin can approve this request from Members. The action below completes both sides in local data."}</span><div><strong>{room.name}</strong><small>Private room · Ends {end}</small></div><button type="button" onClick={approveAndEnter}>{room.mode === "community-led" ? "Simulate majority & enter" : "Approve & enter as guest"} <Icon name="arrow" /></button><Link href={`/rooms/${room.publicId}`}>Review in the current room</Link><button type="button" onClick={() => setSubmittedActorId(null)}>Edit this request</button></main></div>;
  return <div className={styles.page}><header><Wordmark /><Link href="/account">Log in</Link></header><main className={styles.layout}><section className={styles.invite}><div className={styles.inviteMeta}><span>Private invitation</span><time>Ends {end}</time></div><div className={styles.art}><PinnedPhoto variant={room.boardPreview[0] ?? "one"} className={styles.photoOne} /><PinnedPhoto variant={room.boardPreview[1] ?? "three"} className={styles.photoTwo} /><span>{room.boardNote}</span></div><p>You&apos;re invited to</p><h1>{room.name}</h1><div className={styles.description}>{room.description}</div><footer><span>Up to {room.memberLimit} people</span><span>{room.requiresApproval ? "Approval required" : "Private room"}</span></footer></section><form className={styles.form} onSubmit={submit} noValidate><p>Step inside</p><h2>How should everyone<br /><em>know you?</em></h2><label>Name <span>{name.length} / 60</span></label><input autoFocus value={name} onChange={(event) => setName(event.target.value.slice(0,60))} placeholder="Avery Morgan" /><label>Avatar</label><div className={styles.avatarRow}><b>{avatarInitials}</b><button type="button" aria-pressed={avatarStyle === "initials"} onClick={() => setAvatarStyle("initials")}>{initials}</button><button type="button" aria-pressed={avatarStyle === "single"} onClick={() => setAvatarStyle("single")}>{initials.slice(0,1)}</button><button type="button" aria-pressed={avatarStyle === "ring"} onClick={() => setAvatarStyle("ring")}>○</button></div><label>Note for the room <span>Optional</span></label><textarea value={note} onChange={(event) => setNote(event.target.value.slice(0,240))} placeholder="Who invited you, or what should they know?" rows={3} />{error ? <span className={styles.error}>{error}</span> : null}<button type="submit" className={styles.join}>{room.requiresApproval ? "Request to join" : "Enter room"} <Icon name="arrow" /></button><small>Your name, avatar and note are visible only inside this local room.</small></form></main></div>;
}
