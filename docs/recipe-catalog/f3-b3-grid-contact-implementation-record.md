# Phase F3-B3 — Grid/Contact Family Draft Implementation Record

> 实施日期：2026-08-14  
> 状态：三个 Grid/Contact Anchor 的 formal draft Definition、Catalog Entry、Registry 与独立 Preview Matrix 已实现；自动化 Gate 全部通过。所有条目继续为 `draft`，当前停止在 Grid/Contact 用户视觉 Gate，未进入 F3-B4。

## 1. 范围、决策与边界

本批严格按获批顺序实现：

1. `grid-contact-twin-register-v1`
2. `grid-contact-twelve-up-ledger-v1`
3. `grid-contact-cross-register-v1`

协调 Gate 决策 `F3-B3-D01` 为 Cross Register 的 `folio-left` 与 `folio-right` 补齐了已批准 Brief 中缺失的精确坐标。这是规格补全，不是重新设计：Cross Register 的 Photo、Note、label、safe area、gutter、阅读路径、spread evidence 与所有既有坐标均未改变。

本批没有修改 Recipe Contract，没有激活任何 Recipe，没有新增 legacy 映射，没有创建 Recipe 专用 Renderer 分支，没有启动服务器、浏览器或浏览器自动化，也没有进入 F3-B4 Dynamic。

三个 Definition 均为 `schemaVersion: 1`、`version: 1`、`familyId: "grid-contact"`、`status: "draft"`、`pageRatio: "3:4"`、`allowsEmptyDraft: false`。它们共享 neutral Theme：paper `#F4F0E8`、ink `#17191C`、muted ink `#55585D`、photo mat `#D7D3CA` 与现有 `DEFAULT_RECIPE_TYPOGRAPHY`。

## 2. Formal Definition

所有 Photo Slot 都使用 `fit: "cover"`、`allowBleed: false`、`allowGutterCrossing: false`、Photo z-band 10；文字使用既有语义 role/token 与 Text z-band 20，没有 Grid 专用字体或 viewport 字号。

### 2.1 Twin Register

- `scope: page`，exact 2 photos，Note mode `none`。
- `sample-a`：`{x:.07,y:.10,width:.86,height:.34}`。
- `sample-b`：`{x:.07,y:.56,width:.86,height:.34}`。
- 两图面积完全相同；固定路径为 A → B，没有 title 或 Note。
- `index-a` / `index-b` 分别读取 literal `A` / `B`，使用 `index` role、`muted-ink`、paper、start alignment。

### 2.2 Twelve-up Ledger

- `scope: page`，exact 12 photos，Note mode `none`。
- `frame-01` 至 `frame-12` 按 row-major 形成固定 3×4：x 为 `.055/.365/.675`，y 为 `.10/.305/.555/.76`，每格 `.27×.17`。
- 第 2 行底边 `.475` 至第 3 行顶边 `.555` 保留 `.08` 的六加六分组间距；没有第 5 行或视觉 01–12 标签。
- `folio` 为 `{x:.82,y:.065,width:.125,height:.02}`，读取当前 Render Plan 页码、end alignment。
- 单格只占 page 的 4.59%，square/landscape 最稳；portrait、ultra-wide 与贴边主体继续作为人工 Reader Gate 风险。

### 2.3 Cross Register

- `scope: spread`，exact 4 photos，required Photo Note，`18 characters / 1 line`。
- safe area `{x:.06,y:.07,width:1.88,height:.86}`，gutter `.98..1.02`。
- 左页 `record-01..04` 固定为 `.39×.32` 的 2×2 记录矩阵；右页只有 literal `INDEX`、repeatable `index-notes` 与右 folio。
- 四条 required `cross-page-pair` relation 都从自己的 `record-0N` 指向同一个 `index-notes`，这是唯一 spread evidence；没有 binding line、Color Field 或跨 gutter Slot。
- `folio-left`：`{x:.06,y:.905,width:.125,height:.02}`、left/start。
- `folio-right`：`{x:1.815,y:.905,width:.125,height:.02}`、right/end。
- 两个 folio 均为 optional `static-text`、`page-number`、role `folio`、`muted-ink` on paper、z 20；测试精确断言坐标、pageSide、alignment、safe-area 包含和 gutter 排除。左/右 Render Plan 分别读取自己的页码，本矩阵固定验证为 `24` / `25`。

