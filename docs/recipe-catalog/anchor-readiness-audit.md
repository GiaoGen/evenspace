# Phase F3-A6 — 15-Anchor Independent Difference & Implementation Readiness Audit

> 审计日期：2026-08-13
> 审计范围：F3-A 已获用户视觉批准的 15 个 Anchor；只判断独立差异、Contract/产品路径现实性与 F3-B draft Definition 实现准备度。
> 明确边界：本文件不是 Recipe Definition、CatalogEntry 或视觉自动批准；本阶段没有修改产品代码、没有运行项目代码测试、没有启动服务器或浏览器，也没有进入 F3-B。

## 1. Executive verdict

**结论：GO，可进入 F3-B。** 15 个 Anchor 均有可由现有 Recipe Contract 表达的 Slot、scope、evidence、内容数量、文字/Note、Color Field 与裁切行为；不存在要求专用 Renderer、任意 CSS、旋转、随机重叠或非法 spread evidence 的设计。15×15 独立矩阵包含全部 **105** 个唯一 Pair，最低 Pairwise Difference Score 为 **4**，全部达到计划书门槛，且每一对至少包含 scope、Slot topology、主图尺度、主轴/路径或 bleed/留白中的硬结构差异。

本次 GO 的精确定义是：允许从 **F3-B1 Quiet** 开始，把获批 Brief 转成 `draft` Recipe Definition、draft CatalogEntry 与 Preview Matrix 测试夹具。它不表示条目可以提前设为 `active`，也不表示正常 Editor/Reader 菜单已经能选择这些 Recipe。

实现准备度分布：

| 状态 | 数量 | Anchor |
| --- | ---: | --- |
| Ready | 5 | Held Field、Scale Echo、Twin Register、Cross Register、Entry Field |
| Ready with implementation/manual gate | 9 | Horizon Bridge、Evidence Aside、Across the Record、Twelve-up Ledger、Edge Thrust、Drop Sequence、Gutter Sweep、Four Beat、Cross-field Note |
| Contract-ready, visible authored-text UI pending | 1 | Lead Story |
| Blocked | **0** | 无 |

Chromatic 的用户裁决已纳入锁定输入：`chromatic-entry-field-v1`、修订后的 `chromatic-four-beat-v1`、`chromatic-cross-field-note-v1` 均获视觉批准；Four Beat 的照片尺寸与留白可接受；Cross-field Note 的短/长 Note 状态成立；Palette 保持不变。因此 F3-A 视觉批准进度为 **15/15**。

## 2. 审计依据与运行时事实

### 2.1 锁定设计依据

- [Phase F 总计划](../../phase-f-recipe-catalog-plan.md)
- [Recipe Design Playbook](./recipe-design-playbook.md)
- [Family Bibles](./family-bibles.md)
- [15 Anchor Brief](./anchor-recipe-briefs.md)
- [Recipe Review Log](./recipe-review-log.md)
- [Constraint Summary](./constraint-summary.md)
- [Research Dossier](./research-dossier.md)
- [Contract Gap Report](./contract-gap-report.md)
- [Contract v1.1 Implementation Record](./contract-v1.1-implementation-record.md)
- [Authored Static Text Gap Report](./authored-static-text-gap-report.md)
- [Authored Static Text Implementation Record](./authored-static-text-implementation-record.md)

本审计没有重新研究或改写审美来源；只把已批准设计与当前代码现实逐项对齐。

### 2.2 Apply → Draft → Renderer → Compatibility 事实

