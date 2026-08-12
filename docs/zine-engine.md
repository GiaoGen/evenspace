# Zine Engine 需求规格

> 状态：Recipe Contract v1、共享 Renderer 和手动应用基础路径已进入 `main`；正式 Recipe 大规模目录、AI、Page Plan 持久化和生产后端仍未实现。
> 更新日期：2026-08-12
> 适用范围：`/zine` 创建流程、自动排版、手动排版、页面 Recipe、封面、封底与 Reader 页面计划  
> 关联文档：`docs/zine-system-handoff.md`

## 1. 文档目的

本文档定义 EventSpace Zine 后续排版引擎的产品需求与领域边界。这里的 `Recipe` 指“排版生成配方”，不是烹饪食谱，也不包含材料、份量或烹饪步骤等字段。

Recipe 用于描述：一组照片和 Photo Note 如何被选择、排序、分组、放入页面模板，并最终生成可由 Reader 消费的页面计划。

本文档同时记录当前实现与后续开发目标，不代表候选目录、AI 或生产持久化已经完成。当前 Zine 的真实完成范围仍以 `docs/zine-system-handoff.md` 和代码现状为准。

## 1.1 当前代码对照

`main` 当前已经具备：

- `/zine` 本地创建器：Name、Photos、5 种 Style，以及 AI layout 开关分出的 Overview / Arrange 路径。
- 浏览器内存中的 `ZineDraft`、`ZinePhoto`、`ZineManualSpread` 和 reducer；照片使用 `File` 与 Object URL。
- Arrange 的初始 spread 生成、左右加页、照片放置/替换、按 spread 切换现有样式，以及照片裁切焦点位置调整。
- `createZineReaderPages` 将草稿转换为封面、内容页、空白/加页页和封底；Reader 使用 `page-flip@2.0.7`，支持 spread、单页焦点镜头和手势翻页。
- Recipe Contract v1 已进入前端：`recipe-contract.ts` 提供 Definition、Validator、Compatibility、Application 和迁移；`recipe-placement.ts` 提供 placement 级 `focusX` / `focusY` / `scale`。
- `recipe-renderer.tsx` / `recipe-renderer-plan.ts` 统一 Editor、Reader 和 development-only `/zine/preview-matrix` 的 Slot、Photo Note、主题和跨页坐标渲染；单页与跨页应用、未放置照片、隐藏 Note 和 undo/redo 已接入手动排版。
- 当前有 5 个 legacy style Recipe 和 1 个 `Gutter bridge` spread Recipe 可执行；6 个 Reference Recipe 仍是 Gate fixtures，状态为 `draft`。

当前仍未实现或未完成：

- 真正的 AI 排版、正式 Recipe registry 的大规模目录、72 个候选 Recipe、Page Plan 持久化和生成任务。
- 页面删除/拖拽重排、文字页、自由图层、导出、发布、分享和重新打开。
- localStorage、IndexedDB、Supabase Auth、Storage、RLS、Realtime 或任何 Zine 后端写入。

Reference Recipe 的自动化 Validator/Compatibility/Application 测试已完成，但 `/zine/preview-matrix` 的浏览器人工视觉 Gate 尚未完成；不能仅凭代码测试把 Reference fixtures 升级为正式 `active` 目录。

因此，“AI Layout”在当前实现中只是流程分支开关；不得把 Overview 或现有样式选择器写成自动排版已完成。

如果本文档与旧交接文档在以下方面发生冲突，以本文档为准：

- 图片填充与裁切规则。
- Recipe 的含义与数据边界。
- Step 4 的分支流程。
- 自动排版和手动排版的目标能力。

## 2. 核心术语

### 2.1 Layout Type

`Layout Type` 是一类稳定的排版语言，负责定义页面的总体构图倾向和阅读节奏。首批固定为六类：

1. Hero Editorial：主视觉编辑版。
2. Contact Archive：档案索引版。
3. Wide Margin：留白画册版。
4. Diptych Dialogue：双图对话版。
5. Cut-and-Paste Collage：拼贴版。
6. Riso Spectrum：多色套印版。

### 2.2 Recipe

`Recipe` 是某一 Layout Type 下面可以实际执行的一套具体排版规则。它至少应描述：

