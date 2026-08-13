# Phase F3-A2.1 — Editorial Authored Text Contract Reality Gate

状态：**审计完成，等待用户批准裁决 `F3-A2.1-D01`；不得进入 F3-A3 或 F3-B。**  
日期：2026-08-13  
范围：只审计 authored static text 的 Contract、Draft、Apply、Compatibility、Editor 与 Reader 现实；不修改产品代码、Definition、Catalog、Renderer 或测试。

## 1. 结论先行

协调页提出的六项已知判断全部被当前代码证实，且还有两个相关容量事实：

1. `RecipeApplication` 没有每页或每 Slot authored static text 字段，只保存 Recipe 身份、目标页、照片 assignment、placement、未放置照片和隐藏 Note 照片 ID。
2. `RecipeContent` 只承载照片 ID、照片内容 ID、`notesByPhotoId` 和默认 focus；没有 title/deck/label/index 内容。
3. `textBySlotId` 只是 `RecipeRenderEnvironment` 的调用时可选覆盖。仓库内除声明和解析外没有任何调用者提供它；Editor、Reader、Style Preview 与 Reference Preview 均未建立产品数据链。
4. `textSource="title"` 读取 `environment.title`。正式 Editor/Reader 的 `page.title` 全部由 `draft.name` 生成，所以每个内容页重复同一个全局 Zine 名称；Style Preview 则使用 `recipe.name`。
5. `evaluateRecipeCompatibility` 检查 Definition、照片数量、Photo Note required/hidden、Note 字符数和 Note 行数；不读取 static-text 内容，也没有 title/deck 字符或行数输入。
6. 因此 `editorial-lead-story-v1` 当前只能保持为“视觉方向获认可、Contract 实现条件未关闭”。它承诺的每页 title、optional authored deck、60 字符/3 行、76 字符/2 行和超限不兼容，均不能由正式 Apply → Draft → Editor/Reader → Compatibility 路径兑现。
7. 当前全局 `ZINE_NAME_LIMIT` 是 48，不是 Lead Story 声明的 60；这只是 reducer 的全局 Zine 名称裁切，不是 Recipe Compatibility。
8. 当前 `ZINE_CAPTION_LIMIT` 是 120。Across the Record 的 required Photo Note 数据链成立，但视觉板中的 140 字符上限状态无法由现有编辑 UI 完整输入；正式实现前仍需把上限收紧至 120，或另行批准扩大 Photo Note 产品上限。

**推荐：采用方案 B——最小的每页/原子 spread authored static-text 数据能力；不为单一 Lead Story 引入富文本。** 在用户批准并由后续独立实现任务完成前，不把 Lead Story 标为可进入 F3-B，也不开始依赖 authored static text 的下一家族 Anchor 设计。

## 2. 审计范围与“持久化”定义

本报告完整复核了计划书、Playbook、Family Bibles、现有 Anchor Brief、Review Log、Contract Gap/Implementation Record，以及以下运行时路径：

- Contract 与 Application：[recipe-contract.ts](../../features/zine/model/recipe-contract.ts)
- Draft、Reducer 与 Apply：[zine-draft.ts](../../features/zine/model/zine-draft.ts)
- 手动页面模型：[zine-manual-layout.ts](../../features/zine/model/zine-manual-layout.ts)
- Editor/Reader 页面转换：[zine-pages.ts](../../features/zine/model/zine-pages.ts)
- 通用 Render Plan：[recipe-renderer-plan.ts](../../features/zine/components/recipe-renderer-plan.ts)
- 通用 Renderer：[recipe-renderer.tsx](../../features/zine/components/recipe-renderer.tsx)
- Editor 调用：[manual-layout-step.tsx](../../features/zine/components/steps/manual-layout-step.tsx)
- Reader 调用：[zine-reader-page.tsx](../../features/zine/components/reader/zine-reader-page.tsx)
- Recipe 菜单预览：[style-page-preview.tsx](../../features/zine/components/style-page-preview.tsx)

本报告所称“模型持久化”，指内容是否是 `ZineDraft`、页面数据或 `RecipeApplication` 的稳定字段，能够随 reducer 状态、Undo/Redo、Recipe 切换和 Editor→Reader 传递；不声称当前产品已经实现磁盘、后端或跨会话存储。当前仓库没有独立草稿序列化/后端保存路径，这不改变本次 schema 缺口判断。

## 3. 代码证据链

### 3.1 Contract 与内容边界

