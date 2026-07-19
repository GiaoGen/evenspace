"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties, type FormEvent, type PointerEvent, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ChatMessage, ItineraryItem, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockPoll } from "@/features/mock-session/model/mock-session";
import { ChatMessageItem } from "./chat-message";
import { usePollClock } from "../model/use-poll-clock";
import { useInlinePollVisibility } from "../model/use-inline-poll-visibility";
import roomStyles from "./room-experience.module.css";
import styles from "./chat-panel.module.css";

interface ChatPanelProps {
  readonly roomPublicId: RoomPublicId;
  readonly messages: readonly ChatMessage[];
  readonly poll: MockPoll | null;
  readonly pinnedMessageId: string | null;
  readonly members: readonly PersonSummary[];
  readonly viewerActorId: ActorId;
  readonly timeZone: string;
  readonly canChat: boolean;
  readonly canVote: boolean;
  readonly canModerate: boolean;
  readonly archived: boolean;
}

type PollKind = "yes-no" | "options" | "itinerary";
type PendingImage = { readonly dataUrl: string; readonly name: string; readonly aspectRatio: number };
type ToolId = "camera" | "album" | "location" | "poll" | "votes" | "search";
type Tool = { readonly id: ToolId; readonly label: string; readonly icon: IconName };

const LONG_PRESS_MS = 380;
const MAX_CHAT_IMAGE_LENGTH = 1_200_000;
const MAX_VOICE_LENGTH = 1_200_000;
const pollKinds: readonly { readonly kind: PollKind; readonly label: string; readonly summary: string }[] = [
  { kind: "yes-no", label: "Yes / No", summary: "A fast binary vote for simple decisions." },
  { kind: "options", label: "Options", summary: "Let the room choose between up to five answers." },
  { kind: "itinerary", label: "Itinerary", summary: "Approve a plan and add it to the schedule." },
];
const chatTools: readonly Tool[] = [
  { id: "camera", label: "Camera", icon: "camera" },
  { id: "album", label: "Photos", icon: "image" },
  { id: "location", label: "Location", icon: "location" },
  { id: "poll", label: "Poll", icon: "check" },
  { id: "votes", label: "Votes", icon: "list" },
  { id: "search", label: "Search", icon: "search" },
];

const formatDay = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(new Date(value));
const dayKey = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(new Date(value));
const messageLabel = (message?: ChatMessage) => message?.body || (message?.content?.type === "image" ? "Photo" : message?.content?.type === "location" ? message.content.label : message?.content?.type === "voice" ? "Voice message" : "Message");
const readAsDataUrl = (blob: Blob) => new Promise<string>((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => typeof reader.result === "string" ? resolve(reader.result) : reject(new Error("File could not be read."));
  reader.onerror = () => reject(new Error("File could not be read."));
  reader.readAsDataURL(blob);
});

function decodeImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    const url = URL.createObjectURL(file);
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This image cannot be read.")); };
    image.src = url;
  });
}

async function prepareImage(file: File): Promise<PendingImage> {
  if (!file.type.startsWith("image/") && !/\.(avif|gif|heic|heif|jpe?g|png|webp)$/i.test(file.name)) throw new Error("Choose an image file.");
  const image = await decodeImage(file);
  const aspectRatio = image.naturalWidth / image.naturalHeight;
  if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) throw new Error("This image has no readable size.");
  for (const attempt of [{ side: 1200, quality: .76 }, { side: 900, quality: .7 }, { side: 720, quality: .66 }]) {
    const scale = Math.min(1, attempt.side / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Image processing is unavailable.");
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", attempt.quality);
    if (dataUrl.length <= MAX_CHAT_IMAGE_LENGTH) return { dataUrl, name: file.name.slice(0, 120), aspectRatio };
  }
  throw new Error("This image is too large for local chat storage.");
}

