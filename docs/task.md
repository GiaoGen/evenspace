# EventSpace 当前任务记录

> 最后更新：2026-08-02
> 用途：记录最近任务做了什么、当前真实进度、验证结果、遗留事项和下一步。  
> 规则：本文件保持为当前阶段活文档；更早阶段摘要迁移到 [`history_taks.md`](./history_taks.md)。  
> 本次同步范围：基于 `git log` / `git diff c70547e..HEAD` 的文档校准；只同步文档，不修改业务代码。

## 项目当前状态

- 当前阶段：Supabase-backed 封闭 MVP 接线推进中；正式房间、账号、邀请、成员治理、Chat 文本/语音、Photos、Itinerary 与 Realtime 已从纯本地 Mock 迁到真实 Supabase 读写路径。
- `MockSession` 仍存在，但在云端房间内主要作为 `RoomExperience` 的兼容前端状态外壳；`BackendSessionProvider.executeCommand` 会把支持的命令转成 Server Action / RPC / Storage 操作，失败后回滚到服务器快照。
- 结构化本地会话 `eventspace:local-session:v1` 与 IndexedDB `eventspace-local-assets` 继续服务本地 mock、录音/图片采集的上传前临时 Blob，以及旧数据兼容；它不是云端业务真相。
- 当前已经支持创建真实 Host-led 房间、真实邀请 token/code、可扫描 QR、匿名访客加入、待审核轮询、Host 审批、账号资料和头像上传、房间列表/详情、文字/语音 Chat、Photos 上传/评论/删除、行程和成员治理。Room 内联投票、Book 与回忆录编辑器仍不在当前正式范围。
- 图片、语音与头像均走 `assets` + 私有 `room-media` Storage + 短期签名 URL；图片上传当前生成 display / thumbnail / placeholder / dimensions / revision 元数据，客户端仍需先持有本地 Blob 才能上传，服务端负责成员资格、状态、配额、对象归属和 variant 字段约束校验。
- `/rooms`、`/rooms/[roomId]`、`/account` 和 viewer avatar 已增加浏览器快照/头像缓存与 IndexedDB 云端图片 read-through cache。它们只保存去签名 URL 的展示快照或媒体 Blob 加速读取，不是跨设备业务真相；权限、签名和最终内容仍以 Supabase 为准。
- 后端范围已冻结：仅 Host-led；Chat 文本/语音；Photos 与 Itinerary 进入首期；Stripe 一次性房间支付进入 MVP 但当前免费/封闭测试不阻塞；Book 延后设计，投票继续延后。
- 后端实施、验收和任务 Mark 统一以 [`supabase-backend-integration-plan.md`](./supabase-backend-integration-plan.md) 为主计划书。
- 生产构建不再依赖远程 Google Fonts / `next/font` 拉取；字体资源已通过 `public/fonts` 的本地 `@font-face` 加载，保留 Bodoni 衬线标题风格。
- `/prototype` 系列路由只作为视觉历史参考，不再代表当前功能完成度。

## 最近完成任务

### TASK-027 - 媒体变体、路线快照与 Rooms 性能同步

- 日期：2026-08-02
- 状态：代码已在最近多次提交中完成；本轮按维护规范补齐文档。Supabase 云端 migration、远端 types 和数据库测试仍需在具备 CLI/云项目权限的环境复核。
- 完成内容：
  - Photos 图片上传从单对象升级为 display + thumbnail + placeholder data URL + width/height + media revision；浏览器优先用 Worker 生成有界 JPEG，失败时回退主线程处理。
  - 新增 `prepare_room_media_upload_v2` / `finalize_room_media_upload_v2` 及兼容读取层；旧 asset schema 缺少 variant 字段时前端可退回 legacy display URL，避免灰度期直接崩溃。
  - 新增批量签名读 URL helper，房间卡片和详情可分别批量签 display/thumbnail，减少逐图请求。
  - `list_room_card_media` 投影从“每房间最多 5 张”改为返回全部 ready photos；Rooms 卡片只限制 UI 可见/渲染窗口，不再裁剪可横滑访问的照片集合。
  - Room Photos 引入 `eventspace:room-photo-cache:v3` manifest、display/thumbnail cache key、优先窗口和后台缓存；签名 URL 失效时触发回源刷新。
  - `/rooms`、Room detail、Account 与 viewer avatar 增加本地 snapshot/cache：保存前移除 `remoteUrl` / `avatarUrl` 等短期签名 URL，并以当前 viewer scope 隔离。
  - `/rooms` 卡片照片堆增加确定性入场、图片 decode 协调和有限渲染窗口；Grid/Magazine 切换增加布局淡出淡入并保留视觉锚点。
  - Account / Rooms / Room New / Room detail 路由新增 loading skeleton；`page-flip` 依赖和类型声明已移除，当前运行时不再携带 Book 翻页包。
- 真实能力边界：
  - 真实能力：私有媒体 variant 元数据、display/thumbnail 双对象上传签名、短期读签名批量生成、房间卡片全量照片投影、浏览器侧去签名快照缓存和云端图片 read-through cache。
  - 仍不是完整生产媒体流水线：图片重编码目前发生在浏览器，服务端仍需补 magic number 校验、可信解码/转码、EXIF 清理证明、恶意文件扫描、生命周期清理和后台再处理。
- 已知问题：
  - `SUPABASE_SECRET_KEY`、Auth redirect / `EVENTSPACE_APP_ORIGIN`、Supabase migration 应用状态仍属于环境验收项。
  - snapshot/cache 只能改善当前设备二次打开体验；权限变化后仍必须依赖服务端 no-store 快照刷新和短期签名 URL 重新生成。
  - `core/domain/avatar.ts` 中 `ring` avatar 文本疑似编码异常仍未在本轮文档同步中修改。
