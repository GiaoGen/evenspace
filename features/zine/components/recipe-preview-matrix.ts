import {
  baseRecipeDefinitions,
  createRecipeApplication,
  getRecipeForStyle,
  phaseDRecipeDefinitions,
  type RecipeApplication,
  type RecipeContent,
  type RecipeDefinition,
} from "../model/recipe-contract";
import { phaseARecipeFixtures } from "../model/recipe-phase-a-fixtures";
import type { ZinePhoto } from "../model/zine-draft";
import type { RecipeRenderEnvironment } from "./recipe-renderer-plan";

export type RecipePreviewTag =
  | "empty"
  | "minimum"
  | "maximum"
  | "over-capacity"
  | "landscape"
  | "portrait"
  | "square"
  | "ultra-wide"
  | "no-note"
  | "short-note"
  | "long-note"
  | "multi-note"
  | "left-page"
  | "right-page"
  | "standard-spread"
  | "cross-gutter"
  | "dark-background"
  | "color-system";

export type RecipePreviewContentFixture = {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly RecipePreviewTag[];
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
};

export type RecipePreviewPageFixture = {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly RecipePreviewTag[];
  readonly environment: RecipeRenderEnvironment;
};

export type RecipePreviewMatrixCase = {
  readonly id: string;
  readonly label: string;
  readonly tags: readonly RecipePreviewTag[];
  readonly recipe: RecipeDefinition;
  readonly contentFixtureId: string;
  readonly pageFixtureIds: readonly string[];
  readonly content: RecipeContent;
  readonly photos: readonly ZinePhoto[];
  readonly application: RecipeApplication;
  readonly environments: readonly RecipeRenderEnvironment[];
};

export const recipePreviewContentFixtures: readonly RecipePreviewContentFixture[] = [
  createContentFixture("empty", "Empty page", [], ["empty"]),
  createContentFixture(
    "minimum-landscape",
    "Minimum · landscape",
    [{ id: "landscape", width: 1600, height: 900, caption: "A short note." }],
    ["minimum", "landscape", "short-note"],
  ),
  createContentFixture(
    "portrait",
    "Portrait photograph",
    [{ id: "portrait", width: 900, height: 1600, caption: "Portrait note." }],
    ["portrait", "short-note"],
  ),
  createContentFixture(
    "square",
    "Square photograph",
    [{ id: "square", width: 1200, height: 1200, caption: "Square note." }],
    ["square", "short-note"],
  ),
  createContentFixture(
    "ultra-wide",
    "Ultra-wide photograph",
    [{ id: "ultra-wide", width: 2400, height: 700, caption: "Wide note." }],
    ["ultra-wide", "short-note"],
  ),
  createContentFixture(
    "no-note",
    "Photo without Note",
    [{ id: "no-note", width: 1600, height: 900, caption: "" }],
    ["minimum", "landscape", "no-note"],
  ),
  createContentFixture(
    "short-note",
    "Short Note",
    [{ id: "short-note", width: 1600, height: 900, caption: "A short note." }],
    ["minimum", "landscape", "short-note"],
  ),
  createContentFixture(
    "long-note",
    "Long Note",
    [{ id: "long-note", width: 1600, height: 900, caption: "Long note. ".repeat(18) }],
    ["minimum", "landscape", "long-note"],
  ),
  createContentFixture(
    "maximum-multi-note",
    "Maximum photos · multiple Notes",
    [
      { id: "multi-1", width: 1600, height: 900, caption: "First Note." },
      { id: "multi-2", width: 900, height: 1600, caption: "Second Note." },
      { id: "multi-3", width: 1200, height: 1200, caption: "Third Note." },
      { id: "multi-4", width: 2400, height: 700, caption: "Fourth Note." },
    ],
    ["maximum", "multi-note", "landscape", "portrait", "square", "ultra-wide"],
  ),
  createContentFixture(
    "over-capacity",
    "Over-capacity photos",
    [
      { id: "over-1", width: 1600, height: 900, caption: "First." },
      { id: "over-2", width: 900, height: 1600, caption: "Second." },
      { id: "over-3", width: 1200, height: 1200, caption: "Third." },
    ],
    ["over-capacity", "landscape", "portrait", "square"],
  ),
];

export const recipePreviewPageFixtures: readonly RecipePreviewPageFixture[] = [
  createPageFixture("left-editor", "Left page · Editor", "left", "editor", ["left-page"]),
  createPageFixture("left-reader", "Left page · Reader", "left", "reader", ["left-page"]),
  createPageFixture("right-reader", "Right page · Reader", "right", "reader", ["right-page"]),
  createPageFixture("spread-left", "Standard spread · Left", "left", "reader", ["standard-spread"]),
  createPageFixture("spread-right", "Standard spread · Right", "right", "reader", ["standard-spread"]),
];

