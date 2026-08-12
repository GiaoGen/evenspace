# EventSpace 第一版技术架构方案

> 2026-08-11 当前同步：独立 `/zine` 已有 Client-only 创建器、手动排版模型和 `page-flip` Reader，但尚未进入当前 Supabase 生产数据模型或 MVP 后端排期。

> 状态：2026-08-10 Supabase 封闭 MVP 接线校准；详细实施与任务状态以 [`supabase-backend-integration-plan.md`](./supabase-backend-integration-plan.md) 为准。
> 原则：个人开发者可维护、移动端优先、数十人房间实时协作、严格服务端授权、托管加密而非 E2EE。

## 1. 选型总览

| 层 | 选择 | 原因 |
| --- | --- | --- |
| Web 应用 | Next.js App Router + TypeScript | SSR、路由、PWA、服务端操作与部署生态成熟。 |
| UI | Tailwind CSS + shadcn/ui 基础组件 + Motion | 保持黑白卡片视觉的一致性，精细控制动效与可访问性。 |
| 数据/鉴权 | Supabase Postgres、Auth、RLS | 单一托管后端，支持 Google、magic link/OTP、匿名会话及行级授权。 |
| 实时 | Supabase Realtime private Broadcast | 适合数十人私密房间；数据库提交后只广播权威实体 ID、操作和 revision。 |
| 媒体 | Supabase Storage 私有 bucket | 房间级授权与短期签名 URL；当前 UI 为头像和房间媒体生成 30 分钟读取签名 URL，图片 asset 已携带 display / thumbnail / placeholder / dimensions / revision。 |
| 定时任务 | Supabase Cron/pg_cron + Edge Function | 处理归档、到期提醒、清理与通知；不依赖 Vercel Hobby 的低频 Cron。 |
| 部署 | Vercel（生产使用适合商业项目的付费计划） | Next.js 原生部署、全球 CDN、WAF 与预算控制。 |
| 邮件 | Resend 作为 Supabase Auth 的自定义 SMTP | 生产 magic link/OTP 可靠送达；使用自有认证域名。 |
| 支付 | Stripe-hosted Checkout + Webhook | 一次性房间付费；卡信息不经过应用，权益只由签名 webhook 发放。 |
| 地点 | Google Places API (New) | 地点自动完成、精确地点卡片与 Google/Apple Maps 外跳。 |

技术依赖必须固定主版本范围、启用自动安全更新，并由 lockfile 锁定实际版本。首发不引入微服务、消息队列或自建 WebSocket 集群。

## 2. 部署与区域

- Next.js 部署至 Vercel，使用环境变量区分本地、预览与生产。
- 初始 Supabase 选择 `us-east-1`（North Virginia）作为单一主区域，降低个人开发与北美首发复杂度；欧洲和澳大利亚访问通过全球前端 CDN 加速。
- 应用在隐私政策中明确主要数据处理区域和跨境传输。若欧盟用户量、合同或监管要求提高，再评估建立独立欧盟项目/迁移方案。
- Vercel Hobby 只适用于非商业个人项目；一旦启用房间付费，生产环境采用适合商业使用的 Vercel 计划并设置硬性支出提醒。

## 3. 身份与会话

### 3.1 已登录用户

- Supabase Auth：Google OAuth、无密码 email magic link/OTP。
- Next.js 使用 cookie-based SSR 会话与 PKCE；不使用旧 Auth Helpers。
- 生产配置 Resend 自定义 SMTP 和认证子域名，例如 `auth.<future-domain>`；Supabase 内置 SMTP 仅用于开发/测试。
- 可选账户安全项：上线后提供 TOTP MFA，但不阻塞第一版基本流程。

### 3.2 访客