- 可使用的页面模板。
- 每页或每个跨页所需照片数量。
- 照片横竖比例和选择条件。
- 照片槽位、层级、对齐和裁切策略。
- Photo Note 的锚点位置。
- 页面之间的密度、顺序和节奏。
- 照片数量不足或比例不匹配时的回退模板。
- 与封面、封底及视觉主题的兼容关系。

Recipe 不是单一 CSS 类，也不应等同于“每页照片数量”。同一 Layout Type 必须允许多个不同 Recipe 共同组成一本 Zine。

### 2.3 Theme

`Theme` 负责颜色、纸张色、字体层级、线条、纹理和阴影等视觉 Token。Theme 与 Layout Type 分离。

例如，现有 `night` 更适合成为深色 Theme，而不是独立 Layout Type。未来应允许形成以下组合：

- Contact Archive + Night。
- Diptych Dialogue + Riso Spectrum Theme。
- Hero Editorial + Neutral Paper。

### 2.4 Page Template

`Page Template` 是单页或跨页的结构模板，包含固定角色的内容槽位，例如：

- Cover。
- Section Opener。
- Hero Photo。
- Diptych。
- Contact Grid。
- Text / Pause。
- Colophon。
- Back Cover。

### 2.5 Page Plan

`Page Plan` 是 AI 排版或手动排版的共同输出。它是 Reader 的输入，必须独立于创建器、预览卡片和手动排版界面的 DOM。

Page Plan 至少应明确：

- 页面顺序和左右页属性。
- 每页采用的 Recipe 与 Page Template。
- 每个照片槽位对应的照片 ID。
- 裁切、缩放和焦点信息。
- 每条 Photo Note 的锚点。
- 封面、封底、Colophon 和必要的补页。

## 3. 创建流程

Zine 创建器继续保持五个主步骤，但 Step 4 根据 Step 3 的选择进入不同分支。

```text
Step 1  Name
   ↓
Step 2  Photos & Notes
   ↓
Step 3  Layout Type + AI Layout 开关
   ├─ AI Layout 已启用  → Step 4A Overview
   └─ AI Layout 未启用  → Step 4B Manual Layout
                              ↓
Step 5  Reader
```

### 3.1 Step 1：Name

- 延续现有名称输入能力。
- 名称是封面、页眉和封底模板可使用的内容源。
- 名称变化后，应让依赖标题长度的 Page Plan 重新验证，但不能丢失照片和 Photo Note。

### 3.2 Step 2：Photos & Notes

- 延续现有照片添加、删除和 Note 编辑能力。
- 每张照片保持稳定 ID，排版系统不得用 DOM 位置表示业务顺序。
- Photo Note 跟随照片进入 AI 与手动排版分支。
- 删除已被 Page Plan 使用的照片时，对应页面计划必须标记为需要重新生成或修复。

### 3.3 Step 3：Layout Type 与 AI Layout

Step 3 至少包含：

- 六种 Layout Type 的选择入口。
- 对应类型的真实页面预览，不只显示名称。
- `AI Layout` 开关。
- 当前模式会进入哪个 Step 4 分支的明确说明。

分支规则：

- 启用 `AI Layout`：继续后直接进入 Step 4A Overview。
- 未启用 `AI Layout`：继续后直接进入 Step 4B Manual Layout。
- 返回 Step 3 切换开关时，不得删除名称、照片或 Photo Note。
- 如果用户没有修改照片集合，应尽量保留两个分支各自最近一次 Page Plan。
- 如果照片被增加、删除或替换，已有 Page Plan 必须重新验证，不得静默保留失效的照片引用。

后续在 AI 分支增加一个明确的重新排版按钮。按钮名称可在 UI 设计阶段确定，暂定语义为 `Regenerate layout`。按钮不得改变原始照片、Photo Note 或用户选择的 Layout Type，只重新生成 Page Plan。

### 3.4 Step 4A：Overview（AI 排版分支）

Overview 保留现有总览职责，并扩展为 AI 排版结果的确认页：

- 显示名称、照片数量、Note 数量和 Layout Type。
- 显示 AI 选中的 Recipe 组合。
- 显示完整页面或跨页缩略预览，而不只是照片集合摘要。
- 能返回 Name、Photos 和 Layout Type 修改。
- 后续提供 `Regenerate layout`。
- AI 结果不满意时，未来可以提供“转为手动排版”的入口；该入口应以当前 AI Page Plan 作为手动排版起点，而不是清空重做。
- 通过确认后进入 Step 5 Reader。

### 3.5 Step 4B：Manual Layout（手动排版分支）

