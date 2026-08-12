# Phase F0：Recipe Catalog Constraint Summary

状态：F0 约束复核完成；正式 Recipe 设计仍被 Contract Gap 阻断。  
日期：2026-08-12  
范围：只复核约束，不设计 Recipe，不修改代码。

## 1. 复核对象

- `zine-engine.md`
- `docs/zine-engine.md`
- `recipe-design-readiness-plan.md`
- `features/zine/model/recipe-contract.ts`
- 当前 Reference Recipe Definitions、Preview Matrix 与相关测试

当前 Reference Recipe 是 Gate fixture，保持 `draft`；它们不能被改名后直接当作正式 Catalog。当前正式执行目录仍是 legacy style Recipe 与 Gutter bridge，`legacyStyleId` 只允许作为兼容映射，不能成为正式布局语义。

## 2. 必须保持的系统约束

| ID | 约束 | 当前基线 | F0 结论 |
| --- | --- | --- | --- |
| C-01 | 单页为 `3:4`；标准物理跨页为 `3:2`，由两张 `3:4` 单页组成 | 引擎文档明确声明 | 必须保留 |
| C-02 | 跨页是浏览与阅读单位；普通 Recipe 默认只作用当前 page | `scope: page \| spread`；page/spread 应用路径已分开 | 必须保留 |
| C-03 | `page` Recipe 不得修改配对页 | Contract 禁止 page slot 使用 `cross-spread`；应用层按当前页处理 | 必须保留 |
| C-04 | `spread` 只能用于事实上的不可拆分跨页构图；“预览同时显示两页”不构成 spread | 引擎文档明确规定；当前 Contract 能表达 `cross-spread` 与 `cross-page-pair` | 必须保留；静态 Gate 仍需加强 |
| C-05 | 正式照片槽使用 `cover` 满框，不产生未填充留边 | Contract 静态校验 `fit: cover`；Renderer 使用满框策略 | 必须保留 |
| C-06 | Photo Note 通过 `photoId` 绑定照片，不等于边缘吸附 | Contract 有 `noteRelations`；关系可为 `adjacent`、`aligned`、`indexed`、`cross-page-pair` 等 | 必须保留 |
| C-07 | Note 是纯文字，不使用卡片背景、胶囊、阴影 | Renderer 与引擎约束均如此 | 必须保留 |
| C-08 | 不支持 Note 的 Recipe 隐藏 Note，不删除原始 Note | Application 保留 `hiddenNotePhotoIds` | 必须保留 |
| C-09 | 每个 Placement 独立保存 `placementId/contentItemId`、焦点与裁切 | Phase B 迁移与跨页同步已补齐 | 必须保留 |
| C-10 | 超出当前照片槽容量的照片进入 `unplacedPhotoIds`，不得丢失，也不得误算为 used | Application 与 Photos 菜单计数已按 assignment/placementId 语义修正 | 必须保留 |
| C-11 | Editor 与 Reader 共用同一 `RecipeRenderer` 计划；Editor 专用占位、选中框和控制层不进入 Reader | `ZineReaderPageView` 接收 `editor \| reader`；Reader 使用 `reader` | 必须保留 |
| C-12 | 所有正式候选先为 `draft`；只有自动化、视觉验收和用户批准后才可 `active` | `RecipeStatus` 已支持 `draft/active/deprecated` | 必须保留 |
| C-13 | `/zine/preview-matrix` 是 development-only Gate 工具，不是生产 Catalog UI | 文档与现有入口均如此要求 | 必须保留 |

## 3. Contract 现状与不可自行解释的差异

这些项目本轮只记录，不修改 Contract 或 Renderer。

### GAP-F0-01：`3:2` spread 的数据语义没有被显式表达

计划书与引擎约束把标准 spread 定义为 `3:2`。当前 `RecipeDefinition.canvas.pageRatio` 类型仍是字面量 `"3:4"`，spread 通过统一坐标（左页 `x=0..1`、右页 `x=1..2`）表达。这样可以驱动当前渲染，但不能在 Definition 层明确声明物理跨页的 `3:2` 比例。

在 Contract Gap Report 获得批准前，不能把“当前统一坐标可渲染”解释成“Contract 已完整表达 `3:2` spread”。后续如需对物理跨页做比例、出血或输出安全判断，必须先定义向后兼容的 spread canvas 语义。

### GAP-F0-02：spread 的“不可拆分事实”尚未成为完整静态必备条件

当前 Validator 已拒绝：

- page Recipe 包含 `cross-spread` slot；
- `cross-page-pair` 出现在 page Recipe；
- `cross-page-pair` 的照片槽和 Note 槽不在跨页两侧。

但从现有校验路径看，尚未形成“所有 `scope: spread` Recipe 必须包含真实跨页结构”的对称拒绝规则。未来正式目录设计前，应提交 Gap Report，明确 spread 需要什么可验证的跨页事实；不能靠命名或 Preview 外观推断。

### GAP-F0-03：计划要求的目录/约束元数据尚未完全进入 Contract

计划书预期后续 Definition 能承载约束、降级规则和 Preview 元数据，例如照片比例范围、可用性风险、fallback 行为和可定位的场景标签。当前 Contract 已有照片/Note 数量、`maxCharacters`、`maxLines`、`allowsEmptyDraft`、slot geometry、theme 和 relation，但没有一套独立、结构化的 `constraints/fallbackRules/previewMetadata` 字段。

因此，F1 只能提供原则与适配判断；不能在本阶段假设这些元数据已经存在，也不能为某个未来 Recipe 私自扩大字段。

### GAP-F0-04：`legacyStyleId` 仍是 Definition 的必填字段

计划书要求 `legacyStyleId` 仅作为兼容映射；实际类型仍要求每个 `RecipeDefinition` 带有它，并保留按旧 Style 查找的兼容路径。正式 Catalog 设计前应单独确认：新 Recipe 如何在不复用旧 Style 语义的情况下满足兼容字段，或是否需要向后兼容地把它降为可选映射。当前不以它推导任何新视觉结构。

## 4. F0 Gate 结论

- **约束总结：完成。** 上表中的运行时边界已整理为后续设计不可违反的规则。
- **Contract 一致性 Gate：未完全通过。** GAP-F0-01 至 GAP-F0-04 需要在正式 Recipe 设计前形成并批准 Contract Gap Report。
- **本轮允许继续的范围：** 只做 F1 研究资料、原则提炼和证据归档。
- **本轮明确不允许：** 设计 5 个家族的 Recipe、设计 Anchor、写 Definition、改 Contract、改 Renderer、注册 `active` Recipe。

