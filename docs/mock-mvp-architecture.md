# EventSpace 类型化 Mock MVP 架构

> 状态：2026-08-11 Mock 架构与当前兼容壳说明。正式房间已接入 Supabase；`MockSession` 仍服务本地 mock、旧数据兼容和云端 UI contract，不再代表全部业务真相。独立 `/zine` 使用自己的本地 reducer，不属于 `MockSession`。

## 1. 可运行范围

| 路由 | 类型 | 当前能力 |
| --- | --- | --- |
| `/` | Server Component | 正式 Landing；进入房间列表或样例房间 |
| `/rooms` | Server page + Client collection | 读取当前 viewer 的 Supabase 房间集合；状态筛选、搜索、杂志/双列视图、成员级收藏/隐藏偏好 |
| `/rooms/[roomId]` | Server page + Client experience | 校验参数并鉴权读取；通过顶部常驻按钮切换 Chat、Photos、Itinerary |
| `/rooms/new` | Client state machine | 三步创建向导、逐步校验和明确的本地 Mock 完成态 |
| `/join/[roomId]` | Server preview + Client wait state | 邀请预览、昵称、账号头像带入、anonymous guest、等待与审核结果轮询 |
| `/account` | Server profile + Client settings | Supabase profile、昵称/主题、账号头像上传、退出登录 |
| `/zine` | Client-only creator + reader | Zine 草稿、手动排版和 Reader 只存在当前组件内存 |
| `/zine/preview-matrix` | Development-only Client preview | Reference Recipe 的 Editor/Reader 对照与边界 fixtures；非 development 返回 Not Found |
| `/legal/[document]` | Server page | 法律文档结构草案与专业审阅警告 |

本地 mock 路由共享版本化 `MockSession`。创建、消息、投票、旧回忆录、Itinerary、治理和个人归档操作通过同一纯 reducer 命令写入 `localStorage`；媒体 Blob 写入 IndexedDB。云端房间使用同一前端 contract，但先由 Supabase 读取权威快照，再通过 `BackendSessionProvider` 将支持的命令转为 Server Action / RPC / Storage 操作。

## 2. 目录与依赖方向

```text
app/                    路由、Metadata、加载/错误/Not Found 边界
components/             无业务数据访问的共享 UI
features/landing/       Landing 页面组合
features/rooms/         房间列表与卡片交互
features/room-performance/  route snapshot、房间列表/详情预取与浏览器加载加速
features/room/          Room 外壳及 Chat/Photos/Itinerary；Photos 复用 BoardPhoto 兼容数据与照片详情组件
features/create-room/   创建草稿类型、独立草稿存储、纯 reducer 状态机、三步向导与邀请卡导出
features/mock-session/  版本化浏览器会话、云端兼容 provider、领域命令、selectors 与恢复校验
features/join/          私密邀请与申请状态机
features/account/       Mock 身份、主题、重置与法律入口
features/zine/          独立 Zine draft reducer、Recipe Contract、共享 Renderer 与 PageFlip Reader
core/domain/            领域类型、品牌 ID、状态枚举
core/security/          与 UI 无关的权限派生
data/contracts/         Repository 接口
data/mock/              经过运行时检查的 fixture 与 Mock Repository
data/supabase/          Supabase Auth、RLS read model、RPC adapter、Storage 签名与生成 types
data/rooms.ts           server-only 数据访问入口和最小 View DTO
types/page-flip.d.ts    page-flip 第三方包的本地类型声明
```

依赖只允许由页面/feature 指向领域和数据接口；`core` 不依赖 React、Next.js 或 Supabase。云端 Server Component 和 Server Action 可以调用 `data/supabase/*`，Client Component 不直接查表或持有 service secret。

Zine 是一条独立的 Client-only vertical slice：`features/zine/components/zine-creator.tsx` 使用自己的 `useReducer`，`ZineDraft` 直接持有浏览器 `File` 与 Object URL；`recipe-contract.ts` / `recipe-placement.ts` 负责 Recipe 校验、应用和照片实例焦点，`recipe-renderer.tsx` / `recipe-renderer-plan.ts` 负责 Editor/Reader 共用渲染，`zine-pages.ts` 负责 Reader 页面生成，最后才把 React 源页克隆到命令式 DOM 交给 `page-flip`。它不读取或写入 `MockSession`，也没有 Repository、Server Action、Storage 或 RLS 边界。