function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function ChatPanel({ roomPublicId, messages, poll, pinnedMessageId, members, viewerActorId, timeZone, canChat, canVote, canModerate, archived }: ChatPanelProps) {
  const { session, dispatch } = useMockSession();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toolTrayOpen, setToolTrayOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);
  const [imageCaption, setImageCaption] = useState("");
  const [imageViewerId, setImageViewerId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingCanceled, setRecordingCanceled] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [pollOpen, setPollOpen] = useState(false);
  const [voteArchiveOpen, setVoteArchiveOpen] = useState(false);
  const [pollKind, setPollKind] = useState<PollKind>("yes-no");
  const [pollQuestion, setPollQuestion] = useState("");
  const [pollOptions, setPollOptions] = useState(["", ""]);
  const [itineraryTitle, setItineraryTitle] = useState("");
  const [itineraryStartsAt, setItineraryStartsAt] = useState("");
  const [itineraryLocation, setItineraryLocation] = useState("");
  const [itineraryDuration, setItineraryDuration] = useState("60");
  const [pollResponsibleId, setPollResponsibleId] = useState("");
  const [pollOpenMinutes, setPollOpenMinutes] = useState("30");
  const [anonymousPoll, setAnonymousPoll] = useState(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const pendingOwnScrollRef = useRef(false);
  const previousMessageCountRef = useRef(messages.length);
  const mountedRef = useRef(false);
  const pressRef = useRef<{ x: number; y: number; timer: number } | null>(null);
  const suppressImageClickRef = useRef(false);
  const recordingIntentRef = useRef(false);
  const recordingStartXRef = useRef(0);
  const recordingStartedAtRef = useRef(0);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const recordingChunksRef = useRef<Blob[]>([]);
  const recordingCanceledRef = useRef(false);

  const pollNow = usePollClock(poll);
  const viewer = useMemo(() => members.find((member) => member.actorId === viewerActorId) ?? null, [members, viewerActorId]);
  const pollResponsible = useMemo(() => members.find((member) => member.actorId === pollResponsibleId) ?? viewer, [members, pollResponsibleId, viewer]);
  const pinned = messages.find((message) => message.id === pinnedMessageId);
  const selectedMessage = messages.find((message) => message.id === selectedMessageId) ?? null;
  const viewerImage = messages.find((message) => message.id === imageViewerId && message.content?.type === "image") ?? null;
  const visibleMessages = useMemo(() => query.trim() ? messages.filter((message) => `${messageLabel(message)} ${message.author?.displayName ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : messages, [messages, query]);
  const room = useMemo(() => session.rooms.find((item) => item.publicId === roomPublicId) ?? null, [roomPublicId, session.rooms]);
  const voteCards = useMemo(() => {
    const history = room?.pollHistory ?? [];
    const cards = !poll ? history : history.some((item) => item.id === poll.id) ? history.map((item) => item.id === poll.id ? poll : item) : [...history, poll];
    return [...cards].reverse();
  }, [poll, room]);
  const { showInlinePoll, markVoteSubmitted } = useInlinePollVisibility(poll, session.viewer.actorId);

  const scrollToLatest = (smooth = true) => {
    const scroll = scrollRef.current;
    if (!scroll) return;
    scroll.scrollTo({ top: scroll.scrollHeight, behavior: smooth ? "smooth" : "auto" });
    setUnreadCount(0);
  };

  useEffect(() => {
    let stored = "";
    try { stored = window.localStorage.getItem(`eventspace:chat-draft:${roomPublicId}`)?.slice(0, 2000) ?? ""; }
    catch { /* Start with an empty draft when storage is unavailable. */ }
    const hydrateDraft = () => setDraft(stored);
    if (typeof queueMicrotask === "function") queueMicrotask(hydrateDraft);
    else void Promise.resolve().then(hydrateDraft);
  }, [roomPublicId]);

  useEffect(() => {
    try {
      const key = `eventspace:chat-draft:${roomPublicId}`;
      if (draft) window.localStorage.setItem(key, draft);
      else window.localStorage.removeItem(key);
    } catch { /* The composer remains usable when Safari denies local storage. */ }
  }, [draft, roomPublicId]);

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    textarea.style.height = "0px";
    textarea.style.height = `${Math.min(textarea.scrollHeight, 112)}px`;
  }, [draft]);

  useEffect(() => {
    if (!recording) return;
    const timer = window.setInterval(() => {
      const elapsed = Math.max(1, Math.ceil((performance.now() - recordingStartedAtRef.current) / 1000));
      setRecordingSeconds(Math.min(60, elapsed));
      if (elapsed >= 60 && recorderRef.current?.state === "recording") {
        recordingIntentRef.current = false;
        recorderRef.current.stop();
      }
    }, 250);
    return () => window.clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    const previousCount = previousMessageCountRef.current;
    previousMessageCountRef.current = messages.length;
    if (!mountedRef.current) {
      mountedRef.current = true;
      window.requestAnimationFrame(() => scrollToLatest(false));
      return;
    }
    if (pendingOwnScrollRef.current) {
      pendingOwnScrollRef.current = false;
      window.requestAnimationFrame(() => scrollToLatest(true));
    } else if (atBottom) {
      window.requestAnimationFrame(() => scrollToLatest(false));
    } else if (messages.length > previousCount) setUnreadCount((value) => value + messages.length - previousCount);
  }, [messages.length, atBottom]);

  useEffect(() => () => {
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    if (recorderRef.current?.state === "recording") recorderRef.current.stop();
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
  }, []);

  function commandBase(nowIso = new Date().toISOString()) {
    return { roomPublicId, actorId: session.viewer.actorId, nowIso } as const;
  }

  function postMessage(body: string, content?: ChatMessage["content"]) {
    if (!canChat || !viewer || (!body.trim() && !content)) return;
    const sentAt = new Date().toISOString();
    const message: ChatMessage = { id: `message_${createUuid()}`, kind: "message", author: viewer, body: body.trim().slice(0, 2000), content, sentAt, isOwn: true, reactions: [], ...(replyTo ? { replyToId: replyTo } : {}) };
    pendingOwnScrollRef.current = true;
    dispatch({ type: "COMMAND", command: { type: "POST_MESSAGE", ...commandBase(sentAt), message } });
    setDraft("");
    setReplyTo(null);
    setToolTrayOpen(false);
  }

  function handleScroll(event: UIEvent<HTMLDivElement>) {
    const element = event.currentTarget;
    const nearBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 72;
    setAtBottom(nearBottom);
    if (nearBottom) setUnreadCount(0);
    if (selectedMessageId) setSelectedMessageId(null);
  }

  function beginMessagePress(event: PointerEvent<HTMLElement>, message: ChatMessage) {
    if (archived || event.pointerType === "mouse" && event.button !== 0) return;
    if (pressRef.current) window.clearTimeout(pressRef.current.timer);
    const x = event.clientX;
    const y = event.clientY;
    const timer = window.setTimeout(() => {
      suppressImageClickRef.current = true;
      setSelectedMessageId(message.id);
      navigator.vibrate?.(8);
      pressRef.current = null;
    }, LONG_PRESS_MS);
    pressRef.current = { x, y, timer };
  }

  function moveMessagePress(event: PointerEvent<HTMLElement>) {
    const press = pressRef.current;
    if (!press || Math.hypot(event.clientX - press.x, event.clientY - press.y) < 9) return;
    window.clearTimeout(press.timer);
    pressRef.current = null;
  }

  function endMessagePress() {
    if (!pressRef.current) return;
    window.clearTimeout(pressRef.current.timer);
    pressRef.current = null;
  }

  function openImage(message: ChatMessage) {
    if (suppressImageClickRef.current) {
      suppressImageClickRef.current = false;
      return;
    }
    setImageViewerId(message.id);
  }

  function messageCommand(type: "DELETE_OWN_MESSAGE" | "DELETE_MESSAGE" | "PIN_MESSAGE" | "REACT_MESSAGE", messageId: string, emoji?: string) {
    const base = commandBase();
    if (type === "REACT_MESSAGE") dispatch({ type: "COMMAND", command: { type, ...base, messageId, emoji: emoji ?? "♥" } });
    else dispatch({ type: "COMMAND", command: { type, ...base, messageId } });
    setSelectedMessageId(null);
  }

  async function copyMessage(message: ChatMessage) {
    try { await navigator.clipboard.writeText(messageLabel(message)); setNotice("Copied"); }
    catch { setNotice("Copy is unavailable in this browser."); }
    setSelectedMessageId(null);
  }

  function addImageToBoard(message: ChatMessage) {
    if (message.content?.type !== "image") return;
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item: { id: `board_photo_${createUuid()}`, kind: "photo", ownerActorId: session.viewer.actorId, variant: "one", imageDataUrl: message.content.dataUrl, imageName: message.content.name, aspectRatio: message.content.aspectRatio, note: message.body || null, x: 36, y: 28, rotation: -2, width: 25 } } });
    setSelectedMessageId(null);
    setNotice("Added to board");
  }

  function downloadImage(message: ChatMessage) {
    if (message.content?.type !== "image") return;
    const anchor = document.createElement("a");
    anchor.href = message.content.dataUrl;
    anchor.download = message.content.name || "eventspace-photo.jpg";
    anchor.click();
    setSelectedMessageId(null);
  }

  async function chooseImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setToolTrayOpen(false);
    try { setPendingImage(await prepareImage(file)); setImageCaption(""); }
    catch (error) { setNotice(error instanceof Error ? error.message : "This image cannot be read."); }
  }

  function sendPendingImage() {
    if (!pendingImage) return;
    postMessage(imageCaption, { type: "image", ...pendingImage });
    setPendingImage(null);
    setImageCaption("");
  }

  function shareCurrentLocation() {
    setToolTrayOpen(false);
    if (!navigator.geolocation) { setNotice("Location is unavailable in this browser."); return; }
    setNotice("Finding your location…");
    navigator.geolocation.getCurrentPosition((position) => {
      setNotice(null);
      postMessage("", { type: "location", latitude: position.coords.latitude, longitude: position.coords.longitude, label: "Current location" });
    }, () => setNotice(window.isSecureContext ? "Location permission was not granted." : "Location requires HTTPS on mobile devices."), { enableHighAccuracy: true, timeout: 10_000, maximumAge: 30_000 });
  }

  async function beginRecording(event: PointerEvent<HTMLButtonElement>) {
    if (!canChat || draft.trim() || recordingIntentRef.current) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    recordingIntentRef.current = true;
    recordingCanceledRef.current = false;
    setRecordingCanceled(false);
    recordingStartXRef.current = event.clientX;
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") throw new Error("Voice recording is unavailable in this browser.");
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!recordingIntentRef.current) { stream.getTracks().forEach((track) => track.stop()); return; }
      const mimeType = preferredAudioMimeType();
      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      recorderRef.current = recorder;
      recordingStreamRef.current = stream;
      recordingChunksRef.current = [];
      recorder.onstart = (startEvent) => {
        recordingStartedAtRef.current = startEvent.timeStamp;
        setRecording(true);
        setRecordingSeconds(1);
      };
      recorder.ondataavailable = (chunk) => { if (chunk.data.size) recordingChunksRef.current.push(chunk.data); };
      recorder.onstop = async (stopEvent) => {
        stream.getTracks().forEach((track) => track.stop());
        recordingStreamRef.current = null;
        recorderRef.current = null;
        const canceled = recordingCanceledRef.current;
        const durationSeconds = Math.min(60, Math.max(1, Math.ceil((stopEvent.timeStamp - recordingStartedAtRef.current) / 1000)));
        const blob = new Blob(recordingChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        recordingChunksRef.current = [];
        setRecording(false);
        setRecordingCanceled(false);
        setRecordingSeconds(0);
        if (canceled) return;
        try {
          const dataUrl = await readAsDataUrl(blob);
          if (dataUrl.length > MAX_VOICE_LENGTH) throw new Error("This recording is too large for local chat storage.");
          postMessage("", { type: "voice", durationSeconds, dataUrl, mimeType: blob.type || "audio/webm" });
        } catch (error) { setNotice(error instanceof Error ? error.message : "Voice message could not be saved."); }
      };
      recorder.start(250);
    } catch (error) {
      recordingIntentRef.current = false;
      setNotice(error instanceof Error ? error.message : "Microphone permission was not granted.");
    }
  }

  function moveRecording(event: PointerEvent<HTMLButtonElement>) {
    if (!recordingIntentRef.current) return;
    const canceled = event.clientX - recordingStartXRef.current < -72;
    recordingCanceledRef.current = canceled;
    setRecordingCanceled(canceled);
  }

  function endRecording() {
    if (!recordingIntentRef.current) return;
    recordingIntentRef.current = false;
    const recorder = recorderRef.current;
    if (recorder?.state === "recording") recorder.stop();
  }

  function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentRoom = session.rooms.find((item) => item.publicId === roomPublicId);
    if (!currentRoom || !viewer) return;
    const activeMembers = currentRoom.members.filter((member) => !["removed", "banned"].includes(currentRoom.membershipStates[member.actorId] ?? "active")).length;
    const minutes = Math.min(Math.max(Math.round(Number(pollOpenMinutes)), 1), 240);
    const openMs = minutes * 60_000;
    const closesAt = new Date(Math.min(Date.now() + openMs, Date.parse(currentRoom.endsAt ?? new Date(Date.now() + openMs).toISOString()))).toISOString();
    const optionLabels = pollOptions.map((option) => option.trim()).filter(Boolean).slice(0, 5);
    const startsAt = Date.parse(itineraryStartsAt);
    const durationMinutes = Math.min(Math.max(Math.round(Number(itineraryDuration) / 5) * 5, 5), 720);
    const endsAt = startsAt + durationMinutes * 60_000;
    const itineraryItem: ItineraryItem | null = pollKind === "itinerary" && itineraryTitle.trim() && Number.isFinite(startsAt) && pollResponsible
      ? { id: `itinerary_${createUuid()}`, title: itineraryTitle.trim().slice(0, 80), description: "Created from a chat vote.", startsAt: new Date(startsAt).toISOString(), endsAt: new Date(endsAt).toISOString(), locationLabel: itineraryLocation.trim() || null, mapsUrl: null, responsible: pollResponsible, createdByActorId: viewer.actorId, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      : null;
    if (pollKind === "yes-no" && !pollQuestion.trim() || pollKind === "options" && (!pollQuestion.trim() || optionLabels.length < 2) || pollKind === "itinerary" && !itineraryItem) return;
    const newPoll: MockPoll = {
      id: `poll_${createUuid()}`,
      question: pollKind === "itinerary" ? `Add “${itineraryItem!.title}” to the itinerary?` : pollQuestion.trim().slice(0, 160),
      closesAt,
      memberSnapshot: activeMembers,
      requiredVotes: Math.floor(activeMembers / 2) + 1,
      visibility: anonymousPoll ? "anonymous" : "public",
      choices: pollKind === "options" ? optionLabels.map((label, index) => ({ id: `option_${index + 1}`, label: label.slice(0, 120), votes: 0 })) : [{ id: "yes", label: pollKind === "itinerary" ? "Add this plan" : "Yes", votes: 0 }, { id: "no", label: pollKind === "itinerary" ? "Not this time" : "No", votes: 0 }],
      voterActorIds: [], resolvedChoiceId: null, ...(itineraryItem ? { proposal: { kind: "itinerary" as const, item: itineraryItem } } : {}),
    };
    dispatch({ type: "COMMAND", command: { type: "CREATE_POLL", ...commandBase(), poll: newPoll } });
    setPollQuestion(""); setPollOptions(["", ""]); setItineraryTitle(""); setItineraryStartsAt(""); setItineraryLocation(""); setItineraryDuration("60"); setPollOpen(false);
  }

  function pollReady(kind: PollKind) {
    if (pollKind !== kind) return false;
    if (kind === "yes-no") return Boolean(pollQuestion.trim());
    if (kind === "options") return Boolean(pollQuestion.trim()) && pollOptions.filter((option) => option.trim()).length >= 2;
    return Boolean(itineraryTitle.trim()) && Boolean(itineraryStartsAt) && Number(itineraryDuration) >= 5;
  }

  function pollChoicePercent(targetPoll: MockPoll, votes: number) {
    const total = targetPoll.choices.reduce((sum, choice) => sum + choice.votes, 0);
    return total > 0 ? Math.round(votes / total * 100) : 0;
  }

  function castVote(targetPoll: MockPoll, choiceId: string) {
    markVoteSubmitted(targetPoll.id);
    dispatch({ type: "COMMAND", command: { type: "CAST_VOTE", ...commandBase(), choiceId } });
  }

  function renderVoteCard(targetPoll: MockPoll) {
    const active = poll?.id === targetPoll.id;
    const closed = Date.parse(targetPoll.closesAt) <= pollNow;
    const voted = targetPoll.voterActorIds.includes(session.viewer.actorId);
    const canCastVote = canVote && active && !voted && !targetPoll.resolvedChoiceId && !closed;
    const state = targetPoll.resolvedChoiceId ? "Resolved" : closed ? "Closed" : "Open";
    return <article key={targetPoll.id} className={roomStyles.poll}><header><span>{targetPoll.visibility === "anonymous" ? "Anonymous vote" : "Public vote"}</span><time>{state}</time></header><h2>{targetPoll.question}</h2>{targetPoll.choices.map((choice) => {
      const percent = pollChoicePercent(targetPoll, choice.votes);
      const showResults = voted || Boolean(targetPoll.resolvedChoiceId) || closed;
      return <button key={choice.id} className={targetPoll.resolvedChoiceId === choice.id ? roomStyles.pollSelected : ""} style={{ "--poll-progress": `${showResults ? percent : 0}%` } as CSSProperties} disabled={!canCastVote} onClick={() => castVote(targetPoll, choice.id)}><span><em>{choice.label}</em>{showResults ? <strong>{percent}%</strong> : null}</span><b>{choice.votes}</b></button>;
    })}<p>{targetPoll.memberSnapshot} members · {targetPoll.requiredVotes} votes needed{voted ? " · Your vote is counted" : ""}</p></article>;
  }

  function openPoll() { setPollOpen(true); setSearching(false); setToolTrayOpen(false); }
  function openVotes() { setVoteArchiveOpen(true); setSearching(false); setPollOpen(false); setToolTrayOpen(false); }
  function openSearch() { setSearching(true); setPollOpen(false); setToolTrayOpen(false); }
  function toolDisabled(id: ToolId) {
    if (id === "poll") return !canVote || Boolean(poll && !poll.resolvedChoiceId && Date.parse(poll.closesAt) > pollNow);
    return id === "votes" && !voteCards.length;
  }
  function activateTool(id: ToolId) {
    if (id === "camera") cameraInputRef.current?.click();
    else if (id === "album") albumInputRef.current?.click();
    else if (id === "location") shareCurrentLocation();
    else if (id === "poll") openPoll();
    else if (id === "votes") openVotes();
    else openSearch();
  }

  return <div className={styles.chatPanel}>
    <input ref={cameraInputRef} className={styles.hiddenInput} type="file" accept="image/*" capture="environment" onChange={chooseImage} />
    <input ref={albumInputRef} className={styles.hiddenInput} type="file" accept="image/*" onChange={chooseImage} />

    {searching ? <div className={styles.roomSearch}><Icon name="search" size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} placeholder="Search this room" /><button type="button" onClick={() => { setQuery(""); setSearching(false); }} aria-label="Close search"><Icon name="close" size={15} /></button></div> : null}

    {pollOpen ? <form className={roomStyles.pollComposer} onSubmit={createPoll} noValidate>
      <div className={roomStyles.pollTypeRail} aria-label="Poll type">
        {pollKinds.map((item) => <section key={item.kind} className={`${roomStyles.pollTypeCard} ${pollKind === item.kind ? roomStyles.pollTypeSelected : ""}`} onClick={() => setPollKind(item.kind)}>
          <header><span>{item.label}</span><button type="button" aria-label="Close poll composer" onClick={(event) => { event.stopPropagation(); setPollOpen(false); }}><Icon name="close" size={15} /></button></header>
          <div className={roomStyles.pollCardHero}><Icon name={item.kind === "itinerary" ? "calendar" : item.kind === "options" ? "list" : "check"} /><h2>{item.kind === "yes-no" ? "A clean yes, or a clean no." : item.kind === "options" ? "Let the room choose one path." : "Turn a plan into the schedule."}</h2><p>{item.summary}</p></div>
          {item.kind === "yes-no" ? <div className={roomStyles.pollFields}><label>Question<input value={pollKind === "yes-no" ? pollQuestion : ""} onChange={(event) => { setPollKind("yes-no"); setPollQuestion(event.target.value.slice(0, 160)); }} placeholder="Should we head out now?" /></label></div> : null}
          {item.kind === "options" ? <div className={roomStyles.pollFields}><label>Question<input value={pollKind === "options" ? pollQuestion : ""} onChange={(event) => { setPollKind("options"); setPollQuestion(event.target.value.slice(0, 160)); }} placeholder="Whose place tonight?" /></label><div className={roomStyles.pollOptionGrid}>{pollOptions.map((option, index) => <label key={index}>Option {index + 1}<input value={option} onChange={(event) => { setPollKind("options"); setPollOptions((current) => current.map((value, valueIndex) => valueIndex === index ? event.target.value.slice(0, 120) : value)); }} placeholder={index === 0 ? "A's place" : index === 1 ? "B's place" : "Another option"} /></label>)}</div>{pollOptions.length < 5 ? <button type="button" className={roomStyles.addPollOption} onClick={() => { setPollKind("options"); setPollOptions((current) => [...current, ""]); }}>Add option</button> : null}</div> : null}
          {item.kind === "itinerary" ? <div className={roomStyles.pollFields}><label>Plan<input value={itineraryTitle} onChange={(event) => { setPollKind("itinerary"); setItineraryTitle(event.target.value.slice(0, 80)); }} placeholder="Late dinner" /></label><div className={roomStyles.pollOptionGrid}><label>Start time<input type="datetime-local" value={itineraryStartsAt} onChange={(event) => { setPollKind("itinerary"); setItineraryStartsAt(event.target.value); }} /></label><label>Duration<input inputMode="numeric" value={itineraryDuration} onChange={(event) => { setPollKind("itinerary"); setItineraryDuration(event.target.value.replace(/\D/g, "").slice(0, 3)); }} placeholder="60" /></label></div><label>Responsible<select value={pollResponsible?.actorId ?? ""} onChange={(event) => { setPollKind("itinerary"); setPollResponsibleId(event.target.value); }}>{members.map((member) => <option value={member.actorId} key={member.actorId}>{member.displayName}{member.isGuest ? " · guest" : ""}</option>)}</select></label><label>Location<input value={itineraryLocation} onChange={(event) => { setPollKind("itinerary"); setItineraryLocation(event.target.value.slice(0, 120)); }} placeholder="Optional" /></label></div> : null}
          <footer><label className={roomStyles.pollDuration}><span>Open</span><input inputMode="numeric" value={pollOpenMinutes} onChange={(event) => setPollOpenMinutes(event.target.value.replace(/\D/g, "").slice(0, 3))} placeholder="30" /><span>min</span></label><label className={roomStyles.pollPrivacy}><button type="button" className={anonymousPoll ? roomStyles.pollPrivacyOn : ""} onClick={(event) => { event.stopPropagation(); setAnonymousPoll(!anonymousPoll); }}><i /></button><span>{anonymousPoll ? "Anonymous" : "Public"}</span></label><button type="submit" disabled={!pollReady(item.kind)}>Open poll</button></footer>
        </section>)}
      </div>
    </form> : null}

    <div ref={scrollRef} className={styles.chatScroll} onScroll={handleScroll} onPointerDown={() => { setToolTrayOpen(false); textareaRef.current?.blur(); }}>
      {pinned && !archived ? <button className={styles.pinned} onClick={() => document.getElementById(pinned.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}><span><Icon name="pin" size={13} />Pinned</span><strong>{messageLabel(pinned)}</strong><Icon name="chevron" size={14} /></button> : null}
      {visibleMessages.length ? visibleMessages.map((message, index) => {
        const previous = visibleMessages[index - 1];
        const showDay = !previous || dayKey(previous.sentAt, timeZone) !== dayKey(message.sentAt, timeZone);
        const own = message.isOwn || message.author?.actorId === session.viewer.actorId || message.author?.actorId === viewerActorId;
        const grouped = Boolean(previous && previous.kind === "message" && message.kind === "message" && previous.author?.actorId === message.author?.actorId && Date.parse(message.sentAt) - Date.parse(previous.sentAt) < 3 * 60_000 && !showDay);
        return <div key={message.id} id={message.id} className={styles.messageSlot}>
          {showDay ? <p className={styles.dayLabel}>{formatDay(message.sentAt, timeZone)}</p> : null}
          {message.kind === "system" ? <p className={styles.systemMessage}>{message.body}</p> : <ChatMessageItem message={message} own={own} grouped={grouped} timeZone={timeZone} replyBody={message.replyToId ? messageLabel(messages.find((item) => item.id === message.replyToId) ?? message) : null} onPointerDown={beginMessagePress} onPointerMove={moveMessagePress} onPointerEnd={endMessagePress} onContextMenu={(event, target) => { event.preventDefault(); setSelectedMessageId(target.id); }} onOpenImage={openImage} />}
        </div>;
      }) : <div className={styles.empty}><p>{query ? "No messages found." : "No messages yet."}</p></div>}
      {poll && showInlinePoll ? renderVoteCard(poll) : null}
    </div>

    {!atBottom ? <button type="button" className={styles.latestButton} onClick={() => scrollToLatest(true)} aria-label="Jump to latest messages"><Icon name="chevron" size={15} />{unreadCount ? <b>{unreadCount}</b> : null}</button> : null}

    {archived ? <div className={styles.readOnly}><Icon name="check" size={15} />This room is archived and read-only.</div> : <form className={`${styles.composer} ${recording ? styles.composerRecording : ""}`} onSubmit={(event) => { event.preventDefault(); postMessage(draft); }}>
      {replyTo ? <div className={styles.replyPreview}><span><b>Replying to</b>{messageLabel(messages.find((message) => message.id === replyTo)!)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><Icon name="close" size={14} /></button></div> : null}
      <button type="button" className={styles.addButton} aria-label="Open attachments" aria-expanded={toolTrayOpen} onClick={() => { setToolTrayOpen(true); textareaRef.current?.blur(); }}><Icon name="plus" size={18} /></button>
      <div className={styles.inputShell}>
        {recording ? <div className={`${styles.recordingStatus} ${recordingCanceled ? styles.recordingWillCancel : ""}`}><i /><time>0:{String(recordingSeconds).padStart(2, "0")}</time><span>{recordingCanceled ? "Release to cancel" : "Slide left to cancel"}</span></div> : <textarea ref={textareaRef} rows={1} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} placeholder={canChat ? "Message" : "You can’t send messages"} disabled={!canChat} maxLength={2000} aria-label="Message everyone" />}
      </div>
      {draft.trim() ? <button className={styles.sendButton} type="submit" disabled={!canChat} aria-label="Send message"><Icon name="send" size={16} /></button> : <button type="button" className={`${styles.voiceButton} ${recording ? styles.voiceButtonRecording : ""}`} disabled={!canChat} aria-label="Hold to record" onPointerDown={beginRecording} onPointerMove={moveRecording} onPointerUp={endRecording} onPointerCancel={() => { recordingCanceledRef.current = true; endRecording(); }} onContextMenu={(event) => event.preventDefault()}><Icon name="voice" size={17} /></button>}
    </form>}

    {typeof document !== "undefined" && toolTrayOpen ? createPortal(<div className={styles.sheetBackdrop} onPointerDown={() => setToolTrayOpen(false)}><section className={styles.toolSheet} aria-label="Chat attachments" onPointerDown={(event) => event.stopPropagation()}><i className={styles.sheetHandle} /><div>{chatTools.map((tool) => <button type="button" key={tool.id} onClick={() => activateTool(tool.id)} disabled={toolDisabled(tool.id)}><span><Icon name={tool.icon} size={21} /></span><b>{tool.label}</b></button>)}</div></section></div>, document.body) : null}

    {typeof document !== "undefined" && selectedMessage ? createPortal(<div className={styles.sheetBackdrop} onPointerDown={() => setSelectedMessageId(null)}><section className={styles.messageSheet} aria-label="Message actions" onPointerDown={(event) => event.stopPropagation()}><div className={styles.quickReactions}>{["♥", "👍", "✨"].map((emoji) => <button key={emoji} type="button" onClick={() => messageCommand("REACT_MESSAGE", selectedMessage.id, emoji)}>{emoji}</button>)}</div><div className={styles.actionList}>
      <button type="button" onClick={() => { setReplyTo(selectedMessage.id); setSelectedMessageId(null); textareaRef.current?.focus(); }}><Icon name="reply" />Reply</button>
      <button type="button" onClick={() => void copyMessage(selectedMessage)}><Icon name="copy" />Copy</button>
      {selectedMessage.content?.type === "image" ? <><button type="button" onClick={() => addImageToBoard(selectedMessage)}><Icon name="board" />Add to board</button><button type="button" onClick={() => downloadImage(selectedMessage)}><Icon name="image" />Save photo</button></> : null}
      {canModerate ? <button type="button" onClick={() => messageCommand("PIN_MESSAGE", selectedMessage.id)}><Icon name="pin" />Pin message</button> : null}
      {selectedMessage.author?.actorId === session.viewer.actorId ? <button type="button" className={styles.dangerAction} onClick={() => messageCommand("DELETE_OWN_MESSAGE", selectedMessage.id)}><Icon name="trash" />Delete</button> : canModerate ? <button type="button" className={styles.dangerAction} onClick={() => messageCommand("DELETE_MESSAGE", selectedMessage.id)}><Icon name="trash" />Delete for room</button> : null}
    </div></section></div>, document.body) : null}

    {typeof document !== "undefined" && pendingImage ? createPortal(<div className={styles.mediaComposer}><header><button type="button" onClick={() => setPendingImage(null)} aria-label="Close photo preview"><Icon name="close" /></button><span>Photo</span><button type="button" onClick={sendPendingImage} aria-label="Send photo"><Icon name="send" /></button></header><div className={styles.mediaPreview} style={{ aspectRatio: pendingImage.aspectRatio }}><NextImage src={pendingImage.dataUrl} alt="Photo preview" fill sizes="100vw" unoptimized /></div><input value={imageCaption} onChange={(event) => setImageCaption(event.target.value.slice(0, 500))} placeholder="Add a caption…" aria-label="Photo caption" /></div>, document.body) : null}

    {typeof document !== "undefined" && viewerImage?.content?.type === "image" ? createPortal(<div className={styles.imageViewer} onClick={() => setImageViewerId(null)}><button type="button" onClick={() => setImageViewerId(null)} aria-label="Close photo"><Icon name="close" /></button><NextImage src={viewerImage.content.dataUrl} alt={viewerImage.body || viewerImage.content.name || "Shared photo"} width={1600} height={1600} sizes="100vw" unoptimized onClick={(event) => event.stopPropagation()} /></div>, document.body) : null}

    {typeof document !== "undefined" && voteArchiveOpen ? createPortal(<div className={roomStyles.voteOverlay} role="dialog" aria-modal="true" aria-label="All vote cards"><header><div><p>Votes</p><h2>Room decisions</h2></div><button type="button" aria-label="Close vote cards" onClick={() => setVoteArchiveOpen(false)}><Icon name="close" size={16} /></button></header><div className={roomStyles.voteGrid}>{voteCards.length ? voteCards.map((item) => renderVoteCard(item)) : <div className={roomStyles.panelEmpty}><p>No vote cards yet.</p></div>}</div></div>, document.body) : null}

    {notice ? <button type="button" className={styles.notice} onClick={() => setNotice(null)}>{notice}</button> : null}
  </div>;
}