| 路径 | 已确认事实 | 对 F3-B 的含义 |
| --- | --- | --- |
| Contract | [`RecipeApplication`](../../features/zine/model/recipe-contract.ts) 持久化 photo assignments、未放置照片、隐藏 Note、authored text assignments 与未放置文字；[`RecipeContent`](../../features/zine/model/recipe-contract.ts) 承载照片、Photo Note、focus、authored text 与 owner。 | 15 项内容都能使用通用数据语义，不需要 Anchor 私有字段。 |
| Validator | page 不得跨 spread；spread 必须由真实 `cross-gutter-photo` 或 required Photo–Note `cross-page-pair` 成立；Photo/Color/Text z-index、Color Field 唯一承载面、文字不压图与 4.5:1 对比均被验证。 | 五个 spread 的 evidence 和 Chromatic 分层可由现有 validator 审计。 |
| Compatibility | [`evaluateRecipeCompatibility`](../../features/zine/model/recipe-contract.ts) 检查照片 min/max、required/non-empty Note、Note 字符/行数，以及 authored text required、`maxCharacters`、`maxLines`。Contract 没有 `minCharacters`。 | Lead Story 76/2 与 Cross-field Note 的非空至 90 字/4 行语义可执行；12 字只能是 authoring target。 |
| Apply/Draft | [`zine-draft.ts`](../../features/zine/model/zine-draft.ts)、[`zine-manual-layout.ts`](../../features/zine/model/zine-manual-layout.ts) 与 [`zine-pages.ts`](../../features/zine/model/zine-pages.ts) 都通过同一 application/refresh 路径保留、迁移或列出 unplaced photo/text。 | 更换 Recipe 不应静默删除用户照片、Note 或 authored text。 |
| Shared render plan | [`createRecipeRenderPlan`](../../features/zine/components/recipe-renderer-plan.ts) 从 assignment、focus、Photo Note、authored text、literal、全局 title 与 page number 生成 Slot；[`RecipeRenderer`](../../features/zine/components/recipe-renderer.tsx) 只消费该计划。 | Editor 与 Reader 不需要两套 Anchor 特例。 |
| Reader | [`zine-reader-page.tsx`](../../features/zine/components/reader/zine-reader-page.tsx) 把 page number、title、authored items 与同一 application 交给同一 Renderer。 | Reader/Editor 数据职责一致。 |
| Catalog status | [`getActiveRecipeDefinition`](../../features/zine/model/recipe-catalog.ts) 只解析精确匹配且有效的 `active` 条目；development resolver 可检查 draft/deprecated。 | F3-B draft 应先在开发 Reference/Preview Gate 验收；不得声称已经出现在正常产品菜单。 |
| Preview baseline | [`recipe-preview-matrix.ts`](../../features/zine/components/recipe-preview-matrix.ts) 已有 empty/min/max/over-capacity、常见比例、Note 与 page/spread 视角语义。 | F3-B 必须为 exact-2/3/4/12 等 Recipe 增加满足各自 min/max 的专用 fixture；不能直接复用只有一张照片的比例 fixture。 |

### 2.3 非阻断边界

1. Lead Story 的 authored title/deck 核心 Contract、Application、Compatibility 与 shared Renderer 链已经就绪；**可见 authored-text 编辑 UI 仍待实现**。因此它可实现为 draft Definition 和 Preview fixture，但不能被描述为手动 Editor 已完整可编辑。
2. draft CatalogEntry 不会被正常产品 resolver 应用。这是 F3-B 的阶段边界，不是 Contract gap；Preview/Development Gate 必须显式传入 draft Definition。
3. F3-B 仍需为每个 exact-count Recipe 建立真实数量的照片夹具，并对 spread 同时生成完整双页与左右单页视角。

## 3. 15-Anchor reality inventory

