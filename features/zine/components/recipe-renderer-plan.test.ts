import { describe, expect, it } from "vitest";
import { createRecipeApplication, validateRecipeDefinition } from "../model/recipe-contract";
import { phaseARecipeFixtures } from "../model/recipe-phase-a-fixtures";
import { createRecipeRenderPlan } from "./recipe-renderer-plan";
import type { ZinePhoto } from "../model/zine-draft";

function photo(id: string, caption = "") : ZinePhoto {
  return {
    id,
    file: {} as File,
    previewUrl: `blob:${id}`,
    fileName: `${id}.jpg`,
    width: 1200,
    height: 800,
    caption,
    defaultFocusX: 50,
    defaultFocusY: 50,
  };
}

describe("Phase A Recipe Renderer plan", () => {
  it("accepts a new single-page recipe without a renderer-specific branch", () => {
    const recipe = phaseARecipeFixtures[0];
    expect(recipe).toBeDefined();
    if (!recipe) return;
    expect(validateRecipeDefinition(recipe).valid).toBe(true);

    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["one"],
        contentItemIds: ["content-one"],
        notesByPhotoId: { one: "A note that stays data." },
      },
      anchorPageId: "page-one",
    });
    const plan = createRecipeRenderPlan({
      recipe,
      application,
      photos: [photo("one", "A note that stays data.")],
      environment: { pageId: "page-one", pageSide: "left", mode: "reader", pageNumber: 1, title: "Fixture" },
    });

    expect(plan.valid).toBe(true);
    expect(plan.slots.map((slot) => slot.id)).toEqual(["photo", "note", "title"]);
    expect(plan.slots.find((slot) => slot.id === "photo")?.rect).toEqual({
      x: .22,
      y: .24,
      width: .64,
      height: .5,
    });
    expect(plan.slots.find((slot) => slot.id === "photo")).toMatchObject({
      placementId: "placement:content-one",
      placementKey: "page-one:placement:content-one",
      focusX: 50,
      focusY: 50,
      scale: 1,
    });
    expect(plan.slots.find((slot) => slot.id === "note")?.notes?.[0]?.text).toBe("A note that stays data.");
    expect(plan.slots.find((slot) => slot.id === "title")?.text).toBe("Fixture");
  });

  it("clips a cross-spread slot to both page environments while keeping one assignment", () => {
    const recipe = phaseARecipeFixtures[1];
    expect(recipe).toBeDefined();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: { photoIds: ["bridge"], contentItemIds: ["bridge-content"], notesByPhotoId: {} },
      anchorPageId: "left-page",
      targetPageIds: ["left-page", "right-page"],
    });
    const left = createRecipeRenderPlan({
      recipe,
      application,
      photos: [photo("bridge")],
      environment: { pageId: "left-page", pageSide: "left", mode: "reader", pageNumber: 1, title: "Spread" },
    });
    const right = createRecipeRenderPlan({
      recipe,
      application,
      photos: [photo("bridge")],
      environment: { pageId: "right-page", pageSide: "right", mode: "reader", pageNumber: 2, title: "Spread" },
    });

    expect(application.assignments).toHaveLength(1);
    expect(left.slots[0]?.placementId).toBe("placement:bridge-content");
    expect(right.slots[0]?.placementId).toBe(left.slots[0]?.placementId);
    expect(right.slots[0]?.placementKey).not.toBe(left.slots[0]?.placementKey);
    expect(left.slots[0]).toMatchObject({ photoId: "bridge", crossSpread: true });
    expect(right.slots[0]).toMatchObject({ photoId: "bridge", crossSpread: true });
    expect(left.slots[0]?.rect.width).toBeCloseTo(.28);
    expect(right.slots[0]?.rect.width).toBeCloseTo(.28);
  });

  it("only enables empty photo placeholders outside the Reader", () => {
    const recipe = phaseARecipeFixtures[0];
    expect(recipe).toBeDefined();
    if (!recipe) return;
    const application = createRecipeApplication({
      recipe,
      content: { photoIds: [], notesByPhotoId: {} },
      anchorPageId: "empty-page",
    });
    const editor = createRecipeRenderPlan({
      recipe,
      application,
      photos: [],
      environment: { pageId: "empty-page", pageSide: "left", mode: "editor", pageNumber: 1, title: "Empty" },
    });
    const reader = createRecipeRenderPlan({
      recipe,
      application,
      photos: [],
      environment: { pageId: "empty-page", pageSide: "left", mode: "reader", pageNumber: 1, title: "Empty" },
    });

    expect(editor.slots.find((slot) => slot.id === "photo")?.showPhotoPlaceholder).toBe(true);
    expect(reader.slots.find((slot) => slot.id === "photo")?.showPhotoPlaceholder).toBe(false);
  });

  it("carries every Recipe Note Relation into the render plan", () => {
    const fixture = phaseARecipeFixtures[0];
    expect(fixture).toBeDefined();
    if (!fixture) return;
    const relations = ["adjacent", "aligned", "edge-related", "indexed", "cross-page-pair", "overlay"] as const;

    for (const relation of relations) {
      const recipe = {
        ...fixture,
        id: `phase-c-${relation}`,
        noteRelations: [{ ...fixture.noteRelations[0], kind: relation }],
      };
      const application = createRecipeApplication({
        recipe,
        content: {
          photoIds: ["one"],
          contentItemIds: ["one-content"],
          notesByPhotoId: { one: "A note for the relation." },
        },
        anchorPageId: "page-one",
      });
      const plan = createRecipeRenderPlan({
        recipe,
        application,
        photos: [photo("one", "A note for the relation.")],
        environment: { pageId: "page-one", pageSide: "left", mode: "reader", pageNumber: 1, title: "Fixture" },
      });
      const note = plan.slots.find((slot) => slot.kind === "note")?.notes?.[0];

      expect(note).toMatchObject({
        photoSlotId: "photo",
        noteSlotId: "note",
        relation,
        index: 0,
      });
    }
  });

  it("keeps multiple notes in one slot independently related", () => {
    const fixture = phaseARecipeFixtures[0];
    expect(fixture).toBeDefined();
    if (!fixture) return;
    const fixturePhotoSlot = fixture.slots.find((slot) => slot.kind === "photo");
    expect(fixturePhotoSlot).toBeDefined();
    if (!fixturePhotoSlot) return;
    const recipe = {
      ...fixture,
      id: "phase-c-mixed-relations",
      capabilities: { ...fixture.capabilities, photos: { min: 1, max: 2 } },
      slots: [
        ...fixture.slots.map((slot) => slot.kind === "photo" ? { ...slot, id: "photo-a" } : slot),
        { ...fixturePhotoSlot, id: "photo-b", rect: { ...fixturePhotoSlot.rect, y: .52 } },
      ],
      noteRelations: [
        { photoSlotId: "photo-a", noteSlotId: "note", kind: "adjacent" as const },
        { photoSlotId: "photo-b", noteSlotId: "note", kind: "indexed" as const },
      ],
    };
    const application = createRecipeApplication({
      recipe,
      content: {
        photoIds: ["one", "two"],
        contentItemIds: ["one-content", "two-content"],
        notesByPhotoId: { one: "First", two: "Second" },
      },
      anchorPageId: "page-one",
    });
    const plan = createRecipeRenderPlan({
      recipe,
      application,
      photos: [photo("one", "First"), photo("two", "Second")],
      environment: { pageId: "page-one", pageSide: "left", mode: "reader", pageNumber: 1, title: "Fixture" },
    });
    const notes = plan.slots.find((slot) => slot.id === "note")?.notes ?? [];

    expect(notes.map((note) => note.relation)).toEqual(["adjacent", "indexed"]);
    expect(notes.map((note) => note.photoSlotId)).toEqual(["photo-a", "photo-b"]);
    expect(notes.map((note) => note.index)).toEqual([0, 1]);
  });

  it("passes long note text through without renderer-side truncation", () => {
    const fixture = phaseARecipeFixtures[0];
    expect(fixture).toBeDefined();
    if (!fixture) return;
    const text = "A".repeat(180);
    const application = createRecipeApplication({
      recipe: fixture,
      content: { photoIds: ["one"], notesByPhotoId: { one: text } },
      anchorPageId: "page-one",
    });
    const plan = createRecipeRenderPlan({
      recipe: fixture,
      application,
      photos: [photo("one", text)],
      environment: { pageId: "page-one", pageSide: "left", mode: "reader", pageNumber: 1, title: "Fixture" },
    });

    expect(plan.slots.find((slot) => slot.kind === "note")?.notes?.[0]?.text).toBe(text);
  });
});
