import { createReferencePreviewMatrix, referencePreviewScenarios, type ReferencePreviewCell } from "../model/reference-recipe-matrix";
import { getDevelopmentRecipeCatalogEntry, resolveDevelopmentRecipe } from "../model/recipe-catalog";
import { createQuietPreviewMatrix, quietPreviewScenarios, type QuietPreviewCell } from "../model/quiet-recipe-matrix";
import { createEditorialPreviewMatrix, editorialPreviewScenarios, type EditorialPreviewCell } from "../model/editorial-recipe-matrix";
import { createGridContactPreviewMatrix, gridContactPreviewScenarios, type GridContactPreviewCell } from "../model/grid-contact-recipe-matrix";
import { createDynamicPreviewMatrix, dynamicPreviewScenarios, type DynamicPreviewCell } from "../model/dynamic-recipe-matrix";
import { createChromaticPreviewMatrix, chromaticPreviewScenarios, type ChromaticPreviewCell } from "../model/chromatic-recipe-matrix";
import { RecipeRenderer } from "./recipe-renderer";
import styles from "./reference-recipe-gate.module.css";

const referencePreviewMatrix = createReferencePreviewMatrix();
const quietPreviewMatrix = createQuietPreviewMatrix();
const editorialPreviewMatrix = createEditorialPreviewMatrix();
const gridContactPreviewMatrix = createGridContactPreviewMatrix();
const dynamicPreviewMatrix = createDynamicPreviewMatrix();
const chromaticPreviewMatrix = createChromaticPreviewMatrix();

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

      <header className={`${styles.header} ${styles.secondaryHeader}`} data-quiet-anchor-gate="true">
        <p className={styles.eyebrow}>Phase F3-B1 / Quiet Anchor Gate</p>
        <h2>Quiet Formal Draft Preview Matrix</h2>
        <p>
          Formal draft Definitions stay separate from Reference Recipes and the active product menu.
          Each approved Quiet Anchor runs through its own exact-count, ratio, Note, focus, page-side,
          Compatibility, Editor, and Reader fixtures using the shared Recipe Renderer.
        </p>
      </header>

      <div className={styles.sectionStack}>
        {[...new Set(quietPreviewMatrix.map((cell) => cell.recipeId))].map((recipeId) => (
          <QuietRecipeSection key={recipeId} recipeId={recipeId} />
        ))}
      </div>

      <header className={`${styles.header} ${styles.secondaryHeader}`} data-editorial-anchor-gate="true">
        <p className={styles.eyebrow}>Phase F3-B2 / Editorial Anchor Gate</p>
        <h2>Editorial Formal Draft Preview Matrix</h2>
        <p>
          Evidence Aside, Across the Record, and Lead Story remain draft-only formal Definitions.
          The matrix uses real data-URL fixtures, Photo Note relations, and authored text items through
          the shared Application and Render Plan. It never substitutes the global Zine title for Lead Story content.
        </p>
      </header>

      <div className={styles.sectionStack}>
        {[...new Set(editorialPreviewMatrix.map((cell) => cell.recipeId))].map((recipeId) => (
          <EditorialRecipeSection key={recipeId} recipeId={recipeId} />
        ))}
      </div>

      <header className={`${styles.header} ${styles.secondaryHeader}`} data-grid-contact-anchor-gate="true">
        <p className={styles.eyebrow}>Phase F3-B3 / Grid/Contact Anchor Gate</p>
        <h2>Grid/Contact Formal Draft Preview Matrix</h2>
        <p>
          Twin Register, Twelve-up Ledger, and Cross Register remain draft-only formal Definitions.
          The matrix preserves exact photo counts, stable placement focus, page-number folios, and the
          four required Cross Register Photo Note bindings through one shared Application and Render Plan.
        </p>
      </header>

      <div className={styles.sectionStack}>
        {[...new Set(gridContactPreviewMatrix.map((cell) => cell.recipeId))].map((recipeId) => (
          <GridContactRecipeSection key={recipeId} recipeId={recipeId} />
        ))}
      </div>

      <header className={`${styles.header} ${styles.secondaryHeader}`} data-dynamic-anchor-gate="true">
        <p className={styles.eyebrow}>Phase F3-B4 / Dynamic Anchor Gate</p>
        <h2>Dynamic Formal Draft Preview Matrix</h2>
        <p>
          Edge Thrust, Drop Sequence, and Gutter Sweep remain draft-only formal Definitions.
          The matrix verifies controlled bleed, exact ordered assignments, independent placement focus,
          and one atomic cross-gutter photograph through the shared Application, Render Plan, and Renderer.
        </p>
      </header>

      <div className={styles.sectionStack}>
        {[...new Set(dynamicPreviewMatrix.map((cell) => cell.recipeId))].map((recipeId) => (
          <DynamicRecipeSection key={recipeId} recipeId={recipeId} />
        ))}
      </div>

      <header className={`${styles.header} ${styles.secondaryHeader}`} data-chromatic-anchor-gate="true">
        <p className={styles.eyebrow}>Phase F3-B5 / Chromatic Anchor Gate</p>
        <h2>Chromatic Formal Draft Preview Matrix</h2>
        <p>
          Entry Field, Four Beat, and Cross-field Note remain draft-only formal Definitions.
          The matrix verifies functional Color Fields, approved color-on/off palettes, exact ordered
          assignments, required Photo Note evidence, and Editor/Reader parity through the shared pipeline.
        </p>
      </header>

      <div className={styles.sectionStack}>
        {[...new Set(chromaticPreviewMatrix.map((cell) => cell.recipeId))].map((recipeId) => (
          <ChromaticRecipeSection key={recipeId} recipeId={recipeId} />
        ))}
      </div>
    </main>
  );
}

function ReferenceRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = referencePreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const recipeRef = { id: recipe.id, version: recipe.version };
  const developmentResolution = resolveDevelopmentRecipe(recipeRef);
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;

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
          <span>catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
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
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="reference" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function QuietRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = quietPreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const developmentResolution = resolveDevelopmentRecipe({ id: recipe.id, version: recipe.version });
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;
  const scenarios = quietPreviewScenarios.filter((scenario) => scenario.recipeId === recipeId);

  return (
    <section
      className={styles.recipeSection}
      data-quiet-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>formal catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
          <span>{recipe.scope} · exact {recipe.capabilities.photos.min} photo{recipe.capabilities.photos.min === 1 ? "" : "s"}</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {scenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="quiet" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function EditorialRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = editorialPreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const developmentResolution = resolveDevelopmentRecipe({ id: recipe.id, version: recipe.version });
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;
  const scenarios = editorialPreviewScenarios.filter((scenario) => scenario.recipeId === recipeId);

  return (
    <section
      className={styles.recipeSection}
      data-editorial-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>formal catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
          <span>{recipe.scope} · {recipe.capabilities.photos.min}–{recipe.capabilities.photos.max} photos</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {scenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="editorial" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function GridContactRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = gridContactPreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const developmentResolution = resolveDevelopmentRecipe({ id: recipe.id, version: recipe.version });
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;
  const scenarios = gridContactPreviewScenarios.filter((scenario) => scenario.recipeId === recipeId);

  return (
    <section
      className={styles.recipeSection}
      data-grid-contact-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>formal catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
          <span>{recipe.scope} · exact {recipe.capabilities.photos.min} photos</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {scenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="grid-contact" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function DynamicRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = dynamicPreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const developmentResolution = resolveDevelopmentRecipe({ id: recipe.id, version: recipe.version });
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;
  const scenarios = dynamicPreviewScenarios.filter((scenario) => scenario.recipeId === recipeId);

  return (
    <section
      className={styles.recipeSection}
      data-dynamic-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>formal catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
          <span>{recipe.scope} · exact {recipe.capabilities.photos.min} photo{recipe.capabilities.photos.min === 1 ? "" : "s"}</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {scenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="dynamic" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function ChromaticRecipeSection({ recipeId }: { readonly recipeId: string }) {
  const cells = chromaticPreviewMatrix.filter((cell) => cell.recipeId === recipeId);
  const recipe = cells[0]?.recipe;
  if (!recipe) return null;
  const developmentResolution = resolveDevelopmentRecipe({ id: recipe.id, version: recipe.version });
  const catalogEntry = developmentResolution.entry;
  const catalogValidation = developmentResolution.validation;
  const scenarios = chromaticPreviewScenarios.filter((scenario) => scenario.recipeId === recipeId);

  return (
    <section
      className={styles.recipeSection}
      data-chromatic-recipe-id={recipe.id}
      aria-labelledby={`${recipe.id}-heading`}
    >
      <header className={styles.recipeHeader}>
        <div>
          <h2 id={`${recipe.id}-heading`}>{recipe.name}</h2>
          <p>{recipe.description}</p>
        </div>
        <div className={styles.recipeMeta}>
          <span className={styles.recipeBadge}>{recipe.id}</span>
          <span>formal catalog: {catalogEntry?.status ?? "missing"}</span>
          <span>catalog validator: {catalogValidation?.valid ? "valid" : "invalid"}</span>
          <span>{recipe.scope} · exact {recipe.capabilities.photos.min} photo{recipe.capabilities.photos.min === 1 ? "" : "s"}</span>
          <span>notes: {recipe.capabilities.notes.mode}</span>
        </div>
      </header>
      {scenarios.map((scenario) => (
        <div className={styles.scenarioGroup} key={scenario.id}>
          <div className={styles.scenarioHeader}>
            <h3>{scenario.label}</h3>
            <small>{scenario.id}</small>
          </div>
          <div className={styles.cellGrid}>
            {cells
              .filter((cell) => cell.scenario === scenario.id)
              .map((cell) => <PreviewCellView key={cell.id} cell={cell} matrix="chromatic" />)}
          </div>
        </div>
      ))}
    </section>
  );
}

function PreviewCellView({
  cell,
  matrix,
}: {
  readonly cell: ReferencePreviewCell | QuietPreviewCell | EditorialPreviewCell | GridContactPreviewCell | DynamicPreviewCell | ChromaticPreviewCell;
  readonly matrix: "reference" | "quiet" | "editorial" | "grid-contact" | "dynamic" | "chromatic";
}) {
  const catalogEntry = getDevelopmentRecipeCatalogEntry({ id: cell.recipe.id, version: cell.recipe.version });
  const catalogValidation = catalogEntry
    ? resolveDevelopmentRecipe(catalogEntry.recipe).validation
    : null;
  const typographyDiagnostics = cell.plans.flatMap((plan) => plan.slots
    .filter((slot) => slot.kind === "note" || slot.kind === "static-text")
    .flatMap((slot) => {
      const token = slot.typographyToken
        ? `${slot.typographyToken.size}/${slot.typographyToken.lineHeight}/${slot.typographyToken.tracking}`
        : "unresolved";
      if (slot.kind === "note" && slot.notes && slot.notes.length > 0) {
        return slot.notes.map((note) => ({
          id: `${slot.id}:${note.photoSlotId}`,
          slotId: slot.id,
          role: slot.typographyRole ?? "unresolved",
          token,
          estimatedLines: note.typographyLayout?.estimatedLines ?? 0,
          maxLines: slot.maxLines ?? "—",
          lineBox: note.typographyLayout?.lineBoxHeight.toFixed(3) ?? "—",
          slotHeight: note.typographyLayout?.slotHeight.toFixed(3) ?? "—",
          relation: note.relation ?? "none",
          binding: `${note.photoSlotId}→${note.noteSlotId} (${note.photoId})`,
        }));
      }
      return [{
        id: `${plan.recipeId}:${slot.id}:${slot.pageId}`,
        slotId: slot.id,
        role: slot.typographyRole ?? "unresolved",
        token,
        estimatedLines: slot.typographyLayout?.estimatedLines ?? 0,
        maxLines: slot.maxLines ?? "—",
        lineBox: slot.typographyLayout?.lineBoxHeight.toFixed(3) ?? "—",
        slotHeight: slot.typographyLayout?.slotHeight.toFixed(3) ?? "—",
        relation: "none",
        binding: "—",
      }];
    }));
  return (
    <article
      className={styles.cell}
      data-reference-preview-cell={matrix === "reference" ? "true" : undefined}
      data-quiet-preview-cell={matrix === "quiet" ? "true" : undefined}
      data-editorial-preview-cell={matrix === "editorial" ? "true" : undefined}
      data-grid-contact-preview-cell={matrix === "grid-contact" ? "true" : undefined}
      data-dynamic-preview-cell={matrix === "dynamic" ? "true" : undefined}
      data-chromatic-preview-cell={matrix === "chromatic" ? "true" : undefined}
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
        <span className={styles.slotList} data-catalog-status={catalogEntry?.status ?? "missing"}>
          <strong>catalog</strong>={catalogEntry?.status ?? "missing"} · validator={catalogValidation?.valid ? "valid" : "invalid"}
        </span>
        <span className={styles.slotList} title={cell.slotIds.join(", ")}>
          <strong>slotIds</strong>={cell.slotIds.join(", ") || "none"}
        </span>
        {typographyDiagnostics.length > 0 ? (
          <div className={styles.typographyDiagnostics} data-typography-diagnostics="true">
            {typographyDiagnostics.map((diagnostic) => (
              <span key={diagnostic.id}>
                <strong>slotId={diagnostic.slotId}</strong> role={diagnostic.role} token={diagnostic.token}
                {` lines=${diagnostic.estimatedLines}/${diagnostic.maxLines} lineBox=${diagnostic.lineBox}/${diagnostic.slotHeight}`}
                {` relation=${diagnostic.relation} binding=${diagnostic.binding}`}
              </span>
            ))}
          </div>
        ) : null}
        <div className={styles.assignmentState}>
          <span>assigned={cell.application.assignments.length}</span>
          <span>unplaced={cell.application.unplacedPhotoIds.length}</span>
          {cell.application.hiddenNotePhotoIds.length > 0 ? (
            <span>hiddenNotes={cell.application.hiddenNotePhotoIds.length}</span>
          ) : null}
        </div>
        <div className={styles.assignmentDiagnostics} data-assignment-diagnostics="true">
          {cell.application.assignments.map((assignment) => (
            <span key={assignment.placementId}>
              slotId={assignment.photoSlotId} photoId={assignment.photoId} placement={assignment.placementId}
              {` note=${assignment.noteSlotId ?? "none"} noteOf=${assignment.noteOfPhotoId ?? "none"}`}
            </span>
          ))}
          <span>unplacedPhotoIds={cell.application.unplacedPhotoIds.join(",") || "none"}</span>
          <span>
            pages={cell.environments.map((environment) => `${environment.pageSide}:${environment.pageNumber}`).join(",")}
          </span>
        </div>
      </div>
    </article>
  );
}
