import {
  ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID,
  ZINE_TYPOGRAPHY_SYSTEM_ID,
  type ZineTypographySystemId,
} from "../model/zine-typography";
import {
  ZINE_TYPOGRAPHY_SPECIMENS,
  ZINE_TYPOGRAPHY_SPECIMEN_PRESETS,
  createZineTypographySpecimenApplication,
  createZineTypographySpecimenRecipe,
} from "../model/zine-typography-specimens";
import { createRecipeRenderPlan, RecipeRenderer } from "./recipe-renderer";
import styles from "./typography-specimen-gate.module.css";

const SYSTEMS = [
  { id: ZINE_TYPOGRAPHY_SYSTEM_ID, label: "S1 Duplex Photo-Essay" },
  { id: ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID, label: "S2 Plex Unified Archive" },
] as const;

export function TypographySpecimenGate() {
  return (
    <main className={styles.page} data-typography-specimen-gate="true">
      <header className={styles.header}>
        <p>Phase F3-T2 / Asset, Specimen & Runtime Reality</p>
        <h1>Zine typography specimen gate</h1>
        <span>
          S1 and the locked S2 fallback render identical text, geometry, presets, weights and locale semantics.
          T28 must fail explicitly: bundled coverage never delegates to an unknown system font.
        </span>
      </header>

      {ZINE_TYPOGRAPHY_SPECIMEN_PRESETS.map((presetId) => (
        <section className={styles.presetSection} key={presetId}>
          <header>
            <h2>{presetId}</h2>
            <p>Seven controlled roles / S1–S2 / Editor–Reader parity</p>
          </header>
          <div className={styles.specimenGrid}>
            {ZINE_TYPOGRAPHY_SPECIMENS.map((specimen) => {
              const recipe = createZineTypographySpecimenRecipe(specimen, presetId);
              const application = createZineTypographySpecimenApplication(recipe);
              return (
                <article
                  className={styles.specimenCard}
                  data-specimen-id={specimen.id}
                  data-specimen-role={specimen.role}
                  key={`${presetId}-${specimen.id}`}
                >
                  <header>
                    <strong>{specimen.id} · {specimen.label}</strong>
                    <span>{specimen.locale} · {specimen.role} · ≤ {specimen.maxLines} lines</span>
                  </header>
                  <div className={styles.systemGrid}>
                    {SYSTEMS.map((system) => (
                      <SpecimenSystem
                        application={application}
                        recipe={recipe}
                        specimen={specimen}
                        system={system}
                        key={system.id}
                      />
                    ))}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </main>
  );
}

function SpecimenSystem({
  application,
  recipe,
  specimen,
  system,
}: {
  readonly application: ReturnType<typeof createZineTypographySpecimenApplication>;
  readonly recipe: ReturnType<typeof createZineTypographySpecimenRecipe>;
  readonly specimen: (typeof ZINE_TYPOGRAPHY_SPECIMENS)[number];
  readonly system: { readonly id: ZineTypographySystemId; readonly label: string };
}) {
  const environment = {
    pageId: recipe.id,
    pageSide: "left" as const,
    pageNumber: 1,
    title: recipe.name,
    locale: specimen.locale,
    textBySlotId: { "specimen-text": specimen.text },
  };
  const plan = createRecipeRenderPlan({
    recipe,
    application,
    photos: [],
    environment: { ...environment, mode: "reader" },
    typographySystem: system.id,
  });
  const layout = plan.slots[0]?.typographyLayout;
  return (
    <section className={styles.system} data-typography-system={system.id}>
      <header>
        <strong>{system.label}</strong>
        <span data-valid={plan.valid}>
          {plan.valid ? `${layout?.estimatedLines ?? 0} lines · ${layout?.fits ? "fit" : "overflow"}` : plan.typographyIssues[0]?.codePoints.join(" ")}
        </span>
      </header>
      <div className={styles.modePair}>
        {(["editor", "reader"] as const).map((mode) => (
          <figure key={mode} aria-label={`${system.label}, ${specimen.id}, ${mode}`}>
            <RecipeRenderer
              recipe={recipe}
              application={application}
              photos={[]}
              environment={{ ...environment, mode }}
              typographySystem={system.id}
            />
            <figcaption>{mode}</figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
