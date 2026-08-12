# Phase F0.5：Recipe Contract Gap Report

状态：待用户架构批准；F2、F3 与 Contract v1.1 实现保持关闭。
日期：2026-08-12
范围：只裁决 Contract Gap；不设计 Recipe、Anchor 或目录项，不修改代码。

## 0. 结论摘要

| Gap | 分类 | 推荐裁决 | 阻断范围 |
| --- | --- | --- | --- |
| GAP-F0-01 `3:2` spread | `derived semantics` | 保留唯一的 `pageRatio: "3:4"`；由 page ratio、双页数量与标准化坐标推导 `3:2`，不存 `spreadRatio` | 不阻断 F2/F3；形成 Validator 断言后才实现 |
| GAP-F0-02 spread 不可拆分证据 | `core contract` + `authoring rule` | Validator 只从真实跨书脊照片或合法 `cross-page-pair` 关系推导证据；`color-field` 跨线不构成证据，也不增加可随意填写的布尔值 | 阻断 F2/F3 |
| GAP-F0-03 Catalog/Authoring Metadata | `catalog metadata` | 建立独立、版本化的 `RecipeCatalogEntry`；Catalog 是 family/status/发现元数据的唯一权威，几何事实从 Definition 生成只读视图 | 阻断 F2/F3 的正式规格化与后续实现 |
| GAP-F0-04 `legacyStyleId` | `compatibility` | 新 Definition 使用可选的 `legacy?: { styleId }`；保留适配器与旧查询入口，分阶段迁移 | 不阻断 F2；阻断正式 Definition 实现 |
| GAP-F0-05 功能性多色彩 | `core contract` | 新增有限 `color-field` Slot、语义颜色 token 与受控前景引用；禁止 CSS/class/component 注入 | 阻断 Chromatic 的 F2/F3 |
| GAP-F0-06 Typography Role | `core contract` + `authoring rule` | 文字 Slot 声明有限 role；Theme 为 role 提供受限 token，Renderer 统一解释 | 阻断 Editorial、Grid/Contact、Chromatic 的 F3 |

裁决原则：只把运行时必须验证和渲染的事实放入 `RecipeDefinition`；发现、筛选、Fingerprint 与 AI 选择信息放入 `RecipeCatalogEntry`；旧 Style 只存在于兼容层。`RecipeDefinition` 不携带任意 CSS、className、组件名、字体 URL 或 Renderer 分支名。

## 1. 已复核材料与共同证据

本报告完整复核了计划书、F0/F1、两份引擎文档、readiness 文档、Contract、共享 Renderer/plan、Reference Definitions、两套 Preview Matrix、Reference Gate 组件及相关测试。以下证据是六项裁决的共同基线：

- `features/zine/model/recipe-contract.ts`：`RecipeDefinition` 当前同时存 `familyId`、`status`、必填 `legacyStyleId`；`canvas.pageRatio` 只能是 `"3:4"`；Slot 只有 `photo | note | static-text`；`RecipeTheme` 只有四个页面级颜色；文字没有 role。
- 同文件的 `validateRecipeDefinition`：已拒绝 page Recipe 的 `cross-spread` Slot，也校验 `cross-page-pair` 必须位于 spread 且跨左右两侧；但没有反向要求每个 spread 必须存在不可拆分事实。
- `features/zine/components/recipe-renderer-plan.ts`：按 `scope`、`pageSide` 和 `x=0..2` 把跨页 Slot 裁到左右页，并按 `zIndex` 排序；计划层只认识三种 Slot。
- `features/zine/components/recipe-renderer.tsx` 与 `.module.css`：Editor/Reader 共用渲染入口；Theme 被映射为四个 CSS 变量；所有 Note 共用一套排版，所有 static text 共用一套大写窄行样式；Renderer 没有色域或 typography role 分派。
- `features/zine/model/reference-recipe-definitions.ts`：六个 Reference fixture 均为 `draft`，却必须伪填 `legacyStyleId: "editorial"`；spread 仍写 `pageRatio: "3:4"`；所谓 color system 只使用一个页面背景及前景/占位色。
- `features/zine/model/reference-recipe-matrix.ts` 与测试：每个 Reference Recipe 覆盖 12 个场景和 Editor/Reader；跨书脊测试确认同一 placement 被左右计划共享；长 Note、超容量和隐藏 Note 有静态证据。
- `docs/recipe-catalog/constraint-summary.md`：锁定单页 `3:4`、物理 spread `3:2`、page 隔离、spread 不可拆分、Photo Note 绑定、cover、Placement、unplaced 与共享 Renderer。
- `docs/recipe-catalog/research-dossier.md` 的 R-02、R-08、R-09、R-10：分别要求图像网格与文字基线分层、文字职责分层、色彩参与信息组织、书脊作为结构边界；A03/A05/A07/G01 支持 typography 层级，A08/P06/M03/G03 支持受控功能性色彩，P01/P04/E04 支持跨页关系不能依赖视觉邻近。
- `features/zine/model/reference-recipe-matrix.test.ts` 和 `features/zine/components/recipe-preview-matrix.test.ts` 证明当前 Gate 是数据驱动的静态基线；人工视觉 Gate 尚不能被自动测试替代。

---

## GAP-F0-01：`3:2` spread 的数据语义

### 1. 当前代码/文档证据

- `zine-engine.md` 第 2.1 节和 F0 的 C-01 明确：单页为 `3:4`，两张等宽单页组成标准 `3:2` 物理 spread。
- `RecipeDefinition.canvas.pageRatio` 只有字面量 `"3:4"`；`isRectInsideCanvas` 根据 `scope` 把横向上限设为 page 的 `1` 或 spread 的 `2`。
- `recipe-renderer-plan.ts#getLocalSlotRect` 以左页 offset `0`、右页 offset `1` 解释统一坐标，说明 `x=0..2, y=0..1` 是坐标约定，不是第二份宽高比数据。
- Reference 与运行时 spread Definition 均保留 `pageRatio: "3:4"`，当前 Renderer 没有读取 `spreadRatio` 的用例。

