"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition, type ChangeEvent, type CSSProperties, type UIEvent } from "react";
import { useRouter } from "next/navigation";

import {
  composeBookAction,
  finalizeBookPhotoUploadAction,
  prepareBookPhotoUploadAction,
  saveBookDraftAction,
} from "@/app/books/actions";
import { Icon } from "@/components/ui/icon";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import type { ZineStudioData, ZineStudioPhoto } from "@/data/supabase/zine-studio-repository";
import { blobToDataUrl, prepareImage, validateImageFile } from "@/features/room/components/board/image-upload";
import { countEnglishWords } from "@/features/zine/model/layout-document";
import type { ZineStyle } from "@/features/zine/model/template-manifest";
import styles from "./book-studio.module.css";

type StudioStep = "add" | "curate" | "style" | "compose";
type WordChoice = { readonly textKind: "none" | "comment" | "reflection"; readonly commentId: string | null; readonly reflection: string | null };
type UploadProgress = { readonly completed: number; readonly total: number };

const STEPS: readonly StudioStep[] = ["add", "curate", "style", "compose"];
const STEP_LABELS: Readonly<Record<StudioStep, string>> = {
  add: "Add",
  curate: "Select",
  style: "Style",
  compose: "Review",
};
const EMPTY_WORD_CHOICE: WordChoice = { textKind: "none", commentId: null, reflection: null };

function TextTreatment({
  photo,
  choice,
  onChange,
}: {
  readonly photo: ZineStudioPhoto;
  readonly choice: WordChoice;
  readonly onChange: (choice: WordChoice) => void;
}) {
  const selectedComment = photo.comments.find((comment) => comment.id === choice.commentId) ?? photo.comments[0] ?? null;
  const reflection = choice.reflection ?? "";
  const wordCount = countEnglishWords(reflection);

  return (
    <fieldset className={styles.textTreatment}>
      <legend>Text treatment</legend>
      {selectedComment ? <div className={styles.treatmentOption}>
        <label>
          <input
            type="radio"
            checked={choice.textKind === "comment"}
            onChange={() => onChange({ textKind: "comment", commentId: selectedComment.id, reflection })}
          />
          <span><strong>Room comment</strong><q>{selectedComment.body}</q><small>— {selectedComment.authorName}</small></span>
        </label>
        {choice.textKind === "comment" && photo.comments.length > 1 ? <select value={selectedComment.id} aria-label="Choose a room comment" onChange={(event) => onChange({ textKind: "comment", commentId: event.target.value, reflection })}>
          {photo.comments.map((comment) => <option key={comment.id} value={comment.id}>{comment.authorName}: {comment.body}</option>)}
        </select> : null}
      </div> : null}
      <div className={styles.treatmentOption}>
        <label>
          <input type="radio" checked={choice.textKind === "reflection"} onChange={() => onChange({ textKind: "reflection", commentId: null, reflection })} />
          <span><strong>My reflection</strong><small>Shown without a name</small></span>
        </label>
        {choice.textKind === "reflection" ? <><textarea value={reflection} maxLength={500} placeholder="What does this photograph hold for you?" onChange={(event) => onChange({ textKind: "reflection", commentId: null, reflection: event.target.value })} /><small className={wordCount > 40 ? styles.wordOver : styles.wordCount}>{wordCount} / 40 words</small></> : null}
      </div>
      <label className={styles.treatmentOption}>
        <input type="radio" checked={choice.textKind === "none"} onChange={() => onChange({ textKind: "none", commentId: null, reflection })} />
        <span><strong>No text</strong></span>
      </label>
    </fieldset>
  );
}

