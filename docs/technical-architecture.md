# EventSpace 第一版技术架构方案

> 状态：基于已确认的 Next.js、TypeScript、Supabase、PWA、Google Places/Maps 与 Stripe 方向拟定。  
> 原则：个人开发者可维护、移动端优先、数十人房间实时协作、严格服务端授权、托管加密而非 E2EE。

## 1. 选型总览

| 层 | 选择 | 原因 |
| --- | --- | --- |
| Web 应用 | Next.js App Router + TypeScript | SSR、路由、PWA、服务端操作与部署生态成熟。 |
| UI | Tailwind CSS + shadcn/ui 基础组件 + Motion | 保持黑白卡片视觉的一致性，精细控制动效与可访问性。 |
| 数据/鉴权 | Supabase Postgres、Auth、RLS | 单一托管后端，支持 Google、magic link/OTP、匿名会话及行级授权。 |
| 实时 | Supabase Realtime Broadcast + Postgres Changes | 适合数十人私密房间；事件可区分为即时同步与持久化记录。 |
| 媒体 | Supabase Storage 私有 bucket | 房间级授权与 60 秒签名 URL。 |
| 定时任务 | Supabase Cron/pg_cron + Edge Function | 处理归档、到期提醒、清理与通知；不依赖 Vercel Hobby 的低频 Cron。 |
| 部署 | Vercel（生产使用适合商业项目的付费计划） | Next.js 原生部署、全球 CDN、WAF 与预算控制。 |
| 邮件 | Resend 作为 Supabase Auth 的自定义 SMTP | 生产 magic link/OTP 可靠送达；使用自有认证域名。 |
| 支付 | Stripe Checkout + Webhook | USD 一次性房间付费；卡信息不经过应用。 |
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
- 匿名用户有唯一 ID，可通过 RLS 获得严格的房间级权限；JWT 的 `is_anonymous` 声明限制其不能投票、上传、写画板或访问归档。
- 匿名注册须接入 Cloudflare Turnstile，并施加服务端速率限制；匿名用户及已过期访客定时清理。
- 登录升级时，优先将同一匿名身份链接到其邮箱或 Google 身份。若邮箱已有既存账户，使用一次性、已验证的“访客记录认领”流程，把该房间成员资格和已发记录安全合并到目标账户。

## 4. 数据与授权模型

Postgres 是真相来源。核心实体包括：`profiles`、`rooms`、`room_members`、`room_invites`、`room_join_requests`、`messages`、`message_replies`、`board_items`、`board_comments`、`itineraries`、`itinerary_participants`、`polls`、`poll_votes`、`reports`、`payments`、`archive_entries`、`device_bans` 和 `audit_events`。

所有暴露到 Data API 的表均启用 RLS。每项读取和写入策略至少同时验证：

1. 当前认证用户或匿名访客身份；
2. 当前房间成员资格及是否被踢出/拉黑；
3. 房间是否仍在活动期；
4. 角色与登录状态是否满足该操作；
5. 内容所有权和对象所属房间。

Service role key 只在服务端环境使用，绝不发送到浏览器。涉及多表状态变更的动作（结束房间、投票结算、角色转让、踢出、升级权益、访客认领）使用事务化 SQL RPC 或受控 Edge Function，避免客户端串联写入造成竞态。

## 5. 实时协作

- 聊天、投票、行程和画板的最终状态写入 Postgres。
- 通过私有 Realtime channel 广播即时更新；RLS/Realtime Authorization 限制订阅者只能接收有权访问的房间事件。
- 聊天发送：服务端确认持久化成功后广播。
- 画板拖动/缩放：界面本地 120Hz 渲染；仅在结束手势或短节流点持久化，使用 Broadcast 传递实时位置。因为内容只有发布者可移动，不需多人争夺同一元素。
- 客户端使用乐观 UI；断线时保留文字草稿，并重试可安全重放的画板操作。服务端拒绝时展示明确错误。
- 不使用 Presence 作为用户可见在线状态，也不显示输入中或已读；Realtime 仅作为技术同步通道。

## 6. 到期、归档与清理

