# Recipe 设计前置实施计划

状态：Recipe Contract v1 已完成，基础可视化验证已完成  
目标：完成可扩展的 Recipe 执行基础，使后续每个 Recipe 主要是数据和视觉设计，而不是新增一套组件逻辑。

---

## 1. 当前结论

现在可以开始做 Recipe 的视觉研究、情绪板和纸面草图，但还不应该批量制作正式 Recipe 数据。

正式 Recipe 设计开始前，系统必须先通过“Reference Recipe Gate”：使用少量基准 Recipe 证明 Renderer、内容迁移、Photo Note、裁切、单页/跨页和 Reader 输出都能由 Contract 驱动。

下一项最首要工作是：

> 建立通用、数据驱动的 Recipe Renderer，移除 Recipe 对旧 `styleId` 和专用 JSX 分支的依赖。

---

## 2. 为什么 Renderer 必须先完成

如果每加入一个 Recipe 都需要：

- 新增 React 条件分支；
- 新增专用 CSS 页面类；
- 单独处理 Note；
- 单独处理照片数量；
- 单独修改 Reader；

那么 Recipe Contract 只是一层元数据，不能支撑 50 个以上 Recipe。

目标状态应当是：

- Recipe 定义 Slots、坐标、文字能力和 Scope。
- Renderer 读取 Definition 与 Application 自动渲染。
- Editor 和 Reader 使用同一个 Renderer。
- 新增普通 Recipe 不修改 Renderer 代码。

只有增加新的底层布局能力时，才允许修改 Renderer。

---

## 3. 实施阶段

## Phase A：通用 Recipe Renderer

### 任务

1. 建立 `RecipeRenderer`，输入只能是：
   - Recipe Definition；
   - Recipe Application；
   - Photo Assets；
   - Page/Spread 渲染环境。
2. 使用标准化坐标渲染：
   - Photo Slot；
   - Note Slot；
   - Static Text Slot；
   - z-index；
   - 出血与安全区；
   - 左页、右页和跨页坐标。
3. Photo Slot 必须使用 cover 满框。
4. Editor 和 Reader 必须调用同一个内容 Renderer。
5. 编辑器控制层独立存在，不能进入 Reader。
6. 逐步移除 `legacyStyleId` 对实际布局的控制。

### 交付物

- 通用单页 Renderer。
- 通用跨页 Renderer。
- Editor/Reader 共用的渲染入口。
- Renderer 的纯数据 fixtures。

### 验收

- 修改 Recipe 坐标即可改变版面，无需修改 TSX。
- 新增一个只包含现有 Slot 类型的 Recipe 时，不修改组件代码。
- Editor 和 Reader 的照片位置、Note、层级和裁切结果一致。

---

## Phase B：Placement 级裁切模型

### 问题

照片裁切不能继续只存放在 Photo Asset 上。同一张照片进入不同 Recipe、不同 Slot 或不同页面时，需要独立裁切焦点。

### 任务

1. 将裁切状态迁移到 Assignment 或 Placement：
   - `focusX`；
   - `focusY`；
   - 可选 `scale`。
2. Photo Asset 只保存原始照片和默认焦点。
3. 切换 Recipe 时迁移标准化焦点。
4. 新照片框尺寸变化后重新计算 cover 范围并进行最小钳制。
5. 拖动照片时只修改当前 Placement。

### 验收

- 同一照片放在两个页面，可以拥有不同裁切位置。
- 调整一个照片实例不会改变另一个实例。
- Recipe 切换前后不会出现未填充留边。
- 切换回来时能恢复该 Placement 的合理焦点。

---

## Phase C：Photo Note 关系 Renderer

### 任务

1. Note 始终通过 `photoId` 与照片绑定。
2. Renderer 根据 Recipe 的 Note Relation 渲染：
   - adjacent；
   - aligned；
   - edge-related；
   - indexed；
   - cross-page-pair；
   - overlay。
3. Note 本体保持纯文字：
   - 无背景；
   - 无卡片；
   - 无阴影。
4. 支持：
   - `none`；
   - `optional`；
   - `required`。
5. 无文字 Recipe 隐藏 Note，但保留原始数据。
6. 长 Note 必须按 Contract 处理，不能静默截断。

### 验收

- 左图右文等非吸附关系可以完全由 Recipe 表达。
- 多图多 Note 不发生错配。
- 无文字 Recipe 切回支持文字 Recipe 后，Note 自动恢复。
- Editor 与 Reader 显示结果一致。

---

## Phase D：内容迁移、兼容性和撤销

### 任务

1. 完成 Recipe 应用的确定性映射。
2. 实现 `unplacedPhotoIds` 的可见状态，不得删除超出 Slot 的照片。
3. Recipe 菜单显示：
   - compatible；
   - hidden notes；
   - needs content；
   - too much content；
   - incompatible。
4. 单页 Recipe 只修改当前单页。
5. 跨页 Recipe 对左右页进行原子修改。
6. 单页和跨页应用都必须支持一次撤销与重做。
7. Recipe 应用失败时不得产生部分状态。

### 验收

