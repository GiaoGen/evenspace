import Image from "next/image";
import type { ArtVariant, BoardFrameVariant } from "@/core/domain/room";
import styles from "./pinned-photo.module.css";

export function PinnedPhoto({ variant, frameVariant = "pin", note, imageDataUrl, imageName, className = "" }: { readonly variant: ArtVariant; readonly frameVariant?: BoardFrameVariant; readonly note?: string | null; readonly imageDataUrl?: string; readonly imageName?: string; readonly className?: string }) {
  return (
    <div className={`${styles.photo} ${styles[`frame${frameVariant}`]} ${className}`}>
      <div className={styles.strip}><span /></div>
      {imageDataUrl ? <div className={styles.realPhoto}><Image src={imageDataUrl} alt={imageName ? `Pinned photo: ${imageName}` : "Pinned photo"} fill sizes="(max-width: 700px) 70vw, 360px" unoptimized /></div> : <div className={`${styles.art} ${styles[variant]}`} aria-hidden="true"><i /><i /><i /></div>}
      {note ? <p>{note}</p> : null}
    </div>
  );
}
