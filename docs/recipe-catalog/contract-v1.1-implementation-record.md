# Phase F0.6-A：Contract v1.1 Implementation Record

状态：F0.6-A、F0.6-B、F0.6-B.1、F0.6-C、F0.6-C.1 与 F0.6-C.2 实现完成；完成后停止，不进入 F0.6-D。  
日期：2026-08-12  
范围：F0.6-A Canvas Metrics / Spread Evidence Validator、F0.6-B RecipeCatalogEntry / Legacy Compatibility、F0.6-B.1 Legacy 与 Application identity 收口，以及 F0.6-C/C.1/C.2 Color Field Contract。

## 实现范围

- 保留 `RecipeDefinition.canvas.pageRatio: "3:4"` 为唯一持久比例。
- 新增只读派生函数 `deriveCanvasMetrics(pageRatio, scope)`，返回：
  - 单页 coordinate width：`1`；
  - spread coordinate width：`2`；
  - 当前标准物理 spread ratio：`3:2`。
- 新增只读 `DerivedSpreadEvidence`，证据种类仅为：
  - `cross-gutter-photo`；
  - `cross-page-pair`。
- 新增 `deriveSpreadEvidence(recipe)`：
  - 只有合法的跨书脊 photo slot 才生成 `cross-gutter-photo`；
  - 只有存在的 photo/note slot 且分处左右页的 `cross-page-pair` 才生成证据。
- `validateRecipeDefinition` 新增 spread evidence Gate：
  - spread 必须有合法跨书脊照片或合法 `cross-page-pair`；
  - 跨书脊 photo 必须严格满足 `x < 1`、`x + width > 1`、`allowGutterCrossing === true`；
  - 只有左页、只有右页或左右独立而无合法关系的 spread 被拒绝。
- F0.6-A 本身未实现 `Color Field`、`Typography Role`、Recipe 设计、Renderer/UI、StPageFlip、镜头与手势；`RecipeCatalogEntry` 与 Legacy registry 属于本记录后续的 F0.6-B 章节。

## 修改文件

- `features/zine/model/recipe-contract.ts`
  - 派生 Canvas Metrics；
  - `DerivedSpreadEvidence`；
  - evidence 推导与静态 Validator 规则。
- `features/zine/model/recipe-contract.test.ts`
  - Canvas Metrics 正例；
  - Gutter bridge 与 Reference cross-gutter 回归；
  - spread 左/右独立 Slot 拒绝；
  - `x=1` 边界、未授权跨脊拒绝；
  - 左图/右 Note 与右图/左 Note 合法关系；
  - 未知 Slot、同侧 `cross-page-pair` 拒绝。
- `docs/recipe-catalog/contract-v1.1-implementation-record.md`
  - 本实现记录。

## 验证结果

本记录的命令结果在任务结束前更新：

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 223 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

针对性纯逻辑验证已通过：

- `features/zine/model/recipe-contract.test.ts`：20 tests passed；其中明确覆盖全左页、全右页和左右独立 spread 反例；
- Reference/Preview Matrix 相关测试：31 tests passed。

## 用户手动验证范围与未实现项

本轮没有 Renderer 或视觉输出变更，不需要专门进行浏览器验证。未启动开发服务器、未打开浏览器、未执行浏览器自动化。

以下内容不属于 F0.6-A 已实现行为：

1. 当前没有注册可视化的左右 `cross-page-pair` fixture，因此暂时无法在界面验证两个方向；该项由 F0.6-D 的 Reference fixture 回归覆盖。
2. F0.6-A 阶段的菜单直接读取 `recipeDefinitions`，尚未通过 Catalog 过滤；非法 spread 不进入菜单属于 F0.6-B 的 Catalog Gate。
3. Preview Matrix 会故意显示 Validator 诊断；非法 spread 不出现在 Preview Matrix 或 Reader 不是 F0.6-A 的行为承诺，需由后续 Catalog/Reference fixture Gate 分别定义。
4. Gutter Bridge 的跨页连续性可等 F0.6-D 一并做回归。

