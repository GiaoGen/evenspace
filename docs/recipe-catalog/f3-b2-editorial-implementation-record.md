# Phase F3-B2 — Editorial Family Draft Implementation Record

> 实施日期：2026-08-13
> 状态：三个 Editorial Anchor 的 Definition、Catalog 与开发 Preview 已实现；代码自动化 Gate 全部通过。所有条目继续为 `draft`，停止在 Editorial 用户视觉 Gate。

## 1. 范围与停止点

本批严格按获批顺序实现：

1. `editorial-evidence-aside-v1`
2. `editorial-across-the-record-v1`
3. `editorial-lead-story-v1`

没有激活 Quiet 或 Editorial，没有进入 F3-B3 Grid/Contact，没有实现 authored-text 可见编辑 UI，也没有修改 StPageFlip、镜头、手势、页面导航或专用 Recipe Renderer 分支。

三个 Definition 均为 `schemaVersion: 1`、`version: 1`、`familyId: "editorial"`、`status: "draft"`、`pageRatio: "3:4"`、`allowsEmptyDraft: false`，且不含 `legacy` 或 `legacyStyleId`。共享 neutral Theme：`#F4F0E8` paper、`#17191C` ink、`#55585D` muted-ink、`#D7D3CA` photo-mat 与 `DEFAULT_RECIPE_TYPOGRAPHY`；没有 Color Field 或 accent。

## 2. Definition 与 Slot 表

所有 Photo Slot 都是 `fit: "cover"`，统一使用 Photo 10..19 band；固定文字和 Note 使用 Text 20..29 band。

### 2.1 Evidence Aside

| Slot | kind | rect | pageSide | required | z | 语义 |
| --- | --- | --- | --- | --- | ---: | --- |
| `photo-main` | photo | `{x:.07,y:.13,width:.62,height:.63}` | left | yes | 10 | 主场景图 |
| `label-evidence` | static-text | `{x:.71,y:.08,width:.22,height:.04}` | left | yes | 20 | literal `EVIDENCE 02` / label |
| `note-evidence` | note | `{x:.71,y:.14,width:.22,height:.22}` | left | no | 21 | optional Note，max 4 lines |
| `photo-evidence` | photo | `{x:.71,y:.47,width:.22,height:.37}` | left | yes | 11 | 从属证据图 |

- `scope: page`，照片 exact 2，Note `optional`，字符上限 60、行上限 4。
- 唯一 relation 是 `photo-evidence → note-evidence / adjacent`。
- `photo-main` 的 Photo Note 不会被错误绑定到 `note-evidence`；没有 Note 时固定 rect 不 reflow、不放大任何照片。
- 第三张照片进入 `unplacedPhotoIds`。

### 2.2 Across the Record

| Slot | kind | rect | pageSide | required | z | 语义 |
| --- | --- | --- | --- | --- | ---: | --- |
| `photo-record` | photo | `{x:.08,y:.08,width:.84,height:.84}` | left | yes | 10 | 左页视觉证据，不跨 gutter |
| `label-record` | static-text | `{x:1.15,y:.12,width:.35,height:.05}` | right | yes | 20 | literal `RECORD 01` / label |
| `note-record` | note | `{x:1.15,y:.25,width:.60,height:.34}` | right | yes | 21 | required 实录 Note，max 4 lines |

- `scope: spread`，照片 exact 1，Note `required`，字符上限 120、行上限 4。
- 唯一 spread evidence 是 `photo-record → note-record / cross-page-pair`；`deriveSpreadEvidence` 只返回这一项。
- 空 Note 为 `needs-content`；第二张照片进入 `unplacedPhotoIds`，不伪造右页照片或第二 evidence。
- 左右页共享同一 `RecipeApplication` 与 placement identity；从任一侧预览仍是原子 spread。

### 2.3 Lead Story

| Slot | kind | rect | pageSide | required | z | 语义 |
| --- | --- | --- | --- | --- | ---: | --- |
| `title-lead` | static-text | `{x:.08,y:.07,width:.84,height:.13}` | left | yes | 20 | authored `story-title` / title / 60 chars / 3 lines |
| `deck-lead` | static-text | `{x:.08,y:.21,width:.54,height:.09}` | left | no | 21 | authored `story-deck` / deck / 76 chars / 2 lines |
| `photo-lead` | photo | `{x:.08,y:.34,width:.84,height:.58}` | left | yes | 10 | 唯一主图 |

- `scope: page`，照片 exact 1，Note mode `none`；Photo Note 仍保留在源照片/Application 中但隐藏。
- `title-lead` 与 `deck-lead` 只能从真实 `AuthoredTextItem` 的 `contentKey` 读取；Definition 不携带 literal text，不读取全局 `Zine` name，也不接受 `textBySlotId` 替代 authored assignment。
- `story-title` 是 page-owned、required；`story-deck` 是同一 page owner 下的 optional 内容。deck 缺失时 title、photo 与全部 rect 不移动。
- 超过 60/3 或 76/2 会得到明确 authored-text Compatibility 诊断，不缩字号、不截断、不移动照片。

## 3. Registry、Catalog 与生产边界