- 每个写入 RPC/Route Handler 都以数据库服务器时间判断 `now() >= ends_at`；即使后台任务延迟，过期房间也不能写入。
- Supabase Cron 至少每分钟运行：标记到期房间、生成归档、安排提醒、处理免费归档删除与清理过期匿名用户。
- 归档任务必须幂等：重复运行不会重复通知、重复归档或删除错误数据。
- 归档和清理有审计记录、失败重试和管理员告警。

## 7. 媒体、PWA 与性能

### 7.1 媒体

- 浏览器在上传前使用 Worker 压缩、移除 EXIF、验证 10 MB 原始大小限制；服务端再次检查 MIME、尺寸、文件签名及配额。
- Storage bucket 一律私有。读取时由已授权服务端动作生成 60 秒签名 URL；不要使用公开 bucket。签名 URL 在到期前不可按单用户即时撤销，因此到期必须足够短。
- 不存原图。缩略图可在上传阶段生成，供首页卡片和顺序流使用。
- 使用 DOM 卡片与 CSS transforms 实现画板，不引入重量级 Canvas 渲染器；在约 200 照片上限内可维持可访问性与流畅拖动。

### 7.2 PWA

- 配置 Web App Manifest、可安装入口、主题色和图标。
- Service Worker 仅缓存公共应用壳与静态资源；未发送草稿由应用以会话范围的 IndexedDB 数据保存。不永久缓存已认证房间内容或私密媒体。
- 离线状态仅允许查看界面与保留草稿；实时房间读取和写入在重新联网后才进行。

### 7.3 性能要求

- 目标设备支持 120Hz 时，输入、拖动和切换尽可能接近 120fps；普通设备最低保证 60fps。
- 动画只使用 `transform`/`opacity` 等合成友好属性；支持 `prefers-reduced-motion`。
- 图片懒加载、缩略图优先、长列表虚拟化；避免将全量聊天或画板历史一次性渲染。

## 8. 第三方服务边界

### Google Places/Maps

- 采用 Places API (New)，输入至少 3 个字符后再经 250–300ms 防抖请求。
- 每次搜索使用唯一 session token，选中后只请求地点卡片所需的 Essentials 字段；使用字段掩码并配置 API key 的网站来源/接口限制与预算告警。
- 保存用户确认的地点文字、地点 ID 和必要坐标；遵守 Google Maps Platform 当期服务条款与缓存限制。
- 外跳 Google Maps/Apple Maps 不需要在产品内渲染交互地图。

### Stripe

- 仅 USD、一次性 Checkout Session；付款、退款和权限状态只能由经过签名验证的 webhook 更新。
- 产品价格、容量和权益存入配置/数据库，不硬编码在前端。
- 创建房间、活动扩展、永久归档和容量扩展分别使用房间级价格配置。

### 邮件与推送

- Resend 仅发送事务性邮件：登录、归档完成、必要账户安全通知。没有营销邮件。
- 浏览器 Push 只在登录用户主动开启后注册；推送正文不包含聊天、语音或图片内容。

## 9. 可观测性、备份和成本控制

- 自建最小聚合指标：错误计数、延迟、房间创建量、关键操作成功率；不上传内容正文到第三方分析平台。
- 监控 Cron、webhook、归档、删除、Storage 配额和支付权益同步失败；错误告警发送至运营邮箱。
- 开发/封闭测试可使用低成本计划；商业上线前启用生产 SMTP、支付 webhook、付费托管计划、备份审查和预算上限。
- 每月审查媒体存储、数据传输、Google API、邮件与托管用量；当达到预算阈值时关闭非关键新建/上传并告警，而不是产生不可控账单。

## 10. 实施顺序

1. 项目骨架、设计 token、Auth（登录 + 匿名访客）与 RLS 基础。
2. 房间创建/进入、成员资格、到期状态机与私密媒体。
3. 聊天、画板、行程和投票的持久化与私有实时同步。
4. 归档、删除、通知、治理/举报与速率限制。
5. PWA、支付、地图、性能优化和跨浏览器测试。
6. 安全审查、Stripe/邮件/地图生产配置、法律文本审阅和发布检查。
## 2026-07-18 当前同步：技术架构现状与后端接入提醒

当前代码仍是 Next.js App Router + React + TypeScript 的本地优先 Mock。后端目标仍可沿用本文的 Supabase / Postgres / Storage / Realtime 方向，但现状有以下变化需要纳入后续设计：