手动排版和 AI 排版必须生成同一种 Page Plan。手动模式的目标能力包括：

- 查看按阅读顺序排列的页面或跨页列表。
- 拖动调整照片和页面顺序。
- 为单页或跨页切换兼容的 Recipe。
- 把照片放入 Recipe 提供的槽位。
- 调整照片在槽位中的缩放、位置和视觉焦点。
- 在不脱离照片的前提下调整 Photo Note 的允许锚点。
- 显示照片未分配、重复分配或页面不完整等错误。
- 自动补齐维持封面、完整跨页和单张封底所需的页面。
- 进入 Reader 前执行 Page Plan 校验。

手动排版不应直接操作 StPageFlip 创建的 DOM。它只编辑 Page Plan，由统一页面渲染器产生预览和 Reader 页面。

### 3.6 Step 5：Reader

- AI 与手动分支最终进入同一个 Reader。
- Reader 只消费通过校验的 Page Plan。
- 继续保留现有 StPageFlip 的 DOM 所有权隔离、翻页状态和手势状态机。
- Preview、Manual Layout 和 Reader 必须使用同一套页面模板语义，避免预览与成品漂移。

## 4. Recipe 数量与目录

每个 Layout Type 首批设计 12 个 Recipe，共 72 个。下面是首批候选目录；名称和视觉细节可以在设计阶段调整，但每类不得少于 10 个可用 Recipe。

### 4.1 Hero Editorial：主视觉编辑版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `hero-right` | Right Anchor | 单张主图靠外侧右边，标题和 Note 位于左侧呼吸区。 |
| `hero-left` | Left Anchor | `hero-right` 的镜像版本，根据页面侧自动避开书脊。 |
| `hero-top` | High Horizon | 图片占据页面上部，标题和短 Note 位于下方。 |
| `hero-bottom` | Low Horizon | 图片占据页面下部，上方保留强标题区。 |
| `hero-title-over` | Title Over Image | 标题覆盖在图片安全区域，需通过对比度校验。 |
| `hero-full-bleed` | Full Bleed Statement | 图片铺满页面，文字使用边缘色块或高对比标签。 |
| `hero-inset-poster` | Inset Poster | 大型满框照片槽位嵌入海报式标题框架。 |
| `hero-portrait-column` | Portrait Column | 竖图占主列，标题和 Note 形成窄侧列。 |
| `hero-panorama-band` | Panorama Band | 横图满宽裁切为横向带状主视觉。 |
| `hero-caption-led` | Caption Led | Note 成为主要文字元素，照片为次级但仍满框。 |
| `hero-opening` | Opening Anchor | 用于封面之后的第一张锚点页，标题层级最大。 |
| `hero-finale` | Closing Anchor | 用于结尾前的最后一张主图，减少页眉信息并形成收束。 |

### 4.2 Contact Archive：档案索引版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `contact-2x2` | Classic 2×2 | 四个等尺寸槽位，适合混合横竖图的统一裁切。 |
| `contact-three` | Three Frame | 一大两小，优先把锚点照片放入大槽位。 |
| `contact-six` | Six Index | 2×3 网格，使用编号和短 Note。 |
| `contact-eight` | Eight Index | 高密度八图索引页，只允许短 Note 或编号。 |
| `contact-mixed` | Mixed Matrix | 大小混合的模块网格，但所有边线仍对齐基础网格。 |
| `contact-filmstrip` | Film Strip | 单列或双列连续小图，强调时间顺序。 |
| `contact-timeline` | Timeline Index | 图像沿时间轴排列，适合有明确先后关系的照片。 |
| `contact-portrait` | Portrait Matrix | 针对多数竖图优化的窄列矩阵。 |
| `contact-landscape` | Landscape Matrix | 针对多数横图优化的横向条带矩阵。 |
| `contact-numbered` | Numbered Catalogue | 图像、序号和 Note 形成可检索档案结构。 |
| `contact-note-led` | Notes Catalogue | Note 较多时扩大文字区，图像仍保持完整满框槽位。 |
| `contact-summary` | Closing Contact | 用于结尾回顾的缩略图汇总页，不重复更改原始照片顺序。 |

