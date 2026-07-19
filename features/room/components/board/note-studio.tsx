"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/icon";
import type { BoardNoteVariant } from "@/core/domain/room";
import { useCenteredCardSelection } from "./use-centered-card-selection";
import styles from "./board.module.css";

const variants: readonly BoardNoteVariant[] = ["paper", "ink", "sage"];

export function NoteStudio({ onClose, onAdd }: { readonly onClose: () => void; readonly onAdd: (text: string, variant: BoardNoteVariant) => void }) {
  const [text, setText] = useState("");
  const [variant, setVariant] = useState<BoardNoteVariant>("paper");
  const { railRef, onScroll, select } = useCenteredCardSelection(variant, setVariant);

  function finish() {
    if (!text.trim()) return;
    onAdd(text.trim().slice(0, 500), variant);
  }

  return <div className={styles.noteStudioBackdrop} role="dialog" aria-modal="true" aria-label="Create a text card" onPointerDown={onClose}>
    <section className={styles.noteStudio} onPointerDown={(event) => event.stopPropagation()}>
      <div ref={railRef} className={styles.noteCardRail} onScroll={onScroll}>
        {variants.map((value) => <article key={value} data-carousel-value={value} className={`${styles.noteStyleCard} ${styles[`note${value}`]} ${variant === value ? styles.noteStyleSelected : ""}`}>
          {variant === value
            ? <textarea value={text} maxLength={500} rows={5} placeholder="Leave something here..." onChange={(event) => setText(event.target.value)} aria-label="Note text" />
            : <button type="button" onClick={() => select(value)} aria-label={`Use ${value} note style`}><span>{text.trim() || "A small thought."}</span></button>}
        </article>)}
      </div>
      <div className={styles.noteStudioActions}>
        <button type="button" onClick={onClose} aria-label="Close text card"><Icon name="close" /></button>
        <span>{text.length}<i>/500</i></span>
        <button type="button" className={styles.confirmAction} disabled={!text.trim()} onClick={finish} aria-label="Add text card to board"><Icon name="check" /></button>
      </div>
    </section>
  </div>;
}
