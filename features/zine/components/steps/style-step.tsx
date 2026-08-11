import { zineStyleOptions } from "../../model/zine-styles";
import type { ZinePhoto, ZineStyleId } from "../../model/zine-draft";
import { getRecipeForStyle } from "../../model/recipe-contract";
import { StylePagePreview } from "../style-page-preview";
import styles from "../zine-creator.module.css";

export function StyleStep({
  photos,
  selectedStyleId,
  onSelect,
}: {
  readonly photos: readonly ZinePhoto[];
  readonly selectedStyleId: ZineStyleId | null;
  readonly onSelect: (styleId: ZineStyleId) => void;
}) {
  return (
    <section className={styles.styleStep} aria-labelledby="zine-style-heading">
      <header className={styles.stepIntro}>
        <span>03 / Choose a style</span>
        <h1 id="zine-style-heading">Set the page language.</h1>
        <p>Each option is a real page proportion, with a different rhythm for photographs and notes.</p>
      </header>

      <div className={styles.styleWorkspace}>
        <div className={styles.styleWorkspaceHeader}>
          <strong>{selectedStyleId ? "Style selected" : "Choose one page"}</strong>
          <small>Swipe horizontally to compare</small>
        </div>
        <div className={styles.styleRail}>
          {zineStyleOptions.map((style) => {
            const selected = style.id === selectedStyleId;
            const recipe = getRecipeForStyle(style.id);
            if (!recipe) return null;
            return (
              <button
                key={style.id}
                type="button"
                className={`${styles.styleOption} ${selected ? styles.styleOptionSelected : ""}`}
                aria-pressed={selected}
                onClick={() => onSelect(style.id)}
              >
                <StylePagePreview recipe={recipe} photos={photos} />
                <span className={styles.styleOptionMeta}>
                  <span><strong>{style.name}</strong><small>{style.pageNote}</small></span>
                  <i aria-hidden="true">{selected ? "✓" : ""}</i>
                </span>
                <p>{style.description}</p>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
