import Image from "next/image";
import type { ZinePhoto, ZineStyleId } from "../model/zine-draft";
import styles from "./zine-creator.module.css";

const pageClasses: Record<ZineStyleId, string> = {
  editorial: styles.pageEditorial,
  contact: styles.pageContact,
  margin: styles.pageMargin,
  split: styles.pageSplit,
  night: styles.pageNight,
};

export function StylePagePreview({
  styleId,
  photos,
  compact = false,
}: {
  readonly styleId: ZineStyleId;
  readonly photos: readonly ZinePhoto[];
  readonly compact?: boolean;
}) {
  const className = `${styles.stylePage} ${pageClasses[styleId]} ${compact ? styles.stylePageCompact : ""}`;

  if (styleId === "editorial") {
    return (
      <div className={className} aria-hidden="true">
        <small>EVENTSPACE / 01</small>
        <strong>A quiet kind<br />of night.</strong>
        <PhotoTile photo={getPhoto(photos, 0)} />
        <p>There was rain on every window.</p>
      </div>
    );
  }

  if (styleId === "contact") {
    return (
      <div className={className} aria-hidden="true">
        <header><strong>SMALL<br />MOMENTS</strong><small>01—04</small></header>
        <div className={styles.contactTiles}>
          {[0, 1, 2, 3].map((index) => <PhotoTile key={index} photo={getPhoto(photos, index)} />)}
        </div>
        <p>Night after rain / fragments from one room.</p>
      </div>
    );
  }

  if (styleId === "margin") {
    return (
      <div className={className} aria-hidden="true">
        <small>03</small>
        <PhotoTile photo={getPhoto(photos, 0)} />
        <p>We left the window open.<br />The room stayed warm.</p>
      </div>
    );
  }

  if (styleId === "split") {
    return (
      <div className={className} aria-hidden="true">
        <header><strong>TWO VIEWS</strong><small>02 / 05</small></header>
        <div className={styles.splitTiles}>
          <PhotoTile photo={getPhoto(photos, 0)} />
          <PhotoTile photo={getPhoto(photos, 1)} />
        </div>
        <p>Same place, held from two sides.</p>
      </div>
    );
  }

  return (
    <div className={className} aria-hidden="true">
      <header><small>NIGHT INDEX</small><b>04</b></header>
      <PhotoTile photo={getPhoto(photos, 0)} />
      <strong>AFTER<br />THE RAIN</strong>
      <p>One last frame before the lights went out.</p>
    </div>
  );
}

function PhotoTile({ photo }: { readonly photo: ZinePhoto | null }) {
  if (!photo) return <span className={styles.pagePhotoPlaceholder} />;
  return (
    <span className={styles.pagePhoto}>
      <Image
        unoptimized
        src={photo.previewUrl}
        alt=""
        width={photo.width}
        height={photo.height}
        sizes="240px"
      />
    </span>
  );
}

function getPhoto(photos: readonly ZinePhoto[], index: number) {
  if (photos.length === 0) return null;
  return photos[index % photos.length] ?? null;
}
