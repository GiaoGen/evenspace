import { describe, expect, it } from "vitest";
import {
  DEFAULT_RECIPE_TYPOGRAPHY,
  baseRecipeDefinitions,
  createRecipeApplication,
  evaluateRecipeCompatibility,
  phaseDRecipeDefinitions,
  validateAuthoredTextItems,
  validateRecipeDefinition,
  type AuthoredTextItem,
  type RecipeDefinition,
  type RecipeStaticTextSlot,
} from "./recipe-contract";
import {
  initialZineCreatorHistoryState,
  initialZineCreatorState,
  zineCreatorHistoryReducer,
  zineCreatorReducer,
  type ZineCreatorState,
  type ZinePhoto,
} from "./zine-draft";
import { createRecipeRenderPlan } from "../components/recipe-renderer-plan";
import type { ZineManualPage, ZineManualSpread } from "./zine-manual-layout";

function authoredSlot(
  id: string,
  contentKey: string,
  pageSide: "left" | "right",
  overrides: Partial<RecipeStaticTextSlot> = {},
): RecipeStaticTextSlot {
  return {
    id,
    kind: "static-text",
    rect: pageSide === "left"
      ? { x: .08, y: .06 + (id.includes("right") ? .06 : 0), width: .34, height: .06 }
      : { x: 1.58, y: .06, width: .34, height: .06 },
    pageSide,
    required: true,
    zIndex: 20,
    foregroundToken: "ink",
    textSource: "authored",
    contentKey,
    maxCharacters: 120,
    maxLines: 3,
    role: "label",
    align: "start",
    ...overrides,
  };
}

function authoredRecipe({
  includeTitle = true,
  includeDeck = true,
  titleSlotId = "story-title",
  titleRole = "title",
}: {
  readonly includeTitle?: boolean;
  readonly includeDeck?: boolean;
  readonly titleSlotId?: string;
  readonly titleRole?: RecipeStaticTextSlot["role"];
} = {}): RecipeDefinition {
  const base = phaseDRecipeDefinitions[0]!;
  const slots = [
    ...base.slots,
    ...(includeTitle ? [authoredSlot(titleSlotId, "story-title", "left", { role: titleRole })] : []),
    ...(includeDeck ? [authoredSlot("story-deck", "story-deck", "right")] : []),
  ];
  return {
    ...base,
    id: `test-authored-${titleSlotId}-${includeTitle}-${includeDeck}`,
    version: 1,
    status: "draft",
    theme: { ...base.theme!, typography: DEFAULT_RECIPE_TYPOGRAPHY },
    slots,
  };
}

function item(
  id: string,
  contentKey: string,
  text: string,
  owner: AuthoredTextItem["owner"] = {
    kind: "spread",
    anchorPageId: "left-page",
    targetPageIds: ["left-page", "right-page"],
  },
): AuthoredTextItem {
  return { id, owner, contentKey, roleHint: contentKey === "story-title" ? "title" : "deck", text };
}

function content(
  recipe: RecipeDefinition,
  authoredTextItems: readonly AuthoredTextItem[],
  owner: AuthoredTextItem["owner"] = {
    kind: "spread",
    anchorPageId: "left-page",
    targetPageIds: ["left-page", "right-page"],
  },
) {
  return {
    photoIds: ["photo-1"],
    contentItemIds: ["content-1"],
    notesByPhotoId: {},
    authoredTextItems,
    owner,
    recipe,
  };
}

function photo(id: string): ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    width: 4,
    height: 3,
    caption: "",
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

function optionalTitleRecipe() {
  const recipe = authoredRecipe({ includeDeck: false });
  return {
    ...recipe,
    slots: recipe.slots.map((slot) => slot.id === "story-title"
      ? { ...slot, required: false }
      : slot),
  };
}

