import {
  recipeDefinitions as legacyAndPhaseDRecipeDefinitions,
  type RecipeDefinition,
  type RecipeRef,
} from "./recipe-contract";
import { quietRecipeDefinitions } from "./quiet-recipe-definitions";
import { editorialRecipeDefinitions } from "./editorial-recipe-definitions";
import { gridContactRecipeDefinitions } from "./grid-contact-recipe-definitions";

/**
 * Runtime Definition registry. Contract owns schema and legacy/base fixtures;
 * formal family files add data without making Contract import them back.
 */
export const formalRecipeDefinitions: readonly RecipeDefinition[] = [
  ...quietRecipeDefinitions,
  ...editorialRecipeDefinitions,
  ...gridContactRecipeDefinitions,
];

export const runtimeRecipeDefinitions: readonly RecipeDefinition[] = [
  ...legacyAndPhaseDRecipeDefinitions,
  ...formalRecipeDefinitions,
];

export function getRuntimeRecipeDefinitionByRef(ref: RecipeRef) {
  return runtimeRecipeDefinitions.find((recipe) => (
    recipe.id === ref.id && recipe.version === ref.version
  )) ?? null;
}

export function getRuntimeRecipeDefinition(recipeId: string) {
  return runtimeRecipeDefinitions.find((recipe) => recipe.id === recipeId) ?? null;
}