- 验证：
  - 2026-08-02 `npm run check` 通过（ESLint + `tsc --noEmit`）。
  - 2026-08-02 `npm run build` 通过；Next.js 16.2.10 生产构建完成，未复现 2026-07-30 的 `.next/server-3101.error.log` EBUSY 锁文件问题。
  - 2026-08-02 `git diff --check` 通过；仅有工作区 LF/CRLF 提示，无 whitespace error。
- 下一步：
  - 应用并复核 `photo_media_variants`、`room_media_read_projection` v2、PostgREST schema cache reload 和 v2 RPC 参数名修复 migration。
  - 运行 `npm run supabase:types:check`、`npm run supabase:test:db`，确认 `025-room-card-media-projection.test.sql` 与既有头像/媒体测试通过。
  - 对 iOS Safari / Android Chromium 真机验证 12 MB 图片输入、HEIC/Live Photo 静态化、Worker fallback、Rooms 卡片横滑全量照片和签名 URL 过期刷新。

### TASK-026 - 云端头像、访客加入与真实邀请二维码同步

- 日期：2026-07-30
- 状态：代码 diff 已完成，文档本轮同步；云端 migration / Supabase CLI 验证仍需按环境权限复核。
- 完成内容：
  - 新增通用 `Avatar` 组件和 `core/domain/avatar.ts`，`PersonSummary`、viewer、join request 和 itinerary responsible 均可携带 `avatarUrl`。
  - `/account` 支持已登录账号上传 JPEG/PNG/WebP 头像：Server Action 调用 `prepare_profile_avatar_upload` / `finalize_profile_avatar_upload`，浏览器用 signed upload token 写入私有 `room-media`，完成后回写 `profiles.avatar_asset_id`。
  - 头像会同步到默认跟随 profile 的 `room_members`；已有自定义房间头像不被覆盖，新建 membership 默认继承当前 profile avatar。
  - `/join/[roomId]` 会读取已登录用户昵称和头像；未登录提交时先 `signInAnonymously`，再 `bootstrap_identity`，随后调用 `join_room_with_profile`。
  - 待审核加入返回真实 `requestId`，前端每 3 秒调用 `/join/status` 轮询 `get_join_request_status`；审批通过后自动进入房间，被拒绝时停留在拒绝状态，不加载房间内容。
  - 邀请卡、Room share 面板和下载 PNG 从假 QR 图案改为 `qrcode` 生成的真实邀请 URL；`next.config.ts` 允许渲染当前 Supabase 项目的私有签名 Storage 图片。
  - Photos / voice / comment / delete 命令通过 `executeCommand` 返回明确错误文案，失败后回滚到服务器快照，避免乐观 UI 停留在未持久化状态。
  - 新增 migration：`fix_media_rpc_argument_names`、`room_identity_avatars_and_guest_join`、`room_avatar_asset_indexes`、`sync_profile_avatar_to_rooms`；新增 pgtap 覆盖头像字段、权限、审核头像复制和 profile avatar 同步。
- 真实能力边界：
  - 真实能力：账号头像上传、私有 Storage 签名读写、profile / membership avatar 关联、匿名访客 Auth、加入请求状态轮询、真实可扫描 QR。
  - 仍不是完整生产安全闭环：头像与媒体仍依赖 `SUPABASE_SECRET_KEY` 环境配置；Turnstile、正式限流、匿名身份清理、正式 SMTP/生产域名、Supabase Dashboard redirect URL 仍需环境侧验收。
- 已知问题：
  - `core/domain/avatar.ts` 当前 diff 中出现疑似编码异常字符，可能影响 `ring` avatar 文本显示；本轮按文档同步规则未改业务代码。
  - `docs/room-ui-baseline.test.ts` 的哈希已更新，但原 `docs/room-ui-baseline.md` 也必须同步，否则说明与测试不一致。
- 验证：
  - 2026-07-30 `npm run check` 通过；ESLint 保留 8 个既有 warning，均为 `features/room/components/chat-panel.tsx` 中历史 Poll/Votes 兼容变量未使用。
  - 2026-07-30 `npm run build` 未完成：Next build 在清理 `.next/server-3101.error.log` 时返回 `EBUSY: resource busy or locked`，连续两次复现，未进入业务编译阶段。普通 `Get-Process` 可见多个 `node.exe` 进程，但当前环境不允许读取进程命令行，故未擅自终止进程。
  - 2026-07-30 `git diff --check` 通过；仅有工作区 LF/CRLF 提示。
- 下一步：
  - 复核 Supabase migration 是否已应用到目标云项目，并运行 `npm run supabase:types:check` / `npm run supabase:test:db`。
  - 释放占用 `.next/server-3101.error.log` 的进程或清理构建目录后重跑 `npm run build`。
  - 补齐移动端真实登录、匿名访客加入、头像上传、QR 扫描和 Host 审批的手动验收记录。

### BACKEND-004 - Supabase 依赖与环境安全边界

- 日期：2026-07-27
- 状态：完成；主计划书中的 `BE-004` 已同步 Mark，现有 UI 与 Mock 数据流未改变。
- 完成内容：
  - 精确锁定 `@supabase/supabase-js@2.110.8`、`@supabase/ssr@0.12.3`、`zod@4.4.3` 和 `server-only@0.0.1`。
  - 建立纯环境 schema、browser-safe public 配置模块和带 `server-only` 标记的 secret 配置模块。
  - `next.config.ts` 在 Next 配置加载阶段验证 public URL/publishable key；`instrumentation.ts` 在 Node 服务实例启动时验证已配置的 secret。
  - `.env.local` 继续只保存云项目 URL 和 publishable key；server secret 尚未配置，也没有进入仓库。
  - 增加 public/server 环境、错误脱敏和 server-only 导入边界测试。
  - 所有项目级 Supabase CLI 脚本显式使用 `--agent no`，避免 Agent 自动检测将交互命令切成 JSON 非交互模式。
  - 已向 Supabase 技能维护者提交兼容性反馈：<https://github.com/supabase/agent-skills/issues/188>。
