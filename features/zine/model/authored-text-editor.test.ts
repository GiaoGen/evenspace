import { describe, expect, it } from "vitest";
import {
  getAuthoredTextEditorFields,
  getAuthoredTextEditorValidation,
} from "./authored-text-editor";
import { EDITORIAL_RECIPE_IDS, editorialRecipeDefinitions } from "./editorial-recipe-definitions";
import type { AuthoredTextItem } from "./recipe-contract";

const leadStory = editorialRecipeDefinitions.find((recipe) => recipe.id === EDITORIAL_RECIPE_IDS.leadStory)!;
const pageOwner = { kind: "page", pageId: "page-left" } as const;
const spreadOwner = {
  kind: "spread",
  anchorPageId: "page-left",
  targetPageIds: ["page-left", "page-right"],
} as const;

function item(
  id: string,
  contentKey: string,
  text: string,
  owner: AuthoredTextItem["owner"] = pageOwner,
): AuthoredTextItem {
  return {
    id,
    owner,
    contentKey,
    roleHint: contentKey === "story-title" ? "title" : "deck",
    text,
  };
}

describe("visible authored text field model", () => {
  it("derives Lead Story title and deck from authored slots, not slot persistence", () => {
    const fields = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] });
    expect(fields.map((field) => ({
      contentKey: field.contentKey,
      role: field.role,
      required: field.required,
      maxCharacters: field.maxCharacters,
      maxLines: field.maxLines,
    }))).toEqual([
      { contentKey: "story-title", role: "title", required: true, maxCharacters: 60, maxLines: 3 },
      { contentKey: "story-deck", role: "deck", required: false, maxCharacters: 76, maxLines: 2 },
    ]);
    expect(fields.some((field) => "slotId" in field)).toBe(false);
  });

  it("selects one exact owner + contentKey entity and never duplicates the adjacent page", () => {
    const fields = getAuthoredTextEditorFields({
      recipe: leadStory,
      owner: pageOwner,
      authoredTextItems: [
        item("title-left", "story-title", "Left title"),
        item("title-right", "story-title", "Right title", { kind: "page", pageId: "page-right" }),
      ],
    });
    expect(fields.find((field) => field.contentKey === "story-title")?.item?.id).toBe("title-left");
  });

  it("keeps page and spread owner fields atomic", () => {
    const pageFields = getAuthoredTextEditorFields({
      recipe: leadStory,
      owner: pageOwner,
      authoredTextItems: [item("spread-title", "story-title", "Shared", spreadOwner)],
    });
    const spreadFields = getAuthoredTextEditorFields({
      recipe: leadStory,
      owner: spreadOwner,
      authoredTextItems: [item("spread-title", "story-title", "Shared", spreadOwner)],
    });
    expect(pageFields.find((field) => field.contentKey === "story-title")?.item).toBeNull();
    expect(spreadFields.find((field) => field.contentKey === "story-title")?.item?.id).toBe("spread-title");
  });

  it("reports the required title as missing before it can be applied", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    const validation = getAuthoredTextEditorValidation(leadStory, title, "", "en");
    expect(validation).toMatchObject({ valid: false, code: "authored-text-missing" });
  });

  it("accepts a valid title using the same Contract check as compatibility", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    expect(getAuthoredTextEditorValidation(leadStory, title, "A valid title", "en").valid).toBe(true);
  });

  it("does not silently truncate over-limit title text", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    const tooLong = "x".repeat(61);
    const validation = getAuthoredTextEditorValidation(leadStory, title, tooLong, "en");
    expect(validation).toMatchObject({ valid: false, code: "authored-text-too-long" });
    expect(tooLong).toHaveLength(61);
  });

  it("counts explicit newlines through the shared line estimator", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    const validation = getAuthoredTextEditorValidation(leadStory, title, "One\nTwo\nThree\nFour", "en");
    expect(validation).toMatchObject({ valid: false, code: "authored-text-too-many-lines" });
    expect(validation.layout.estimatedLines).toBe(4);
  });

  it("uses the same conservative CJK line estimation as authored compatibility", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    const validation = getAuthoredTextEditorValidation(leadStory, title, "臺北街景與光線", "zh-Hant");
    expect(validation.layout.estimatedLines).toBeGreaterThan(0);
    expect(validation.layout.fits).toBe(true);
  });

  it("keeps Latin words and numeric punctuation on the same line-estimation path", () => {
    const title = getAuthoredTextEditorFields({ recipe: leadStory, owner: pageOwner, authoredTextItems: [] })[0]!;
    const validation = getAuthoredTextEditorValidation(leadStory, title, "Issue 24 — 2026 / 08", "en");
    expect(validation).toMatchObject({ valid: true, code: null });
    expect(validation.layout.estimatedLines).toBeGreaterThan(0);
  });

  it("keeps the optional deck removable by presenting an empty valid field", () => {
    const deck = getAuthoredTextEditorFields({
      recipe: leadStory,
      owner: pageOwner,
      authoredTextItems: [item("deck", "story-deck", "Existing deck")],
    }).find((field) => field.contentKey === "story-deck")!;
    expect(deck.item?.id).toBe("deck");
    expect(getAuthoredTextEditorValidation(leadStory, deck, "", "en").valid).toBe(true);
  });

  it("does not bind an authored field to a same-key entity under another spread identity", () => {
    const otherSpread = {
      kind: "spread",
      anchorPageId: "page-right",
      targetPageIds: ["page-right", "page-left"],
    } as const;
    const fields = getAuthoredTextEditorFields({
      recipe: leadStory,
      owner: spreadOwner,
      authoredTextItems: [item("other", "story-title", "Other", otherSpread)],
    });
    expect(fields.find((field) => field.contentKey === "story-title")?.item).toBeNull();
  });
});