## 3. Server / Client 边界

- 页面默认是 Server Component，房间数据只在服务端 DAL 读取。
- `data/rooms.ts` 使用 `server-only`，阻止它被 Client Component 意外打包。
- 只有需要状态、表单或 Pointer Events 的组件带有 `"use client"`。
- Server 传给 Client 的 `RoomDetailView` 只包含渲染所需的房间内容、派生权限与当前 actor ID；不包含邀请码、邮箱、设备标识、举报、支付、审计或内部存储路径。
- URL 使用独立的 `RoomPublicId`，数据库内部 `RoomId` 预留 UUID 语义，二者不混用。公开标识是不可可信输入，进入 DAL 前必须通过固定格式解析。无效、无权限和不存在统一返回无内容的 `Room unavailable`，避免枚举房间。

## 4. 当前安全保证

- 页面没有 Server Action、Route Handler 或真实写 API，因此不存在“客户端按钮即授权”的假实现。
- Mock Repository 在返回列表或详情前调用统一的 `deriveRoomCapabilities`，被移除成员不能读取；归档读取必须具备 `archiveEligible`。
- 归档读取同时要求登录；活动房间写能力除状态外还检查 `endsAt`。这里使用进程服务端时间作为 UI 能力提示，真实 RPC 仍必须以数据库 `now()` 原子判定。
- 访客默认不能投票或写回忆录；Host/Admin/Member 权限由同一纯函数派生。当前代码仍复用 `canAddBoardItem` 作为兼容能力名。
- React 默认转义所有 fixture 与本地输入；没有使用 `dangerouslySetInnerHTML`。
- 本地消息进行 `trim` 和 1000 字符上限处理，但这只是 UI 约束。真实写入仍必须由服务端重新校验、限速、鉴权并使用服务器时间。
- 外部地图链接使用新窗口和 `rel="noreferrer"`；第一版不嵌入地图或调用地图 API。
- 不存在客户端环境密钥、公开 Storage URL、Supabase Service Role 或支付配置。
- 私密 `/rooms` 路由显式强制按请求动态渲染，避免未来用户 DTO 被跨会话共享缓存。
- 全局响应头关闭技术标识并设置 `nosniff`、拒绝 iframe、严格 Referrer Policy、OAuth 兼容的 opener 隔离和最小 Permissions Policy；正式认证与媒体接入时再测试并收紧 CSP。

## 5. 明确不构成的安全承诺

当前 mock viewer 是服务端固定 fixture，不是真实认证。Mock 权限函数用于提前固定规则与测试接口，但不能代替 Supabase Auth、RLS、RPC 或 Realtime Authorization。

界面持续显示 `Mock data`，并且 `data/mock/mock-runtime.ts` 会拒绝在 Vercel production 环境运行该 Repository，防止样例 Host 身份被误部署成真实产品。接入真实认证时必须删除这一依赖并从服务端会话构造 viewer。

进入真实写功能前仍必须完成开发前审计登记中的 P0：

1. actor/member 与 auth user 分离及访客认领事务；
2. 私有媒体隔离、验证、转码、EXIF 清理和签名 URL 失效窗口；
3. 所有写入的服务端时间、身份、成员资格、角色、所有权和房间状态复核；
4. Realtime 权威事件、退订和重连规则；
5. 速率限制、幂等键、审计事件与无权限测试。

创建向导接入真实写入前还有三个不可省略的迁移门槛：`/rooms/new` 必须要求服务端认证；全部字符串、枚举、套餐限制必须由服务端 schema 再验证；条款同意必须记录条款版本、用户、服务器时间并与房间创建处于同一事务。客户端 reducer 只负责交互体验，不能成为授权或数据可信边界。

## 6. 下一条实现切片

在本切片的视觉和结构通过后，建议依次实现：

1. 邀请页、访客身份和审核等待的 mock 状态机；
2. 为创建命令定义独立服务端 DTO 与 Repository 写入契约，不直接复用客户端 draft；
3. Supabase schema、迁移、Auth 与默认拒绝的 RLS 测试；
4. 将 `MockRoomRepository` 替换为 `SupabaseRoomRepository`，保留 feature 和页面接口；
5. 再开始真实 Chat 写入和私有 Realtime。
## 2026-07-18 历史同步：Mock MVP 架构现状