- 进入房间时使用 Supabase Anonymous Sign-In 创建匿名认证用户，而不是公开数据库匿名访问。
- 匿名用户有唯一 ID，可通过 RLS 获得严格的房间级权限；JWT 的 `is_anonymous` 声明限制其不能上传 Photos、评论、购买权益或访问归档，但允许在房间未过期且未被禁言时发送文本和短语音。
- 匿名注册须接入 Cloudflare Turnstile，并施加服务端速率限制；匿名用户及已过期访客定时清理。
- 登录升级时，优先将同一匿名身份链接到其邮箱或 Google 身份。若邮箱已有既存账户，使用一次性、已验证的“访客记录认领”流程，把该房间成员资格和已发记录安全合并到目标账户。

## 4. 数据与授权模型

Postgres 是真相来源。首期核心实体包括：`profiles`、`actors`、`terms_acceptances`、`rooms`、`room_members`、`room_preferences`、`room_invites`、`room_join_requests`、`actor_claim_challenges`、`messages`、`message_reactions`、`message_pins`、`assets`、`photos`、`photo_comments`、`itineraries`、`reports`、`room_bans`、`archive_entries`、`audit_events`、`command_receipts` 和 `outbox_jobs`。`profiles`、`room_members` 与 `room_join_requests` 当前已携带 `avatar_variant` / `avatar_asset_id`，`room_members` 另有当前成员级 `is_favorite` / `hidden_at`；头像 asset 继续复用私有 `assets` + `room-media`。图片类 asset 当前还携带 `thumbnail_object_key`、`thumbnail_byte_size`、`placeholder_data_url`、`image_width`、`image_height` 与 `media_revision`，用于区分 display 与 thumbnail 衍生资源。支付模块包括 `products`、`prices`、`checkout_sessions`、`payment_events`、`room_entitlements` 和 `refund_events`。Room 内 Book 与投票均不进入首批 schema；独立 `/zine` 当前也不进入 schema，旧 `board_items` / `board_comments` 只作为本地兼容来源评估。

所有暴露到 Data API 的表均启用 RLS。每项读取和写入策略至少同时验证：

1. 当前认证用户或匿名访客身份；
2. 当前房间成员资格及是否被踢出/拉黑；
3. 房间是否仍在活动期；
4. 角色与登录状态是否满足该操作；
5. 内容所有权和对象所属房间。

Secret/service role key 只在服务端环境使用，绝不发送到浏览器。涉及多表状态变更的动作（结束房间、角色转让、踢出、升级权益、访客认领）使用事务化 SQL RPC 或受控服务端流程，避免客户端串联写入造成竞态。

## 5. 实时协作

- Chat、Photos、Itinerary、成员和房间生命周期的最终状态写入 Postgres。
- 通过私有 Realtime channel 广播即时更新；RLS/Realtime Authorization 限制订阅者只能接收有权访问的房间事件。
- 聊天发送：服务端确认持久化成功后广播。
- 客户端使用乐观 UI；断线时保留文字草稿，并用幂等键重试可安全重放的命令。服务端拒绝、权限变化或 revision 冲突时展示明确错误。
- 不使用 Presence 作为用户可见在线状态，也不显示输入中或已读；Realtime 仅作为技术同步通道。

## 6. 到期、归档与清理

- 每个写入 RPC/Route Handler 都以数据库服务器时间判断 `now() >= ends_at`；即使后台任务延迟，过期房间也不能写入。
- Supabase Cron 至少每分钟运行：标记到期房间、生成归档、安排提醒、处理免费归档删除与清理过期匿名用户。
- 归档任务必须幂等：重复运行不会重复通知、重复归档或删除错误数据。
- 归档和清理有审计记录、失败重试和管理员告警。

## 7. 媒体、PWA 与性能

### 7.1 媒体

