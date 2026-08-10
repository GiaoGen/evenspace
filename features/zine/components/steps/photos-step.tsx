import Image from "next/image";
import { useState, type CSSProperties, type ChangeEvent, type DragEvent } from "react";
import { Icon } from "@/components/ui/icon";
import {
  splitPhotosIntoVisualRows,
  ZINE_CAPTION_LIMIT,
  type ZinePhoto,
} from "../../model/zine-draft";
import styles from "../zine-creator.module.css";

const PHOTO_INPUT_ID = "zine-photo-input";

export function PhotosStep({
  photos,
  onAddPhotos,
  onRemovePhoto,
  onCaptionChange,
}: {
  readonly photos: readonly ZinePhoto[];
  readonly onAddPhotos: (files: readonly File[]) => Promise<void>;
  readonly onRemovePhoto: (photo: ZinePhoto) => void;
  readonly onCaptionChange: (photoId: string, value: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const rows = splitPhotosIntoVisualRows(photos);

  async function addFiles(files: readonly File[]) {
    const imageFiles = files.filter((file) => file.type.startsWith("image/"));
    if (imageFiles.length === 0) {
      setUploadError("Choose image files to add to this zine.");
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      await onAddPhotos(imageFiles);
    } catch {
      setUploadError("Some photos could not be opened. Try adding them again.");
    } finally {
      setUploading(false);
    }
  }

  async function handleInput(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const files = Array.from(input.files ?? []);
    try {
      await addFiles(files);
    } finally {
      input.value = "";
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    void addFiles(Array.from(event.dataTransfer.files));
  }

  return (
    <section className={styles.photosStep} aria-labelledby="zine-photos-heading">
      <header className={styles.stepIntro}>
        <span>02 / Add photos</span>
        <h1 id="zine-photos-heading">Bring in the pieces.</h1>
        <p>Add a note to any photo. The Reader will place it near the photo&apos;s outer corner.</p>
      </header>

      <input
        id={PHOTO_INPUT_ID}
        className={styles.visuallyHidden}
        type="file"
        accept="image/*"
        multiple
        onChange={handleInput}
      />

      <div
        className={`${styles.photoWorkspace} ${dragging ? styles.photoWorkspaceDragging : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false);
        }}
        onDrop={handleDrop}
      >
        <div className={styles.photoWorkspaceHeader}>
          <span>
            <strong>{photos.length} {photos.length === 1 ? "photo" : "photos"}</strong>
            <small>This layout does not set Reader page order.</small>
          </span>
          {photos.length > 0 ? (
            <label htmlFor={PHOTO_INPUT_ID} className={styles.addMoreButton}>
              <Icon name="plus" size={15} />
              {uploading ? "Opening…" : "Add more"}
            </label>
          ) : null}
        </div>

        <div className={`${styles.photoWorkspaceBody} ${photos.length === 0 ? styles.photoWorkspaceEmpty : ""}`}>
          {photos.length === 0 ? (
            <label htmlFor={PHOTO_INPUT_ID} className={styles.uploadCard}>
              <span><Icon name="image" size={22} /></span>
              <strong>{uploading ? "Opening photos…" : "Add photos"}</strong>
              <small>Tap to choose<br />or drop them here</small>
            </label>
          ) : null}

          {photos.length > 0 ? (
            <div className={styles.photoRail} aria-label="Added photos">
              <div className={styles.photoRows}>
                {rows.map((row, rowIndex) => (
                  <div className={styles.photoRow} key={rowIndex}>
                    {row.map((photo) => (
                      <PhotoCard
                        key={photo.id}
                        photo={photo}
                        onRemove={() => onRemovePhoto(photo)}
                        onCaptionChange={(value) => onCaptionChange(photo.id, value)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className={styles.emptyPhotoHint}>Photos stay at their complete original ratio.</p>
          )}
        </div>
      </div>

      {uploadError ? <p className={styles.uploadError} role="alert">{uploadError}</p> : null}
      <p className={styles.photoFootnote}>You will arrange pages later. Nothing here decides the reading sequence.</p>
    </section>
  );
}

function PhotoCard({
  photo,
  onRemove,
  onCaptionChange,
}: {
  readonly photo: ZinePhoto;
  readonly onRemove: () => void;
  readonly onCaptionChange: (value: string) => void;
}) {
  const ratio = photo.height > 0 ? photo.width / photo.height : 1;
  const style = { "--photo-ratio": Math.min(1.75, Math.max(0.72, ratio)) } as CSSProperties;

  return (
    <article className={styles.photoCard} style={style}>
      <div className={styles.photoImage}>
        <Image
          unoptimized
          src={photo.previewUrl}
          alt={photo.fileName}
          width={photo.width}
          height={photo.height}
          sizes="(max-width: 640px) 260px, 320px"
        />
        <button type="button" onClick={onRemove} aria-label={`Remove ${photo.fileName}`}>
          <Icon name="trash" size={14} />
        </button>
      </div>
      <label>
        <span>Photo note <small>{photo.caption.length} / {ZINE_CAPTION_LIMIT}</small></span>
        <input
          value={photo.caption}
          maxLength={ZINE_CAPTION_LIMIT}
          placeholder="Write something for this photo…"
          aria-label={`Note for ${photo.fileName}`}
          onChange={(event) => onCaptionChange(event.target.value)}
        />
      </label>
    </article>
  );
}