因此要区分三个概念：单页固有比例是持久事实 `3:4`；标准双页的物理比例是 `(2 × 3):4 = 3:2` 的派生事实；`x=0..2/y=0..1` 是与像素比例无关的标准化坐标域。

### 2. 对 F2、F3 与 AI 管道的影响

F2 可用“标准双页由两张等宽页面组成”作为作者规范；F3 仍按统一坐标声明 Slot。AI 只需选择 `recipeId + recipeVersion`，不需要输出比例。重复存储比例会给 Catalog 筛选和导出造成两个真相源。

### 3. 分类

`derived semantics`。标准正文只支持等宽双页，当前不存在可变页宽、折页或三联页运行时用例。

### 4. 候选方案及取舍

1. **派生且不存储。** 由 `pageRatio + scope + pageCount=2` 计算。优点是无不一致状态、零迁移；缺点是调用者需要公共 helper。
2. **新增必填 `spreadRatio: "3:2"`。** 文档更显式，但与 `pageRatio/scope` 完全冗余，可能出现 `3:4 + spread + 4:3` 等矛盾。
3. **引入通用 canvas surfaces/ratio。** 能支持折页和不等宽页面，但当前无产品用例，超出 F0.5 最小范围。

### 5. 推荐与明确不采用

采用方案 1：保留 `pageRatio` 为唯一持久比例；提供派生 helper/常量和 Validator 断言。明确不采用必填或可选 `spreadRatio`，也不为未来假设引入通用画布语言。若后续 Cover/Spine 出现不等宽 surface，应在独立 Contract 中另行建模。

### 6. 最小类型/schema 草案

```ts
type RecipeCanvas = {
  pageRatio: "3:4";
  safeArea: RecipeRect;
  gutter?: { start: number; end: number };
};

type DerivedCanvasMetrics = {
  pageRatio: { width: 3; height: 4 };
  spreadRatio: { width: 3; height: 2 }; // 计算值，不序列化
  coordinateWidth: 1 | 2;              // 由 scope 推导
};
```

### 7. Validator 与 Compatibility 影响

Validator 保持 `pageRatio === "3:4"`；page 的 rect 横界为 `1`，spread 为 `2`；spread 还必须满足 GAP-F0-02。Compatibility 无新字段、无行为变化。

### 8. Renderer 与 Editor/Reader 影响

Renderer 无视觉变化；继续把每个页面渲染为 `3:4`，在 spread 中裁分 `x=0..2`。Editor/Reader 继续共享同一 plan。

### 9. 向后兼容和迁移策略

不迁移数据。现有 Definition、草稿和 Reference fixtures 原样可读。公共 helper 只替代调用者私自计算比例的代码，不改变序列化形状。

### 10. 自动化测试清单

- `pageRatio=3:4 + scope=page` 推导 `coordinateWidth=1`。
- `pageRatio=3:4 + scope=spread` 推导物理 `3:2` 与 `coordinateWidth=2`。
- page rect 越过 `x=1` 拒绝；spread rect 可到 `x=2`。
- schema 不接受额外 `spreadRatio` 作为运行时真相源。
- 现有 Reference spread 左右裁分结果不回归。

### 11. 用户手动视觉验证清单

- 在 Reference Gate 中确认左右页各自保持 `3:4`，并列为 `3:2`。
- 单页聚焦时不因 spread 派生比例产生拉伸。
- 跨书脊照片左右接缝连续、焦点与 cover 不回归。

### 12. 阻断判断

不阻断 F2/F3 的文档工作；派生 helper 与断言属于 F0.6 实现项。若未来正文允许不等宽/多联页，则重新开 Gap，不能复用本裁决硬套。

### 13. 待用户明确批准

批准“`3:2` 只作为派生语义，不向 Definition 增加 `spreadRatio`”。

---

## GAP-F0-02：spread 的不可拆分结构证据

### 1. 当前代码/文档证据

- `RecipeDefinition.scope` 允许任意 Definition 写 `"spread"`。
- 当前 Validator 只做单向限制：page 不得含 `cross-spread`；`cross-page-pair` 必须是 spread 且两 Slot 分处左右页。
- 它没有拒绝“全部 Slot 在左页”的 spread，也没有拒绝“左右各自独立、无关系”的 spread。
- `reference-cross-gutter-v1` 提供一个有效事实：`pageSide: "cross-spread"` 的照片 rect 从 `x=.68` 到 `1.32`，并声明 `allowGutterCrossing: true`；Renderer 将同一 assignment 裁成左右两半。
- F1 R-10 与 P01/P04 指出：浏览上的双页邻接不等于不可拆分的内容关系。

### 2. 对 F2、F3 与 AI 管道的影响

没有客观证据规则，F2 会把“共享 Theme/平衡”误写成 spread 家族语法，F3 也无法审查 scope。AI 选择错误的 spread 会扩大目标页范围并影响原子撤销。因此此项必须先于任何 spread Anchor。

### 3. 分类

`core contract`（结构可验证性）与 `authoring rule`（默认 page、共享风格不够）。

### 4. 候选方案及取舍

1. **作者布尔值 `inseparable: true`。** 简单，但不能证明任何结构事实，可被滥用。
2. **完全从现有内容结构推导。** 只接受真实跨书脊照片，或合法的 `cross-page-pair`；拒绝其余。客观、最小，覆盖当前真实用例。
3. **新增自由文本/枚举理由。** 可描述更多意图，但如果不和 Slot/Relation 校验，仍只是声明。
4. **新增受控 composition group。** 可表达未来左右多 Slot 的原子组合，但当前没有已批准运行时语义；提前加入会扩大 Contract。