| # | Anchor / role | scope / evidence | Photo | 文字、Note、Color | 现实性判断 | 状态与保留 Gate |
| ---: | --- | --- | --- | --- | --- | --- |
| 1 | Held Field `quiet-held-field-v1` / Quiet 03 | page | exact-1 | none | 单框 Photo、cover、focus、无 bleed；直接可表达。 | Ready。 |
| 2 | Scale Echo `quiet-scale-echo-v1` / Quiet 09 | page | exact-2 | optional aligned Photo Note | 固定 Note 几何、缺失不 reflow；assignment 可绑定 echo photo。 | Ready。 |
| 3 | Horizon Bridge `quiet-horizon-bridge-v1` / Quiet 11 | spread / `cross-gutter-photo` | exact-1 | none | cross-spread Photo Slot 与 gutter permission 可表达。 | Warning：真实装订损失、主体避脊和左右 focus Gate。 |
| 4 | Lead Story `editorial-lead-story-v1` / Editorial 01 | page | exact-1 | required authored title；optional authored deck | `contentKey`、owner、assignment、60/3 与 76/2 Compatibility 均可表达。 | Contract-ready, UI pending：可做 draft/Preview，不得提前 active。 |
| 5 | Evidence Aside `editorial-evidence-aside-v1` / Editorial 03 | page | exact-2 | literal label；optional adjacent Photo Note | 主图/证据图主次、固定 Note lane 与 literal 可表达。 | Warning：8.14% 证据图真实 Reader 可辨认 Gate。 |
| 6 | Across the Record `editorial-across-the-record-v1` / Editorial 11 | spread / required `cross-page-pair` | exact-1 | literal label；required Note 120/4 | opposite-side relation、required Note 与 page focus 可表达。 | Warning：真实长文排版、右页职责与左右单页聚焦 Gate。 |
| 7 | Twin Register `grid-contact-twin-register-v1` / Grid 05 | page | exact-2 | literal A/B | 等权 slot、literal index、纵向路径都属通用能力。 | Ready。 |
| 8 | Twelve-up Ledger `grid-contact-twelve-up-ledger-v1` / Grid 02 | page | exact-12 | page-number folio | exact-12 与固定 3×4 Slot 可表达；顶部 folio 在 safe area。 | Warning：每格 4.59% 的真实 Reader 主体可辨认 Gate。 |
| 9 | Cross Register `grid-contact-cross-register-v1` / Grid 11 | spread / 4 required `cross-page-pair` | exact-4 | literal INDEX、folio；required repeatable Note | 一个 repeatable Note Slot、四个 assignments 与四条 relation 可由 Contract/Render Plan 表达。 | Ready；F3-B 需专用 multi-note fixture。 |
| 10 | Edge Thrust `dynamic-edge-thrust-v1` / Dynamic 01 | page | exact-1 | none | 单侧 allowed bleed、cover 与 focus 可表达。 | Warning：应用页侧必须让 x=0 是外裁切边；不允许运行时静默镜像。 |
| 11 | Drop Sequence `dynamic-drop-sequence-v1` / Dynamic 06 | page | exact-3 | none | 三个固定 Photo Slot、1:4.86 面积跳变与顺序可表达。 | Warning：两个 10% 切片的真实可辨性与动作序列 Gate。 |
| 12 | Gutter Sweep `dynamic-gutter-sweep-v1` / Dynamic 10 | spread / `cross-gutter-photo` | exact-1 | none | full-spread Photo、双外边 bleed 与 gutter crossing 可表达。 | Warning：gutter 裁切、主体/标牌避脊与单页 focus Gate。 |
| 13 | Entry Field `chromatic-entry-field-v1` / Chromatic 01 | page | exact-1 | one Color Field；no text | Color Field z0、Photo z10、不交叠；Palette 与 Color-off 已获批准。 | Ready。 |
| 14 | Four Beat `chromatic-four-beat-v1` / Chromatic 07 | page | exact-4 | four Color Fields；literal 01–04 | A1→A2→A3→A1、固定 field/photo/index 可表达；无 Note。 | Warning：5.88% 照片、xs index、9:16 cover 与 Color-off Gate。 |
| 15 | Cross-field Note `chromatic-cross-field-note-v1` / Chromatic 12 | spread / required `cross-page-pair` | exact-1 | two Color Fields；literal labels；required Note 90/4 | spread evidence 只来自 relation；Color Field 不自证 spread。runtime 为 trim 后非空至 90 字/4 行。 | Warning：1–11 与 90 字实际 Renderer、右页 destination 与左右 focus 回归 Gate。 |

**现实性总计：15 个可进入 Definition/Preview 实现，0 个 Contract blocker。** Warning 表示实现后必须保留的真实 Reader/装订/内容压力测试，不表示设计退回。

