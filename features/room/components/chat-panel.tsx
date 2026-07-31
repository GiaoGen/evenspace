"use client";

import NextImage from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent, type PointerEvent, type UIEvent } from "react";
import { createPortal } from "react-dom";
import { Icon, type IconName } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ChatMessage, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { useLocalAssetUrl } from "@/features/local-assets/components/use-local-asset-url";
import { getLocalAssetBlob, saveLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { ChatMessageItem } from "./chat-message";
import styles from "./chat-panel.module.css";

interface ChatPanelProps {
  readonly roomPublicId: RoomPublicId;
  readonly messages: readonly ChatMessage[];
  readonly pinnedMessageId: string | null;
  readonly members: readonly PersonSummary[];
  readonly viewerActorId: ActorId;
  readonly cacheScope?: string;
  readonly timeZone: string;
  readonly canChat: boolean;
  readonly canModerate: boolean;
  readonly archived: boolean;
  readonly dataState?: "loading" | "ready" | "stale" | "error";
}

type ToolId = "search";
type Tool = { readonly id: ToolId; readonly label: string; readonly icon: IconName };

const LONG_PRESS_MS = 380;
const MAX_VOICE_BYTES = 900_000;
const chatTools: readonly Tool[] = [
  { id: "search", label: "Search", icon: "search" },
];

const formatDay = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone }).format(new Date(value));
const dayKey = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone }).format(new Date(value));
const messageLabel = (message?: ChatMessage) => message?.body || (message?.content?.type === "image" ? "Photo" : message?.content?.type === "location" ? message.content.label : message?.content?.type === "voice" ? "Voice message" : "Message");
function preferredAudioMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  return ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

