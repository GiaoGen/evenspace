# EventSpace 本地优先静态实现计划

> 状态：2026-08-11 历史计划；本地优先阶段已被 Supabase-backed 封闭 MVP 接线覆盖，当前本地存储只承担 mock/fallback、上传前临时 Blob、旧数据兼容与云端读取加速。独立 `/zine` 另有不持久化的浏览器内存切片。
> 目标：在不接入后端的前提下，将当前可操作 Mock 逐步改造成移动端优先、真实本地数据驱动、可被后端 Repository 替换的完整静态版本。  
> 原则：不再把页面写死为样例 Mock；本地浏览器数据是当前真相来源，未来 Supabase/Postgres 是同一领域命令的远端真相来源。

## 1. 总体架构

- 保留当前 App Router、feature、core/domain、data/contracts 的分层方向。
- 新增本地优先数据层，负责浏览器内持久化、版本迁移、图片存储、命令重放与恢复。
- UI 继续消费领域 DTO 和能力派生，不直接读写 `localStorage`、`IndexedDB` 或未来数据库表。
- 后端接入时新增 Supabase Repository，实现同一套命令/查询合同；页面和组件不直接依赖 Supabase。
- 所有写操作在本地阶段也走命令校验：身份、成员资格、所有权、房间状态、配额和到期状态必须在数据层重复判断。

## 2. 阶段切片

### Phase A — 本地数据基础

目标：
- 将 `sessionStorage` 的标签页 Mock 状态迁移为本地优先应用状态。
- 使用 `localStorage` 保存轻量 JSON 状态，使用 IndexedDB 保存真实图片 Blob/预览资源。
- 去除固定样例房间作为默认业务数据；新用户看到真实空状态，可通过创建、加入、上传产生数据。

验收：
- 刷新、关闭浏览器、手机重新打开后，创建的房间和上传内容仍存在。
- 清除站点数据后回到空状态。
- 本地数据有版本号和结构校验，坏数据不会让页面崩溃。

移动端重点：
- iOS Safari 与 Android Chromium 都不能依赖非安全上下文才可用的 API。
- 图片上传必须支持相册/拍照、压缩、去 EXIF 的本地近似实现，并控制存储体积。

后端替换点：
- 本地 app session 对应未来 `profiles`、`rooms`、`room_members`、`messages`、`board_items` 等 DTO 的本地投影。

### Phase B — 创建、Rooms 与身份

目标：
- 创建房间不再生成演示房间，而是写入真实本地房间记录。
- 创建中的轻量草稿独立持久化并可在刷新后恢复；成功创建后清理，不复用条款同意状态。
- Rooms 完整支持 Active / Archived、搜索、收藏、视图切换、空状态、归档个人移除。
- Account 成为本地身份中心：显示名、头像、主题、登录模拟状态，但文案不声称真实登录。

验收：
- 移动端创建后立即回到 Rooms 可见，并可打开房间。
- 重启浏览器后仍可见。
- 空状态、错误状态、权限不可用状态符合设计系统。

后端替换点：
- 创建草稿只作为 UI draft；最终写入需经过本地 command DTO，未来替换为 Server Action/RPC DTO。

### Phase C — Room 外壳与 Chat

目标：
- Chat 使用本地真实消息流：文字、回复、搜索、撤回、置顶、表情、系统消息、草稿恢复。
- 输入栏严格移动端优先，键盘弹出、空消息列表、长消息、Safari viewport 都稳定。
- 语音保留本地静态交互壳，不伪造真实音频文件。

验收：
- iOS Safari 与 Android Chromium 下输入栏固定、不会漂移或消失。
- 消息所有权、撤回窗口、管理员删除与禁言状态走数据层校验。

后端替换点：
- 消息写入命令未来映射为服务端 RPC；搜索实现保留可替换边界。

### Phase D — Photos 与本地媒体（当前收敛方案）

目标：
- Photos 网格以本地真实照片驱动；当前不从 Chat 导入内容，也不包含 Book 阅读器。
- IndexedDB 保存压缩后图片 Blob、尺寸、缩略图和引用 ID；JSON 状态只保存元数据。
- 使用 `BoardPhoto` 兼容字段保存图片与评论，后端接入前再将其替换为独立的 photos/comments DTO。

验收：
- 手机相册多选上传可用；不支持的格式给出明确说明。当前没有相机捕获入口。
- Photos 网格在 320px 至桌面宽度保持稳定；详情层不被页面横向轨道裁切。
- 200 张上限内仍保持可浏览；默认使用缩略图，详情再读大图，并评估分页/虚拟化。

后端替换点：
- 本地媒体记录未来对应私有 Storage object + signed URL；本地 Blob ID 对应未来 storage path/asset id。Photos、评论、排序与删除策略应使用独立 repository/DTO。