## 4. Geometry, physical frame aspect and cover audit

### 4.1 计算口径

所有 page 与 spread 的 Slot 都以“单页宽度”为 x 单位、页面高度为 y 单位；纸张物理比例为 3:4。因此照片框真实物理比例统一按：

`physicalAspect = slot.width × 3 / (slot.height × 4)`

不能用 normalized `width / height` 冒充物理比例。下表的 cover 损失使用居中基线：

`source-area loss = 1 - min(frameAspect / sourceAspect, sourceAspect / frameAspect)`

focus 可以移动裁切窗口，但不能恢复已经被 cover 丢弃的面积。损失表用于内容适配 Gate，不是自动判定美学质量。

### 4.2 全部 Photo Slot 物理比例与常见输入压力

| Anchor | Photo Slot | normalized w×h | physical aspect | square loss | 4:5 portrait loss | 3:2 landscape loss | 内容结论 |
| --- | --- | ---: | ---: | ---: | ---: | ---: | --- |
| Held Field | `photo-primary` | .72×.60 | .9000 | 10.00% | 11.11% | 40.00% | 方图/温和竖图稳；横图需主体居中。 |
| Scale Echo | `photo-scene` | .60×.40 | 1.1250 | 11.11% | 28.89% | 25.00% | 场景图对 square/landscape 稳。 |
| Scale Echo | `photo-echo` | .38×.32 | .8906 | 10.94% | 10.18% | 40.62% | detail 对 square/4:5 稳。 |
| Horizon Bridge | `photo-horizon` | 1.44×.66 | 1.6364 | 38.89% | 51.11% | 8.33% | 宽景专用；portrait 是高风险输入。 |
| Lead Story | `lead-photo` | .84×.58 | 1.0862 | 7.94% | 26.35% | 27.59% | square 最稳；常见横/竖图可用但需 focus。 |
| Evidence Aside | `main-photo` | .62×.63 | .7381 | 26.19% | 7.74% | 50.79% | 主图明显偏竖；landscape 风险。 |
| Evidence Aside | `evidence-photo` | .22×.37 | .4459 | 55.41% | 44.26% | 70.27% | 只适合窄幅细节/单主体，不承诺普通照片通用。 |
| Across the Record | `record-photo` | .84×.84 | .7500 | 25.00% | 6.25% | 50.00% | 4:5 最稳；横图需强裁切预算。 |
| Twin Register | `sample-a/b` | .86×.34 | 1.8971 | 47.29% | 57.83% | 20.93% | 明确偏好横向比较样本。 |
| Twelve-up Ledger | `photo-01..12` | .27×.17 | 1.1912 | 16.05% | 32.84% | 20.59% | square/landscape 较稳；portrait 需逐图 focus。 |
| Cross Register | `record-01..04` | .39×.32 | .9141 | 8.59% | 12.48% | 39.06% | square/4:5 稳；landscape 需主体集中。 |
| Edge Thrust | `thrust-photo` | .92×.86 | .8023 | 19.77% | .29% | 46.51% | 4:5 几乎原样；横向素材只适合有强侧向动作且可裁。 |
| Drop Sequence | `phase-01/02` | .40×.25 | 1.2000 | 16.67% | 33.33% | 20.00% | 切片偏横；需单一动作主体。 |
| Drop Sequence | `impact-photo` | .90×.54 | 1.2500 | 20.00% | 36.00% | 16.67% | 结果图偏横。 |
| Gutter Sweep | `sweep-photo` | 2×.84 | 1.7857 | 44.00% | 55.20% | 16.00% | 宽幅动作/环境专用；portrait 不适配。 |
| Entry Field | `entry-photo` | .90×.62 | 1.0887 | 8.15% | 26.52% | 27.42% | square/温和横图稳；4:5 可接受。 |
| Four Beat | `beat-photo-01..04` | .21×.28 | .5625 (9:16) | 43.75% | 29.69% | 62.50% | 4:5 单主体优先；square 可接受；3:2 是明确 risk。 |
| Cross-field Note | `source-photo` | .82×.68 | .9044 | 9.56% | 11.54% | 39.71% | square/4:5 稳；landscape 需约 40% 裁切预算。 |