### 4.3 Wide Margin：留白画册版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `margin-center` | Quiet Center | 小型照片框居中，页面留白围绕照片框存在。 |
| `margin-outer` | Outer Edge | 照片靠页面外侧，Note 吸附外角。 |
| `margin-inner-counter` | Inner Counterpoint | 图片接近书脊但不越过安全区，文字在外侧平衡。 |
| `margin-top` | Top Float | 照片框位于页面上方，底部形成大面积停顿。 |
| `margin-bottom` | Bottom Float | 照片框位于页面下方，上部保留标题或空白。 |
| `margin-portrait` | Portrait Study | 竖图使用高窄满框槽位和宽外边距。 |
| `margin-landscape` | Landscape Study | 横图使用矮宽满框槽位和上下留白。 |
| `margin-square` | Square Study | 正方形照片框配极简编号与 Note。 |
| `margin-opposite` | Opposite Corners | 一个跨页中的两张图分别靠两个外角。 |
| `margin-caption` | Long Note | 为较长 Photo Note 提供独立文字区，但 Note 仍与照片锚定。 |
| `margin-pause` | Visual Pause | 单张小图或纯文字停顿页，用于控制阅读节奏。 |
| `margin-finale` | Quiet Finale | 结尾前使用更小照片框与更大留白形成收束。 |

注意：Wide Margin 允许照片框之外存在有意设计的页面留白，但照片框内部不得出现白边、黑边或其他未填充区域。

### 4.4 Diptych Dialogue：双图对话版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `diptych-equal-vertical` | Equal Vertical | 两张竖向等权照片并列。 |
| `diptych-equal-horizontal` | Equal Horizontal | 两张横图上下排列或跨页对置。 |
| `diptych-major-minor` | Major / Minor | 一张主图配一张细节图。 |
| `diptych-minor-major` | Minor / Major | 上一 Recipe 的镜像节奏版本。 |
| `diptych-mirror` | Mirror Pair | 使用构图或方向相互呼应的图片。 |
| `diptych-before-after` | Before / After | 按业务顺序固定左右或上下关系。 |
| `diptych-detail-context` | Detail / Context | 细节图与环境图组成语义对话。 |
| `diptych-portrait-landscape` | Mixed Orientation | 为一竖一横提供不等尺寸但平衡的槽位。 |
| `diptych-top-bottom` | Top / Bottom | 同页上下两图，Note 分别吸附各自外角。 |
| `diptych-staggered` | Staggered Pair | 两图错位但保持统一网格和书脊安全区。 |
| `diptych-caption-bridge` | Caption Bridge | 两条 Note 在跨页中形成连续阅读关系。 |
| `diptych-finale` | Closing Pair | 用一对强关联图片结束主体内容。 |

### 4.5 Cut-and-Paste Collage：拼贴版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `collage-torn-stack` | Torn Stack | 三至五张照片以纸片堆叠方式排列。 |
| `collage-diagonal` | Diagonal Rush | 元素沿对角线推进，保留明确的视觉起点和终点。 |
| `collage-sticker` | Sticker Notes | 图片与 Note 使用贴纸标签语言，Note 仍绑定照片。 |
| `collage-edge-bleed` | Edge Bleed | 多个照片框触及页面边缘，禁止框内留边。 |
| `collage-polaroid-cloud` | Snapshot Cloud | 快照式模块聚集，但照片内容使用满框裁切。 |
| `collage-type-clash` | Type Clash | 大字号文字与图片交错，必须保证 Note 可读。 |
| `collage-tape-board` | Tape Board | 使用胶带和纸张纹理建立固定层级。 |
| `collage-spiral` | Spiral Sequence | 图片沿螺旋路径排列，适合四至六张图片。 |
| `collage-dense-center` | Dense Center | 视觉重量集中在页面中心，外缘放置 Note。 |
| `collage-four-corners` | Four Corners | 图片分布于四角，通过中心文字连接。 |
| `collage-zigzag` | Zigzag Story | 图片按 Z 形阅读路径排列，顺序必须写入 Page Plan。 |
| `collage-finale-burst` | Finale Burst | 高密度结尾页，作为正文结束前的能量峰值。 |

拼贴 Recipe 可以产生重叠和受控旋转，但必须限制旋转范围、层级数量、最小可见面积和书脊安全区，不能使用完全随机坐标。

### 4.6 Riso Spectrum：多色套印版

