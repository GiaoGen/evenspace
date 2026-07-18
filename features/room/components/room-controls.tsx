"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { createCompactId, createUuid } from "@/core/domain/uuid";
import type { RoomCapabilities } from "@/core/domain/room";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockRoom } from "@/features/mock-session/model/mock-session";
import styles from "./room-controls.module.css";
import reportStyles from "./room-report.module.css";
import shortcutStyles from "./room-control-shortcuts.module.css";
import { usePollClock } from "@/features/room/model/use-poll-clock";

export type RoomControl = "share" | "members" | "more";

interface ControlProps {
  readonly room: MockRoom;
  readonly capabilities: RoomCapabilities;
  readonly close: () => void;
}

function Sheet({ title, eyebrow, close, children }: { readonly title: string; readonly eyebrow: string; readonly close: () => void; readonly children: ReactNode }) {
  return (
    <div className={styles.backdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) close(); }}>
      <aside className={styles.sheet} role="dialog" aria-modal="true" aria-label={title}>
        <header><div><p>{eyebrow}</p><h2>{title}</h2></div><button type="button" onClick={close} aria-label="Close"><Icon name="close" /></button></header>
        {children}
      </aside>
    </div>
  );
}

function QrMark() {
  const cells = [0,1,2,3,4,5,6,8,10,12,14,16,18,20,22,24,25,26,28,30,31,32,34,36,38,40,42,44,46,48,49,50,51,52,53,54,56,58,60,62,64,66,68,70,72,74,76,78,80];
  return <svg className={styles.qr} viewBox="0 0 9 9" aria-label="Local room QR code">{cells.map((cell) => <rect key={cell} x={cell % 9} y={Math.floor(cell / 9)} width="1" height="1" />)}</svg>;
}

function ShareControl({ room, close }: Pick<ControlProps, "room" | "close">) {
  const { session, dispatch } = useMockSession();
  const [feedback, setFeedback] = useState("Ready to share");
  const invitation = `/join/${room.publicId}?revision=${room.inviteRevision}`;

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`${label} copied`); }
    catch { setFeedback("Copy is unavailable in this browser"); }
  }

  return (
    <Sheet title="Bring people closer." eyebrow={room.name} close={close}>
      <div className={styles.qrCard}><QrMark /><strong>Scan to open this invitation</strong><span>The QR represents the current local private link.</span></div>
      <div className={styles.copyRows}>
        <button type="button" onClick={() => copy(`${window.location.origin}${invitation}`, "Invitation link")}><span><small>Private link</small><strong>{invitation}</strong></span><Icon name="share" /></button>
        <button type="button" onClick={() => copy(room.inviteCode, "Invite code")}><span><small>Invite code</small><strong>{room.inviteCode}</strong></span><Icon name="share" /></button>
      </div>
      <p className={styles.feedback} aria-live="polite">{feedback}</p>
      <button type="button" className={styles.secondary} disabled>Approval {room.requiresApproval ? "is required" : "is off"}</button>
      {session.viewer.actorId === room.members.find((member) => member.role === "host")?.actorId ? <button type="button" className={styles.dangerText} onClick={() => dispatch({ type: "COMMAND", command: { type: "ROTATE_INVITE", roomPublicId: room.publicId, actorId: session.viewer.actorId, inviteCode: `E${createCompactId(5).toUpperCase()}`, nowIso: new Date().toISOString() } })}>Replace link and invite code</button> : null}
      <p className={styles.mockBoundary}>This link works only with this browser&apos;s local data until a backend invitation service is connected.</p>
    </Sheet>
  );
}

type MemberAction = { readonly actorId: MockRoom["members"][number]["actorId"]; readonly kind: "mute" | "remove" | "ban" | "admin" | "vote-remove" } | null;

