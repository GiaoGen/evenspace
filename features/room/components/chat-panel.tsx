"use client";

import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent, type PointerEvent } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import type { ChatMessage, ItineraryItem, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockPoll } from "@/features/mock-session/model/mock-session";
import { usePollClock } from "@/features/room/model/use-poll-clock";
import styles from "./room-experience.module.css";

interface ChatPanelProps {
  readonly roomPublicId: RoomPublicId;
  readonly messages: readonly ChatMessage[];
  readonly poll: MockPoll | null;
  readonly pinnedMessageId: string | null;
  readonly members: readonly PersonSummary[];
  readonly viewerActorId: string;
  readonly timeZone: string;
  readonly canChat: boolean;
  readonly canVote: boolean;
  readonly canModerate: boolean;
  readonly archived: boolean;
}

const formatTime = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));
type PollKind = "yes-no" | "options" | "itinerary";
const pollKinds: readonly { readonly kind: PollKind; readonly label: string; readonly summary: string }[] = [
  { kind: "yes-no", label: "Yes / No", summary: "A fast binary vote for simple decisions." },
  { kind: "options", label: "Options", summary: "Let the room choose between up to five answers." },
  { kind: "itinerary", label: "Itinerary", summary: "Approve a plan and add it to the schedule." },
];

