"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { createBookDraftAction } from "@/app/books/actions";
import type { ZineStyle } from "@/features/zine/model/template-manifest";
import styles from "./book-studio.module.css";

export function BookStart(props: { readonly room?: { readonly publicId: string; readonly name: string } }) {
  const router = useRouter();
  const [title, setTitle] = useState(props.room?.name ?? "Untitled journey");
  const [style, setStyle] = useState<ZineStyle>("quiet-field");
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const roomOpenStarted = useRef(false);

  const openRoomBook = useCallback(() => {
    const room = props.room;
    if (!room || roomOpenStarted.current) return;
    roomOpenStarted.current = true;
    setError("");
    startTransition(async () => {
      const result = await createBookDraftAction({
        kind: "room",
        roomPublicId: room.publicId,
        title: room.name,
        style: "quiet-field",
      });
      if (!result.ok) {
        roomOpenStarted.current = false;
        setError(result.message);
        return;
      }
      router.replace(`/books/${result.data.publicId}`);
    });
  }, [props.room, router]);

  useEffect(() => {
    openRoomBook();
  }, [openRoomBook]);

  function createStandaloneBook() {
    startTransition(async () => {
      const result = await createBookDraftAction({ kind: "standalone", title, style });
      if (!result.ok) {
        setError(result.message);
        return;
      }
      router.push(`/books/${result.data.publicId}`);
    });
  }

  if (props.room) {
    return (
      <main className={styles.start}>
        <section className={`${styles.startSheet} ${styles.openingSheet}`} aria-live="polite">
          <p className={styles.eyebrow}>Room book</p>
          <h1>Opening the studio.</h1>
          <p className={styles.lede}>Loading the room photographs and their comments into your private draft.</p>
          {error ? <><p className={styles.error} role="alert">{error}</p><button className={styles.primary} type="button" disabled={pending} onClick={openRoomBook}>Try again</button></> : <span className={styles.openingProgress}>Preparing photographs…</span>}
        </section>
      </main>
    );
  }

  return (
    <main className={styles.start}>
      <section className={styles.startSheet}>
        <p className={styles.eyebrow}>Private zine</p>
        <h1>Begin with a point of view.</h1>
        <p className={styles.lede}>Upload your own photographs, then shape them into a private zine.</p>
        <label className={styles.field}>Title<input value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); setError(""); }} /></label>
        <fieldset className={styles.styleChoice}><legend>Direction</legend>
          <button type="button" className={style === "quiet-field" ? styles.choiceActive : ""} onClick={() => setStyle("quiet-field")}><strong>Quiet Field</strong><span>Measured space, stillness, and restrained rhythm.</span></button>
          <button type="button" className={style === "living-sequence" ? styles.choiceActive : ""} onClick={() => setStyle("living-sequence")}><strong>Living Sequence</strong><span>Closer crops, momentum, and cinematic progression.</span></button>
        </fieldset>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.primary} type="button" disabled={pending || !title.trim()} onClick={createStandaloneBook}>{pending ? "Preparing…" : "Create private book"}</button>
      </section>
    </main>
  );
}