function MembersControl({ room, capabilities, close }: ControlProps) {
  const { session, dispatch } = useMockSession();
  const [pending, setPending] = useState<MemberAction>(null);
  const renderTime = usePollClock(room.activePoll);
  const requests = room.joinRequests.filter((request) => request.state === "pending");
  const activeMembers = room.members.filter((member) => !["removed", "banned"].includes(room.membershipStates[member.actorId] ?? "active"));
  const nowIso = () => new Date().toISOString();

  function review(requestId: string, decision: "approved" | "rejected") {
    dispatch({ type: "COMMAND", command: { type: "REVIEW_JOIN", decision, requestId, roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso: nowIso() } });
  }

  function confirmAction() {
    if (!pending) return;
    const target = room.members.find((member) => member.actorId === pending.actorId);
    if (!target) return;
    if (pending.kind === "vote-remove") {
      const createdAt = nowIso();
      const activeCount = activeMembers.length;
      dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso: createdAt, poll: { id: `poll_${createUuid()}`, question: `Remove ${target.displayName} from this room?`, closesAt: new Date(Math.min(Date.parse(createdAt) + 30 * 60_000, Date.parse(room.endsAt ?? new Date(Date.parse(createdAt) + 30 * 60_000).toISOString()))).toISOString(), memberSnapshot: activeCount, requiredVotes: Math.floor(activeCount / 2) + 1, visibility: "public", choices: [{ id: "yes", label: "Remove", votes: 0 }, { id: "no", label: "Keep them here", votes: 0 }], voterActorIds: [], resolvedChoiceId: null, proposal: { kind: "remove-member", targetActorId: target.actorId } } } });
    } else if (pending.kind === "admin") dispatch({ type: "COMMAND", command: { type: "SET_MEMBER_ROLE", roomPublicId: room.publicId, actorId: session.viewer.actorId, targetActorId: target.actorId, role: target.role === "admin" ? "member" : "admin", nowIso: nowIso() } });
    else dispatch({ type: "COMMAND", command: { type: "SET_MEMBER_STATE", roomPublicId: room.publicId, actorId: session.viewer.actorId, targetActorId: target.actorId, state: pending.kind === "mute" ? room.membershipStates[target.actorId] === "muted" ? "active" : "muted" : pending.kind === "remove" ? "removed" : "banned", nowIso: nowIso() } });
    setPending(null);
  }

  if (room.memberListVisibility === "moderators" && !capabilities.canModerate) return <Sheet title="The people inside." eyebrow="Private member list" close={close}><p className={styles.mockBoundary}>This Host-led room keeps its member list visible to the Host and admins only.</p></Sheet>;

  return (
    <Sheet title="The people inside." eyebrow={`${room.memberCount} members`} close={close}>
      {capabilities.canModerate && requests.length ? <section className={styles.requests}><div className={styles.sectionTitle}><strong>Entry requests</strong><span>{requests.length}</span></div>{requests.map((request) => <article key={request.id}><b>{request.initials}</b><div><strong>{request.displayName}</strong><p>{request.note}</p></div><span><button type="button" onClick={() => review(request.id, "rejected")} aria-label={`Reject ${request.displayName}`}><Icon name="close" size={15} /></button><button type="button" onClick={() => review(request.id, "approved")} aria-label={`Approve ${request.displayName}`}><Icon name="check" size={15} /></button></span></article>)}</section> : null}
      <section className={styles.members}>
        <div className={styles.sectionTitle}><strong>Members</strong><span>{activeMembers.length}</span></div>
        {activeMembers.map((member) => {
          const canAct = member.actorId !== session.viewer.actorId && member.role !== "host" && (capabilities.canModerate || room.mode === "community-led" && capabilities.canVote);
          const voteBlocked = Boolean(room.activePoll && !room.activePoll.resolvedChoiceId && Date.parse(room.activePoll.closesAt) > renderTime);
          return (
            <article key={member.actorId}>
              <b>{member.initials}</b>
              <div><strong>{member.displayName}{member.actorId === session.viewer.actorId ? " · You" : ""}</strong><p>{member.role} · {room.membershipStates[member.actorId] ?? "active"}{member.isGuest ? " · guest" : ""}</p></div>
              {canAct ? <button type="button" onClick={() => setPending({ actorId: member.actorId, kind: capabilities.canModerate ? "mute" : "vote-remove" })}><Icon name="more" /></button> : null}
              {pending?.actorId === member.actorId ? <div className={styles.memberActions}>
                {capabilities.canModerate ? <><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "mute" })}>{room.membershipStates[member.actorId] === "muted" ? "Unmute" : "Mute"}</button><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "admin" })}>{member.role === "admin" ? "Remove admin" : "Make admin"}</button><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "remove" })}>Remove</button><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "ban" })}>Ban</button><button type="button" disabled={voteBlocked} onClick={() => setPending({ actorId: member.actorId, kind: "vote-remove" })}>Vote on removal</button></> : <button type="button" disabled={voteBlocked} onClick={() => setPending({ actorId: member.actorId, kind: "vote-remove" })}>Put removal to a vote</button>}
                <p>Confirm “{pending.kind}” for {member.displayName}?</p>
                <button type="button" className={styles.confirm} disabled={pending.kind === "vote-remove" && voteBlocked} onClick={confirmAction}>Confirm</button>
                <button type="button" onClick={() => setPending(null)}>Cancel</button>
              </div> : null}
            </article>
          );
        })}
      </section>
    </Sheet>
  );
}