静态派生比例与所有 spread evidence 正反例已由纯逻辑测试覆盖；本轮不追加浏览器视觉验证。

## Phase F0.6-B：RecipeCatalogEntry 与 Legacy Compatibility

### 实现范围

- 新增独立、版本化的 `RecipeCatalogEntry` 与 `RecipeCatalog` Validator。
- Catalog 通过 `{ recipe: { id, version } }` 引用 Definition；不复制 scope、照片能力、density、dominant image scale、Note relation 或 bleed pattern。
- Catalog 成为 family、发布 status、作者声明的比例偏好/风险、slot topology、composition axis、reading direction、color strategy、pace、主体/书脊风险和受控 Preview scenario IDs 的唯一权威。
- 从 Definition 派生 `DerivedRecipeFacts`：scope、照片数量能力、density、dominant image scale、Note mode/relations 与 bleed pattern。
- Catalog Validator 校验：
  - Definition 存在且版本匹配；
  - active 条目引用有效 Definition；
  - family/status/比例/拓扑/方向/色彩/pace/risk/Preview scenario 枚举合法；
  - 作者声明与派生事实不矛盾；
  - `cross-gutter` topology 必须有 `cross-gutter-photo` evidence。
- 正式手动排版菜单只读取有效的 active Catalog 条目；当前因此仍显示 6 个正式 active 条目（5 个旧 Style Recipe + Gutter bridge）。
- 开发 Reference Preview 保留 draft，并在 Recipe 区域和每个单元格显示 Catalog status 与 Validator 结果；Reference Recipe 没有升为 active。
- 新增唯一 Legacy registry/adapter：保留旧 Style 查询入口、精确 id/version 解析、重复 style 映射拒绝和未知映射诊断。
- 新增统一 `RecipeRef = { id, version }`；菜单点击、`onApplyRecipe`、`APPLY_RECIPE` action、reducer 和 Catalog 查询均传递精确 ref，不能只按 ID 解析。
- 生产 active resolver 只接受：精确 ref、`active` 状态、有效 Catalog、有效 Definition 和精确版本匹配；因此 draft、deprecated、invalid、未知版本和缺失 Definition 都被拒绝。
- Reader 与手动应用都走生产 active resolver；开发 Preview 只走独立 development 查询，保留 draft/deprecated/invalid 的诊断，不复用生产 resolver。
- 旧 Definition 中的 `familyId/status` 仍可读，但迁移期间只作为兼容输入；不覆盖 Catalog。
- `legacyStyleId` 与 `legacy?: { styleId }` 仅作为旧数据输入；Legacy registry 是运行时唯一映射真相源。现有五个旧 Style 由 registry 维护，新代码内 Definition 不再写 Legacy 映射；即使旧 Definition 字段冲突，也由 registry 胜出。
- F0.6-B.1 移除两处 `recipe-${styleId}-v1` 命名约定 fallback：Reader 初始 RecipeApplication 与手动新增页面都只能通过 Legacy registry 解析；registry 缺失时保持无 Recipe，不静默猜测 Definition。
- 所有跨页 `RecipeApplication` 身份比较同时匹配 `recipeId` 与 `recipeVersion`；同 ID 的不同版本不会互相同步或更新 placement。

### 未实现范围

- `Color Field`、颜色 Token、Typography Role；
- 正式新 Recipe 设计与 Catalog 批量扩展；
- Reference 的左右双向 `cross-page-pair` 可视 fixture；
- StPageFlip、镜头、手势、Renderer 几何和页面视觉改造。

### 修改文件

- `features/zine/model/recipe-catalog.ts`
  - Catalog schema、受控枚举、Derived Facts、Catalog Validator、active/development 查询。
- `features/zine/model/recipe-catalog.test.ts`
  - Catalog 引用/版本、枚举、Preview scenario、作者声明矛盾、跨脊拓扑、Compatibility/Renderer 隔离、Legacy registry 测试。
- `features/zine/model/recipe-contract.ts`
  - 统一 `RecipeRef`、精确 Definition ref 查询、Legacy registry/adapter、旧字段读取兼容；新 Definition 不再生成 Legacy 字段。
