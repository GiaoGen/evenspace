# Phase F3-B5 — Chromatic Family Draft Implementation Record

> 实施日期：2026-08-21  
> 状态：Entry Field、Four Beat 与 Cross-field Note 的 formal draft Definition、Catalog、Registry 和独立 Preview Matrix 已实现；全部静态自动化 Gate 通过。首批 15 个 Anchor 的实现进度为 15/15。本批停止于 formal draft 实施完成点，不激活 Recipe，不进入 45 个扩展 Recipe。

## 1. 范围与工程边界

本批只实现：

1. `chromatic-entry-field-v1`
2. `chromatic-four-beat-v1`
3. `chromatic-cross-field-note-v1`

三项均为 `schemaVersion: 1`、`version: 1`、`familyId: "chromatic"`、`status: "draft"`、`allowsEmptyDraft: false`。它们共享获批 Chromatic Palette 与 P2 `photoessay-field` typography preset。

本批没有修改 Recipe Contract，没有新增 legacy 映射，没有激活 Recipe，没有增加 active/menu 数量，没有增加 Chromatic Recipe ID 或 Slot ID 专用 JSX/CSS/Renderer/Render Plan 分支，没有修改 StPageFlip、手势、单页镜头或 Reader 导航，也没有启动服务器、浏览器或浏览器自动化。locale、unsupported-glyph 与字体路由继续沿用 F3-T2；本记录不作字体审美裁决。

## 2. Formal Definitions

### 2.1 Entry Field

- `scope: page`，exact 1 Photo，Note mode `none`，无 static/authored text。
- safe area `{x:.05,y:.05,width:.90,height:.90}`。
- `entry-field`：`{x:.05,y:.06,width:.90,height:.18}`、accent-1、z 0；职责是观看入口和结构阈值，不是装饰页眉。
- `entry-photo`：`{x:.05,y:.30,width:.90,height:.62}`、required、z 10、cover、无 bleed/gutter crossing。
- field 与 Photo 之间固定保留 `.06` paper gap；Color-on/off 只改变受控 Token 值，不改变 topology、焦点、几何或阅读入口。
- 来源 Photo Note 保留为 hidden Note，不生成文字 Slot，不删除原数据。

### 2.2 Four Beat

- `scope: page`，exact 4 Photos，Note mode `none`；采用 F3-A5.1 最终方案 A。
- 四个 Photo Slot 的 x 为 `.05,.28,.51,.74`，统一 `{y:.22,width:.21,height:.28}`；单行 LTR，不形成 2×2 Grid。
- 物理 frame aspect 为 `(.21×3)/(.28×4)=.5625=9:16`。Catalog/Matrix 保持 `4:5` preferred、square acceptable、`3:2` landscape high-crop-risk；没有声明任意比例普遍适用。
- 四个 Color Field 同列、`{y:.56,width:.21,height:.16}`，固定为 A1→A2→A3→A1。
- 四个 literal index 固定为 01–04；01/04 为 inverse-ink/accent-1，02 为 inverse-ink/accent-2，03 为 ink/accent-3。
- Color-off 仍保留单行位置、01–04 和暗→中→亮→暗的第二线索；Editor/Reader 使用相同 assignment 顺序和独立 focus。

### 2.3 Cross-field Note

- 原子 `scope: spread`，exact 1 Photo，required Photo Note。
- safe area `{x:.05,y:.05,width:1.90,height:.90}`，gutter `.98..1.02`。
- 左页 `source-photo` 为 `{x:.06,y:.10,width:.82,height:.68}`；`source-field` 为 `{x:.06,y:.82,width:.82,height:.12}`；literal `IMAGE 01` 完整落在 accent-3 surface。
- 右页 `note-field` 为 `{x:1.08,y:.10,width:.84,height:.72}`；literal `FIELD NOTE` 与 `field-note` 分别使用固定 rect，完整落在 accent-1 surface。
- runtime 合法 Note 范围为 trim 后非空至 90 字符、最多 4 行。1–11 字、12 字与 90/4 均合法；12 字只是推荐写作目标。空 Note 为 `needs-content`，超过 90 字为 `note-too-long`，超过 4 行为 `note-too-many-lines`。
- Photo、Color Field、label 与 Note Slot 不因文字长度 reflow。第二张照片进入 `unplacedPhotoIds`，不建立新 Slot。
- 唯一 spread evidence 为 `{kind:"cross-page-pair",photoSlotId:"source-photo",noteSlotId:"field-note"}`。移除 relation 后，Color Fields 单独产生零 evidence，Definition 被 Validator 拒绝。
- 左计划只承担 source Photo/strip/label，右计划只承担 destination field/label/Note；两页共享同一 Application 与 Photo Note 数据绑定。

