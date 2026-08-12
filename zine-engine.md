# Zine Engine

## Recipe Contract v1

状态：Contract v1 已在前端实现；正式 Recipe 大规模目录和 AI 管道仍未实现
版本：`1.0`  
适用范围：手动排版优先，预留 AI 排版管道；当前不要求后端持久化。

当前实现位置：`features/zine/model/recipe-contract.ts`、`features/zine/model/recipe-placement.ts`、`features/zine/components/recipe-renderer.tsx`、`features/zine/components/recipe-renderer-plan.ts`。

当前实现状态：

- 已实现 Recipe Definition 静态校验、内容兼容性判断、确定性 Application、照片/Note 绑定、未放置照片和隐藏 Note 状态。
- 已实现 placement 级 `focusX` / `focusY` / `scale`，同一照片在不同 placement 中可以独立裁切。
- 已实现单页与跨页 Recipe 应用；手动编辑器支持 Recipe 应用的一次 Undo/Redo。
- 编辑器预览、Reader 和开发用 Preview Matrix 共用 `RecipeRenderer`；开发入口为 `/zine/preview-matrix`，仅 development 环境可访问。
- 当前正式执行目录包含 5 个 legacy style Recipe 和 1 个跨页 `Gutter bridge` Recipe；6 个 Reference Recipe 只用于 Gate，不是正式产品目录，当前仍为 `draft`。
- 当前没有后端持久化、Recipe 远程发布、AI 生成或大规模 active Recipe 目录。完整视觉 Gate 仍需用户在开发环境手动检查。

本文档使用以下约束词：

- **MUST**：实现不可偏离。
- **SHOULD**：默认遵守，偏离时必须有明确理由。
- **MAY**：可选能力。

---

## 1. Contract 的目的

Recipe 不是一张静态模板图片，而是一组可以验证、应用、撤销和迁移的排版规则。Recipe Contract v1 必须统一解决：

1. Recipe 作用于当前单页还是整个跨页。
2. Recipe 可以容纳多少照片以及是否允许文字。
3. Photo Note 如何与所属照片保持绑定关系。
4. 切换 Recipe 时，照片、Note 和裁切状态如何保留。
5. 如何保证照片始终填满照片框，不出现未填充留边。
6. 如何让手动排版和未来 AI 排版使用同一套验证规则。

Recipe Contract v1 不负责：后端同步、多人协作、打印厂商参数、自动生成新 Recipe。

---

## 2. 已锁定的基础决策

### 2.1 页面与编辑单位

- 单页采用竖向 `3:4` 比例。
- 标准跨页采用 `3:2` 比例，由两张 `3:4` 单页组成。
- 用户以跨页浏览 Zine，但 Recipe 默认只修改当前聚焦单页。
- 只有真正不可拆分的跨页 Recipe 才可以同时修改左右两页。
- 所有尺寸使用标准化坐标描述，屏幕缩放不能改变排版关系。

### 2.2 照片填充

- 所有正式照片槽 MUST 使用等价于 `object-fit: cover` 的满框策略。
- 不允许出现照片没有填充照片框而产生的白边、透明边或背景留边。
- 用户调整“裁切”时，实际操作是移动照片在固定框内的焦点位置。
- Recipe 切换后 SHOULD 保留照片焦点，而不是保留旧照片框的像素位移。

### 2.3 Photo Note

- Photo Note 是照片内容的一部分，与 `photoId` 建立稳定绑定。
- Photo Note 不是固定页面坐标，也不是必须吸附照片外框。
- Recipe 决定如何在视觉上表达照片和 Note 的关系。
- Note 的视觉本体是纯文字：无背景、无卡片、无胶囊、无阴影。
- Recipe MAY 完全不支持 Note。
- 不支持 Note 的 Recipe 只隐藏 Note，MUST NOT 删除或清空 Note 数据。

---

## 3. 核心术语

### Photo Asset

用户在 Step 3 添加的照片资产。包括稳定 ID、原图、尺寸、Photo Note 等内容。

### Photo Note Binding

照片和其 Note 之间的语义绑定。绑定属于内容层，不属于某个 Recipe。Recipe 只决定这段绑定内容是否显示以及如何显示。