> 以下内容记录当时的 Board / 回忆录过渡结构；当前正式运行时以 2026-07-26 与 2026-07-27 同步为准。

当前 Mock MVP 已经不只是静态 fixture 展示，而是本地优先的可操作产品壳：

- `MockSessionProvider` 负责从 `localStorage` 恢复 `eventspace:local-session:v1`，并兼容旧 `sessionStorage` 键。
- `features/mock-session/model/mock-session.ts` 仍是主要状态转换中心，包含创建房间、发消息、投票、回忆录 item、行程、成员治理、归档等命令。
- `core/domain/asset.ts` 定义稳定 `AssetReference` 及运行时校验；Chat image/voice 与回忆录 photo/drawing 只保存引用，Blob 由实现 `data/contracts/asset-repository.ts` 的 IndexedDB repository 管理。当前云端图片引用还可携带 thumbnail、placeholder、width/height 与 revision。
- `core/domain/board-layout.ts` 为 Board 与 Rooms 卡片共用画板 item 尺寸、边界和 fit 计算。
- `features/room/components/chat-panel.tsx` 仍承载大量移动端交互；回忆录已经按编排、模型、Photos、Editor 和 Book 拆分。旧 `board-panel.tsx` 不再是正式入口。
- `data/mock/mock-runtime.ts` 继续阻止正式生产环境默认运行固定 mock 身份；本地 build/start 可直接验证 mock。
- 字体不再依赖 `next/font` 远程拉取，改为 `public/fonts` + `@font-face`。

### 当前架构优点

- 页面、feature、domain、data contract 的方向仍然清晰。
- 主要写操作已收敛到 command/reducer，后续可以逐个映射到 Server Action、RPC 或 repository mutation。
- `POST_MESSAGE` 与 `ADD_BOARD_ITEM` 在本地命令边界执行运行时结构校验，相关规则可迁移为后端 DTO schema；生产端仍必须独立校验所有不可信请求。
- 回忆录页生成是独立纯模型；旧 Board fit 逻辑仅继续服务尚未迁移的 Rooms snapshot。
- Itinerary 已拆为纯时间模型、编排组件、日期时间线、状态卡片和移动端编辑器；状态由起止时间计算，命令仍可映射为后端 mutation。
- Mock runtime 与生产环境保护边界仍存在。

### 当前架构风险

- `MockSession` 文件过大，已经混合权限判断、命令校验、状态转换、持久化解析和部分业务策略。
- 权限派生在 `core/security/room-capabilities.ts` 和 mock session 中有重复趋势，后续可能规则漂移。
- 本地媒体已与 session JSON 分离，但 IndexedDB 仍是单设备存储；配额失败、浏览器清站点数据和跨设备同步都需要生产存储方案处理。
- Poll、join request、archive lifecycle 等逻辑依赖客户端时间和本地数组更新，生产必须改为服务端事务。
- UI 组件中包含大量手势、弹层和 command 调用，后端接入前需要拆出可测试的数据编排层。

### 后端接入前的架构门槛

1. 定义稳定 command DTO，不直接复用客户端 draft 或完整 `MockSession`。
2. 将 `features/local-assets` repository 映射为私有 Storage 上传/读取协议，并为 asset 元数据、缩略图、清理状态定义服务端表结构。
3. 统一 capability / policy 规则，形成服务端可复核的权限契约。
4. 为投票、行程提案、成员治理、归档推进设计事务边界和幂等键。
5. 为移动端文件上传、手势和键盘建立回归测试或手动验收表。

## 2026-07-19 历史同步：旧 Board 组件与领域命令变化

> 本节保留迁移前架构记录；当前正式 Room 边界以 2026-07-23 Memoir 章节为准。

### Board 边界

- `features/room/components/board-panel.tsx` 现在只负责本地命令编排和少量页面级状态。
- `features/room/components/board/` 分别承载 canvas 手势、内容渲染、Sequence、创建/背景卡、Note、Doodle、评论和图片压缩。
- 画布手势通过 `use-board-interaction.ts` 隔离；Board 与 Rooms 继续共用 `core/domain/board-layout.ts`。
- `BoardBackground`、`BoardNoteVariant`、`BoardComment` 已进入 domain；评论通过房间级 `boardComments` 集合引用 `photoId`，不再嵌入 `BoardPhoto`；`SET_BOARD_BACKGROUND`、`ADD_BOARD_COMMENT` 已进入 `MockCommand`。