## 3. Palette、对比、Catalog、Registry 与 Renderer

- Palette：paper `#F4F0E8`、ink `#17191C`、muted-ink `#55585D`、photo-mat `#D7D3CA`、accent-1 `#164B8C`、accent-2 `#A83D2B`、accent-3 `#D49A18`、inverse-ink `#FFFFFF`。
- Color-off preview 仍使用相同语义 Token，accent-1/2/3 分别映射 `#505050/#666666/#A6A6A6`；没有 opacity、filter、gradient 或 blend mode。
- Definition Validator 与显式对比回归共同确认实际文字组合全部不低于 4.5:1。
- formal registry 由 12 增至 15，runtime registry 由 18 增至 21；旧 runtime Definitions 不变。
- Entry Catalog：single / vertical / top-down / single-accent。
- Four Catalog：band / horizontal / LTR / rhythmic；preferred portrait，risky landscape/ultra-wide。
- Cross-field Catalog：cross-page-pair / horizontal / LTR / zoned。
- 三项 Development resolver 与 Catalog Validator 均 valid；active resolver 均返回 `null`，active/menu 仍为 6。
- 通用 Renderer、Render Plan 与 CSS 中不存在 Chromatic recipeId 或 Slot ID 专用判断；Editor 与 Reader 均消费同一 Render Plan。

## 4. Chromatic Preview Matrix

`/zine/preview-matrix` 接入独立 **Chromatic Formal Draft Preview Matrix**。Matrix 的 color-off 由受控 Theme Token 的开发预览变体实现；Definition slot、Application、Render Plan 和 Renderer 路径不分叉。

| Recipe | 场景组 | Editor/Reader cells | 静态覆盖 |
| --- | ---: | ---: | --- |
| Entry Field | 12 | 24 | empty/exact/over、三类比例、focus、左右页、color-on/off、hidden Note |
| Four Beat | 14 | 28 | empty/fewer/exact/over、4:5/square/landscape/mixed、独立 focus、01–04、A1→A2→A3→A1、color-on/off、parity |
| Cross-field Note | 17 | 34 | missing Photo/Note、1/12/90/overflow、完整/左右 spread、unplaced、focus、color-on/off、evidence 正反例、parity |
| **总计** | **43** | **86** | 每个场景均有 Editor 与 Reader |

静态测试精确验证：

- Reader 不显示空 Photo placeholder 或编辑控件；Editor 可保留统一空 Slot 诊断。
- page Recipe 只生成当前页环境；Cross-field 使用同一个两页 Application。
- 四拍 assignment、literal、色序和独立 placement focus 稳定。
- Cross-field 1/12/90 字状态使用同一固定几何；Photo Note 继续通过 photoId/placement assignment 绑定。
- Color-on/off 的 Slot topology、reading order 和 relation 完全相同。

## 5. 自动化 Gate

| Gate | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过，64 test files / 349 tests |
| `npm run build` | 通过，Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |
| `git diff --check` | 通过（见本轮最终校验） |

## 6. 停止点

F3-B5 formal draft implementation 到此完成。首批 Anchor 实现进度更新为 **15/15**；三项仍为 `draft`，active/menu 数量不增加。未进入 Recipe 激活、正式菜单、字体审美裁决或 45 个扩展 Recipe 阶段。