### 4.3 面积与几何结论

| Anchor | photo coverage | Color Field coverage | paper / non-photo | 结论 |
| --- | ---: | ---: | ---: | --- |
| Held Field | 43.20% | 0 | 56.80% | Quiet 纸面连续。 |
| Scale Echo | 36.16% | 0 | 63.84% | Note 缺失不回收固定纸面。 |
| Horizon Bridge | 47.52% spread | 0 | 52.48% | 框内跨脊，不是 full bleed。 |
| Lead Story | 48.72% | 0 | 51.28% | title/deck 在纸面，不压图。 |
| Evidence Aside | 47.20% | 0 | 52.80% | 39.06% 主图 + 8.14% 证据图。 |
| Across the Record | 35.28% spread | 0 | 64.72% | 右页为 required Note 职责面。 |
| Twin Register | 58.48% | 0 | 41.52% | 两个 29.24% 等权模块。 |
| Twelve-up Ledger | 55.08% | 0 | 44.92% | 12×4.59%；3×4 不变。 |
| Cross Register | 24.96% spread | 0 | 75.04% | 左页 49.92%，右页为索引面。 |
| Edge Thrust | 79.12% | 0 | 20.88% | 单侧 bleed + 纸面终点。 |
| Drop Sequence | 68.60% | 0 | 31.40% | 10% + 10% + 48.60%。 |
| Gutter Sweep | 84.00% spread | 0 | 16.00% | 双外边 bleed、cross-gutter。 |
| Entry Field | 55.80% | 16.20% | 28.00% | Field 与 Photo 有 6% paper gap。 |
| Four Beat | 23.52% | 13.44% | 63.04% | 四拍单行；不是 2×2 Contact Grid。 |
| Cross-field Note | 27.88% spread | 35.16% spread | 36.96% | source/destination fields 均不压 Photo。 |

静态几何复核结果：所有 required/optional Slot 都在其 page 或 spread 画布内；只有已声明的 Edge Thrust、Gutter Sweep 外裁切边和两张 cross-gutter Photo 使用 bleed/gutter permission。所有文字 Slot 位于声明 safe area；Chromatic 文字完整落在唯一最高层 Color Field 内，Color Field 与 Photo 无交叠；普通文字实际组合最低对比仍为 6.24:1，高于 4.5:1。全部照片 Slot 都声明 `cover`，没有未填充留边路径。

## 5. Spread legality audit

首批 15 个 Anchor 中恰有 **5** 个 spread；其余 10 个均为 page。Color Field、左右平衡、双图对话、标题或共享轴线均未被用作 spread evidence。

| Spread Anchor | 唯一合法 evidence | Contract reality | 单页聚焦 Gate |
| --- | --- | --- | --- |
| Horizon Bridge | `cross-gutter-photo`：一张真实 Photo Slot 跨 x=1 | valid | 左右都需保留可理解的景观片段；主体避脊。 |
| Across the Record | required Photo–Note `cross-page-pair` | valid | 左页是证据照片，右页是实录文字；两侧职责不可互换。 |
| Cross Register | 四条 required Photo–Note `cross-page-pair` | valid | 左页样本、右页索引均需独立可理解。 |
| Gutter Sweep | `cross-gutter-photo`：一张 full-spread Photo | valid | 左右 focus 需保留动作延续；关键人物/标牌避脊。 |
| Cross-field Note | required Photo–Note `cross-page-pair` | valid；Color Field 不计 evidence | 左页 source、右页 destination；短/长 Note 都保持固定几何。 |

## 6. Independent 15×15 Pairwise Difference Matrix

### 6.1 评分口径

严格使用总计划的八项规则：Scope 2、照片数量 1、Slot topology 2、主图尺度 1、主轴/阅读路径 1、bleed/留白结构 1、Note 能力/关系 1、色彩/字体角色 1，总分 10。只在职责发生实质变化时计分；镜像、微调边距、名称或单纯换色不计 topology。

