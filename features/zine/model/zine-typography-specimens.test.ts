import { describe, expect, it } from "vitest";
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";
import { validateRecipeDefinition } from "./recipe-contract";
import {
  ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID,
  ZINE_TYPOGRAPHY_SYSTEM_ID,
} from "./zine-typography";
import {
  ZINE_TYPOGRAPHY_SPECIMENS,
  ZINE_TYPOGRAPHY_SPECIMEN_PRESETS,
  createZineTypographySpecimenApplication,
  createZineTypographySpecimenRecipe,
} from "./zine-typography-specimens";

describe("F3-T2 typography specimen matrix", () => {
  it("locks the approved 28-item multilingual content library", () => {
    expect(ZINE_TYPOGRAPHY_SPECIMENS).toHaveLength(28);
    expect(new Set(ZINE_TYPOGRAPHY_SPECIMENS.map((item) => item.id)).size).toBe(28);
    expect(new Set(ZINE_TYPOGRAPHY_SPECIMENS.map((item) => item.locale))).toEqual(
      new Set(["en", "zh-Hans", "zh-Hant"]),
    );
  });

  it("keeps every synthetic recipe valid and Editor/Reader plans identical", () => {
    for (const presetId of ZINE_TYPOGRAPHY_SPECIMEN_PRESETS) {
      for (const specimen of ZINE_TYPOGRAPHY_SPECIMENS) {
        const recipe = createZineTypographySpecimenRecipe(specimen, presetId);
        const application = createZineTypographySpecimenApplication(recipe);
        expect(validateRecipeDefinition(recipe).issues, `${presetId}/${specimen.id}`).toEqual([]);
        for (const typographySystem of [ZINE_TYPOGRAPHY_SYSTEM_ID, ZINE_FALLBACK_TYPOGRAPHY_SYSTEM_ID]) {
          const common = {
            recipe,
            application,
            photos: [],
            typographySystem,
          } as const;
          const environment = {
            pageId: recipe.id,
            pageSide: "left" as const,
            pageNumber: 1,
            title: recipe.name,
            locale: specimen.locale,
            textBySlotId: { "specimen-text": specimen.text },
          };
          const editor = createRecipeRenderPlan({ ...common, environment: { ...environment, mode: "editor" } });
          const reader = createRecipeRenderPlan({ ...common, environment: { ...environment, mode: "reader" } });
          expect(reader, `${typographySystem}/${presetId}/${specimen.id}`).toEqual(editor);
          expect(reader.valid, `${typographySystem}/${presetId}/${specimen.id}`).toBe(specimen.id !== "T28");
          if (specimen.id !== "T28") {
            expect(reader.slots[0]?.typographyLayout?.estimatedLines, `${typographySystem}/${presetId}/${specimen.id}`)
              .toBeLessThanOrEqual(specimen.maxLines);
          }
        }
      }
    }
  });
});