## 3. Application、Render Plan 与四项索引绑定

Cross Register 沿用现有通用数据链，没有 Contract 扩展：

`content.photoIds` → `record-01..04` assignments → 每项自己的 `photoId` / `placementId` / `noteOfPhotoId` → 共享 `index-notes` → 右页 Render Plan 的四个有序 Note item → 四项 `cross-page-pair` evidence。

每个 assignment 的 `noteOfPhotoId` 等于该记录自己的 `photoId`；四项不会因为共用一个 repeatable Note Slot 而丢失身份或顺序。Render Plan 为每个 Note item 派生同一套通用 typography layout diagnostics。Renderer 只根据 `role=index` 与 `relation=cross-page-pair` 的通用语义输出一列有序索引，不检查 recipeId 或 slotId。

## 4. Registry、Catalog 与生产隔离

- `grid-contact-recipe-definitions.ts` 是三个 Definition 的唯一数据源，并提供稳定 ID 与 exact `recipeId + version` resolver。
- formal registry 当前为 Quiet 3 + Editorial 3 + Grid/Contact 3；旧 runtime Definitions 继续保留。
- 三个 Catalog Entry 全部为 `draft`，并记录 ratio、topology、axis、reading direction、pace、subject-edge risk 与 gutter risk。
- Development resolver 可精确取得三项 Definition 且 Catalog Validator 为 valid；active resolver 对三项全部返回 `null`。
- active/menu 数量仍为 6；没有把 Grid/Contact 接入正式菜单或 legacy registry。

## 5. 独立 Preview Matrix

`/zine/preview-matrix` 新增独立标题 **Grid/Contact Formal Draft Preview Matrix**，不替换 Quiet、Editorial 或 Reference 区域。每个 cell 在 Canvas 外显示 recipeId、fixtureId、mode、Catalog status、Validator、Compatibility、slot IDs、assignment、photoId、placementId、Note binding、unplaced IDs、页码以及 typography role/token/line/line-box diagnostics。

| Recipe | 场景组 | Editor/Reader cells | 核心覆盖 |
| --- | ---: | ---: | --- |
| Twin Register | 14 | 28 | 0/1/2/3 photos、ratio、左右页、独立 focus、隐藏 Note、literal A/B |
| Twelve-up Ledger | 16 | 32 | 0/1/11/12/13 photos、3×4 顺序、六加六间距、ratio/edge risk、12 项 focus、folio |
| Cross Register | 24 | 48 | 0..5 photos、required Notes、四项 binding/evidence/order、18/1 typography、左右 plan、focus、folio |
| **总计** | **54** | **108** | 每个场景均有 Editor 与 Reader |

Cross Register 的真实文字 fixture 包含普通 Latin、numeric、18 个 CJK/full-width 字符与 18 字符不可拆长词；四类在共享 estimator 中均为 1 行且 compatible。19 字符与显式两行分别得到 `note-too-long` 与 `note-too-many-lines`。自动化证明确定性数据、容量和 Render Plan 一致性，不替代真实字体、缩放与 Reader 主体辨认的用户视觉检查。

## 6. 自动化结果

| Gate | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过，58 test files / 307 tests |
| `npm run build` | 通过，Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |
| `git diff --check` | 通过（见本轮最终校验） |

## 7. 用户视觉 Gate

本批完成后只进入 **Phase F3-B3 Grid/Contact 用户视觉 Gate**。人工检查重点：

1. Twin 的 A/B 等权、真实比例裁切和上下阅读顺序。
2. Twelve-up 的 4.59% 小图主体可辨认性、3×4 扫描顺序、`.08` 分组停顿、folio 与边缘主体风险。
3. Cross 的左四图 → 右四 Note 阅读路径、01–04 可辨序、短/18 字 Note、四项稳定 binding、左右单页职责与 `24/25` folio。
4. Editor/Reader 内容几何一致；Reader 不出现空照片 placeholder、编辑控件或诊断层。

视觉 Gate 通过也不等于激活。未取得下一阶段明确授权前，不进入 F3-B4，不改变三项 `draft` 状态。
