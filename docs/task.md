# EventSpace 当前任务记录

> 最后更新：2026-07-18  
> 用途：记录最近任务做了什么、当前真实进度、验证结果、遗留事项和下一步。  
> 规则：本文件保持为当前阶段活文档；更早阶段摘要迁移到 [`history_taks.md`](./history_taks.md)。  
> 注意：当前工作区的 `.git` 元数据为空，无法使用 `git diff` 追溯历史差异；本次补记依据代码现状、文件修改时间、功能搜索和既有文档对比完成。

## 项目当前状态

- 当前阶段：移动端优先的本地优先 Mock / 静态真实数据版本，尚未接入后端。
- 正式产品路由已经从静态原型进入可操作状态，主要页面共享一套 `MockSession` 本地状态。
- 浏览器持久化当前使用 `localStorage` 键 `eventspace:local-session:v1`，并兼容读取旧的 `sessionStorage` 键 `eventspace:mock-session:v3`。
- 当前已经支持创建房间、房间列表、聊天、投票、画板、行程、成员治理、归档、账号本地身份与法律草稿页面。
- 图片和涂鸦目前会压缩/绘制为 `imageDataUrl` 后写入本地 JSON 状态；这能支持本地演示和移动端验证，但不是最终后端媒体方案。
- 生产构建不再依赖远程 Google Fonts / `next/font` 拉取；字体资源已通过 `public/fonts` 的本地 `@font-face` 加载，保留 Bodoni 衬线标题风格。
- `/prototype` 系列路由只作为视觉历史参考，不再代表当前功能完成度。

## 最近完成任务

### TASK-010 - 建立文档维护规范

- 日期：2026-07-18
- 状态：已完成。
- 目标：让后续每次 GitHub push 后，都能按固定规则同步重要文档，避免任务记录、架构说明和产品规格滞后。
- 完成内容：
  - 新增 `docs/documentation-maintenance.md`。
  - 明确每份 docs 文档的职责、更新频率、触发条件和不需要更新的情况。
  - 明确 push 后推荐流程：查看 git status/log/diff，判断变更类型，更新对应文档，运行 `npm run check` 与 `npm run build`。
  - 提供后续可直接使用的 Codex 固定提示词。
- 关联文档：
  - [`documentation-maintenance.md`](./documentation-maintenance.md)

### TASK-009 - 移动端优先的 Room / Board / Chat 深度优化

- 日期：2026-07-16 至 2026-07-18
- 状态：已完成当前轮，仍需持续移动端真机复核。
- 目标：围绕 `/rooms/[roomId]` 的高频功能，把 mock 从展示型页面推进到更接近真实使用的本地交互。
- 完成内容：
  - Chat 输入栏固定在底部，修复空聊天时输入框漂移、重新进入房间后输入框消失的问题。
  - 自己发送的消息改为右侧展示，并在发送后自动滚动到最新消息；其他用户新消息不强制抢滚动。
  - 输入栏支持语音模式切换，语音按钮内置在输入框右侧，语音条显示 `hold to record`。
  - 原语音入口改为加号工具按钮，底部托盘承载搜索、Poll、Votes 等工具。
  - Poll 创建器支持 yes/no、选项投票、行程投票；支持 open minutes、匿名/公开、负责人、行程时间、地点和容量。
  - 聊天区投票卡支持投票后进度条百分比展示；已投过票的当前投票不再作为内联卡片重复显示。
  - 新增全屏 Poll History / Votes 覆盖层，最新投票排在顶部，卡片样式跟随聊天室投票卡。
  - Room 顶部房间信息显示倒计时，不再显示冗余结束时间文本。
  - Board 改为移动端优先的无限画布体验：单指平移、双指缩放、进入时自动 fit 到当前全部画板内容。
  - Board 缩放不再限制到不合理范围，拖动已选内容时按当前缩放反算位移，保证跟手。
  - Board 照片按原图比例显示，画框贴近真实内容，不再固定比例造成大面积空白。
  - 单指滑动画布时碰到照片/内容不再阻断画布手势；双指落在照片上也优先触发画布缩放。
  - Board/Sequence 切换集成到顶部主 tab 的 Board 项，不再在画板内部显示独立切换条。
  - Sequence 改为单列纵向流，照片/文本/涂鸦按内容比例展示，不显示文件名。
  - 画板右下角工具拆分为相机、相册、文本、画线、画布背景等独立图标。
  - 相机/相册入口可以读取真实图片文件，进行本地压缩和尺寸记录；移动端不支持或读取失败时给出错误。
  - 文本标注有预览输入层，默认不弹出键盘；文本内容驱动标注尺寸，可选中后拖动角点调整大小。
  - 点击照片上部显示头像昵称、弹幕评论和输入框；头像昵称在照片内部左上角。
  - 画板照片、文本、涂鸦在本人拥有或有管理权限时显示右上角删除按钮；点击画布空白处会结束当前编辑状态。
  - 新增全屏涂鸦板：底部悬浮画笔、颜色、橡皮、清空、关闭和添加按钮；支持双指缩放和平移。
  - 涂鸦板去掉旋转功能，涂鸦作为画板 item 添加后只支持移动、缩放和删除。
  - 涂鸦 brush 滑块调整时显示跟随颜色和大小的圆形预览，非调整时隐藏。
  - Rooms 卡片预览真实画板内容，使用与 Board 默认 fit 类似的缩放和位置；文本大小和位置随真实画板 item 同步。
  - Rooms 支持 All / Active / Achieved / Favorite 筛选，默认 All，Active 排在前面。
  - Rooms 支持编辑模式：收藏按钮仅编辑态显示在左上角，删除按钮显示在右上角。
  - 到期房间在 Rooms 展示层按结束时间自动归入 Achieved。