- 单页应用后，对侧页状态逐字段不变。
- 跨页应用可以一次撤销并恢复左右两页。
- 超出 Recipe 容量的照片仍可找回。
- 同一输入重复应用得到相同 Assignment。

---

## Phase E：Recipe Preview Matrix

建立开发用预览矩阵，不要求做正式用户界面。

### 内容 fixtures

- 空页面；
- 最少照片数；
- 最大照片数；
- 超出照片数；
- 横图；
- 竖图；
- 方图；
- 超宽图；
- 无 Note；
- 短 Note；
- 长 Note；
- 多图多 Note。

### 页面 fixtures

- 左页；
- 右页；
- 标准跨页；
- 真正跨书脊照片；
- 深色背景；
- 多色彩背景。

### 验收

- 每个 Recipe 都可以一次性查看主要边界场景。
- Validator 错误与视觉错误可以明确定位到 Recipe ID 和 Slot ID。
- Preview Matrix 不依赖 StPageFlip，避免将排版错误与翻页错误混在一起。

---

## 4. 六个基准 Recipe

在正式批量设计前，只制作以下六个基准 Recipe：

1. `reference-single-photo-no-note`
   - 单页；
   - 单图；
   - 无文字。
2. `reference-single-photo-note`
   - 单页；
   - 单图；
   - 照片在左、Note 在右。
3. `reference-multi-photo-no-note`
   - 单页；
   - 3–4 张照片；
   - 无文字。
4. `reference-multi-photo-indexed-notes`
   - 单页；
   - 多图多 Note；
   - 编号或共享轴建立绑定。
5. `reference-cross-gutter-photo`
   - 跨页；
   - 至少一张照片真正跨越书脊；
   - 验证书脊安全区。
6. `reference-color-system`
   - 单页或跨页；
   - 多色彩系统；
   - 验证背景色、文字色和照片层级。

这些 Recipe 不是最终产品目录。它们用于验证引擎能力。

---

## 5. Reference Recipe Gate

满足以下全部条件后，才能开始正式 Recipe 设计：

- 六个基准 Recipe 全部通过静态 Validator。
- 六个基准 Recipe 全部通过动态应用测试。
- 普通 Recipe 可以只新增数据，不修改 Renderer TSX。
- 单页 Recipe 不改变对侧页面。
- 跨页 Recipe 可以原子应用、撤销和重做。
- 同一照片不同 Placement 可以独立裁切。
- 所有照片框始终满框，无未填充留边。
- Note 与照片不会错配。
- 无文字 Recipe 不删除 Note。
- 长 Note 有明确兼容或降级结果。
- 超额照片进入未放置状态，不丢失。
- Editor 和 Reader 使用同一 Renderer 并具有一致结果。
- 编辑器占位、选中框和控制按钮不进入 Reader。
- Preview Matrix 覆盖主要照片比例和 Note 长度。
- 所有纯逻辑测试、类型检查、lint 和生产构建通过。

Gate 未通过时，可以继续进行视觉草图，但不能将大量 Recipe 注册为正式 `active` 数据。

---

## 6. Gate 通过后的正式 Recipe 设计流程

### Step 1：建立排版家族

至少定义五个家族，其中必须包含一个多色彩家族。建议首批家族：

- Editorial / 叙事编辑；
- Grid / 网格与 Contact Sheet；
- Quiet / 大留白与艺术书；
- Dynamic / 切分、倾斜与节奏；
- Color / 多色彩系统；
- 可选：Archive / 档案与索引。

### Step 2：每个家族先设计三个骨架

- 单图；
- 双图或多图；
- 带 Photo Note。

先验证家族语言，再扩展到十个以上，避免同一家族只是在微调间距。

### Step 3：扩展到每个家族十个以上

每个 Recipe 必须在以下维度中形成真实差异：

- 照片数量；
- 图片比例偏好；
- 视觉密度；
- Note 能力与关系；
- 标题层级；
- 留白；
- 色彩；
- 单页或跨页 Scope；
- 节奏与阅读方向。

### Step 4：目录级验收

- 任意两个 Recipe 不应只是细小位置变化。
- 每个家族拥有清晰的视觉语法。
- Recipe 菜单可以通过照片数量、Note 能力和 Scope 筛选。
- 至少包含若干无文字 Recipe。
- 至少包含若干支持 Photo Note 的非边缘吸附 Recipe。
- 至少包含真正的跨页 Recipe。
- 多色彩 Recipe 必须保证文字可读性与照片层级。

---

## 7. 交给执行模型的首个任务

执行模型首先只处理 Phase A：通用 Recipe Renderer。

任务完成定义：

1. 使用现有 Recipe Contract 输入。
2. 用标准化 Slot 坐标渲染单页。
3. 用跨页坐标渲染 Spread。
4. Editor 与 Reader 共用同一个内容 Renderer。
5. 用两个临时 Recipe 证明新增 Recipe 不需要修改 TSX。
6. 保持现有 StPageFlip、镜头和手势逻辑不变。
7. 只进行静态测试与构建；浏览器验证由用户手动完成。

Phase A 验收后，再依次交付 Phase B、C、D、E。不要并行重写整个 Zine 系统。
