import Image from "next/image";
import { Icon } from "@/components/ui/icon";
import type { EditableZineStep, ZineDraft } from "../../model/zine-draft";
import { getZineStyle } from "../../model/zine-styles";
import { getRecipeForStyle } from "../../model/recipe-contract";
import { StylePagePreview } from "../style-page-preview";
import styles from "../zine-creator.module.css";

export function OverviewStep({
  draft,
  onEdit,
}: {
  readonly draft: ZineDraft;
  readonly onEdit: (step: EditableZineStep) => void;
}) {
  const style = getZineStyle(draft.styleId);
  const recipe = draft.styleId ? getRecipeForStyle(draft.styleId) : null;
  const captionedPhotos = draft.photos.filter((photo) => photo.caption.trim()).length;

  return (
    <section className={styles.overviewStep} aria-labelledby="zine-overview-heading">
      <header className={styles.stepIntro}>
        <span>04 / Overview</span>
        <h1 id="zine-overview-heading">Everything in one place.</h1>
        <p>Review the material now. Page arrangement will happen separately before the Reader.</p>
      </header>

      <div className={styles.overviewGrid}>
        <article className={styles.overviewTitleCard}>
          <div className={styles.overviewCardHeader}>
            <span>Zine name</span>
            <EditButton label="Edit name" onClick={() => onEdit("name")} />
          </div>
          <h2>{draft.name}</h2>
          <div>
            <span><strong>{draft.photos.length}</strong> photos</span>
            <span><strong>{captionedPhotos}</strong> with notes</span>
            <span><strong>{style?.name ?? "—"}</strong> style</span>
          </div>
        </article>

        <article className={styles.overviewStyleCard}>
          <div className={styles.overviewCardHeader}>
            <span>Page style</span>
            <EditButton label="Edit style" onClick={() => onEdit("style")} />
          </div>
          {style && recipe ? (
            <div className={styles.overviewStyleBody}>
              <StylePagePreview recipe={recipe} photos={draft.photos} locale={draft.locale} compact />
              <span><strong>{style.name}</strong><small>{style.description}</small></span>
            </div>
          ) : null}
        </article>

        <article className={styles.overviewPhotosCard}>
          <div className={styles.overviewCardHeader}>
            <span>Photos & notes</span>
            <EditButton label="Edit photos" onClick={() => onEdit("photos")} />
          </div>
          <div className={styles.overviewPhotoRail}>
            {draft.photos.map((photo) => (
              <div className={styles.overviewPhoto} key={photo.id}>
                <span>
                  <Image
                    unoptimized
                    src={photo.previewUrl}
                    alt={photo.fileName}
                    width={photo.width}
                    height={photo.height}
                    sizes="150px"
                  />
                </span>
                <strong>{photo.fileName}</strong>
                <small>{photo.caption.trim() || "No note yet"}</small>
              </div>
            ))}
          </div>
          <p>Photo position in this overview does not define Reader page order.</p>
        </article>
      </div>
    </section>
  );
}

function EditButton({ label, onClick }: { readonly label: string; readonly onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label={label}>
      <Icon name="edit" size={14} />
      Edit
    </button>
  );
}
