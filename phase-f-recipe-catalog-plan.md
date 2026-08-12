# Phase F：正式 Recipe Catalog 设计与落地计划书

> 状态：F0/F1、F0.5、F0.6 与 F2/F2.1 已完成；用户于 2026-08-13 批准 F2-D01 至 F2-D18，下一门禁为 F3-A Anchor 设计审批  
> 前置条件：Recipe Contract v1、通用 Renderer、Placement、Photo Note、兼容性/撤销、Preview Matrix 与 Reference Recipe Gate 已完成。  
> 当前静态基线（2026-08-13）：TypeScript、零警告 ESLint、244 项测试与 Next.js 生产构建通过。  
> 执行分工：Sol 负责视觉体系、Anchor 与独立审计；Luna 负责获批规格的数据实现。所有浏览器视觉验证仍由用户手动完成。  
> 本阶段范围：正式内页 Recipe Catalog。封面、封底和书背将在后续独立 Contract 中处理。

---

## 1. 阶段目标

建立一套具有明确审美语言、内容适配能力和长期扩展性的正式内页 Recipe Catalog。

首批目录锁定五个排版家族，每个家族设计 **12 个 Recipe**，总计 **60 个候选 Recipe**。任何情况下，每个家族最终通过验收的 Recipe 不得少于 11 个，以满足“十个以上”的要求。

五个首批家族：

1. `editorial`：叙事编辑、摄影杂志与图文层级。
2. `grid-contact`：网格、Contact Sheet、索引与档案秩序。
3. `quiet`：大留白、艺术书、单图凝视与克制节奏。
4. `dynamic`：不对称切分、视觉张力、速度与方向性。
5. `chromatic`：多色彩、色块组织、强层级与受控对比。

本阶段完成后应达到：

- 新增普通 Recipe 主要是新增数据，不需要为每个 Recipe 编写专用 JSX/CSS 分支。
- 每个家族拥有可辨识的视觉语法，而不是同一套模板更换名称或颜色。
- 任意两个正式 Recipe 都能说明结构差异和适用场景。
- Recipe 在真实照片比例、照片数量、Note 状态和页面侧别变化下仍然可用。
- 所有照片框始终以 `cover` 填满，不出现未填充留边。
- 普通 Recipe 只作用当前单页；只有真正不可拆分的跨页 Recipe 才作用整个 spread。
- Photo Note 始终与照片保持数据绑定；Recipe 只决定是否展示及如何表现关系。
- Reader 与 Editor 使用同一 Renderer，并产生一致的内容版面。
- AI 排版管道只预留可检索的 Recipe 元数据，本阶段不实现 AI 或后端。

---

## 2. 非目标与禁止事项

Phase F 不包含：

- 后端、数据库、远程 Recipe 发布或多人协作。
- AI 自动选图、自动排序或自动生成 Recipe。
- 封面、封底、书背模板的正式实现。
- 重写 StPageFlip、单页镜头、手势或 Reader 导航逻辑。
- 为了某个普通 Recipe 私自增加专用 Renderer 分支。
- 将 Reference Recipe 直接改名后当作正式 Catalog。
- 未经用户批准批量将候选项设为 `active`。
- 执行模型擅自启动开发服务器、打开浏览器或进行浏览器自动化验证。

如果现有 Contract 无法表达某个设计，执行者必须先提交一份 `Contract Gap Report`，说明：

1. 无法表达的视觉能力。
2. 为什么不能用现有 Slot、Theme、Note Relation 和 Scope 完成。
3. 对全部 Recipe、Editor、Reader、迁移和测试的影响。
4. 最小的向后兼容扩展方案。

在获得用户批准前，不得修改 Contract 或 Renderer 来迁就单个设计。

---

## 3. 强制联网研究规则

正式设计 Recipe 前，执行模型 **必须联网研究** 摄影书、艺术书、zine、杂志编辑和专业排版案例。研究的目的不是复制成品，而是提炼可迁移的排版原则。

### 3.1 来源层级

优先级从高到低：

1. 专业出版与设计工具官方资料：Adobe InDesign、Adobe Design/Creative Cloud。
2. 摄影书与艺术出版机构：Aperture、摄影节/摄影书奖、艺术书出版社、博物馆出版物。
3. 专业摄影与编辑平台：Magnum Photos、LensCulture、British Journal of Photography 等。
4. 艺术书与 zine 档案/发行平台：Printed Matter、独立出版社和专业印刷机构。
5. 作品案例平台：Behance 等；只能作为案例观察，不得成为唯一理论来源。

不得把 Pinterest、无作者模板聚合页、SEO 模板农场或纯营销列表当作主要设计依据。

可作为研究起点的资料包括：