### Page

物理单页，具有稳定 `pageId` 和 `left/right` 页侧信息。

### Spread

由左页和右页组成的跨页，具有稳定 `spreadId`。

### Recipe Definition

不可变的排版定义，描述作用域、槽位、几何关系、Note 能力和兼容性限制。

### Recipe Application

某个 Recipe 被应用到具体单页或跨页后产生的实例，包括照片槽映射和每个照片实例的裁切焦点。

### Slot

Recipe 中可接收内容的位置。v1 包括 `photo`、`note` 和必要的静态文字槽。

---

## 4. Recipe Definition 必需字段

以下是数据语义，不要求实现者照抄字段命名，但行为 MUST 等价。

```text
RecipeDefinition
  schemaVersion: 1
  id: immutable string
  version: positive integer
  familyId: string
  name: string
  description: string
  status: draft | active | deprecated
  scope: page | spread
  capabilities
  canvas
  slots
  noteRelations
  constraints
  fallbackRules
  previewMetadata
```

### 4.1 身份与版本

- `id` 发布后 MUST 永久稳定，不能因改名而变化。
- `version` 在几何、槽位或应用行为变化时 MUST 增加。
- 草稿保存 `recipeId + recipeVersion`，不能只保存 Recipe 名称。
- 已应用的旧版本不能因 Recipe 更新而静默改变版面。

### 4.2 Scope

`scope` 只能是：

- `page`：只作用于当前聚焦页。
- `spread`：左右页作为一个不可拆分整体应用。

以下情况才允许使用 `spread`：

- 至少一个照片槽跨越书脊。
- 一个标题、网格、色彩系统或构图约束必须同时控制左右页。
- 左右页的内容映射无法拆分为两个独立单页 Recipe。

仅仅因为预览图同时展示两页，不能将 Recipe 标为 `spread`。

### 4.3 Capabilities

```text
capabilities
  photos
    min: integer >= 0
    max: integer >= min
  notes
    mode: none | optional | required
    maxCharacters?: integer
    maxLines?: integer
  allowsEmptyDraft: boolean
```

Note 模式语义：

- `none`：该 Recipe 不渲染任何 Photo Note。
- `optional`：有 Note 时按 Recipe 规则渲染，没有 Note 时自动回收文字空间。
- `required`：只有满足 Note 条件的内容才能应用该 Recipe。

`none` 仍然保留照片原有 Note 数据。

### 4.4 Canvas

- `page` Recipe 使用单页标准化坐标：`x/y/width/height` 均位于 `0..1`。
- `spread` Recipe SHOULD 使用统一跨页坐标：左页 `x=0..1`，右页 `x=1..2`。
- 跨越 `x=1` 的槽位视为跨书脊槽位。
- Recipe MUST 声明安全区、出血能力和书脊策略。

### 4.5 Slots

每个 Slot 至少包含：

```text
Slot
  id: unique within recipe
  kind: photo | note | static-text
  rect: normalized rectangle
  zIndex: integer
  pageSide: left | right | cross-spread
  required: boolean
```

Photo Slot 还应包含：

- `fit: cover`，v1 不接受其他正式输出模式。
- 可接受的宽高比范围。
- 是否允许出血。
- 是否允许跨书脊。
- 视觉顺序与照片映射优先级。

Note Slot 还应包含：

- 字体角色、字号范围、行高、字距和对齐。
- 最大宽度、最大行数和溢出规则。
- 是否允许旋转；默认保持水平阅读。
- 与具体 Photo Slot 的绑定关系。

---

## 5. Photo Note 绑定与排版关系

### 5.1 数据绑定

Photo Note MUST 通过 `photoId` 绑定照片，不能只依赖数组位置或视觉距离。

当同一照片被放入多个页面时：

- Note 内容仍来自同一个 Photo Asset。
- 每个照片实例可以由所属 Recipe 决定是否显示 Note。
- 一个实例隐藏 Note 不得影响其他实例。

### 5.2 Recipe 如何体现绑定

支持 Note 的 Recipe MUST 至少使用一种清晰的关系策略：