- 本地状态主入口为 `MockSessionProvider`，通过 `localStorage` 保存 `eventspace:local-session:v1`，兼容旧 `sessionStorage`。
- `MockSession` command reducer 已经覆盖大部分写操作，后端接入时可以把 command 逐步映射为 Server Action / RPC / repository mutation。
- 图片、语音和涂鸦已从会话 JSON 中抽离为 `AssetReference`；Blob 通过 `AssetRepository` 存入 IndexedDB 的 `eventspace-local-assets`，界面只在展示期创建 object URL。旧 data URL 会在恢复会话时迁移。
- Board 和 Rooms 的画板预览共用 `core/domain/board-layout.ts`，这类纯领域计算应继续保留在无 React 依赖的 core 层。
- Board 已拆分编排、手势、展示与 Studio；`features/room/components/chat-panel.tsx` 仍承载较多媒体权限、录音、定位、Poll 和滚动状态，接后端前应继续拆分。
- 字体已改为本地 `public/fonts` + `@font-face`，生产构建不应再依赖构建期远程字体下载。

### 后端接入优先技术事项

- 保持 `AssetReference` 与 `AssetRepository` 作为 UI/领域层稳定契约，把当前 IndexedDB 实现替换为私有 Storage 上传 adapter；服务端返回 asset id、object key、MIME、大小和衍生图信息。
- 媒体元数据写入、房间内容关联和废弃对象清理需要服务端事务/后台任务，不能照搬浏览器端引用扫描。

1. 先定义 DTO 与命令边界，而不是让 UI 直接调用 Supabase 表。
2. 投票、成员治理、行程提案、归档推进必须使用服务端事务和数据库约束。
3. 所有到期、撤回窗口、投票关闭、房间归档必须使用服务端时间。
4. 媒体需要 Storage object、metadata 表、缩略图、EXIF 清理和签名 URL。
5. Realtime 事件只能作为同步通知，不能替代服务端授权和持久化结果。

## 2026-07-19 当前同步：媒体消息与 Board 数据契约

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

## 2026-07-20 当前同步：创建草稿、Board 元数据与延时命令

- `/rooms/new` 当前用独立 `localStorage` 键保存轻量草稿，和共享 `MockSession` 分离。后端接入时应保留“UI draft / create command DTO / persisted room”三层边界，不把浏览器恢复数据直接写入数据库。
- 条款同意在草稿恢复时重置为 `false`；生产端仍需在创建事务中记录条款版本、用户和服务器时间。
- 邀请卡 PNG 由客户端 Canvas 生成，不依赖后端；真实 QR 必须编码带 invite revision 的受控 URL，并考虑轮换、作废和分享后的缓存边界。
- `frameVariant` 与 Board background 是展示元数据，适合进入带默认值和版本兼容的枚举字段；背景静态资源应通过稳定 asset key/CDN 路径发布，不能持久化构建产物 URL。
- Room extension 的 5 分钟步进属于 UI/产品约束。生产 mutation 必须根据套餐上限、房间当前状态、服务器时间和并发更新重新计算 `endsAt`，并使用幂等键或乐观锁避免重复延长。

## 2026-07-20 当前同步：Board 评论数据边界

- `MockSession` 升级到 v6，`BoardPhoto` 不再持有评论数组；`MockRoom.boardComments` 作为独立集合，以 `photoId` 和 `actorId` 建立关联。
- 恢复层兼容 v3/v4/v5：旧照片内嵌评论会被抽取到独立集合，照片对象中的旧 `comments` 字段会移除。
- 本地 `ADD_BOARD_COMMENT` 已具备目标存在校验与 comment id 幂等保护；删除照片会清理关联评论。
- 后端映射建议使用独立 `board_comments` 表、照片外键、作者外键、服务端生成时间、稳定游标分页和受控删除事务。客户端只提交 photo id 与正文，不提交可信作者或创建时间。
- Itinerary 手动结束必须是独立 mutation：服务端校验负责人/管理权限、房间状态和开始时间，以数据库时间写入 `ended_at`，并对重复请求返回同一结果；普通编辑接口不得接受客户端任意覆盖实际结束时间。