### 5. 推荐与明确不采用

采用方案 2。有效 spread evidence 必须满足以下至少一项：

- **Cross-gutter photo：** Slot 必须是 `kind === "photo"`、`pageSide === "cross-spread"`，rect 严格满足 `x < 1 && x + width > 1`，并且 `allowGutterCrossing === true`。几何跨线但没有真实照片内容语义的其他 Slot kind 一律不计为 evidence。
- **Cross-page content relation：** 至少一个 `cross-page-pair`，photo/note Slot 分处左右页且 relation 引用有效。

`color-field` 跨越中心线只是一项受控渲染事实，不能证明内容或图文关系不可拆分；它只有在同一 Definition 已由跨书脊照片或合法 `cross-page-pair` 独立证明为 spread 后才允许存在。共享 Theme、相同网格、名称、描述、左右视觉平衡、两个独立页面同时预览也均不构成证据。当前不引入 `inseparable` 布尔值、自由文本理由或 composition group；F3 若确有“多 Slot 原子组合且没有真实跨书脊照片或跨页关系”的用例，应改写为 page Recipe，或另开 Gap 提供新的内容结构语义。

### 6. 最小类型/schema 草案

```ts
type DerivedSpreadEvidence =
  | { kind: "cross-gutter-photo"; photoSlotId: string }
  | {
      kind: "cross-page-pair";
      photoSlotId: string;
      noteSlotId: string;
    };

function deriveSpreadEvidence(
  recipe: RecipeDefinition,
): readonly DerivedSpreadEvidence[];
```

该结果不序列化；Definition 不新增可伪造的证据字段。

### 7. Validator 与 Compatibility 影响

- `scope: "spread"` 且证据数组为空：`scope` issue，拒绝；`color-field` 即使跨中心线也不能让证据数组非空。
- 所有 Slot 只在左页：拒绝。
- 左右各有独立 Slot但没有合法 `cross-page-pair`、也没有跨书脊照片：拒绝，并提示拆为两个 page Recipe；普通几何跨线或色域跨线不补足证据。
- 真正跨书脊照片：接受。
- 左图、右侧绑定 Note、`cross-page-pair`：接受。
- 只有跨中心线 `color-field`、没有跨书脊照片或 `cross-page-pair`：拒绝。
- `color-field` 跨中心线且同一 Definition 另有有效跨书脊照片或 `cross-page-pair`：允许色域渲染，但 evidence 仍只记录照片/关系。
- Compatibility 继续检查目标有完整两页；证据是静态 Definition 条件，不由内容临时伪造。

### 8. Renderer 与 Editor/Reader 影响

正常有效 Definition 无 Renderer 变化。无证据 Definition 在进入菜单、Preview 或 AI 前即被拒绝；Editor/Reader 不接收“半个 spread”。

### 9. 向后兼容和迁移策略

现有 `recipe-reference-cross-gutter-v1` 和 Reference cross-gutter fixture 可自动通过。逐一审计任何已有 `scope: spread`；无证据项保持不可用并改写为 page，而不是自动补布尔值。草稿只保存 recipe id/version，不需改 Application。

### 10. 自动化测试清单

- 计划指定的五个正反例全部建立 Validator 测试。
- rect 恰好止于 `x=1` 或始于 `x=1` 不算跨线。
- `cross-spread` 但 rect 未跨线拒绝。
- 跨线 photo 未允许 gutter crossing 拒绝。
- 跨线 `color-field` 作为唯一跨页事实时拒绝，且 `deriveSpreadEvidence` 返回空。
- 跨线 `color-field` 与有效跨书脊照片共存时接受，但 evidence 只包含 `cross-gutter-photo`。
- 跨线 `color-field` 与合法 `cross-page-pair` 共存时接受，但 evidence 只包含 `cross-page-pair`。
- `cross-page-pair` 同侧、未知 Slot、page scope 均拒绝。
- 有证据 spread 从左右任一侧应用、目标两页、一次 undo/redo 不回归。

### 11. 用户手动视觉验证清单

- 真正跨书脊照片左右连续，单页聚焦时仍可理解。
- 跨页图文对应不会被误读为附近另一张照片的 Note。
- 从左右任一页触发结果一致；一次撤销恢复两页。
- 书脊附近主体、文字和未来色域由用户确认安全。

### 12. 阻断判断

阻断 F2 中 spread 规则、所有 F3 spread Anchor，以及 F0.6 后的正式 spread 注册。

### 13. 待用户明确批准

批准“只接受真实跨书脊照片或合法 `cross-page-pair`；跨中心线 `color-field`、共享 Theme/网格/平衡均不足；当前不增加作者布尔值或 composition group”。

---

## GAP-F0-03：Catalog/Authoring Metadata 不完整

### 1. 当前代码/文档证据

- 当前 `RecipeDefinition` 混合运行时几何与 `familyId/status/name/description`；代码检索显示 `status` 除 fixture 断言外没有形成正式目录权威过滤。
- `RecipePreviewTag` 与 Reference scenario 标签分别存在于两个 Matrix 文件，未形成正式 Catalog schema。
- `RecipeDefinition` 没有 ratio preference/risk、density、pace、axis、topology、color strategy、subject/gutter risk 或 Fingerprint。
- Phase F 第 11 节要求 Fingerprint 和 pairwise difference；第 14 节要求确定性 AI/筛选标签。
- F1 R-03/R-06/R-09 说明尺度、留白、色彩是选择与差异信息，但不全是 Renderer 几何字段。

### 2. 对 F2、F3 与 AI 管道的影响

F2 需要稳定的家族与作者词表；F3 需要可比较的 Fingerprint；Preview 需要确定性场景；AI 只能选择 Catalog 条目，不能解析组件或自然语言。若将这些全部塞进 Definition，会让几何、发布状态和检索元数据相互耦合。