- 验证：
  - 错误 public 环境导致 `next build` 退出码 1，恢复真实 `.env.local` 后退出码 0。
  - `npm run check`、`npm test`、`npm run build` 和 `git diff --check` 通过。
  - 6 个测试文件共 26 个测试通过；仍为 9 个既有 ESLint warning。
- 已知问题：
  - `npm audit --omit=dev` 的官方 registry 与当前镜像 audit endpoint 均发生 TLS 连接中断，未执行 `npm audit fix --force`。
- 下一步：
  - 执行 `BE-005`：建立 browser、request-scoped server 和 admin Supabase client 边界，但继续不替换现有业务 UI。

### BACKEND-003 - Supabase 云端开发项目创建与连接

- 日期：2026-07-27
- 状态：完成；主计划书中的 `BE-003` 已同步 Mark。
- 已完成：
  - 精确锁定项目内 Supabase CLI `2.107.0`，初始化 `supabase/config.toml` 与空 seed。
  - 新增面向云项目的无真实密钥 `.env.example`、Supabase Git 忽略规则、linked migration 脚本与开发指引。
  - 已验证 Supabase CLI 的 Agent 自动检测会导致交互登录进入 JSON/非交互模式；所有项目脚本已统一增加 `--agent no`。
  - Docker、WSL 和本地 Supabase 已从必需前置条件中移除。
  - 在组织 `mndzgvsjfzqrejuqldvm` 的美国东部 `us-east-1` 创建 `eventspace-dev`，project ref 为 `boooesdlmaeckrvpyjwb`，当前费用为 0 美元/月。
  - 项目状态为 `ACTIVE_HEALTHY`，仓库 link 成功，云项目 URL 与现代 publishable key 已写入被 Git 忽略的 `.env.local`。
  - Auth 与 Storage 端点返回 HTTP 200；security/performance advisors 均为 0 项。
  - 未修改页面、组件、样式、`MockSession` 或任何业务 UI 数据流。
- 验证：
  - `npx supabase --agent no projects list` 显示 `eventspace-dev` 为 healthy 且 linked。
  - `npm run check`、`npm run build`、`git diff --check` 通过；仍为 9 个既有 ESLint warning。
- 已知工具问题：
  - Supabase 连接器 create/execute SQL 通道出现 MCP transport error。
  - linked SQL/migration 命令的临时 login role API 当前返回 EOF，转入 `BE-007` 处理。
- 下一步：
  - 执行 `BE-004`：安装并锁定 Supabase SSR/client 依赖，建立环境变量与 server-only secret 边界。

### BACKEND-002 - 后端范围与文档基线校准

- 日期：2026-07-27
- 状态：文档完成；未修改业务代码，主计划书中的 `BE-002` 已同步 Mark。
- 完成内容：
  - `requirements-baseline.md` 将房间范围统一为 Host-led，删除当前基线中的 Community-led/无 Host 规则。
  - Chat 当前范围统一为文本与最长 60 秒短语音；Chat 图片和精确位置发送不进入生产首期。
  - Photos 保持照片网格与详情评论；旧 Board 不进入生产 API。Book 延后重新设计，优先级高于投票并保留进入 MVP 的可能。
  - 投票系统延后，旧 Poll/Votes reducer、类型和历史任务只作为兼容/历史记录，不创建首批生产 schema。
  - 支付进入 MVP，采用 Stripe-hosted Checkout 的一次性房间付费，首期商品为 Event Upgrade 和 Permanent Archive。
  - `technical-architecture.md` 的核心实体、Realtime、支付和实施顺序已与 Supabase 主计划对齐。
- 验证：
  - 文档范围关键词一致性检查和 `git diff --check` 通过。
  - `npm run check` 通过，保留 9 个既有未使用变量 warning；`npm run build` 通过。
- 下一步：
  - 执行 `BE-003`：创建并连接独立的 `eventspace-dev` Supabase 云项目。

### TASK-025 - Rooms 浏览恢复与 Room 原生横滑壳

- 日期：2026-07-27
- 状态：代码完成；仍为本地 Mock UI，未新增后端、领域命令或数据模型。
- 完成内容：
  - `/rooms` 的 Grid 偏好使用 `sessionStorage` 键 `eventspace:rooms:grid` 保存；Magazine 横滑会记录最近居中的房间或用户打开的房间，并用 `eventspace:rooms:active-room` 在返回列表时恢复该卡居中。这两项仅是当前标签页的界面状态，不写入 `MockSession`，也不会跨设备同步。
  - 双列 Grid 的照片牌堆在静止和拖动时最多显示五张；额外预备层只用于连续滑动。单列 Magazine 保持原有层数与浏览范围。收尾动画改为复用五张模式最外层的位移、旋转、缩放，避免滑动结束时跳回旧层级位置。
  - Room 初始页调整为 Photos；Chat、Photos、Itinerary 三页同时挂载在浏览器原生横向 scroll-snap 轨道上，横向拖动切页、各页内部保持纵向滚动。浮动顶部栏两侧提供相邻页面入口，居中的房间名/倒计时打开 room options。
  - Photos 首次进入会定位到最新照片；行程创建/编辑器改为渲染至 `document.body` 的 Portal，避免被横向页面轨道裁切。聊天、Photos、Itinerary 内容都为浮动顶部栏预留滚动空间。
- 验证：
  - `npx eslint features/rooms/components/room-card.tsx`、`npm run typecheck`、`npm test`（4 个测试文件、20 个测试）、`npm run check`、`npm run build` 和 `git diff --check` 通过。
  - `npm run check` 无 error，但仍有 9 个既有未使用变量 warning：`create-room-wizard.tsx` 1 个，以及 `chat-panel.tsx` 中已收敛 Poll/Votes UI 的 8 个。
  - 本轮按要求未运行浏览器验证；横向手势、五张堆叠动画和不同视口的视觉回归仍应在后续手动验收中覆盖。