### Chat 边界

- `ChatMessage.content` 是 image / location / voice 的可辨识联合类型，`chat-message.tsx` 负责消息展示。
- `chat-panel.tsx` 仍同时管理列表滚动、附件权限、图片处理、录音、定位、消息操作和 Poll，是当前主要超长组件风险。
- 持久化恢复会校验消息 content 的类型、asset reference、坐标范围、持续时间和 MIME；但 `POST_MESSAGE` reducer 写入路径尚未调用同等级运行时 schema，只检查房间能力和 author。

### 后端映射要求

- image / voice 的 `AssetReference` 在生产 DTO 中必须映射为服务端 asset id / Storage object，不得接受客户端伪造的对象归属。
- location DTO 应明确坐标精度、显示 label、用户确认和删除/保留规则。
- Board comment 应成为独立实体或受控 mutation，服务端复核成员资格、目标 item、内容长度、限流和服务器时间。
- Board background 属于房间级共享状态，生产写入需要版本或更新时间处理 Realtime 乱序。

## 2026-07-20 历史同步：持久化版本与交互元数据

- `MockSession` 当前版本为 v7；恢复层兼容 v3-v6，继续迁移旧行程和照片评论。回忆录页字段为可选并由 document model 补默认双页；未来数据库迁移必须由正式 migration 完成，不能复用客户端补值逻辑作为权威数据修复。
- 创建向导的进行中草稿使用独立键 `eventspace:create-room-draft:v1`，只保存轻量创建字段；读取时执行结构检查和范围收敛，创建成功后清理，并强制把 `acceptedTerms` 恢复为 `false`。
- `create-room-wizard.tsx` 负责流程编排，草稿存储、创建服务和邀请卡展示/导出已拆到独立模块。Canvas 导出是客户端便利功能，QR 仍为视觉 mock。
- Board photo 新增 `frameVariant`，由 `core/domain/board-layout.ts` 统一计算相框预览和实际比例；Board、Sequence、Rooms snapshot 消费同一元数据。
- Board background 扩展到六个稳定枚举，Room extension 使用独立模型统一 5 分钟步进、格式化和最长时长计算。

### Board 评论实体边界

- `BoardComment` 现在拥有稳定 `id`、`photoId`、`actorId`、`body`、`createdAt`，可直接映射未来评论表和按照片分页查询。
- `ADD_BOARD_COMMENT` 只接受已存在的照片目标并拒绝重复 comment id；删除照片会同步移除本地关联评论。
- 当前本地集合仍随整个 `MockSession` JSON 保存。生产端需要数据库外键、事务或受控级联、服务端鉴权、限流、分页和审计，不能把本地 reducer 当作安全边界。
- 内联 Poll 的“本次访问可见、再次进入后隐藏”由页面访问状态和本地投票记录共同决定；生产端仍需以唯一 voter 约束和权威查询结果返回卡片可见性。

## 2026-07-23 历史同步：Memoir 架构边界

- `memoir-panel.tsx` 是本地命令编排器；`memoir-model.ts` 负责从兼容 item 数据构造偶数页与 spread；`photos-view.tsx`、`memoir-spread-editor.tsx` 和 `memoir-add-dock.tsx` 分别负责浏览、聚焦编辑和来源选择。
- Book 被拆为 `book-reader.tsx`、`book-pages.tsx`、`use-book-page-flip.ts` 和独立 CSS Module。`page-flip` 只在客户端动态加载，阅读器不拥有业务数据或写命令。
- `ADD_MEMOIR_PHOTO` 同一 reducer 更新中写入照片和可选 caption；`ADD_MEMOIR_SPREAD` 固定增加两页；`SET_MEMOIR_PAGE_STYLE` 校验页码与稳定枚举。
- 当前 `BoardItem.memoirPage`、`boardItems`、`boardComments` 和 `canAddBoardItem` 是迁移兼容层。后端契约应重命名为 memoir 领域语言，并避免让 UI 直接依赖数据库表结构。
- 当前模型没有 item 排版版本、spread revision 或并发冲突信息。复杂编辑器和 Realtime 接入前，需要建立独立 placement DTO、乐观并发版本和幂等 mutation。
- Rooms 仍依赖 `core/domain/board-layout.ts` 生成旧 snapshot；在回忆录卡片迁移完成前，不能删除旧 Board 领域代码。
- `END_ITINERARY` 与普通更新分离，避免客户端通过编辑 DTO 伪造实际结束时间；当前 reducer 仍只提供本地规则演示。