### 3. 分类

`catalog metadata`。从 Definition 可计算的事实只形成生成视图，不重复持久化；审美/风险/阅读语义由作者声明。

### 4. 候选方案及取舍

1. **把所有字段加入 `RecipeDefinition`。** 文件少，但核心 Contract 膨胀、状态与 metadata 更新会迫使 recipe version 变化。
2. **独立 `RecipeCatalogEntry`，通过 id/version 引用。** 分层清楚，允许 Catalog schema 单独版本化；需要跨层校验。
3. **只用自然语言/任意 tag 字符串。** 灵活但不可确定筛选、无法评分，也不适合 AI Gate。

### 5. 推荐与明确不采用

采用方案 2。`RecipeCatalogEntry` 是 `familyId`、发布 `status`、作者选择语义的唯一权威。新核心 Definition 不再把 family/status 当运行时事实；迁移期若旧 Definition 仍带它们，适配器只校验/投影，不允许覆盖 Catalog。明确不采用自然语言作为唯一条件，也不持久化可由 Definition 唯一推导的 scope、照片数、Note relation、bleed、角色集合、面积/密度。

### 6. 最小类型/schema 草案

```ts
type RecipeCatalogEntry = {
  catalogSchemaVersion: 1;
  recipe: { id: string; version: number };
  familyId: "editorial" | "grid-contact" | "quiet" | "dynamic" | "chromatic";
  status: "draft" | "active" | "deprecated";
  ratios: {
    preferred: readonly ("landscape" | "portrait" | "square" | "ultra-wide")[];
    risky: readonly ("landscape" | "portrait" | "square" | "ultra-wide")[];
  };
  fingerprint: {
    slotTopology: "single" | "diptych" | "stack" | "band" | "grid" | "mosaic" | "index" | "cross-gutter";
    compositionAxis: "horizontal" | "vertical" | "diagonal" | "center" | "edge" | "around";
    readingDirection: "ltr" | "rtl" | "top-down" | "bottom-up" | "inward" | "outward" | "radial";
    colorStrategy: "paper" | "single-accent" | "zoned" | "rhythmic";
  };
  selection: {
    pace: "slow" | "medium" | "fast";
    subjectEdgeRisk: "low" | "medium" | "high";
    gutterRisk: "low" | "medium" | "high";
  };
  previewScenarioIds: readonly string[];
};

type DerivedRecipeFacts = {
  scope: RecipeScope;
  photoCountRange: { min: number; max: number; slots: number };
  density: "low" | "medium" | "high";
  dominantImageScale: "small" | "medium" | "large" | "full";
  noteModeAndRelations: { mode: RecipeNoteMode; relations: readonly RecipeRelationKind[] };
  bleedPattern: "none" | "partial" | "full" | "cross-gutter";
  typographyRoles: readonly RecipeTypographyRole[];
};
```

作者声明：family、比例偏好/风险、topology、axis、reading direction、color strategy、pace 与内容风险。生成器推导：scope、照片范围、density、dominant scale、Note、bleed、typography roles。Preview scenario ID 必须来自受控 registry，而非任意展示 tag。

### 7. Validator 与 Compatibility 影响

- Catalog validator 验证 recipe id/version 存在、枚举合法、active 条目引用有效 Definition。
- 跨层 validator 检查作者声明不与派生事实矛盾，例如 `cross-gutter` topology 必须有 `cross-gutter-photo` evidence，`zoned/rhythmic` 必须有足够 color-field 事实；后者不得反向提升为 spread evidence。
- Compatibility 仍只由 Definition 与内容计算；Catalog 只筛选/排序，不能把不兼容项变为兼容。

### 8. Renderer 与 Editor/Reader 影响

Renderer 不读取 Catalog。菜单、Preview 导航和未来 AI 读取 Catalog + 派生视图，再把选中的 Definition/Application 交给共享 Renderer。这样 Editor/Reader 不会因元数据变化而漂移。

### 9. 向后兼容和迁移策略

先为现有 5 个 legacy Recipe、Gutter bridge 和 6 个 Reference fixtures 生成兼容 Catalog 条目；Reference 保持 `draft`。迁移期读取旧 Definition 的 `familyId/status` 作为一次性 seed，并与 Catalog 校验；写入只写 Catalog。待所有调用者切换后，核心 Definition 的重复字段才可在后续 schema 版本移除。

### 10. 自动化测试清单

- 所有 Catalog 条目引用存在且版本匹配。
- `active` 只在 Catalog 出现一次；Definition 的旧状态不能覆盖。
- derived facts 对固定 Definition 结果稳定。
- pairwise difference 使用 author + derived fingerprint，可重现且阈值正确。
- Catalog tag 不改变 Compatibility 或 Renderer plan。
- AI 输入只能使用确定性枚举并输出存在的 id/version。
- deprecated/unknown version 的读取与菜单过滤正确。

### 11. 用户手动视觉验证清单

- 菜单按 family、照片数、Note、scope、density 筛选与实际版面一致。
- Preview scenario 标签能定位真实场景，不出现“标签说支持、画面不支持”。
- active/draft/deprecated 的显示符合审批状态。
- 相似 Recipe 的 Fingerprint 差异与用户观察一致；自动分数不替代审美 Gate。

### 12. 阻断判断

阻断 F2/F3 的正式、可落地规格和所有 Catalog 实现；不阻断纯研究。用户批准前不得创建 60 项条目。

### 13. 待用户明确批准

批准独立 `RecipeCatalogEntry`；Catalog 为 family/status 唯一权威；采用上述“作者声明 vs Definition 推导”边界及受控词表方向。

---

## GAP-F0-04：`legacyStyleId` 仍为必填