- 已知边界：
  - `sessionStorage` 只保留当前标签页的阅读偏好和最近卡片，不是用户配置、更不是服务端同步状态。
  - Room 页面切换、照片初始滚动和行程 Portal 均为客户端交互编排；生产端接入不应复用其浏览器状态作为授权或业务真相。

### TASK-024 - Room 收敛为 Chat / Photos / Itinerary 与聊天视觉重构

- 日期：2026-07-26
- 状态：当前实现完成；仅为本地 Mock，尚未接入后端。
- 完成内容：
  - Room 第二页收敛为 `Photos` 网格。上传真实图片会压缩后存入 IndexedDB，以 `BoardPhoto`/`boardItems` 兼容字段保存；支持照片详情、评论与本人/管理员删除。Book、spread、caption 页面模型与自由 Board 编辑器均已删除。
  - 创建向导收敛为 `details → timing → review` 三步；当前创建房间固定为 Host-led，成员上限 2–10，创建草稿仍写入本地存储。
  - Chat 移除相机、相册和精确位置发送；工具托盘只保留房内搜索。仍支持文字、回复、反应、置顶、长按操作、历史图片查看/下载，以及最长 60 秒的本地语音录制。
  - Chat 消息改为稳定随机色的整张圆角卡片：每条都显示成员标识、姓名、时间和正文；本人消息保持右缩/右侧标识构图但不再固定黑色。消息卡轻微叠放；底部为单层悬浮胶囊输入栏，空草稿时保留按住录音、输入后切换发送。
- 验证：
  - `npm run typecheck` 通过。
  - `npm run build` 通过（Next.js 16.2.10）。
  - `npm run check` 未通过：`room-experience.tsx:59` 触发 `react-hooks/set-state-in-effect`（effect 内同步 `setHeaderView`）。此外 `create-room-wizard.tsx` 有 1 个未使用类型 warning，`chat-panel.tsx` 有 8 个遗留 Poll/Votes 状态相关未使用变量 warning。
- 已知边界与下一步：
  - `PersonSummary` 没有头像 URL，聊天卡只能显示首字母成员标识，不能复现真实头像。
  - `MockSession` 仍保留 `CREATE_POLL`、Board/drawing 与旧 poll history 兼容命令；Room UI 已不提供聊天投票入口，后续应决定是删除遗留状态还是单独恢复为正式功能。
  - Rooms 卡片仍使用 `boardPreview` / `boardBackground` 兼容摘要，尚未迁移为 Photos 封面。

> TASK-023 的 Photos/Book 回忆录内容为 2026-07-23 历史实现，已被 TASK-024 的 Photos 网格方案取代；不得再将其视为当前功能。

### TASK-023 - Board 退出正式入口与 Photos/Book 回忆录第一阶段

- 日期：2026-07-23
- 基线：`13a4102`（`Add memoir spreads with page styles and captions`）
- 状态：第一阶段已完成；复杂书页排版引擎、Rooms 卡片迁移和生产后端尚未完成。
- 产品与交互：
  - Room 顶部核心导航由 `Chat / Board / Itinerary` 改为 `Chat / Photos / Itinerary`；再次点击 Photos 在 `Photos` 与 `Book` 间直接切换，不再弹出 Board/Sequence 菜单。
  - Photos 以纵向双页摊开的回忆录浏览；所有书页按双页生成，长按任意半页进入整组 spread 的聚焦编辑。
  - 编辑工具位于书页下方，支持从 Chat 选择未加入的照片/文本、设备相册、相机、新文本和四种纸张样式；未选中编辑 spread 时新增内容进入最新页。
  - 新照片在写入前显示 caption 确认层；caption 与照片通过 `BoardComment.kind = "caption"` 绑定并在详情评论中置顶。
  - Book 使用 `Nodlik/StPageFlip` 的 `page-flip` 包，从闭合封面开始，支持 Spread/Single 两种视角、左右翻页和移动端尺寸重算；Single 模式只在正确页侧触发翻页，翻页完成后再移动视角。
- 本地数据与代码边界：
  - `MockSession` 升级为 v7；`BoardItem.memoirPage`、`MockRoom.memoirPageCount`、`memoirPageStyles` 和 `MemoirPaperStyle` 保存书页归属与纸张元数据。
  - 新增 `ADD_MEMOIR_PHOTO`、`ADD_MEMOIR_SPREAD`、`SET_MEMOIR_PAGE_STYLE` 命令；新增 spread 每次固定增加两页，当前运行时上限为 500 页。
  - 回忆录按编排器、document model、Photos 浏览、spread editor、来源 Dock、caption layer、Book 页面结构、StPageFlip lifecycle hook 和独立样式拆分，没有重新形成单文件巨型组件。
  - 当前仍复用 `boardItems`、`boardComments`、`canAddBoardItem` 和 `DELETE_BOARD_ITEM`，这是迁移兼容层，不应直接成为未来后端 API 命名。
- 验证：
  - `npm run check` 通过。
  - `npm test`：5 个测试文件、26 个测试通过，其中回忆录 document 与 MockSession 命令测试均通过。
  - `npm run build` 通过，Next.js 16.2.10 正常打包 `page-flip` 动态客户端依赖。
  - 390 x 844 移动端视口验证封面、Spread/Single、单页满宽、翻页完成后视角切换和无横向溢出。
