"use client";

import { useState } from "react";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { getBoardPhotoFramePreviewAspectRatio } from "@/core/domain/board-layout";
import type { BoardFrameVariant } from "@/core/domain/room";
import type { CompressedImage } from "./image-upload";
import { useCenteredCardSelection } from "./use-centered-card-selection";
import styles from "./board.module.css";

export type PendingBoardPhoto = CompressedImage & { readonly name: string; readonly previewUrl: string };

const frames: readonly { readonly value: BoardFrameVariant; readonly label: string }[] = [
  { value: "pin", label: "Pin" },
  { value: "gallery", label: "Gallery" },
  { value: "instant", label: "Instant" },
  { value: "tape", label: "Tape" },
  { value: "dark", label: "Dark" },
];

export function PhotoFrameStudio({ photo, onClose, onAdd }: { readonly photo: PendingBoardPhoto; readonly onClose: () => void; readonly onAdd: (frame: BoardFrameVariant) => void }) {
  const [frame, setFrame] = useState<BoardFrameVariant>("pin");
  const { railRef, onScroll, select } = useCenteredCardSelection(frame, setFrame);
  const selectedIndex = frames.findIndex((item) => item.value === frame);

  return <div className={styles.frameStudioBackdrop} role="dialog" aria-modal="true" aria-label="Choose a photo frame" onPointerDown={onClose}>
    <section className={styles.frameStudio} onPointerDown={(event) => event.stopPropagation()}>
      <div ref={railRef} className={styles.frameCardRail} onScroll={onScroll}>
        {frames.map((item) => <article key={item.value} data-carousel-value={item.value} className={`${styles.frameStyleCard} ${frame === item.value ? styles.frameStyleSelected : ""}`} style={{ aspectRatio: String(getBoardPhotoFramePreviewAspectRatio(photo.aspectRatio, item.value)) }}>
          <button type="button" onClick={() => select(item.value)} aria-label={`Use ${item.label} frame`}>
            <PinnedPhoto variant="one" frameVariant={item.value} previewUrl={photo.previewUrl} imageName={photo.name} className={styles.framePreviewPhoto} />
          </button>
        </article>)}
      </div>
      <div className={styles.frameStudioActions}>
        <button type="button" onClick={onClose} aria-label="Close frame picker"><Icon name="close" /></button>
        <span><b>{frames[selectedIndex]?.label}</b><i>{selectedIndex + 1}/{frames.length}</i></span>
        <button type="button" className={styles.confirmAction} onClick={() => onAdd(frame)} aria-label="Pin photo with selected frame"><Icon name="check" /></button>
      </div>
    </section>
  </div>;
}