- 浏览器在上传前使用 Worker 压缩、移除大部分 EXIF、验证 12 MB 本地输入限制，并生成 display JPEG、thumbnail JPEG、placeholder data URL、宽高和 revision；不支持 Worker/OffscreenCanvas 时回退主线程处理。
- Storage bucket 一律私有。读取时由已授权服务端动作生成短期签名 URL；当前 helper 批量签 display 与 thumbnail，默认有效期 30 分钟。签名 URL 在到期前不可按单用户即时撤销，因此到期必须足够短，且不得持久化到本地 snapshot。
- 不存原图。图片上传当前保存 display 与 thumbnail 两个对象，服务端 RPC 约束 display 不超过 2.25 MB、thumbnail 不超过 180 KB、placeholder data URL 长度、尺寸上限和 revision。
- `AssetReference` 是 UI/领域层稳定契约，已包含可选 `thumbnail`、`placeholderDataUrl`、`width`、`height` 与 `revision`。legacy asset 缺少 variant 字段时，服务端读取层会降级为单 display URL。
- 当前 Photos 仍使用 CSS 网格与照片详情层；Room 内 Book/StPageFlip 不参与运行时。独立 `/zine` 已重新引入客户端动态 `page-flip@2.0.7`，但它只服务本地 Zine Reader，不改变 Room 后端架构。

### 7.2 Zine 当前客户端边界

- `/zine` 是独立 Client Component；`useReducer` 持有 `ZineDraft`，照片使用浏览器 `File` 与 Object URL，刷新/离开路由即丢失。
- `zine-manual-layout.ts` 和 `zine-pages.ts` 将手动 spread/page 数据与 Reader 页面模型分开；Step 2 的视觉分行不参与阅读顺序。
- `page-flip@2.0.7` 只在客户端动态加载。Reader 和 Arrange 都先渲染隐藏源页，再克隆到独立命令式根节点；StPageFlip 不直接接管 React 管理的 DOM。
- 当前没有 Zine Auth、Storage、数据库、Realtime、AI provider 或 server mutation。未来若进入生产，应为 draft/version/page/asset 建立独立 DTO、Repository、私有 Storage 和 RLS 设计，不复用 `MockSession` 作为权威状态。

- 当前客户端另有 `recipe-contract.ts`、`recipe-placement.ts`、`recipe-renderer.tsx` 和 `recipe-renderer-plan.ts`：它们分别负责 Recipe schema/校验/应用、照片实例焦点、统一渲染计划和 Editor/Reader 输出。`reference-recipe-gate.tsx` 与 `/zine/preview-matrix` 仅用于 development 验证，不进入生产路由。
- `ZineDraft` 的 Recipe Application、`unplacedPhotoIds`、隐藏 Note 和 undo/redo 都是内存状态；单页应用不改变配对页，spread 应用整体替换左右页。客户端状态不应直接映射成 SQL 表或被当作后端授权结果。

## 2026-08-12 当前同步：Recipe Contract 已实现但仍是前端本地切片

- 最新提交已完成 Recipe Contract v1 的纯逻辑实现、共享 Renderer、Reference fixtures/矩阵和自动化测试；正式执行目录为 5 个 legacy style 加 1 个 spread Recipe，Reference fixtures 仍是 draft。
- 这一层解决的是手动排版和未来 AI 排版共用的确定性规则，不代表 AI provider、远程 Recipe 发布、数据库持久化、多人协作或生产 Reader 数据流已经启动。
- 进入生产前必须把 Recipe ID/version、Application、页面版本、资产所有权和照片实例焦点纳入服务端 schema/command 校验，并为私有媒体建立 Storage/RLS；不能信任浏览器提交的 `recipeId`、坐标或可见性状态。

### 7.3 PWA

- 配置 Web App Manifest、可安装入口、主题色和图标。
- Service Worker 仅缓存公共应用壳与静态资源；未发送草稿由应用以会话范围的 IndexedDB 数据保存。不永久缓存已认证房间内容或私密媒体。
- 离线状态仅允许查看界面与保留草稿；实时房间读取和写入在重新联网后才进行。

### 7.3 性能要求