| Recipe ID | 名称 | 构图与使用规则 |
| --- | --- | --- |
| `riso-two-ink` | Two Ink Alternating | 两种高对比颜色按页面交替成为主色。 |
| `riso-three-layer` | Three Layer Overprint | 三色图层叠印，允许受控透明混色。 |
| `riso-four-spectrum` | Four Colour Spectrum | 四种亮色在连续跨页中轮换。 |
| `riso-color-block-grid` | Colour Block Grid | Contact 网格与多色背景块结合。 |
| `riso-duotone-portrait` | Duotone Portrait | 人像转换为双色调，Note 使用第三强调色。 |
| `riso-cmyk-drift` | CMYK Drift | 模拟有限错版效果，但文字不得发生影响可读性的偏移。 |
| `riso-neon-night` | Neon Night | 深色纸张感搭配荧光色块和浅色文字。 |
| `riso-primary-checker` | Primary Checker | 红、黄、蓝模块按棋盘节奏组织多张图片。 |
| `riso-pastel-overprint` | Pastel Overprint | 低饱和底色与局部叠色，适合安静照片。 |
| `riso-colour-bands` | Colour Bands | 使用彩色横带或竖带组织一至三张照片。 |
| `riso-split-ink` | Split Ink Spread | 一个跨页左右使用不同主墨色，中间通过共享元素连接。 |
| `riso-spectrum-finale` | Spectrum Finale | 汇总整本使用过的颜色，形成结尾高峰。 |

Riso Spectrum 是首批必须具备的多色类型。它应使用受限色组和稳定的颜色轮换规则，不允许每页随机生成无关联颜色。

## 5. Recipe 编排要求

一本 Zine 不应从第一页到最后一页重复同一个 Recipe。排版引擎需要从所选 Layout Type 的 Recipe 集合中生成有节奏的组合。

### 5.1 基本节奏

- 开头必须包含封面和至少一个 Opening Recipe。
- 正文允许在低密度、中密度和高密度页面之间变化。
- 连续三个页面不应默认使用完全相同的 Recipe；如果照片数量或用户手动选择要求重复，则允许例外。
- 重要照片应成为 Anchor，不得全部被分配到同等权重的小槽位。
- 结尾应使用 Finale、Pause、Summary 或 Colophon 形成明确收束。
- 自动加入的补页必须有设计目的，不得表现为渲染失败的空白页面。

### 5.2 Recipe 选择输入

AI 或规则引擎选择 Recipe 时至少可以使用以下输入：

- 照片数量。
- 照片宽高比。
- 照片原始顺序和未来可能提供的拍摄时间。
- Photo Note 是否存在及其长度。
- 用户选择的 Layout Type。
- 当前页面是左页、右页、跨页、开篇还是结尾。
- 前后页面已经使用的 Recipe 与视觉密度。

首期不要求依赖外部生成式 AI。可以先使用确定性规则实现 `AI Layout` 的产品行为，但 Page Plan 和 Recipe 数据结构不得绑定某个具体 AI 服务。

### 5.3 回退与容错

- Recipe 所需照片数量不足时，必须切换到声明过的回退 Recipe。
- 不允许复制同一照片来填满空槽位，除非用户明确选择重复。
- 不允许保留空照片框进入 Reader。
- Photo Note 过长时，应切换到兼容长 Note 的 Recipe、调整字号或转移到相邻文字区，不得无提示截断重要内容。
- 无 Note 时不显示空标签、占位符或文件名，除非某一 Recipe 明确要求以文件名作为档案信息。

## 6. 封面、封底与书脊模板

封面和封底不再只有一个固定样式。它们应作为独立模板族，由 Page Plan 引用，并与正文 Layout Type 和 Theme 兼容。

### 6.1 首批封面模板

首批至少设计以下六个封面模板：

1. `cover-type-only`：纯标题与编号，无照片。
2. `cover-full-photo`：单张满版照片与高对比标题。
3. `cover-inset-photo`：内嵌满框照片槽位和大面积纸张色。
4. `cover-contact`：四张照片组成索引式封面。
5. `cover-collage`：受控拼贴和贴纸式标题。
6. `cover-riso-spectrum`：多色块、套印纹理和主标题。

### 6.2 首批封底模板

首批至少设计以下六个封底模板：

1. `back-mark`：EventSpace 标记、Zine 名称和极简制作信息。
2. `back-photo-echo`：使用正文最后一张照片或其色彩回声。
3. `back-contact-summary`：使用正文照片的缩略索引。
4. `back-colophon`：以制作信息和短结语为主。
5. `back-colour-field`：使用与正文一致的整页颜色或纹理。
6. `back-minimal-number`：仅保留编号、日期和小型标记。

