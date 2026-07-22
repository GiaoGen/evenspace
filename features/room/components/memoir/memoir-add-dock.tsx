"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ChatMessage, MemoirPaperStyle } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import styles from "./memoir.module.css";

type Source = "album" | "text" | "paper" | null;

const paperStyles: readonly { readonly value: MemoirPaperStyle; readonly label: string; readonly detail: string }[] = [
  { value: "ivory", label: "Ivory", detail: "Warm, quiet paper" },
  { value: "linen", label: "Linen", detail: "A fine woven grain" },
  { value: "sage", label: "Sage", detail: "Muted garden green" },
  { value: "sky", label: "Sky", detail: "Soft washed blue" },
];

export function MemoirEditorToolbar({ messages, usedPhotoAssetIds, targetPage, error, onSelectChatPhoto, onAddText, onSelectPhoto, onPaperStyle }: {
  readonly messages: readonly ChatMessage[];
  readonly usedPhotoAssetIds: ReadonlySet<string>;
  readonly targetPage: number;
  readonly error: string | null;
  readonly onSelectChatPhoto: (message: ChatMessage) => void;
  readonly onAddText: (text: string, source?: ChatMessage) => void;
  readonly onSelectPhoto: (file: File) => void;
  readonly onPaperStyle: (style: MemoirPaperStyle) => void;
}) {
  const cameraInputRef = useRef<HTMLInputElement | null>(null);
  const albumInputRef = useRef<HTMLInputElement | null>(null);
  const [source, setSource] = useState<Source>(null);
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState("");
  const availablePhotos = messages.filter((message) => message.content?.type === "image" && !usedPhotoAssetIds.has(message.content.asset.id));
  const textMessages = messages.filter((message) => message.kind === "message" && message.body.trim());

  function closeSource() {
    setSource(null);
    setComposing(false);
    setDraft("");
  }

  function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    onSelectPhoto(file);
    closeSource();
  }

  function addText() {
    const text = draft.trim();
    if (!text) return;
    onAddText(text);
    closeSource();
  }

  return <>
    <input ref={cameraInputRef} className={styles.hiddenInput} type="file" accept="image/*" capture="environment" onChange={upload} />
    <input ref={albumInputRef} className={styles.hiddenInput} type="file" accept="image/*" onChange={upload} />
    {source ? <div className={styles.sourceBackdrop} onPointerDown={(event) => { if (event.target === event.currentTarget) closeSource(); }}>
      <section className={styles.sourceSheet} aria-label={`${source} source`}>
        <header className={styles.sourceHeader}><div><span>Page {targetPage}</span><h2>{source === "album" ? "Choose a photo" : source === "text" ? "Keep a message" : "Choose the paper"}</h2></div><button type="button" onClick={closeSource} aria-label="Close source"><Icon name="close" /></button></header>
        {source === "album" ? <div className={styles.sourceScroll}>
          <button type="button" className={styles.newSourceAction} onClick={() => albumInputRef.current?.click()}><Icon name="image" /><span><strong>Choose another photo</strong><small>From this device</small></span><Icon name="chevron" size={15} /></button>
          <div className={styles.photoSourceGrid}>{availablePhotos.map((message) => message.content?.type === "image" ? <button type="button" key={message.id} onClick={() => { onSelectChatPhoto(message); closeSource(); }}><LocalAssetImage asset={message.content.asset} alt={message.body || message.content.name} fill sizes="45vw" /><span>{message.author?.displayName ?? "Room member"}</span></button> : null)}</div>
          {!availablePhotos.length ? <div className={styles.emptySource}><strong>Everything from chat is already here.</strong><span>You can still choose a new photo from this device.</span></div> : null}
        </div> : null}
        {source === "text" ? <div className={styles.sourceScroll}>
          {composing ? <div className={styles.textComposerCard}><textarea value={draft} maxLength={500} autoFocus onChange={(event) => setDraft(event.target.value)} placeholder="Write a memory..." /><footer><button type="button" onClick={() => { setComposing(false); setDraft(""); }}>Cancel</button><button type="button" disabled={!draft.trim()} onClick={addText}>Add to page</button></footer></div> : <button type="button" className={styles.newSourceAction} onClick={() => setComposing(true)}><Icon name="text" /><span><strong>Write something new</strong><small>A note just for this page</small></span><Icon name="chevron" size={15} /></button>}
          <div className={styles.textSourceList}>{textMessages.map((message) => <button type="button" key={message.id} onClick={() => { onAddText(message.body, message); closeSource(); }}><p>{message.body}</p><span>{message.author?.displayName ?? "Room member"}</span></button>)}</div>
          {!textMessages.length ? <div className={styles.emptySource}><strong>No text messages yet.</strong><span>Write the first note for this page.</span></div> : null}
        </div> : null}
        {source === "paper" ? <div className={`${styles.sourceScroll} ${styles.paperSourceList}`}>{paperStyles.map((paper) => <button type="button" key={paper.value} className={styles[`paperChoice${paper.value}`]} onClick={() => { onPaperStyle(paper.value); closeSource(); }}><i /><span><strong>{paper.label}</strong><small>{paper.detail}</small></span><Icon name="chevron" size={15} /></button>)}</div> : null}
      </section>
    </div> : null}
    {error ? <div className={styles.memoirToast} role="status">{error}</div> : null}
    <div className={styles.editorTools} aria-label={`Add to page ${targetPage}`}>
      <button type="button" onClick={() => setSource("album")} aria-label="Open album sources"><Icon name="image" /><span>Album</span></button>
      <button type="button" onClick={() => cameraInputRef.current?.click()} aria-label="Open camera"><Icon name="camera" /><span>Camera</span></button>
      <button type="button" onClick={() => setSource("text")} aria-label="Open text sources"><Icon name="text" /><span>Text</span></button>
      <button type="button" onClick={() => setSource("paper")} aria-label="Choose paper style"><Icon name="grid" /><span>Paper</span></button>
    </div>
  </>;
}