### 1. 当前代码/文档证据

- `RecipeDefinition.legacyStyleId: ZineStyleId` 必填。
- `getRecipeForStyle` 在 base definitions 上按该字段查询；`zine-pages.ts`、`zine-manual-layout.ts`、Style/Overview UI 和测试仍调用该入口。
- `zine-draft.ts` 应用 Recipe 时仍读取 `recipe.legacyStyleId` 更新旧页面样式。
- Reference fixtures 的注释明确说字段只为旧持久化兼容，但所有新 fixture 仍被迫伪填 `"editorial"`。
- readiness 文档已规定 legacy 映射不定义实际布局语义。

### 2. 对 F2、F3 与 AI 管道的影响

F2 不应为新家族挑一个假旧 Style；F3 若继续必填，会把新视觉语义错误压缩成五种旧 ID。AI 应选 Recipe id/version，不能选 legacy style。旧草稿与现有 Style UI 又必须继续可读。

### 3. 分类

`compatibility`。

### 4. 候选方案及取舍

1. **`legacyStyleId?: ZineStyleId`。** 最小 diff，但字段仍看似 Definition 一等视觉语义，未来扩展兼容信息不清楚。
2. **`legacy?: { styleId: ZineStyleId }`。** 语义隔离清楚、可扩展，调用者必须经过兼容 helper。
3. **映射完全移出 Definition。** 边界最纯，但当前读取/写入路径多，一次迁移风险最高。

### 5. 推荐与明确不采用

采用方案 2 作为 v1.1 过渡形状，并将查找封装在 Legacy Compatibility registry/adapter；新正式 Recipe 默认没有 `legacy`。不采用继续必填，也不一次性移除所有映射。长期目标是在草稿全部改存 recipe id/version 后，把映射完全移出 Definition。

### 6. 最小类型/schema 草案

```ts
type RecipeDefinition = {
  // 其余核心字段
  legacy?: { styleId: ZineStyleId };
};

type LegacyRecipeMapping = {
  styleId: ZineStyleId;
  recipe: { id: string; version: number };
};

function getRecipeDefinitionByLegacyStyleId(
  styleId: ZineStyleId,
): RecipeDefinition | null;
```

旧 `legacyStyleId` 只由 v1 读取适配器接受；新作者 API 不暴露必填参数。

### 7. Validator 与 Compatibility 影响

Validator 对 `legacy` 可选；若存在则校验 styleId 合法且映射唯一。Compatibility 不读取 legacy。Registry validator 拒绝同一 styleId 指向多个 active target，避免读取歧义。

### 8. Renderer 与 Editor/Reader 影响

Renderer、render plan 与 Application 均不需要 legacy。Editor 旧 Style 入口通过 adapter 解析到 Definition；Reader 已保存 recipe id/version 时直接读取。视觉结果不应变化。

### 9. 向后兼容和迁移策略

1. v1 reader 接受 `legacyStyleId`，转成 `legacy.styleId` 或 registry 映射。
2. 现有五个 base Recipe 保留映射；Gutter bridge 仅在确有旧读写需要时保留，Reference fixtures 删除伪映射应留到 F0.6。
3. 旧草稿只有 styleId 时，经 `getRecipeDefinitionByLegacyStyleId` 解析并补 recipe id/version；保存新草稿时写新标识，同时在过渡期保留旧字段供旧版本读取。
4. 统计/测试确认无旧格式依赖后，才在后续 schema 移除 Definition 内兼容对象。

### 10. 自动化测试清单

- 没有 legacy 的新 Definition 静态有效并可渲染/应用。
- 五个旧 Style 均解析到原 recipe id/version。
- 旧草稿读取、切换、保存、重新打开不回归。
- 重复 legacy 映射拒绝；未知 style 给出可诊断 fallback，不静默选错。
- Reference fixtures 不再需要伪装为 editorial。
- page/spread、undo/redo、unplaced、Note 行为与映射字段无关。

### 11. 用户手动视觉验证清单

- 旧草稿的五种 Style 打开后版面不变。
- Style 菜单、Overview、Manual Layout 与 Reader 仍显示相同 Recipe。
- 新正式 Recipe 不出现虚假的 legacy 标签。
- 从旧草稿切换新 Recipe 后保存/重开，照片、Note、裁切不丢失。

### 12. 阻断判断

不阻断 F2 的家族文档；阻断新正式 Definition 的 F3-B/F4 实现。旧路径在整个迁移期必须保留。

### 13. 待用户明确批准

批准 `legacy?: { styleId }` 作为过渡形状、兼容查询入口继续存在、新 Recipe 默认无 legacy 映射，以及分阶段而非一次性删除。

---

## GAP-F0-05：真正的多色彩结构无法充分表达

### 1. 当前代码/文档证据

- `RecipeTheme` 只有 `background/foreground/muted/photoBackground`，均为页面级字符串。
- Renderer 只把四值变为 canvas CSS 变量；Slot kind 没有 `region/color-field`。
- Reference `colorTheme` 和 Phase E `coloredRecipe` 只替换整页背景/前景/占位色；`reference-multi-color-system-v1` 的结构仍只是照片与 Note，没有第二个功能性色域。
- Slot 已具备 rect、pageSide、zIndex，Renderer plan 已具备跨页裁分，因此色域可以复用受控几何，而不需要专用组件分支。
- F1 R-09、P06/M03/G03 与 Phase F 的 Chromatic 要求都明确：色彩必须组织信息，不能只换肤。

### 2. 对 F2、F3 与 AI 管道的影响

没有色域，Chromatic Bible 无法定义分区、节奏和强调三类能力，Anchor 只能伪装。AI 也无法用确定性 color strategy 区分结构。此项是 Chromatic 核心阻断项。

### 3. 分类

`core contract`；颜色使用和对比底线同时形成 `authoring rule`。