- `adjacent`：照片和文字相邻，例如左图右文。
- `aligned`：照片和文字共享明确的对齐轴。
- `edge-related`：文字位于照片外框附近，但不要求吸附页面外角。
- `indexed`：照片和文字使用相同编号或文字索引建立对应。
- `cross-page-pair`：照片和 Note 分布在跨页两侧，但构图明确表明对应关系。
- `overlay`：文字位于照片内部；只有在无背景的情况下仍能保证可读性时才允许。

不能仅因为 Note 和照片恰好出现在同一页，就认定绑定关系成立。

### 5.3 Note 溢出

- Recipe MUST 声明可接受的 Note 长度。
- 实现 MAY 在声明范围内换行或缩小字号，但不得小于 Recipe 的最小字号。
- 正式排版不得静默截断 Note。
- 超出能力时，应使用兼容性提示、替代 Recipe 或明确的降级版本。
- Recipe 预览 MAY 使用省略号，但必须标记为预览行为。

---

## 6. Recipe Application 数据

内容和排版必须分层保存。推荐语义：

```text
PageContent
  pageId
  photoIds[]

RecipeApplication
  recipeId
  recipeVersion
  scope
  anchorPageId
  targetPageIds[]
  assignments[]
  unplacedPhotoIds[]
  hiddenNotePhotoIds[]

Assignment
  slotId
  photoId?: string
  noteOfPhotoId?: string
  cropFocus?: { x, y }
  cropScale?: number
```

关键要求：

- `PageContent` 表达页面拥有的内容。
- `RecipeApplication` 表达这些内容当前如何显示。
- 切换 Recipe 不能通过删除内容来满足槽位数量。
- 未能放入新 Recipe 的照片进入 `unplacedPhotoIds`，不能丢失。
- 被无文字 Recipe 隐藏的 Note 进入 `hiddenNotePhotoIds` 或具有等价状态。
- Crop MUST 属于具体照片放置实例。未来同一照片在不同槽位中可以拥有不同焦点。

---

## 7. 应用 Recipe 的确定性流程

实现者 MUST 按以下顺序执行，手动排版与未来 AI 排版共用这一流程。

### Step 1：验证 Recipe Definition

检查 schema、ID、版本、槽位、坐标、作用域和关系定义。Recipe Definition 无效时禁止进入菜单可用状态。

### Step 2：确定目标页面

- `page`：目标只能是当前聚焦页。
- `spread`：目标是当前聚焦页所在跨页的左右两页。
- 应用 `page` Recipe 时，配对页的 Recipe、照片、Note、裁切和页状态 MUST 完全不变。

### Step 3：建立原子撤销快照

- `page` Recipe 保存当前单页快照。
- `spread` Recipe 保存左右两页和跨页实例快照。
- 一次 Recipe 应用对应一次撤销操作。

### Step 4：收集目标内容

内容顺序优先级：

1. 用户当前明确选中的照片。
2. 当前聚焦页原有照片的视觉顺序。
3. `spread` Recipe 中配对页的视觉顺序。
4. 用户刚从 Photos 菜单添加的照片。

不得从目标之外的页面自动偷取照片。

### Step 5：计算兼容性

返回下列结果之一：

- `compatible`：可无损应用。
- `compatible-with-hidden-notes`：可应用，但部分 Note 不显示。
- `needs-content`：照片或必需 Note 不足。
- `too-much-content`：内容超过 Recipe 能力。
- `incompatible`：存在无法安全降级的问题。

菜单必须能显示不可用原因，不能点击后静默失败。

### Step 6：映射照片槽

- 映射必须确定性执行，同一输入产生同一结果。
- 优先保留照片在当前页的大致视觉顺序。
- 内容超过 `max` 时不得删除；额外内容进入未放置状态。
- 内容少于必需槽位时，编辑器 MAY 显示添加提示，但正式 Reader/导出不得显示未填充照片框。

### Step 7：映射 Photo Note

- 根据 `photoId` 找到绑定 Note。
- `none`：记录为隐藏，不渲染，不删除。
- `optional`：有内容时分配 Note Slot；没有内容时使用无 Note 变体。
- `required`：缺少 Note 时 Recipe 不兼容。
- Note Slot 必须引用 `noteOfPhotoId`，禁止依靠视觉索引推断。