缩写：HF Held Field；SE Scale Echo；HB Horizon Bridge；LS Lead Story；EA Evidence Aside；AR Across the Record；TR Twin Register；TL Twelve-up Ledger；CR Cross Register；ET Edge Thrust；DS Drop Sequence；GS Gutter Sweep；CE Entry Field；FB Four Beat；CF Cross-field Note。

矩阵为对称矩阵；对角线不计。上三角恰有 `15×14÷2 = 105` 个唯一 Pair。

| |HF|SE|HB|LS|EA|AR|TR|TL|CR|ET|DS|GS|CE|FB|CF|
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
|HF|—|8|6|5|7|9|7|7|10|5|6|7|5|7|9|
|SE|8|—|10|8|7|10|6|8|9|8|8|10|8|8|10|
|HB|6|10|—|7|9|6|9|9|8|7|8|4|7|8|6|
|LS|5|8|7|—|7|9|6|7|10|6|7|8|4|7|9|
|EA|7|7|9|7|—|9|7|8|9|8|8|10|7|8|10|
|AR|9|10|6|9|9|—|10|10|8|9|10|6|9|9|4|
|TR|7|6|9|6|7|10|—|7|9|7|7|9|6|7|10|
|TL|7|8|9|7|8|10|7|—|10|7|7|9|7|6|10|
|CR|10|9|8|10|9|8|9|10|—|10|10|8|10|9|8|
|ET|5|8|7|6|8|9|7|7|10|—|5|7|6|7|9|
|DS|6|8|8|7|8|10|7|7|10|5|—|8|7|7|10|
|GS|7|10|4|8|10|6|9|9|8|7|8|—|8|8|6|
|CE|5|8|7|4|7|9|6|7|10|6|7|8|—|7|9|
|FB|7|8|8|7|8|9|7|6|9|7|7|8|7|—|9|
|CF|9|10|6|9|10|4|10|10|8|9|10|6|9|9|—|

### 6.2 全部 4/5 分 Pair 的硬差异说明

| Pair | 分数 | 计分硬差异 | 为何不是近重复 |
| --- | ---: | --- | --- |
| HF ↔ LS | 5 | topology 2、主轴 1、留白职责 1、字体角色 1 | HF 是无文字居中凝视；LS 是 title/deck 上层入口与下部报道图。 |
| HF ↔ ET | 5 | topology 2、主图尺度 1、主轴/路径 1、bleed/留白 1 | HF 四边框内 43.2% 停顿；ET 79.12% 单外边 bleed 并向纸面终点推进。 |
| HF ↔ CE | 5 | topology 2、主轴/路径 1、留白职责 1、Color role 1 | CE 有独立 16.2% 入口阈值与 top-down 顺序；Color-off 后 field/photo/gap topology 仍存在。 |
| HB ↔ GS | **4** | topology 2、主图尺度 1、bleed/留白 1 | 两者虽同为单图 cross-gutter/horizontal，但 HB 是 47.52% 框内 Quiet 停顿，GS 是 84% 双外边 bleed 动作横扫。 |
| LS ↔ CE | **4** | topology 2、留白职责 1、Color/typography role 1 | 两者同为 page、单图、纵向、中尺度；LS 的首入口是 authored title/deck 与报道职责，CE 是无文字 Color Field 阈值，缺色时仍由固定 field band 拓扑区分。 |
| AR ↔ CF | **4** | topology 2、留白/承载面职责 1、Color/typography role 1 | 两者同为 exact-1 required cross-page Note；AR 是 paper 上的照片—实录，CF 额外拥有 source strip 与整块 destination surface，字段不自证 spread 但改变固定 Slot topology。 |
| ET ↔ DS | 5 | 照片数量 1、topology 2、主轴/路径 1、bleed/留白 1 | ET 单图横向 edge thrust；DS 三图以两个阶段横移后向下坠入结果图，无 bleed。 |