function Reports({ room }: { readonly room: MockRoom }) {
  const { session, dispatch } = useMockSession();
  const [reportText, setReportText] = useState("");
  const [replyById, setReplyById] = useState<Readonly<Record<string, string>>>({});
  const isHost = room.members.find((member) => member.actorId === session.viewer.actorId)?.role === "host";
  const visibleReports = isHost ? room.reports : room.reports.filter((report) => report.reporterActorId === session.viewer.actorId);

  function submitReport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!reportText.trim()) return;
    const nowIso = new Date().toISOString();
    dispatch({ type: "COMMAND", command: { type: "SUBMIT_REPORT", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso, report: { id: `report_${createUuid()}`, reporterActorId: session.viewer.actorId, description: reportText, createdAt: nowIso, hostReply: null } } });
    setReportText("");
  }

  return (
    <section className={reportStyles.reportBox}>
      <strong>Report a concern</strong><p>Privately describe the person, message or content location. Only the Host replies.</p>
      <form onSubmit={submitReport}><textarea value={reportText} onChange={(event) => setReportText(event.target.value.slice(0,1000))} placeholder="Describe what happened and where…" rows={3} /><button type="submit" disabled={!reportText.trim()}>Submit private report</button></form>
      {visibleReports.length ? <div className={reportStyles.reportInbox}><strong>{isHost ? `Host inbox · ${visibleReports.filter((report) => !report.hostReply).length} open` : "Your private reports"}</strong>{visibleReports.map((report) => <article key={report.id}><p>{report.description}</p>{report.hostReply ? <span>Host replied privately: {report.hostReply}</span> : isHost ? <><input value={replyById[report.id] ?? ""} onChange={(event) => setReplyById((current) => ({ ...current, [report.id]: event.target.value.slice(0,500) }))} placeholder="Private reply" /><button type="button" disabled={!replyById[report.id]?.trim()} onClick={() => { dispatch({ type: "COMMAND", command: { type: "REPLY_REPORT", roomPublicId: room.publicId, actorId: session.viewer.actorId, reportId: report.id, reply: replyById[report.id], nowIso: new Date().toISOString() } }); setReplyById((current) => ({ ...current, [report.id]: "" })); }}>Reply</button></> : <span>Waiting for a private Host reply.</span>}</article>)}</div> : null}
    </section>
  );
}

