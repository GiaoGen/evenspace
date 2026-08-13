# Recipe Catalog Review Log

本记录保存 Phase F 各阶段的交付、协同校验、视觉或方向决策，以及是否允许进入下一个 Gate。

## 2026-08-13 — Phase F2 / F2.1 Family Bibles

- 完成五个 Family Bible、家族差异矩阵及每个家族的候选 Recipe 结构。
- F2-D01 至 F2-D18 完成协同校验，Phase F2 通过。
- 后续进入 F3-A 设计工作。

## 2026-08-13 — Phase F3-A1 Quiet Anchors

- 交付 Quiet Anchor brief 与视觉板。
- 候选 Q-A 至 Q-E 中选定 `quiet-held-field-v1`、`quiet-scale-echo-v1`、`quiet-horizon-bridge-v1`。
- Contract、几何、spread evidence、Optional Note 与 SVG 校验通过；F3-A1 通过。

## 2026-08-13 — Phase F3-A2 Editorial Anchors

- 交付 Editorial Anchor brief 与视觉板。
- 选定 `editorial-lead-story-v1`、`editorial-evidence-aside-v1`、`editorial-across-the-record-v1` 的设计方向。
- 视觉方向通过，但 authored static text Contract 尚未关闭；不得进入 F3-B。

## 2026-08-13 — Phase F3-A2.1 Editorial Authored Text Reality Gate

- 完成 authored static text 的 Contract、Draft、Application、Compatibility、Editor/Reader 现实性审查。
- F3-A2.1-D01 已批准方案 B；后续实现进入收口阶段。
- Lead Story 仍只是视觉方向，未进入正式 Recipe 或 Catalog。

## 2026-08-13 — Phase F0.7-A Authored Static Text Core Contract

- 完成 Draft → Application → Compatibility → page model → shared Editor/Reader Render Plan 核心链路。
- `editorial-lead-story-v1` 仍为设计 brief，不是 active Recipe，也不进入正式菜单。
- 可见 authored-text 编辑 UX 尚未实现；未进入 F3-A3 或 F3-B。
- Across the Record 压力状态已从 140 字符收紧为 120 字符。

## 2026-08-13 — Phase F0.7-A.1 Authored Static Text State Integrity Closure

- 本阶段完成 State Integrity 收口：Reducer 拒绝非法 authored entity 与非法 text action，拒绝动作不产生 Undo history。
- 已应用 Recipe 在 UPSERT、UPDATE、DELETE 后根据 prospective Draft 重新计算 assignments/unplaced；optional、required、owner/contentKey 变化与超限保护均由同一 Compatibility 路径判定。
- page/spread owner 规则、spread 两页共享同一 Application、page→spread 明确侧匹配、spread→page 不猜测拆分均已锁定。
- roleHint 只提示 Draft 内容，不参与 Recipe identity；contentKey 决定语义匹配，Slot role 决定当前排版职责。
- 协同校验已通过；不创建正式 Recipe/CatalogEntry，不增加可见编辑 UI。后续设计可使用 authored static text Contract，但必须标记“Contract-ready, UI pending”。

## 2026-08-13 — Phase F3-A3 Grid / Contact Anchors