- `features/zine/model/recipe-phase-a-fixtures.ts`
- `features/zine/model/reference-recipe-definitions.ts`
  - 新/Reference fixture 不再伪填旧 Style ID。
- `features/zine/model/zine-draft.ts`
  - 手动 APPLY_RECIPE 全链路传递精确 RecipeRef，并通过生产 active resolver；旧 Style 只用于兼容页面样式。
  - 移除 Style 命名约定 fallback；跨页 placement 同步使用完整 RecipeApplication identity。
- `features/zine/model/zine-pages.ts`
- `features/zine/components/reader/zine-reader-page.tsx`
  - Reader 通过生产 active resolver 按 Recipe id/version 精确查询；旧 Style 入口继续保留。
- `features/zine/components/steps/manual-layout-step.tsx`
  - 正式菜单改为读取有效 active Catalog 条目，点击回调保留精确 `{ id, version }`。
- `features/zine/components/reference-recipe-gate.tsx`
  - Development Preview 使用独立 development 查询，显示 draft/active/deprecated 与 Catalog Validator 诊断。
- `docs/recipe-catalog/contract-v1.1-implementation-record.md`
  - 本章节。

### 真相源边界

```text
RecipeDefinition
  运行时几何、内容能力、Note 关系、Theme 与 Renderer/Application 事实

RecipeCatalogEntry
  family、status、发现/筛选、作者声明、Fingerprint 输入与 Preview 场景
  通过 recipeId + recipeVersion 引用 Definition

Production active resolver
  精确 RecipeRef -> active 且有效 Catalog -> 有效且同版本 Definition

Development resolver
  独立查询 draft/deprecated/invalid 条目与诊断，仅供开发 Preview

Legacy registry/adapter
  旧 styleId -> recipeId + recipeVersion 的过渡映射
```

Catalog 不改变 Compatibility 或 Renderer Plan；菜单和 Preview 只决定“哪些 Definition 可被发现/展示”，不改变 Definition 的布局行为。

### 验证结果

F0.6-B 针对性纯逻辑测试已通过：

- Catalog/Contract/Reference/Preview 相关测试：当前全套 224 tests passed。
- 覆盖同一 ID 的 v1/v2、Catalog 数组顺序交换、点击/dispatch 保留指定版本、draft/deprecated/invalid/未知版本/缺失 Definition 拒绝，以及 Definition Legacy 字段与 registry 冲突时 registry 胜出。
- `Reference Recipe` 全部保持 `draft`。
- 正式 active 查询只返回 Catalog 中有效的 active 条目。

四项完整静态门禁结果在本任务结束前更新：

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 224 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

### 用户手动验证方法

本轮不启动开发服务器、不打开浏览器、不进行浏览器自动化。完成后用户重点验证：

1. 正式手动排版菜单只出现有效 active Catalog 条目，不出现 Reference draft；
2. 开发 Preview Matrix 显示 Reference 的 `draft` 状态和 Catalog Validator 结果；
3. 旧草稿按原 Style 入口打开后仍能得到原 Recipe；
4. 旧草稿切换/重开后照片、Note 和 placement focus 不丢失；
5. F0.6-A 的 Gutter Bridge 连续性与双向 `cross-page-pair` 可视验证留待 F0.6-D。

## Phase F0.6-B.1：Legacy 与 RecipeApplication identity 收尾

- 移除 Reader 初始应用和手动新增页面中的 `recipe-${styleId}-v1` 命名约定 fallback。
- Legacy registry 是运行时唯一 Style → Recipe 映射；registry 缺失时不猜测、不回退到 Definition ID 命名规则。
- 跨页 application 更新与同步同时匹配 `recipeId` 和 `recipeVersion`，同 ID 的不同版本不会互相更新 placement。
- 新增回归测试：registry 缺失不回退；同 ID 不同版本的跨页 RecipeApplication 不互相更新 placement。

F0.6-B.1 本轮验证：

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 224 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

本轮到此停止，不自动进入 F0.6-C/D。

## Phase F0.6-C：Color Field Contract

