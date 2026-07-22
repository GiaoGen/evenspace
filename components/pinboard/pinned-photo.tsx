"use client";

import Image from "next/image";
import type { AssetReference } from "@/core/domain/asset";
import type { ArtVariant, BoardFrameVariant } from "@/core/domain/room";
import { LocalAssetImage } from "@/features/local-assets/components/local-asset-image";
import styles from "./pinned-photo.module.css";

export function PinnedPhoto({ variant, frameVariant = "pin", note, asset, previewUrl, imageName, bare = false, className = "" }: { readonly variant: ArtVariant; readonly frameVariant?: BoardFrameVariant; readonly note?: string | null; readonly asset?: AssetReference; readonly previewUrl?: string; readonly imageName?: string; readonly bare?: boolean; readonly className?: string }) {
  return (
    <div className={`${styles.photo} ${styles[`frame${frameVariant}`]} ${bare ? styles.bare : ""} ${className}`}>
      <div className={styles.strip}><span /></div>
      {asset || previewUrl ? <div className={styles.realPhoto}>{asset ? <LocalAssetImage asset={asset} alt={imageName ? `Pinned photo: ${imageName}` : "Pinned photo"} fill sizes="(max-width: 700px) 70vw, 360px" /> : <Image src={previewUrl!} alt={imageName ? `Pinned photo: ${imageName}` : "Pinned photo"} fill sizes="(max-width: 700px) 70vw, 360px" unoptimized />}</div> : <div className={`${styles.art} ${styles[variant]}`} aria-hidden="true"><i /><i /><i /></div>}
      {note ? <p>{note}</p> : null}
    </div>
  );
}