- 遗留事项：
  - Photos 当前只支持 spread 级添加/删除和纸张样式，复杂自由排版、跨页移动、层级、裁切、撤销/重做尚未实现。
  - 当时 Rooms 卡片仍消费旧 Board snapshot/background，尚未改为回忆录封面或 Photos spread 预览；截至 2026-08-02 当前实现已改为 Photos 牌堆预览。
  - StPageFlip 是客户端呈现依赖；后端只应保存页序、内容归属和样式，不保存翻页运行时状态。
  - 生产端需要把 memoir page/spread、item placement、caption 与 asset 分别建模，并以事务、权限、版本号和服务器时间处理并发编辑。

### TASK-022 - 移动端本地资产保存修复与后端边界收紧

- 日期：2026-07-21
- 状态：代码修复完成；保留 iOS Safari / Android Chromium 真机上传复核。
- 根因与修复：
  - IndexedDB repository 曾直接调用 `crypto.randomUUID()`；手机通过局域网 HTTP 地址访问时不属于安全上下文，该 API 可能不存在，导致 Chat/Board 图片及涂鸦在事务开始前报 `could not be saved locally`。
  - 资产 ID 改为复用 `core/domain/uuid.ts` 的跨环境实现：优先 `randomUUID`，否则使用 `getRandomValues`，最后提供非加密本地 mock fallback。
  - Board 文本不经过资产仓库；新增 reducer 测试确认合法文本 item 可独立保存，避免把媒体错误错误归因到文本链路。
- 后端接入准备：
  - 新增 `data/contracts/asset-repository.ts`，IndexedDB 实现遵循统一 `AssetRepository`，未来私有 Storage adapter 可保持相同的 save/read/remove 契约。
  - `isAssetReference` 移入 `core/domain`；`POST_MESSAGE` 与 `ADD_BOARD_ITEM` 写入前执行和恢复阶段一致的运行时结构校验，不再只依赖 UI 与 TypeScript。
- 验证：
  - `npm test`：4 个测试文件、20 个测试通过，覆盖不安全上下文 UUID fallback、Board 文本写入和畸形媒体消息拒绝。
  - `npm run check`、`npm run build`、`git diff --check` 通过。
  - 自动浏览器文件选择验证受本地 URL 安全策略阻止；仍需在真实手机上分别确认 Chat 图片、Board 图片和刷新恢复。

### TASK-021 - 本地媒体 Asset Reference 与 IndexedDB Blob 存储

- 日期：2026-07-21
- 状态：已完成。
- 完成内容：
  - 新增稳定的 `AssetReference` 领域契约和 `features/local-assets` repository；图片、语音、涂鸦 Blob 统一写入 IndexedDB，会话仅保存 id、类型、MIME 与字节数。
  - Board 上传、相框预览、涂鸦导出、Chat 图片发送、语音录制、下载和“添加到画板”均改为 Blob/asset 流程；同一图片可跨 Chat 与 Board 复用同一引用。
  - 展示层通过可回收 object URL 读取本地 Blob，覆盖 Board、Sequence、照片详情、聊天室、全屏图片和 Rooms 画板快照。
  - `MockSession` 升级为 v7；恢复旧会话时异步迁移 image/voice/drawing data URL，成功后写回新结构。
  - 会话更新后按真实引用集合清理孤立 Blob；重置本地数据时同步清空 IndexedDB。
- 后端边界：
  - UI 与领域层已经不依赖 data URL；后端接入可替换 repository 为私有 Storage 上传和签名读取，但仍需服务端 asset 表、鉴权、文件嗅探、EXIF 清理、转码/缩略图、配额和垃圾回收。
- 验证：
  - 新增旧媒体迁移测试；`npm test`、`npm run check`、`npm run build` 与 `git diff --check` 通过。

### TASK-020 - Board 评论独立实体与 v6 迁移

- 日期：2026-07-20
- 状态：第三轮已完成。
- 完成内容：
  - 从 `BoardPhoto` 移除内嵌评论数组，新增房间级 `boardComments` 集合；`BoardComment` 通过 `photoId` 和 `actorId` 关联照片与作者。
  - `MockSession` 升级到 v6，恢复层兼容 v3/v4/v5，并自动抽取旧照片内嵌评论、移除旧字段。
  - `ADD_BOARD_COMMENT` 改为向独立集合写入，只允许真实照片目标，拒绝重复 comment id，并继续由 reducer 写入作者和创建时间。
  - 删除照片时同步清理关联评论；照片详情按当前 photo id 选择评论，视觉和操作体验保持不变。
  - fixture、运行时结构验证和新建房间默认结构已同步到 v6。
- 后端边界：
  - 该结构可以直接映射独立评论表与分页接口，但本地 reducer 仍不是生产安全边界；服务端必须负责鉴权、外键、作者、时间、限流、审计和删除事务。
- 验证：
  - `npm test`：2 个测试文件、16 个测试全部通过，新增 v5 评论迁移、目标校验、ID 幂等与删除级联覆盖。
  - `npm run check`、`npm run build` 与 `git diff --check` 通过。

### TASK-019 - Board 照片详情连续浏览

- 日期：2026-07-20
- 状态：第二轮已完成。
- 完成内容：
  - Board 与 Sequence 的照片详情共用当前照片 ID 和有序照片集合，可在详情内连续浏览，不需要关闭后重新选择。
  - 移动端仅在大图区域响应横向滑动；评论列表保留纵向滚动，首尾照片使用阻尼反馈且不会越界。
  - 桌面端新增左右箭头，同时支持键盘方向键；顶部显示当前照片序号。
  - 切换照片时清空未发送评论并释放输入框焦点，避免移动端键盘继续占据视口；相邻真实图片会提前加载。
  - 删除当前照片后自动展示下一张或上一张；没有相邻照片时关闭详情。
  - 切换动效兼容 `prefers-reduced-motion`。
- 验证：
  - `npm test`：2 个测试文件、12 个测试全部通过。
  - `npm run check`、`npm run build` 与 `git diff --check` 通过。
  - 已在 390 × 844 验证左右滑动、序号更新、草稿清理、输入失焦和无横向溢出；已在 1024 × 800 验证桌面箭头及边界禁用状态。