export function ChatPanel({ roomPublicId, messages, pinnedMessageId, members, viewerActorId, cacheScope = viewerActorId, timeZone, canChat, canModerate, archived, dataState = "ready" }: ChatPanelProps) {
  const { session, dispatch } = useMockSession();
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [toolTrayOpen, setToolTrayOpen] = useState(false);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [selectedMessageId, setSelectedMessageId] = useState<string | null>(null);
  const [imageViewerId, setImageViewerId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recordingCanceled, setRecordingCanceled] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
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

  const viewer = useMemo(() => members.find((member) => member.actorId === viewerActorId) ?? null, [members, viewerActorId]);
  const pinned = messages.find((message) => message.id === pinnedMessageId);
  const selectedMessage = messages.find((message) => message.id === selectedMessageId) ?? null;
  const viewerImage = messages.find((message) => message.id === imageViewerId && message.content?.type === "image") ?? null;
  const viewerImageUrl = useLocalAssetUrl(viewerImage?.content?.type === "image" ? viewerImage.content.asset : null);
  const visibleMessages = useMemo(() => query.trim() ? messages.filter((message) => `${messageLabel(message)} ${message.author?.displayName ?? ""}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())) : messages, [messages, query]);

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

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    postMessage(draft);
    textareaRef.current?.focus({ preventScroll: true });
    window.requestAnimationFrame(() => textareaRef.current?.focus({ preventScroll: true }));
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
    dispatch({ type: "COMMAND", command: { type: "ADD_BOARD_ITEM", ...commandBase(), item: { id: `board_photo_${createUuid()}`, kind: "photo", ownerActorId: session.viewer.actorId, variant: "one", asset: message.content.asset, imageName: message.content.name, aspectRatio: message.content.aspectRatio, note: message.body || null, x: 36, y: 28, rotation: -2, width: 25 } } });
    setSelectedMessageId(null);
    setNotice("Added to photos");
  }

  async function downloadImage(message: ChatMessage) {
    if (message.content?.type !== "image") return;
    const blob = await getLocalAssetBlob(message.content.asset);
    if (!blob) { setNotice("This photo is no longer available locally."); return; }
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = message.content.name || "eventspace-photo.jpg";
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setSelectedMessageId(null);
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
          if (blob.size > MAX_VOICE_BYTES) throw new Error("This recording is too large for local chat storage.");
          const asset = await saveLocalAsset(blob, "audio");
          postMessage("", { type: "voice", durationSeconds, asset });
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

  function openSearch() { setSearching(true); setToolTrayOpen(false); }
  function toolDisabled() {
    return false;
  }
  function activateTool() {
    openSearch();
  }

  return <div className={styles.chatPanel}>
    {searching ? <div className={styles.roomSearch}><Icon name="search" size={15} /><input autoFocus value={query} onChange={(event) => setQuery(event.target.value.slice(0, 80))} placeholder="Search this room" /><button type="button" onClick={() => { setQuery(""); setSearching(false); }} aria-label="Close search"><Icon name="close" size={15} /></button></div> : null}



    <div ref={scrollRef} className={styles.chatScroll} onScroll={handleScroll} onPointerDown={() => { setToolTrayOpen(false); textareaRef.current?.blur(); }}>
      {pinned && !archived ? <button className={styles.pinned} onClick={() => document.getElementById(pinned.id)?.scrollIntoView({ behavior: "smooth", block: "center" })}><span><Icon name="pin" size={13} />Pinned</span><strong>{messageLabel(pinned)}</strong><Icon name="chevron" size={14} /></button> : null}
      {visibleMessages.length ? visibleMessages.map((message, index) => {
        const previous = visibleMessages[index - 1];
        const showDay = !previous || dayKey(previous.sentAt, timeZone) !== dayKey(message.sentAt, timeZone);
        const own = message.isOwn || message.author?.actorId === session.viewer.actorId || message.author?.actorId === viewerActorId;
        const grouped = Boolean(previous && previous.kind === "message" && message.kind === "message" && previous.author?.actorId === message.author?.actorId && Date.parse(message.sentAt) - Date.parse(previous.sentAt) < 3 * 60_000 && !showDay);
        return <div key={message.id} id={message.id} className={styles.messageSlot}>
          {showDay ? <p className={styles.dayLabel}>{formatDay(message.sentAt, timeZone)}</p> : null}
          {message.kind === "system" ? <p className={styles.systemMessage}>{message.body}</p> : <ChatMessageItem message={message} own={own} grouped={grouped} timeZone={timeZone} cacheScope={cacheScope} replyBody={message.replyToId ? messageLabel(messages.find((item) => item.id === message.replyToId) ?? message) : null} onPointerDown={beginMessagePress} onPointerMove={moveMessagePress} onPointerEnd={endMessagePress} onContextMenu={(event, target) => { event.preventDefault(); setSelectedMessageId(target.id); }} onOpenImage={openImage} />}
        </div>;
      }) : dataState === "loading" ? <div className={styles.chatLoading} aria-label="Restoring messages"><i /><i /><i /></div> : <div className={styles.empty}><p>{query ? "No messages found." : dataState === "error" ? "Messages are temporarily unavailable." : "No messages yet."}</p></div>}
    </div>

    {!atBottom ? <button type="button" className={styles.latestButton} onClick={() => scrollToLatest(true)} aria-label="Jump to latest messages"><Icon name="chevron" size={15} />{unreadCount ? <b>{unreadCount}</b> : null}</button> : null}

    {archived ? <div className={styles.readOnly}><Icon name="check" size={15} />This room is archived and read-only.</div> : <form className={`${styles.composer} ${recording ? styles.composerRecording : ""}`} onSubmit={submitMessage}>
      {replyTo ? <div className={styles.replyPreview}><span><b>Replying to</b>{messageLabel(messages.find((message) => message.id === replyTo)!)}</span><button type="button" onClick={() => setReplyTo(null)} aria-label="Cancel reply"><Icon name="close" size={14} /></button></div> : null}
      <button type="button" className={styles.addButton} aria-label="Open attachments" aria-expanded={toolTrayOpen} onClick={() => { setToolTrayOpen(true); textareaRef.current?.blur(); }}><Icon name="plus" size={18} /></button>
      <div className={styles.inputShell}>
        {recording ? <div className={`${styles.recordingStatus} ${recordingCanceled ? styles.recordingWillCancel : ""}`}><i /><time>0:{String(recordingSeconds).padStart(2, "0")}</time><span>{recordingCanceled ? "Release to cancel" : "Slide left to cancel"}</span></div> : <textarea ref={textareaRef} rows={1} value={draft} onChange={(event) => setDraft(event.target.value.slice(0, 2000))} placeholder={canChat ? "Message" : "You can’t send messages"} disabled={!canChat} maxLength={2000} aria-label="Message everyone" />}
      </div>
      {draft.trim() ? <button className={styles.sendButton} type="submit" disabled={!canChat} aria-label="Send message"><Icon name="send" size={16} /></button> : <button type="button" className={`${styles.voiceButton} ${recording ? styles.voiceButtonRecording : ""}`} disabled={!canChat} aria-label="Hold to record" onPointerDown={beginRecording} onPointerMove={moveRecording} onPointerUp={endRecording} onPointerCancel={() => { recordingCanceledRef.current = true; endRecording(); }} onContextMenu={(event) => event.preventDefault()}><Icon name="voice" size={17} /></button>}
    </form>}

    {typeof document !== "undefined" && toolTrayOpen ? createPortal(<div className={styles.sheetBackdrop} onPointerDown={() => setToolTrayOpen(false)}><section className={styles.toolSheet} aria-label="Chat attachments" onPointerDown={(event) => event.stopPropagation()}><i className={styles.sheetHandle} /><div>{chatTools.map((tool) => <button type="button" key={tool.id} onClick={activateTool} disabled={toolDisabled()}><span><Icon name={tool.icon} size={21} /></span><b>{tool.label}</b></button>)}</div></section></div>, document.body) : null}

    {typeof document !== "undefined" && selectedMessage ? createPortal(<div className={styles.sheetBackdrop} onPointerDown={() => setSelectedMessageId(null)}><section className={styles.messageSheet} aria-label="Message actions" onPointerDown={(event) => event.stopPropagation()}><div className={styles.quickReactions}>{["♥", "👍", "✨"].map((emoji) => <button key={emoji} type="button" onClick={() => messageCommand("REACT_MESSAGE", selectedMessage.id, emoji)}>{emoji}</button>)}</div><div className={styles.actionList}>
      <button type="button" onClick={() => { setReplyTo(selectedMessage.id); setSelectedMessageId(null); textareaRef.current?.focus(); }}><Icon name="reply" />Reply</button>
      <button type="button" onClick={() => void copyMessage(selectedMessage)}><Icon name="copy" />Copy</button>
      {selectedMessage.content?.type === "image" ? <><button type="button" onClick={() => addImageToBoard(selectedMessage)}><Icon name="image" />Add to photos</button><button type="button" onClick={() => downloadImage(selectedMessage)}><Icon name="image" />Save photo</button></> : null}
      {canModerate ? <button type="button" onClick={() => messageCommand("PIN_MESSAGE", selectedMessage.id)}><Icon name="pin" />Pin message</button> : null}
      {selectedMessage.author?.actorId === session.viewer.actorId ? <button type="button" className={styles.dangerAction} onClick={() => messageCommand("DELETE_OWN_MESSAGE", selectedMessage.id)}><Icon name="trash" />Delete</button> : canModerate ? <button type="button" className={styles.dangerAction} onClick={() => messageCommand("DELETE_MESSAGE", selectedMessage.id)}><Icon name="trash" />Delete for room</button> : null}
    </div></section></div>, document.body) : null}

    {typeof document !== "undefined" && viewerImage?.content?.type === "image" && viewerImageUrl ? createPortal(<div className={styles.imageViewer} onClick={() => setImageViewerId(null)}><button type="button" onClick={() => setImageViewerId(null)} aria-label="Close photo"><Icon name="close" /></button><NextImage src={viewerImageUrl} alt={viewerImage.body || viewerImage.content.name || "Shared photo"} width={1600} height={1600} sizes="100vw" unoptimized onClick={(event) => event.stopPropagation()} /></div>, document.body) : null}


    {notice ? <button type="button" className={styles.notice} onClick={() => setNotice(null)}>{notice}</button> : null}
  </div>;
}