### 4. 候选方案及取舍

1. **继续扩充页面级 Theme。** 无法定位页面内区域或层级，不足。
2. **新增受控 `color-field` Slot + 语义颜色 token。** 复用 rect/pageSide/zIndex/cross-spread；数据驱动且最小。
3. **任意 CSS/className/component/plugin。** 表达力大但不可验证、破坏共享 Renderer 与安全边界。
4. **每个 Chromatic Recipe 专用 TSX/CSS。** 直接违反普通 Recipe 数据化目标。

### 5. 推荐与明确不采用

采用方案 2。色域只允许矩形、token 引用、pageSide 和 zIndex。跨中心线色域只允许出现在已由真实跨书脊照片或合法 `cross-page-pair` 独立证明的 spread 中；`color-field` 本身永远不参与 GAP-F0-02 的 evidence 推导。文字颜色只引用受控 foreground token，Renderer 根据层级与几何确定承载 surface。明确拒绝 CSS 字符串、className、组件名、任意渐变/滤镜/混合模式、每 Recipe 分支，以及只换 canvas background 冒充新结构。

### 6. 最小类型/schema 草案

```ts
type RecipeColorToken =
  | "paper" | "ink" | "muted-ink" | "photo-mat"
  | "accent-1" | "accent-2" | "accent-3" | "inverse-ink";

type RecipeTheme = {
  colors: Readonly<Record<RecipeColorToken, string>>;
};

type RecipeColorFieldSlot = RecipeBaseSlot & {
  kind: "color-field";
  fillToken: "paper" | "accent-1" | "accent-2" | "accent-3";
  // 即使 pageSide="cross-spread" 且 rect 跨 x=1，也不属于 DerivedSpreadEvidence。
};

type RecipeTextSlot = RecipeBaseSlot & {
  kind: "note" | "static-text";
  foregroundToken?: "ink" | "muted-ink" | "inverse-ink";
};
```

z-index 建议受控 band：color-field `0..9`、photo `10..19`、文字 `20..29`；validator 可用枚举/范围约束而不是接受任意层级。canvas 默认 surface 是 `paper`。颜色 token 在 v1.1 先限制为不透明、可解析的颜色值，避免 alpha/混色使静态对比失真。不在此阶段设计任何具体配色或区域坐标。

### 7. Validator 与 Compatibility 影响

- 所有 token 引用必须存在；颜色值只接受受支持格式并标准化。
- color-field rect、pageSide、跨线与 z-index 按普通 Slot 校验；page scope 不得跨线。
- spread 中跨线 color-field 只有在 Definition 已通过独立 spread evidence 校验后才合法；validator 的执行顺序必须先推导照片/关系 evidence，再校验跨线色域，禁止色域自证 scope。
- 文字 Slot 的 foreground 与其最上层完整承载 color-field（无则 paper）计算对比；普通正文目标至少 WCAG 4.5:1，大号文字的 3:1 只有 role/字号满足规则时可接受。
- 一个文字 Slot 跨多个底色、被照片部分遮挡或承载面无法唯一确定时拒绝，除非后续另有受控语义。
- 自动对比只是初筛；照片内容上的 overlay 仍需视觉 Gate，不能声称静态计算已保证可读。
- Compatibility 一般不随内容改变；若文字 overlay 照片，继续沿用明确风险/视觉 Gate，不自动采样用户照片作为 v1.1 必需条件。

### 8. Renderer 与 Editor/Reader 影响

Renderer 只增加一个通用 color-field 分支与 token CSS 变量，不增加 Recipe 专用逻辑。render plan 沿用 rect、跨页裁分和 zIndex 排序。Editor/Reader 必须从同一 plan 渲染相同色域；Editor 控制层仍在色域之外。

### 9. 向后兼容和迁移策略

四个旧 Theme 字段通过 adapter 映射为 `paper/ink/muted-ink/photo-mat`，accent token 使用安全默认值但旧 Definition 不生成 color-field。旧 Slot 的数值 z-index 由 v1 reader 按原相对顺序提升到对应 band，不能直接用新 band Validator 拒绝现有 Definition。现有页面视觉应逐像素等价。Reference color fixture 在 F0.6 可改成真正的受控色域 Gate fixture，但仍保持 `draft`，不能变成正式 Recipe。

### 10. 自动化测试清单

- token 缺失、未知 token、非法颜色拒绝。
- color-field 几何、z-band、层级排序稳定。
- page color-field 越界/跨页拒绝。
- 仅有跨线 color-field 的 spread 拒绝；跨线色域不能进入 `DerivedSpreadEvidence`。
- 跨线 color-field 与真实跨书脊照片或合法 `cross-page-pair` 共存时允许，且移除色域不改变 evidence 结果。
- 不足对比拒绝；边界 4.5:1/3:1 正确。
- 文字跨多个 surface 或被更高色域遮挡拒绝。
- 旧 Theme adapter 的渲染变量与现有值一致。
- Editor/Reader plan 的色域集合、rect、zIndex 完全一致。
- schema 明确不接受 CSS/class/component 字段。

### 11. 用户手动视觉验证清单

- 分区、节奏、强调三种能力在真实图片下层级清楚。
- 色域跨书脊连续但不掩盖重要主体/文字。
- Note、title、folio 在各自底色上可读，且 Note 仍是无背景的纯文字。
- Reader/Editor 与单页聚焦视角一致；深浅屏幕和常见尺寸下无闪烁/接缝。
- 自动通过的颜色组合仍由用户确认没有压过照片内容。

### 12. 阻断判断

阻断 Chromatic 的 F2 Family Bible、所有 Chromatic Anchor 与正式实现；不阻断其他家族只使用单一 paper Theme 的概念边界工作。

### 13. 待用户明确批准