### Zine 当前本地边界（不等同于本地优先产品阶段）

- `/zine` 使用组件内 `useReducer` 保存 `ZineDraft`；选中的图片以浏览器 `File` 和 Object URL 作为预览来源。
- Arrange 的 `manualSpreads`、照片放置/替换、样式和焦点位置只在当前页面生命周期内存在；没有 localStorage、IndexedDB、PWA 离线恢复或跨标签同步。
- 因此 Zine 当前只是 local-only prototype，不满足本文“刷新、关闭浏览器、重新打开仍可恢复”的本地优先验收。未来若要持久化，应先把 File/Object URL 转成独立 asset/blob repository，再设计版本化 draft/page model。
- 后端替换点应独立于 `MockSession`：生产需要私有 Storage、asset ownership、页面版本/并发控制、RLS 和发布权限，不能把浏览器 reducer 直接当成服务端 mutation。

## 2026-08-12 当前同步：Recipe 状态仍未进入本地优先持久化

- 最新 Zine 重写已把 Recipe Contract、兼容性判断、单页/跨页应用、照片实例级裁切焦点和撤销重做落在 `features/zine` 内部，但这些状态仍随 `ZineDraft` 生命周期存在。
- `/zine/preview-matrix` 仅在 development 环境可访问，使用 Reference Recipe fixtures 验证空内容、容量边界、图片比例和 Note 长度；它不代表刷新恢复、IndexedDB、PWA 离线或跨标签同步已经完成。
- 若未来把 Zine 纳入本地优先，应先定义 asset/blob repository、版本化 `draft/page/recipeApplication` schema、迁移与配额失败策略，再决定如何序列化 `File`、Object URL 和照片实例焦点。

### Phase E — Itinerary、Poll 与治理

目标：
- 行程起止时间、负责人、地点外链、投票和治理全部走本地命令；行程不承担参与状态、签到或容量报名。
- Community-led 与 Host-led 的权限差异在数据层统一派生。
- 成员、审核、禁言、踢出、拉黑、举报具有完整本地状态。

验收：
- 移动端底部面板可完成所有高频操作。
- 投票固定分母、过半即时生效、截止失效和失败状态都有表现。

后端替换点：
- 多实体更新在本地以单命令原子更新；未来对应事务 RPC/Edge Function。

### Phase F — 归档、PWA 与发布前静态验收

目标：
- 本地实现 active → freezing → archiving → archived 的静态状态机。
- PWA manifest、应用壳缓存、草稿恢复和离线提示。
- 法律、隐私、支持页面保留草案和审阅警告。

验收：
- 房间归档后只读。
- 低网速、离线、刷新、横竖屏切换、深色模式均可用。
- `npm run typecheck`、`npm run lint`、`npm run build` 每阶段通过。

## 3. 当前第一步

本次先完成 Phase A 的基础骨架：

1. 新增本地优先计划文档。
2. 把浏览器状态从标签页 `sessionStorage` 迁到跨标签/重启可恢复的本地存储。
3. 保留现有 reducer 和领域类型作为迁移过渡，后续逐步从 `mock-session` 命名迁移到 `local-session`。
4. 停止依赖固定样例房间作为唯一数据来源，下一阶段改造为真实空状态与本地创建闭环。
## 2026-07-18 当前同步：本地优先执行状态

当前实现已经完成一部分本地优先目标，但尚未达到最终本地数据层抽象形态。需要明确区分：

- 已完成：从旧的单标签 `sessionStorage` 主逻辑迁移到 `localStorage` 持久化 session，并兼容旧 `sessionStorage` 数据。
- 已完成：创建房间、聊天、投票、画板、行程、成员治理、归档等主要写操作都通过本地 `MockSession` command 写入状态。
- 已完成：移动端优先修复了输入栏、创建成功页、真实图片上传、画布单指/双指手势、Board/Sequence、Poll History、Rooms 筛选与编辑等关键路径。
- 已完成本地阶段：图片经 canvas 压缩为 Blob，语音和涂鸦也以 Blob 保存；领域状态只保留 asset reference，IndexedDB 负责本地媒体持久化和旧 data URL 迁移。
- 未完成：真正的本地 repository 分层尚未从 `features/mock-session` 命名迁移到更中性的 `local-session`；UI 仍直接依赖 mock session context。
- 已完成：创建草稿使用独立 `localStorage` 记录并在成功后清理；邀请卡可通过 Canvas 导出本地 PNG。
- 未完成：PWA、离线缓存、媒体资产清理、低存储空间处理、真实可扫描 QR 和移动端真机验收清单尚未系统完成。