- `RecipeTextSource` 仅有 `literal | title | page-number`（`recipe-contract.ts:79`）。没有 `authored`、page content key 或内容实体引用。
- `RecipeStaticTextSlot` 只有 Definition 级 `text`/`textSource`、role、alignment 与视觉 token（`recipe-contract.ts:206–214`）；没有 authored content key、`maxCharacters` 或 `maxLines`。
- `RecipeApplication`（`recipe-contract.ts:331–340`）没有文字集合或文字 assignment。
- `RecipeContent`（`recipe-contract.ts:342–347`）只有照片、Photo Note 与 focus。
- `RecipeAssignment` 的 `noteSlotId`/`noteOfPhotoId` 只是 Photo Note 绑定指针；`createRecipeApplication` 在 `recipe-contract.ts:1274–1337` 只生成照片 assignment。实际 Note 文本仍由对应 `ZinePhoto.caption` 提供。

### 3.2 Apply、Draft 与切换

- `ZineDraft` 只有全局 `name`、`photos`、`styleId`、`manualSpreads`（`zine-draft.ts:48–53`）。`ZineManualPage` 只有照片 ID、内容 ID和 `recipeApplication`（`zine-manual-layout.ts:13–19`）。
- 用户可写 action 只有全局 `SET_NAME`、照片 `SET_CAPTION`、照片/focus/page/Recipe 操作；没有 set page title、set slot text 或 set deck action（`zine-draft.ts:70–92`）。
- `APPLY_RECIPE` 在 `zine-draft.ts:220–265` 只把 `photoIds`、`contentItemIds`、`notesByPhotoId` 与 focus 传给 Compatibility/Application。
- Recipe 切换只通过 `previousApplications` 迁移照片 placement。由于 Application 不含 static text，当前不存在可迁移或标为 unplaced 的 authored title/deck。
- Undo/Redo 只保存 reducer 状态；不存在的 authored 字段自然无法恢复。

### 3.3 Editor 与 Reader

- `createManualEditorPages` 和 `createZineReaderPages` 都把 `draft.name` 写进每个内容页的 `title`（`zine-pages.ts:95, 172, 182, 215` 等）。没有每页标题分支。
- Editor 在 `manual-layout-step.tsx:778` 通过 `ZineReaderPageView mode="editor"` 渲染；Reader 在 `zine-reader.tsx:466` 使用同一组件并设 `mode="reader"`。
- `ZineReaderPageView` 在 `zine-reader-page.tsx:113–123` 把 `page.title` 传给 `RecipeRenderer`，不传 `textBySlotId`。
- Style Preview 在 `style-page-preview.tsx:36–46` 把 `recipe.name` 当 `environment.title`，同样不传覆盖值。因此 Preview 中看见的 title 也不是用户每页文字。

### 3.4 Renderer 与临时覆盖

- `RecipeRenderEnvironment.textBySlotId` 在 `recipe-renderer-plan.ts:36` 只是可选调用参数。
- `resolveStaticText`（`recipe-renderer-plan.ts:229–238`）的顺序是：临时 slot override → `environment.title` → page number → Recipe literal。
- 全仓搜索只有该字段的声明和读取，没有生产或 Preview 调用值、reducer action、Application 字段或 Reader 传递。它可以做测试/临时预览 seam，但不是产品内容能力。
- 空字符串会使 static slot 不进入 plan；其他 Slot 几何不会移动，所以“optional 缺失不 reflow”在渲染几何层成立，但内容缺失没有持久化语义。

### 3.5 Compatibility

- `evaluateRecipeCompatibility` 位于 `recipe-contract.ts:1146–1232`。
- 它只读取 `content.photoIds` 和 `content.notesByPhotoId`，处理照片数量、required/hidden Note、Photo Note `maxCharacters` 与估算行数。
- static-text Slot 没有内容输入和容量字段，因此 title/deck 的 required、缺失、字符数、行数均不可能产生 Compatibility code。
- `validateTypographyContract` 只验证 role/source/token 组合；Definition 静态合法不等于用户文字存在或能装入 Slot。

## 4. 当前能力事实表