### 6.3 书脊边界

用户需求中的“书背”在当前数字 Reader 阶段按“封底”处理。真正的印刷书脊依赖页数、纸张厚度、装订方式和导出规格，等未来加入印刷/PDF 输出时再作为独立物理表面设计。

如果后续确认“书背”指印刷书脊，则必须新增：

- 书脊宽度计算。
- 标题和标记的旋转与安全边距。
- 封面、书脊、封底连续展开面的预览。
- 印刷出血和裁切线规则。

## 7. 图片必须填满照片框

### 7.1 强制规则

- 任何照片框内部都不允许出现因为宽高比不一致造成的白边、黑边、纸张色边或透明空隙。
- 页面留白可以存在，但必须位于照片框之外，并且是 Recipe 有意定义的布局空间。
- 默认使用等价于 `cover` 的填充策略，不再以 `contain` 作为 Reader 照片框的默认规则。
- 不允许通过拉伸或压缩改变照片原始比例。
- 图片填充规则同时适用于 Style Preview、Overview、Manual Layout 和 Reader。

这条需求明确覆盖 `docs/zine-system-handoff.md` 中“图片始终展示完整比例、不裁切”的旧约束。

### 7.2 裁切与焦点

- 自动排版应根据照片宽高比选择最合适的槽位，尽量减少关键内容被裁掉。
- 在没有视觉分析能力时，默认焦点为图片中心，但模型必须支持保存独立焦点。
- 手动排版必须允许用户在照片框内平移和缩放图片。
- 手动调整结果应写入 Page Plan，Reader 不得重新计算并覆盖用户裁切。
- 未来可以增加人脸或主体安全区识别，但不是首期硬依赖。

## 8. Photo Note 外角吸附

### 8.1 Note 来源说明

当前创建流程中，Photo Note 位于 Step 2 Photos。用户新增需求写作“Step 3 添加的 Photos Note”，本文档暂按“在 Photos 步骤填写、在 Step 3 之后的排版结果中使用”解释。

如果后续决定把 Note 输入移动到 Step 3，应另行调整流程；本次需求不主动改变现有 Note 的输入步骤。

### 8.2 锚点规则

- Photo Note 必须绑定照片 ID 和具体照片槽位，不能只绑定页面坐标。
- Note 默认吸附在照片框靠页面外侧的角落。
- 左页的外侧为左边，右页的外侧为右边。
- 默认优先使用“下方外角”；空间不足或发生碰撞时可回退到“上方外角”。
- Note 应随照片移动、换槽位、换 Recipe 或重新排版而移动。
- Note 与照片之间的距离、对齐线和最大宽度由 Recipe 定义。
- 没有填写 Note 的照片不显示空白 Note 容器。

### 8.3 多照片页面

- Contact、Diptych 和 Collage 页面中的每张照片都可以拥有自己的 Note。
- 多个 Note 发生碰撞时，优先在同一照片的允许外角之间切换。
- 如果仍无法解决，应换用更适合 Note 密度的 Recipe，不得让文字彼此覆盖。
- Collage 中照片发生旋转时，Note 默认保持页面文字方向，不跟随照片旋转影响可读性，但锚点仍跟随照片外角。
- Note 不得跨越书脊，也不得落入翻页裁切或安全区域之外。

## 9. 引擎职责与模块边界

后续实现时应保持以下职责分离：

1. `Recipe Registry`：保存 Layout Type、Recipe、Page Template 和回退关系。
2. `Planner`：根据照片、Note、用户选择和节奏规则生成 Page Plan。
3. `Manual Editor`：编辑同一种 Page Plan，不创建另一套专用页面数据。
4. `Validator`：检查空槽位、失效照片、Note 碰撞、跨页完整性和封底位置。
5. `Page Renderer`：把 Page Plan 渲染为 Preview、Overview、Manual Layout 和 Reader 使用的页面。
6. `Reader Adapter`：继续负责把页面交给 StPageFlip，不参与 Recipe 决策。

不允许出现以下耦合：

- 通过 CSS Grid 或 DOM 顺序隐式保存照片顺序。
- Recipe 直接操作 React 或 StPageFlip DOM。
- Preview 和 Reader 各自维护一份不一致的 Recipe 结构。
- AI 分支和手动分支产生两种无法互转的数据模型。
- Theme 同时承担页面结构选择。