本阶段仅依据 GAP-F0-05 实现功能性多色结构，不进入 Typography Role、正式 Recipe 设计或 F0.6-D。

### 实现范围

- 新增受控 `color-field` Slot，复用 `rect/pageSide/zIndex`，仅允许引用 `fillToken`；不接受 CSS、className、组件名、渐变、透明度、滤镜、混合模式或其他视觉注入。
- 新增语义颜色 Token：`paper`、`ink`、`muted-ink`、`photo-mat`、`accent-1`、`accent-2`、`accent-3`、`inverse-ink`。
- 文字 Slot 可引用受控 `foregroundToken`；本阶段不实现 Typography Role。
- Color Field 层级固定为 `0..9`，Photo 为 `10..19`，Text 为 `20..29`；超出范围拒绝。
- 旧四字段 Theme 通过 `adaptRecipeTheme` 映射到语义 Token；旧 Definition 的几何和相对层级不迁移、不改变。
- 静态对比度初筛只接受可确定解析的不透明颜色；普通文字要求至少 `4.5:1`。无法唯一确定承载色域、跨多个 surface 或被更高层区域覆盖的文字拒绝。
- `color-field` 永远不生成 `DerivedSpreadEvidence`；仅有跨线 Color Field 的 spread 被拒绝，已有真实跨书脊照片或合法 `cross-page-pair` 证据时才允许。
- Renderer/Render Plan 只增加一个通用 Color Field 分支；Editor 与 Reader 消费同一 Plan 结构。
- `reference-multi-color-system-v1` 已改为真实的多色结构，仍保持 `draft`，不进入正式菜单。

### 修改文件

- `features/zine/model/recipe-contract.ts`
  - 语义 Color Token、旧 Theme/Slot adapter、Color Field Validator、层级和对比度规则。
- `features/zine/model/recipe-contract.test.ts`
  - Token 缺失/未知、非法/透明颜色、z-index、Color Field-only spread、独立 evidence、evidence 不变、对比度边界与旧 Theme adapter 回归。
- `features/zine/model/reference-recipe-definitions.ts`
  - 将多色 Reference 改为两个受控 Color Field 与明确 Photo/Text 层，保持 draft。
- `features/zine/components/recipe-renderer-plan.ts`
  - 通用 `color-field` Render Plan 分支，并传递 token 信息。
- `features/zine/components/recipe-renderer.tsx`
  - 通用 Color Field renderer；Editor/Reader 共用同一计划。
- `features/zine/components/recipe-renderer.module.css`
  - Color Field 的通用定位规则。
- `features/zine/components/recipe-renderer-plan.test.ts`
  - Editor/Reader Color Field Render Plan 一致性测试。
- `docs/recipe-catalog/contract-v1.1-implementation-record.md`
  - 本章节。

### 验证结果

F0.6-C 针对性测试与全量测试已通过：

- 51 个测试文件、229 个测试通过。
- 覆盖受控 Token、Color Field 层级、透明/非法颜色、任意视觉注入、普通文字 `4.5:1` 对比度、跨线 Color Field 不构成 spread evidence、独立 spread evidence 允许、删除 Color Field evidence 不变，以及 Editor/Reader Plan 一致。
- Reference 多色 Definition 继续为 `draft`，未进入正式 active 菜单。

### 四项静态门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 229 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

本阶段未启动服务器、未打开浏览器、未进行浏览器自动化；本轮到此停止，不进入 F0.6-D。

## Phase F0.6-C.1：Color Field Contract 收尾

本轮只收紧 F0.6-C 的 Contract、适配与通用 Renderer 语义，不进入 Typography Role、正式 Recipe 设计或 F0.6-D。

### 收口行为