function pageAuthoredRecipe(): RecipeDefinition {
  const base = baseRecipeDefinitions[0]!;
  const slots = base.slots.map((slot) => {
    if (slot.kind === "photo") return { ...slot, zIndex: 10 };
    if (slot.kind === "note") return { ...slot, zIndex: 20, foregroundToken: "ink" as const, role: "note" as const };
    if (slot.kind !== "static-text") return slot;
    return {
      ...slot,
      zIndex: 20,
      foregroundToken: "ink" as const,
      role: slot.textSource === "page-number" ? "folio" as const : "label" as const,
    };
  });
  return {
    ...base,
    id: "test-authored-page-v1",
    status: "draft",
    theme: { ...base.theme!, typography: DEFAULT_RECIPE_TYPOGRAPHY },
    slots: [...slots, {
      ...authoredSlot("page-title", "story-title", "left", {
        role: "title",
        rect: { x: .1, y: .1, width: .7, height: .08 },
      }),
    }],
  };
}

function spreadState(
  recipe: RecipeDefinition,
  authoredTextItems: readonly AuthoredTextItem[],
): { state: ZineCreatorState; spread: ZineManualSpread; application: NonNullable<ZineManualPage["recipeApplication"]> } {
  const application = createRecipeApplication({
    recipe,
    content: {
      photoIds: ["photo-1"],
      contentItemIds: ["content-1"],
      notesByPhotoId: {},
      authoredTextItems,
      owner: { kind: "spread", anchorPageId: "left-page", targetPageIds: ["left-page", "right-page"] },
    },
    anchorPageId: "left-page",
    targetPageIds: ["left-page", "right-page"],
  });
  const page = (id: string): ZineManualPage => ({
    id,
    styleId: "editorial",
    photoIds: id === "left-page" ? ["photo-1"] : [],
    contentItemIds: id === "left-page" ? ["content-1"] : [],
    recipeApplication: application,
  });
  const spread: ZineManualSpread = { id: "manual-spread-1", left: page("left-page"), right: page("right-page") };
  return {
    state: {
      step: "manual",
      draft: {
        name: "Test zine",
        locale: "en",
        photos: [photo("photo-1")],
        styleId: "editorial",
        manualSpreads: [spread],
        authoredTextItems,
      },
    },
    spread,
    application,
  };
}

function resolverFor(recipe: RecipeDefinition) {
  return (ref: { id: string; version: number }) => (
    ref.id === recipe.id && ref.version === recipe.version ? recipe : null
  );
}