| role | 当前可表达的真实来源 | 模型持久化位置 | 用户可编辑 | 参与 Recipe Compatibility | 现实结论 |
| --- | --- | --- | --- | --- | --- |
| `title` | Recipe 固定 `literal`；或 `textSource="title"` 读取全局 Zine `draft.name`；也可被临时 `textBySlotId` 覆盖 | literal 在 Definition；全局名称在 `ZineDraft.name`；临时覆盖不持久化 | 只能编辑全局 Zine 名称，不能编辑每页 title | 否；全局名称仅被 reducer 截到 48 字符 | 能做固定标题或每页重复全局标题，不能做 Lead Story 的每页报道标题 |
| `deck` | Recipe 固定 literal；技术上可错误复用全局 title；临时 override | Definition 或全局 draft；无每页字段 | 无每页 deck 编辑入口 | 否 | 只能做所有应用都相同的固定 deck，不能做 optional authored deck |
| `label` | Recipe 固定 literal；临时 override | Definition；临时覆盖不持久化 | 否 | 否 | 适合固定栏目名/系统标签，不适合每页用户标签 |
| `folio` | `page-number`，由 Renderer 环境推导 | 不持久化文本；页码由页面顺序派生 | 否，也无需编辑 | 否 | 当前能力完整；Recipe 切换无需迁移 folio |
| `caption` | 首选 Note Slot：`ZinePhoto.caption` 经 photo relation；也可做固定 static literal | 照片 caption 在 `ZineDraft.photos`；Application 只存绑定指针 | 是，照片级 `SET_CAPTION`，全局上限 120 | 是，但只在 Note Slot/Photo Note 路径 | 照片 caption 成立；不支持独立于照片的每页 authored caption |
| `note` | Note Slot 从 `ZinePhoto.caption` 读取；也可做固定 static literal | 同上 | 是，照片级 | 是，支持 required/hidden/字符/行数 | 当前 Photo Note 主链成立，不是通用页面正文 |
| `index` | Note Slot 可把 Photo Note 渲染为 index role；或 Recipe 固定 static literal | Photo Note 在照片；literal 在 Definition | 只有 Photo Note 形式可编辑 | Photo Note 形式参与；static literal 不参与 | 支持“逐图可编辑 index Note”；不支持独立页面/组级 authored index |

### 4.1 六类内容来源不得混为一谈

| 来源类型 | 是否存在 | 是否随 Draft/Application 传递 | 适用边界 |
| --- | --- | --- | --- |
| Recipe 固定 literal | 是 | Definition 决定，所有应用相同 | 固定栏目名、系统标记、不可编辑 deck/label |
| 全局 Zine title | 是 | `ZineDraft.name` → 每个 `page.title` | 封面/全书名称；不是每页报道标题 |
| page number | 是 | 运行时派生 | folio |
| Photo Note | 是 | `ZinePhoto.caption` + Application relation 指针 | caption/note/index，必须绑定照片 |
| 每页 authored text | **不存在** | 无字段、无 action、无 migration | Lead Story title/deck 等被阻断 |
| 临时 `textBySlotId` | API seam 存在 | **不持久化，现有调用者均未提供** | 单次测试/预览，不得冒充正式能力 |

## 5. 对六个既有 Anchor 的影响

| Anchor | 当前 Contract 可兑现部分 | 缺口/条件 | Gate 状态 |
| --- | --- | --- | --- |
| `quiet-held-field-v1` | 单图、cover、focus、固定几何、无 Note | 无 authored static text 依赖 | **Contract-ready；Quiet 批准不受影响** |
| `quiet-scale-echo-v1` | 双图 placement、optional Photo Note、无 Note 固定几何、Note 长度/行数检查 | 必须把 Note 绑定到预期照片；不需要 authored static text | **Contract-ready；Quiet 批准不受影响** |
| `quiet-horizon-bridge-v1` | 单张 `cross-gutter-photo`、原子 spread、focus、无 Note | 无 authored static text 依赖 | **Contract-ready；Quiet 批准不受影响** |
| `editorial-lead-story-v1` | 照片几何、title/deck Typography Role、固定 literal 或全局名称的渲染 | 每页 title、optional authored deck、60/3 与 76/2 Compatibility 全部缺失；全局 title 还只有 48 字符 | **视觉方向通过；Contract 条件未关闭；禁止进入 F3-B** |
| `editorial-evidence-aside-v1` | 双图明显主次、optional Photo Note 与 evidence 图 relation、60 字符/4 行 Compatibility | `label-evidence` 只能是固定 literal；8.14% 次图是可接受下限，需真实照片可辨认 Gate；若主图也有 Note，当前没有通用 unplaced-Note 报告 | **视觉通过；Photo Note 主链 Contract-ready，保留真实照片 Gate** |
| `editorial-across-the-record-v1` | required Photo Note、`cross-page-pair`、原子 spread、Editor/Reader 同 plan | `label-record` 只能固定 literal；当前 UI Caption 上限 120，不能实际输入 Brief 的 140 字符状态；右页需真实文字与左右单页聚焦 Gate | **视觉通过；核心 spread/Note Contract-ready，保留容量与真实内容 Gate** |