- `RecipeSlot` 改为按 `kind` 区分的联合类型；持久化/不可信数据仍经运行时 Validator 校验：`color-field` 只能有受控 `fillToken`，Photo 不得带视觉 Token，Note/static-text 只能使用受控 `foregroundToken`，任意 CSS/组件/透明度/滤镜/混合模式等视觉注入都会被拒绝。
- 明确保留 Legacy Slot adapter 与 v1.1 语义 Slot：旧 Definition 保持原几何、相对 z 顺序和四颜色视觉；现代 Definition 即使没有 Color Field 也执行 Photo `10..19`、Text `20..29` band。
- 文字承载面通过纯函数确定：无 Color Field 使用 `paper`；多个完整色域取最高 `zIndex`；同层歧义、跨色域边界和部分覆盖均拒绝；普通文字保持 `4.5:1` 对比度门槛。
- Renderer 默认 canvas/前景/弱化文字/照片底色分别使用适配后的 `paper`/`ink`/`muted-ink`/`photo-mat`；Note relation 样式改为继承解析后的显式前景色，Editor/Reader 继续消费同一 Render Plan。
- Color Field 的 `pageSide` 与几何一致：`cross-spread` 必须真实跨越 `x=1`，left/right 不得越过中心线；Color Field 不产生 spread evidence。

### 新增/更新验证

- 覆盖非法 kind 属性、现代无色域 band、paper 默认承载面、嵌套色域最高层、部分相交、同层歧义、跨线 pageSide、Renderer 语义变量、Note 前景继承路径和 Legacy Theme/Slot 顺序兼容。
- `reference-multi-color-system-v1` 继续保持 `draft`，没有进入正式菜单；未实现 Typography Role、Color Field 之外的颜色 Token 扩展或 F0.6-D 内容迁移。

### F0.6-C.1 四项静态门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 234 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

本轮未启动服务器、未打开浏览器、未进行浏览器自动化；到此停止，不进入 F0.6-D。

## Phase F0.6-C.2：Color Field Contract 最终收口

本轮只完成 F0.6-C.2，不进入 F0.6-D；不启动服务器、不打开浏览器、不进行浏览器自动化。

### 收口行为

- `resolveRecipeTextSurface` 在文字 Slot 与所有 Color Field 都没有几何交集时，确定性回落到 `paper`；存在交集但无法得到唯一完整承载面时仍拒绝。
- Legacy/Modern 只按 Legacy registry 中精确匹配的 `recipeId + recipeVersion` 判定。Registry 之外的所有 Definition（包括没有 Color Field 的现代 Recipe）统一执行 Photo `10..19`、Text `20..29` band；Legacy Definition 保留原相对 z 顺序和适配后的旧视觉语义。
- 持久化/不可信 Slot 按 `kind` 执行完整字段 allowlist：Photo、Note、static-text、Color Field 互不接受其他 kind 的视觉或内容字段；未知字段、未知 kind、非法 Token 和任意 CSS/透明度/滤镜/混合模式注入均拒绝。
- 现代 Definition 中文字与照片存在几何交叠时拒绝，避免文字承载面被照片遮挡；Legacy 继续走兼容路径，不改变既有视觉。

### 针对性验证

- 新增/补强无色域交集回落 `paper`、Legacy registry 精确身份、现代 band、每种 Slot allowlist、现代文字/照片交叠的正反例。
- 现有嵌套色域最高层、部分交集、同层歧义、跨线 pageSide、Color Field-only spread 与独立 spread evidence 回归继续通过。

### F0.6-C.2 四项静态门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过 |
| `npm test` | 通过：51 test files / 237 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build |

本轮到此停止，不自动进入 F0.6-D。

## Phase F0.6-D：Typography Role Contract

本轮只实现 GAP-F0-06 已批准的 Typography Contract；没有设计正式 Recipe，没有进入 F2/F3，也没有启动服务器、浏览器或浏览器自动化。

### 实现范围