function MoreControl({ room, capabilities, close, openControl }: ControlProps & { readonly openControl: (control: Exclude<RoomControl, "more">) => void }) {
  const { session, dispatch, reset } = useMockSession();
  const [confirm, setConfirm] = useState<"end" | "remove" | "reset" | null>(null);
  const renderTime = usePollClock(room.activePoll);
  const roomVoteBlocked = Boolean(room.activePoll && !room.activePoll.resolvedChoiceId && Date.parse(room.activePoll.closesAt) > renderTime);

  function extend() {
    const base = Date.parse(room.endsAt ?? new Date().toISOString());
    dispatch({ type: "COMMAND", command: { type: "UPDATE_DURATION", roomPublicId: room.publicId, actorId: session.viewer.actorId, endsAt: new Date(base + 60 * 60_000).toISOString(), nowIso: new Date().toISOString() } });
  }

  function endRoom() {
    dispatch({ type: "COMMAND", command: { type: "END_ROOM", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } });
    close();
  }

  function createRoomVote(kind: "extend-room" | "end-room") {
    const nowIso = new Date().toISOString();
    const activeMembers = room.members.filter((member) => !["removed", "banned"].includes(room.membershipStates[member.actorId] ?? "active")).length;
    const closesAt = new Date(Math.min(Date.parse(nowIso) + 30 * 60_000, Date.parse(room.endsAt ?? new Date(Date.parse(nowIso) + 30 * 60_000).toISOString()))).toISOString();
    const proposal = kind === "extend-room" ? { kind, endsAt: new Date(Math.min(Date.parse(room.endsAt ?? nowIso) + 60 * 60_000, Date.parse(nowIso) + 24 * 60 * 60_000)).toISOString() } as const : { kind } as const;
    dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso, poll: { id: `poll_${createUuid()}`, question: kind === "extend-room" ? "Keep this room open for one more hour?" : "End and archive this room now?", closesAt, memberSnapshot: activeMembers, requiredVotes: Math.floor(activeMembers / 2) + 1, visibility: "public", choices: [{ id: "yes", label: kind === "extend-room" ? "Keep it open" : "End the room", votes: 0 }, { id: "no", label: "Not this time", votes: 0 }], voterActorIds: [], resolvedChoiceId: null, proposal } } });
    close();
  }

  function confirmSelection() {
    if (confirm === "end") endRoom();
    else if (confirm === "remove") { dispatch({ type: "COMMAND", command: { type: "REMOVE_OWN_ARCHIVE", roomPublicId: room.publicId, actorId: session.viewer.actorId } }); close(); }
    else if (confirm === "reset") { reset(); close(); }
  }

  return (
    <Sheet title="Room options." eyebrow={room.lifecycle === "archived" ? "Read-only archive" : "Private room settings"} close={close}>
      <div className={shortcutStyles.mobileShortcuts}><button type="button" onClick={() => openControl("share")}><Icon name="share" />Share</button><button type="button" onClick={() => openControl("members")}><Icon name="members" />Members</button></div>
      <div className={styles.optionList}>
        {room.lifecycle === "active" ? <><button type="button" disabled={!capabilities.canChangeDuration} onClick={extend}><span><strong>Add one hour</strong><small>Only the Host can change the room clock.</small></span><Icon name="arrow" /></button><button type="button" disabled><span><strong>Entry approval</strong><small>Fixed when this local room is created.</small></span><span>{room.requiresApproval ? "On" : "Off"}</span></button>{capabilities.canEndRoom ? <button type="button" className={styles.dangerOption} onClick={() => setConfirm("end")}><span><strong>End this room</strong><small>Immediately freeze every write and start archiving.</small></span><Icon name="arrow" /></button> : null}</> : <button type="button" className={styles.dangerOption} onClick={() => setConfirm("remove")}><span><strong>Remove from my archive</strong><small>This affects only your personal archive list.</small></span><Icon name="arrow" /></button>}
        <button type="button" onClick={() => setConfirm("reset")}><span><strong>Reset local data</strong><small>Clear rooms and interactions stored in this browser.</small></span><Icon name="arrow" /></button>
      </div>
      {room.lifecycle === "active" && capabilities.canVote && (room.mode === "community-led" || capabilities.canModerate) ? <div className={styles.optionList}><button type="button" disabled={roomVoteBlocked} onClick={() => createRoomVote("extend-room")}><span><strong>Vote on more time</strong><small>Open a visible majority vote for one additional hour.</small></span><Icon name="arrow" /></button><button type="button" disabled={roomVoteBlocked} onClick={() => createRoomVote("end-room")}><span><strong>Vote to end the room</strong><small>Archive immediately if the majority threshold is reached.</small></span><Icon name="arrow" /></button></div> : null}
      {confirm ? <div className={styles.confirmBox}><strong>{confirm === "end" ? "End this room now?" : confirm === "remove" ? "Remove your archive entry?" : "Reset all local data?"}</strong><p>{confirm === "end" ? "Chat, Board and Itinerary become read-only immediately." : "This action is scoped to this browser&apos;s local EventSpace data."}</p><div><button type="button" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className={styles.confirm} onClick={confirmSelection}>Confirm</button></div></div> : null}
      <Reports room={room} />
      <p className={styles.mockBoundary}>Backend authorization, server time and archive jobs are not connected yet; this build keeps those boundaries explicit.</p>
    </Sheet>
  );
}

export function RoomControls({ active, room, capabilities, close, openControl }: { readonly active: RoomControl; readonly room: MockRoom; readonly capabilities: RoomCapabilities; readonly close: () => void; readonly openControl: (control: RoomControl) => void }) {
  if (active === "share") return <ShareControl room={room} close={close} />;
  if (active === "members") return <MembersControl room={room} capabilities={capabilities} close={close} />;
  return <MoreControl room={room} capabilities={capabilities} close={close} openControl={openControl} />;
}
