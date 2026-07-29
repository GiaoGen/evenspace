"use client";

import { useLayoutEffect, useRef, useState, type ChangeEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { ActorId, RoomPublicId } from "@/core/domain/ids";
import type { ArtVariant, BoardComment, BoardItem, BoardPhoto, PersonSummary } from "@/core/domain/room";
import { createUuid } from "@/core/domain/uuid";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import { saveLocalAsset } from "@/features/local-assets/model/local-asset-repository";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { compressImage, validateImageFile } from "./board/image-upload";
import { PhotoDetailViewer } from "./board/photo-detail-viewer";
import styles from "./photos-panel.module.css";

const photoVariants: readonly ArtVariant[] = ["one", "two", "three", "four"];

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
}) {
  const { session, executeCommand } = useMockSession();
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const [detailPhotoId, setDetailPhotoId] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const photos = items.filter((item): item is BoardPhoto => item.kind === "photo");
  const detailPhoto = photos.find((photo) => photo.id === detailPhotoId) ?? null;
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

  async function uploadPhotos(event: ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selectedFiles.length || uploading) return;

    const availableSlots = Math.max(0, maxPhotos - photoCount);
    if (!availableSlots) {
      setError(`This room has reached its ${maxPhotos}-photo limit.`);
      return;
    }

    const files = selectedFiles.slice(0, availableSlots);
    setUploading(true);
    setError(selectedFiles.length > availableSlots ? `Only the first ${availableSlots} photos could be added.` : null);

    let failed = 0;
    let lastFailure: string | null = null;
    for (const [index, file] of files.entries()) {
      const validation = validateImageFile(file);
      if (validation) {
        failed += 1;
        lastFailure = validation;
        continue;
      }
      try {
        const image = await compressImage(file);
        const asset = await saveLocalAsset(image.blob, "image");
        const item: BoardPhoto = {
          id: `photo_${createUuid()}`,
          kind: "photo",
          ownerActorId: viewerActorId,
          variant: photoVariants[(photoCount + index) % photoVariants.length],
          asset,
          imageName: file.name.slice(0, 120),
          aspectRatio: image.aspectRatio,
          note: null,
          x: 0,
          y: 0,
          rotation: 0,
          width: 24,
        };
        const result = await executeCommand({ type: "ADD_BOARD_ITEM", ...commandBase(), item });
        if (result.status === "error") {
          failed += 1;
          lastFailure = result.message;
        }
      } catch (caught) {
        failed += 1;
        lastFailure = caught instanceof Error ? caught.message : null;
      }
    }

    if (failed) setError(lastFailure ?? `${failed} ${failed === 1 ? "photo" : "photos"} could not be added. Use JPEG, PNG, WebP, or smaller originals.`);
    setUploading(false);
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
      {photos.map((photo, index) => <button type="button" key={photo.id} className={styles.tile} onClick={() => setDetailPhotoId(photo.id)} aria-label={`Open ${photo.imageName ?? `photo ${index + 1}`}`}>
        {photo.asset ? <LocalAssetImage asset={photo.asset} alt="" fill sizes="(max-width: 700px) 33vw, 300px" className={styles.image} /> : <span className={styles.placeholder}><Icon name="image" /></span>}
      </button>)}
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
