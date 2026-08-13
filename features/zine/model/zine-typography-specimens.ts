import {
  RECIPE_SCHEMA_VERSION,
  RECIPE_TYPOGRAPHY_PRESET_IDS,
  type RecipeApplication,
  type RecipeDefinition,
  type RecipeTypographyPresetId,
  type RecipeTypographyRole,
} from "./recipe-contract";
import type { ZineLocale } from "./zine-draft";

export type ZineTypographySpecimen = {
  readonly id: `T${string}`;
  readonly label: string;
  readonly role: RecipeTypographyRole;
  readonly locale: ZineLocale;
  readonly text: string;
  readonly maxLines: number;
};

export const ZINE_TYPOGRAPHY_SPECIMENS: readonly ZineTypographySpecimen[] = [
  { id: "T01", label: "繁中短标题", role: "title", locale: "zh-Hant", text: "雨停之後，街角仍在發亮", maxLines: 2 },
  { id: "T02", label: "繁中长标题", role: "title", locale: "zh-Hant", text: "港口最後一班車離站以前，我們沿著防波堤記下風向、潮聲與仍未熄滅的窗", maxLines: 3 },
  { id: "T03", label: "简中短标题", role: "title", locale: "zh-Hans", text: "雨停之后，街角仍在发亮", maxLines: 2 },
  { id: "T04", label: "简中长标题", role: "title", locale: "zh-Hans", text: "港口最后一班车离站以前，我们沿着防波堤记下风向、潮声与仍未熄灭的窗", maxLines: 3 },
  { id: "T05", label: "English display", role: "title", locale: "en", text: "After the Rain, the Corner Kept Shining", maxLines: 3 },
  { id: "T06", label: "混排标题", role: "title", locale: "zh-Hant", text: "台北 05:40 — Notes Before First Light", maxLines: 3 },
  { id: "T07", label: "繁中 deck", role: "deck", locale: "zh-Hant", text: "從清晨市場到末班渡輪，這組影像追蹤一座城市如何在潮濕、噪音與等待之間重新組織自己的節奏。", maxLines: 2 },
  { id: "T08", label: "简中 deck", role: "deck", locale: "zh-Hans", text: "从清晨市场到末班渡轮，这组影像追踪一座城市如何在潮湿、噪音与等待之间重新组织自己的节奏。", maxLines: 2 },
  { id: "T09", label: "English deck", role: "deck", locale: "en", text: "A photographic index of thresholds, detours, and small negotiations before the city fully wakes.", maxLines: 2 },
  { id: "T10", label: "繁中 caption", role: "caption", locale: "zh-Hant", text: "基隆，仁愛市場入口，05:43。", maxLines: 2 },
  { id: "T11", label: "简中 caption", role: "caption", locale: "zh-Hans", text: "基隆，仁爱市场入口，05:43。", maxLines: 2 },
  { id: "T12", label: "混排 caption", role: "caption", locale: "zh-Hant", text: "Frame 07／ISO 800／1⁄125 sec／雨後", maxLines: 2 },
  { id: "T13", label: "繁中 note 60", role: "note", locale: "zh-Hant", text: "攤販把塑膠布往上捲，水沿著鐵架落下。照片右側的手只出現一瞬，卻標記了市場真正開始工作的時間。", maxLines: 4 },
  { id: "T14", label: "简中 note 60", role: "note", locale: "zh-Hans", text: "摊贩把塑料布往上卷，水沿着铁架落下。照片右侧的手只出现一瞬，却标记了市场真正开始工作的时间。", maxLines: 4 },
  { id: "T15", label: "繁中 note 120", role: "note", locale: "zh-Hant", text: "這一頁不是事件的總結，而是兩張照片之間的證詞：左頁記錄等待的人，右頁記錄離開後留下的椅子。閱讀順序可以往返，但人物、時間與地點的關係不能因換行而消失。", maxLines: 4 },
  { id: "T16", label: "简中 note 120", role: "note", locale: "zh-Hans", text: "这一页不是事件的总结，而是两张照片之间的证词：左页记录等待的人，右页记录离开后留下的椅子。阅读顺序可以往返，但人物、时间与地点的关系不能因换行而消失。", maxLines: 4 },
  { id: "T17", label: "English note", role: "note", locale: "en", text: "The note connects two photographs without explaining them away: one records the waiting body; the other, the chair left behind.", maxLines: 4 },
  { id: "T18", label: "强制换行", role: "note", locale: "zh-Hant", text: "第一段證詞留在左頁。\n第二段只補充時間，不替照片下結論。", maxLines: 4 },
  { id: "T19", label: "Latin label", role: "label", locale: "en", text: "FIELD NOTE 07", maxLines: 1 },
  { id: "T20", label: "繁中 label", role: "label", locale: "zh-Hant", text: "現場筆記 07", maxLines: 1 },
  { id: "T21", label: "简中 label", role: "label", locale: "zh-Hans", text: "现场笔记 07", maxLines: 1 },
  { id: "T22", label: "folio", role: "folio", locale: "en", text: "0048 — 0049", maxLines: 1 },
  { id: "T23", label: "Latin index", role: "index", locale: "en", text: "KR-07 / 05:43 / N25°08′", maxLines: 1 },
  { id: "T24", label: "繁中 index", role: "index", locale: "zh-Hant", text: "市場入口／雨／手推車／清晨", maxLines: 1 },
  { id: "T25", label: "简中 index", role: "index", locale: "zh-Hans", text: "市场入口／雨／手推车／清晨", maxLines: 1 },
  { id: "T26", label: "标点样张", role: "caption", locale: "zh-Hant", text: "「潮汐」、《候車亭》——（05:40）… 30％／A–B", maxLines: 2 },
  { id: "T27", label: "易混字形", role: "index", locale: "zh-Hant", text: "0O 1Il 2Z 5S 8B；日曰、己已巳、未末、土士", maxLines: 2 },
  { id: "T28", label: "缺字/emoji hard fail", role: "note", locale: "zh-Hant", text: "𠮷野家・髙島・臺灣・摄影・🚌", maxLines: 2 },
] as const;

