"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import type { ChatMessage } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import styles from "./memoir.module.css";

export type PendingMemoirPhoto =
  | { readonly source: "local"; readonly file: File; readonly previewUrl: string }
  | { readonly source: "chat"; readonly message: ChatMessage };

export function MemoirPhotoCaption({ pending, onClose, onConfirm }: {
  readonly pending: PendingMemoirPhoto;
  readonly onClose: () => void;
  readonly onConfirm: (caption: string) => Promise<void>;
}) {
  const [caption, setCaption] = useState(pending.source === "chat" ? pending.message.body : "");
  const [saving, setSaving] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { queueMicrotask(() => setMounted(true)); }, []);
  if (!mounted) return null;

  async function confirm() {
    setSaving(true);
    try { await onConfirm(caption.trim().slice(0, 500)); }
    finally { setSaving(false); }
  }

  const content = pending.source === "chat" && pending.message.content?.type === "image" ? pending.message.content : null;
  return createPortal(
    <div className={styles.captionBackdrop} role="dialog" aria-modal="true" aria-label="Add a caption">
      <section className={styles.captionStudio}>
        <header><button type="button" onClick={onClose} aria-label="Cancel"><Icon name="close" /></button><strong>Add a caption</strong><button type="button" disabled={saving} onClick={confirm} aria-label="Add photo"><Icon name="check" /></button></header>
        <div className={styles.captionPreview}>
          {pending.source === "local" ? <Image src={pending.previewUrl} alt="Photo preview" fill unoptimized sizes="90vw" /> : content ? <LocalAssetImage asset={content.asset} alt={pending.message.body || content.name} fill sizes="90vw" /> : null}
        </div>
        <label className={styles.captionComposer}><input value={caption} maxLength={500} onChange={(event) => setCaption(event.target.value)} placeholder="Add a caption..." /><span>{caption.length}/500</span></label>
      </section>
    </div>,
    document.body,
  );
}
