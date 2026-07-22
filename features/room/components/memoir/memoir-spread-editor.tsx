"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import type { BoardItem, PersonSummary } from "@/core/domain/room";
import type { MemoirSpread } from "./memoir-model";
import { MemoirPageView } from "./memoir-page";
import styles from "./memoir.module.css";

export function MemoirSpreadEditor({ spread, members, tools, canRemove, onTargetPage, onRemove, onDone }: {
  readonly spread: MemoirSpread;
  readonly members: readonly PersonSummary[];
  readonly tools: ReactNode;
  readonly canRemove: (item: BoardItem) => boolean;
  readonly onTargetPage: (pageNumber: number) => void;
  readonly onRemove: (itemId: string) => void;
  readonly onDone: () => void;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setMounted(true));
    function close(event: KeyboardEvent) { if (event.key === "Escape") onDone(); }
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onDone]);

  if (!mounted) return null;
  const pages = [spread.left, spread.right];
  return createPortal(
    <div className={styles.spreadEditorBackdrop} role="dialog" aria-modal="true" aria-label="Edit memoir spread">
      <header className={styles.spreadEditorHeader}>
        <span>Pages {spread.left.pageNumber} - {spread.right.pageNumber}</span>
        <button type="button" onClick={onDone}><Icon name="check" size={15} />Done</button>
      </header>
      <div className={styles.spreadEditorBody}>
        <section className={styles.editorSpread}>
          {pages.map((page, index) => <div key={page.id} className={styles.editorPageTarget} onClick={() => onTargetPage(page.pageNumber)}>
            <MemoirPageView page={page} members={members} side={index === 1 ? "right" : "left"} editing canRemove={canRemove} onRemove={onRemove} />
          </div>)}
        </section>
        <div className={styles.editorToolsMount}>{tools}</div>
      </div>
    </div>,
    document.body,
  );
}