- 无色候选为 G-A 基础四宫矩阵、G-B 十二格档案表、G-C 双样本严格比对、G-D 真实跨脊 Contact Band、G-E required Photo Note 跨页索引对答。
- 淘汰 G-A：家族识别与可用性高，但在首批三个名额中处于 G-C 的低计数比较与 G-B 的高密度扫描之间，新增结构信息最少；保留为 F4 基础角色候选。
- 淘汰 G-D：`cross-gutter-photo` evidence 合法且 Contact Band 清楚，但中心模块承担最高书脊裁切风险，左右单页均出现半模块；首批唯一 spread 由语义更明确、单页职责更可审的 G-E 承担。
- 入选 `grid-contact-twin-register-v1`、`grid-contact-twelve-up-ledger-v1`、`grid-contact-cross-register-v1`。内部 Pairwise Difference Score 分别为 5、9、9，均不低于 4。
- 与 Quiet 边界：Twin Register 以等权、同模数和 A/B 稳定索引成立，不是 Scale Echo 的大小回声；Cross Register 由 required Photo Note `cross-page-pair` 成立，不是 Horizon Bridge 的单张跨脊停顿。
- 与 Editorial 边界：三者都无英雄图；Cross Register 的 Note 是逐照片索引而非报道侧栏，Twelve-up 的视觉入口是扫描行而非标题或主图。
- Authored text：本批入选结构不依赖 authored title/deck；固定 A/B、INDEX 为 Definition literal，folio 为 page-number，Cross Register 的可编辑索引正文为现有 Photo Note。若未来给 Twelve-up 增加用户批次标签，状态只能记录为 Contract-ready, UI pending，不能作为当前 Anchor 的成立条件。
- 待用户视觉裁决：Twin Register 的横向双层是否足够“严格档案”而不显 Quiet；Twelve-up 的最小模块在真实 Reader 尺寸是否仍可辨主体；Cross Register 的右页索引是否在最长 Note 下保持阅读职责，以及左右单页聚焦是否都可理解。
- 本批只完成 F3-A3 视觉与文档 Gate；未创建 Definition/CatalogEntry，未进入 F3-B、F3-A4 Dynamic 或任何实现阶段。

## 2026-08-13 — Phase F3-A3.1 Grid / Contact Specification Consistency Closure

- Family Bible 角色映射已收口：G-A 维持角色 01；G-B / `grid-contact-twelve-up-ledger-v1` 修正为角色 02“密集 contact sheet”；G-C / `grid-contact-twin-register-v1` 修正为角色 05“二元严格比较”；G-D、G-E 分别维持角色 12、11。
- F3-A3 的结构与 Contract 协调校验通过；三个入选方向的 ID、scope、照片数量、topology 与全部 Photo Slot 坐标均未改变。
- Twin Register 的等权双样本、稳定 A/B index 与纵向扫描足以建立档案比较身份；`index-a` 已移入 safe area 顶边，未改变照片覆盖率、比较间距或阅读路径。
- Cross Register 的一个 required repeatable Note Slot 加四个 Photo Note assignments，可由当前 Contract / Render Plan 的 repeatable Note 聚合与四条 `cross-page-pair` relation 表达。
- Twelve-up 的 folio 已移至 safe area 顶部外角且不碰第一行照片；12 个 4.59% 模块、3×4 topology 和 6+6 组距不变。真实 Reader 中的主体可辨认性仍是必须保留的视觉 Gate。
- 三个方向仍等待用户最终视觉批准；本记录不表示 F3-A4、F3-B 或任何 Recipe 实现已经开始。

## 2026-08-13 — Phase F3-A4 Dynamic Anchors