### TASK-018 - 行程与 MockSession 领域测试底座

- 日期：2026-07-20
- 状态：第一轮已完成。
- 完成内容：
  - 引入 Vitest，并新增 `npm test` 与 `npm run test:watch` 命令；测试运行于 Node 环境，不依赖 React 挂载或浏览器状态。
  - 建立共享的 MockSession / Itinerary 测试构造器，避免测试重复拼装完整房间数据。
  - 覆盖行程 upcoming / current / ended 状态、状态分区顺序、默认滚动目标和手动结束行程的重叠判断。
  - 覆盖 MockSession v3 / v4 到 v5 的行程迁移，包括 Poll 内嵌行程提案。
  - 覆盖 `END_ITINERARY` 的权限、幂等性、结束时间写入，并锁定普通更新不可伪造 `endedAt` 的边界。
- 验证：
  - `npm test`：2 个测试文件、12 个测试全部通过。
  - `npm run check` 与 `npm run build` 通过。

### TASK-017 - Board 照片详情与 Itinerary 手动结束

- 日期：2026-07-20
- 状态：已完成当前轮。
- 完成内容：
  - 删除照片内部的作者、弹幕和评论输入，短点击照片改为打开覆盖完整视口的照片详情；大图保留原图比例与相框，照片下方依次展示发布者、纵向评论和安全区输入栏。
  - Board 与 Sequence 共用 `PhotoDetailViewer`；长按照片移动、本人/管理员删除和评论本地持久化保持不变。
  - Itinerary 改为 Upcoming 灰色在上、Current 绿色居中、Ended 红色在下，并让最接近当前时间的卡片靠近 Current 区域。
  - Duration 改为 5 分钟步进的移动端滑块，最大值随房间剩余时间动态收敛。
  - 新增 Scheduled / End manually 两种结束模式；手动行程开始后由负责人或管理员确认 `End now`，并记录实际结束时间。
  - `MockSession` 升级到 v5，v3/v4 行程迁移为带 `endMode`、`endsAt`、`endedAt` 的结构；新增独立 `END_ITINERARY` 命令。
- 后端边界：
  - 手动结束的 `endedAt` 当前来自浏览器时间；生产端必须由服务端鉴权并写入服务器时间，命令需要幂等处理。
  - 照片评论当前仍随 photo JSON 保存；生产端应使用独立评论实体、分页查询、限流和删除策略。
- 验证：
  - `npm run check` 与 `npm run build` 通过。
  - 已在 390 × 844、320 × 700 验证照片详情、评论提交、无横向溢出、16px 输入框、Duration 滑块和手动模式切换。

### TASK-016 - 创建恢复、Board 视觉选择与房间延时闭环

- 日期：2026-07-20
- 状态：已完成当前轮。
- 完成内容：
  - `/rooms/new` 编辑草稿会写入独立的 `localStorage` 键 `eventspace:create-room-draft:v1`，刷新后恢复；成功创建后清除，条款同意不会跨会话沿用。
  - 创建成功页的 `Save card` 已通过浏览器 Canvas 导出 PNG；邀请码可用于展示，QR 仍是视觉 mock，不是可扫描的真实邀请链接。
  - Camera / Photos 读取图片后先进入横滑相框选择，不再立即 pin 到 Board；提供 Pin、Gallery、Instant、Tape、Dark 五种样式，选中样式和原图比例同步进入 Board、Sequence 与 Rooms snapshot。
  - Board 背景扩展为 Stone、Linen、Night、Herbarium、Clover、Bluebell 六套，后三套使用本地静态纹理，并同步到 Rooms 卡片。
  - Room options 的直接延时和延时投票改为 5 分钟步进选择，提供常用时长并受房间总时长上限约束。
  - 用户投票后，投票卡在当前访问中保留并立即显示结果；离开房间后再次进入，已经投过的内联卡才隐藏，Votes 历史仍可查看。
- 后端边界：
  - 创建草稿和完成页邀请信息仍是客户端数据；生产创建接口必须重新校验全部字段、条款版本、身份、配额和服务器时间。
  - 相框与背景属于可持久化展示元数据，后端需要稳定枚举、默认值和版本兼容；媒体本体仍应迁移为 asset id / Storage object。
  - 延时与投票需要服务端事务、幂等键、固定投票分母和服务器时间裁决，不能信任客户端滑块值或本地结果。
- 验证：
  - `npm run check` 通过，ESLint 与 TypeScript 无报错。
  - `npm run build` 通过，Next.js 16.2.10 生产构建成功。

### TASK-015 - Rooms 浏览控制与横滑动效重构

- 日期：2026-07-20
- 状态：已完成当前轮。
- 完成内容：
  - 保留既有房间卡片、信息区和真实 Board snapshot，将筛选、搜索、视图与编辑收敛为一条统一工具条。
  - 搜索模式在工具条内原位展开；编辑模式转换为 Editing / Done，并让收藏、删除操作从卡片两角动效进入。
  - Magazine / Grid 改为单图标切换，筛选菜单显示全部状态、数量和当前勾选。
  - 新增基于真实 `scrollLeft`、容器宽度和卡片中心距离的 Carousel hook；底部进度块连续跟随横滑，当前序号随 Scroll Snap 更新。
  - 移动端重新计算卡片首屏高度，为进度条预留稳定区域；Grid 模式隐藏进度条。
  - 删除房间入口增加全视口底部确认卡，不再点击红色减号后立即移除。
  - 将集合筛选/排序、RoomCard、Toolbar、Progress、DeleteSheet 和 Carousel hook 从 `rooms-page.tsx` 拆出。
- 后端边界：
  - 当前筛选、搜索与排序仍针对本地完整集合；接入分页后应由查询 DTO 返回筛选结果、总数和稳定游标，不能继续假设客户端持有全部房间。
  - 本地删除只移除当前用户入口；生产 mutation 必须区分离开房间、删除个人归档入口和 Host 结束共享房间。