- `editorial-recipe-definitions.ts` 是 Editorial Definition 的唯一数据来源，导出稳定 `EDITORIAL_RECIPE_IDS`、共享 Theme、三个 Definition 与 exact `getEditorialRecipeDefinition`。
- `recipe-definition-registry.ts` 以 `recipeId + recipeVersion` 汇总 formal Definitions；当前 formal Definition 为 Quiet 3 + Editorial 3，旧 runtime/Phase D Definition 全部保留。
- `recipe-catalog.ts` 为三个 Definition 建立独立 `RecipeCatalogEntry`，全部 `status: "draft"`。Catalog 只声明 family、比例偏好/风险、topology、composition axis、reading direction、color strategy、pace、subject-edge risk、gutter risk 和受控 Preview scenario IDs；scope、照片能力、density、dominant image scale、Note relation 与 bleed 从 Definition 派生。
- Development resolver 可精确返回 Editorial draft Definition 和 Catalog Validator 诊断；active resolver 对三个 Editorial ref 全部返回 `null`。正式菜单的 active 计数没有增加。
- Legacy registry 仍是旧 Style 映射的唯一运行时真相源；Editorial Definition 没有伪造旧 style ID。

## 4. Preview Matrix

`editorial-recipe-matrix.ts` 只准备数据并调用通用 `createRecipeApplication`、`evaluateRecipeCompatibility` 与 `createRecipeRenderPlan`；没有 Editorial-specific JSX/CSS/Renderer 分支。fixture 使用现有本地 data-URL SVG 测试图片。

| Recipe | 场景组 | cells | 重点 |
| --- | ---: | ---: | --- |
| Evidence Aside | 18 | 36 | empty、1/2/3 photos、no/short/60/over Note、ratio/crop risk、左右页、独立 focus、正确/错误 Note 绑定 |
| Across the Record | 18 | 36 | empty/empty Note、1/short/120/over Note、over-capacity、ratio risk、完整 spread、左右 plan、focus continuity、唯一 relation、无 Color Field |
| Lead Story | 23 | 46 | empty/title missing、title/deck short/max/over、owner mismatch、左右 page owner、四类比例、focus、Photo Note hidden、deck fixed geometry、global title/textBySlotId 不替代 authored |
| **总计** | **66** | **132** | 每个场景均有 Editor 与 Reader |

每个 cell 明确携带并在页面显示：`recipeId`、`fixtureId`、`mode`、scenario、Catalog status/Validator、Compatibility code、slot IDs、assignment/unplaced 状态。错误定位优先返回 `slotId` 或 `contentKey`；Reader 计划不输出空照片 placeholder。

## 5. 数据链与测试覆盖

- Evidence Aside：Note 只由 evidence photo 的 caption 进入 `note-evidence`；主图 caption 不会猜测式绑定。
- Across the Record：左右计划读取同一 spread Application；左页只显示照片，右页只显示 literal label + bound Note。
- Lead Story：fixture 先构造真正 `AuthoredTextItem`，再由 `createRecipeApplication` 生成 `textAssignments`，Render Plan 从同一 item 读取文字。Editor 与 Reader 使用同一文字/slot geometry；只有空照片 placeholder 模式不同。
- 对获批的文字上限使用现有确定性 line estimation；字符上限与实际 rendered line 上限分别校验，任一超限都会明确拒绝，不缩字号或截断。此次没有新增 Contract 字段；窄 Note/Deck 的“字符达到上限但行数超限”会保留为明确 `*-too-many-lines` 诊断。

新增测试：

- [`editorial-recipe-definitions.test.ts`](../../features/zine/model/editorial-recipe-definitions.test.ts)：Definition 身份、Slot/rect、band、Photo cover、spread evidence、Registry exact ref、Catalog draft/active gate、三种 Recipe 的 Compatibility/Application 边界。
- [`editorial-recipe-matrix.test.ts`](../../features/zine/model/editorial-recipe-matrix.test.ts)：66 场景 / 132 cells、真实 data URL、Editor/Reader、Photo Note relation、spread 原子性、unplaced、focus、AuthoredText owner/contentKey、global title/textBySlotId 防替代、Reader placeholder 抑制，以及 Latin/数字/CJK/不可拆分长词压力。

既有 Quiet、Reference、Legacy、Catalog、Renderer、Authored Static Text 测试继续回归。

## 6. Lead Story UI 边界

当前没有正常手动排版页面中的可见 authored-text 编辑 UI。Lead Story Preview 已经验证真实 Draft/Application/Compatibility/Render Plan 数据链，但这不等于手动 Editor 可以编辑 title/deck。因此 Lead Story 必须继续是 `draft`，不能因 Preview 通过而激活。

三个 Editorial 条目继续为 `draft` 的原因：

1. 用户尚未完成本批 Preview Matrix 的视觉 Gate。
2. Evidence Aside 的 8.14% evidence photo 仍需真实 Reader 尺寸下主体可辨认检查。
3. Across the Record 需要真实短/长 Note、左右单页职责、装订与 focus continuity 检查。
4. Lead Story 的 visible authored-text UI 尚未交付；title/deck 只能在 Preview fixture 中通过真实 authored data 验证。