除上述 7 对外，其余 98 对均为 6–10 分。最低分 **4**，低于 4 的 Pair 为 **0**。三个同族矩阵原结论也被独立复核，没有因跨家族比较而失效。

## 7. Cross-family collision findings

1. **Quiet ↔ Editorial：** Scale Echo 与 Evidence Aside 共享“两图 + optional Note”输入，但前者 1.97:1 对角回声、36.16% 覆盖；后者 4.8:1 主/证据职责、固定侧栏、47.2% 覆盖。Lead Story 也不会退化为 Held Field，因为 title/deck 是第一编辑入口。
2. **Quiet ↔ Dynamic：** Horizon Bridge 与 Gutter Sweep 是最接近的合法 spread Pair，但框内 47.52% 停顿和 84% 双 bleed 横扫在尺度、留白和装订风险上相反。
3. **Editorial ↔ Grid/Contact：** Evidence Aside 有英雄图和证据图主次；Twin/Twelve/Cross Register 由等模、扫描与逐照片索引成立。Cross Register 的 repeatable Notes 不是一段报道侧栏。
4. **Editorial ↔ Chromatic：** Lead Story 与 Entry Field、Across the Record 与 Cross-field Note 都达到门槛下限，必须作为 F3-B 重点回归 Pair；差异分别来自 authored hierarchy vs no-text threshold，以及 paper record vs zoned source/destination topology。
5. **Grid/Contact ↔ Dynamic/Chromatic：** Four Beat 虽有四个等权照片，但 A1→A2→A3→A1 的 field rhythm、单行 LTR 和 63.04% paper 不等于 2×2/3×4 扫描；Drop Sequence 的 1:4.86 尺度坠落故意破坏 Grid 等权。

## 8. Known implementation and manual gates

以下 Gate 不阻断 F3-B draft Definition 开工，但不得在实现时删除、弱化或用预览假数据绕过：

1. **Lead Story visible authored-text UI：** Contract/Application/Compatibility/Renderer ready；正常手动 Editor 仍缺可见 title/deck 编辑入口。F3-B Preview 必须用真正 `AuthoredTextItem`，不能用全局 Zine title 或临时 override 冒充。
2. **Evidence Aside：** 8.14% 证据图以真实照片检查主体可辨；不通过时应退回设计 Gate，不能只加边框/index 掩盖。
3. **Across the Record：** 真实 required Note 的短/长状态、右页职责和左右 page focus 必须同时成立。
4. **Twelve-up：** 12 个 4.59% module 在 Reader 真实尺寸仍需辨认主体；exact-12、坐标和 3×4 topology 不得因测试困难静默改变。
5. **Edge Thrust：** 只在 x=0 对应外裁切边的页面侧使用；当前 Contract 不承诺按左右页自动镜像内容路径。
6. **Drop Sequence：** 两个 10% 阶段切片必须可辨，且三张照片具有真实动作/时间关系；不能被主图吞并成 Editorial。
7. **Horizon Bridge / Gutter Sweep：** cross-gutter 装订损失、主体/面部/标牌避脊与左右 focus 均需真实输出检查。
8. **Four Beat：** 5.88% 照片、xs index、9:16 frame、Color-on/Color-off 和高彩摄影同时检查；3:2 landscape 的 62.5% cover loss 是已知适配风险。
9. **Cross-field Note：** runtime 合法范围为 trim 后非空至 90 字、最多 4 行；12–90 字仅是 authoring target。1–11 与 90 字都要由实际 Renderer 验证 fixed geometry 和 destination 身份。

## 9. F3-B recommended batch order

保持总计划既定 family 顺序，不并行修改五家族，也不提前 active：