- 验证：
  - `npm run check` 与 `npm run build` 通过。
  - 已在 390 × 844、320 × 700 验证 Magazine、Grid、筛选、搜索、编辑、删除确认和真实进度联动；亮暗主题无横向溢出，控制台无 error/warning。

### TASK-014 - Account 移动端账户中心重构

- 日期：2026-07-20
- 状态：已完成当前轮。
- 完成内容：
  - 删除左侧营销大标题和桌面双栏表单结构，页面改为移动端优先的单列账户中心。
  - 顶部改为严格居中的 `EventSpace`，左侧返回按钮保留 44px 触控区但去掉可见圆形外框。
  - 身份卡展示昵称、账户状态、邮箱及 Active / Memories / Board items 本地摘要；昵称编辑在卡片内部展开，并检查活动房间重名。
  - Account mode、本地数据、法律入口分别拆成独立组件；模式切换和数据清除使用全视口底部确认卡。
  - System / Light / Dark 改为带真实配色预览的三列卡片，并补齐亮暗主题、进入/退出、展开、按压和选中动效。
  - `account-page.tsx` 只负责 session 与 command 编排；账户摘要和重名判断进入纯模型模块。
- 后端边界：
  - 当前邮箱、身份模式和统计均来自本地 `MockSession`；后端接入时需要由 Auth/Profile API 和服务端可见房间查询返回。
  - 昵称重名的客户端预检查只服务本地体验，生产仍需服务端约束与冲突响应。
- 验证：
  - `npm run check` 与 `npm run build` 通过。
  - 已验证 390 × 844、320 × 700 的亮色、深色与 System 主题；页面无横向溢出，确认卡覆盖层正常，浏览器控制台无 error/warning。

### TASK-013 - Itinerary 时间线重构

- 日期：2026-07-20
- 状态：已完成当前轮。
- 完成内容：
  - 移除 Going / Not going / Checked in、容量报名和手动状态推进，行程回归共享活动时间线。
  - 已结束、进行中、未开始由起止时间自动推导，并使用低饱和红、绿、灰卡片区分；亮色和深色模式分别定义可读配色。
  - 行程按日期分组纵向排列；首次进入优先滚动到进行中项目，没有进行中项时定位到下一项或最后一项。
  - 卡片默认保持紧凑，点击后展开说明、地图入口和权限操作；新增/编辑改为移动端底部编辑卡，支持 5 分钟步进时长、负责人、地点、说明和时间冲突提示。
  - 新增 `UPDATE_ITINERARY` / `DELETE_ITINERARY` 命令，并将 `MockSession` 升级到 v4；旧 v3 行程会补齐结束时间、所有者和时间戳后迁移。
  - 将 Itinerary 拆为时间模型、页面编排、时间线、卡片和编辑器，避免继续堆积在单一 TSX。
  - 修正 `MockSessionProvider` 首帧读取本地状态造成的 hydration mismatch：服务端与客户端首帧统一使用初始状态，挂载后再恢复 `localStorage`。
- 后端边界：
  - 当前状态和滚动定位使用浏览器时间；接入后端后必须由服务器保存 UTC 起止时间，并用服务器时间或权威事件决定状态。
  - 当前冲突检查只提供本地提示，不是数据库约束；真实写入仍需鉴权、房间时间范围校验、事务和幂等键。
- 验证：
  - `npm run check` 通过。
  - `npm run build` 通过，Next.js 16.2.10 生产构建成功。
  - 已在 390 × 844 亮色/深色和 320 × 700 亮色视口验证时间线、展开卡片和底部编辑器，无横向溢出且不会自动唤起键盘。
  - 生产构建中重新导航 Account → Room → Itinerary 后无 React error 或 warning。

### TASK-012 - Board 体验与组件架构重构

- 日期：2026-07-19
- 状态：已完成当前轮。
- 完成内容：
  - 将 `board-panel.tsx` 从约 600 行的手势、上传、编辑器和展示混合组件缩减为约 100 行的命令编排器。
  - 新增独立的 `BoardCanvas`、`SequenceView`、`BoardChrome`、`NoteStudio`、`DoodleStudio`、`PhotoConversation`、图片处理模块和画布手势 hook。
  - Board 底部改为三键 Dock；创建入口使用 Camera / Photos / Note / Doodle 卡片托盘，背景使用独立纯色卡片托盘。
  - Note Studio 改为横滑便签样式卡；Doodle Studio 使用全屏 Portal，支持画笔、橡皮、三档笔刷、颜色、撤销/重做、单指绘制和双指平移缩放。
  - 照片评论通过新增 `ADD_BOARD_COMMENT` 命令写入 `MockSession`；评论、作者信息和弹幕在 Board / Sequence 共享展示。
  - 新增 `BoardNoteVariant`、`BoardComment`，并让 Rooms 快照同步 Board 背景和便签样式。
  - 保留原图比例、无限缩放、进入时 fit、长按本人内容移动、内容缩放、空白点击完成编辑和权限删除。
- 代码质量：
  - Board 状态和职责已经拆分，但 `MockSession` reducer 仍是集中风险；媒体仍使用 data URL。
- 验证：
  - `npm run check` 通过，无 warning。
  - `npm run build` 通过，Next.js 16.2.10 生产构建成功。
  - 已在 390 × 844 视口验证 Board 空状态、创建托盘、Note Studio、全屏 Doodle Studio和实际落笔。

### TASK-011 - Chat 基础 Telegram 式交互、创建滚轮与画板背景闭环