- 前置状态：Quiet、Editorial、Grid/Contact 共九个 Anchor 已获用户视觉批准，作为本批跨家族差异基线；Twelve-up Ledger 的 4.59% Reader 可辨认性 Gate 继续保留，但不阻断本批文档设计。
- 无色候选为 D-A 单图边缘推进、D-B 大小双图折返、D-C 主图加两段动作切片、D-D 真实跨书脊横扫、D-E required Photo Note 跨页冲刺。
- 淘汰 D-B：折返语言成立，但其单侧 bleed 与 D-A 重合、尺度跳变职责又被 D-C 更完整的三阶段动作覆盖；保留给 F4 的角色 03 扩展，不用镜像或边距微调挤占首批名额。
- 淘汰 D-E：`cross-page-pair` evidence 合法，但一图一段短 Note 的第一识别仍接近 Editorial Across the Record；要成为 Dynamic，真实内容必须证明动作方向而非报道说明，首批风险高于无文字的跨脊横扫。
- 入选视觉方向：`dynamic-edge-thrust-v1`（page，角色 01，exactly 1）、`dynamic-drop-sequence-v1`（page，角色 06，exactly 3）、`dynamic-gutter-sweep-v1`（spread，角色 10，exactly 1，`cross-gutter-photo`）。三组内部 Pairwise Difference Score 为 8、8、11，均不低于 4。
- Contract 协调结论：三项只使用固定矩形 Photo Slot、`cover`、持久化 focus、受控 bleed 与现有 spread evidence；无旋转、任意叠压、文字压图、特殊 Renderer 或 authored static text 依赖。三项均为设计 Brief，不是 Definition/CatalogEntry。
- 与既有九项边界：Edge Thrust 以单侧主动 bleed 与横向推进区别 Quiet Held Field；Drop Sequence 以 1:4.86 尺度跳变和“横移→坠落”区别 Editorial 主次与 Grid 扫描；Gutter Sweep 以 84% 高密度双外边 bleed 的动作横扫区别 Quiet Horizon Bridge 的框内停顿。
- 三个方向等待用户最终视觉批准。真实照片 Gate：Edge Thrust 的终点主体不能被右侧纸面刹车带截断；Drop Sequence 的两张 10% 动作切片需在 Reader 尺寸可辨，且三张照片必须有真实时间/动作关系；Gutter Sweep 的关键人物面部、文字标牌和动作关节必须避开 gutter 风险区，左右单页聚焦仍需可理解。
- 本批只完成 F3-A4 设计文档与 SVG；未创建 Definition/CatalogEntry，未修改产品代码，未运行项目代码测试，未启动服务器/浏览器，也未进入 F3-A5 Chromatic 或 F3-B。

## 2026-08-13 — Phase F3-A5 Chromatic Anchors

- 前置状态：用户已批准 Dynamic 三个 Anchor；进入本批前 F3-A 为 12/15。Twelve-up 的 4.59% 模块、Drop Sequence 的 10% 切片、Dynamic 强裁切和 Gutter Sweep 装订损失继续保留为实现后真实视觉 Gate，但不阻断本批设计。
- 五个候选：C-A 无文字单强调色入口、C-B authored 标题/照片双色分区、C-C required Photo Note 单页双色分区、C-D 四拍横向色彩节奏、C-E required Photo–Note 跨页双色分区。
- 淘汰 C-B：色域职责虽明确，但 authored title + deck + 单图的无色 topology 与 Editorial Lead Story 过近，可见 authored-text UI 也尚未交付；首批不保留纯海报风险最高的方向。
- 淘汰 C-C：required Note 色域在 page 上合法，但其一图一侧栏与 Editorial Evidence Aside 的边界仍弱；C-E 用同类 required Note 能力同时提供合法 spread 和更明确的左右色域职责，首批结构增量更高。
- 入选 `chromatic-entry-field-v1`（page、角色 01、single-accent、exactly 1）、`chromatic-four-beat-v1`（page、角色 07、rhythmic、exactly 4）、`chromatic-cross-field-note-v1`（spread、角色 12、zoned、exactly 1 + required Photo Note `cross-page-pair`）。三套强制策略全部覆盖；C-A 无文字成立，C-D 使用三种 accent，C-E 验证 required Note 与固定 Note 色域。
- Pairwise Difference Score：Entry Field ↔ Four Beat = 10；Entry Field ↔ Cross-field Note = 12；Four Beat ↔ Cross-field Note = 13。Topology Collision Test 通过：统一为中性灰后仍分别是单图阈值、四图编号节奏、左右图—Note 原子 spread，不靠换 token、镜像或微调尺寸区分。
- Theme 建议锁定为不透明实色：paper `#F4F0E8`、ink `#17191C`、muted-ink `#55585D`、photo-mat `#D7D3CA`、accent-1 `#164B8C`、accent-2 `#A83D2B`、accent-3 `#D49A18`、inverse-ink `#FFFFFF`。实际文字组合最低对比为 inverse-ink/accent-2 = 6.24:1；其余使用组合均 ≥6.28:1。
- 与既有十二项边界：Entry Field 的 16.2% 顶部色域是阅读阈值而非 Quiet 气氛或 Dynamic bleed；Four Beat 的 A1→A2→A3→A1 色序与 01–04 双线索组织相同尺度照片，不是 Grid 扫描或 Dynamic 动作切片；Cross-field Note 的 spread evidence 只来自 required Photo Note relation，左右固定色域承担 source/destination，而非 Editorial 正文或 Grid 逐图索引。
- F3-A5 协调复核发现 Four Beat 的 normalized 几何被误读为物理比例，以及 Cross-field Note 虚构了 12 字 runtime minimum；两项均不在本节静默批准，转入下方 F3-A5.1 定向收口。
- 本批只完成 F3-A5 文档和 SVG；未创建 Definition/CatalogEntry、未修改 TypeScript/TSX/CSS、未运行项目代码测试、未启动服务器或浏览器，也未进入 F3-B 或 60 项扩展。

