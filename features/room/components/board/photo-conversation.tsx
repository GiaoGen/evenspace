"use client";

import { useState, type FormEvent, type PointerEvent } from "react";
import type { BoardPhoto, PersonSummary } from "@/core/domain/room";
import styles from "./board.module.css";

export function PhotoConversation({ photo, owner, onComment }: { readonly photo: BoardPhoto; readonly owner: PersonSummary | null; readonly onComment: (body: string) => void }) {
  const [draft, setDraft] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.trim()) return;
    onComment(draft.trim().slice(0, 120));
    setDraft("");
  }

  function keepFocus(event: PointerEvent<HTMLElement>) {
    event.stopPropagation();
  }

  return <div className={styles.photoConversation} onPointerDown={keepFocus} onPointerMove={keepFocus} onPointerUp={keepFocus}>
    <div className={styles.photoAuthor}><b>{owner?.initials ?? "?"}</b><span>{owner?.displayName ?? "Member"}</span></div>
    {photo.comments?.length ? <div className={styles.commentBarrage} aria-label="Photo comments">
      {photo.comments.map((comment, index) => <span key={comment.id} style={{ animationDelay: `${index * 920}ms`, top: `${19 + index % 3 * 21}%` }}>{comment.body}</span>)}
    </div> : null}
    <form className={styles.photoCommentComposer} onSubmit={submit}>
      <input value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} placeholder="Write a comment" aria-label="Write a photo comment" />
      <button type="submit" disabled={!draft.trim()} aria-label="Send comment">Send</button>
    </form>
  </div>;
}