- 目标设备支持 120Hz 时，输入、拖动和切换尽可能接近 120fps；普通设备最低保证 60fps。
- 动画只使用 `transform`/`opacity` 等合成友好属性；支持 `prefers-reduced-motion`。
- 图片懒加载、缩略图优先、长列表虚拟化；避免将全量聊天或全部 Photos 原图一次性渲染。
- `/rooms`、Room detail、Account 与 viewer avatar 使用浏览器 snapshot/cache 作为路由加速层：本地仅保存 scope-bound、去签名 URL 的展示快照；进入页面后仍要读取 Supabase 权威快照。房间照片另用 Cache Storage 与 IndexedDB read-through cache 保存 display/thumbnail Blob，并用 viewer scope、asset id、variant 和 revision 组成缓存键。

## 8. 第三方服务边界

### Google Places/Maps

- 采用 Places API (New)，输入至少 3 个字符后再经 250–300ms 防抖请求。
- 每次搜索使用唯一 session token，选中后只请求地点卡片所需的 Essentials 字段；使用字段掩码并配置 API key 的网站来源/接口限制与预算告警。
- 保存用户确认的地点文字、地点 ID 和必要坐标；遵守 Google Maps Platform 当期服务条款与缓存限制。
- 外跳 Google Maps/Apple Maps 不需要在产品内渲染交互地图。

### Stripe

- 使用 `mode = payment` 的一次性 Checkout Session；首发币种由实际收费主体和结算账户确认，不在代码中预设为 USD。
- 付款、退款和权益状态只能由经过签名验证且幂等处理的 webhook 更新；success redirect 不能解锁权益。
- 产品价格、容量和权益存入配置/数据库，不硬编码在前端。
- MVP 商品为 Event Upgrade 和 Permanent Archive；容量扩展包后续再加入。

### 邮件与推送

- Resend 仅发送事务性邮件：登录、归档完成、必要账户安全通知。没有营销邮件。
- 浏览器 Push 只在登录用户主动开启后注册；推送正文不包含聊天、语音或图片内容。

## 9. 可观测性、备份和成本控制

- 自建最小聚合指标：错误计数、延迟、房间创建量、关键操作成功率；不上传内容正文到第三方分析平台。
- 监控 Cron、webhook、归档、删除、Storage 配额和支付权益同步失败；错误告警发送至运营邮箱。
- 开发/封闭测试可使用低成本计划；商业上线前启用生产 SMTP、支付 webhook、付费托管计划、备份审查和预算上限。
- 每月审查媒体存储、数据传输、Google API、邮件与托管用量；当达到预算阈值时关闭非关键新建/上传并告警，而不是产生不可控账单。

## 10. 实施顺序

1. 冻结 Host-led、Chat 文本/语音、Photos、Itinerary、支付与延后能力的范围。
2. 建立 Supabase 本地工程、Next.js 16 SSR Auth、migration、类型生成和 RLS 测试底座。
3. 建立 Auth、actors、房间、成员资格、邀请、到期状态机与私有 Realtime。
4. 持久化 Chat、Itinerary、Photos 和私有媒体流水线。
5. 接入 Stripe Checkout、Webhook、房间权益和永久归档。
6. 单独完成 Book MVP 候选设计评审；投票继续延后。
7. 完成 Cron、审计、限流、备份、PWA、地图、邮件、法律与生产发布检查。

## 2026-07-27 当前同步：后端范围冻结

- 当前和首期生产房间仅支持 Host-led，不建设 Community-led/无 Host 模式。
- Chat 首期仅支持文本和最长 60 秒的短语音；历史图片/位置联合类型不代表生产发送能力。
- Photos 是当前正式媒体区域；生产 schema 使用 `photos` / `photo_comments` / `assets`，不复制 `boardItems` 兼容命名。
- Book 延后重新设计，但优先级高于投票，并保留进入 MVP 的可能；设计确认前不创建 Book 表。
- 投票系统延后；现有 Poll reducer/type 只服务旧 session 兼容和历史记录，不创建生产 Poll API。
- 支付进入 MVP，采用 Stripe-hosted Checkout 的一次性房间付费，首期商品为 Event Upgrade 和 Permanent Archive。
- [`supabase-backend-integration-plan.md`](./supabase-backend-integration-plan.md) 是后端实施、验收和任务 Mark 的唯一主计划书。

