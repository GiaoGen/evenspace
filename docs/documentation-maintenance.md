# EventSpace 文档维护规范

> 目的：让每次代码推进、GitHub push 或阶段收口后，都能稳定同步重要文档，避免代码已经变化但计划书、架构说明和任务记录滞后。  
> 使用方式：后续可以直接要求“按 `docs/documentation-maintenance.md` 做一次文档同步”。

## 基本原则

- 文档必须服务当前项目判断：哪些已经完成、哪些只是本地 mock、哪些仍需后端实现。
- 不为了“看起来完整”夸大能力；本地浏览器能力、真实后端能力、生产安全能力必须分开写。
- 文档同步默认不修改业务代码。
- 能用 Git diff 时，优先基于 `git diff`、`git log`、`git show` 判断变化；不能用 Git 时，才用文件时间、代码搜索和现状审查补记。
- 每次较大功能完成后，至少更新 `docs/task.md`。
- 文档内容要用中文写清楚结论，必要的文件名、命令、字段名保留英文。

## 每次 Push 后的推荐流程

1. 查看当前 Git 状态：

```bash
git status --short
git log --oneline -5
```

2. 查看最近变更：

```bash
git diff HEAD~1..HEAD --stat
git diff HEAD~1..HEAD
```

3. 判断变更类型：

- UI / 页面结构
- 本地状态 / mock reducer
- 数据模型 / domain 类型
- 权限 / 成员 / 治理
- 媒体 / 上传 / 画板
- 投票 / 行程 / 聊天
- 构建 / 字体 / 配置
- 后端接入准备
- 安全 / 隐私 / 合规

4. 按下方规则更新对应文档。

5. 验证：

```bash
npm run check
npm run build
```

6. 在最终回复中说明：

- 更新了哪些文档
- 哪些文档不需要更新，原因是什么
- 当前验证结果
- 发现的后端接入风险或遗留问题

## 文档职责与更新规则

### `docs/task.md`

作用：当前任务记录和项目真实进度。

更新频率：最高，每次功能级 push、修复级 push、构建状态变化、阶段总结都要更新。

必须记录：

- 本次完成了什么
- 哪些是真实本地能力
- 哪些只是 mock
- 验证命令和结果
- 已知 warning / bug / 遗留事项
- 下一步建议

不应记录：

- 过早的详细后端 schema
- 已经过期的大段历史任务
- 没有代码依据的完成声明

### `docs/interactive-mock-coverage.md`

作用：说明当前可操作 mock 覆盖到哪里，防止把界面入口误认为真实生产能力。

更新触发：

- 新增或删除正式路由功能
- Chat、Board、Itinerary、Rooms、Join、Account 的可操作范围变化
- mock 能力从“视觉入口”变成“真实本地状态”
- 某个能力仍只是 mock，需要重新声明边界

必须写清：

- 当前能操作什么
- 数据保存在哪里
- 刷新/重进后是否保留
- 哪些不能宣称完成

### `docs/local-first-static-implementation-plan.md`

作用：本地优先阶段的执行计划。

更新触发：

- 本地持久化策略变化
- 从 fixture/mock 迁移到真实本地数据
- 图片、画板、房间、聊天、投票等本地数据闭环变化
- 当前阶段优先级变化

重点：

- 明确哪些阶段已完成、部分完成、未完成
- 明确哪些能力后续要替换为后端 repository
- 不要把未实现的 IndexedDB、PWA、离线能力写成已完成

### `docs/mock-mvp-architecture.md`

作用：说明 mock MVP 架构、目录边界、状态流和后端可替换性。

更新触发：

- `MockSession`、command、reducer、provider 改动
- domain 类型变化
- data contract / repository 边界变化
- localStorage / sessionStorage / IndexedDB 策略变化
- mock runtime / production guard 变化

必须关注：

- UI 是否直接依赖 mock
- command 是否能映射为未来后端 mutation
- 是否有过大的组件或 reducer 需要拆分
- 权限逻辑是否重复或漂移

### `docs/product-specification.md`

作用：第一版产品规则和功能规格。

更新触发：

- 产品规则变化
- 房间生命周期变化
- 角色权限变化
- 投票规则变化
- 画板、聊天、行程等核心体验规则变化

不必更新：

- 单纯样式微调
- 没改变产品规则的布局修复
- 内部代码重构

### `docs/requirements-baseline.md`

作用：需求基线，类似产品“宪法”。

更新频率：低。

更新触发：

- 用户明确改变核心需求
- 产品边界变化
- 目标用户、地区、合规、商业模式变化
- 临时房间、匿名身份、治理模式等根规则变化

注意：

- 不要频繁改。
- 如果改，必须说明为什么需求基线变化。