- 锁定七个语义 role：`title | deck | label | folio | caption | note | index`；文字 Slot 显式声明 `role`，可选声明受控 `align: start | center | end | inward | outward`。
- Theme 提供按 role 索引的有限 Typography Token：`size: xs..xl`、`lineHeight: tight | normal | open`、`weight: 400 | 500 | 600 | 700`、`tracking: tight | normal | wide`、`transform: none | uppercase`。
- 产品内置完整默认 preset；Recipe 不提供字体 family/URL，只继续使用产品批准的 Geist/font registry。字号的最小枚举值映射为 `clamp(5px, .9vw, 7px)`，最终单页可读性仍由人工视觉 Gate 判断。
- 现代 Definition 必须为每个文字 Slot 声明合法 role，且 Theme 必须显式覆盖使用到的 role。旧 registry 精确匹配的 Definition 继续通过 adapter 推导：`page-number -> folio`、`note -> note`、其他 static text -> `label`，并保留旧 Slot 层级和近似视觉。
- Note Slot 只允许 `caption | note | index`；`folio` 必须使用 `page-number` source，`page-number` 必须使用 `folio`；`title` 只允许 `title` 或 `literal` source。
- Slot 不能携带 size/weight/font/CSS/class/component；Theme 和 Typography Token 都执行有限字段 allowlist。任意字体、CSS、className、组件、transform 字符串等注入继续拒绝。
- Render Plan 携带 `typographyRole`、受控 token 与已解析对齐；`inward/outward` 按左右页确定性镜像。Editor/Reader 继续共用相同 Plan 和 Renderer。
- Renderer 输出 `data-typography-role`，从有限映射生成字号、行高、字重、字距、大小写与对齐；移除按 Slot ID 判断页码右对齐，以及 static text 的静默 ellipsis。
- Reference fixtures 显式覆盖七个 role；新增 draft `reference-cross-page-pairs-v1`，同时可视证明左图→右 Note 与右图→左 Note，Catalog 仍保持 draft，不进入正式菜单。

### 修改文件

- `features/zine/model/recipe-contract.ts`
- `features/zine/model/recipe-contract.test.ts`
- `features/zine/model/reference-recipe-definitions.ts`
- `features/zine/model/reference-recipe-matrix.test.ts`
- `features/zine/model/recipe-phase-a-fixtures.ts`
- `features/zine/model/recipe-catalog.ts`
- `features/zine/model/recipe-catalog.test.ts`
- `features/zine/model/zine-draft.test.ts`
- `features/zine/components/recipe-renderer-plan.ts`
- `features/zine/components/recipe-renderer-plan.test.ts`
- `features/zine/components/recipe-renderer.tsx`
- `features/zine/components/recipe-renderer.module.css`
- `features/zine/components/recipe-preview-matrix.ts`
- `docs/recipe-catalog/contract-v1.1-implementation-record.md`

### 自动化覆盖

- 七个 role 使用同一 Renderer/Plan；Editor 与 Reader 的 role、token、对齐一致。
- 未知 role、Theme token 缺失、不完整/越界 token、role/source 矛盾、Note 非法 role、Theme 字体注入均拒绝。
- Legacy folio/note/label 推导不依赖 Slot ID；现代临时 Definition 必须显式迁移。
- inward/outward 左右页镜像；Note 的 photoId/slot relation 继续保持；长 Note 仍由 Compatibility 在渲染前拒绝，不做 Renderer 截断。
- 双向 `cross-page-pair` Reference 同时验证左右两个方向；Gutter Bridge、Color Field、Catalog/版本和旧草稿回归继续通过。

### 四项静态门禁

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过：51 test files / 244 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |

### 用户手动视觉 Gate

本轮没有启动服务器、没有打开浏览器、没有执行浏览器自动化。用户需要在 `/zine/preview-matrix` 检查：

1. 七种 role 的层级可辨，Reader 与 Editor 的字号、行高、字重、字距、颜色、位置和层级一致；Reader 无占位框或编辑控件。
2. static text 和长 Note 不出现省略号或静默截断；无/短/长/最大多 Note 不重叠。
3. `reference-cross-page-pairs-v1` 中，左图对应右 Note、右图对应左 Note；两侧 `inward/outward` 朝向正确。
4. 手机和单页聚焦视角达到可读基线，尤其检查 `xs` 的 folio/index；若肉眼过小，应调整产品尺度映射而不是开放任意字号。
5. Photo Note 仍为纯文字，无卡片背景、胶囊或阴影；Gutter Bridge 连续，既有 Color Field 与文字对比不回归。

F0.6-D 到此停止；未进入正式 Recipe Catalog 设计或 F2/F3。