| Batch | Definition 顺序 | 先验证的风险 |
| --- | --- | --- |
| F3-B1 Quiet | Held Field → Scale Echo → Horizon Bridge | 单页基础、optional Note fixed geometry、首个 cross-gutter spread。 |
| F3-B2 Editorial | Evidence Aside → Across the Record → Lead Story | optional/required Note、cross-page focus、authored title/deck fixture 与 UI-pending 标记。 |
| F3-B3 Grid/Contact | Twin Register → Twelve-up → Cross Register | exact-2/12/4 fixtures、4.59% Reader、repeatable Notes 与四关系。 |
| F3-B4 Dynamic | Edge Thrust → Drop Sequence → Gutter Sweep | page-side bleed、exact-3 顺序、full-spread gutter/outer bleed。 |
| F3-B5 Chromatic | Entry Field → Four Beat → Cross-field Note | Color Field 分层/对比、exact-4 rhythm、required Note field 与 Color-off。 |

每一批应新增 Definition、draft Catalog metadata、按 Recipe 数量定制的 Preview fixture、validator/compatibility/application/render-plan 测试与用户手动视觉 Gate；不得为某个 Anchor增加专用 JSX/CSS 分支。先完成当前 family 的静态与手动验收，再进入下一 family。

## 10. F3-B implementation acceptance checklist

- 15 个 ID、version、family、role、scope、照片 min/max 与 Brief 完全一致。
- 所有 Photo Slot 均为 `cover`；focus 来自 placement；超量内容进入 unplaced，不静默丢失。
- 五个 spread 只有本报告第 5 节的 evidence；page 不产生 cross-page relation。
- Optional Note 缺失不 reflow；required Note 空值为 `needs-content`。
- Lead Story 使用 authored items + contentKey/owner，不使用全局 Zine title 冒充 page title。
- Cross-field Note 不实现虚构 `minCharacters=12`。
- draft CatalogEntry 只在 development/preview Gate 可见；用户批准前不设 `active`。
- Preview 覆盖 empty、min、max、over-capacity、square、4:5、3:2、无/短/长 Note、authored short/max/over、完整 spread 与左右 focus。
- 15×15 collision 回归重点保留三对 4 分 Pair 与四对 5 分 Pair。
- 自动化测试属于 F3-B；F3-A6 本身只运行文档/SVG/几何静态检查。

## 11. Static audit results

| 检查 | 结果 |
| --- | --- |
| 必读文档与 Apply/Draft/Editor/Reader/Compatibility/Catalog/Preview 路径 | 通过；逐文件完整读取并核对。 |
| 10 张 concept/anchor SVG XML | 通过；均可解析，根元素 `viewBox` 存在。 |
| Slot、safe area、z-index、Color/Photo overlap | 通过；已声明 bleed/gutter 例外与 Brief 一致。 |
| physical frame aspect | 通过；18 组唯一 Photo 几何全部按 3:4 物理页面公式重算。 |
| spread scope/evidence | 通过；5 spread、10 page；evidence 数量和类型正确。 |
| 15×15 / 105 Pair | 通过；15 个标签、105 个唯一 Pair、最低 4、无低于门槛。 |
| Markdown 结构与相对链接 | 通过。 |
| `git diff --check` | 通过。 |
| 项目代码测试 | **未运行**；本阶段是独立文档/规格审计，任务明确禁止运行项目代码测试。 |

## F3-B2.2 follow-up

Editorial implementation reached a second, separate user visual gate after mobile/Preview evidence showed viewport-dependent wrapping. The shared typography metrics now derive from the 3:4 Recipe canvas, while all three Editorial Definitions remain draft and their approved geometry is unchanged. This audit remains a readiness reference; it is not a visual approval and does not authorize F3-B3.

## 12. Decision and stop point

**F3-A6 audit decision：GO。** 推荐用户批准决策 **`F3-A6-D01`：接受 15-Anchor 独立差异与实现准备度审计，授权开始 F3-B1 Quiet draft Definition 实现；继续锁定 15 个视觉方向、所有已知 Gate、draft-only 状态与 shared Renderer 边界。**

本文件完成后停止在 **F3-A6 / F3-B Readiness Gate**。F3-B 尚未开始；没有创建 Definition/CatalogEntry，没有修改 TypeScript/TSX/CSS/Renderer/Reducer/测试，也没有启动服务器或浏览器。