## 2026-07-30 当前同步：头像、匿名加入与 QR 接线

- Account avatar 采用与 Photos/Voice 相同的私有 Storage 策略：客户端先请求 `prepare_profile_avatar_upload`，服务端创建 pending `assets` 记录和 object key；浏览器用 signed upload token 上传；`finalize_profile_avatar_upload` 校验 Storage object 存在后把 asset 标记 ready 并写回 profile。
- `security.can_read_avatar_asset` 是头像读取的专用补充策略：头像拥有者、可读房间成员、以及可管理 pending request 的 Host 可以读取相应 asset；组件只消费服务端生成的 signed URL，不直接拼 Storage object key。
- 加入房间使用 `join_room_with_profile`，在既有 invite 事务之外写入 avatar variant / asset。未登录访客由 Server Action 先 `signInAnonymously`，再 `bootstrap_identity`，因此数据库 `anon` role 仍不能直接执行加入 RPC。
- 待审核状态由 `/join/status` route handler 读取 `get_join_request_status`，只返回 pending/approved/rejected，并设置 `Cache-Control: private, no-store`；这不是 Realtime，当前是 3 秒轮询。
- 邀请 QR 由 `qrcode` 包在浏览器生成，并编码当前 origin + private invite token URL；下载 PNG 也使用同一真实 URL。旧 fake QR 不再代表当前行为。
- `next.config.ts` 根据 `NEXT_PUBLIC_SUPABASE_URL` 放行当前 Supabase host 的 `/storage/v1/object/sign/room-media/**` 图片；切换 Supabase 项目时需要随 public env 重新构建。
- `BackendSessionProvider.executeCommand` 已成为云端房间命令适配层：本地 reducer 先乐观应用，支持的命令上传媒体或调用 RPC，失败后 hydrate 回服务器快照并把错误返回 UI。
- 后端风险：头像和房间媒体仍缺服务端 EXIF 清理、转码、缩略图、恶意文件扫描、引用计数清理；匿名访客还需要 Turnstile、速率限制和清理任务才能作为生产安全承诺。

## 2026-08-02 当前同步：媒体变体、快照缓存与性能接线

- Photos 图片路径升级为 display / thumbnail / placeholder 三件套：`prepare_room_media_upload_v2` 创建 display 与 thumbnail object key，`finalize_room_media_upload_v2` 校验 Storage 对象存在后写入 variant 元数据并返回可签名 asset。
- `data/supabase/media-variant-compat.ts` 是 schema 灰度兼容层：新字段存在时读取 variant；遇到缺列或 PostgREST schema cache 未刷新时回退 legacy asset 字段。该兼容层不应长期替代 migration 验收。
- `list_room_card_media` 已成为房间卡片媒体 read model：返回每个房间全部 ready photos 和 `photo_count`，客户端用有限窗口控制可见照片堆，而不是让数据库查询只给前 5 张。
- `createSignedMediaUrls` 批量生成 display/thumbnail signed URL map，避免在 Rooms 卡片、Room detail 和 account/avatar 路径中逐资产串行签名。
- 本地 route snapshot 使用 `localStorage` + `sessionStorage` cache scope：`eventspace:rooms-snapshot:v1`、`eventspace:room-snapshot:v1:{scope}:{publicId}`、`eventspace:account-snapshot:v1` 与 `eventspace:viewer-avatar:v1:{scope}`。保存前必须移除 signed URL，缓存失败或过期时页面仍能正常回源。
- `eventspace:room-photo-cache:v3` 是云端图片 Blob 加速缓存，不是业务状态。它按 display/thumbnail variant 和 revision 缓存，优先当前照片窗口与前 12 张网格缩略图，后台再缓存其余资源；401/403 视为签名 URL 过期并触发刷新。
- Rooms UI 的照片堆 entry animation、decode 协调和 Grid/Magazine fade 只属于表现层；其状态不进入 Supabase，也不应成为跨设备同步需求。