- [Adobe InDesign Page Layout](https://www.adobe.com/products/indesign/page-layouts.html)
- [Adobe：Grid 与 Typography](https://www.adobe.com/creativecloud/design/discover/newsletter-design-software.html)
- [Aperture：How Not to Design a Photobook](https://aperture.org/editorial/design-photobook/)
- [Aperture：Design Books to Know](https://aperture.org/editorial/design-books-know/)
- [Behance：Photo Zine Editorial Design](https://www.behance.net/search/projects/photo%20zine%20editorial%20design)

执行时应继续搜索当时可访问的最新和高质量资料，不能只阅读上述五个入口。

### 3.2 研究规模

在进入 Family Bible 前，至少完成：

- 25 个可追溯的作品或专业资料条目。
- 至少来自 5 个不同网站或出版机构。
- Adobe 与 Aperture 各至少 2 条。
- 每个排版家族至少关联 4 条参考，其中至少来自 3 个不同域名。
- 单一作品最多为 2 个 Recipe 提供原则，防止整个目录向一个项目靠拢。

### 3.3 Research Dossier 字段

每条研究记录必须包含：

- 标题、发布者/作者、直接 URL、访问日期。
- 所属类别：摄影书、艺术书、zine、编辑设计、网格、字体或色彩。
- 观察到的排版原则，而不是“看起来很好看”。
- 可迁移的结构：节奏、比例、留白、序列、层级、图文关系或色彩逻辑。
- 不应复制的独特识别元素。
- 可影响的家族和候选 Recipe。
- 对当前 `3:4` 单页、`3:2` spread 和 Recipe Contract 的适配判断。

### 3.4 原创性与版权边界

- 不下载或复用来源网站的照片、纹理、字体文件和品牌素材作为产品资产。
- 不逐坐标临摹某一本书的独特页面。
- 一个 Recipe 至少组合两类原则，或对原则进行适合本系统的明显转化。
- Recipe 的名称不得冒用来源作品、设计师、出版社或商标。
- Research Dossier 保留来源链接；运行时 Catalog 不展示“仿某某作品”的描述。

---

## 4. Phase F 的交付结构

建议建立以下文档，全部使用 UTF-8 Markdown：

```text
docs/recipe-catalog/
  constraint-summary.md
  research-dossier.md
  contract-gap-report.md
  contract-v1.1-implementation-record.md
  recipe-design-playbook.md
  family-bibles.md
  anchor-recipe-briefs.md
  recipe-catalog-index.md
  recipe-difference-matrix.md
  recipe-usability-matrix.md
  recipe-review-log.md
```

F2–F5 的具体设计批次、模型分工、来源使用、Recipe Brief、压力状态、评分与淘汰流程，以 `docs/recipe-catalog/recipe-design-playbook.md` 为执行标准；若与本计划冲突，以本计划的阶段边界、Contract Gate、数量目标与用户裁决为准。

代码实现开始后，再在现有 zine model/component 结构内增加正式 Definition；不要提前假设必须新建 Renderer 组件。

所有正式候选在用户批准前保持：

```text
status: "draft"
```

`active` 只能发生在用户完成手动视觉验收之后。

---

## 5. Phase F0：系统约束复核

### 任务

执行模型首先完整阅读：

- `zine-engine.md`
- `docs/zine-engine.md`
- `recipe-design-readiness-plan.md`
- `features/zine/model/recipe-contract.ts`
- 当前 Reference Recipe Definitions、Matrix 和测试。

建立一页 `Constraint Summary`，至少确认：

- 单页 `3:4`、标准跨页 `3:2`。
- 跨页是浏览单位，普通 Recipe 默认是单页作用域。
- `page` Recipe 不得修改配对页。
- `spread` 必须具有不可拆分的跨页构图事实。
- 照片框 `cover` 满框。
- Photo Note 通过 `photoId` 绑定，不等于边缘吸附。
- Note 是纯文字，无卡片背景、胶囊或阴影。
- 不支持 Note 的 Recipe 隐藏而不删除 Note。
- Placement 独立保存焦点和裁切。
- 超额照片进入 `unplacedPhotoIds`。
- Editor/Reader 共用 Renderer。

### Gate F0

约束总结与现有 Contract 不一致时停止设计并报告，不允许自行选择一个解释继续。

---

## 6. Phase F1：Research Dossier

### 任务

按第 3 节完成联网研究，并提取以下可执行原则：

- 网格与基线系统。
- 图片之间的尺度关系和冲突规避。
- 单图凝视、图片配对和摄影序列。
- 留白如何改变观看速度。
- 出血图片与框内图片的节奏交替。
- 标题、页码、静态文字与 Photo Note 的层级。
- 多色彩背景下照片和文字的可读性。
- 书脊附近主体、文字和色块的风险。
- 数字单页视角与实体跨页构图之间的兼容。

Adobe 的资料可用于网格、对齐和字体层级；Aperture 的资料应重点用于摄影编辑、图片配对、尺度和 sequencing。两者不能互相替代。

### Gate F1

- 来源数量和域名满足第 3.2 节。
- 每条来源均有直接链接和具体观察。
- 每个家族已有足够证据形成不同视觉语言。
- 不存在整页临摹计划。

Gate 通过前，不设计 60 个 Recipe。

---

## 7. Phase F0.5：Contract Gap Report

### 7.1 目的与边界

F0 已发现现有 Contract 与正式 Catalog 目标之间存在差异；F1 已完成研究证据归档。正式进入 Family Bible 和 Anchor Recipe 前，必须先决定哪些能力属于核心 Recipe Contract、哪些属于独立 Catalog Metadata、哪些只是派生语义或作者规范。

本阶段只编写：

```text
docs/recipe-catalog/contract-gap-report.md
```

本阶段明确禁止：

- 设计任何正式 Recipe、Anchor 坐标或 60 项目录。
- 修改 TypeScript、TSX、CSS、测试或 Renderer。
- 将任何候选注册为 `draft` 或 `active`。
- 启动开发服务器、打开浏览器或执行浏览器自动化。
- 因为某个想象中的 Recipe 而引入任意 CSS、任意插件系统或通用画布语言。

由于本阶段只有文档变更，不要求运行项目测试；执行者应进行 Markdown、链接、路径和 `git diff --check` 等静态检查，并明确报告“未运行代码测试”的原因。

### 7.2 必须复核的材料

执行模型必须完整阅读：

- 本计划书。
- `docs/recipe-catalog/constraint-summary.md`。
- `docs/recipe-catalog/research-dossier.md`。
- `zine-engine.md` 与 `docs/zine-engine.md`。
- `features/zine/model/recipe-contract.ts`。
- `features/zine/components/recipe-renderer.tsx`。
- `features/zine/components/recipe-renderer-plan.ts`。
- Reference Recipe Definitions、Preview Matrix 及相关测试。

报告引用现状时必须提供具体文件和字段证据，不能只复述 F0 的结论。

### 7.3 六个必须裁决的 Gap

#### GAP-F0-01：`3:2` spread 的数据语义

默认判断：这很可能是**派生语义，而不是必须新增的存储字段**。当前单页为 `3:4`，两张等宽 `3:4` 单页并列后，物理 spread 自然为 `3:2`；统一 spread 坐标 `x=0..2`、`y=0..1` 也与此一致。

报告必须：

- 区分“单页固有比例”“spread 派生比例”和“统一标准化坐标”。
- 判断是否存在必须把 `spreadRatio` 写入 Definition 的真实运行时用例。
- 比较“派生、不存储”与“显式重复存储”的一致性风险。
- 推荐最小方案和 Validator/测试断言。
- 若建议新增字段，必须证明它不是可从 `pageRatio + scope` 唯一推导的冗余数据。

不得仅因为文档写了 `3:2` 就机械增加第二个比例字段。

#### GAP-F0-02：spread 的不可拆分结构证据

这是正式 Recipe 设计前的**核心阻断项**。`scope: "spread"` 不能只依赖名称、描述或双页预览。

报告必须比较并裁决哪些结构事实足以成为 spread：

- 照片、色域或其他受控 Slot 真正跨越中心线。
- `cross-page-pair` 等左右页之间的明确内容关系。
- 左右页面由同一个受控组合/关系共同决定，拆成两个 page Recipe 会丢失语义。
- 仅仅左右两页共享 Theme、网格或视觉平衡是否足够——默认不应足够。

建议给出机器可验证的 `spread evidence` 规则，而不是只增加一个作者可随意填写的布尔值。若确实需要新的语义字段，字段必须与至少一个可验证结构事实互相校验。

报告至少给出以下反例测试：

- `scope: spread`，但所有 Slot 都只在左页，应拒绝。
- `scope: spread`，左右页各有独立 Slot、没有跨页关系，应拒绝或要求改写为两个 page Recipe。
- 有真正跨书脊照片，应接受。
- 照片在左页、绑定 Note 在右页且 relation 为 `cross-page-pair`，应接受。
- 未来有受控色域跨越中心线时，应能成为有效证据，但不能提前以任意 CSS 实现。

#### GAP-F0-03：Catalog/Authoring Metadata 不完整

默认判断：目录检索、AI 选择、差异性评分和 Preview 标签不属于运行时几何 Contract 的核心职责，应建立独立、版本化的 `RecipeCatalogEntry` 或等价 schema，并通过 `recipeId + recipeVersion` 引用 Definition。

报告必须提出最小结构化字段，至少覆盖：

- 家族、照片数范围、比例偏好与风险比例。
- 视觉密度、阅读节奏、构图主轴和 Slot topology。
- Note 能力/关系、Scope、Bleed pattern。
- 色彩策略、Typography role 摘要。
- 主体靠边/书脊风险。
- Fingerprint、差异性比较所需字段。
- `draft/active/deprecated` 的唯一权威位置，避免 Definition 与 Catalog 状态冲突。
- Preview/筛选标签与 AI 管道所需的确定性标签。

报告还必须说明哪些字段可从 Definition 推导、哪些必须由作者声明；可推导字段不得无理由重复存储。

#### GAP-F0-04：`legacyStyleId` 仍为必填

默认判断：新正式 Recipe 不应伪造或复用旧 Style 语义。兼容映射应变为可选，并且旧草稿、现有 legacy Recipe 与 `getRecipeDefinitionByLegacyStyleId` 路径不能回归。

报告必须比较：

- `legacyStyleId?: ZineStyleId`。
- 独立的 `legacy?: { styleId: ZineStyleId }` 兼容对象。
- 将映射完全移出 Definition 的迁移成本。

推荐方案必须包含向后兼容、旧数据读取、作者 API 和测试策略。不能一次性删除 legacy 路径。

#### GAP-F0-05：真正的多色彩结构无法充分表达

这是 Chromatic 家族的**核心阻断项**。当前 `RecipeTheme` 只提供页面级 `background/foreground/muted/photoBackground`；现有 Reference color fixture 更接近“单一页面底色 + 文字/占位色”，不足以表达功能性多色彩版面。

报告必须为以下能力提出最小、受控、数据驱动的表达：

- 页面内分区色域。
- 节奏色块与强调色。
- 可跨中心线的受控色域。
- 不同色域上的前景文字对比。
- 色域与照片、Note、静态文字的明确 z-index。

优先研究 `region` / `color-field` Slot 与受控 Theme Token 的组合。必须明确拒绝：

- Recipe 携带任意 CSS 字符串、className 或组件名。
- 为每个 Chromatic Recipe 编写专用 TSX/CSS 分支。
- 用换页面背景色冒充新的多色彩 Recipe。
- 在没有可验证对比规则时允许任意文字/背景组合。

报告需要定义颜色 token、合法引用、区域几何、跨页行为、对比度验证边界和 Renderer 最小影响。若自动对比度只能作为初筛，必须保留用户视觉 Gate。

#### GAP-F0-06：Typography Role 表达不足

这是 Editorial、Grid/Contact 与 Chromatic 家族的高优先级缺口。当前 static text 与 Note 的视觉角色过于统一，无法稳定表达标题、索引、页码、标签和 Photo Note 的职责差异。

报告必须提出有限、语义化、可由 Renderer 统一处理的角色集合，至少评估：

- `title`
- `deck`
- `label`
- `folio`
- `caption`
- `note`
- `index`

必须说明：

- Role 属于 Slot、Theme token 还是两者组合。
- 字号、行高、字重、字距、大小写和对齐可以开放到什么程度。
- 如何避免任意字体/CSS 导致 Catalog 失控。
- Note 仍然是纯文字且保持 `photoId` 绑定。
- 长 Note、最小可读字号、单页聚焦视角和 Reader 的验证方式。
- 反色文字如何与 Color Region 协同而不复制样式字段。

### 7.4 报告对每个 Gap 的统一格式

每个 Gap 必须使用相同结构：

1. 当前代码/文档证据。
2. 对 F2 Family Bible、F3 Anchor 和后续 AI 管道的影响。
3. 分类：`derived semantics`、`core contract`、`catalog metadata`、`compatibility` 或 `authoring rule`。
4. 至少两个候选方案及取舍。
5. 推荐方案与明确不采用的方案。
6. 最小类型/schema 变化草案。
7. Validator 与 Compatibility 影响。
8. Renderer 与 Editor/Reader 影响。
9. 向后兼容和迁移策略。
10. 自动化测试清单。
11. 用户手动视觉验证清单。
12. 是否阻断 F2、F3 或只阻断实现。
13. 需要用户明确批准的决策。

### 7.5 必须给出的总体架构结论

报告结尾必须画清三层边界：

```text
RecipeDefinition
  负责运行时可验证的几何、内容能力、关系、主题 token 与渲染事实

RecipeCatalogEntry
  负责发现、筛选、家族、Fingerprint、AI 选择标签与审美/可用性元数据

Legacy Compatibility
  只负责旧 style/draft 的过渡映射，不定义新 Recipe 的视觉语义
```

报告必须防止三个 schema 互相重复成为多个真相源。

### 7.6 Gate F0.5

F0.5 通过条件：

- 六个 Gap 全部有证据、候选、取舍和推荐结论。
- 明确哪些是派生语义，避免无意义扩展核心 Contract。
- spread 不可拆分证据能被 Validator 客观验证。
- Chromatic 不再依赖单背景色伪装多色彩。
- Typography Role 有限、语义化且不开放任意 CSS。
- Catalog Metadata 与核心 Definition 分层。
- Legacy 迁移不破坏现有草稿和运行目录。
- 提供完整测试与手动验证计划。
- 没有设计 Recipe、没有修改代码。
- 用户审核并明确批准推荐方案。

用户批准前，F2/F3 与 Contract v1.1 实现均保持关闭。

### 7.7 交给新 Sol 页面执行的首条任务

新页面必须使用 GPT-5.6 Sol，建议 `xhigh` reasoning；若能够选择，最终架构裁决可用 `max`。首条任务应为：

> 完整阅读 `phase-f-recipe-catalog-plan.md`、F0/F1 文档、Recipe Contract、Renderer 与 Reference Gate。只执行 Phase F0.5，在 `docs/recipe-catalog/contract-gap-report.md` 编写六项 Contract Gap 的证据、候选方案、推荐、最小 schema 草案、兼容策略和验证计划。不要修改代码，不要设计 Recipe，不要启动浏览器。完成后报告待用户批准的决策。

---

## 8. Phase F0.6：Contract v1.1 最小实现

此阶段不是 F0.5 执行者可以自动继续的任务。只有在以下条件同时成立时才能开始：

1. F0.5 报告完成。
2. 本协调页面完成简单校验。
3. 用户明确批准选定方案。
4. 本协调页面发出独立的 F0.6 实现任务。

F0.6 只实现被批准且阻挡正式 Catalog 的最小能力。不得顺手设计 Recipe，不得大规模重构现有引擎。

预计实现范围：

- spread 不可拆分证据与 Validator。
- 独立 Catalog Metadata schema。
- 可选 legacy 兼容映射。
- 受控 Color Region/Theme Token 能力。
- 受控 Typography Role。
- 向后兼容、Reference fixture、Preview Matrix 与测试更新。

实现完成后必须运行 TypeScript、ESLint、全部测试和生产构建；浏览器验证仍由用户手动完成。通过 F0.6 Gate 后，才能进入 F2。

---

## 9. Phase F2：五份 Family Bible

每个家族必须写一份独立视觉语法。Family Bible 不能只写形容词，必须能约束坐标、槽位和内容选择。

### 9.1 统一字段

每份 Bible 必须定义：

1. 家族目标和情绪，但不超过一段。
2. 适合的摄影内容与不适合的内容。
3. 基础网格、列数、主轴、页边距和书脊策略。
4. 主图与次图的典型面积区间。
5. 照片数量范围和比例偏好。
6. 出血、留白与视觉密度规则。
7. 阅读方向与视觉进入点。
8. Note 能力、关系类型和字数范围。
9. 标题/页码/静态文字的层级。
10. 颜色策略、对比度底线和禁用组合。
11. 单页与真正跨页 Recipe 的比例。
12. 至少 5 条 Do 与 5 条 Don't。
13. 与另外四个家族的明确边界。
14. 12 个 Recipe 的角色分配草案。

### 9.2 家族最低特征

#### Editorial

- 图像和文字具有明确编辑层级。
- 允许标题、页码、窄栏 Note 和跨页图文对话。
- 禁止退化成均匀 Contact Grid。

#### Grid / Contact

- 网格、重复、索引和比较阅读是核心。
- 允许多图和 indexed Note。
- 禁止仅把不同尺寸图片随意拼贴后称为网格。

#### Quiet

- 以观看时长、尺度控制和留白为核心。
- 允许单图、成对图像和极少量文字。
- 禁止把“图片缩小并居中”当作全部 12 个 Recipe 的变化方式。

#### Dynamic

- 通过方向、尺度跳变、不对称和切分建立运动感。
- 必须保持触控单页视角中的阅读清晰度。
- 禁止依赖无法由 Contract 表达的任意旋转、装饰贴纸或随机重叠。

#### Chromatic

- 色彩必须参与信息组织，而不是只更换页面背景。
- 至少定义三套经过约束的多色彩策略，例如分区、节奏、强调色。
- 文字与照片始终具有足够对比；颜色不得污染 Photo Note 绑定关系。
- 同家族 Recipe 仍必须有结构差异，不能用换色代替新布局。

### Gate F2

为每个家族回答：遮住名称和颜色后，能否仅从结构认出它？如果不能，Bible 不通过。

---

## 10. Phase F3：15 个 Anchor Recipe 设计规格

每个家族先设计 3 个 Anchor，共 15 个。此阶段先提交设计规格，不立即写满 60 个。

每个家族的三个锚点必须覆盖：

1. 单图或主图主导。
2. 双图/多图关系。
3. 家族独特能力：Photo Note、真正跨页、索引或多色彩系统。

### 10.1 Anchor Brief 必需内容

- 暂定 `recipeId`、名称、familyId 和一句用途。
- `page` 或 `spread`，以及 scope 的事实依据。
- 最小/最大照片数。
- 支持的照片比例与风险比例。
- 所有 Slot 的标准化矩形和 z-index。
- Required/optional 照片槽。
- Bleed、gutter 和安全区策略。
- Note 模式、字数/行数范围和 relation。
- 无 Note、Note 过长、照片不足和照片过多时的行为。
- 预期焦点和 `cover` 裁切风险。
- 参考来源及被提取的原则。
- 与同家族其他 Anchor 的差异声明。
- Editor、Reader 和单页放大视角下的预期。

### Gate F3-A：设计审批

用户先审阅 15 个 Anchor 的概念、缩略草图和差异矩阵。未获批准前不得扩展到 60 个。

### Gate F3-B：Anchor 数据实现

批准后，才将 15 个 Anchor 实现为 `draft` Recipe Definition。

- 普通 Anchor 不得修改 Renderer TSX。
- 如确有 Contract Gap，先走报告流程。
- 全部进入 Preview Matrix。
- 全部通过 Validator、Compatibility 和 Application 测试。
- 执行模型只运行静态测试和生产构建，不启动浏览器。
- 用户完成 Preview Matrix 与实际编辑器的手动视觉验证。

---

## 11. Recipe 差异性 Gate

差异性必须被记录和验证，不能依靠命名或主观声明。

### 11.1 Recipe Fingerprint

每个 Recipe 建立一个 fingerprint：

- `scope`：page/spread。
- `photoCountRange`：最小、最大和实际槽数。
- `slotTopology`：single、diptych、stack、band、grid、mosaic、index、cross-gutter 等。
- `dominantImageScale`：主图占画布面积和与次图的比例。
- `compositionAxis`：水平、垂直、对角趋势、中心、边缘或环绕。
- `readingDirection`：进入点和视觉路径。
- `density`：照片覆盖率与负空间率。
- `bleedPattern`：无出血、局部出血、全出血、跨书脊。
- `noteModeAndRelation`：none/optional/required 与关系类型。
- `colorStrategy`：纸张色、单强调色、分区多色、节奏多色等。
- `typographicRole`：无文字、caption、index、标题主导或跨页对话。

### 11.2 Pairwise Difference Score

每个新 Recipe 必须与同家族所有已有 Recipe 比较：

| 差异项 | 分值 |
| --- | ---: |
| Scope 不同 | 2 |
| 照片数量范围或槽位数量显著不同 | 1 |
| Slot topology 不同 | 2 |
| 主图面积或主次比例显著不同 | 1 |
| 构图主轴/阅读路径不同 | 1 |
| 出血/留白结构不同 | 1 |
| Note 能力或关系不同 | 1 |
| 色彩/字体角色不同 | 1 |

通过条件：

- 同家族任意一对 Recipe 的差异分数必须 `>= 4`。
- 至少一项差异必须来自 Scope、Slot topology、主图尺度、构图主轴或出血/留白结构。
- 只改变颜色、字体、间距、镜像或少量坐标，不能算新 Recipe。
- 左右镜像只有在阅读方向、Note 关系或单页使用场景发生实质变化时才可保留。
- 如果两个 Recipe 服务相同照片数、相同比例、相同 Note 能力且视觉路径相同，应合并或删除较弱者。

### 11.3 Catalog 级去重

跨家族允许共享基础网格，但必须由家族语法产生不同的观看体验。若两个 Recipe 即使换掉颜色和名称仍几乎相同，只保留更可用的一个。

---

## 12. 高度可用性 Gate

每个 Recipe 不仅要“好看”，还要在不理想内容下保持可预测。

### 12.1 内容矩阵

每个 Recipe 至少验证：

- 空内容、最少、最多和超容量照片。
- 横图、竖图、方图和超宽图。
- 主体居中、主体靠边和需要明显焦点迁移的照片。
- 无 Note、短 Note、长 Note和超过能力的 Note。
- 左页、右页；spread 则验证从左右任意一侧应用。
- Editor 和 Reader。
- 单页聚焦视角中的完整可读性。

### 12.2 硬性失败条件

出现以下任一项，Recipe 不得通过：

- 图片框出现任何未填充留边。
- 重要主体默认必然落入书脊损失区。
- Note 与错误照片对应，或只能依靠距离猜测关系。
- 长 Note 被静默截断。
- 无 Note 时留下无意义的大块空槽，且未被家族语法明确解释。
- page Recipe 改动配对页。
- spread Recipe 不能一次撤销/重做。
- 超额照片丢失或仍被错误标记为 used。
- Reader 出现编辑器 placeholder、选中框或控制层。
- 只有一种理想照片比例下好看，其余常见比例不可用。
- 多色彩页面文字对比不足，或颜色压过照片内容。

### 12.3 审美与可用性评分

每个 Recipe 以 100 分评审：

| 维度 | 分值 |
| --- | ---: |
| 服务照片内容与裁切鲁棒性 | 20 |
| 视觉层级和阅读清晰度 | 15 |
| 平衡、节奏与留白 | 15 |
| 家族识别度 | 15 |
| 相对其他 Recipe 的差异性 | 15 |
| 不同比例/数量下的适配性 | 10 |
| Photo Note 关系质量 | 5 |
| 色彩、书脊和输出安全 | 5 |

通过条件：总分至少 82；前五项任何一项不得低于该项满分的 70%。硬性失败条件优先于总分。

评分由执行模型先自评并给证据，最终审美结论由用户人工确认。模型不得用自己的自评分替代用户视觉 Gate。

---

## 13. Phase F4：分两波扩展到 60 个

Anchor Gate 通过后再扩展。

### Wave 1

- 每个家族从 3 个扩展到 7 个。
- 总计 35 个候选。
- 更新 Difference Matrix 与 Usability Matrix。
- 执行静态 Gate，用户抽查全部新增 Recipe 的视觉结果。

### Wave 2

- 每个家族从 7 个扩展到 12 个。
- 总计 60 个候选。
- 再做一次家族内和跨家族去重。
- 如果去重后某家族不足 11 个，只能补充具有新结构角色的 Recipe，不能恢复被删除的近重复项。

### 13.1 每个家族的内容覆盖

每个 12 项家族至少包含：

- 3 种不同照片数量级，例如 1、2、3+。
- 4 个明确不显示文字的 Recipe。
- 3 个能够表达 Photo Note 关系的 Recipe；其余由家族需要决定。
- 2 个真正不可拆分的 spread Recipe；不能把双页预览误算为 spread。
- 4 种不同主图尺度或拓扑。
- 2 种以上出血/留白策略。
- 至少一个对横图友好、一个对竖图友好、一个混合比例友好。

Chromatic 家族额外要求：

- 12 个 Recipe 中至少 8 个真正使用两种以上功能性色彩。
- 至少覆盖分区色、节奏色和强调色三种策略。
- 不得通过同结构换配色凑数量。

### 13.2 Catalog 整体覆盖

- 真正跨书脊照片与跨页图文对话都必须存在。
- 必须同时存在沉浸式全出血与克制留白。
- Note relation 至少覆盖 `adjacent`、`aligned`、`indexed`、`cross-page-pair`；只有确有语义时使用 `overlay` 或 `edge-related`。
- Recipe 菜单元数据能够按照片数、Note 能力、Scope、家族和密度筛选。

---

## 14. Phase F5：代码注册、验证与激活

### 14.1 实现要求

- Recipe Definition 与目录元数据分层组织，避免单个超大文件失控。
- ID 使用稳定、语义化的命名，例如 `quiet-single-offset-v1`。
- 版本更新创建新版本，不静默改变已应用旧版页面。
- 所有候选先注册为 `draft`。
- Preview Matrix 可按 family、recipeId、scope 和 scenario 定位。
- 正式菜单只显示 `active`，除非开发环境明确开启 draft 浏览。
- AI 预留元数据应为确定性标签，不写自然语言“感觉很适合”作为唯一条件。

建议的 AI 预留标签：

- 照片数范围。
- 偏好比例。
- 视觉密度。
- Note 能力。
- 单页/跨页。
- 家族与色彩策略。
- 主体靠边风险。
- 阅读节奏：slow/medium/fast。

### 14.2 自动化 Gate

每一波实现完成后运行：

```text
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
```

还必须验证：

- 所有 Definition 静态有效。
- Difference Matrix 中不存在不合格 pair。
- Preview Matrix 覆盖所有正式候选。
- Compatibility code 与场景一致。
- page/spread Application、undo/redo 和 unplaced photo 行为不回归。
- Editor/Reader render plan 一致。

### 14.3 用户手动视觉 Gate

执行模型不得打开浏览器，只需向用户提供验证路径和预期。用户至少检查：

1. Preview Matrix 中每个新增 Recipe 的关键场景。
2. 实际手动排版菜单中的兼容/禁用状态。
3. 左页和右页分别应用 page Recipe，对侧页不变。
4. spread Recipe 从任意一侧应用、撤销和重做。
5. 照片选中后移动焦点，图片始终满框。
6. 无 Note、短 Note、长 Note 和切回支持 Note Recipe。
7. Reader 与 Editor 的版面一致，Reader 无编辑控制层。
8. 手机单页聚焦视角下文字、留白和主体位置合理。
9. Chromatic 的多色对比和层级。

### 14.4 激活规则

只有同时满足以下条件才能从 `draft` 改为 `active`：

- 自动化 Gate 全部通过。
- Difference Score 与可用性评分通过。
- 用户完成手动视觉 Gate 并明确批准。
- Review Log 记录批准日期和版本。

可以分家族或分批激活，不要求一次性上线 60 个。质量不足的 Recipe 应保留 draft、修改或删除，不能因为数量目标而激活。

---

## 15. Codex 页面分工、校验与任务派发

### 15.1 推荐页面数量

推荐为整个 Phase F 使用 **4 个 Codex 页面（包含当前协调页面）**。这是质量、独立复核和上下文连续性之间最合理的配置。

| 页面 | 固定模型 | 职责 | 是否直接改代码 |
| --- | --- | --- | --- |
| A：协调与 Gate | 当前页面/当前模型 | 简单校验每一阶段交付；判定 Gate；记录问题；由用户确认后分发下一项任务 | 原则上不承担大批量实现；只在用户明确要求时修改 |
| B：架构与艺术指导 | GPT-5.6 Sol | F0.5 Gap Report、F2 Family Bible、F3 Anchor 设计、关键审美裁决 | F0.5/F2/F3-A 不改代码；仅在单独授权时实现 |
| C：实现与批量生产 | GPT-5.6 Luna | F0.6 Contract v1.1、获批 Anchor 数据实现、Wave 1/2 Definition、测试和静态验证 | 可以，但每次只执行协调页派发的一个阶段 |
| D：独立设计审计 | GPT-5.6 Sol | 对 15/35/60 项做独立差异性、可用性和家族一致性审计；提出淘汰而非替执行页辩护 | 默认只写审计报告，不改生产代码 |

如果希望降低成本，最少可用 3 页：合并 B 与 D，但会失去独立审美审计。超过 4 页通常只会增加上下文分裂和同时写文件的冲突；除非 Wave 2 的实现规模证明单独拆出第五个 Luna 页面确有必要，否则不要增加。

### 15.2 为什么不是一个页面完成全部工作

- 架构决策、视觉创作、批量实现和最终审计存在不同目标，全部由同一上下文完成容易产生自我确认偏差。
- 60 个 Recipe 会形成很长的上下文；批量实现噪声不应污染 Sol 的设计判断。
- 独立 Sol 审计页没有参与生成，更容易识别近重复、家族漂移和“为了凑数量”的弱 Recipe。
- 当前协调页面保持稳定，可以连续对照计划书、用户手动验证结果与各执行页交付。

### 15.3 固定工作流

每个阶段严格使用以下循环：

1. 当前协调页面发出一个范围明确的任务。
2. 指定执行页面只完成该任务，不自动继续下一阶段。
3. 执行页面报告改动、静态验证、未验证事项和待批准决策。
4. 用户回到当前页面要求简单校验。
5. 当前页面只读检查文档/代码，按风险运行静态测试；永不擅自打开浏览器。
6. 若存在问题，当前页面给出修正清单，原执行页面负责修正。
7. 用户完成需要的浏览器手动验证并反馈。
8. 当前页面判定 Gate，通过后才派发下一任务。

### 15.4 页面写入纪律

- 任意时刻只允许一个执行页面修改工作区。
- 审计页面在实现页面工作时保持只读。
- 不同页面不得同时改 `recipe-contract.ts`、Renderer、正式 Definitions 或计划书。
- 每个页面开始前先读计划书和上一阶段产物；不得依赖用户手工复制的一段摘要代替源文件。
- 每个阶段完成后在 `recipe-review-log.md` 记录模型、阶段、文件、验证结果、用户视觉结论和 Gate 状态。
- 执行页不得自行把下一阶段标记为完成，也不得自行将 Recipe 升为 `active`。

### 15.5 模型使用建议

- Sol 使用 `xhigh` 作为默认；F0.5 最终裁决、15 个 Anchor 和最终 Catalog 淘汰可使用 `max`。
- Luna 使用 `high` 或 `xhigh` 执行已经批准的 schema/Definition 和测试；它不负责推翻 Sol 与用户已锁定的审美语法。
- 联网研究和新增参考必须返回直接来源 URL 与具体观察。
- 两个 Sol 页面都必须主动指出弱项和建议删除项，不能默认所有候选都合格。
- 用户是最终审美和激活批准者；模型评分不能替代用户视觉 Gate。

### 15.6 阶段到页面的派发顺序

1. **B / Sol：** F0.5 Contract Gap Report。
2. **A / 当前页：** 简单校验；用户批准架构。
3. **C / Luna：** F0.6 Contract v1.1 最小实现。
4. **A / 当前页：** 代码静态校验；用户完成必要视觉验证。
5. **B / Sol：** F2 Family Bible。
6. **A / 当前页：** 家族边界校验与用户批准。
7. **B / Sol：** F3-A 15 个 Anchor 设计规格。
8. **D / 独立 Sol：** Anchor 差异性与可用性审计。
9. **A / 当前页：** 综合审计与用户意见，派发修订或实现。
10. **C / Luna：** F3-B 实现获批 Anchor。
11. **A / 当前页 + 用户：** 静态校验与手动视觉 Gate。
12. **C / Luna：** Wave 1 扩展到 35 个。
13. **D / 独立 Sol：** 35 项审计；A 校验并派发修订。
14. **C / Luna：** Wave 2 扩展到 60 个。
15. **D / 独立 Sol：** 最终去重与淘汰审计。
16. **A / 当前页 + 用户：** 最终 Gate、分批激活建议与下一阶段派发。

---

## 16. 完成定义

Phase F 只有在以下全部成立时完成：

- 五个家族各有 12 个候选，去重后每家族至少 11 个通过项。
- 至少 25 条专业联网研究记录完整可追溯。
- 五份 Family Bible 通过结构识别 Gate。
- 60 个候选均有 Fingerprint、差异记录和用途说明。
- 不存在只换颜色、轻微坐标、镜像或间距的伪新 Recipe。
- 每个通过项满足 Contract、Compatibility、Renderer 和内容矩阵要求。
- 所有图片始终满框，Photo Note 不错配，内容不丢失。
- 自动化 Gate 全部通过。
- 用户完成手动视觉 Gate。
- 只有用户批准的 Recipe 被设为 `active`。
- Recipe Catalog 具有足够结构化元数据，后续 AI 排版管道可以选择，而不需要理解组件专用代码。

Phase F 完成后，下一阶段才是 `Cover Contract v1`、`Spine Contract v1` 及其模板目录；AI 排版管道仍应在封面/书背边界明确后单独规划。