批准受控 `color-field` Slot、语义 token、z-index band 与静态对比初筛；批准跨线色域必须依附于独立有效的 spread evidence、永不自证 spread；批准明确排除任意 CSS/组件/效果注入，并保留用户视觉 Gate。

---

## GAP-F0-06：Typography Role 表达不足

### 1. 当前代码/文档证据

- `RecipeTextSource` 只有 `literal | title | page-number`，只说明内容来源，不说明视觉职责。
- `RecipeSlot` 对文字只有 `maxLines/repeatable/text/textSource`，没有 role、最小字号、行高或对齐 token。
- Renderer CSS 将所有 Note 固定为同一字号/行高；所有 static text 固定为同一字号、粗重、字距、大写和单行省略。只有 slot id 为 `page-number` 时右对齐，说明样式依赖偶然 ID。
- 当前 static text 会 `text-overflow: ellipsis`；F0/F1 要求长 Note 不静默截断、文字职责可检验。
- F1 R-02/R-08 及 A03/A05/A07/G01 证明标题、索引、folio、label、caption/Note 需要不同但受控的层级。

### 2. 对 F2、F3 与 AI 管道的影响

Editorial、Grid/Contact、Chromatic 无法稳定区分标题、deck、索引、页码与 Photo Note。F3 若靠 slot id 或专用 CSS 实现，会让普通 Recipe 修改 Renderer。Catalog/AI 只需读取派生角色摘要，不应生成字号或 CSS。

### 3. 分类

`core contract`（role 与 token）和 `authoring rule`（有限 override、可读性底线）。

### 4. 候选方案及取舍

1. **只在 Slot 放 `role`，Renderer 内置全局样式。** 最小，但不同 Theme 无法受控调整层级。
2. **Slot 声明 role，Theme 为 role 提供有限 typography token。** 语义与表现分离，统一 Renderer 可处理。
3. **每 Slot 任意 font/CSS 数值或 className。** 灵活但无法保持 Catalog 一致、验证和安全。
4. **仅靠 `textSource` 或 slot id 推断。** 内容来源与视觉角色不是同一概念，易误判。

### 5. 推荐与明确不采用

采用方案 2。role 集合锁定为 `title | deck | label | folio | caption | note | index`。Role 属于文字 Slot；Theme token 只定义受限排版尺度。Note Slot 的内容仍由 `noteOfPhotoId`/relation 绑定，role 不改变绑定。明确不采用任意字体 URL、CSS 字符串、className、任意 transform，也不再根据 slot id 推断 folio。

### 6. 最小类型/schema 草案

```ts
type RecipeTypographyRole =
  | "title" | "deck" | "label" | "folio"
  | "caption" | "note" | "index";

type RecipeTextSlot = RecipeBaseSlot & {
  kind: "note" | "static-text";
  role: RecipeTypographyRole;
  align?: "start" | "center" | "end" | "inward" | "outward";
  foregroundToken?: "ink" | "muted-ink" | "inverse-ink";
};

type RecipeTypographyToken = {
  size: "xs" | "sm" | "md" | "lg" | "xl";
  lineHeight: "tight" | "normal" | "open";
  weight: 400 | 500 | 600 | 700;
  tracking: "tight" | "normal" | "wide";
  transform: "none" | "uppercase";
};

type RecipeTheme = {
  colors: Readonly<Record<RecipeColorToken, string>>;
  typography: Readonly<Record<RecipeTypographyRole, RecipeTypographyToken>>;
};
```

字体 family 不由 Recipe 提供，只使用产品批准的 Theme/font registry。字号枚举映射必须有绝对最小值；建议正文/Note 在最终单页视角不低于产品基线，具体 px/rem 映射由 F0.6 结合现有画布缩放测试锁定。单个 Slot 只开放 `align` 和 foreground token，不重复复制 size/weight 等样式。

### 7. Validator 与 Compatibility 影响

- 所有 note/static-text Slot 必须有合法 role；Theme 必须覆盖使用到的 role。
- Note slot 只允许 `caption | note | index`；`noteOfPhotoId` 与 relation 仍强制。
- `folio` 应使用 `page-number` source；`title` 应使用 title 或明确 literal；明显矛盾组合拒绝。
- maxLines/maxCharacters 与 role token 共同参与现有预估；不允许低于最小字号，也不允许正式输出静默 ellipsis。
- `inward/outward` 由 pageSide 在 Renderer 解析，不写死 left/right。
- 反色只通过 GAP-F0-05 的 foreground token 与承载色域校验，不复制背景字段。

### 8. Renderer 与 Editor/Reader 影响

Renderer 增加通用 `data-typography-role`/token 解析，移除依赖 slot id 的样式判断；同一 role 在 Editor/Reader 使用同一 token。Reader 隐藏空槽，Editor placeholder 不影响文字尺寸。单页聚焦视角仍消费相同 DOM/plan。

### 9. 向后兼容和迁移策略

adapter 为旧 Slot 推导临时 role：page-number source → `folio`；note kind → `note`；其他 static text → `label`。旧 Theme 使用默认 typography preset，保持现有视觉近似。Reference fixtures 在 F0.6 显式补 role；新作者 API 强制 role，旧推导不允许用于新正式 Catalog。

### 10. 自动化测试清单

- 七个 role 均通过统一 Renderer，未知 role 拒绝。
- role/source 矛盾、Theme token 缺失、非法枚举拒绝。
- Note 仍按 photoId 绑定，多图多 Note 不错配。
- 长 Note 超过字符/行预算被 Compatibility 阻止，不静默截断。
- inward/outward 在左右页镜像正确。
- foreground token 与 color-field 对比校验联动。
- Editor/Reader 的 role、文本、rect、token 一致。
- 旧 Slot adapter 的 folio/note/label 推导稳定。

### 11. 用户手动视觉验证清单