export const ZINE_TYPOGRAPHY_SPECIMEN_PRESETS = RECIPE_TYPOGRAPHY_PRESET_IDS;

export function createZineTypographySpecimenRecipe(
  specimen: ZineTypographySpecimen,
  presetId: RecipeTypographyPresetId,
): RecipeDefinition {
  return {
    schemaVersion: RECIPE_SCHEMA_VERSION,
    id: `typography-specimen-${presetId}-${specimen.id}`,
    version: 1,
    familyId: "typography-specimen",
    name: `${presetId} / ${specimen.id}`,
    description: "Development-only F3-T2 typography reality specimen.",
    status: "draft",
    scope: "page",
    capabilities: {
      photos: { min: 0, max: 0 },
      notes: { mode: "none" },
      allowsEmptyDraft: true,
    },
    canvas: {
      pageRatio: "3:4",
      safeArea: { x: .06, y: .06, width: .88, height: .88 },
    },
    theme: {
      background: "#f4f0e8",
      foreground: "#1d1c19",
      muted: "#4b4842",
      photoBackground: "#d8d2c8",
      typographyPreset: presetId,
    },
    slots: [{
      id: "specimen-text",
      kind: "static-text",
      rect: specimenRect(specimen.role),
      pageSide: "left",
      required: true,
      zIndex: 20,
      foregroundToken: "ink",
      ...(specimen.role === "folio"
        ? { textSource: "page-number" as const }
        : { text: specimen.text, textSource: "literal" as const }),
      role: specimen.role,
      align: "start",
    }],
    noteRelations: [],
  };
}

export function createZineTypographySpecimenApplication(
  recipe: RecipeDefinition,
): RecipeApplication {
  return {
    recipeId: recipe.id,
    recipeVersion: recipe.version,
    scope: recipe.scope,
    anchorPageId: recipe.id,
    targetPageIds: [recipe.id],
    assignments: [],
    unplacedPhotoIds: [],
    hiddenNotePhotoIds: [],
    textAssignments: [],
    unplacedTextContentIds: [],
  };
}

function specimenRect(role: RecipeTypographyRole) {
  if (role === "title") return { x: .08, y: .14, width: .84, height: .36 };
  if (role === "deck") return { x: .08, y: .18, width: .84, height: .2 };
  if (role === "note") return { x: .08, y: .15, width: .84, height: .52 };
  return { x: .08, y: .18, width: .84, height: .18 };
}