这里的 `Contract-ready` 不代表已经创建 Definition 或 CatalogEntry；本阶段没有也不授权任何实现。

## 6. 对 F2 尚未设计角色位的影响

### 6.1 Grid / Contact

- 当前可直接建模：01 folio、03 Photo Note caption、05 Photo Note index/caption、07 indexed Photo Note、09 Photo Note index、10 无 Note、11 required index-role Photo Notes，以及 12 的无 Note/固定辅助 label 版本。
- 只能在 literal 条件下建模：02 label、04 edge label、06 统一组 label、08 两个组 label、12 辅助 label。若这些标签需随页或随分组编辑，就受本 Gap 阻断。
- 风险：`index` role 本身不代表有 index 内容。只有 Photo Note 绑定或固定 literal 可兑现；不能在 F3-A3 视觉板里假定任意 authored index 会被保存。

### 6.2 Dynamic

- 当前可直接建模：01/04/08/10 的纯图结构，03/05/11 的 Photo Note caption/note，06 在 index 明确由 Photo Note 提供时也可建模。
- 只能使用固定 literal：02/07/12 的 label。
- 明确被阻断：09 “方向标题页”的每页 authored title。若用全局 Zine title，会在多页重复，不能兑现角色职责。

### 6.3 Chromatic

- 当前可直接建模：03/04/12 的 Photo Note/caption，10 的无 Note或 folio；05/07/09 的 index 仅在逐图 Photo Note 语义下成立。
- 只能使用固定 literal：01/05/06/08 的 label，以及任何静态组名。
- 明确被阻断：01 的 per-page title、02 的 title+deck、06 的 authored title、11 的 authored title/caption（caption 若改为 Photo Note则可保留 Note 部分）。
- 颜色能力不填补文字内容缺口；Color Field 不能成为 authored data source。

结论：方案 C 会立即把问题推到 Grid/Contact 的 label/index 选择中；在 F3-A3 前关闭语义更稳妥。

## 7. 候选裁决

### 7.1 方案 A — 严格保持当前 Contract

规则：

- title 只允许全局 Zine title 或 Recipe literal。
- deck、label、独立 index 只允许 Recipe literal；folio 使用 page number。
- 用户可编辑文字仍只有全局 Zine name 与照片级 Photo Note。
- 删除或改写所有“每页 authored title/deck/label/index、required authored static text、static text 容量 Compatibility”承诺。

优点：零 schema 和产品路径变更；现有 Apply/Reader 无迁移风险。

代价：Lead Story 必须变成“每页重复全书名”或“固定模板标题”，失去已认可的报道入口；Dynamic 09、Chromatic 01/02/06/11 及部分 Grid 组标签不能按角色地图成立。固定 literal 也无法服务手动排版用户的真实故事内容。

判断：技术上诚实，但产品能力过窄，不符合“正式 Recipe 高度可用”和手动排版优先目标。**不推荐。**

### 7.2 方案 B — 最小每页 authored static-text 数据能力

#### 数据归属

推荐把文字作为 `ZineDraft` 内的独立内容实体，而不是把字符串塞进 Definition、DOM override 或仅按 Slot ID 存入 `RecipeApplication`。Application 只保存“内容实体 → 当前 Slot”的 assignment 与 unplaced 引用，结构上与照片 placement 类似。

最小方向示意（非代码授权）：

```ts
type ZineAuthoredTextItem = {
  id: string;
  owner: { kind: "page"; pageId: string }
    | { kind: "spread"; anchorPageId: string; targetPageIds: readonly string[] };
  contentKey: string;
  roleHint: "title" | "deck" | "label" | "index";
  text: string;
};

type RecipeStaticTextSlot = {
  // existing fields
  contentKey?: string;
  maxCharacters?: number;
  maxLines?: number;
};

type RecipeTextAssignment = {
  textContentId: string;
  staticTextSlotId: string;
  contentKey: string;
};

type RecipeApplication = {
  // existing fields
  textAssignments: readonly RecipeTextAssignment[];
  unplacedTextContentIds: readonly string[];
};
```