### Step 8：迁移裁切焦点

- 保留照片的标准化焦点 `x/y`。
- 根据新照片框重新计算 cover 缩放和可移动范围。
- 焦点超出新范围时进行最小幅度钳制。
- 不允许通过缩小照片暴露空白边缘。

### Step 9：动态验证

提交前检查：

- 所有必需槽位有合法内容。
- 所有照片框完全填充。
- Note 与照片绑定有效。
- 单页 Recipe 未改动另一页。
- 跨页 Recipe 满足书脊安全约束。
- 不存在未经声明的内容溢出。

### Step 10：原子提交

只有全部动态验证通过后才更新草稿。验证失败时保持应用前状态。

---

## 8. 单页与跨页 Recipe 行为

### 8.1 单页 Recipe

- 默认类型。
- 从左页应用只修改左页。
- 从右页应用只修改右页。
- 配对页不能因为视觉平衡、照片数量或 Note 状态而被自动重排。
- 单页 Recipe MAY 在菜单中显示双页环境预览，但预览必须突出实际被修改的单页。

### 8.2 跨页 Recipe

- 菜单卡必须显示清晰的“双页 / Spread”标识。
- 从左右任意一页触发，目标都是当前完整跨页。
- 必须一次性修改、验证和撤销。
- 跨页照片的重要主体和 Note 不得落在书脊损失区。
- 若其中一页不存在，Recipe 应标记为 `needs-content` 或先要求创建页面，不能生成半个跨页实例。

---

## 9. 无文字 Recipe 的规则

无文字 Recipe 是正式能力，不是异常状态：

- `notes.mode = none`。
- Recipe 预览卡显示“无文字”标识。
- 含 Note 的照片仍可使用该 Recipe。
- 应用时返回 `compatible-with-hidden-notes`。
- UI SHOULD 提示“Note 已保留，但此排版不显示文字”。
- 切换回支持 Note 的 Recipe 后，原 Note 应自动恢复参与映射。

---

## 10. Recipe 菜单要求

每张 Recipe 卡至少显示：

- 名称和预览。
- 单页或跨页。
- 照片数量范围。
- `无文字 / 可选文字 / 需要文字`。
- 当前内容的兼容状态。

排序 SHOULD 优先展示：

1. 完全兼容的 Recipe。
2. 仅隐藏 Note 的 Recipe。
3. 需要补充内容的 Recipe。
4. 不兼容 Recipe。

不兼容 Recipe 可以保留在列表中，但必须禁用并说明原因。

---

## 11. Recipe 作者执行流程

每个新 Recipe 必须按以下流程制作：

1. 选择 `familyId`，确定它属于哪一种排版类型。
2. 选择 `scope`，默认使用 `page`。
3. 声明照片数量 `min/max`。
4. 声明 Note 模式 `none/optional/required`。
5. 设计标准化 Photo Slots，保证所有槽位可以 cover 满框。
6. 若支持 Note，设计 Photo Slot 与 Note Slot 的明确绑定关系。
7. 若为跨页，定义书脊安全区和跨页槽位。
8. 定义内容不足、内容过多、无 Note 和长 Note 的处理方式。
9. 为最少照片数和最多照片数分别制作测试夹具。
10. 通过静态验证、动态应用测试和视觉验收后，状态才能设为 `active`。

批量制作每种类型十个以上 Recipe 前，必须先完成少量基准 Recipe，覆盖：

- 单图无文字单页。
- 单图可选 Note 单页。
- 多图无文字单页。
- 多图带 Note 单页。
- 一张照片真正跨书脊的跨页。
- 多色彩跨页或单页。

---

## 12. Validator 要求

实现 SHOULD 将验证器写成不依赖 React 和 StPageFlip 的纯逻辑模块。

### 静态验证

- Schema 版本受支持。
- ID 唯一且稳定。
- 坐标、尺寸和页侧合法。
- Slot ID 唯一。
- `page` Recipe 不含跨页槽位。
- `notes.mode = none` 时不得声明运行时 Note Slot。
- `required` Note 必须存在有效绑定关系。
- 所有 Photo Slot 使用 cover。
- 跨页内容声明书脊策略。