## 2026-08-13 — Phase F3-A5.1 Chromatic Specification & Usability Closure

- 状态不变：Entry Field 与 Cross-field Note 的总体视觉方向保留；Chromatic 尚未获用户最终批准，F3-A 仍为 **12/15**。本节收口后仍停在用户视觉裁决 Gate。
- 物理 frame 统一改按 `slot.width × 3 / (slot.height × 4)` 计算。Entry `entry-photo` 为 **1.0887:1**；Cross-field `source-photo` 为 **.9044:1**；旧 Four Beat `.20×.50` 的真实值是 **.30 = 3:10**，并非原 Brief 所写的 2:5。
- Four Beat 方案 B（保留 3:10、限定为窄幅细节专用）在 square / `4:5` / `3:2` 下的 source-area 损失为 70% / 62.5% / 80%，复评 **77/100**，低于 85，淘汰。
- Four Beat 采用方案 A：四个 Photo Slot 改为 x `.05,.28,.51,.74`、y `.22`、`.21×.28`，真实比例 **.5625 = 9:16**；四个 Color Field 同列、y `.56`、`.21×.16`。照片 23.52%、色域 13.44%、paper 63.04%；exact-4、page、LTR、A1→A2→A3→A1、01–04、无 Note 与单行 topology 不变，不形成 2×2 Grid。复评 **91/100**。
- 新 Four Beat 对 square / `4:5` / `3:2` 的 source-area 损失为 43.75% / 29.69% / 62.50%；明确以单主体 `4:5` 为 preferred、square 为 acceptable、`3:2` 为 risk，不再宣称普通混合比例普遍稳健。5.88% 单格和 xs index 仍需真实 Reader Gate。
- Cross-field Note 删除虚构的 12 字 minimum Gate。Contract/runtime 合法范围为 trim 后非空至 90 字符、最多 4 行；12–90 只是 recommended authoring target。1–11、12、90 字均合法且固定几何，只有空 Note 为 `needs-content`。短 Note 是否让右页像摄影书 destination 而非空 UI card，保留为用户视觉 Gate；不建立新 Contract Gap。
- 修订后评分为 Entry **91**、Four Beat **91**、Cross-field **92**。Pairwise Difference Score 复核后仍为 10 / 12 / 13；Topology Collision Test 与跨家族边界不变，三项仍推荐进入用户视觉批准 Gate，但本记录不构成自动批准。
- 本收尾只修改 Brief、Review Log 与 Chromatic SVG；未创建 Definition/CatalogEntry，未修改 TypeScript/TSX/CSS、Renderer、Reducer、Catalog 或测试，未运行项目代码测试，未启动服务器/浏览器，未进入 F3-B。

## 2026-08-13 — Chromatic 用户视觉批准