- title、deck、label、folio、caption、note、index 的职责在遮住名称后仍可辨。
- 无 Note、短 Note、长 Note、最大多 Note 在 Reader 与 Editor 都不截断、不重叠。
- 手机/单页聚焦视角达到最小可读字号，行长与行高合理。
- inward/outward 在左右页及书脊附近方向正确。
- 反色文字在 paper、accent 色域上可读，且 overlay 照片仍经人工判断。
- Note 保持纯文字、无卡片背景/胶囊/阴影，并与正确照片绑定。

### 12. 阻断判断

阻断 Editorial、Grid/Contact、Chromatic 的 F3 Anchor；F2 可描述 role 边界，但在本裁决获批前不得落坐标或 Definition。

### 13. 待用户明确批准

批准七个 role、Slot + Theme token 的职责分配、受限枚举与产品字体 registry；批准禁止任意字体/CSS，并要求最小字号和用户单页视觉 Gate 在 F0.6 锁定。

---

## 8. 总体架构结论与真相源

```text
RecipeDefinition
  负责运行时可验证的几何、内容能力、关系、主题 token 与渲染事实
  唯一拥有：scope、canvas、slots、noteRelations、capabilities

RecipeCatalogEntry
  负责发现、筛选、家族、Fingerprint、AI 选择标签与审美/可用性元数据
  唯一拥有：familyId、publication status、作者声明的选择/风险/阅读语义
  通过 recipeId + recipeVersion 引用 Definition

Legacy Compatibility
  只负责旧 style/draft 的过渡映射，不定义新 Recipe 的视觉语义
  唯一拥有：styleId -> recipeId + recipeVersion 映射
```

跨层规则：

- `RecipeDefinition` 的几何事实可生成 `DerivedRecipeFacts`，Catalog 不重复存储。
- `RecipeCatalogEntry` 的作者语义不能改变 Validator/Compatibility 结果，也不能被 Renderer 当作布局指令。
- legacy adapter 只能解析旧标识，不能为新 Recipe 提供 family、颜色、字体或 scope。
- Catalog status 是发布/菜单的唯一权威。迁移期旧 Definition status 只作为兼容输入并要求与 Catalog 一致；完成迁移后移除重复字段。
- Recipe 的几何/渲染变化增加 recipe version；Catalog 文案、筛选或发布状态变化不应静默改变已应用版面。

## 9. F0.6 最小实现顺序（仅在用户批准后）

1. 先加入 GAP-F0-01 派生 metrics 与 GAP-F0-02 spread evidence validator；evidence 类型只包含 `cross-gutter-photo` 与 `cross-page-pair`。
2. 建立 Catalog schema、derived facts 与跨层 validator，迁移 family/status 权威。
3. 加入可选 legacy 兼容对象/registry 和旧草稿 adapter。
4. 一次性加入受控 color-field、颜色 token、typography role/token，使两者共享前景/承载面对比规则；color-field Validator 必须调用第 1 步已经锁定的 evidence 结果，不能扩充 evidence 类型。
5. 更新 Reference fixtures、两套 Matrix 与纯逻辑/plan 测试；明确加入“color-field-only spread 拒绝”及“color-field + 独立 evidence 接受”的回归；Reference 仍为 `draft`。
6. 运行 typecheck、lint、全部测试与生产构建；浏览器视觉验证由用户执行。

上述顺序不是本阶段的代码授权，也不授权设计 Recipe。

## 10. 总体验证计划

### 静态与自动化

- Schema：新旧读取、未知字段/枚举、id/version、唯一 status/mapping 权威。
- Validator：page/spread 边界、仅由跨书脊照片/`cross-page-pair` 产生的 spread evidence、color field 非证据性及其几何/层级/对比、typography role/source/最小值。
- Compatibility/Application：照片数量、Note 长度/行数、hidden/unplaced、确定性 assignment、page 隔离、spread 原子性。
- Renderer plan：Editor/Reader 同 Slot/rect/zIndex/token/role；跨书脊同 placement；旧 Theme/legacy adapter 不改变结果。
- Catalog：派生事实、筛选、Fingerprint difference、Preview scenario、active/deprecated 和 AI 输出白名单。
- 回归：现有 legacy Recipe、Gutter bridge、六个 Reference fixture 与旧草稿读取。

### 用户手动视觉 Gate

- 标准 `3:4` 单页与 `3:2` 双页、左右触发、书脊连续和单页聚焦。
- 真实横/竖/方/超宽照片的 cover、焦点和主体风险。
- 无/短/长/多 Note，七种 typography role，左右页 inward/outward。
- 多色分区、节奏、强调、跨中心线色域、各文字层对比与 z-index。
- Editor/Reader 对照；Reader 无 placeholder/选中框/控制层。
- legacy 草稿打开与切换后，照片、Note、裁切、未放置状态一致。

## 11. 待用户一次性批准的决策

1. `3:2` 为派生语义，不存 `spreadRatio`。
2. spread 必须由真实跨书脊照片或合法 `cross-page-pair` 客观证明；跨线 `color-field`、作者布尔值或共享风格均不能作为证据。
3. 建立独立 `RecipeCatalogEntry`；Catalog 是 family/status 的唯一权威，几何事实从 Definition 推导。
4. legacy 采用可选兼容对象与 registry 分阶段迁移；不一次删除旧路径。
5. 多色采用受控 `color-field` + 语义 token + 对比初筛；跨线色域只允许依附于已有独立 spread evidence，禁止任意 CSS/组件/效果注入。
6. Typography 采用七个有限 role、Slot 声明 role、Theme 提供受限 token；禁止任意字体/CSS，并保留最小字号与人工视觉 Gate。

在这六项均获明确批准前：F0.5 报告可视为完成，但 Gate F0.5 不通过；F0.6、F2、F3 均不得启动。