## 7. 用户手动验证路径

由用户启动本地开发环境后打开 `/zine/preview-matrix`，定位 **Editorial Formal Draft Preview Matrix**：

1. 先确认三个 header 均显示 `formal catalog: draft` 与 `catalog validator: valid`，正式手动排版菜单不增加 Editorial。
2. Evidence Aside：检查 `no-note` 与 `short-note` 的几何固定；确认 Note 只在 `photo-evidence`，主图有 caption 时不误绑；重点检查 Reader 中窄 evidence 图的主体可辨。
3. Across the Record：检查完整 spread、left-plan、right-plan 和 focus-continuity；确认左页没有 Note、右页没有照片，短/长 Note 不改变固定 rect，左右 Application 是同一原子选择。
4. Lead Story：检查 `required-short-title`、`short-title-deck`、`max-60-three-lines`、`max-76-deck-two-lines`、`deck-absence-fixed-geometry` 与 `environment-title-ignored`；确认 Reader 无 placeholder/编辑控件，Editor/Reader authored text 相同。
5. 按 `recipeId`、`fixtureId`、`mode` 和 `slotId` 记录任何视觉问题；不要通过改成 active 或新增专用 Renderer 分支绕过问题。

本记录完成后停止在 **Phase F3-B2 Editorial 用户视觉 Gate**，不自动进入 F3-B3。

## F3-B2.1 — Editorial Text Capacity Consistency Closure

本收口只修正已经发现的、在现有固定几何与确定性行数估算下不可达的文字容量上限：Evidence Aside Note 为 **60 字符 / 4 行**，Lead Story deck 为 **76 字符 / 2 行**；Across the Record 仍为 **120 / 4**，Lead Story title 仍为 **60 / 3**。换行符计入 `maxCharacters`。

- `max-60-four-lines` 与 `max-76-deck-two-lines` 使用精确长度且在现有估算规则下分别得到 4 行与 2 行，Compatibility 为 `compatible`。
- `over-60`、`deck-over-76` 分别以 61、77 字符触发 `note-too-long` 与 `authored-text-too-long`；另有字符数合法但超过行数的负向 fixture。
- 没有修改 Contract 算法、Slot/照片/文字几何、Typography Role、字号、行高、关系、Theme、Renderer 或 Render Plan；三项 Editorial Definition 继续为 `draft`。
- 本收口不代表 Editorial 已通过用户视觉 Gate；用户仍需检查 Preview Matrix 的合法最大、超字符和超行数场景。

## F3-B2.2 — Canvas-relative Typography & Line-fit Reality Closure

本阶段由用户真实移动端/Preview 检查发现的“估算 4 行而浏览器显示 6 行”和“deck 估算 2 行却进入照片区域”触发。修复集中在通用排版基础能力：文字字号改为相对于每个 Recipe canvas 的 `cqw`，每个 Canvas 声明自己的 query container，旧浏览器使用确定性的 normalized px fallback；Editor、Reader、Preview Matrix、双页和单页均消费同一套 Render Plan metrics。

- Contract 新增只读 `RecipeTypographyLayoutMetrics` / `RecipeTextLayout` 派生机制，统一表达 role、size、lineHeight、tracking、宽度系数、Slot normalized width、显式换行和 line box 高度。
- Compatibility 与 Renderer Plan 共用该 estimator；它按实际 role/token、ASCII 字母、数字、标点、空格、CJK/full-width 字符和 `overflow-wrap:anywhere` 的可拆分策略估算，而不是使用 viewport 或固定 `width × 72` 字符数。
- `.recipeStaticText` 与 Note 保持可见溢出策略，不使用截断、ellipsis、line-clamp、隐藏 overflow 或单条文字自动缩放；deck 仍位于其固定文字带，照片 rect 没有变化。
- Preview Matrix 增加正常 Latin、数字、CJK、不可拆分长词和跨页 CJK Note，并在 Canvas 外显示 `slotId`、role/token、estimated/max lines 与 normalized line box/Slot height。矩阵现为 66 场景组 / 132 cells。
- 四项容量在共享 estimator 下仍为：Evidence Note 60/4、Lead deck 76/2、Lead title 60/3、Across Note 120/4。换行符计入 `maxCharacters`；字符未超限仍可能因 line count 或 geometry fit 被明确拒绝。
- 自动化证明 Contract/Plan 的确定性 metrics、不同 role 容量差异、explicit newline、CJK/full-width、tracking、长词、Editor/Reader 一致性和 draft/menu 隔离；单元测试不能替代真实浏览器字体换行，因此本节不构成视觉批准。

本阶段停止在 **Phase F3-B2.2 / Editorial Typography Reality 用户视觉 Gate**，不进入 F3-B3；三个 Editorial Definition 继续为 `draft`，未启动服务器、浏览器或浏览器自动化。

## 8. 自动化结果

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过：56 test files / 287 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |
| `git diff --check` | 通过；仅有既有 LF/CRLF normalization warnings |

本批没有启动开发服务器、没有打开浏览器、没有运行浏览器自动化。当前停止在 Editorial 用户视觉 Gate。