- 用户批准 `chromatic-entry-field-v1`、`chromatic-four-beat-v1`、`chromatic-cross-field-note-v1`；F3-A 视觉批准进度由 12/15 更新为 **15/15**。
- Four Beat 修订后的照片尺寸、留白、exact-4 单行四拍与 A1→A2→A3→A1 Palette 被接受；Cross-field Note 的短/长 Note 状态成立；Palette 保持不变。
- 视觉批准不删除实现后回归 Gate：Four Beat 的 5.88% 照片、xs index、9:16 cover 与 Color-off；Cross-field Note 的 1–11/90 字、固定 destination 几何与左右单页 focus 仍需由实际 Renderer 验证。

## 2026-08-13 — Phase F3-A6 15-Anchor Independent Difference & Implementation Readiness Audit

- 独立审计覆盖五家族 15 个获批 Anchor、Apply/Draft/Editor/Reader/Compatibility/Catalog/Preview 产品路径、10 张 SVG、18 组唯一 Photo Slot 物理比例，以及全部 **105** 个唯一 Pair。
- 15×15 Pairwise Difference Matrix 最低分为 **4**，无低于门槛的 Pair；所有 Pair 至少具有 scope、topology、主图尺度、主轴/路径或 bleed/留白中的硬结构差异。三组最低 4 分 Pair 为 Horizon Bridge ↔ Gutter Sweep、Lead Story ↔ Entry Field、Across the Record ↔ Cross-field Note，均已记录结构差异理由。
- spread 审计为 10 page / 5 spread。五个 spread 仅由 Horizon Bridge 与 Gutter Sweep 的 `cross-gutter-photo`，以及 Across the Record、Cross Register、Cross-field Note 的 required Photo–Note `cross-page-pair` 成立；Color Field、平衡或共享轴线均未充当 evidence。
- 实现准备度：Ready 5；Ready with implementation/manual gate 9；Contract-ready, visible authored-text UI pending 1（Lead Story）；Blocked 0。Lead Story 可进入 draft Definition/Preview，但不得声称常规手动 Editor 已有可见 title/deck 编辑 UI。
- 审计结论为 **GO**：可在用户批准 `F3-A6-D01` 后从 F3-B1 Quiet 开始 draft Definition 实现。draft 条目在正常产品 resolver 中不可用，用户批准前不得设为 `active`。
- 本阶段只新增 [Anchor Readiness Audit](./anchor-readiness-audit.md) 并更新本日志与总计划顶部；没有创建 Definition/CatalogEntry，没有修改产品代码，没有运行项目代码测试，没有启动服务器/浏览器，已停止在 F3-A6 / F3-B Readiness Gate。

## 2026-08-13 — Phase F3-B1 Quiet Draft Implementation

- 用户授权进入 F3-B1；本批只实现 `quiet-held-field-v1`、`quiet-scale-echo-v1`、`quiet-horizon-bridge-v1`，三项 Definition 与 CatalogEntry 均保持 `draft`。
- 新增按家族拆分的 Quiet Definition 文件与无循环 runtime Definition registry。Contract 继续拥有 schema/validator；Catalog、Draft refresh 与未来 formal families 通过 registry 精确解析，Reference Definitions 仍只附加在 development 层。
- 三项使用同一 Quiet neutral theme 与 `DEFAULT_RECIPE_TYPOGRAPHY`；Slot ID、rect、scope、照片数量、Note relation 与 Horizon `cross-gutter-photo` evidence 均与获批 Brief 一致。审计文档中的四个 Slot 简称已修正为正式 ID。
- 新增独立 Quiet formal Preview Matrix：Held 12、Scale 16、Horizon 13 个场景组，共 82 个 Editor/Reader cells。Scale ratio fixture 均为 exact-2；Horizon 左右计划共享同一 placement；没有 Quiet-specific Renderer 分支。
- 自动化门禁通过：typecheck；lint 0 warnings；54 test files / 277 tests；Next.js 16.2.10 production build；`git diff --check`。
- 完整记录见 [F3-B1 Quiet Implementation Record](./f3-b1-quiet-implementation-record.md)。本批未启动服务器/浏览器或浏览器自动化，已停止在 Quiet 用户视觉 Gate；未进入 F3-B2，未把条目设为 active。