- 验证：
  - 已在实现过程中反复针对桌面 Chromium 与移动端访问场景修复。
  - 需要继续用 iOS Safari / Android Chromium 对相机、相册、画布手势、键盘弹出和全屏涂鸦板做真机回归。

### TASK-008 - Rooms/New 创建与邀请完成页优化

- 日期：2026-07-17
- 状态：已完成当前轮。
- 目标：修复移动端创建房间与邀请完成页体验，使本地创建结果能够回到 Rooms 并打开对应房间。
- 完成内容：
  - `/rooms/new` Step 3 改为小时/分钟两个纵向滚轮，减少移动端操作冲突。
  - 创建成功页去掉 `create another` 和 `back to rooms`，保留 `Open this room`。
  - 邀请信息改为邀请卡片：左上角显示房间名，中央根据邀请方式显示 mock QR 或邀请码，底部展示时长、结束时间、人数。
  - 邀请卡片外左下角提供 `Save card`，右下角提供 `Open this room`。
  - 创建完成后通过 `CREATE_ROOM` 命令写入本地 session，并拿到新房间 public id 供打开。
- 遗留：
  - `Save card` 当前是视觉按钮，尚未实现真实导出图片。
  - 真实 QR 生成、邀请链接发送、后端 room id 与 invite revision 仍待后端阶段实现。

### TASK-007 - 代码规范与后端接入准备度审查

- 日期：2026-07-18
- 状态：已完成审查，未改业务代码。
- 结论：
  - 当前代码整体分层方向可继续推进：`core/domain`、`core/security`、`data/contracts`、`features/mock-session`、页面组件之间的边界基本清晰。
  - 后续后端接入不会是简单替换接口，必须把身份、权限、成员资格、投票、媒体、归档、审计和服务端时间重新落到服务端。
  - 当前 `MockSession` reducer 已承担大量命令校验和状态转换，适合 mock 阶段，但后端阶段需要拆成可映射 RPC / Server Action / repository mutation 的边界。
  - 能力推导在 `core/security/room-capabilities.ts` 和 mock session 中存在重复趋势，后端前应统一为一套策略契约，避免规则漂移。
  - `features/room/components/board-panel.tsx`、`features/room/components/chat-panel.tsx`、`features/create-room/components/create-room-wizard.tsx` 已经很长，后续接后端前建议拆出数据编排 hooks 和纯展示子组件。
- 已知代码卫生问题：
  - `features/create-room/components/create-room-wizard.tsx` 仍保留未使用的 `TimingStep`，之前 lint 会提示 unused warning。
- 当前验证：
  - `npm run check` 通过。
  - ESLint 仍有 1 个 warning：`features/create-room/components/create-room-wizard.tsx` 的 `TimingStep` 未使用。
  - TypeScript `tsc --noEmit` 通过。
  - `npm run build` 通过，Next.js 16.2.10 生产构建成功。