#### 绑定语义

- 使用稳定 `contentKey` 作为跨 Recipe 的内容语义，例如 `story-title`、`story-deck`、`section-label`；不用 role 单独绑定，因为一个 Recipe 可以有多个 label/index；不用 Slot ID 作为内容身份，因为 Slot ID 随 Recipe/version 改变。
- Slot ID 只表示当前几何落点。Recipe 切换先按相同 `contentKey` 迁移；未匹配内容进入 `unplacedTextContentIds`，不静默删除。
- role 继续控制 typography 与合法性，是内容提示而非唯一身份。

#### page 与原子 spread

- page 内容实体 owner 指向 page ID。
- spread 内容实体 owner 包含 anchor 与完整 `targetPageIds`；Application 的文字 assignment 与照片 assignment 一样由左右页共享同一原子身份。
- 从 spread 切回 page 时，能够按目标侧/内容 key 迁移的文字进入所选 page；无法确定归属的文字保持 unplaced，必须让用户决定，不能复制或丢弃。

#### Editor、Reader 与 optional 行为

- Editor 写同一个 `ZineAuthoredTextItem.text`；Reader 通过 Application assignment 读取同一实体。正式调用不再依赖临时 `textBySlotId`。
- optional key 缺失时 static Slot 不渲染，但其他 Slot rect、Color Field 与 scope 完全不变，不 reflow。
- Recipe literal、全局 Zine title、page number 与 Photo Note 保持现有来源；authored source 是新增且受限的第四种 static text 内容来源，不替换 Photo Note。

#### Compatibility

- Apply 前同时传递本次目标 page/spread 的 authored text items。
- required authored Slot 缺内容时 `needs-content`；`maxCharacters` 直接按纯文本字符计；`maxLines` 使用同一 typography token、Slot 宽度与确定性估算函数。
- 超限返回明确 static-text compatibility code，不在 Renderer 缩字号、ellipsis 或裁切。
- Compatibility 输出应能指出 `contentKey`/Slot ID，便于 Editor 定位。

#### Legacy 与安全

- 新字段全部可选；旧草稿缺省 `authoredTextItems=[]`、Application assignments=[]，既有 global title/literal/page number/Photo Note 视觉不变。
- 旧 Definition 不自动获得 authored source；只有新 Recipe 明确声明 `contentKey` 才启用。
- 内容只接受普通 Unicode 字符串和产品级长度限制；不接受 HTML、Markdown 渲染、字体 URL、className、CSS、style、组件或 transform。
- 未来 AI 与手动 Editor 写入同一 `ZineAuthoredTextItem`/`contentKey`，再走同一 Compatibility 和 assignment；AI 不直接写 Renderer 环境或 DOM。

优点：解决真实手动排版内容、Editor/Reader 一致、Recipe 安全切换与未来 AI 复用；不需要富文本系统。

代价：需要一次小而完整的 Draft/Application/Compatibility/Renderer 数据链实现，不能只加一个类型字段。

判断：**推荐。**

### 7.3 方案 C — 只允许 Preview authored text，正式 Catalog 延迟

做法：允许设计板或开发 Preview 通过 `textBySlotId` 展示 title/deck，但正式 Catalog 不发布依赖 authored static text 的 Recipe。

会阻断：Lead Story、Dynamic 09、Chromatic 01/02/06/11，以及任何需要用户可编辑组 label/独立 index 的 Grid/Contact 方向。Evidence Aside 与 Across the Record 的 Photo Note 主结构可继续保留，但它们的 label 只能 fixed literal。

问题：现有正式调用甚至没有提供 `textBySlotId`；即使 Preview 补上，也没有 Apply、Draft、Reader、Compatibility 或切换迁移。它只是把缺口推迟到 F3-B，并提高“SVG/Preview 成立、正式产品不成立”的误判概率。

判断：可作为短期演示隔离，不可作为正式裁决。**不推荐。**

## 8. 推荐裁决

### F3-A2.1-D01 — 采用最小 authored static-text 内容通道

**推荐用户批准方案 B。** 批准含义：