## 2026-08-10 当前同步：成员偏好与图片读取层

- `room_members.is_favorite` / `hidden_at` 是当前 primary actor 的 membership 偏好；`security.*` 使用 `security definer` + 空 `search_path` 实现，`public.*` wrapper 保持 `security invoker`，且只向 `authenticated` 授予执行权限。
- `list_current_user_rooms` 使用 `hidden_at is null` 形成个人 Rooms collection；`get_current_user_room` 不因隐藏而拒绝已授权成员的直接读取。写入 RPC 同时校验当前 actor、membership 状态、room 可读权限和公开 ID，隐藏时清除收藏。
- `readBestCachedImage` 和 `getImageVariantReference` 让 display 缓存满足较小图片请求，缺失时回退 thumbnail；缓存失效、scope 改变或 revision 更新都不能跳过 Supabase 重新授权。

## 2026-07-18 历史同步：技术架构现状与后端接入提醒

本节为历史同步，保留用于理解旧本地优先阶段；当前判断以 2026-08-02 同步为准。

- 本地状态主入口为 `MockSessionProvider`，通过 `localStorage` 保存 `eventspace:local-session:v1`，兼容旧 `sessionStorage`。
- `MockSession` command reducer 已经覆盖大部分写操作，后端接入时可以把 command 逐步映射为 Server Action / RPC / repository mutation。
- 图片、语音和涂鸦已从会话 JSON 中抽离为 `AssetReference`；Blob 通过 `AssetRepository` 存入 IndexedDB 的 `eventspace-local-assets`，界面只在展示期创建 object URL。旧 data URL 会在恢复会话时迁移。
- Board 和 Rooms 的画板预览共用 `core/domain/board-layout.ts`，这类纯领域计算应继续保留在无 React 依赖的 core 层。
- Board 已拆分编排、手势、展示与 Studio；`features/room/components/chat-panel.tsx` 仍承载较多媒体权限、录音、定位、Poll 和滚动状态，接后端前应继续拆分。
- 字体已改为本地 `public/fonts` + `@font-face`，生产构建不应再依赖构建期远程字体下载。

### 当时的后端接入优先技术事项

- 保持 `AssetReference` 与 `AssetRepository` 作为 UI/领域层稳定契约，把当前 IndexedDB 实现替换为私有 Storage 上传 adapter；服务端返回 asset id、object key、MIME、大小和衍生图信息。
- 媒体元数据写入、房间内容关联和废弃对象清理需要服务端事务/后台任务，不能照搬浏览器端引用扫描。

1. 先定义 DTO 与命令边界，而不是让 UI 直接调用 Supabase 表。
2. 投票、成员治理、行程提案、归档推进必须使用服务端事务和数据库约束。
3. 所有到期、撤回窗口、投票关闭、房间归档必须使用服务端时间。
4. 媒体需要 Storage object、metadata 表、缩略图、EXIF 清理和签名 URL。
5. Realtime 事件只能作为同步通知，不能替代服务端授权和持久化结果。

## 2026-07-19 历史同步：媒体消息与旧 Board 数据契约

- `ChatMessage.content` 已形成 image / location / voice 联合类型并使用 asset reference；生产 schema 应将其映射为服务端 asset id，并继续使用结构化 location DTO。
- 本地图片使用 canvas 解码和 JPEG 压缩；本地语音使用 `MediaRecorder`；这些是采集端实现，不等于生产上传流水线。
- 生产媒体流程必须采用“申请上传 → 私有 Storage → 服务端校验/转码 → 消息提交 asset id → Realtime 广播”的两阶段或受控事务流程。
- Board comment 已进入本地命令。生产端建议使用独立 `board_comments` mutation/table，而不是更新整个 `board_items.comments` JSON 数组。
- Board background 是轻量共享房间状态；需要服务端版本字段或权威更新时间，避免 Realtime 乱序覆盖较新选择。
- Board 拖动和缩放继续在客户端高频渲染，只在手势结束时提交最终坐标；后端不得接收每个 pointer move 作为数据库写入。

