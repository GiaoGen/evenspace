"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  composeBookAction,
  finalizeBookPhotoUploadAction,
  prepareBookPhotoUploadAction,
  saveBookDraftAction,
} from "@/app/books/actions";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import type { ZineStudioData } from "@/data/supabase/zine-studio-repository";
import { blobToDataUrl, prepareImage, validateImageFile } from "@/features/room/components/board/image-upload";
import { countEnglishWords } from "@/features/zine/model/layout-document";
import type { ZineStyle } from "@/features/zine/model/template-manifest";
import styles from "./book-studio.module.css";

type StudioStep = "select" | "style" | "words" | "compose";
type WordChoice = { readonly textKind: "none" | "comment" | "reflection"; readonly commentId: string | null; readonly reflection: string | null };
const STEPS: readonly StudioStep[] = ["select", "style", "words", "compose"];

export function BookStudio({ studio }: { readonly studio: ZineStudioData }) {
  const router = useRouter();
  const [step, setStep] = useState<StudioStep>("select");
  const [title, setTitle] = useState(studio.title);
  const [style, setStyle] = useState<ZineStyle>(studio.style);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(() => studio.photos.filter((photo) => photo.selected).map((photo) => photo.sourceId));
  const [words, setWords] = useState<Record<string, WordChoice>>(() => Object.fromEntries(studio.photos.map((photo) => [photo.sourceId, { textKind: photo.textKind, commentId: photo.commentId, reflection: photo.reflection }])));
  const [chapterBasis, setChapterBasis] = useState<"itinerary" | "captured-time">(studio.itinerary.length ? "itinerary" : "captured-time");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [pending, startTransition] = useTransition();
  const hydrated = useRef(false);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const photoOrder = useMemo(() => new Map(studio.photos.map((photo, index) => [photo.sourceId, index])), [studio.photos]);
  const selected = useMemo(() => selectedIds.flatMap((id) => {
    const photo = studio.photos.find((candidate) => candidate.sourceId === id);
    return photo ? [photo] : [];
  }), [selectedIds, studio.photos]);

  const draftPayload = useMemo(() => ({
      zinePublicId: studio.publicId,
      title: title.trim(),
      style,
      photos: selectedIds.map((sourceId) => ({ sourceId, ...(words[sourceId] ?? { textKind: "none" as const, commentId: null, reflection: null }) })),
  }), [selectedIds, studio.publicId, style, title, words]);

  const save = useCallback(async () => {
    if (!selectedIds.length) return false;
    const requested = draftPayload;
    const queued = saveQueue.current.then(async () => {
      const result = await saveBookDraftAction(requested);
      setFeedback(result.ok ? "Draft saved" : result.message);
      return result.ok;
    });
    saveQueue.current = queued.catch(() => false);
    return queued;
  }, [draftPayload, selectedIds.length]);

  useEffect(() => {
    if (!hydrated.current) { hydrated.current = true; return; }
    if (!selectedIds.length) return;
    const timer = window.setTimeout(() => { void save(); }, 900);
    return () => window.clearTimeout(timer);
    // payload state is intentionally the autosave dependency surface.
  }, [save, selectedIds.length]);

  function togglePhoto(id: string) {
    setFeedback("");
    setSelectedIds((current) => current.includes(id)
      ? current.filter((value) => value !== id)
      : current.length >= 48 ? current : [...current, id].toSorted((left, right) => (photoOrder.get(left) ?? 0) - (photoOrder.get(right) ?? 0)));
  }

  function next() {
    if (step === "select" && !selectedIds.length) { setFeedback("Choose at least one photograph."); return; }
    startTransition(async () => {
      const saved = await save();
      if (!saved) return;
      setStep(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function previous() {
    setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);
  }

  function compose() {
    startTransition(async () => {
      if (!await save()) return;
      setFeedback("Composing the deterministic edition…");
      const result = await composeBookAction({ zinePublicId: studio.publicId, chapterBasis });
      if (!result.ok) { setFeedback(result.message); return; }
      router.refresh();
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length) return;
    const available = Math.max(0, 48 - studio.photos.length);
    if (!available) { setFeedback("This book already has 48 photos."); return; }
    setUploading(true);
    setFeedback("Preparing photographs…");
    try {
      for (const file of Array.from(files).slice(0, available)) {
        const validation = validateImageFile(file);
        if (validation) throw new Error(validation);
        const image = await prepareImage(file);
        const placeholderDataUrl = await blobToDataUrl(image.placeholderBlob);
        const prepared = await prepareBookPhotoUploadAction({
          zinePublicId: studio.publicId,
          displayByteSize: image.displayBlob.size,
          thumbnailByteSize: image.thumbnailBlob.size,
          placeholderDataUrl,
          imageWidth: image.displayWidth,
          imageHeight: image.displayHeight,
        });
        if (!prepared.ok) throw new Error(prepared.message);
        const storage = createSupabaseBrowserClient().storage.from("zine-media");
        const [display, thumbnail] = await Promise.all([
          storage.uploadToSignedUrl(prepared.data.objectKey, prepared.data.token, image.displayBlob, { contentType: "image/jpeg" }),
          storage.uploadToSignedUrl(prepared.data.thumbnailObjectKey, prepared.data.thumbnailToken, image.thumbnailBlob, { contentType: "image/jpeg" }),
        ]);
        if (display.error || thumbnail.error) throw new Error("The photo could not reach private storage.");
        const finalized = await finalizeBookPhotoUploadAction({ zinePublicId: studio.publicId, uploadId: prepared.data.uploadId });
        if (!finalized.ok) throw new Error(finalized.message);
      }
      setFeedback("Upload complete");
      router.refresh();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally { setUploading(false); }
  }

  const stepNumber = STEPS.indexOf(step) + 1;
  return (
    <main className={styles.studio}>
      <header className={styles.studioHeader}>
        <Link href={studio.roomPublicId ? `/rooms/${studio.roomPublicId}` : "/rooms"} aria-label="Leave Book Studio">←</Link>
        <div><small>{String(stepNumber).padStart(2, "0")} / 04</small><strong>{step === "compose" ? "Review" : step[0].toUpperCase() + step.slice(1)}</strong></div>
        <span aria-live="polite">{feedback || "Private draft"}</span>
      </header>

      {step === "select" ? <section className={styles.stage}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>01 · Select</p><h1>Choose the photographs that carry the story.</h1><p>The order follows capture time. Select up to 48; layout remains art-directed for you.</p></div>
        <div className={styles.selectTools}>
          <div className={styles.mode}><button type="button" className={styles.choiceActive}>Select myself</button><button type="button" disabled>AI curate <small>Next phase</small></button></div>
          {studio.kind === "standalone" ? <label className={styles.uploadButton}>{uploading ? "Uploading…" : "Add photographs"}<input type="file" accept="image/*" multiple disabled={uploading || studio.photos.length >= 48} onChange={(event) => void upload(event.target.files)} /></label> : null}
          <strong>{selectedIds.length} / 48 selected</strong>
        </div>
        {!studio.photos.length ? <div className={styles.empty}><h2>No photographs yet.</h2><p>{studio.kind === "standalone" ? "Add photographs to begin the contact sheet." : "This room ended without any available photographs."}</p></div> : <div className={styles.contactSheet}>{studio.photos.map((photo, index) => {
          const active = selectedIds.includes(photo.sourceId);
          return <button key={photo.sourceId} type="button" className={active ? styles.photoSelected : ""} onClick={() => togglePhoto(photo.sourceId)} aria-pressed={active}>
            <span className={styles.contactImage} style={{ aspectRatio: `${photo.width} / ${photo.height}` }}><Image src={photo.thumbnailSrc} alt={photo.originalName} fill sizes="(max-width: 700px) 45vw, 20vw" unoptimized style={{ objectFit: "cover" }} /></span>
            <small>{String(index + 1).padStart(2, "0")}</small><i>{active ? "✓" : "+"}</i>
          </button>;
        })}</div>}
      </section> : null}

      {step === "style" ? <section className={styles.stage}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>02 · Style</p><h1>Choose the rhythm, not the arrangement.</h1><p>Both directions use your real selection and crop every image to its frame—never padded with expansion bars.</p></div>
        <div className={styles.styleCards}>{(["quiet-field", "living-sequence"] as const).map((candidate) => <button key={candidate} type="button" className={style === candidate ? styles.styleActive : ""} onClick={() => setStyle(candidate)}>
          <span className={`${styles.miniSpread} ${candidate === "living-sequence" ? styles.sequenceMini : ""}`}>{selected.slice(0, 3).map((photo) => <i key={photo.sourceId}><Image src={photo.thumbnailSrc} alt="" fill sizes="15vw" unoptimized style={{ objectFit: "cover" }} /></i>)}</span>
          <strong>{candidate === "quiet-field" ? "Quiet Field" : "Living Sequence"}</strong><p>{candidate === "quiet-field" ? "White paper, measured distance, comments resting at the photograph’s outer corner." : "Cinematic crops, changing scale, and a quicker documentary pulse."}</p>
        </button>)}</div>
      </section> : null}

      {step === "words" ? <section className={styles.stage}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>03 · Words</p><h1>Decide what stays beside each image.</h1><p>Original comments remain unchanged and show their author. Your reflection appears without a name.</p></div>
        <div className={styles.wordsList}>{selected.map((photo, index) => {
          const choice = words[photo.sourceId] ?? { textKind: "none", commentId: null, reflection: null };
          const comment = photo.comments.find((item) => item.id === choice.commentId) ?? photo.comments[0];
          const reflection = choice.reflection ?? "";
          return <article key={photo.sourceId} className={styles.wordCard}>
            <div className={styles.wordPhoto}><Image src={photo.thumbnailSrc} alt={photo.originalName} fill sizes="(max-width: 760px) 90vw, 32vw" unoptimized style={{ objectFit: "cover" }} /></div>
            <div><small>Photograph {String(index + 1).padStart(2, "0")}</small>
              <fieldset><legend>Text treatment</legend>
                {comment ? <label><input type="radio" checked={choice.textKind === "comment"} onChange={() => setWords((current) => ({ ...current, [photo.sourceId]: { textKind: "comment", commentId: comment.id, reflection } }))} /><span><strong>Original comment</strong><q>{comment.body}</q><small>— {comment.authorName}</small></span></label> : null}
                <label><input type="radio" checked={choice.textKind === "reflection"} onChange={() => setWords((current) => ({ ...current, [photo.sourceId]: { textKind: "reflection", commentId: null, reflection } }))} /><span><strong>My reflection</strong></span></label>
                {choice.textKind === "reflection" ? <><textarea value={reflection} maxLength={500} placeholder="What does this photograph hold for you?" onChange={(event) => setWords((current) => ({ ...current, [photo.sourceId]: { textKind: "reflection", commentId: null, reflection: event.target.value } }))} /><small className={countEnglishWords(reflection) > 40 ? styles.wordOver : ""}>{countEnglishWords(reflection)} / 40 words</small></> : null}
                <label><input type="radio" checked={choice.textKind === "none"} onChange={() => setWords((current) => ({ ...current, [photo.sourceId]: { textKind: "none", commentId: null, reflection } }))} /><span><strong>No text</strong></span></label>
              </fieldset>
            </div>
          </article>;
        })}</div>
      </section> : null}

      {step === "compose" ? <section className={`${styles.stage} ${styles.review}`}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>04 · Compose</p><h1>Ready for its first edition.</h1><p>This freezes the selected source material and creates a deterministic private version. AI art direction comes in the next batch.</p></div>
        <label className={styles.field}>Book title<input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
        <dl><div><dt>Photographs</dt><dd>{selected.length}</dd></div><div><dt>Direction</dt><dd>{style === "quiet-field" ? "Quiet Field" : "Living Sequence"}</dd></div><div><dt>Original comments</dt><dd>{selected.filter((photo) => words[photo.sourceId]?.textKind === "comment").length}</dd></div><div><dt>Host reflections</dt><dd>{selected.filter((photo) => words[photo.sourceId]?.textKind === "reflection").length}</dd></div><div><dt>Visibility</dt><dd>Private</dd></div></dl>
        <fieldset className={styles.chapterChoice}><legend>Chapter rhythm</legend>{studio.itinerary.length ? <label><input type="radio" checked={chapterBasis === "itinerary"} onChange={() => setChapterBasis("itinerary")} />Match the room itinerary by capture time</label> : null}<label><input type="radio" checked={chapterBasis === "captured-time"} onChange={() => setChapterBasis("captured-time")} />Arrange chapters by capture time</label></fieldset>
      </section> : null}

      <footer className={styles.studioFooter}>
        <button type="button" disabled={step === "select" || pending || uploading} onClick={previous}>Back</button>
        {step === "compose" ? <button className={styles.primary} type="button" disabled={pending || !title.trim() || selected.some((photo) => words[photo.sourceId]?.textKind === "reflection" && (!words[photo.sourceId]?.reflection || countEnglishWords(words[photo.sourceId]?.reflection ?? "") > 40))} onClick={compose}>{pending ? "Composing…" : "Compose book"}</button> : <button className={styles.primary} type="button" disabled={pending || uploading || step === "select" && !selectedIds.length} onClick={next}>{pending ? "Saving…" : "Continue"}</button>}
      </footer>
    </main>
  );
}