1. authored static text 是 Draft 内容，不是 Recipe Definition literal，也不是临时 Renderer override。
2. 内容用稳定 `contentKey` 识别；role 控制排版，Slot ID 控制当前几何。
3. Application 保存文字 assignment 与 unplaced 引用；Recipe 切换不得静默删除文字。
4. page 与 spread 分别拥有明确 owner；spread 保持原子 target pages。
5. required/字符/行数进入 Compatibility；Editor 和 Reader读取同一实体。
6. 只支持纯文本与现有受控 typography；明确排除富文本、HTML/CSS、任意字体和组件。
7. AI 将来写同一内容实体，不另建一套 prompt-only/preview-only文字通道。

该决策**尚未自动批准**。在用户明确批准 `F3-A2.1-D01` 前：Lead Story 仅为视觉通过，不进入 F3-B；F3-A3 不启动。

## 9. 最小实现边界与验证计划（只记录，不实施）

### 9.1 最小类型变更

- `ZineDraft`：可选 `authoredTextItems` 纯文本实体集合。
- `RecipeStaticTextSlot`：受控 `contentKey`、`maxCharacters`、`maxLines`；明确 source/role 组合规则。
- `RecipeApplication`：`textAssignments` 与 `unplacedTextContentIds`。
- `RecipeContent` 或新的 Apply 内容参数：目标页/spread 的 authored text items。
- Compatibility code/issue：missing、too-long、too-many-lines，并携带定位 key。

### 9.2 Reducer / Application 持久化路径

- 新增 create/update/delete authored text action，纳入 Undo/Redo。
- Apply、放图、删除照片、refresh application 与 page/spread 转换均保留文字实体和 assignment。
- Editor 页面模型与 Reader 页面模型只传引用/已解析文字，不各自复制字符串。

### 9.3 Compatibility 与 Renderer 环境

- Compatibility 在创建 Application 前验证 required 与容量。
- Render Plan 从 Application assignment + Draft content lookup 解析 authored text；Editor/Reader共用。
- `textBySlotId` 只保留测试/开发预览 seam，正式路径不以它作为真相源。
- optional 缺失不改变任何 Slot rect；Renderer 不缩字号、不截断、不 reflow。

### 9.4 Recipe 切换策略

- 精确 `contentKey` 优先迁移；必要时由版本化显式 alias/migration 映射。
- 未匹配内容进入 unplaced；用户可重新绑定、保留或显式删除。
- page↔spread 改变时不猜测跨页归属；无法确定则 unplaced。
- 切回旧 Recipe 时相同 key 可重新落位。

### 9.5 自动化测试计划

- page title/deck 创建、编辑、Undo/Redo、Reader 一致。
- short/max/over max characters 与 lines；required 缺失；optional 缺失固定几何。
- Recipe A→B→A 文字保留；无匹配 key 进入 unplaced；版本 alias 确定性。
- page→spread→page 原子性与左右页 lookup。
- global title、literal、folio、Photo Note 与 Legacy 草稿回归。
- 恶意 HTML/CSS/未知字段拒绝；Renderer 只输出纯文本。
- AI fixture 与手动 action 产生相同内容形状和 Compatibility 结果。

### 9.6 用户手动视觉验证

- Lead Story 短/长 title、无/长 deck，Editor/Reader 和单页聚焦一致。
- optional deck 缺失后主图不移动；超限被选择 Gate 拦截而不是视觉裁切。
- Recipe 切换后未落位文字在 Editor 明确可见，Reader 不泄漏未落位内容。
- Across the Record 使用真实 1–120 字符 Note 检查右页职责与左右单页聚焦；若要保留 140，另行裁决产品 Caption 上限。
- Evidence Aside 使用真实照片确认 8.14% 证据图仍可辨认。

### 9.7 明确不包含

- 富文本、HTML、Markdown 排版、任意字体、字体 URL、任意 CSS/class/style、组件注入。
- 后端、数据库、跨设备同步、协作编辑。
- AI 生成、prompt、模型调用或自动选 Recipe；本阶段只保证未来可复用的数据语义。
- 新 Recipe Definition/CatalogEntry、正式发布、Grid/Contact 设计或任何 F3-B 实现。

## 10. 本阶段检查与停止点

- 新报告使用相对代码链接；路径将在本阶段静态检查中验证。
- Editorial 概念板只修正文案排布，不改任何候选/Anchor Slot 几何、比例或视觉 topology。
- 按任务要求不运行项目代码测试：本阶段没有产品代码修改，目标是审计当前事实；运行测试不能补足缺失的数据语义，也不是本任务授权范围。
- F3-A2.1 完成后立即停止；不进入 F3-A3，不实现 `F3-A2.1-D01`，不自动批准推荐裁决。