### 当前阶段应调整的优先级

1. 先稳定移动端真机体验：iOS Safari / Android Chromium 的相机、相册、键盘、viewport、Pointer Events、双指缩放和平移。
2. 将现有 asset repository 接到后端私有 Storage，补齐预签名上传、元数据提交、缩略图和废弃对象清理协议。
3. 再拆分命令边界：把 `MockCommand` 对齐未来 Server Action / RPC DTO，明确哪些命令必须事务化。
4. 最后再推进 PWA、离线、导出、分享等外围能力。

### 后端替换提醒

当前本地 command 的存在不代表服务端安全已经完成。后端接入时，所有身份、权限、成员资格、投票、归档、媒体所有权、撤回窗口和到期判断都必须由服务端重新校验。本地 reducer 只能作为交互回归和 DTO 设计参考。

## 2026-07-19 执行状态补充

- Phase C 继续推进：Chat 已有真实本地图片、位置和录音消息，以及消息分组、长按操作、回复、置顶、未读跳转和附件托盘。
- Phase D 继续推进：Board 组件边界已拆分，评论和背景进入本地命令/领域模型，Note、Doodle、Sequence 形成独立模块。
- Phase A 的关键媒体目标已完成：Chat image/voice、Board photo/drawing 使用 IndexedDB Blob + asset reference，并支持旧 data URL 会话迁移。
- `/rooms/new` 时间滚轮和成员可见性已完成移动端交互优化，但创建命令仍是客户端本地状态机。

### 下一切片调整

1. 在现有 `AssetReference` 与 IndexedDB repository 之上补充配额反馈、失败重试和移动端真机恢复验证。
2. 为 Chat 媒体采集建立 adapter：图片解码/压缩、录音生命周期、定位权限分别与 UI 解耦，并补 Safari/Chromium 失败路径。
3. 为 `POST_MESSAGE` content、`ADD_BOARD_COMMENT` 和 `SET_BOARD_BACKGROUND` 增加独立运行时 schema 与 reducer 测试。
4. 停止扩展旧 Board；回忆录复杂排版优先进入独立 model、hook 和子组件，不回填到 `memoir-panel.tsx` 或 Book reader。

## 2026-07-20 执行状态补充

- `MockSession` 已升级到 v5，并为旧 v3/v4 行程补齐结束模式、计划/实际结束时间、所有者和时间戳；迁移仍是客户端兼容逻辑，不等于数据库 migration。
- `/rooms/new` 草稿恢复已形成独立存储边界 `eventspace:create-room-draft:v1`，但 UI draft 仍不能直接作为未来创建接口 DTO。
- Board 照片新增相框选择元数据，背景扩展为六套；轻量枚举和 asset reference 均可映射到后端字段，媒体正文已与房间 JSON 分离。

## 2026-07-23 执行状态补充：回忆录迁移

- 已完成：Room 正式入口由 Board/Sequence 改为 Photos/Book；旧 Board 代码暂时保留，不再继续扩展。
- 已完成：`createMemoirDocument` 从现有 item、页数和纸张样式生成稳定偶数页与 spread；Photos 和 Book 共用该只读 document。
- 已完成：相册/相机/Chat 图片、Chat 文本、新文本、纸张样式、caption 和新增双页均通过本地命令写入 `MockSession` v7；媒体继续使用 IndexedDB asset reference。
- 当时已完成：Book 的 `page-flip` 生命周期与 UI 分离，支持封面、Spread/Single、移动端尺寸更新和翻页后视角定位；当前运行时已移除 Book 与 `page-flip` 依赖。
- 部分完成：当前编辑器只支持目标页选择、添加、删除和纸张样式；复杂排版引擎尚未进入数据模型。
- 当时未完成：Rooms 卡片尚未从旧 Board snapshot/background 迁移为 memoir cover/spread preview；当前已改为 Photos 牌堆预览，memoir/spread 路线已撤回。
- 后端替换点：不要直接暴露 `boardItems` 兼容字段；先定义 `memoir_pages`、`memoir_items`、`photo_captions` 或等价聚合，以及带 expected version 的页面 mutation。
- Room extension 已使用 5 分钟步进和本地上限校验；生产必须由服务端根据套餐、当前结束时间和总时长再次裁决。

## 2026-07-26 当前同步：范围收敛