## 2026-08-13 — F3-B1 Quiet Gate 通过 / F3-B2 Editorial 授权

- 用户已完成 Quiet Preview Matrix 人工视觉检查并通过，F3-B1 Gate 正式通过。
- `quiet-held-field-v1`、`quiet-scale-echo-v1`、`quiet-horizon-bridge-v1` 继续保持 `draft`；不进入正式菜单。
- 当前实现进度为 **3/15**，本批授权执行 F3-B2 Editorial，顺序为 Evidence Aside → Across the Record → Lead Story。

## 2026-08-13 — Phase F3-B2 Editorial Draft Implementation

- 用户已授权进入 F3-B2；按 Evidence Aside → Across the Record → Lead Story 顺序新增三个 formal Definition、精确 id/version Registry 查询、draft Catalog Entry 与开发 Preview Matrix。
- 三个 Definition 均保持 `draft`，没有 legacy 映射、Color Field、专用 Renderer 分支或 visible authored-text editor UI。正式 active resolver 与正式菜单不接受 Editorial。
- Editorial Preview Matrix 使用真实 data-URL fixture；共 59 个场景组 / 118 个 Editor-Reader cells，覆盖 Photo Note 绑定、required cross-page-pair、unplaced、固定几何、focus、AuthoredTextItem/Application、owner/contentKey 与 global title/textBySlotId 防替代。
- 新增 `editorial-recipe-definitions.test.ts` 与 `editorial-recipe-matrix.test.ts`；全量结果为 56 个测试文件 / 287 项测试通过。
- `npm run typecheck`、`npm run lint -- --max-warnings=0`、`npm run build` 与 `git diff --check` 全部通过；没有启动服务器、浏览器或浏览器自动化。
- 本批停止在 **Editorial 用户视觉 Gate**。Lead Story 的可见 authored-text 编辑 UI、Evidence Aside 窄证据图可辨认性、Across the Record 的真实装订/左右职责仍需用户手动检查；不自动进入 F3-B3。

## 2026-08-13 — Phase F3-B2.2 Canvas-relative Typography & Line-fit Reality Closure

- User mobile/Preview evidence showed the prior estimator and viewport-sized Renderer text disagreed: Evidence maximum wrapped to roughly six lines and Lead deck wrapped into the photo area.
- Added shared canvas-relative role metrics, deterministic Unicode-aware line fitting, Canvas query-container typography, px fallback, Render Plan diagnostics, and pressure fixtures. Editorial Matrix is now 66 scenario groups / 132 Editor-Reader cells; maximum limits remain 60/4, 76/2, 60/3, and 120/4.
- No Editorial Recipe was activated, no geometry or photo area changed, and the work stops at the Editorial Typography Reality user visual Gate. Automated tests do not replace the required browser/font visual check.

## 2026-08-13 — Phase F3-B2.1 Editorial Text Capacity Consistency Closure

- 按用户裁决收口不可达的容量规格：Evidence Aside Note 为 60 字符 / 4 行；Lead Story deck 为 76 字符 / 2 行；Across the Record 维持 120/4，Lead Story title 维持 60/3。
- 现有确定性行数估算、Slot 几何、Typography Role、Renderer/Render Plan 与照片布局均未修改；换行符计入 `maxCharacters`。Preview Matrix 改用精确合法最大值，并保留字符数合法但超过行数的负向 fixture。
- 三个 Editorial Definition 继续为 `draft`，正式菜单数量不增加；本批不是 Editorial 用户视觉批准，也不进入 F3-B3。