### `docs/technical-architecture.md`

作用：长期技术架构方案。

更新触发：

- 后端方案变化
- Supabase / Auth / Storage / Realtime / RPC 设计变化
- 数据流、部署、构建、安全 header、字体加载、PWA 策略变化
- 接后端前形成新的技术门槛

必须区分：

- 当前本地 mock 架构
- 未来生产后端架构
- 从前者迁移到后者的步骤

### `docs/security-data-specification.md`

作用：安全、隐私、数据、权限、媒体、合规边界。

更新触发：

- 身份、成员、权限、治理逻辑变化
- 图片/语音/媒体处理变化
- 数据保留、删除、归档变化
- 举报、封禁、审计、反滥用变化
- 后端安全设计变化

必须保守：

- 客户端校验不能写成生产安全
- mock 权限不能写成真实授权
- 本地图片处理不能写成正式隐私保护

### `docs/page-wireframes.md`

作用：页面线框、信息层级、主要区域位置。

更新触发：

- 页面结构变化
- 主导航或 tab 变化
- 底部工具栏、弹层、全屏覆盖层变化
- 移动端布局原则变化

不必更新：

- 单个按钮的颜色或 1-2px 间距
- 不影响信息结构的视觉微调

### `docs/design-system-specification.md`

作用：设计系统、字体、颜色、组件规则、动效边界。

更新触发：

- 形成新的通用组件规则
- 字体、颜色 token、阴影、圆角、动效策略变化
- Poll 卡片、Board 工具、Rooms 卡片、输入栏等模式沉淀为可复用规范

不必更新：

- 一次性页面样式
- 未稳定的视觉尝试

### `docs/visual-design-brief.md`

作用：整体视觉方向简报。

更新频率：低到中。

更新触发：

- 整体审美方向变化
- 品牌感、材质、字体气质、移动端视觉原则变化
- 用户明确推翻或新增大方向

### `docs/history_taks.md`

作用：历史任务归档。

更新频率：低。

更新触发：

- `docs/task.md` 过长，需要迁移旧任务摘要
- 阶段收口，需要把旧阶段记录归档

注意：

- 当前文件名按项目既有约定保留为 `history_taks.md`。
- 不要随便重命名，避免链接断掉。

### `docs/prototype-coverage.md`

作用：历史高保真原型覆盖清单。

更新频率：很低。

更新触发：

- `/prototype` 路由的定位变化
- 重新启用或删除 prototype 体系

一般情况下不需要随着正式 mock 功能更新。

## 变更类型到文档的映射

| 变更类型 | 必查文档 |
| --- | --- |
| 新增/修复具体功能 | `task.md`, `interactive-mock-coverage.md` |
| 本地持久化变化 | `task.md`, `local-first-static-implementation-plan.md`, `mock-mvp-architecture.md` |
| Mock command/reducer 变化 | `task.md`, `mock-mvp-architecture.md` |
| 产品规则变化 | `task.md`, `product-specification.md`, 必要时 `requirements-baseline.md` |
| 页面结构变化 | `task.md`, `page-wireframes.md` |
| 通用设计模式变化 | `task.md`, `design-system-specification.md` |
| 后端接入策略变化 | `task.md`, `technical-architecture.md`, `security-data-specification.md`, `mock-mvp-architecture.md` |
| 权限/身份/成员变化 | `task.md`, `product-specification.md`, `security-data-specification.md` |
| 图片/语音/媒体变化 | `task.md`, `interactive-mock-coverage.md`, `security-data-specification.md`, `technical-architecture.md` |
| 构建/字体/配置变化 | `task.md`, `technical-architecture.md`, 必要时 `design-system-specification.md` |
| 阶段收口 | `task.md`, `history_taks.md`, 相关专项文档 |

## 推荐给 Codex 的固定提示词

```text
我已经 push 了最新代码。
请按 docs/documentation-maintenance.md 做一次文档同步。
基于 git diff / git log 判断最近变化。
只更新必要文档，不改业务代码。
完成后运行 npm run check 和 npm run build。
最后告诉我更新了哪些文档、哪些重要文档不需要更新，以及当前后端接入风险。
```

如果当前 Git 不可用，则使用：

```text
当前 Git 不可用。
请按 docs/documentation-maintenance.md，用代码现状、文件修改时间和关键功能搜索做一次文档同步。
只更新必要文档，不改业务代码。
```

## 完成标准

一次合格的文档同步应该满足：

- `docs/task.md` 能准确说明当前真实进度。
- 所有高重要度文档没有明显过时说法。
- 本地 mock、真实本地数据、生产后端能力边界清楚。
- 验证命令结果被记录。
- 没有把未实现能力写成已完成。
- 没有为了更新文档而改业务代码。