- Git 状态：
  - 当前 `D:\eventspace\.git` 目录存在但没有 `HEAD` 等仓库元数据，`git status` 返回 `fatal: not a git repository`，因此无法 commit 或读取 diff。

### TASK-006 - 修复标准生产构建

- 日期：2026-07-15
- 状态：已完成。
- 完成内容：
  - 本地 `npm run build` 与 `npm start` 不再需要额外 mock 环境变量。
  - Vercel / Netlify 正式生产标记或 `EVENTSPACE_DEPLOYMENT=production` 仍默认阻止固定 Mock 身份。
  - 受控线上预览必须显式设置 `EVENTSPACE_MODE=mock`。
  - 字体切换为本地 `@font-face` 方案，避免 build 时拉取远程 Google Fonts，同时保留 Bodoni Moda 衬线标题。
- 验证：
  - 标准 `npm run build` 曾通过。
  - 需要在后续每次大改后继续执行 `npm run check` 与 `npm run build`。

### TASK-005 - 完整可操作 Mock 收口

- 日期：2026-07-14
- 状态：已完成。
- 完成内容：
  - 建立版本化 `MockSession`、纯 reducer 命令和集中能力派生。
  - 正式页面按 feature 拆分，避免把所有业务逻辑堆进单一 page 文件。
  - 建立 Mock / 生产边界，避免把客户端演示误认为后端安全实现。
  - 覆盖 `/`、`/rooms`、`/rooms/new`、`/rooms/[roomId]`、`/join`、`/join/[roomId]`、`/account`、`/legal/[document]`。

## 当前真实能力边界

### 已经具备的本地能力

- 本地创建房间、进入房间、Rooms 列表展示、筛选、收藏、删除个人入口。
- 本地聊天、回复、反应、撤回、置顶、搜索、语音条 mock。
- 本地投票创建、投票、结果进度、投票历史、行程型投票通过后添加行程。
- 本地画板照片上传、压缩、拖动、缩放、删除、评论弹幕、文本标注、涂鸦。
- Board 与 Rooms 卡片共享画板 item 的真实位置/大小预览逻辑。
- 本地行程创建、状态推进、参与状态、负责人、容量和地点文本。
- 成员审核、禁言、移除、拉黑、社区投票准入等 mock 治理状态。
- 房间 active / freezing / archiving / archived 生命周期 mock。

### 尚未具备的真实后端能力

- Supabase Auth、匿名身份认领、真实 session、RLS、RPC、Realtime。
- Postgres schema、迁移、唯一约束、事务、幂等键、服务端时间。
- 私有 Storage、图片 Blob 上传、EXIF 清理、转码、缩略图、签名 URL。
- 真实语音录制、音频上传、音频转码和麦克风权限处理。
- Stripe Checkout、webhook、退款、永久归档权益。
- PWA 安装、离线缓存、推送通知、邮件、Google Places / Maps API。
- 真实限流、设备封禁、审计日志、备份、数据清理任务和正式法律文本。

## 后端接入前必须解决

- 把 `imageDataUrl` 媒体存储迁移为本地 asset id / 未来 storage object key，而不是把大对象塞进房间 JSON。
- 把客户端 reducer 中的权限、投票、归档、成员资格校验映射为服务端事务和数据库约束。
- 为每类命令定义稳定 DTO：创建房间、发消息、创建投票、投票、上传媒体、移动画板 item、改行程、成员治理、归档。
- 明确 server time 规则，所有到期、投票关闭、撤回窗口、归档状态推进都不能信任客户端时间。
- 为移动端 Safari / Chromium 建立真机验收清单，尤其是文件上传、相机、键盘、viewport、Pointer Events、双指手势。
- 拆分超长 UI 组件，避免接后端时把数据请求、状态同步和复杂手势继续混在一个组件里。

## 下一步建议

1. 先做一次移动端真机回归：创建房间、上传照片、画布平移/缩放、长按移动、涂鸦板、聊天输入、Poll 创建与投票历史。
2. 修复已知 lint hygiene：移除或接回 `TimingStep`。
3. 把本地媒体从 `imageDataUrl` JSON 进一步抽象成 asset 引用，为 IndexedDB 或未来 Storage 做准备。
4. 为 `MockCommand` 列出后端 API / RPC 映射表，确定哪些命令需要事务。
5. 补充最小测试：domain 工具、mock reducer 命令、board fit、poll 投票规则、room 到期归档展示。