- 2026-07-23 的 Photos/Book 回忆录切片已撤回：相关组件、`memoirPage` 扩展命令、spread 编辑和 Book reader 均不再存在于运行时代码。上述“回忆录迁移”记录仅保留为历史，不代表当前实现。
- 当前媒体路径是 Photos 网格：设备选择图片、浏览器压缩、`AssetReference` 写入 IndexedDB、`BoardPhoto` 写入本地 session、照片详情评论与本人/管理员删除。没有相机捕获或 Chat 图片发送。
- 当前 Chat 路径是文字、历史媒体展示和本地语音。`MediaRecorder` 仍需要真机验证；浏览器权限、HTTPS 和本地存储失败都必须有用户可见错误提示。
- 下一步优先决定是否清理未使用的 Book/投票/旧 Board 兼容状态；在重新立项前，不得把遗留 reducer 命令描述为正式产品功能。

## 2026-07-27 当前同步：短期 UI 浏览状态

- `/rooms` 新增两个轻量 `sessionStorage` 键：`eventspace:rooms:grid` 记录当前标签页的 Grid/Magazine 偏好，`eventspace:rooms:active-room` 记录最近居中或打开的 Magazine 卡片。它们只服务阅读恢复，不进入 `MockSession`、不参与命令、不会替代 `localStorage` 的业务会话。
- Room 的三页切换、Photos 初始滚动和行程编辑器 Portal 同样属于客户端呈现状态；没有新增本地 repository、持久化领域字段或可迁移的业务 mutation。
- 后端接入时，如需要跨设备保存视图偏好，应另建用户偏好契约并由用户身份、同步策略和隐私规则决定；不得直接把现有浏览器键当作服务端字段。

## 2026-07-30 当前同步：本地优先计划的收口状态

- 本地优先计划不再是当前主实施计划；真实创建、加入、账号、Room、Chat、Photos、Itinerary、成员治理和 Realtime 已按 [`supabase-backend-integration-plan.md`](./supabase-backend-integration-plan.md) 接入 Supabase。
- `MockSession` 和 IndexedDB 仍保留三类职责：本地 mock/fallback、旧数据兼容、以及图片/语音上传前的浏览器临时 Blob。它们不能再被描述为当前应用的业务真相来源。
- 原 Phase A-D 的核心前端学习已经沉淀为云端接线边界：`AssetReference` 对应 `assets` / Storage object，Photos 评论对应 `photo_comments`，Room 命令通过 Server Action / RPC 事务化。
- 本地创建草稿 `eventspace:create-room-draft:v1` 仍是 UI draft；创建成功后写入真实 Supabase room / invite，而不是写入本地 session。
- `/rooms` 的 `sessionStorage` 视图偏好和最近卡片仍只是单标签 UI 状态，不进入 Supabase。
- 后续本地侧优先级：继续保留上传前失败恢复、移动端 Blob 采集、旧 session 迁移和清站点数据后的可恢复错误提示；不再扩展本地-only 投票、Book 或自由 Board。

## 2026-08-02 当前同步：本地缓存的收缩与新增加速职责

- 浏览器本地存储新增一类“云端读取加速”职责，但它仍不改变业务真相来源：Account snapshot、Rooms snapshot、Room detail snapshot、viewer avatar cache 和 room photo cache 都必须被视为可丢弃缓存。
- `localStorage` 中的 route/account/avatar snapshot 保存 scope-bound 展示数据，且写入前剥离 signed URL；它们不能支持离线访问私密房间，也不能跨账号复用。
- IndexedDB `eventspace-local-assets` 与 Cache Storage `eventspace-cloud-images-v1` 共同保存云端 display/thumbnail read-through cache；旧本地 mock Blob 仍在 IndexedDB。云端缓存键包含 viewer scope、asset id、variant 和 revision，revision 变化后旧 Blob 应视为过期。
- Room photo cache v3 的优先级策略是性能实现：当前照片、前后窗口和前 12 张网格缩略图优先，其余缩略图/显示图后台下载；它不是新建照片排序、收藏或归档规则。
- `/rooms` 的照片牌堆 entry animation、decode 协调和布局 fade 只属于 UI 状态；本地计划不再把这类状态提升为 repository 或 command。
- 下一步本地侧只保留缓存失效、存储配额失败、签名 URL 过期回源和清站点数据恢复提示；不再把 PWA 离线房间内容、Book、投票或自由 Board 作为本地优先主线推进。

## 2026-08-10 当前同步：成员偏好不进入本地优先层

- Rooms 的 `is_favorite` 与 `hidden_at` 是当前 membership 的服务端偏好；本地 route snapshot 只能加速展示，不能决定 Favorites 筛选或个人列表可见性。
- 隐藏房间不是本地删除，也不是退出房间。后端仍允许当前成员通过直接房间路由读取，恢复 collection visibility 时由 authenticated RPC 清除 `hidden_at`。
- 图片缓存解析新增 display 优先、thumbnail 回退和 Cache Storage / IndexedDB 双写；这些缓存可以丢失、重建或因 scope/revision 变化而失效，不扩大本地离线能力。