### 动态验证

- 内容数量兼容。
- Note 条件兼容。
- Assignment 引用有效资产和 Slot。
- 没有照片留边。
- 没有内容静默丢失。
- 目标页面范围正确。
- Recipe Application 可以完整撤销。

---

## 13. AI 排版管道预留

未来 AI 不得直接生成任意 CSS 或页面坐标。AI 管道只允许输出：

- 选择的 `recipeId + recipeVersion`。
- 目标 `pageId/spreadId`。
- 照片到 Slot 的 Assignment。
- 合法的裁切焦点建议。

AI 结果必须经过与手动排版完全相同的 Contract Validator 和应用流程。验证失败时不能写入草稿。

---

## 14. 推荐实现顺序

### P0：Contract 与纯逻辑（已完成）

1. 建立 Recipe Definition、Application、Assignment 和兼容性类型。
2. 建立静态 Validator。
3. 建立动态兼容性计算器。
4. 为本文验收场景建立纯逻辑测试。

### P1：草稿模型（已完成基础路径）

1. 将页面内容与 Recipe Application 分离。
2. 将 Crop 改为照片放置实例状态。
3. 增加未放置照片和隐藏 Note 状态。
4. 增加单页与跨页原子撤销快照。

### P2：手动排版接入（已完成基础路径）

1. Recipe 菜单读取 Definition 数据。
2. 显示作用域、文字能力和兼容状态。
3. 按确定性流程应用当前单页或跨页。
4. 保持现有 StPageFlip 翻页和镜头逻辑不变。

### P3：Renderer（已完成基础路径）

1. 根据 Application 渲染 Slot。
2. 渲染 Photo Note 的 Recipe 关系。
3. 保证 Reader 与编辑器使用同一个 Recipe Renderer。
4. 编辑器专用占位和控制元素不得进入 Reader 或导出。

### P4：扩展（未开始，Gate 后再做）

1. 完成每类十个以上 Recipe。
2. 添加封面和书背 Contract。
3. 接入 AI 选择管道。
4. 前端跑通后再设计后端持久化。

---

## 15. v1 验收场景

实现完成时必须通过以下行为测试：

1. 在右页应用单页 Recipe，左页所有状态逐字段不变。
2. 在左页应用单页 Recipe，右页所有状态逐字段不变。
3. 从跨页任意一侧应用 Spread Recipe，左右页一次性更新并可一次撤销。
4. 带 Note 的照片应用无文字 Recipe，Note 不显示但数据仍存在。
5. 切回支持 Note 的 Recipe，Note 可以重新出现并仍绑定原照片。
6. 左图右文 Recipe 能明确将 Note 绑定到左侧照片，不依赖外框吸附。
7. 多张照片与多条 Note 不会错配。
8. 长 Note 超出 Recipe 能力时不会静默截断。
9. Recipe 切换后所有照片仍填满照片框。
10. 槽位不足时照片进入未放置状态，不被删除。
11. 编辑器的空槽提示、添加页和控制按钮不进入 Reader。
12. 同一 Recipe 输入相同内容时得到相同 Assignment。
13. AI 提交无效 Assignment 时被 Validator 拒绝。

纯逻辑 Contract v1 已在代码和测试中实现；满足以上行为约束后，才可将 Reference Recipe Gate 视为完成并开始批量 Recipe 视觉设计。当前仍需开发环境 Preview Matrix 的人工视觉复核，不能仅凭静态测试宣称视觉 Gate 已完成。

## 16. 当前验证与下一步

- 纯逻辑与组件计划测试覆盖 Contract 校验、兼容性、Application 迁移、Photo Note、placement 焦点、单页/跨页应用和 Preview Matrix。
- `/zine/preview-matrix` 使用 Reference Recipe fixtures 一次渲染 Editor / Reader、空内容、容量边界、不同图片比例和 Note 长度；不依赖 StPageFlip。
- 生产构建不暴露 Preview Matrix：路由在非 development 环境调用 `notFound()`。
- 下一步是完成浏览器中的 Reference Recipe Gate 视觉检查，再决定哪些 Recipe 从 `draft` 升级为正式 `active`；不要直接扩展到大批量目录或 AI 接入。