### 当前新增后端风险

1. `POST_MESSAGE` 本地 reducer 尚未对 content 调用与恢复解析相同的运行时 schema；服务端 DTO 必须独立校验 discriminant、asset、坐标、MIME、时长和文本。
2. 精确位置需要显式用户动作、最小精度和保留策略，不能默认持续采集。
3. Safari 可能产生 MP4/AAC，Chromium 常见 WebM/Opus；后端必须转码为统一播放格式并保留可信 metadata。

## 2026-07-20 历史同步：创建草稿、旧 Board 元数据与延时命令

- `/rooms/new` 当前用独立 `localStorage` 键保存轻量草稿，和共享 `MockSession` 分离。后端接入时应保留“UI draft / create command DTO / persisted room”三层边界，不把浏览器恢复数据直接写入数据库。
- 条款同意在草稿恢复时重置为 `false`；生产端仍需在创建事务中记录条款版本、用户和服务器时间。
- 邀请卡 PNG 由客户端 Canvas 生成，不依赖后端；真实 QR 必须编码带 invite revision 的受控 URL，并考虑轮换、作废和分享后的缓存边界。
- `frameVariant` 与 Board background 是展示元数据，适合进入带默认值和版本兼容的枚举字段；背景静态资源应通过稳定 asset key/CDN 路径发布，不能持久化构建产物 URL。
- Room extension 的 5 分钟步进属于 UI/产品约束。生产 mutation 必须根据套餐上限、房间当前状态、服务器时间和并发更新重新计算 `endsAt`，并使用幂等键或乐观锁避免重复延长。

## 2026-07-20 历史同步：旧 Board 评论数据边界

- `MockSession` 升级到 v6，`BoardPhoto` 不再持有评论数组；`MockRoom.boardComments` 作为独立集合，以 `photoId` 和 `actorId` 建立关联。
- 恢复层兼容 v3/v4/v5：旧照片内嵌评论会被抽取到独立集合，照片对象中的旧 `comments` 字段会移除。
- 本地 `ADD_BOARD_COMMENT` 已具备目标存在校验与 comment id 幂等保护；删除照片会清理关联评论。
- 后端映射建议使用独立 `board_comments` 表、照片外键、作者外键、服务端生成时间、稳定游标分页和受控删除事务。客户端只提交 photo id 与正文，不提交可信作者或创建时间。

## 2026-07-23 历史同步：回忆录数据与翻页依赖

- 当时 `page-flip@2.0.7` 未被运行时代码引用；截至 2026-08-10 Room Book 依赖和旧类型声明仍已移除。2026-08-11 独立 `/zine` 重新引入该包作为 Client-only Reader，但仍没有正式数据模型、持久化或生产后端，未来进入生产必须重新立项。
- 当前本地 schema 以 `BoardPhoto`/`boardItems`、`boardComments` 和 `AssetReference` 驱动 Photos 网格。生产建议拆分为 photo、comment、asset 等领域 DTO，不应直接复制兼容字段名称。
- 添加照片与 caption 必须是同一服务端事务：服务端复核成员资格、房间状态、目标页、asset 所有权、照片配额和正文长度，并写入服务器作者/时间。
- 新增 spread 和修改纸张样式需要 expected revision 或等价乐观并发控制；Realtime 只广播权威页版本，不传播 StPageFlip 动画状态。
- Book 阅读查询应按页分页并返回缩略图资产；不能一次返回 500 页全部原图。Photos 长列表后续需要窗口化，照片详情再获取适合屏幕的 rendition。
- 旧 `board_items` 可以在迁移期作为 source 表，但正式 API 不应继续暴露 x/y/rotation 等旧画布字段作为回忆录必填项。
- Itinerary 手动结束必须是独立 mutation：服务端校验负责人/管理权限、房间状态和开始时间，以数据库时间写入 `ended_at`，并对重复请求返回同一结果；普通编辑接口不得接受客户端任意覆盖实际结束时间。
