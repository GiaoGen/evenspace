"use client";

import { useCallback, useEffect, useRef, useState, useTransition, type ReactNode } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { InvitationQr } from "@/components/ui/invitation-qr";
import { createUuid } from "@/core/domain/uuid";
import { useBrowserOrigin } from "@/core/web/use-browser-origin";
import { rotateRoomInviteAction } from "@/app/rooms/[roomId]/invite-actions";
import type { RoomCapabilities } from "@/core/domain/room";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockRoom } from "@/features/mock-session/model/mock-session";
import styles from "./room-controls.module.css";
import shortcutStyles from "./room-control-shortcuts.module.css";
import { usePollClock } from "@/features/room/model/use-poll-clock";
import { getExtendedEndsAt, getExtensionPollQuestion, getMaxExtensionMinutes } from "@/features/room/model/room-extension";
import { RoomExtensionPicker } from "./room-extension-picker";

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

function createInviteSecrets() {
  const random = new Uint8Array(32);
  crypto.getRandomValues(random);
  const token = btoa(String.fromCharCode(...random)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codeBytes = new Uint8Array(8);
  crypto.getRandomValues(codeBytes);
  const code = [...codeBytes].map((value) => alphabet[value % alphabet.length]).join("");
  return { token, code };
}

function ShareControl({ room, close }: Pick<ControlProps, "room" | "close">) {
  const { session } = useMockSession();
  const isHost = session.viewer.actorId === room.members.find((member) => member.role === "host")?.actorId;
  const [feedback, setFeedback] = useState("Preparing a private invitation.");
  const [invite, setInvite] = useState<{ readonly token: string; readonly code: string } | null>(null);
  const [inviteState, setInviteState] = useState<"creating" | "ready" | "error" | "unavailable">(isHost ? "creating" : "unavailable");
  const [isCreating, startCreating] = useTransition();
  const initializedRef = useRef(false);
  const origin = useBrowserOrigin();
  const invitation = invite ? `/join/${room.publicId}?token=${invite.token}` : null;
  const invitationUrl = invitation && origin ? `${origin}${invitation}` : "";

  async function copy(value: string, label: string) {
    try { await navigator.clipboard.writeText(value); setFeedback(`${label} copied`); }
    catch { setFeedback("Copy is unavailable in this browser"); }
  }

  const createInvitation = useCallback(async () => {
    setInviteState("creating");
    setFeedback("Preparing a private invitation.");
    const next = createInviteSecrets();
    const result = await rotateRoomInviteAction({ roomPublicId: room.publicId, ...next });
    if (!result.ok) {
      setInviteState("error");
      setFeedback("A new invitation could not be created.");
      return;
    }
    setInvite(next);
    setInviteState("ready");
    setFeedback("A fresh private invitation is ready.");
  }, [room.publicId]);

  useEffect(() => {
    if (!isHost || initializedRef.current) return;
    initializedRef.current = true;
    startCreating(() => { void createInvitation(); });
  }, [createInvitation, isHost]);

  return (
    <Sheet title="Bring people closer." eyebrow={room.name} close={close}>
      <div className={styles.qrCard}>
        {invitationUrl ? <InvitationQr value={invitationUrl} size={155} className={styles.qr} /> : null}
        <strong>{invitationUrl ? "Scan to open this invitation" : inviteState === "error" ? "Invitation could not be created" : isHost ? "Preparing your invitation" : "Invitation unavailable"}</strong>
        <span>{invitationUrl ? "This QR opens the current private invitation." : inviteState === "error" ? "Try creating a fresh invitation again." : isHost ? "A secure QR code and invite code are being created." : "Only the room host can create a private invitation."}</span>
      </div>
      <div className={styles.copyRows}>
        <button type="button" disabled={!invitationUrl} onClick={() => invitationUrl && copy(invitationUrl, "Invitation link")}><span><small>Private link</small><strong>{invitation ?? "Preparing link"}</strong></span><Icon name="share" /></button>
        <button type="button" disabled={!invite} onClick={() => invite && copy(invite.code, "Invite code")}><span><small>Invite code</small><strong>{invite?.code ?? "Preparing code"}</strong></span><Icon name="share" /></button>
      </div>
      <p className={styles.feedback} aria-live="polite">{feedback}</p>
      <button type="button" className={styles.secondary} disabled>Approval {room.requiresApproval ? "is required" : "is off"}</button>
      {isHost ? <button type="button" className={styles.dangerText} disabled={isCreating || inviteState === "creating"} onClick={() => startCreating(() => { void createInvitation(); })}>{inviteState === "error" ? "Try creating the invitation again" : "Create a fresh link and invite code"}</button> : null}
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

  if (room.memberListVisibility === "moderators" && !capabilities.canModerate) return <Sheet title="The people inside." eyebrow="Private member list" close={close}><p className={styles.mockBoundary}>This Host-led room keeps its member list visible to the Host only.</p></Sheet>;

  return (
    <Sheet title="The people inside." eyebrow={`${room.memberCount} members`} close={close}>
      {capabilities.canModerate && requests.length ? <section className={styles.requests}><div className={styles.sectionTitle}><strong>Entry requests</strong><span>{requests.length}</span></div>{requests.map((request) => <article key={request.id}><Avatar className={styles.personAvatar} src={request.avatarUrl} text={request.initials} displayName={request.displayName} decorative /><div><strong>{request.displayName}</strong><p>{request.note}</p></div><span><button type="button" onClick={() => review(request.id, "rejected")} aria-label={`Reject ${request.displayName}`}><Icon name="close" size={15} /></button><button type="button" onClick={() => review(request.id, "approved")} aria-label={`Approve ${request.displayName}`}><Icon name="check" size={15} /></button></span></article>)}</section> : null}
      <section className={styles.members}>
        <div className={styles.sectionTitle}><strong>Members</strong><span>{activeMembers.length}</span></div>
        {activeMembers.map((member) => {
          const canAct = member.actorId !== session.viewer.actorId && member.role !== "host" && (capabilities.canModerate || room.mode === "community-led" && capabilities.canVote);
          const voteBlocked = Boolean(room.activePoll && !room.activePoll.resolvedChoiceId && Date.parse(room.activePoll.closesAt) > renderTime);
          return (
            <article key={member.actorId}>
              <Avatar className={styles.personAvatar} src={member.avatarUrl} text={member.initials} displayName={member.displayName} decorative />
              <div><strong>{member.displayName}{member.actorId === session.viewer.actorId ? " · You" : ""}</strong><p>{member.role} · {room.membershipStates[member.actorId] ?? "active"}{member.isGuest ? " · guest" : ""}</p></div>
              {canAct ? <button type="button" onClick={() => setPending({ actorId: member.actorId, kind: capabilities.canModerate ? "mute" : "vote-remove" })}><Icon name="more" /></button> : null}
              {pending?.actorId === member.actorId ? <div className={styles.memberActions}>
                {capabilities.canModerate ? <><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "mute" })}>{room.membershipStates[member.actorId] === "muted" ? "Unmute" : "Mute"}</button><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "remove" })}>Remove</button><button type="button" onClick={() => setPending({ actorId: member.actorId, kind: "ban" })}>Ban</button></> : null}
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

function MoreControl({ room, capabilities, close, openControl }: ControlProps & { readonly openControl: (control: Exclude<RoomControl, "more">) => void }) {
  const { session, dispatch } = useMockSession();
  const [confirm, setConfirm] = useState<"end" | null>(null);
  const [extensionMode, setExtensionMode] = useState<"direct" | "vote" | null>(null);
  const [extensionMinutes, setExtensionMinutes] = useState(60);
  const [extensionNowIso, setExtensionNowIso] = useState(() => new Date().toISOString());
  const renderTime = usePollClock(room.activePoll);
  const roomVoteBlocked = Boolean(room.activePoll && !room.activePoll.resolvedChoiceId && Date.parse(room.activePoll.closesAt) > renderTime);
  const maxExtensionMinutes = getMaxExtensionMinutes(room.endsAt, extensionNowIso);

  function openExtension(mode: "direct" | "vote") {
    const nowIso = new Date().toISOString();
    const maximum = getMaxExtensionMinutes(room.endsAt, nowIso);
    setExtensionNowIso(nowIso);
    setExtensionMinutes(Math.min(60, Math.max(5, maximum)));
    setExtensionMode(mode);
    setConfirm(null);
  }

  function extend() {
    const nowIso = new Date().toISOString();
    dispatch({ type: "COMMAND", command: { type: "UPDATE_DURATION", roomPublicId: room.publicId, actorId: session.viewer.actorId, endsAt: getExtendedEndsAt(room.endsAt, nowIso, extensionMinutes), nowIso } });
    close();
  }

  function endRoom() {
    dispatch({ type: "COMMAND", command: { type: "END_ROOM", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } });
    close();
  }

  function createRoomVote(kind: "extend-room" | "end-room", proposedMinutes = extensionMinutes) {
    const nowIso = new Date().toISOString();
    const activeMembers = room.members.filter((member) => !["removed", "banned"].includes(room.membershipStates[member.actorId] ?? "active")).length;
    const closesAt = new Date(Math.min(Date.parse(nowIso) + 30 * 60_000, Date.parse(room.endsAt ?? new Date(Date.parse(nowIso) + 30 * 60_000).toISOString()))).toISOString();
    const proposal = kind === "extend-room" ? { kind, endsAt: getExtendedEndsAt(room.endsAt, nowIso, proposedMinutes) } as const : { kind } as const;
    dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", roomPublicId: room.publicId, actorId: session.viewer.actorId, nowIso, poll: { id: `poll_${createUuid()}`, question: kind === "extend-room" ? getExtensionPollQuestion(proposedMinutes) : "End and archive this room now?", closesAt, memberSnapshot: activeMembers, requiredVotes: Math.floor(activeMembers / 2) + 1, visibility: "public", choices: [{ id: "yes", label: kind === "extend-room" ? "Keep it open" : "End the room", votes: 0 }, { id: "no", label: "Not this time", votes: 0 }], voterActorIds: [], resolvedChoiceId: null, proposal } } });
    close();
  }

  function confirmSelection() {
    if (confirm === "end") endRoom();
  }

  return (
    <Sheet title="Room options." eyebrow={room.lifecycle === "archived" ? "Read-only archive" : "Private room settings"} close={close}>
      <div className={shortcutStyles.mobileShortcuts}><button type="button" onClick={() => openControl("share")}><Icon name="share" />Share</button><button type="button" onClick={() => openControl("members")}><Icon name="members" />Members</button></div>
      <div className={styles.optionList}>
        {room.lifecycle === "active" ? <><button type="button" disabled={!capabilities.canChangeDuration} onClick={() => openExtension("direct")}><span><strong>Extend room</strong><small>Choose how much time to add to the room clock.</small></span><Icon name="arrow" /></button>{extensionMode === "direct" ? <RoomExtensionPicker mode="direct" minutes={extensionMinutes} maxMinutes={maxExtensionMinutes} endsAt={room.endsAt} nowIso={extensionNowIso} onChange={setExtensionMinutes} onCancel={() => setExtensionMode(null)} onConfirm={extend} /> : null}<button type="button" disabled><span><strong>Entry approval</strong><small>Set when this private room was created.</small></span><span>{room.requiresApproval ? "On" : "Off"}</span></button>{capabilities.canEndRoom ? <button type="button" className={styles.dangerOption} onClick={() => setConfirm("end")}><span><strong>End this room</strong><small>Immediately freeze every write and start archiving.</small></span><Icon name="arrow" /></button> : null}</> : null}
      </div>
      {room.lifecycle === "active" && capabilities.canVote && (room.mode === "community-led" || capabilities.canModerate) ? <div className={styles.optionList}><button type="button" disabled={roomVoteBlocked} onClick={() => openExtension("vote")}><span><strong>Vote to extend</strong><small>Choose an extension and open a visible majority vote.</small></span><Icon name="arrow" /></button>{extensionMode === "vote" ? <RoomExtensionPicker mode="vote" minutes={extensionMinutes} maxMinutes={maxExtensionMinutes} endsAt={room.endsAt} nowIso={extensionNowIso} onChange={setExtensionMinutes} onCancel={() => setExtensionMode(null)} onConfirm={() => createRoomVote("extend-room")} /> : null}<button type="button" disabled={roomVoteBlocked} onClick={() => createRoomVote("end-room")}><span><strong>Vote to end the room</strong><small>Archive immediately if the majority threshold is reached.</small></span><Icon name="arrow" /></button></div> : null}
      {confirm ? <div className={styles.confirmBox}><strong>End this room now?</strong><p>Chat, Photos and Itinerary become read-only immediately.</p><div><button type="button" onClick={() => setConfirm(null)}>Cancel</button><button type="button" className={styles.confirm} onClick={confirmSelection}>Confirm</button></div></div> : null}
    </Sheet>
  );
}

export function RoomControls({ active, room, capabilities, close, openControl }: { readonly active: RoomControl; readonly room: MockRoom; readonly capabilities: RoomCapabilities; readonly close: () => void; readonly openControl: (control: RoomControl) => void }) {
  if (active === "share") return <ShareControl room={room} close={close} />;
  if (active === "members") return <MembersControl room={room} capabilities={capabilities} close={close} />;
  return <MoreControl room={room} capabilities={capabilities} close={close} openControl={openControl} />;
}