## 2026-08-14 — F3-B2.2 Typography Reality 用户视觉 Gate 通过 / F3-B3 授权

- 用户已通过 F3-B2.2 移动端真实换行复验：Evidence 最大 Note 与 Lead 最大 deck 不再产生额外换行或侵入照片。
- Lead Story title 60/3、Across the Record Note 120/4、Quiet Scale Echo 最长 Note 三个全局 Typography 回归点均通过。
- Editorial 三项继续保持 `draft`；视觉 Gate 通过不等于 `active`，正式菜单数量不增加。
- 当前实现及人工视觉通过进度为 **6/15**；正式授权进入 F3-B3 Grid/Contact，未进入 F3-B4 Dynamic。

## 2026-08-14 — F3-B3-D01 Cross Register Folio Specification Closure

- 协调 Gate 批准 `folio-left` rect `{x:.06,y:.905,width:.125,height:.02}`、left/start，以及 `folio-right` rect `{x:1.815,y:.905,width:.125,height:.02}`、right/end。
- 两项均为 optional `static-text`、`page-number`、role `folio`、`muted-ink` on `paper`、z 20；完整位于 Cross Register safe area，且不进入 gutter。
- 本决策只补齐已批准 Anchor Brief 缺失的精确外下角坐标，不重新设计 Cross Register，也不改变任何 Photo Slot、Note Slot、relation 或 spread evidence。

## 2026-08-14 — Phase F3-B3 Grid/Contact Draft Implementation

- 已实现 `grid-contact-twin-register-v1`、`grid-contact-twelve-up-ledger-v1` 与 `grid-contact-cross-register-v1` 的 formal draft Definition、精确 Registry resolver、draft Catalog Entry 和独立 Preview Matrix；三项均无 legacy 映射，active/menu 数量仍为 6。
- `F3-B3-D01` 已作为获批 Brief 的规格补全写入 Cross Register：两个 folio 精确位于 safe area 内并排除 gutter；左、右 Render Plan 分别读取自己的 page number。其余已批准 Grid/Contact 坐标未改变。
- Grid/Contact Matrix 为 Twin 14、Twelve-up 16、Cross 24，共 **54 个场景组 / 108 个 Editor-Reader cells**。Cross 使用一个 shared Application 保持四项 `photoId → record slot → noteOfPhotoId → index-notes` 绑定、顺序与四条 `cross-page-pair` evidence。
- 自动化 Gate 通过：typecheck；ESLint 0 warnings；58 test files / 307 tests；Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成。完整记录见 [F3-B3 Grid/Contact Implementation Record](./f3-b3-grid-contact-implementation-record.md)。
- 未修改 Contract，未添加 Recipe 专用 Renderer 分支，未激活 Recipe，未启动服务器/浏览器/浏览器自动化，未进入 F3-B4。当前实现进度为 **9/15**，其中用户人工视觉通过仍为 **6/15**；本批停止在 Grid/Contact 用户视觉 Gate。

## 2026-08-14 — Phase F3-T1 Zine Typography Art Direction & Font System Decision

