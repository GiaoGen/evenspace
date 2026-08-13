import type { RecipeDefinition } from "../model/recipe-contract";
import type { ZineLocale, ZinePhoto } from "../model/zine-draft";
import {
  createNotesByPhotoId,
  createRecipeApplication,
} from "../model/recipe-contract";
import {
  createContentItemIds,
  createPhotoFocusDefaults,
} from "../model/recipe-placement";
import { RecipeRenderer } from "./recipe-renderer";
import styles from "./zine-creator.module.css";

export function StylePagePreview({
  recipe,
  photos,
  locale,
  compact = false,
}: {
  readonly recipe: RecipeDefinition;
  readonly photos: readonly ZinePhoto[];
  readonly locale: ZineLocale;
  readonly compact?: boolean;
}) {
  const application = createRecipeApplication({
    recipe,
    content: {
      photoIds: photos.map((photo) => photo.id),
      contentItemIds: createContentItemIds("recipe-preview", photos.length),
      notesByPhotoId: createNotesByPhotoId(photos),
      defaultFocusByPhotoId: createPhotoFocusDefaults(photos),
    },
    anchorPageId: "recipe-preview",
  });

  return (
    <div className={`${styles.stylePage} ${styles.stylePageGeneric} ${compact ? styles.stylePageCompact : ""}`} aria-hidden="true">
      <RecipeRenderer
        recipe={recipe}
        application={application}
        photos={photos}
        environment={{
          pageId: "recipe-preview",
          pageSide: "left",
          mode: "preview",
          pageNumber: 1,
          title: recipe.name,
          locale,
        }}
      />
    </div>
  );
}
