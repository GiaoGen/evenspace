"use client";

import { useEffect, useRef, useState, type MouseEvent, type PointerEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ChatMessage } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import { useLocalAssetUrl } from "@/features/local-assets/components/use-local-asset-url";
import styles from "./chat-panel.module.css";

interface ChatMessageItemProps {
  readonly message: ChatMessage;
  readonly own: boolean;
  readonly grouped: boolean;
  readonly timeZone: string;
  readonly replyBody: string | null;
  readonly onPointerDown: (event: PointerEvent<HTMLElement>, message: ChatMessage) => void;
  readonly onPointerMove: (event: PointerEvent<HTMLElement>) => void;
  readonly onPointerEnd: () => void;
  readonly onContextMenu: (event: MouseEvent<HTMLElement>, message: ChatMessage) => void;
  readonly onOpenImage: (message: ChatMessage) => void;
}

const formatTime = (value: string, timeZone: string) => new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone }).format(new Date(value));

function VoiceMessage({ message }: { readonly message: ChatMessage }) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const voice = message.content?.type === "voice" ? message.content : null;
  const voiceUrl = useLocalAssetUrl(voice?.asset);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const sync = () => setProgress(audio.duration > 0 ? audio.currentTime / audio.duration : 0);
    const stop = () => { setPlaying(false); setProgress(0); };
    audio.addEventListener("timeupdate", sync);
    audio.addEventListener("ended", stop);
    return () => {
      audio.removeEventListener("timeupdate", sync);
      audio.removeEventListener("ended", stop);
    };
  }, []);

  if (!voice) return null;
  const toggle = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.paused) {
      try { await audio.play(); setPlaying(true); } catch { setPlaying(false); }
    } else {
      audio.pause();
      setPlaying(false);
    }
  };

  return <div className={styles.voiceMessage}>
    <audio ref={audioRef} src={voiceUrl ?? undefined} preload="metadata" />
    <button type="button" onClick={toggle} aria-label={playing ? "Pause voice message" : "Play voice message"}><Icon name={playing ? "pause" : "arrow"} size={14} /></button>
    <span className={styles.voiceTrack}><i style={{ transform: `scaleX(${progress})` }} /></span>
    <time>0:{String(voice.durationSeconds).padStart(2, "0")}</time>
  </div>;
}

export function ChatMessageItem({ message, own, grouped, timeZone, replyBody, onPointerDown, onPointerMove, onPointerEnd, onContextMenu, onOpenImage }: ChatMessageItemProps) {
  const content = message.content;
  const className = [styles.message, own ? styles.ownMessage : "", grouped ? styles.groupedMessage : ""].filter(Boolean).join(" ");

  return <article
    className={className}
    onPointerDown={(event) => onPointerDown(event, message)}
    onPointerMove={onPointerMove}
    onPointerUp={onPointerEnd}
    onPointerCancel={onPointerEnd}
    onContextMenu={(event) => onContextMenu(event, message)}
  >
    <span className={styles.messageAvatar} aria-hidden={grouped}>{grouped ? "" : message.author?.initials ?? "?"}</span>
    <div className={styles.messageBody}>
      {!grouped ? <p className={styles.messageMeta}><strong>{own ? "You" : message.author?.displayName}</strong><time>{formatTime(message.sentAt, timeZone)}</time></p> : null}
      <div className={`${styles.bubble} ${content ? styles.mediaBubble : ""}`}>
        {replyBody ? <span className={styles.replyQuote}>Replying to {replyBody}</span> : null}
        {content?.type === "image" ? <button type="button" className={styles.chatImage} style={{ aspectRatio: content.aspectRatio }} onClick={() => onOpenImage(message)} aria-label={`Open ${content.name || "photo"}`}>
          <LocalAssetImage asset={content.asset} alt={message.body || "Shared photo"} fill sizes="(max-width: 600px) 78vw, 420px" />
        </button> : null}
        {content?.type === "location" ? <a className={styles.locationMessage} href={`https://www.openstreetmap.org/?mlat=${content.latitude}&mlon=${content.longitude}#map=16/${content.latitude}/${content.longitude}`} target="_blank" rel="noreferrer">
          <span><Icon name="location" size={19} /></span><strong>{content.label}</strong><small>{content.latitude.toFixed(4)}, {content.longitude.toFixed(4)}</small>
        </a> : null}
        {content?.type === "voice" ? <VoiceMessage message={message} /> : null}
        {message.body ? <p>{message.body}</p> : null}
      </div>
      {message.reactions.length ? <div className={styles.reactions}>{message.reactions.map((reaction) => <span key={reaction.emoji}>{reaction.emoji} {reaction.count}</span>)}</div> : null}
    </div>
  </article>;
}