- 在 F3-B3 与 F3-B4 之间插入 typography reality 阶段：Grid/Contact 用户视觉 Gate 暂停，F3-B4/F3-B5 均未授权；F3-T1 只做研究、审计与用户裁决材料。
- 完成 [Typography Source Dossier](./typography-source-dossier.md)：28 个直接来源，覆盖 10 个 publisher/official project group；Adobe/Source Han 7 项、CJK/许可 17 项、摄影书/编辑设计 6 项。明确 Adobe Fonts 订阅 web 服务不是本产品的 self-host 字体来源；Source Han/Noto、Geist、Bodoni Moda 与 IBM Plex 只从官方 upstream/OFL 路径进入候选。
- 完成 [Typography Art Direction](./typography-art-direction.md)：审计现有 Geist 29,288 B、Geist Mono 23,108 B、Bodoni Moda 25,804 B，以及共享 renderer 仍全局使用 Geist Sans 的事实；提出 S1 Duplex Photo-Essay、S2 Plex Unified Archive 与 S3 Moda-First Fashion Gloss 三套系统。S1 与 S2 均为 86/100；推荐 S1、锁定 S2 为唯一 fallback；S3 虽有强拉丁 display 吸引力，但因 CJK hard fail 以 69/100 淘汰。
- 提出 3 个受控 preset：P1 `photoessay-display`、P2 `photoessay-field`、P3 `photoessay-register`。每个 preset 都锁定 title/deck/label/folio/caption/note/index 的 normalized page-width size、weight、line-height、tracking、transform，并映射 Quiet、Editorial、Grid/Contact、Dynamic、Chromatic；Recipe 不获得任意 `fontFamily`。
- 完成 [Typography Specimen Matrix](./typography-specimen-matrix.md)：固定 28 条繁中/简中/英文/混排/数字/标点内容、6 个 canvas/device 条件、10 个 Anchor 回归点、locale routing、font-ready/loading、Editor/Reader parity、asset manifest 与 hard fail。所有 cell 当前为 `not-run`，没有以文献或评分冒充真实字体视觉结果。
- 用户待裁决 D01–D08：官方 self-host source policy、S1 主系统、S2 fallback、P1/P2/P3、SC/TC script policy、现行离散 metrics + estimator 重测、payload policy、完整 specimen Gate。批准只授权下一阶段 F3-T2，不批准则保持当前实现与暂停状态。
- 本批未下载/新增/修改任何字体文件，未修改 TS/TSX/CSS/测试/Recipe Definition/Token，未运行项目测试或构建，未启动服务器/浏览器，未激活 Recipe，未进入 F3-T2/F3-B4。停止在 **Phase F3-T1 Typography Art Direction 用户裁决 Gate**。

## 2026-08-14 — F3-T1 用户裁决通过 / Phase F3-T2 Runtime Reality Implementation

- 用户批准 D01–D08 与 P1/P2/P3，并追加 P1 仅 `title` 使用 serif、`deck` 固定 sans；locale 为 Zine 文档语义，禁止随机系统字体 fallback。
- 固定 Google Fonts commit `73fc2ff52147e34a74804b500cf89ca219eac55d` 的 Noto Sans/Serif SC/TC variable 来源及 IBM Plex commit `bf260093582f04622aacc1e9f9ca604d7ccd0c42` 的 S2 静态 fallback；21 个 WOFF2 的 filename/bytes/SHA-256/license/upstream 全部写入 manifest，生成真实 glyph coverage index。
- Contract 只新增 product-owned `typographyPreset` enum；Recipe 不能注入任意 font-family/CSS。Quiet→P2、Editorial→P1、Grid/Contact→P3；P1 deck 由测试锁为 support sans。CJK tracking/uppercase 钳制，`font-synthesis:none`。
- `ZineDraft.locale` 必填并贯穿 Name UI、manual structure、Reader page、HTML `lang`、Render Plan 与 Renderer。覆盖不足产生 `unsupported-glyph` 并让 plan invalid，不委托 OS fallback。
- 新增 `/zine/typography-specimen`：28 条固定内容 × 3 presets × S1/S2 × Editor/Reader = 84 cards / 336 canvases。360px/1440px 本地浏览器无横向溢出、无 overlay/console error，168 对 computed typography Editor/Reader 零差异；T28 形成 12 个预期 invalid canvas。
- 自动化 Gate：typecheck、ESLint 0 warnings、60 test files / 315 tests、Next 16.2.10 production build 全通过。完整记录见 [F3-T2 Typography Runtime Reality Record](./f3-t2-typography-runtime-reality-record.md)。
- 未激活 Recipe，未恢复 F3-B4/F3-B5。停止在 **Phase F3-T2 Typography Reality 用户视觉 Gate**；用户需比较关键 specimen 并回归 9 个已实现 Anchor。