export function BookStudio({ studio }: { readonly studio: ZineStudioData }) {
  const router = useRouter();
  const [step, setStep] = useState<StudioStep>(() => studio.kind === "room" ? "curate" : "add");
  const [title, setTitle] = useState(studio.title);
  const [style, setStyle] = useState<ZineStyle>(studio.style);
  const [selectedIds, setSelectedIds] = useState<readonly string[]>(() => studio.photos.filter((photo) => photo.selected).map((photo) => photo.sourceId));
  const [words, setWords] = useState<Record<string, WordChoice>>(() => Object.fromEntries(studio.photos.map((photo) => [photo.sourceId, { textKind: photo.textKind, commentId: photo.commentId, reflection: photo.reflection }])));
  const [chapterBasis, setChapterBasis] = useState<"itinerary" | "captured-time">(studio.itinerary.length ? "itinerary" : "captured-time");
  const [feedback, setFeedback] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<UploadProgress | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(() => studio.kind === "room" && !studio.photos.some((photo) => photo.selected));
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [pending, startTransition] = useTransition();
  const hydrated = useRef(false);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const railFrame = useRef<number | null>(null);
  const photoById = useMemo(() => new Map(studio.photos.map((photo) => [photo.sourceId, photo])), [studio.photos]);
  const photoOrder = useMemo(() => new Map(studio.photos.map((photo, index) => [photo.sourceId, index])), [studio.photos]);
  const selected = useMemo(() => selectedIds.flatMap((id) => {
    const photo = photoById.get(id);
    return photo ? [photo] : [];
  }), [photoById, selectedIds]);
  const visibleActiveIndex = Math.min(activePhotoIndex, Math.max(0, selected.length - 1));
  const invalidReflections = selected.some((photo) => {
    const choice = words[photo.sourceId];
    return choice?.textKind === "reflection" && (!choice.reflection?.trim() || countEnglishWords(choice.reflection) > 40);
  });

  const draftPayload = useMemo(() => ({
    zinePublicId: studio.publicId,
    title: title.trim(),
    style,
    photos: selectedIds.map((sourceId) => ({ sourceId, ...(words[sourceId] ?? EMPTY_WORD_CHOICE) })),
  }), [selectedIds, studio.publicId, style, title, words]);

  const save = useCallback(async () => {
    if (!selectedIds.length || invalidReflections) return false;
    const requested = draftPayload;
    const queued = saveQueue.current.then(async () => {
      const result = await saveBookDraftAction(requested);
      setFeedback(result.ok ? "Draft saved" : result.message);
      return result.ok;
    });
    saveQueue.current = queued.catch(() => false);
    return queued;
  }, [draftPayload, invalidReflections, selectedIds.length]);

  useEffect(() => {
    if (!hydrated.current) {
      hydrated.current = true;
      return;
    }
    if (!selectedIds.length || invalidReflections) return;
    const timer = window.setTimeout(() => { void save(); }, 900);
    return () => window.clearTimeout(timer);
  }, [invalidReflections, save, selectedIds.length]);

  useEffect(() => {
    if (!drawerOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [drawerOpen]);

  useEffect(() => () => {
    if (railFrame.current !== null) window.cancelAnimationFrame(railFrame.current);
  }, []);

  function togglePhoto(id: string) {
    setFeedback("");
    setSelectedIds((current) => {
      if (current.includes(id)) return current.filter((value) => value !== id);
      if (current.length >= 48) {
        setFeedback("A book can include at most 48 photographs.");
        return current;
      }
      return [...current, id].toSorted((left, right) => (photoOrder.get(left) ?? 0) - (photoOrder.get(right) ?? 0));
    });
  }

  function updateWords(photoId: string, choice: WordChoice) {
    setFeedback("");
    setWords((current) => ({ ...current, [photoId]: choice }));
  }

  function next() {
    if (step === "add") {
      if (!studio.photos.length) {
        setFeedback("Add at least one photograph.");
        return;
      }
      setStep("curate");
      setDrawerOpen(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (step === "curate" && !selectedIds.length) {
      setFeedback("Choose at least one photograph.");
      return;
    }
    if (invalidReflections) {
      setFeedback("Reflections need 1–40 English words.");
      return;
    }
    startTransition(async () => {
      const saved = await save();
      if (!saved) return;
      setStep(STEPS[Math.min(STEPS.length - 1, STEPS.indexOf(step) + 1)]);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  }

  function previous() {
    if (studio.kind === "room" && step === "curate") return;
    setStep(STEPS[Math.max(0, STEPS.indexOf(step) - 1)]);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function compose() {
    if (invalidReflections) {
      setFeedback("Reflections need 1–40 English words.");
      return;
    }
    startTransition(async () => {
      if (!await save()) return;
      setFeedback("Composing the edition…");
      const result = await composeBookAction({ zinePublicId: studio.publicId, chapterBasis });
      if (!result.ok) {
        setFeedback(result.message);
        return;
      }
      router.refresh();
    });
  }

  async function upload(files: FileList | null) {
    if (!files?.length || uploading) return;
    const available = Math.max(0, 48 - studio.photos.length);
    if (!available) {
      setFeedback("This book already has 48 photographs.");
      return;
    }
    const candidates = Array.from(files).slice(0, available);
    const validFiles = candidates.filter((file) => !validateImageFile(file));
    const skipped = files.length - validFiles.length;
    if (!validFiles.length) {
      setFeedback("Choose JPEG, PNG, or WebP images under 12 MB.");
      return;
    }

    let completed = 0;
    setUploading(true);
    setUploadProgress({ completed, total: validFiles.length });
    setFeedback(skipped ? `${skipped} unsupported or excess photograph${skipped === 1 ? " was" : "s were"} skipped.` : "Preparing photographs…");
    try {
      for (const file of validFiles) {
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
        if (display.error || thumbnail.error) throw new Error("The photograph could not reach private storage.");
        const finalized = await finalizeBookPhotoUploadAction({ zinePublicId: studio.publicId, uploadId: prepared.data.uploadId });
        if (!finalized.ok) throw new Error(finalized.message);
        completed += 1;
        setUploadProgress({ completed, total: validFiles.length });
      }
      setFeedback(skipped ? `Added ${completed} photographs; ${skipped} skipped.` : `${completed} photograph${completed === 1 ? "" : "s"} added.`);
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Upload failed. Please try again.");
    } finally {
      setUploading(false);
      setUploadProgress(null);
      if (completed) router.refresh();
    }
  }

  function handleUploadChange(event: ChangeEvent<HTMLInputElement>) {
    const files = event.currentTarget.files;
    void upload(files);
    event.currentTarget.value = "";
  }

  function trackActivePhoto(event: UIEvent<HTMLDivElement>) {
    const rail = event.currentTarget;
    if (railFrame.current !== null) window.cancelAnimationFrame(railFrame.current);
    railFrame.current = window.requestAnimationFrame(() => {
      const slides = [...rail.querySelectorAll<HTMLElement>("[data-photo-slide]")];
      if (!slides.length) return;
      const center = rail.scrollLeft + rail.clientWidth / 2;
      let nearestIndex = 0;
      let nearestDistance = Number.POSITIVE_INFINITY;
      slides.forEach((slide, index) => {
        const distance = Math.abs(slide.offsetLeft + slide.offsetWidth / 2 - center);
        if (distance < nearestDistance) {
          nearestDistance = distance;
          nearestIndex = index;
        }
      });
      setActivePhotoIndex(nearestIndex);
    });
  }

  const progressPercent = uploadProgress ? Math.round(uploadProgress.completed / uploadProgress.total * 100) : 0;
  const stepNumber = STEPS.indexOf(step) + 1;
  const backDisabled = step === "add" || studio.kind === "room" && step === "curate";

  return (
    <main className={styles.studio}>
      <header className={styles.studioHeader}>
        <Link href={studio.roomPublicId ? `/rooms/${studio.roomPublicId}` : "/rooms"} aria-label="Leave Book Studio">←</Link>
        <div><small>{String(stepNumber).padStart(2, "0")} / 04</small><strong>{STEP_LABELS[step]}</strong></div>
        <span aria-live="polite">{feedback || "Private draft"}</span>
      </header>

      {step === "add" ? <section className={`${styles.stage} ${styles.addStage}`}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>01 · Add</p><h1>Choose the photographs</h1><p>Add up to 48 photographs. Their capture time establishes the first story order.</p></div>
        <label className={styles.largeUpload} style={{ "--upload-progress": `${progressPercent}%` } as CSSProperties}>
          <span>{uploadProgress ? `Adding ${uploadProgress.completed} / ${uploadProgress.total} · ${progressPercent}%` : "Add photographs"}</span>
          <input type="file" accept="image/*" multiple disabled={uploading || studio.photos.length >= 48} onChange={handleUploadChange} />
        </label>
      </section> : null}

      {step === "curate" ? <section className={`${styles.stage} ${styles.curateStage}`}>
        <div className={styles.curateTopline}>
          <button type="button" className={styles.drawerTrigger} onClick={() => setDrawerOpen(true)}><Icon name="image" size={17} /><span>Photographs</span><small>{selectedIds.length} / 48</small></button>
        </div>
        <div className={styles.curateBody}>
          <div className={styles.curateIntro}><p className={styles.eyebrow}>02 · Select</p><h1>Shape the story</h1><p>Choose the photographs that belong in this edition, then decide how words sit beside each one.</p></div>
          {!selected.length ? <button type="button" className={styles.selectionEmpty} onClick={() => setDrawerOpen(true)}><Icon name="image" size={24} /><strong>No photographs selected</strong><span>Open the photograph drawer to begin.</span></button> : <div className={styles.railArea}>
            <div className={styles.photoRail} onScroll={trackActivePhoto}>
              {selected.map((photo, index) => <article key={photo.sourceId} className={styles.photoSlide} data-photo-slide>
                <figure className={styles.storyFigure}>
                  <Image className={styles.storyImage} src={photo.src} alt={photo.originalName} width={photo.width} height={photo.height} sizes="(max-width: 800px) 86vw, 64vw" unoptimized priority={index === 0} />
                  <figcaption>Photograph {String(index + 1).padStart(2, "0")}</figcaption>
                </figure>
                <TextTreatment photo={photo} choice={words[photo.sourceId] ?? EMPTY_WORD_CHOICE} onChange={(choice) => updateWords(photo.sourceId, choice)} />
              </article>)}
            </div>
            <div className={styles.photoIndicator} aria-live="polite"><span>{String(visibleActiveIndex + 1).padStart(2, "0")}</span><i /><span>{String(selected.length).padStart(2, "0")}</span></div>
          </div>}
        </div>
      </section> : null}

      {drawerOpen ? <>
        <button type="button" className={styles.drawerBackdrop} aria-label="Close photograph drawer" onClick={() => setDrawerOpen(false)} />
        <aside className={styles.photoDrawer} role="dialog" aria-modal="true" aria-labelledby="photo-drawer-title">
          <header><div><p className={styles.eyebrow}>Source photographs</p><h2 id="photo-drawer-title">Choose photographs</h2></div><button type="button" aria-label="Close photograph drawer" onClick={() => setDrawerOpen(false)}><Icon name="close" size={18} /></button></header>
          <label className={styles.aiSwitch} aria-disabled="true"><span><strong>AI curate</strong><small>Not connected yet</small></span><input type="checkbox" role="switch" disabled /><i /></label>
          {!studio.photos.length ? <div className={styles.drawerEmpty}><Icon name="image" size={23} /><strong>No photographs available</strong><span>{studio.kind === "room" ? "This room ended without available photographs." : "Return to the first step and add photographs."}</span></div> : <div className={styles.drawerGrid}>{studio.photos.map((photo, index) => {
            const active = selectedIds.includes(photo.sourceId);
            return <button key={photo.sourceId} type="button" className={active ? styles.drawerPhotoSelected : ""} onClick={() => togglePhoto(photo.sourceId)} aria-pressed={active} aria-label={`${active ? "Remove" : "Add"} ${photo.originalName}`}>
              <span><Image src={photo.thumbnailSrc} alt="" fill sizes="180px" unoptimized /></span>
              <small>{String(index + 1).padStart(2, "0")}</small><i>{active ? <Icon name="check" size={12} /> : <Icon name="plus" size={12} />}</i>
            </button>;
          })}</div>}
        </aside>
      </> : null}

      {step === "style" ? <section className={styles.stage}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>03 · Style</p><h1>Choose the style</h1><p>Both directions use your selection and crop images to their intended frames—never padded with expansion bars.</p></div>
        <div className={styles.styleCards}>{(["quiet-field", "living-sequence"] as const).map((candidate) => <button key={candidate} type="button" className={style === candidate ? styles.styleActive : ""} onClick={() => setStyle(candidate)}>
          <span className={`${styles.miniSpread} ${candidate === "living-sequence" ? styles.sequenceMini : ""}`}>{selected.slice(0, 3).map((photo) => <i key={photo.sourceId}><Image src={photo.thumbnailSrc} alt="" fill sizes="15vw" unoptimized style={{ objectFit: "cover" }} /></i>)}</span>
          <strong>{candidate === "quiet-field" ? "Quiet Field" : "Living Sequence"}</strong><p>{candidate === "quiet-field" ? "White paper, measured distance, and comments resting at the photograph’s outer corner." : "Cinematic crops, changing scale, and a quicker documentary pulse."}</p>
        </button>)}</div>
      </section> : null}

      {step === "compose" ? <section className={`${styles.stage} ${styles.review}`}>
        <div className={styles.stageIntro}><p className={styles.eyebrow}>04 · Review</p><h1>Finish the book</h1><p>Review the source material and create the first private edition.</p></div>
        <label className={styles.field}>Book title<input value={title} maxLength={80} onChange={(event) => setTitle(event.target.value)} /></label>
        <dl><div><dt>Photographs</dt><dd>{selected.length}</dd></div><div><dt>Direction</dt><dd>{style === "quiet-field" ? "Quiet Field" : "Living Sequence"}</dd></div><div><dt>Room comments</dt><dd>{selected.filter((photo) => words[photo.sourceId]?.textKind === "comment").length}</dd></div><div><dt>Host reflections</dt><dd>{selected.filter((photo) => words[photo.sourceId]?.textKind === "reflection").length}</dd></div><div><dt>Visibility</dt><dd>Private</dd></div></dl>
        <fieldset className={styles.chapterChoice}><legend>Chapter rhythm</legend>{studio.itinerary.length ? <label><input type="radio" checked={chapterBasis === "itinerary"} onChange={() => setChapterBasis("itinerary")} />Match the room itinerary by capture time</label> : null}<label><input type="radio" checked={chapterBasis === "captured-time"} onChange={() => setChapterBasis("captured-time")} />Arrange chapters by capture time</label></fieldset>
      </section> : null}

      <footer className={styles.studioFooter}>
        <button type="button" disabled={backDisabled || pending || uploading} onClick={previous}>Back</button>
        {step === "compose" ? <button className={styles.primary} type="button" disabled={pending || !title.trim() || invalidReflections} onClick={compose}>{pending ? "Composing…" : "Compose book"}</button> : <button className={styles.primary} type="button" disabled={pending || uploading || step === "add" && !studio.photos.length || step === "curate" && (!selectedIds.length || invalidReflections)} onClick={next}>{pending ? "Saving…" : "Continue"}</button>}
      </footer>
    </main>
  );
}
