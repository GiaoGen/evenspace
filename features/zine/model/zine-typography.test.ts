import { createHash } from "node:crypto";
import { readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  RECIPE_TYPOGRAPHY_PRESETS,
  getRecipeTypographyLayoutMetrics,
  resolveRecipeTypographyFontRole,
  type RecipeTheme,
} from "./recipe-contract";
import {
  ZINE_FONT_ASSETS,
  createZineTypographyIssue,
  findUnsupportedZineCodePoints,
  getZineFontFiles,
} from "./zine-typography";

describe("Zine typography asset reality", () => {
  it("pins every packaged asset to its recorded byte size and SHA-256", () => {
    for (const asset of ZINE_FONT_ASSETS) {
      const path = resolve(process.cwd(), "public", "fonts", asset.filename);
      const bytes = statSync(path).size;
      const sha256 = createHash("sha256").update(readFileSync(path)).digest("hex");
      expect({ bytes, sha256 }, asset.filename).toEqual({
        bytes: asset.bytes,
        sha256: asset.sha256,
      });
    }
  });

  it("routes SC and TC through bundled locale assets without an OS family", () => {
    expect(getZineFontFiles("zh-Hans", "display-serif")).toEqual([
      "bodoni-moda.woff2",
      "noto-serif-sc.woff2",
    ]);
    expect(getZineFontFiles("zh-Hant", "support-sans")).toEqual([
      "geist.woff2",
      "noto-sans-tc.woff2",
    ]);
    expect(getZineFontFiles("en", "metadata-mono")).toEqual([
      "geist-mono.woff2",
      "noto-sans-tc.woff2",
    ]);
  });

  it("accepts covered regional glyphs and hard-fails uncovered characters", () => {
    expect(findUnsupportedZineCodePoints("港口最后一班车", "zh-Hans", "support-sans")).toEqual([]);
    expect(findUnsupportedZineCodePoints("港口最後一班車", "zh-Hant", "support-sans")).toEqual([]);
    expect(findUnsupportedZineCodePoints("𠮷🚇", "zh-Hant", "support-sans")).toEqual([
      0x1f687,
      0x20bb7,
    ]);
    expect(createZineTypographyIssue({
      text: "𠮷🚇",
      locale: "zh-Hant",
      presetId: "photoessay-field",
      fontRole: "support-sans",
    })).toMatchObject({
      code: "unsupported-glyph",
      codePoints: ["U+01F687", "U+020BB7"],
    });
  });
});

describe("approved typography presets", () => {
  const theme = (typographyPreset: RecipeTheme["typographyPreset"]): RecipeTheme => ({
    background: "#fff",
    foreground: "#111",
    muted: "#555",
    photoBackground: "#ddd",
    typographyPreset,
  });

  it("keeps P1 serif exclusive to title and routes its deck to sans", () => {
    const displayTheme = theme("photoessay-display");
    expect(resolveRecipeTypographyFontRole(displayTheme, "title")).toBe("display-serif");
    expect(resolveRecipeTypographyFontRole(displayTheme, "deck")).toBe("support-sans");
    expect(RECIPE_TYPOGRAPHY_PRESETS["photoessay-display"].deck.weight).toBe(400);
  });

  it("clamps CJK tracking and text transform while preserving Latin tracking", () => {
    const label = RECIPE_TYPOGRAPHY_PRESETS["photoessay-register"].label;
    const latin = getRecipeTypographyLayoutMetrics("label", label, {
      presetId: "photoessay-register",
      locale: "en",
    });
    const cjk = getRecipeTypographyLayoutMetrics("label", label, {
      presetId: "photoessay-register",
      locale: "zh-Hant",
    });
    expect(latin.trackingEm).toBe(.08);
    expect(cjk.trackingEm).toBe(0);
  });
});