## 2026-07-26 当前同步：运行时校准

- `RoomExperience` 只实例化 `ChatPanel`、`PhotosPanel` 和 `ItineraryPanel`。`PhotosPanel` 使用 `boardItems` 中的 `BoardPhoto` 与 `boardComments`，这是当前 mock 的兼容实现，不等同于自由 Board 或 memoir domain。
- `ChatPanel` 的产品入口只包含搜索、文字消息和语音录制；图片/相机/位置发送与聊天 Poll/Votes UI 已移除。`MockCommand` 中保留的 `CREATE_POLL` 等命令只服务于 Room 控制和旧本地数据兼容。
- `create-room-machine.ts` 的 `CreateRoomStep` 为 `details`、`timing`、`review` 三步；创建后的 mock room 固定为 `host-led`。本文先前关于五步创建、Community-led 创建配置和 Book 编排器的描述均为历史实现。
- `page-flip` 已从 `package.json` 和旧类型声明中删除。恢复 Book 时必须重新立项并重新引入最小化客户端边界，不能假设历史依赖仍可用。

## 2026-07-30 当前同步：云端兼容壳与头像字段

- `MockViewer`、`MockJoinRequest` 和 `PersonSummary` 新增可选 `avatarUrl`。Chat、Members、Itinerary、Rooms 和 Account 通过共享 `Avatar` 组件渲染签名头像 URL 或首字母 fallback。
- `BackendSessionProvider.executeCommand` 是当前关键架构边界：本地 reducer 负责乐观 UI，`executeCloudMediaCommand` 负责 voice/photo/comment/delete 的 Storage/RPC 持久化，失败则 hydrate 回 `initialSession`。
- 本地 `dispatch` 仍存在，但云端代码应优先使用 `executeCommand`，这样 UI 才能拿到失败消息并回滚；直接 dispatch 只适合本地 mock/fallback。
- `core/domain/avatar.ts` 固定 `initials`、`single`、`ring` 三种 avatar 文本变体；数据库以 check constraint 约束同一枚举。当前文件中 `ring` 文本存在疑似编码异常，后续应作为代码修复处理。
- Join flow 不再是纯 client state machine：Server Component 先读 invite preview、claims、profile 和 avatar asset，Server Action 负责 anonymous sign-in、identity bootstrap 和 `join_room_with_profile`，Client 只提交昵称并轮询 pending 状态。
- Room share 与创建完成卡依赖 `core/web/use-browser-origin` 获取浏览器 origin，再用 `qrcode` 生成真实 invite URL；SSR 首帧没有 origin 时需要按钮/QR 禁用或占位。

## 2026-08-02 当前同步：媒体变体与 route snapshot 架构

- `AssetReference` 已扩展为同时表达 display、thumbnail、placeholder、尺寸和 `revision`。UI 仍消费领域引用，不直接拼接 Supabase object key；签名 URL 由服务端读模型或 route handler 注入。
- `features/local-assets` 现在同时服务旧本地 Blob 与云端图片 read-through cache：cloud cache key 形如 `cache:{scope}:{asset.id}:{variant}:r{revision}`，不会被普通本地 asset prune 误删。
- `features/room-performance/model/route-snapshots.ts` 负责 `/rooms` 与 Room detail 的 scope-bound 快照；`features/account/model/account-snapshot.ts` 与 `viewer-avatar-cache.ts` 分别负责 Account 和头像缓存。它们都不进入 `MockCommand`，也不是 reducer 状态。
- 快照保存必须剥离 `remoteUrl` / `avatarUrl` 等短期 signed URL；hydrate 后页面仍需要从 Supabase 读取 no-store 权威快照并重新签名。
- 房间卡片照片数据现在由 `list_room_card_media` read model 返回全部 ready photos；`features/rooms/model/photo-stack-window.ts` 只控制可见/隐藏预渲染窗口，不能被理解为数据裁剪。
- 图片处理链路拆到 `image-upload.ts` 与 `image-processing.worker.ts`：前者负责编排和主线程 fallback，后者负责 display/thumbnail/placeholder 生成。`compressImage` 只作为旧兼容入口，不应继续扩展。
- Route loading skeleton 属于 App Router 页面体验层；它不改变数据契约、权限或 `MockSession` 恢复规则。

