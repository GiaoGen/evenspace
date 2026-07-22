"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import type { BoardComment, BoardPhoto, PersonSummary } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import { type PhotoNavigationDirection, usePhotoSwipe } from "./use-photo-swipe";
import styles from "./board.module.css";

function formatCommentTime(value: string) {
  return new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

export function PhotoDetailViewer({ photo, photos, comments, members, canDelete, onClose, onPhotoChange, onComment, onDelete }: {
  readonly photo: BoardPhoto;
  readonly photos: readonly BoardPhoto[];
  readonly comments: readonly BoardComment[];
  readonly members: readonly PersonSummary[];
  readonly canDelete: boolean;
  readonly onClose: () => void;
  readonly onPhotoChange: (photoId: string) => void;
  readonly onComment: (body: string) => void;
  readonly onDelete: () => void;
}) {
  const [draft, setDraft] = useState("");
  const [mounted, setMounted] = useState(false);
  const [motionDirection, setMotionDirection] = useState<PhotoNavigationDirection | null>(null);
  const composerInputRef = useRef<HTMLInputElement | null>(null);
  const owner = members.find((member) => member.actorId === (photo.sourceActorId ?? photo.ownerActorId)) ?? null;
  const photoIndex = photos.findIndex((item) => item.id === photo.id);
  const previousPhoto = photoIndex > 0 ? photos[photoIndex - 1] : null;
  const nextPhoto = photoIndex >= 0 && photoIndex < photos.length - 1 ? photos[photoIndex + 1] : null;

  const changePhoto = useCallback((direction: PhotoNavigationDirection) => {
    const target = direction === -1 ? previousPhoto : nextPhoto;
    if (!target) return;
    setMotionDirection(direction);
    setDraft("");
    composerInputRef.current?.blur();
    onPhotoChange(target.id);
  }, [nextPhoto, onPhotoChange, previousPhoto]);
  const { navigate, mediaProps, photoStyle } = usePhotoSwipe({ canGoPrevious: Boolean(previousPhoto), canGoNext: Boolean(nextPhoto), onNavigate: changePhoto });

  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowLeft") navigate(-1);
      if (event.key === "ArrowRight") navigate(1);
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [navigate, onClose]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    onComment(body.slice(0, 120));
    setDraft("");
  }

  if (!mounted) return null;
  return createPortal(
    <div className={styles.photoDetailBackdrop} role="dialog" aria-modal="true" aria-label="Photo and comments" onPointerDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className={styles.photoDetail}>
        <div className={styles.photoDetailToolbar}>
          <button type="button" onClick={onClose} aria-label="Close photo"><Icon name="close" /></button>
          <span className={styles.photoDetailPosition} aria-live="polite">{photoIndex + 1} / {photos.length}</span>
          {canDelete ? <button type="button" className={styles.photoDetailDelete} onClick={onDelete} aria-label="Delete photo"><Icon name="trash" /></button> : <span />}
        </div>
        <div className={styles.photoDetailMedia} {...mediaProps}>
          <button type="button" className={`${styles.photoDetailArrow} ${styles.photoDetailPrevious}`} disabled={!previousPhoto} onClick={() => navigate(-1)} aria-label="Previous photo"><Icon name="chevron" /></button>
          <div key={photo.id} className={motionDirection === -1 ? styles.photoEnterFromLeft : motionDirection === 1 ? styles.photoEnterFromRight : undefined} style={photoStyle}>
            <div className={styles.photoDetailCanvas}>
              {photo.asset ? <LocalAssetImage asset={photo.asset} alt={photo.imageName ? `Photo: ${photo.imageName}` : "Room photo"} fill sizes="(max-width: 700px) 100vw, 620px" className={styles.photoDetailObject} /> : <PinnedPhoto variant={photo.variant} note={null} bare className={styles.photoDetailImage} />}
            </div>
          </div>
          <button type="button" className={`${styles.photoDetailArrow} ${styles.photoDetailNext}`} disabled={!nextPhoto} onClick={() => navigate(1)} aria-label="Next photo"><Icon name="chevron" /></button>
        </div>
        <div className={styles.photoDetailConversation}>
          <header className={styles.photoDetailAuthor}><b>{owner?.initials ?? "?"}</b><span><strong>{owner?.displayName ?? "Member"}</strong><small>Shared this photo</small></span></header>
          <div className={styles.photoCommentList} aria-label="Photo comments">
            {comments.length ? comments.map((comment) => {
              const author = members.find((member) => member.actorId === comment.actorId) ?? null;
              return <article key={comment.id} className={comment.kind === "caption" ? styles.pinnedCaption : undefined}><b>{author?.initials ?? "?"}</b><div><header><strong>{author?.displayName ?? "Member"}</strong><time>{comment.kind === "caption" ? "Caption" : formatCommentTime(comment.createdAt)}</time></header><p>{comment.body}</p></div></article>;
            }) : <div className={styles.photoCommentEmpty}><strong>No comments yet.</strong><span>Leave the first note below.</span></div>}
          </div>
          <form className={styles.photoDetailComposer} onSubmit={submit}>
            <input ref={composerInputRef} value={draft} maxLength={120} onChange={(event) => setDraft(event.target.value)} placeholder="Write a comment" aria-label="Write a photo comment" />
            <button type="submit" disabled={!draft.trim()} aria-label="Send comment"><Icon name="send" size={17} /></button>
          </form>
        </div>
      </section>
    </div>,
    document.body,
  );
}