## 10. 状态与失效规则

- `Name`、照片、Photo Note、Layout Type、AI Layout 开关和 Page Plan 是不同状态维度。
- 修改名称只使依赖标题尺寸的页面需要重新验证。
- 修改 Photo Note 只使相关 Note 布局需要重新验证。
- 增加或删除照片会使照片分配和页数重新验证。
- 修改 Layout Type 会使正文 Recipe 组合失效，但不删除照片和 Note。
- 修改 Theme 不应改变照片顺序和 Recipe，除非新 Theme 与某 Recipe 明确不兼容。
- 手动裁切、顺序和 Recipe 选择属于用户编辑结果，不得被普通预览刷新覆盖。
- 刷新页面后的持久化仍属于未来范围；本需求不把尚未实现的持久化描述为现有能力。

## 11. 验收标准

完成 Zine Engine 的相应阶段时，至少满足：

### 11.1 Recipe

- 六个 Layout Type 均有不少于 10 个可实际渲染的 Recipe。
- 首批目标为每类 12 个，共 72 个。
- Recipe 有明确的照片数量、槽位、Note、回退和节奏规则。
- 同一本 Zine 可以使用同一 Layout Type 下的多个 Recipe。

### 11.2 分支流程

- Step 3 启用 AI Layout 后进入 Overview。
- Step 3 未启用 AI Layout 后进入 Manual Layout。
- 两个分支都能进入同一个 Reader。
- 在分支之间切换不会丢失名称、照片和 Photo Note。
- 两个分支最终产生相同结构的 Page Plan。

### 11.3 图片

- 所有照片框在 Preview、Overview、Manual Layout 和 Reader 中都被图片完全填满。
- 不出现 letterbox 或 pillarbox 留边。
- 图片不变形。
- 手动裁切和焦点在 Reader 中保持一致。

### 11.4 Photo Note

- Note 出现在对应照片的页面外侧角落。
- 翻到左右页时，Note 的外侧方向正确。
- 多图页面中的 Note 不互相覆盖。
- 无 Note 时不显示空容器。

### 11.5 封面与封底

- 至少有多个可选择的封面和封底模板。
- 首批目标为六个封面和六个封底模板。
- 封面和封底能继承正文 Theme，但不被限制为正文 Recipe。
- 封底保持整本书的最后一个单页表面。

### 11.6 架构

- Reader 不读取创建器或手动排版界面的 DOM。
- StPageFlip 继续只接管隔离后的命令式 DOM。
- 页面顺序、照片分配、裁切和 Note 锚点全部存在于数据模型中。
- Preview 与 Reader 不出现结构性排版差异。

## 12. 尚待确认的产品决策

以下问题不阻塞本需求文档成立，但应在进入实现前确认：

1. `AI Layout` 首期是否允许用确定性规则实现，还是必须调用生成式 AI 服务。
2. AI Layout 开关的默认状态是启用还是关闭。
3. Overview 中 `Regenerate layout` 的位置、次数限制和加载反馈。
4. Manual Layout 首期是否允许新增、删除纯文字页和视觉停顿页。
5. 用户所说“书背”最终是封底，还是未来印刷文件中的实体书脊。
6. Photo Note 是否继续在 Step 2 输入，还是未来移动到 Step 3。
7. 封面和封底是由 AI 自动选择、用户手动选择，还是两者都支持。

## 13. 设计依据

- Adobe InDesign Layout Grids：网格、栏、边距和页面级布局控制。  
  <https://helpx.adobe.com/indesign/desktop/layout-and-grid-tools/grids/create-customize-layout-grids.html>
- Adobe InDesign Parent Pages：可复用页面模板、占位框和统一更新。  
  <https://helpx.adobe.com/indesign/desktop/create-and-organize-pages/create-and-manage-parent-pages/about-parent-pages.html>
- Adobe InDesign Object Styles：框架、颜色、透明度和样式继承。  
  <https://helpx.adobe.com/indesign/desktop/add-graphics-and-media/manage-object-styles/define-and-apply-object-styles.html>
- Blurb Zine Layout Guide：网格、留白、序列、节奏和锚点图片。  
  <https://www.blurb.com/blog/zine-layouts-dos-and-donts/>
- People of Print Riso Projects：有限色组、逐色叠印和多色 Riso 实例。  
  <https://peopleofprint.com/best-of/pop-member-showcase-15-riso-projects/>
