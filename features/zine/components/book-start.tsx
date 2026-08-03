"use client";

import { useState, useTransition } from "react";
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

  function create() {
    startTransition(async () => {
      const result = await createBookDraftAction(props.room
        ? { kind: "room", roomPublicId: props.room.publicId, title, style }
        : { kind: "standalone", title, style });
      if (!result.ok) { setError(result.message); return; }
      router.push(`/books/${result.data.publicId}`);
    });
  }

  return (
    <main className={styles.start}>
      <section className={styles.startSheet}>
        <p className={styles.eyebrow}>{props.room ? "Room book" : "Private zine"}</p>
        <h1>Begin with a point of view.</h1>
        <p className={styles.lede}>{props.room ? "Choose the shared zine’s title and first visual direction." : "Upload your own photographs, then shape them into a private zine."}</p>
        <label className={styles.field}>Title<input value={title} maxLength={80} onChange={(event) => { setTitle(event.target.value); setError(""); }} /></label>
        <fieldset className={styles.styleChoice}><legend>Direction</legend>
          <button type="button" className={style === "quiet-field" ? styles.choiceActive : ""} onClick={() => setStyle("quiet-field")}><strong>Quiet Field</strong><span>Measured space, stillness, and restrained rhythm.</span></button>
          <button type="button" className={style === "living-sequence" ? styles.choiceActive : ""} onClick={() => setStyle("living-sequence")}><strong>Living Sequence</strong><span>Closer crops, momentum, and cinematic progression.</span></button>
        </fieldset>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        <button className={styles.primary} type="button" disabled={pending || !title.trim()} onClick={create}>{pending ? "Preparing…" : props.room ? "Open Book Studio" : "Create private book"}</button>
      </section>
    </main>
  );
}
