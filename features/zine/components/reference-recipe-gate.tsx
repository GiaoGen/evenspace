import { createReferencePreviewMatrix, referencePreviewScenarios, type ReferencePreviewCell } from "../model/reference-recipe-matrix";
import { RecipeRenderer } from "./recipe-renderer";
import styles from "./reference-recipe-gate.module.css";

const referencePreviewMatrix = createReferencePreviewMatrix();

export function ReferenceRecipeGate() {
  const recipes = [...new Map(referencePreviewMatrix.map((cell) => [cell.recipeId, cell.recipe])).values()];
  return (
    <main className={styles.page} data-reference-recipe-gate="true">
      <header className={styles.header}>
        <p className={styles.eyebrow}>Phase E.1 / Reference Recipe Gate</p>
        <h1>Reference Recipe Preview Matrix</h1>
        <p>
          Development-only direct renderer matrix. Every reference recipe is exercised with minimum,
          maximum, over-capacity, empty content, photo ratios, Note lengths, Compatibility limits, and an
          Editor / Reader pair. No StPageFlip is involved, so each failure stays close to the Recipe slot
          that produced it.
        </p>
        <div className={styles.gateLegend} aria-label="Preview Matrix legend">
          <span>Editor · empty slots visible</span>
          <span>Reader · empty slots hidden</span>
          <span>slotId · failure locator</span>
        </div>
      </header>

      <div className={styles.sectionStack}>
        {recipes.map((recipe) => (
          <ReferenceRecipeSection key={recipe.id} recipeId={recipe.id} />
        ))}
      </div>
    </main>
  );
}

function ReferenceRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = referencePreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;

  return (
    <section
      className={styles.recipeSection}
      data-reference-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>{recipe.scope} · {recipe.capabilities.photos.min}–{recipe.capabilities.photos.max} photos</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {referencePreviewScenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <ReferencePreviewCellView key={cell.id} cell={cell} />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function ReferencePreviewCellView({ cell }: { readonly cell: ReferencePreviewCell }) {
  return (
    <article
      className={styles.cell}
      data-reference-preview-cell="true"
      data-recipe-id={cell.recipeId}
      data-fixture-id={cell.fixtureId}
      data-mode={cell.mode}
      data-slot-ids={cell.slotIds.join(",")}
      data-compatibility-code={cell.compatibility.code}
    >
      <div className={styles.cellMeta}>
        <div className={styles.cellMetaTop}>
          <span className={styles.modeBadge}>{cell.mode}</span>
          <span className={styles.cellCode}>{cell.scenario}</span>
        </div>
        <div className={styles.cellCode} title={cell.recipeId}>
          <strong>recipeId</strong>={cell.recipeId}
        </div>
        <div className={styles.cellCode} title={cell.fixtureId}>
          <strong>fixtureId</strong>={cell.fixtureId}
        </div>
      </div>

      <div className={styles.cellCanvasRow}>
        {cell.environments.map((environment, index) => (
          <div className={styles.canvasFrame} key={environment.pageId} data-page-side={environment.pageSide}>
            <RecipeRenderer
              recipe={cell.recipe}
              application={cell.application}
              photos={cell.photos}
              environment={environment}
            />
            {cell.recipe.scope === "spread" ? (
              <span className={styles.cellCode} aria-hidden="true">
                {environment.pageSide} {index + 1}
              </span>
            ) : null}
          </div>
        ))}
      </div>

      <div className={styles.cellFooter}>
        {cell.errors.length > 0 ? (
          <div className={styles.errorList} data-validator-error-slot-id={cell.errors[0]?.slotId}>
            {cell.errors.map((error) => (
              <span key={`${error.slotId}-${error.message}`}>
                <strong>slotId={error.slotId}</strong> {error.message}
              </span>
            ))}
          </div>
        ) : (
          <span className={styles.validState}>valid recipe · direct render</span>
        )}
        <div
          className={cell.compatibility.valid ? styles.compatibilityValid : styles.compatibilityInvalid}
          data-compatibility-status={cell.compatibility.valid ? "valid" : "invalid"}
          data-compatibility-error-slot-id={cell.compatibility.valid ? undefined : cell.compatibilitySlotId}
        >
          <strong>{cell.errors.length > 0 ? "validator=invalid" : "validator=valid"} · compatibility={cell.compatibility.code}</strong>
          {cell.compatibility.valid ? " · allowed" : ` · blocked · slotId=${cell.compatibilitySlotId}`}
          {cell.compatibility.reason ? ` · ${cell.compatibility.reason}` : ""}
        </div>
        <span className={styles.slotList} title={cell.slotIds.join(", ")}>
          <strong>slotIds</strong>={cell.slotIds.join(", ") || "none"}
        </span>
        <div className={styles.assignmentState}>
          <span>assigned={cell.application.assignments.length}</span>
          <span>unplaced={cell.application.unplacedPhotoIds.length}</span>
          {cell.application.hiddenNotePhotoIds.length > 0 ? (
            <span>hiddenNotes={cell.application.hiddenNotePhotoIds.length}</span>
          ) : null}
        </div>
      </div>
    </article>
  );
}