- 日期：2026-07-19
- 状态：已完成当前轮，媒体权限仍需真机回归。
- 完成内容：
  - Chat 重做为移动端消息流：消息分组、日期分隔、置顶条、未读/回到底部按钮、长按消息操作卡和回复预览。
  - 附件托盘支持 Camera、Photos、Location、Poll、Votes、Search；照片有发送前预览、说明文字、全屏查看、保存和添加到 Board。
  - Chat 照片经过 canvas 压缩；Location 调用浏览器 Geolocation；语音使用 `MediaRecorder` 真实录制本地音频，支持按住录制、左滑取消和消息内播放。
  - `ChatMessage.content` 新增 image / location / voice 联合类型，持久化恢复增加结构和 data URL 长度校验。
  - `/rooms/new` Step 3 时间滚轮改为中间固定选中区、数字循环滚动并自动回到中心段；Step 4 Member list 改为居中的 Moderators / Everyone 分段选择。
  - `BoardBackground` 写入房间模型和 `SET_BOARD_BACKGROUND` 命令，Rooms 卡片预览使用房间真实背景。
- 真实边界：
  - 照片和语音是真实浏览器本地数据，位置是真实浏览器坐标，但均只保存在本机 `MockSession`，没有服务器上传、跨设备同步或生产隐私控制。
  - iOS Safari 的录音 MIME、相机权限、定位权限和 data URL 存储上限仍需真机验证。

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
  - Poll 创建器支持 yes/no、选项投票、行程投票；支持 open minutes、匿名/公开、负责人、行程时间和地点。
  - 聊天区投票卡支持投票后进度条百分比展示；当前访问中投票后仍保留结果卡，再次进入房间时隐藏已经投过的内联卡。
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
- 后续补充：
  - `Save card` 已在后续任务中实现本地 PNG 导出。
  - 真实可扫描 QR、邀请链接发送、后端 room id 与 invite revision 仍待后端阶段实现。

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

### 已经具备的真实云端能力

- Supabase Auth password / magic link 基础流程、cookie-backed SSR session、anonymous sign-in 访客身份和 `bootstrap_identity`。
- Host-led 房间创建、真实邀请 token/code、可扫描 QR、短码解析、直入或 pending join request。
- Host 审批、成员 mute/remove/ban、房间 end lifecycle、Realtime private Broadcast 后刷新权威快照。
- Room 详情读取真实成员、消息、reaction、pin、行程、Photos、pending requests 和私有签名媒体 URL。
- 文本 Chat、语音上传、Photos 上传、照片评论、删除、Itinerary 创建/编辑/结束均通过 Server Action / RPC / Storage 持久化。
- Account 读取真实 profile、当前用户房间、照片统计、昵称/主题更新和头像上传。

### 仍保留的本地 / mock 能力

- 本地创建房间、进入房间、Rooms 列表展示、筛选、收藏、删除个人入口。
- 本地 Chat 支持文本、回复、反应、撤回、置顶、搜索和真实浏览器录音；历史图片/位置消息可以兼容渲染，但新 UI 不创建。
- Photos 图片 Blob 和 Chat 语音 Blob 存入 IndexedDB，会话只保存 asset reference；它仍是单设备本地方案，不是生产媒体存储。
- 本地 Photos 支持设备图片选择、压缩、网格、照片详情、评论和本人/管理员删除。
- 本地行程创建、编辑、删除、负责人、起止时间、地点、说明、自动状态和重叠提示。
- Host-led 成员审核、禁言、移除、拉黑等 mock 治理状态仍存在于本地 fallback；云端房间已通过 RPC 持久化对应核心路径。
- 房间 active / freezing / archiving / archived 生命周期 mock。
- 旧 Poll/Votes、Book 和自由 Board 类型/命令仍可能存在于兼容层，但不是当前正式 UI 能力。

### 尚未具备或仍待环境验收的生产能力

- Turnstile、正式匿名访客限流、匿名账户清理、正式 SMTP/生产 redirect URL、移动端 magic link 全链路验收。
- 媒体服务端 EXIF 清理、转码、缩略图、恶意文件检查、引用计数和对象清理流水线。
- 浏览器本地录音和云端上传已接通；服务端转码、恶意文件检查和跨浏览器统一播放格式尚未完成。
- Stripe Checkout、webhook、退款、永久归档权益。
- PWA 安装、离线缓存、推送通知、邮件、Google Places / Maps API。
- 完整真实限流、设备封禁、审计日志、备份、归档清理任务和正式法律文本。

## 后端接入前必须解决

- 把本地 asset repository 映射为私有 Storage 与服务端 asset 表，并设计上传授权、衍生图、引用提交和废弃对象清理协议。
- 把客户端 reducer 中的权限、归档和成员资格校验映射为服务端事务和数据库约束。
- 为首期命令定义稳定 DTO：创建房间、发消息、上传语音/照片、评论、改行程、成员治理和归档。
- 明确 server time 规则，所有到期、撤回窗口和归档状态推进都不能信任客户端时间。
- 为移动端 Safari / Chromium 建立真机验收清单，尤其是图片上传、语音录制、键盘和 viewport。
- 继续拆分 `chat-panel.tsx` 的消息、录音、草稿和数据编排；删除或隔离未使用的 Poll/Votes 状态。

## 下一步建议

1. 应用并复核 2026-07-28 至 2026-07-30 的 Supabase migrations，运行 `npm run supabase:types:check` 与 `npm run supabase:test:db`。
2. 配置并验收 `EVENTSPACE_APP_ORIGIN`、Supabase Auth Site URL / Additional Redirect URLs、`SUPABASE_SECRET_KEY`。
3. 用移动端真机走通：邮箱登录回调、未登录访客匿名加入、pending 审核轮询、头像上传、QR 扫描进入、Photos/Voice 上传。
4. 处理 `core/domain/avatar.ts` 疑似编码异常，并确认 `avatarTextFor(..., "ring")` 的实际渲染。
5. 继续补服务端媒体清理、EXIF/转码、匿名身份清理、正式限流、审计和生产法律文本。