export function ChatPanel({ roomPublicId, messages, poll, pinnedMessageId, members, viewerActorId, timeZone, canChat, canVote, canModerate, archived }: ChatPanelProps) {
  const { session, dispatch } = useMockSession();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toolTrayOpen, setToolTrayOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [recallable, setRecallable] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const recordingStartedAt = useRef(0);
  const recordingActive = useRef(false);
  const recordingTimeout = useRef<number | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const pendingOwnScrollRef = useRef(false);
  const mountedRef = useRef(false);
  const [voiceMode, setVoiceMode] = useState(false);
  const [pollOpen, setPollOpen] = useState(false);
  const [voteArchiveOpen, setVoteArchiveOpen] = useState(false);
  const [pollKind, setPollKind] = useState<PollKind>("yes-no");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [itineraryTitle, setItineraryTitle] = useState("");
  const [itineraryStartsAt, setItineraryStartsAt] = useState("");
  const [itineraryLocation, setItineraryLocation] = useState("");
  const [itineraryCapacity, setItineraryCapacity] = useState("2");
  const [pollResponsibleId, setPollResponsibleId] = useState("");
  const [pollOpenMinutes, setPollOpenMinutes] = useState("30");
  const [anonymousPoll, setAnonymousPoll] = useState(false);
  const pollNow = usePollClock(poll);
  const viewer = useMemo(() => members.find((member) => member.actorId === viewerActorId) ?? null, [members, viewerActorId]);
  const pollResponsible = useMemo(() => members.find((member) => member.actorId === pollResponsibleId) ?? viewer, [members, pollResponsibleId, viewer]);
  const pinned = messages.find((message) => message.id === pinnedMessageId);
  const visibleMessages = useMemo(() => query.trim() ? messages.filter((message) => message.body.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()) || message.author?.displayName.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : messages, [messages, query]);
  const room = useMemo(() => session.rooms.find((item) => item.publicId === roomPublicId) ?? null, [roomPublicId, session.rooms]);
  const voteCards = useMemo(() => {
    const history = room?.pollHistory ?? [];
    const cards = !poll ? history : history.some((item) => item.id === poll.id) ? history.map((item) => item.id === poll.id ? poll : item) : [...history, poll];
    return [...cards].reverse();
  }, [poll, room]);
  const showInlinePoll = Boolean(poll && !poll.voterActorIds.includes(session.viewer.actorId));

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => setRecordingSeconds((value) => Math.min(60, value + 1)), 1000);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      bottomRef.current?.scrollIntoView({ block: "end" });
      return;
    }
    if (!pendingOwnScrollRef.current) return;
    pendingOwnScrollRef.current = false;
    bottomRef.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages.length]);

  function post(body: string) {
    if (!canChat || !viewer || !body.trim()) return;
    const message: ChatMessage = { id: `message_${createUuid()}`, kind: "message", author: viewer, body: body.trim().slice(0, 2000), sentAt: new Date().toISOString(), isOwn: true, reactions: [], ...(replyTo ? { replyToId: replyTo } : {}) };
    pendingOwnScrollRef.current = true;
    dispatch({ type: "COMMAND", command: { type: "POST_MESSAGE", roomPublicId, actorId: session.viewer.actorId, message, nowIso: message.sentAt } });
    setDraft(""); setReplyTo(null); setSelectedMessage(null); setToolTrayOpen(false);
  }

  function startRecording(event: PointerEvent<HTMLButtonElement>) {
    if (!canChat || recording) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    recordingStartedAt.current = Date.now();
    recordingActive.current = true;
    recordingTimeout.current = window.setTimeout(finishRecording, 60_000);
    setRecording(true); setRecordingSeconds(0);
  }

  function finishRecording() {
    if (!recordingActive.current) return;
    recordingActive.current = false;
    if (recordingTimeout.current) window.clearTimeout(recordingTimeout.current);
    recordingTimeout.current = null;
    const duration = Math.min(60, Math.max(1, Math.ceil((Date.now() - recordingStartedAt.current) / 1000)));
    setRecording(false); setRecordingSeconds(0);
    setVoiceMode(false);
    post(`Voice message · 0:${String(duration).padStart(2, "0")}`);
  }

  function messageCommand(type: "RECALL_MESSAGE" | "DELETE_MESSAGE" | "PIN_MESSAGE" | "REACT_MESSAGE", messageId: string) {
    const base = { roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const;
    if (type === "REACT_MESSAGE") dispatch({ type: "COMMAND", command: { type, ...base, messageId, emoji: "♥" } });
    else dispatch({ type: "COMMAND", command: { type, ...base, messageId } });
    setSelectedMessage(null);
  }

  function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const room = session.rooms.find((item) => item.publicId === roomPublicId);
    if (!room || !viewer) return;
    const activeMembers = room.members.filter((member) => !["removed", "banned"].includes(room.membershipStates[member.actorId] ?? "active")).length;
    const minutes = Math.min(Math.max(Math.round(Number(pollOpenMinutes)), 1), 240);
    const openMs = minutes * 60_000;
    const closesAt = new Date(Math.min(Date.now() + openMs, Date.parse(room.endsAt ?? new Date(Date.now() + openMs).toISOString()))).toISOString();
    const optionLabels = pollOptions.map((option) => option.trim()).filter(Boolean).slice(0, 5);
    const startsAt = Date.parse(itineraryStartsAt);
    const capacity = Math.min(Math.max(Math.round(Number(itineraryCapacity)), 1), Math.max(activeMembers, 1));
    const itineraryItem: ItineraryItem | null = pollKind === "itinerary" && itineraryTitle.trim() && Number.isFinite(startsAt) && pollResponsible
      ? { id: `itinerary_${createUuid()}`, title: itineraryTitle.trim().slice(0,80), description: "Created from a chat vote.", startsAt: new Date(startsAt).toISOString(), locationLabel: itineraryLocation.trim() || null, mapsUrl: null, responsible: pollResponsible, status: "not-started", capacity, goingCount: pollResponsible.actorId === viewer.actorId ? 1 : 0, viewerAttendance: pollResponsible.actorId === viewer.actorId ? "going" : null }
      : null;
    if (pollKind === "yes-no" && !pollQuestion.trim() || pollKind === "options" && (!pollQuestion.trim() || optionLabels.length < 2) || pollKind === "itinerary" && !itineraryItem) return;
    const newPoll: MockPoll = {
      id: `poll_${createUuid()}`,
      question: pollKind === "itinerary" ? `Add “${itineraryItem!.title}” to the itinerary?` : pollQuestion.trim().slice(0,160),
      closesAt,
      memberSnapshot: activeMembers,
      requiredVotes: Math.floor(activeMembers / 2) + 1,
      visibility: anonymousPoll ? "anonymous" : "public",
      choices: pollKind === "options" ? optionLabels.map((label, index) => ({ id: `option_${index + 1}`, label: label.slice(0, 120), votes: 0 })) : [{ id: "yes", label: pollKind === "itinerary" ? "Add this plan" : "Yes", votes: 0 }, { id: "no", label: pollKind === "itinerary" ? "Not this time" : "No", votes: 0 }],
      voterActorIds: [],
      resolvedChoiceId: null,
      ...(itineraryItem ? { proposal: { kind: "itinerary" as const, item: itineraryItem } } : {}),
    };
    dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", roomPublicId, actorId: session.viewer.actorId, poll: newPoll, nowIso: new Date().toISOString() } });
    setPollQuestion(""); setPollOptions(["", ""]); setItineraryTitle(""); setItineraryStartsAt(""); setItineraryLocation(""); setItineraryCapacity("2"); setPollOpen(false); setToolTrayOpen(false);
  }

  function pollReady(kind: PollKind) {
    if (pollKind !== kind) return false;
    if (kind === "yes-no") return Boolean(pollQuestion.trim());
    if (kind === "options") return Boolean(pollQuestion.trim()) && pollOptions.filter((option) => option.trim()).length >= 2;
    return Boolean(itineraryTitle.trim()) && Boolean(itineraryStartsAt) && Boolean(itineraryCapacity) && Number(itineraryCapacity) >= 1;
  }

  function pollChoicePercent(targetPoll: MockPoll, votes: number) {
    const total = targetPoll.choices.reduce((sum, choice) => sum + choice.votes, 0);
    return total > 0 ? Math.round(votes / total * 100) : 0;
  }

  function renderVoteCard(targetPoll: MockPoll) {
    const isActivePoll = poll?.id === targetPoll.id;
    const closed = Date.parse(targetPoll.closesAt) <= pollNow;
    const voted = targetPoll.voterActorIds.includes(session.viewer.actorId);
    const canCastVote = canVote && isActivePoll && !voted && !targetPoll.resolvedChoiceId && !closed;
    const state = targetPoll.resolvedChoiceId ? "Resolved" : closed ? "Closed" : "Open";
    return <article key={targetPoll.id} className={styles.poll}><header><span>{targetPoll.visibility === "anonymous" ? "Anonymous vote" : "Public vote"}</span><time>{state}</time></header><h2>{targetPoll.question}</h2>{targetPoll.choices.map((choice) => {
      const percent = pollChoicePercent(targetPoll, choice.votes);
      const showResults = voted || Boolean(targetPoll.resolvedChoiceId) || closed;
      return <button key={choice.id} className={targetPoll.resolvedChoiceId === choice.id ? styles.pollSelected : ""} style={{ "--poll-progress": `${showResults ? percent : 0}%` } as CSSProperties} disabled={!canCastVote} onClick={() => dispatch({ type: "COMMAND", command: { type: "CAST_VOTE", roomPublicId, actorId: session.viewer.actorId, choiceId: choice.id, nowIso: new Date().toISOString() } })}><span><em>{choice.label}</em>{showResults ? <strong>{percent}%</strong> : null}</span><b>{choice.votes}</b></button>;
    })}<p>{targetPoll.memberSnapshot} members 路 {targetPoll.requiredVotes} votes needed{voted ? " 路 Your vote is counted" : ""}</p></article>;
  }

  function openSearch() {
    setSearching(true);
    setPollOpen(false);
    setToolTrayOpen(false);
  }

  function openPoll() {
    setPollOpen(true);
    setSearching(false);
    setToolTrayOpen(false);
  }

  function openVoteArchive() {
    setVoteArchiveOpen(true);
    setSearching(false);
    setPollOpen(false);
    setToolTrayOpen(false);
  }

  return (
    <div className={styles.chatPanel}>
      {searching ? <div className={styles.roomSearch}><Icon name="search" size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} placeholder="Search this room" /><button type="button" onClick={() => { setQuery(""); setSearching(false); }}><Icon name="close" size={15} /></button></div> : null}
      {pollOpen ? <form className={styles.pollComposer} onSubmit={createPoll} noValidate>
        <div className={styles.pollTypeRail} aria-label="Poll type">
          {pollKinds.map((item) => <section key={item.kind} className={`${styles.pollTypeCard} ${pollKind === item.kind ? styles.pollTypeSelected : ""}`} onClick={() => setPollKind(item.kind)}>
            <header><span>{item.label}</span><button type="button" aria-label="Close poll composer" onClick={(event) => { event.stopPropagation(); setPollOpen(false); }}><Icon name="close" size={15} /></button></header>
            <div className={styles.pollCardHero}><Icon name={item.kind === "itinerary" ? "calendar" : item.kind === "options" ? "list" : "check"} /><h2>{item.kind === "yes-no" ? "A clean yes, or a clean no." : item.kind === "options" ? "Let the room choose one path." : "Turn a plan into the schedule."}</h2><p>{item.summary}</p></div>
            {item.kind === "yes-no" ? <div className={styles.pollFields}><label>Question<input value={pollKind === "yes-no" ? pollQuestion : ""} onChange={(event) => { setPollKind("yes-no"); setPollQuestion(event.target.value.slice(0,160)); }} placeholder="Should we head out now?" /></label></div> : null}
            {item.kind === "options" ? <div className={styles.pollFields}><label>Question<input value={pollKind === "options" ? pollQuestion : ""} onChange={(event) => { setPollKind("options"); setPollQuestion(event.target.value.slice(0,160)); }} placeholder="Whose place tonight?" /></label><div className={styles.pollOptionGrid}>{pollOptions.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={(event) => { setPollKind("options"); setPollOptions((current) => current.map((value, valueIndex) => valueIndex === index ? event.target.value.slice(0,120) : value)); }} placeholder={index === 0 ? "A's place" : index === 1 ? "B's place" : "Another option"} /></label>)}</div>{pollOptions.length < 5 ? <button type="button" className={styles.addPollOption} onClick={() => { setPollKind("options"); setPollOptions((current) => [...current, ""]); }}>Add option</button> : null}</div> : null}
            {item.kind === "itinerary" ? <div className={styles.pollFields}><label>Plan<input value={itineraryTitle} onChange={(event) => { setPollKind("itinerary"); setItineraryTitle(event.target.value.slice(0,80)); }} placeholder="Late dinner" /></label><div className={styles.pollOptionGrid}><label>Start time<input type="datetime-local" value={itineraryStartsAt} onChange={(event) => { setPollKind("itinerary"); setItineraryStartsAt(event.target.value); }} /></label><label>Capacity<input inputMode="numeric" value={itineraryCapacity} onChange={(event) => { setPollKind("itinerary"); setItineraryCapacity(event.target.value.replace(/\D/g, "").slice(0,3)); }} placeholder="2" /></label></div><label>Responsible<select value={pollResponsible?.actorId ?? ""} onChange={(event) => { setPollKind("itinerary"); setPollResponsibleId(event.target.value); }}>{members.map((member) => <option value={member.actorId} key={member.actorId}>{member.displayName}{member.isGuest ? " · guest" : ""}</option>)}</select></label><label>Location<input value={itineraryLocation} onChange={(event) => { setPollKind("itinerary"); setItineraryLocation(event.target.value.slice(0,120)); }} placeholder="Optional" /></label></div> : null}
            <footer>
              <label className={styles.pollDuration}><span>Open</span><input inputMode="numeric" value={pollOpenMinutes} onChange={(event) => setPollOpenMinutes(event.target.value.replace(/\D/g, "").slice(0,3))} placeholder="30" /><span>min</span></label>
              <label className={styles.pollPrivacy}><button type="button" className={anonymousPoll ? styles.pollPrivacyOn : ""} onClick={(event) => { event.stopPropagation(); setAnonymousPoll(!anonymousPoll); }}><i /></button><span>{anonymousPoll ? "Anonymous" : "Public"}</span></label>
              <button type="submit" disabled={!pollReady(item.kind)}>Open poll</button>
            </footer>
          </section>)}
        </div>
      </form> : null}
      <div className={styles.chatScroll}>
        {pinned && !archived ? <button className={styles.pinned} onClick={() => setSelectedMessage(pinned.id)}><span><Icon name="chat" size={14} />Pinned</span><strong>{pinned.body}</strong><Icon name="chevron" size={15} /></button> : null}
        <p className={styles.dayLabel}>{query ? `${visibleMessages.length} results` : "Today"}</p>
        {visibleMessages.length ? visibleMessages.map((message) => {
          const own = message.isOwn || message.author?.actorId === session.viewer.actorId || message.author?.actorId === viewerActorId;
          return message.kind === "system" ? <p key={message.id} className={styles.systemMessage}>{message.body}</p> : (
          <article key={message.id} className={`${styles.message} ${own ? styles.ownMessage : ""}`}>
            <span className={styles.messageAvatar}>{message.author?.initials ?? "?"}</span>
            <div>
              <p className={styles.messageMeta}><strong>{own ? "You" : message.author?.displayName}</strong><time>{formatTime(message.sentAt, timeZone)}</time></p>
              {message.replyToId ? <span className={styles.replyQuote}>Replying to {messages.find((item) => item.id === message.replyToId)?.body ?? "a message"}</span> : null}
              <button type="button" className={styles.bubble} onClick={() => { setSelectedMessage(selectedMessage === message.id ? null : message.id); setRecallable(Date.now() - Date.parse(message.sentAt) <= 120_000); }}>{message.body}</button>
              {message.reactions.length ? <div className={styles.reactions}>{message.reactions.map((reaction) => <span key={reaction.emoji}>{reaction.emoji} {reaction.count}</span>)}</div> : null}
              {selectedMessage === message.id && !archived ? <div className={styles.messageActions}><button type="button" onClick={() => { setReplyTo(message.id); setSelectedMessage(null); }}>Reply</button><button type="button" onClick={() => messageCommand("REACT_MESSAGE", message.id)}>♥ React</button>{canModerate ? <button type="button" onClick={() => messageCommand("PIN_MESSAGE", message.id)}>Pin</button> : null}{message.author?.actorId === viewerActorId && recallable ? <button type="button" onClick={() => messageCommand("RECALL_MESSAGE", message.id)}>Recall</button> : canModerate ? <button type="button" onClick={() => messageCommand("DELETE_MESSAGE", message.id)}>Delete</button> : null}</div> : null}
            </div>
          </article>
        );}) : <div className={styles.panelEmpty}><p>No messages found in this room.</p></div>}
        {poll && showInlinePoll ? <article className={styles.poll}><header><span>{poll.visibility === "anonymous" ? "Anonymous vote" : "Public vote"}</span><time>{poll.resolvedChoiceId ? "Resolved" : Date.parse(poll.closesAt) <= pollNow ? "Closed" : "Open"}</time></header><h2>{poll.question}</h2>{poll.choices.map((choice) => {
          const percent = pollChoicePercent(poll, choice.votes);
          const showResults = poll.voterActorIds.includes(session.viewer.actorId) || Boolean(poll.resolvedChoiceId) || Date.parse(poll.closesAt) <= pollNow;
          return <button key={choice.id} className={poll.resolvedChoiceId === choice.id ? styles.pollSelected : ""} style={{ "--poll-progress": `${showResults ? percent : 0}%` } as CSSProperties} disabled={!canVote || poll.voterActorIds.includes(session.viewer.actorId) || Boolean(poll.resolvedChoiceId) || Date.parse(poll.closesAt) <= pollNow} onClick={() => dispatch({ type: "COMMAND", command: { type: "CAST_VOTE", roomPublicId, actorId: session.viewer.actorId, choiceId: choice.id, nowIso: new Date().toISOString() } })}><i /><span><em>{choice.label}</em>{showResults ? <strong>{percent}%</strong> : null}</span><b>{choice.votes}</b></button>;
        })}<p>{poll.memberSnapshot} members · {poll.requiredVotes} votes needed{poll.voterActorIds.includes(session.viewer.actorId) ? " · Your vote is counted" : ""}</p></article> : null}
        <div ref={bottomRef} />
      </div>
      {typeof document !== "undefined" && voteArchiveOpen ? createPortal(<div className={styles.voteOverlay} role="dialog" aria-modal="true" aria-label="All vote cards">
        <header><div><p>Votes</p><h2>Room decisions</h2></div><button type="button" aria-label="Close vote cards" onClick={() => setVoteArchiveOpen(false)}><Icon name="close" size={16} /></button></header>
        <div className={styles.voteGrid}>{voteCards.length ? voteCards.map((item) => renderVoteCard(item)) : <div className={styles.panelEmpty}><p>No vote cards yet.</p></div>}</div>
      </div>, document.body) : null}
      {archived ? <div className={styles.readOnly}><Icon name="check" size={15} />This room is archived and read-only.</div> : (
        <form className={styles.composer} onSubmit={(event) => { event.preventDefault(); post(draft); }}>
          {replyTo ? <div className={styles.replyPreview}><span>Replying to {messages.find((message) => message.id === replyTo)?.author?.displayName}</span><button type="button" onClick={() => setReplyTo(null)}><Icon name="close" size={14} /></button></div> : null}
          {toolTrayOpen ? <div className={styles.chatToolTray}>
            <button type="button" onClick={openSearch} aria-label="Search messages"><Icon name="search" /><span>Search</span></button>
            <button type="button" onClick={openPoll} disabled={!canVote || Boolean(poll && !poll.resolvedChoiceId && Date.parse(poll.closesAt) > pollNow)} title={poll && !poll.resolvedChoiceId && Date.parse(poll.closesAt) > pollNow ? "Wait for the current vote to close before opening another." : undefined} aria-label="Create a poll"><Icon name="plus" /><span>Poll</span></button>
            <button type="button" onClick={openVoteArchive} disabled={!voteCards.length} aria-label="View vote cards"><Icon name="list" /><span>Votes</span></button>
          </div> : null}
          <button type="button" className={styles.addToolButton} aria-label="Open chat tools" aria-expanded={toolTrayOpen} onClick={() => setToolTrayOpen((open) => !open)}><Icon name={toolTrayOpen ? "close" : "plus"} /></button>
          <div className={`${styles.messageInputWrap} ${voiceMode ? styles.voiceInputMode : ""}`}>
            {voiceMode ? <button type="button" className={recording ? styles.voiceBarRecording : styles.voiceBar} aria-label="Hold to record a voice message" disabled={!canChat} onPointerDown={startRecording} onPointerUp={finishRecording} onPointerCancel={finishRecording} onContextMenu={(event) => event.preventDefault()}>{recording ? `${recordingSeconds}s` : "hold to record"}</button> : <input value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} placeholder={canChat ? "Message everyone…" : "You can’t send messages"} disabled={!canChat} maxLength={2000} aria-label="Message everyone" />}
            <button type="button" className={styles.voiceToggle} aria-label={voiceMode ? "Use text input" : "Use voice input"} disabled={!canChat} onClick={() => { setVoiceMode((value) => !value); setToolTrayOpen(false); }}><Icon name="voice" size={16} /></button>
          </div>
          <button className={styles.send} type="submit" disabled={!draft.trim() || !canChat || recording} aria-label="Send message"><Icon name="send" size={16} /></button>
        </form>
      )}
    </div>
  );
}
