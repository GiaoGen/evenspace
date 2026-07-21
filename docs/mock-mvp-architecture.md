# EventSpace 类型化 Mock MVP 架构

> 状态：2026-07-20 本地优先交互式 Mock。该实现用于验证产品结构、页面边界、响应式布局、领域命令和完整核心旅程，不连接 Supabase，也不代表真实身份、权限、实时同步或服务器数据持久化已经完成。

## 1. 可运行范围

| 路由 | 类型 | 当前能力 |
| --- | --- | --- |
| `/` | Server Component | 正式 Landing；进入房间列表或样例房间 |
| `/rooms` | Server page + Client collection | 读取当前 mock viewer 的房间；状态筛选、搜索、杂志/双列视图、本地收藏 |
| `/rooms/[roomId]` | Server page + Client experience | 校验参数并鉴权读取；通过顶部常驻按钮切换 Chat、Board、Itinerary |
| `/rooms/new` | Client state machine | 五步创建向导、逐步校验和明确的临时 Mock 完成态 |
| `/join/[roomId]` | Client state machine | 邀请、唯一昵称、申请备注、等待与审核闭环 |
| `/account` | Client settings | 资料、Mock 登录状态、主题与会话重置 |
| `/legal/[document]` | Server page | 法律文档结构草案与专业审阅警告 |

正式产品路由共享版本化 `MockSession`。创建、消息、投票、Board、Itinerary、治理和个人归档操作通过同一纯 reducer 命令写入 `localStorage`；刷新和重开浏览器通常恢复，Reset 或清除站点数据恢复 fixture。界面持续说明其没有写入服务端。

## 2. 目录与依赖方向

```text
app/                    路由、Metadata、加载/错误/Not Found 边界
components/             无业务数据访问的共享 UI
features/landing/       Landing 页面组合
features/rooms/         房间列表与卡片交互
features/room/          Room 外壳及 Chat/Board/Itinerary；Board 与 Itinerary 已拆分编排、模型和展示组件
features/create-room/   创建草稿类型、独立草稿存储、纯 reducer 状态机、五步向导与邀请卡导出
features/mock-session/  版本化浏览器会话、领域命令、selectors 与恢复校验
features/join/          私密邀请与申请状态机
features/account/       Mock 身份、主题、重置与法律入口
core/domain/            领域类型、品牌 ID、状态枚举
core/security/          与 UI 无关的权限派生
data/contracts/         Repository 接口
data/mock/              经过运行时检查的 fixture 与 Mock Repository
data/rooms.ts           server-only 数据访问入口和最小 View DTO
```

依赖只允许由页面/feature 指向领域和数据接口；`core` 不依赖 React、Next.js 或 Supabase。正式 Supabase Repository 需要实现相同 `RoomRepository`，页面不直接查询数据库。

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
- 访客默认不能投票或写画板；Host/Admin/Member 权限由同一纯函数派生。
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
## 2026-07-18 当前同步：Mock MVP 架构现状

当前 Mock MVP 已经不只是静态 fixture 展示，而是本地优先的可操作产品壳：

- `MockSessionProvider` 负责从 `localStorage` 恢复 `eventspace:local-session:v1`，并兼容旧 `sessionStorage` 键。
- `features/mock-session/model/mock-session.ts` 仍是主要状态转换中心，包含创建房间、发消息、投票、画板 item、行程、成员治理、归档等命令。
- `core/domain/asset.ts` 定义稳定 `AssetReference` 及运行时校验；Chat image/voice 与 Board photo/drawing 只保存引用，Blob 由实现 `data/contracts/asset-repository.ts` 的 IndexedDB repository 管理。
- `core/domain/board-layout.ts` 为 Board 与 Rooms 卡片共用画板 item 尺寸、边界和 fit 计算。
- `features/room/components/chat-panel.tsx` 和 `features/room/components/board-panel.tsx` 承载了大量移动端交互逻辑，后续需要拆分 hooks / 子组件，避免接后端时继续膨胀。
- `data/mock/mock-runtime.ts` 继续阻止正式生产环境默认运行固定 mock 身份；本地 build/start 可直接验证 mock。
- 字体不再依赖 `next/font` 远程拉取，改为 `public/fonts` + `@font-face`。

### 当前架构优点

- 页面、feature、domain、data contract 的方向仍然清晰。
- 主要写操作已收敛到 command/reducer，后续可以逐个映射到 Server Action、RPC 或 repository mutation。
- `POST_MESSAGE` 与 `ADD_BOARD_ITEM` 在本地命令边界执行运行时结构校验，相关规则可迁移为后端 DTO schema；生产端仍必须独立校验所有不可信请求。
- Board fit、照片比例、画板预览等逻辑已经开始进入 `core/domain`，不是完全散落在 UI。
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

## 2026-07-19 当前同步：组件与领域命令变化

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

## 2026-07-20 当前同步：持久化版本与交互元数据

- `MockSession` 当前版本为 v6；恢复层会把 v3/v4 行程补齐结束模式、计划/实际结束时间、所有者和时间戳，并把 v3/v4/v5 的照片内嵌评论迁移为房间级 `boardComments`。未来数据库迁移必须由正式 migration 完成，不能复用客户端补值逻辑作为权威数据修复。
- 创建向导的进行中草稿使用独立键 `eventspace:create-room-draft:v1`，只保存轻量创建字段；读取时执行结构检查和范围收敛，创建成功后清理，并强制把 `acceptedTerms` 恢复为 `false`。
- `create-room-wizard.tsx` 负责流程编排，草稿存储、创建服务和邀请卡展示/导出已拆到独立模块。Canvas 导出是客户端便利功能，QR 仍为视觉 mock。
- Board photo 新增 `frameVariant`，由 `core/domain/board-layout.ts` 统一计算相框预览和实际比例；Board、Sequence、Rooms snapshot 消费同一元数据。
- Board background 扩展到六个稳定枚举，Room extension 使用独立模型统一 5 分钟步进、格式化和最长时长计算。

### Board 评论实体边界

- `BoardComment` 现在拥有稳定 `id`、`photoId`、`actorId`、`body`、`createdAt`，可直接映射未来评论表和按照片分页查询。
- `ADD_BOARD_COMMENT` 只接受已存在的照片目标并拒绝重复 comment id；删除照片会同步移除本地关联评论。
- 当前本地集合仍随整个 `MockSession` JSON 保存。生产端需要数据库外键、事务或受控级联、服务端鉴权、限流、分页和审计，不能把本地 reducer 当作安全边界。
- 内联 Poll 的“本次访问可见、再次进入后隐藏”由页面访问状态和本地投票记录共同决定；生产端仍需以唯一 voter 约束和权威查询结果返回卡片可见性。
- `END_ITINERARY` 与普通更新分离，避免客户端通过编辑 DTO 伪造实际结束时间；当前 reducer 仍只提供本地规则演示。