## 2026-08-10 当前同步：服务端成员偏好与双层图片缓存

- `RoomReadModel.viewer.isFavorite` 来自 `viewer_is_favorite`；Rooms 的 Favorite 筛选不再依赖本地 mock 收藏字段。`setRoomFavoriteAction` 和 `hideRoomAction` 是当前 `/rooms` Edit 模式的 Server Action 边界，失败会回滚乐观状态。
- `room_members.is_favorite` / `hidden_at` 属于当前 membership，不是全局 room 属性。隐藏只从当前成员的 collection 查询中排除房间，直接 room read 仍以成员授权为准。
- `features/local-assets` 现在把已授权图片同时写入 Cache Storage 和 IndexedDB；`readBestCachedImage` 先找 display，再在有 thumbnail 时回退 thumbnail。缓存 key 仍由 scope、asset、variant、revision 决定，不能被 `MockSession` 或普通 asset prune 当作业务数据处理。

## 2026-08-11 当前同步：Zine 独立本地架构

- `/zine` 不使用 `MockSession`、`BackendSessionProvider` 或现有房间 Repository；创建器自己的 reducer 管理 `ZineDraft`、`ZinePhoto` 和 `manualSpreads`。
- `zine-manual-layout.ts` 负责 spread/page 模型、样式容量和初始照片分配；`zine-pages.ts` 将草稿转换为 Reader 页面数据，避免 UI 卡片位置决定阅读顺序。
- Reader 与 Arrange 都通过 React 屏幕外源页 → 克隆页面 → 独立命令式根节点的边界接入 `page-flip`；第三方库不直接接管 React 正在维护的 DOM。
- 当前 Zine 没有本地持久化或服务端数据层，因此不能复用现有房间 session 的缓存、权限或恢复语义。未来若进入生产，应先建立独立的 draft/version/page/asset DTO 和 Repository。

## 2026-08-12 当前同步：Zine Recipe Contract 与开发态预览

- `/zine` 仍然是独立的 Client-only vertical slice，但 Arrange 已不再只是样式字符串和手动坐标：`recipe-contract.ts` 提供 Recipe Definition、Validator、Compatibility 和确定性的 Recipe Application；`recipe-placement.ts` 保存照片实例级的 `focusX` / `focusY` / `scale`。
- `recipe-renderer.tsx` 与 `recipe-renderer-plan.ts` 是编辑器、Reader 和开发态 Preview Matrix 共用的渲染边界。`page` Recipe 只修改当前单页，真正的 `spread` Recipe 才原子修改左右页；应用、放置和焦点调整进入同一套 undo/redo 历史。
- 当前可执行目录是 5 个 legacy style Recipe 加 1 个 `Gutter bridge` spread Recipe；Reference Recipe fixtures 共 6 个，只通过 development-only `/zine/preview-matrix` 做容量、比例、Note 和超限场景检查，尚未升级为正式产品目录。
- Preview Matrix 不经过 `StPageFlip`，因此用于验证 Renderer contract，不等同于 Reader 的人工视觉 Gate。正式后端仍不应接受客户端直接提交的 Recipe、照片放置或页面坐标。

## 2026-07-27 当前同步：浏览器导航状态

- `RoomsPage` 通过 `useSyncExternalStore` 读取和订阅当前标签页的 `sessionStorage` UI 状态：`eventspace:rooms:grid` 保存浏览模式，`eventspace:rooms:active-room` 保存 Magazine 最近阅读位置。它们与 `MockSession` 的 `localStorage` 业务数据严格分离，存储失败时页面仍可切换和浏览。
- `useRoomCarousel` 负责恢复和更新最近卡片位置；`RoomCard` 的 compact 照片牌堆只缩小可见渲染窗口，不裁剪 `boardItems` 中的照片数据。该手势/动画状态没有 reducer 命令和后端映射要求。
- `RoomExperience` 将 Chat、Photos、Itinerary 同时挂载到原生横向滚动容器。`ItineraryComposer` 使用 Portal 脱离该容器；这些都是客户端布局隔离，不能被误写成跨页面状态持久化或服务端导航能力。