describe("authored static text contract", () => {
  it("validates an authored item and assigns it by owner plus contentKey", () => {
    const recipe = authoredRecipe();
    const authoredTextItems = [item("title-1", "story-title", "A plain title")];
    const result = evaluateRecipeCompatibility(recipe, content(recipe, [
      ...authoredTextItems,
      item("deck-1", "story-deck", "A short deck"),
    ]));

    expect(result).toMatchObject({ code: "compatible", valid: true });
    const application = createRecipeApplication({
      recipe,
      content: content(recipe, [
        ...authoredTextItems,
        item("deck-1", "story-deck", "A short deck"),
      ]),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    expect(application.textAssignments).toEqual([
      { textContentId: "title-1", staticTextSlotId: "story-title", contentKey: "story-title" },
      { textContentId: "deck-1", staticTextSlotId: "story-deck", contentKey: "story-deck" },
    ]);
    expect(application.unplacedTextContentIds).toEqual([]);
  });

  it("reports missing, character, line, and owner compatibility failures", () => {
    const recipe = authoredRecipe();
    expect(evaluateRecipeCompatibility(recipe, content(recipe, [item("deck-1", "story-deck", "deck")]))).toMatchObject({
      code: "authored-text-missing",
      contentKey: "story-title",
      slotId: "story-title",
    });

    const shortRecipe = authoredRecipe();
    const shortTitle = shortRecipe.slots.find((slot) => slot.id === "story-title") as RecipeStaticTextSlot;
    const limitedRecipe = {
      ...shortRecipe,
      slots: shortRecipe.slots.map((slot) => slot.id === shortTitle.id
        ? { ...slot, maxCharacters: 4 }
        : slot),
    };
    expect(evaluateRecipeCompatibility(limitedRecipe, content(limitedRecipe, [
      item("title-1", "story-title", "too long"),
      item("deck-1", "story-deck", "deck"),
    ]))).toMatchObject({ code: "authored-text-too-long", slotId: "story-title" });

    const lineRecipe = {
      ...shortRecipe,
      slots: shortRecipe.slots.map((slot) => slot.id === shortTitle.id
        ? { ...slot, maxLines: 1, rect: { ...slot.rect, width: .12 }, maxCharacters: 200 }
        : slot),
    };
    expect(evaluateRecipeCompatibility(lineRecipe, content(lineRecipe, [
      item("title-1", "story-title", "a".repeat(80)),
      item("deck-1", "story-deck", "deck"),
    ]))).toMatchObject({ code: "authored-text-too-many-lines", slotId: "story-title" });

    expect(evaluateRecipeCompatibility(recipe, content(recipe, [
      item("title-1", "story-title", "title", { kind: "page", pageId: "right-page" }),
      item("deck-1", "story-deck", "deck"),
    ])).code).toBe("authored-text-owner-mismatch");
  });

  it("keeps optional empty authored slots out of the render plan", () => {
    const recipe = authoredRecipe({ includeDeck: false });
    const optionalRecipe = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title" ? { ...slot, required: false } : slot),
    };
    const emptyItem = item("title-1", "story-title", "");
    expect(evaluateRecipeCompatibility(optionalRecipe, content(optionalRecipe, [emptyItem]))).toMatchObject({
      code: "compatible",
      valid: true,
    });
    const application = createRecipeApplication({
      recipe: optionalRecipe,
      content: content(optionalRecipe, [emptyItem]),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const plan = createRecipeRenderPlan({
      recipe: optionalRecipe,
      application,
      photos: [photo("photo-1")],
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode: "reader",
        pageNumber: 1,
        locale: "en",
        title: "ignored",
        authoredTextItems: [emptyItem],
      },
    });
    expect(plan.slots.some((slot) => slot.id === "story-title")).toBe(false);
  });

  it("restores by owner and contentKey across A to B to A without role or slot-order matching", () => {
    const recipeA = authoredRecipe();
    const recipeB = authoredRecipe({ titleSlotId: "b-left-label", titleRole: "label" });
    const authoredTextItems = [
      item("title-1", "story-title", "Title"),
      item("deck-1", "story-deck", "Deck"),
    ];
    const applicationA = createRecipeApplication({
      recipe: recipeA,
      content: content(recipeA, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const applicationB = createRecipeApplication({
      recipe: recipeB,
      content: content(recipeB, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
      previousApplications: [applicationA],
    });
    expect(applicationB.textAssignments?.find((assignment) => assignment.textContentId === "title-1"))
      .toMatchObject({ staticTextSlotId: "b-left-label", contentKey: "story-title" });

    const recipeWithoutTitle = authoredRecipe({ includeTitle: false });
    const applicationWithoutTitle = createRecipeApplication({
      recipe: recipeWithoutTitle,
      content: content(recipeWithoutTitle, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
      previousApplications: [applicationB],
    });
    expect(applicationWithoutTitle.unplacedTextContentIds).toContain("title-1");

    const restored = createRecipeApplication({
      recipe: recipeA,
      content: content(recipeA, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
      previousApplications: [applicationWithoutTitle],
    });
    expect(restored.textAssignments).toEqual(applicationA.textAssignments);
  });

  it("does not let a different Recipe version reuse the previous text assignment identity", () => {
    const recipeV1 = authoredRecipe();
    const recipeV2 = {
      ...recipeV1,
      version: 2,
      slots: recipeV1.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, id: "story-title-v2" }
        : slot),
    };
    const authoredTextItems = [item("title-1", "story-title", "Title"), item("deck-1", "story-deck", "Deck")];
    const first = createRecipeApplication({
      recipe: recipeV1,
      content: content(recipeV1, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const second = createRecipeApplication({
      recipe: recipeV2,
      content: content(recipeV2, authoredTextItems),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
      previousApplications: [first],
    });
    expect(second.recipeVersion).toBe(2);
    expect(second.textAssignments?.find((assignment) => assignment.textContentId === "title-1"))
      .toMatchObject({ staticTextSlotId: "story-title-v2", contentKey: "story-title" });
  });

  it("rejects invalid entities and definition authored fields", () => {
    const recipe = authoredRecipe({ includeDeck: false });
    expect(validateAuthoredTextItems([
      { ...item("bad", "bad key", "text"), cssClass: "evil" } as AuthoredTextItem,
    ])).toEqual(expect.arrayContaining([
      expect.objectContaining({ code: "field" }),
      expect.objectContaining({ code: "content-key" }),
    ]));

    const invalidDefinition = {
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, textSource: "literal" as const }
        : slot.kind === "static-text" ? { ...slot, textSource: "literal" as const } : slot),
    };
    expect(validateRecipeDefinition(invalidDefinition).valid).toBe(false);
    expect(validateRecipeDefinition({
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, contentKey: "bad key" }
        : slot),
    }).issues.some((issue) => issue.code === "authored")).toBe(true);
  });

  it("keeps authored plain text on the shared Editor/Reader plan path", () => {
    const recipe = authoredRecipe({ includeDeck: false });
    const authoredTextItem = item("title-1", "story-title", "<not markup>");
    const application = createRecipeApplication({
      recipe,
      content: content(recipe, [authoredTextItem]),
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const common = {
      recipe,
      application,
      photos: [photo("photo-1")],
    } as const;
    const editorPlan = createRecipeRenderPlan({
      ...common,
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode: "editor",
        pageNumber: 1,
        locale: "en",
        title: "wrong title",
        textBySlotId: { "story-title": "must not override authored text" },
        authoredTextItems: [authoredTextItem],
      },
    });
    const readerPlan = createRecipeRenderPlan({
      ...common,
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode: "reader",
        pageNumber: 1,
        locale: "en",
        title: "wrong title",
        authoredTextItems: [authoredTextItem],
      },
    });
    const editorText = editorPlan.slots.find((slot) => slot.id === "story-title");
    const readerText = readerPlan.slots.find((slot) => slot.id === "story-title");
    expect(editorText).toMatchObject({ text: "<not markup>", textContentId: "title-1", contentKey: "story-title" });
    expect(readerText).toMatchObject({ text: "<not markup>", textContentId: "title-1", contentKey: "story-title" });
    expect(readerText).toEqual(editorText);
  });
});

describe("authored text reducer actions", () => {
  it("creates, updates, explicitly deletes, and histories authored text without UI actions", () => {
    const authoredText = item("title-1", "story-title", "Initial", { kind: "page", pageId: "manual-page-1" });
    const created = zineCreatorReducer(initialZineCreatorState, {
      type: "UPSERT_AUTHORED_TEXT",
      item: authoredText,
    });
    const updated = zineCreatorReducer(created, {
      type: "UPDATE_AUTHORED_TEXT",
      textContentId: authoredText.id,
      text: "Updated",
    });
    expect(updated.draft.authoredTextItems?.[0]?.text).toBe("Updated");
    const deleted = zineCreatorReducer(updated, {
      type: "DELETE_AUTHORED_TEXT",
      textContentId: authoredText.id,
    });
    expect(deleted.draft.authoredTextItems).toEqual([]);

    const history = zineCreatorHistoryReducer(initialZineCreatorHistoryState, {
      type: "UPSERT_AUTHORED_TEXT",
      item: authoredText,
    });
    expect(history.past).toHaveLength(1);
    expect(history.present.draft.authoredTextItems).toHaveLength(1);
  });

  it("does not delete the entity when layout actions run", () => {
    const authoredText = item("title-1", "story-title", "Title", { kind: "page", pageId: "manual-page-1" });
    const withText = zineCreatorReducer(initialZineCreatorState, { type: "UPSERT_AUTHORED_TEXT", item: authoredText });
    const withPhoto = zineCreatorReducer(withText, { type: "ADD_PHOTOS", photos: [photo("photo-1")] });
    const styled = zineCreatorReducer(withPhoto, { type: "SET_STYLE", styleId: "editorial" });
    const manual = zineCreatorReducer(styled, { type: "GO_TO", step: "manual" });
    const applied = zineCreatorReducer(manual, {
      type: "APPLY_RECIPE",
      recipeRef: { id: "recipe-editorial-v1", version: 1 },
      pageId: "manual-page-1",
    });
    expect(applied.draft.authoredTextItems).toEqual([authoredText]);
  });

  it("rejects invalid UPSERT and UPDATE actions without changing state or history", () => {
    const valid = item("title-1", "story-title", "Title", { kind: "page", pageId: "manual-page-1" });
    const created = zineCreatorReducer(initialZineCreatorState, { type: "UPSERT_AUTHORED_TEXT", item: valid });
    const invalidShape = {
      type: "UPSERT_AUTHORED_TEXT",
      item: { ...valid, unknownField: true },
    } as never;
    expect(zineCreatorReducer(created, invalidShape)).toBe(created);

    const duplicateKey = { ...valid, id: "title-2" };
    expect(zineCreatorReducer(created, { type: "UPSERT_AUTHORED_TEXT", item: duplicateKey })).toBe(created);
    const duplicateIdState: ZineCreatorState = {
      ...created,
      draft: {
        ...created.draft,
        authoredTextItems: [valid, { ...valid, text: "duplicate" }],
      },
    };
    expect(zineCreatorReducer(duplicateIdState, {
      type: "UPSERT_AUTHORED_TEXT",
      item: valid,
    })).toBe(duplicateIdState);
    expect(zineCreatorReducer(created, {
      type: "UPDATE_AUTHORED_TEXT",
      textContentId: valid.id,
      text: 42,
    } as never)).toBe(created);

    const history = zineCreatorHistoryReducer(initialZineCreatorHistoryState, invalidShape);
    expect(history).toBe(initialZineCreatorHistoryState);
  });

  it("automatically assigns optional content added after a Recipe is already applied", () => {
    const recipe = optionalTitleRecipe();
    const { state } = spreadState(recipe, []);
    const authoredText = item("title-1", "story-title", "Added later");
    const next = zineCreatorReducer(
      state,
      { type: "UPSERT_AUTHORED_TEXT", item: authoredText },
      resolverFor(recipe),
    );
    const leftApplication = next.draft.manualSpreads?.[0]?.left?.recipeApplication;
    const rightApplication = next.draft.manualSpreads?.[0]?.right?.recipeApplication;
    expect(leftApplication).toBe(rightApplication);
    expect(leftApplication?.textAssignments).toEqual([
      { textContentId: "title-1", staticTextSlotId: "story-title", contentKey: "story-title" },
    ]);
    const plan = createRecipeRenderPlan({
      recipe,
      application: leftApplication!,
      photos: [photo("photo-1")],
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode: "reader",
        pageNumber: 1,
        locale: "en",
        title: "ignored",
        authoredTextItems: next.draft.authoredTextItems,
      },
    });
    expect(plan.slots.find((slot) => slot.id === "story-title")).toMatchObject({ text: "Added later" });
  });

  it("refreshes both sides from the same entity and Render Plan after an assigned update", () => {
    const recipe = optionalTitleRecipe();
    const authoredText = item("title-1", "story-title", "Before");
    const { state } = spreadState(recipe, [authoredText]);
    const next = zineCreatorReducer(
      state,
      { type: "UPDATE_AUTHORED_TEXT", textContentId: authoredText.id, text: "After" },
      resolverFor(recipe),
    );
    const leftApplication = next.draft.manualSpreads?.[0]?.left?.recipeApplication;
    const rightApplication = next.draft.manualSpreads?.[0]?.right?.recipeApplication;
    expect(leftApplication).toBe(rightApplication);
    expect(leftApplication?.textAssignments?.[0]?.textContentId).toBe(authoredText.id);
    const plans = (["editor", "reader"] as const).map((mode) => createRecipeRenderPlan({
      recipe,
      application: leftApplication!,
      photos: [photo("photo-1")],
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode,
        pageNumber: 1,
        locale: "en",
        title: "ignored",
        authoredTextItems: next.draft.authoredTextItems,
      },
    }));
    expect(plans[0]?.slots.find((slot) => slot.id === "story-title")?.text).toBe("After");
    expect(plans[1]?.slots.find((slot) => slot.id === "story-title")?.text).toBe("After");
  });

  it("removes an optional assignment without changing photo geometry", () => {
    const recipe = optionalTitleRecipe();
    const authoredText = item("title-1", "story-title", "Optional");
    const { state, application } = spreadState(recipe, [authoredText]);
    const next = zineCreatorReducer(
      state,
      { type: "DELETE_AUTHORED_TEXT", textContentId: authoredText.id },
      resolverFor(recipe),
    );
    const nextApplication = next.draft.manualSpreads?.[0]?.left?.recipeApplication;
    expect(nextApplication?.textAssignments).toEqual([]);
    expect(nextApplication?.assignments).toEqual(application.assignments);
    expect(nextApplication?.assignments[0]?.photoSlotId).toBe(application.assignments[0]?.photoSlotId);
  });

  it("protects required assigned text from over-limit, delete, key, and owner changes", () => {
    const recipe = authoredRecipe({ includeDeck: false });
    const authoredText = item("title-1", "story-title", "Required");
    const { state } = spreadState(recipe, [authoredText]);
    const resolve = resolverFor(recipe);
    expect(zineCreatorReducer(state, {
      type: "UPDATE_AUTHORED_TEXT",
      textContentId: authoredText.id,
      text: "x".repeat(121),
    }, resolve)).toBe(state);
    expect(zineCreatorReducer(state, {
      type: "UPDATE_AUTHORED_TEXT",
      textContentId: authoredText.id,
      text: "x".repeat(100),
    }, resolve)).toBe(state);
    expect(zineCreatorReducer(state, {
      type: "DELETE_AUTHORED_TEXT",
      textContentId: authoredText.id,
    }, resolve)).toBe(state);
    expect(zineCreatorReducer(state, {
      type: "UPSERT_AUTHORED_TEXT",
      item: { ...authoredText, contentKey: "other-key" },
    }, resolve)).toBe(state);
    expect(zineCreatorReducer(state, {
      type: "UPSERT_AUTHORED_TEXT",
      item: { ...authoredText, owner: { kind: "page", pageId: "right-page" } },
    }, resolve)).toBe(state);
  });

  it("allows an unplaced entity to exceed an unused Recipe slot's limits", () => {
    const recipe = optionalTitleRecipe();
    const authoredText = item("unplaced-1", "other-label", "short");
    const { state } = spreadState(recipe, [authoredText]);
    const next = zineCreatorReducer(state, {
      type: "UPDATE_AUTHORED_TEXT",
      textContentId: authoredText.id,
      text: "x".repeat(500),
    }, resolverFor(recipe));
    const application = next.draft.manualSpreads?.[0]?.left?.recipeApplication;
    expect(next.draft.authoredTextItems?.[0]?.text).toHaveLength(500);
    expect(application?.textAssignments).toEqual([]);
    expect(application?.unplacedTextContentIds).toContain(authoredText.id);
    const readerPlan = createRecipeRenderPlan({
      recipe,
      application: application!,
      photos: [photo("photo-1")],
      environment: {
        pageId: "left-page",
        pageSide: "left",
        mode: "reader",
        pageNumber: 1,
        locale: "en",
        title: "ignored",
        authoredTextItems: next.draft.authoredTextItems,
      },
    });
    expect(readerPlan.slots.some((slot) => slot.textContentId === authoredText.id)).toBe(false);
  });
});

describe("authored text owner and Definition integrity", () => {
  it("requires exactly two distinct spread pages and preserves ordered identity", () => {
    const valid = item("spread-1", "story-title", "Text");
    expect(validateAuthoredTextItems([{ ...valid, owner: { kind: "spread", anchorPageId: "left", targetPageIds: ["left"] } }])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "owner" })]),
    );
    expect(validateAuthoredTextItems([{ ...valid, owner: { kind: "spread", anchorPageId: "left", targetPageIds: ["left", "right", "third"] } }])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "owner" })]),
    );
    expect(validateAuthoredTextItems([{ ...valid, owner: { kind: "spread", anchorPageId: "left", targetPageIds: ["left", "left"] } }])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "owner" })]),
    );
    expect(validateAuthoredTextItems([{ ...valid, owner: { kind: "spread", anchorPageId: "other", targetPageIds: ["left", "right"] } }])).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: "owner" })]),
    );
    expect(validateAuthoredTextItems([
      valid,
      { ...valid, id: "spread-2" },
    ])).toEqual(expect.arrayContaining([expect.objectContaining({ code: "duplicate" })]));
    expect(validateAuthoredTextItems([
      valid,
      { ...valid, id: "spread-3", text: "second" },
    ])).toEqual(expect.arrayContaining([expect.objectContaining({ code: "duplicate" })]));
  });

  it("maps page-owned text only to an explicit spread side and never guesses spread to page", () => {
    const pageLeft = item("left-1", "story-title", "Left", { kind: "page", pageId: "left-page" });
    const pageRight = item("right-1", "story-deck", "Right", { kind: "page", pageId: "right-page" });
    const spreadApplication = createRecipeApplication({
      recipe: authoredRecipe(),
      content: {
        photoIds: ["photo-1"],
        notesByPhotoId: {},
        authoredTextItems: [pageLeft, pageRight],
        owner: { kind: "spread", anchorPageId: "left-page", targetPageIds: ["left-page", "right-page"] },
      },
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    expect(spreadApplication.textAssignments).toEqual([
      { textContentId: "left-1", staticTextSlotId: "story-title", contentKey: "story-title" },
      { textContentId: "right-1", staticTextSlotId: "story-deck", contentKey: "story-deck" },
    ]);

    const pageRecipe = pageAuthoredRecipe();
    const spreadOwned = item("spread-owned", "story-title", "Spread text");
    const pageApplication = createRecipeApplication({
      recipe: pageRecipe,
      content: {
        photoIds: ["photo-1"],
        notesByPhotoId: {},
        authoredTextItems: [spreadOwned],
        owner: { kind: "page", pageId: "left-page" },
      },
      anchorPageId: "left-page",
    });
    expect(pageApplication.textAssignments).toEqual([]);
    expect(pageApplication.unplacedTextContentIds).toEqual(["spread-owned"]);
  });

  it("rejects non-integer authored slot limits and keeps folio/Photo Note semantics separate", () => {
    const recipe = authoredRecipe({ includeDeck: false });
    expect(validateRecipeDefinition({
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, maxCharacters: 1.5 }
        : slot),
    }).issues.some((issue) => issue.code === "authored")).toBe(true);
    expect(validateRecipeDefinition({
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, maxLines: Number.POSITIVE_INFINITY }
        : slot),
    }).issues.some((issue) => issue.code === "authored")).toBe(true);
    for (const invalidLimit of [0, -1, Number.NaN, "12"] as const) {
      expect(validateRecipeDefinition({
        ...recipe,
        slots: recipe.slots.map((slot) => slot.id === "story-title"
          ? { ...slot, maxCharacters: invalidLimit }
          : slot) as RecipeDefinition["slots"],
      }).issues.some((issue) => issue.code === "authored")).toBe(true);
    }
    expect(validateRecipeDefinition({
      ...recipe,
      slots: recipe.slots.map((slot) => slot.id === "story-title"
        ? { ...slot, role: "folio" as const }
        : slot),
    }).issues.some((issue) => issue.code === "typography" || issue.code === "authored")).toBe(true);
  });

  it("keeps old drafts and old applications readable when authored fields are absent", () => {
    const recipe = baseRecipeDefinitions[0]!;
    const oldApplication = createRecipeApplication({
      recipe,
      content: { photoIds: ["photo-1"], notesByPhotoId: {} },
      anchorPageId: "page-1",
    });
    const persistedApplication = { ...oldApplication } as typeof oldApplication & {
      textAssignments?: undefined;
      unplacedTextContentIds?: undefined;
    };
    const plan = createRecipeRenderPlan({
      recipe,
      application: persistedApplication,
      photos: [photo("photo-1")],
      environment: {
        pageId: "page-1",
        pageSide: "left",
        mode: "reader",
        pageNumber: 1,
        locale: "en",
        title: "Old draft",
      },
    });
    expect(plan.valid).toBe(true);
    expect(plan.slots.some((slot) => slot.textContentId !== undefined)).toBe(false);
    const oldDraft: ZineCreatorState["draft"] = {
      name: "Old draft",
      locale: "en",
      photos: [photo("photo-1")],
      styleId: "editorial",
      manualSpreads: null,
    };
    expect(zineCreatorReducer({ step: "name", draft: oldDraft }, { type: "GO_TO", step: "manual" }).draft.authoredTextItems)
      .toBeUndefined();
  });
});
