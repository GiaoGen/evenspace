"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type ChangeEvent, type CSSProperties } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardComment, BoardItem, BoardPhoto, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import { saveLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { blobToDataUrl, prepareImage, validateImageFile } from "./board/image-upload";
import { PhotoDetailViewer } from "./board/photo-detail-viewer";
import { useRoomPhotoCache } from "./board/use-photo-window-cache";
import { schedulePhotoEntryBatch } from "../model/photo-wall-entry";
import styles from "./photos-panel.module.css";

const photoVariants: readonly ArtVariant[] = ["one", "two", "three", "four"];
const PHOTO_PROCESS_CONCURRENCY = 2;
const PHOTO_ENTRY_BATCH_WINDOW_MS = 160;

type PendingPhoto = {
  readonly id: string;
  readonly file: File;
  readonly previewUrl: string;
  readonly state: "processing" | "uploading" | "failed";
  readonly message?: string;
};

type PhotoEntryState = {
  readonly phase: "entering" | "visible";
  readonly delayMs: number;
};

export function PhotosPanel({
  roomPublicId,
  items,
  comments,
  members,
  viewerActorId,
  photoCount,
  maxPhotos,
  canAdd,
  canModerate,
  archived,
}: {
  readonly roomPublicId: RoomPublicId;
  readonly items: readonly BoardItem[];
  readonly comments: readonly BoardComment[];
  readonly members: readonly PersonSummary[];
  readonly viewerActorId: ActorId;
  readonly photoCount: number;
  readonly maxPhotos: number;
  readonly canAdd: boolean;
  readonly canModerate: boolean;
  readonly archived: boolean;
}) {
  const { session, executeCommand } = useMockSession();
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const signedUrlRefreshPendingRef = useRef(false);
  const [detailPhotoId, setDetailPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingPhotos, setPendingPhotos] = useState<readonly PendingPhoto[]>([]);
  const [syncingPhotoIds, setSyncingPhotoIds] = useState<ReadonlySet<string>>(() => new Set());
  const photos = useMemo(() => items.filter((item): item is BoardPhoto => item.kind === "photo"), [items]);
  const entranceCandidateIdsRef = useRef<ReadonlySet<string> | null>(null);
  const queuedDecodedIdsRef = useRef<Set<string>>(new Set());
  const scheduledPhotoIdsRef = useRef<Set<string>>(new Set());
  const entryBatchTimerRef = useRef<number | null>(null);
  const nextEntrySlotAtRef = useRef(0);
  const [photoEntries, setPhotoEntries] = useState<ReadonlyMap<string, PhotoEntryState>>(() => new Map());
  if (entranceCandidateIdsRef.current === null) {
    entranceCandidateIdsRef.current = new Set(photos.flatMap((photo) => photo.asset ? [photo.id] : []));
  }
  const detailPhoto = photos.find((photo) => photo.id === detailPhotoId) ?? null;
  const refreshExpiredMediaUrls = useCallback(() => {
    if (signedUrlRefreshPendingRef.current) return;
    signedUrlRefreshPendingRef.current = true;
    router.refresh();
    window.setTimeout(() => { signedUrlRefreshPendingRef.current = false; }, 1_000);
  }, [router]);
  useRoomPhotoCache({
    roomPublicId,
    viewerCacheScope: viewerActorId,
    photos,
    selectedPhotoId: detailPhotoId,
    archived,
    onExpiredRemoteUrl: refreshExpiredMediaUrls,
  });
  const commandBase = () => ({ roomPublicId, actorId: session.viewer.actorId, nowIso: new Date().toISOString() } as const);

  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    panel.scrollTop = panel.scrollHeight;
    const frame = window.requestAnimationFrame(() => {
      panel.scrollTop = panel.scrollHeight;
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const flushDecodedPhotoEntries = useCallback(() => {
    entryBatchTimerRef.current = null;
    const queuedIds = [...queuedDecodedIdsRef.current];
    queuedDecodedIdsRef.current.clear();
    if (!queuedIds.length) return;

    const schedule = schedulePhotoEntryBatch({
      ids: queuedIds,
      nowMs: performance.now(),
      nextSlotAtMs: nextEntrySlotAtRef.current,
    });
    nextEntrySlotAtRef.current = schedule.nextSlotAtMs;
    setPhotoEntries((current) => {
      const next = new Map(current);
      schedule.entries.forEach((entry) => {
        next.set(entry.id, { phase: "entering", delayMs: entry.delayMs });
      });
      return next;
    });
  }, []);

  const markPhotoDecoded = useCallback((photoId: string) => {
    if (scheduledPhotoIdsRef.current.has(photoId)) return;
    scheduledPhotoIdsRef.current.add(photoId);

    const shouldAnimate = entranceCandidateIdsRef.current?.has(photoId)
      && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!shouldAnimate) {
      setPhotoEntries((current) => {
        const next = new Map(current);
        next.set(photoId, { phase: "visible", delayMs: 0 });
        return next;
      });
      return;
    }

    queuedDecodedIdsRef.current.add(photoId);
    if (entryBatchTimerRef.current === null) {
      entryBatchTimerRef.current = window.setTimeout(flushDecodedPhotoEntries, PHOTO_ENTRY_BATCH_WINDOW_MS);
    }
  }, [flushDecodedPhotoEntries]);

  const markPhotoVisible = useCallback((photoId: string) => {
    setPhotoEntries((current) => {
      const entry = current.get(photoId);
      if (!entry || entry.phase === "visible") return current;
      const next = new Map(current);
      next.set(photoId, { phase: "visible", delayMs: 0 });
      return next;
    });
  }, []);

  useEffect(() => () => {
    if (entryBatchTimerRef.current !== null) window.clearTimeout(entryBatchTimerRef.current);
  }, []);

  function updatePendingPhoto(id: string, patch: Partial<PendingPhoto>) {
    setPendingPhotos((current) => current.map((item) => item.id === id ? { ...item, ...patch } : item));
  }

  function removePendingPhoto(id: string) {
    setPendingPhotos((current) => {
      const target = current.find((item) => item.id === id);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return current.filter((item) => item.id !== id);
    });
  }

  async function processPhoto(pending: PendingPhoto, index: number) {
    try {
      const image = await prepareImage(pending.file);
      const [asset, thumbnail, placeholderDataUrl] = await Promise.all([
        saveLocalAsset(image.displayBlob, "image"),
        saveLocalAsset(image.thumbnailBlob, "image"),
        blobToDataUrl(image.placeholderBlob),
      ]);
      const item: BoardPhoto = {
        id: `photo_${createUuid()}`,
        kind: "photo",
        ownerActorId: viewerActorId,
        variant: photoVariants[(photoCount + index) % photoVariants.length],
        asset: {
          ...asset,
          thumbnail: { id: thumbnail.id, mimeType: thumbnail.mimeType, byteSize: thumbnail.byteSize },
          placeholderDataUrl,
          width: image.displayWidth,
          height: image.displayHeight,
          revision: 1,
        },
        imageName: pending.file.name.slice(0, 120),
        aspectRatio: image.aspectRatio,
        note: null,
        x: 0,
        y: 0,
        rotation: 0,
        width: 24,
      };
      updatePendingPhoto(pending.id, { state: "uploading" });
      const resultPromise = executeCommand({ type: "ADD_BOARD_ITEM", ...commandBase(), item });
      removePendingPhoto(pending.id);
      setSyncingPhotoIds((current) => new Set(current).add(item.id));
      const result = await resultPromise;
      setSyncingPhotoIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
      if (result.status === "error") {
        const retryPreviewUrl = URL.createObjectURL(pending.file);
        setPendingPhotos((current) => [...current, { ...pending, previewUrl: retryPreviewUrl, state: "failed", message: result.message }]);
      }
    } catch (caught) {
      updatePendingPhoto(pending.id, {
        state: "failed",
        message: caught instanceof Error ? caught.message : "This photo could not be prepared.",
      });
    }
  }

  async function processPendingPhotos(pending: readonly PendingPhoto[], offset: number) {
    let nextIndex = 0;
    const worker = async () => {
      while (nextIndex < pending.length) {
        const index = nextIndex;
        nextIndex += 1;
        await processPhoto(pending[index], offset + index);
      }
    };
    await Promise.all(Array.from({ length: Math.min(PHOTO_PROCESS_CONCURRENCY, pending.length) }, worker));
  }

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length || uploading) return;

    const availableSlots = Math.max(0, maxPhotos - photoCount);
    if (!availableSlots) {
      setError(`This room has reached its ${maxPhotos}-photo limit.`);
      return;
    }

    const validFiles = selectedFiles.slice(0, availableSlots).flatMap((file) => validateImageFile(file) ? [] : [file]);
    const invalidCount = Math.min(selectedFiles.length, availableSlots) - validFiles.length;
    const pending = validFiles.map((file) => ({
      id: `pending_${createUuid()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      state: "processing" as const,
    }));
    if (!pending.length) {
      setError("Choose JPEG, PNG, or WebP images under 12 MB.");
      return;
    }
    setUploading(true);
    setPendingPhotos((current) => [...current, ...pending]);
    setError(selectedFiles.length > availableSlots || invalidCount ? "Some photos were skipped. Choose JPEG, PNG, or WebP images under 12 MB." : null);
    try { await processPendingPhotos(pending, photoCount); }
    finally { setUploading(false); }
  }

  function retryPendingPhoto(id: string) {
    const pending = pendingPhotos.find((item) => item.id === id);
    if (!pending || pending.state !== "failed") return;
    updatePendingPhoto(id, { state: "processing", message: undefined });
    void processPendingPhotos([pending], photoCount + photos.length);
  }

  async function removePhoto(itemId: string) {
    const index = photos.findIndex((photo) => photo.id === itemId);
    const adjacent = photos[index + 1] ?? photos[index - 1] ?? null;
    const result = await executeCommand({ type: "DELETE_BOARD_ITEM", ...commandBase(), itemId });
    if (result.status === "error") {
      setError(result.message);
      return;
    }
    setDetailPhotoId(adjacent?.id ?? null);
  }

  return <section ref={panelRef} className={styles.panel} aria-label="Room photos">
    <input ref={fileInputRef} className={styles.fileInput} type="file" accept="image/*" multiple onChange={uploadPhotos} />
    <header className={styles.header} hidden>
      <div><strong>Photos</strong><span>{photoCount} / {maxPhotos}</span></div>
      {canAdd ? <button type="button" disabled={uploading || photoCount >= maxPhotos} onClick={() => fileInputRef.current?.click()}>
        <Icon name={uploading ? "more" : "plus"} size={17} />
        <span>{uploading ? "Adding…" : "Add photos"}</span>
      </button> : null}
    </header>

    {error ? <div className={styles.notice} role="status">{error}<button type="button" onClick={() => setError(null)} aria-label="Dismiss"><Icon name="close" size={13} /></button></div> : null}

    <div className={styles.grid}>
      {photos.map((photo, index) => {
        const entry = photoEntries.get(photo.id);
        const entryClassName = !photo.asset
          ? ""
          : entry?.phase === "entering"
            ? styles.tileEntering
            : entry?.phase === "visible"
              ? styles.tileVisible
              : styles.tileWaiting;
        const entryStyle = entry?.phase === "entering"
          ? { "--photo-entry-delay": `${entry.delayMs}ms` } as CSSProperties
          : undefined;
        return <button
          type="button"
          key={photo.id}
          className={`${styles.tile} ${entryClassName}`}
          style={entryStyle}
          disabled={Boolean(photo.asset && entry?.phase !== "visible")}
          onAnimationEnd={() => markPhotoVisible(photo.id)}
          onClick={() => setDetailPhotoId(photo.id)}
          aria-label={`Open ${photo.imageName ?? `photo ${index + 1}`}`}
        >
          {photo.asset ? <LocalAssetImage asset={photo.asset} variant="thumbnail" alt="" fill sizes="(max-width: 700px) 33vw, 300px" className={styles.image} preferLocal cacheScope={viewerActorId} reveal="manual" onDecoded={() => markPhotoDecoded(photo.id)} /> : <span className={styles.placeholder}><Icon name="image" /></span>}
          {syncingPhotoIds.has(photo.id) ? <span className={styles.processingBadge}>Syncing</span> : null}
        </button>;
      })}
      {pendingPhotos.map((photo) => <div key={photo.id} className={`${styles.tile} ${styles.pendingTile}`} aria-live="polite">
        <Image src={photo.previewUrl} alt="" fill sizes="(max-width: 700px) 33vw, 300px" className={styles.image} unoptimized />
        <span className={styles.pendingShade} />
        <span className={styles.processingBadge}>{photo.state === "processing" ? "Preparing" : photo.state === "uploading" ? "Uploading" : "Needs retry"}</span>
        {photo.state === "failed" ? <button type="button" className={styles.retryButton} onClick={() => retryPendingPhoto(photo.id)}>{photo.message ?? "Retry"}</button> : null}
      </div>)}
      {canAdd && photoCount < maxPhotos ? <button type="button" className={`${styles.tile} ${styles.addTile}`} disabled={uploading} onClick={() => fileInputRef.current?.click()} aria-label="Add photos"><Icon name={uploading ? "more" : "plus"} size={22} /></button> : null}
    </div><div className={styles.empty} hidden>
      <Icon name="image" size={25} />
      <strong>No photos yet</strong>
      <span>{canAdd ? "Add the first photos from this device." : "Photos shared with this room will appear here."}</span>
      {canAdd ? <button type="button" onClick={() => fileInputRef.current?.click()}>Add photos</button> : null}
    </div>

    {detailPhoto ? <PhotoDetailViewer
      photo={detailPhoto}
      photos={photos}
      comments={comments.filter((comment) => comment.photoId === detailPhoto.id).toSorted((left, right) => Number(right.kind === "caption") - Number(left.kind === "caption"))}
      members={members}
      canDelete={detailPhoto.ownerActorId === viewerActorId || canModerate}
      preferLocalImage
      cacheScope={viewerActorId}
      onClose={() => setDetailPhotoId(null)}
      onPhotoChange={setDetailPhotoId}
      onComment={(body) => {
        void executeCommand({ type: "ADD_BOARD_COMMENT", ...commandBase(), itemId: detailPhoto.id, comment: { id: `photo_comment_${createUuid()}`, body } })
          .then((result) => {
            if (result.status === "error") setError(result.message);
          });
      }}
      onDelete={() => void removePhoto(detailPhoto.id)}
    /> : null}
  </section>;
}