export function createRecipePreviewMatrix(): readonly RecipePreviewMatrixCase[] {
  const offsetRecipe = baseRecipeDefinitions[0];
  const contactRecipe = getRecipeForStyle("contact");
  const splitRecipe = getRecipeForStyle("split");
  const gutterRecipe = phaseARecipeFixtures[1];
  const darkRecipe = phaseDRecipeDefinitions[0];
  if (!offsetRecipe || !contactRecipe || !splitRecipe || !gutterRecipe || !darkRecipe) return [];

  const coloredRecipe = {
    ...offsetRecipe,
    id: "phase-e-color-system",
    theme: {
      background: "#243b7a",
      foreground: "#fff7dc",
      muted: "#c8d4ff",
      photoBackground: "#3856a0",
    },
  } satisfies RecipeDefinition;

  return [
    createMatrixCase("empty-editor", "Empty page editor", offsetRecipe, "empty", ["left-editor"], ["empty", "left-page"]),
    createMatrixCase("minimum-landscape", "Minimum landscape", offsetRecipe, "minimum-landscape", ["left-reader"], ["minimum", "landscape", "short-note", "left-page"]),
    createMatrixCase("portrait", "Portrait", offsetRecipe, "portrait", ["left-reader"], ["portrait", "left-page"]),
    createMatrixCase("square", "Square", offsetRecipe, "square", ["left-reader"], ["square", "left-page"]),
    createMatrixCase("ultra-wide", "Ultra-wide", offsetRecipe, "ultra-wide", ["left-reader"], ["ultra-wide", "left-page"]),
    createMatrixCase("right-page", "Right page", offsetRecipe, "minimum-landscape", ["right-reader"], ["right-page", "landscape"]),
    createMatrixCase("no-note", "No Note", offsetRecipe, "no-note", ["left-reader"], ["no-note", "left-page"]),
    createMatrixCase("short-note", "Short Note", offsetRecipe, "short-note", ["left-reader"], ["short-note", "left-page"]),
    createMatrixCase("long-note", "Long Note", offsetRecipe, "long-note", ["left-reader"], ["long-note", "left-page"]),
    createMatrixCase("maximum-multi-note", "Maximum photos with multiple Notes", contactRecipe, "maximum-multi-note", ["left-reader"], ["maximum", "multi-note", "left-page"]),
    createMatrixCase("over-capacity", "Over-capacity", splitRecipe, "over-capacity", ["left-reader"], ["over-capacity", "left-page"]),
    createMatrixCase("spread-left", "Standard spread photo · Left", gutterRecipe, "minimum-landscape", ["spread-left"], ["standard-spread", "cross-gutter"]),
    createMatrixCase("spread-right", "Standard spread photo · Right", gutterRecipe, "minimum-landscape", ["spread-right"], ["standard-spread", "cross-gutter"]),
    createMatrixCase("dark-cross-gutter", "Dark cross-gutter spread", darkRecipe, "minimum-landscape", ["spread-left", "spread-right"], ["standard-spread", "cross-gutter", "dark-background"]),
    createMatrixCase("color-system", "Color system", coloredRecipe, "minimum-landscape", ["left-reader"], ["color-system", "left-page"]),
  ];
}

function createContentFixture(
  id: string,
  label: string,
  photoDefinitions: readonly { readonly id: string; readonly width: number; readonly height: number; readonly caption: string }[],
  tags: readonly RecipePreviewTag[],
) : RecipePreviewContentFixture;
function createContentFixture(
  id: string,
  label: string,
  photoDefinitions: readonly { readonly id: string; readonly width: number; readonly height: number; readonly caption: string }[],
  tags: readonly RecipePreviewTag[],
) {
  const photos = photoDefinitions.map((definition) => createPreviewPhoto(definition));
  return {
    id,
    label,
    tags,
    content: {
      photoIds: photos.map((photo) => photo.id),
      notesByPhotoId: Object.fromEntries(photos.map((photo) => [photo.id, photo.caption])),
    },
    photos,
  } satisfies RecipePreviewContentFixture;
}

function createPageFixture(
  id: string,
  label: string,
  pageSide: "left" | "right",
  mode: "editor" | "reader",
  tags: readonly RecipePreviewTag[],
) {
  return {
    id,
    label,
    tags,
    environment: {
      pageId: `preview-${id}`,
      pageSide,
      mode,
      pageNumber: pageSide === "left" ? 1 : 2,
      title: label,
    },
  } satisfies RecipePreviewPageFixture;
}

function createMatrixCase(
  id: string,
  label: string,
  recipe: RecipeDefinition,
  contentFixtureId: string,
  pageFixtureIds: readonly string[],
  tags: readonly RecipePreviewTag[],
) {
  const contentFixture = recipePreviewContentFixtures.find((fixture) => fixture.id === contentFixtureId);
  const pageFixtures = pageFixtureIds.map((pageId) => recipePreviewPageFixtures.find((fixture) => fixture.id === pageId));
  if (!contentFixture || pageFixtures.some((fixture) => !fixture)) {
    throw new Error(`Missing Preview Matrix fixture for ${id}.`);
  }
  const environments = pageFixtures.flatMap((fixture) => fixture ? [fixture.environment] : []);
  const application = createRecipeApplication({
    recipe,
    content: contentFixture.content,
    anchorPageId: environments[0]?.pageId ?? `preview-${id}`,
    targetPageIds: environments.map((environment) => environment.pageId),
  });
  return {
    id,
    label,
    tags: [...new Set([...contentFixture.tags, ...pageFixtures.flatMap((fixture) => fixture?.tags ?? []), ...tags])],
    recipe,
    contentFixtureId,
    pageFixtureIds,
    content: contentFixture.content,
    photos: contentFixture.photos,
    application,
    environments,
  } satisfies RecipePreviewMatrixCase;
}

function createPreviewPhoto({
  id,
  width,
  height,
  caption,
}: {
  readonly id: string;
  readonly width: number;
  readonly height: number;
  readonly caption: string;
}): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `preview:${id}`,
    fileName: `${id}.jpg`,
    width,
    height,
    caption,
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}
