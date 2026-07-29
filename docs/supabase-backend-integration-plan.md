# EventSpace Supabase 后端接入方案

> 状态：2026-07-30 同步；首批后端基础任务已完成 8/8，BE-010 至 BE-022、
> DW-001 至 DW-010、2026-07-28 五项线上接入修复，以及头像/访客加入/真实 QR
> 工作区改动均已记录；BE-009 支付规划按产品决策延期。
> 建立日期：2026-07-27。  
> 适用基线：当前 `Chat / Photos / Itinerary` Supabase-backed 封闭 MVP；旧本地优先 Mock
> 仅作为历史、fallback 和 UI contract 兼容层。
> 目标：保留已完成的产品界面和纯领域逻辑，以 Supabase Auth、Postgres、RLS、Storage、Realtime、Cron 和 Edge Functions 建立生产级权威后端。

## 1. 执行结论

当前项目已经进入 Supabase-backed 封闭 MVP，但仍不能仅通过替换环境变量完成生产上线。

以下实施前准备度评估为 2026-07-27 历史基线：

| 范围 | 准备度 | 说明 |
| --- | ---: | --- |
| UI 与核心交互 | 80% | Rooms、Create Room、Chat、Photos、Itinerary、Account 和治理交互基本可复用。 |
| 领域模型与边界 | 60% | 已有领域类型、读取 Repository、AssetReference 和集中命令，但仍混有历史兼容字段。 |
| 后端基础设施 | 5% | 尚无 Supabase 依赖、CLI 目录、迁移、环境配置或生成类型。 |
| 生产安全与运维 | 10% | 尚无真实 Auth、RLS、事务、审计、限流、后台任务或备份验证。 |
| 综合 | 50%–55% | 适合开始后端工程，但需要先冻结首期范围。 |

正确接入方式是：

1. 保留页面视觉、交互组件和无框架依赖的纯领域逻辑。
2. 移除浏览器 `MockSession` 作为生产权威状态。
3. 以 Postgres 作为唯一业务真相来源。
4. 使用 RLS、事务 RPC 和数据库约束执行授权与并发裁决。
5. 使用私有 Storage 和受控媒体处理流水线替换 IndexedDB 业务媒体。
6. 使用私有 Realtime Broadcast 同步权威结果，而不是让客户端广播成为业务事实。

## 2. 当前代码评估

### 2.1 可保留的基础

- `core/domain` 已包含房间、成员、消息、照片、评论、行程和资产等领域类型。
- `data/contracts/room-repository.ts` 已建立读取接口。
- `AssetReference` 已把媒体正文与会话 JSON 分离。
- 图片和语音 Blob 已通过 IndexedDB adapter 保存，UI 不再依赖 data URL。
- `MockCommand` 集中了现有写操作，可作为生产 Command DTO 设计输入。
- `core/security/room-capabilities.ts` 已表达部分权限规则，可作为 UI capability 输出契约。
- 创建草稿、聊天草稿、页面偏好和本地业务状态已有基本边界。
- 生产部署已有 Mock guard，能避免固定 Mock 身份被无意当成真实产品部署。

### 2.2 不能直接上线的部分

- 根布局仍注入固定 `MockSessionProvider`。
- Rooms、Account、Join 和 Room 页面直接依赖 `useMockSession()`。
- 当前 `RoomRepository` 仅支持列表和详情读取，不覆盖 Mutation。
- ID、作者、时间、权限、到期、配额、昵称唯一性和生命周期都由客户端生成或判断。
- 媒体引用仍只指向本机 IndexedDB。
- 没有 Supabase SSR client、Proxy、Auth callback、migration、RLS、Storage policy 或 Realtime Authorization。
- `chat-panel.tsx` 同时承担 UI、录音、草稿、命令编排和历史投票兼容逻辑，需要在接入时拆分。
- `MockSession` 是适合原型回归的集中 reducer，不适合作为生产数据库聚合结构。

### 2.3 当前文档与代码冲突

正式建库前必须以当前代码和最新需求记录确定唯一范围：

| 事项 | 当前运行时代码 | 历史规格/兼容状态 | 推荐首期决定 |
| --- | --- | --- | --- |
| 投票 | UI 已移除 | reducer 和旧文档仍保留 | 延后，优先级低于 Book |
| Book/回忆录 | 已删除 | 历史任务和旧技术方案仍提及 | 后端首批不建设；作为 MVP 候选，优先于投票重新设计 |
| 自由 Board | 无正式入口 | 保留兼容类型和旧字段 | 不建立生产 Board API |
| Photos | 当前为图片网格 | 复用 `BoardPhoto`/`boardItems` 名称 | 生产使用 `photos`/`photo_comments` |
| Chat 图片/位置 | 新 UI 不创建 | 兼容读取旧 session | 首期仅文字和语音 |
| 房间模式 | 创建固定 Host-led | 产品基线仍描述 Community-led | 首期和当前产品仅支持 Host-led |
| 成员上限 | 当前 UI 2–10 | 商业目标包含更大配额 | 数据库配置化，首期 UI 限制 10 |
| 支付 | 当前无入口 | 技术架构包含 Stripe | MVP 必须建设；使用 Stripe Checkout 一次性按房间收费 |

## 3. 目标架构

```text
Next.js Client UI
  ├─ Server Actions ───────────────┐
  ├─ Private Realtime channels     │
  └─ Signed upload flow            │
                                   ▼
Next.js Server Components ── Query/Command Services
                                   │
                                   ▼
Supabase Auth + Postgres + RLS + Transactional RPC
                                   │
                 ┌─────────────────┼─────────────────┐
                 ▼                 ▼                 ▼
          Private Storage     Realtime Broadcast   Outbox Jobs
                 │                                   │
                 ▼                                   ▼
          Media Processor                     Cron / Edge Functions
```

核心原则：

1. Postgres 是唯一权威业务状态。
2. 所有 Data API 暴露表默认启用 RLS，权限最小化。
3. 普通读取可以走 Supabase Data API；复杂写入走事务 RPC。
4. Realtime 只广播已提交的权威变化。
5. 客户端不提交可信作者、角色、创建时间、配额、最终状态或服务器裁决。
6. 媒体对象、媒体元数据与业务引用分离。
7. 所有时间窗口使用数据库 `now()`。
8. 每个可重试命令都具有幂等键。

## 4. Next.js 16 接入边界

建立三种 Supabase client：

| Client | 使用位置 | 权限 |
| --- | --- | --- |
| Browser client | 客户端 Auth 状态、Realtime、受控直传 | 仅 publishable key + 当前用户 JWT |
| Server client | Server Components、Server Actions、Route Handlers | 当前请求 Cookie 身份，遵守 RLS |
| Admin client | Webhook、后台任务、受控运维 | secret key，仅服务端，禁止进入浏览器 bundle |

Next.js 16 使用 `proxy.ts` 刷新 Auth Cookie。Server Component 负责初始读取，Server Action 负责页面内 Mutation，Route Handler 负责 Auth callback、外部 webhook 和需要标准 HTTP 接口的流程。

推荐边界：

- Server Components：Rooms 初始列表、房间初始详情、Account 摘要。
- Server Actions：创建房间、发消息、评论、行程和成员治理。
- Route Handlers：Auth callback、媒体上传完成回调、Stripe webhook、外部服务 callback。
- Browser client：私有 Realtime 订阅和受控 Storage 上传，不直接串联多表业务写入。

## 5. 身份与成员模型

### 5.1 为什么不能直接使用 `auth.users.id` 作为作者

访客可以先产生消息、语音、成员资格和行程责任人，随后升级为新账号或认领到已有账号。如果所有内容直接关联 `auth.users.id`，认领时将被迫重写大量作者外键，并容易产生身份劫持和并发问题。

### 5.2 推荐模型

#### `profiles`

登录账户资料：

- `user_id`，外键指向 `auth.users.id`
- `display_name`
- `avatar_asset_id`
- `theme`
- `deleted_at`
- `anonymized_at`
- `created_at`
- `updated_at`

#### `actors`

稳定内容作者：

- `id`
- `owner_user_id`
- `kind = guest | account | deleted`
- `claimed_at`
- `anonymized_at`
- `created_at`

#### `room_members`

房间内成员身份：

- `room_id`
- `actor_id`
- `nickname`
- `avatar_asset_id`
- `role = host | admin | member`
- `state = active | muted | removed | banned`
- `joined_at`
- `left_at`
- `removed_at`
- `archive_eligible`

内容永久关联 `actor_id`。访客认领时只修改 actor 的账号归属，不重写历史内容作者。

### 5.3 匿名访客

- 使用 Supabase Anonymous Sign-In，不开放数据库 `anon` 公共业务访问。
- 匿名 Auth 用户同样使用 `authenticated` Postgres role。
- RLS 必须检查 JWT `is_anonymous`，限制其投票、照片发布、归档和其他要求正式账号的能力。
- 匿名注册必须启用 Turnstile/CAPTCHA、IP 速率限制和异常告警。
- 过期且无保留价值的匿名 Auth 用户由后台任务清理。

### 5.4 访客认领

认领已有账号必须使用一次性证明：

1. 匿名会话申请 claim challenge。
2. 服务端保存 challenge hash、actor、过期时间和使用状态。
3. 用户完成目标账号登录。
4. 事务重新验证 challenge、原 actor 和目标账号。
5. 修改 actor 所属账号。
6. 保留原 `actor_id` 和全部历史外键。
7. 写入审计事件并使 challenge 永久失效。

## 6. 首期数据库模型

### 6.1 账户与房间

- `profiles`
- `actors`
- `terms_acceptances`
- `rooms`
- `room_members`
- `room_preferences`
- `room_invites`
- `room_join_requests`
- `actor_claim_challenges`

### 6.2 Chat

- `messages`
- `message_reactions`
- `message_pins`

消息支持：

- `kind = text | voice | system`
- `reply_to_message_id`
- `author_actor_id`
- `body`
- `asset_id`
- `created_at`
- `recalled_at`
- `moderated_at`
- `moderated_by_actor_id`

撤回和管理员删除使用状态字段，不允许客户端物理删除。系统消息只能由数据库函数生成。

### 6.3 Photos

- `assets`
- `photos`
- `photo_comments`

生产 API 不暴露 `boardItems`、x/y/rotation 或历史 Board 兼容字段。

### 6.4 Itinerary

- `itineraries`

包含：

- 标题、说明、地点
- `starts_at`
- `end_mode = scheduled | manual`
- `planned_ends_at`
- `ended_at`
- `responsible_actor_id`
- `created_by_actor_id`
- `revision`
- 服务端创建与更新时间

### 6.5 治理、归档和可靠性

- `reports`
- `device_tokens`
- `room_bans`
- `archive_entries`
- `audit_events`
- `command_receipts`
- `outbox_jobs`

### 6.6 支付与房间权益

- `products`
- `prices`
- `checkout_sessions`
- `payment_events`
- `room_entitlements`
- `refund_events`

支付采用 Stripe Checkout 的一次性付款模式，不建设订阅、余额、钱包、站内分账或用户之间的费用分摊。

### 6.7 后续模块

后端首批不建设，但保留清晰迁移边界：

- `polls`
- `poll_choices`
- `poll_votes`
- `books`
- `book_pages`
- `book_items`
- `notification_endpoints`
- `notifications`

Book 的优先级高于投票，但在产品交互、数据模型和 Photos 关系确定前，不提前创建空泛的 Book 表。

## 7. 房间生命周期

正式状态机：

```text
active
  → freezing
  → archiving
  → archived
  → purge_pending
  → purged
```

房间保存：

- `starts_at`
- `ends_at`
- `ended_at`
- `end_reason`
- `ended_by_actor_id`
- `archive_started_at`
- `archived_at`
- `purge_after`
- `revision`

每个业务写入必须检查：

```text
room.status = active
AND database now() < room.ends_at
```

Cron 负责及时推进状态、发送提醒和执行清理，但即使 Cron 延迟，过期房间也不能继续写入。

## 8. Command、事务与并发

现有 `MockCommand` 应整理为生产业务命令：

- `create_room`
- `request_room_join`
- `review_join_request`
- `send_message`
- `recall_message`
- `moderate_message`
- `react_to_message`
- `pin_message`
- `add_photo`
- `add_photo_comment`
- `delete_photo`
- `create_itinerary`
- `update_itinerary`
- `end_itinerary`
- `change_room_duration`
- `rotate_invite`
- `change_member_state`
- `change_member_role`
- `submit_report`
- `reply_report`
- `end_room`
- `remove_archive_entry`

每个可重试命令包含 `idempotency_key`。数据库使用：

- `command_receipts(actor_id, idempotency_key)` 唯一约束
- `SELECT ... FOR UPDATE`
- room/entity `revision`
- 数据库时间
- 当前用户到 actor 的归属校验
- 房间成员、角色、状态和所有权复核
- 同一事务写业务结果、系统消息、审计事件和 outbox

重复请求返回第一次结果，不重复发消息、创建房间、结束行程或延长房间。

## 9. RLS 安全方案

所有暴露到 Data API 的表必须：

1. 显式 `GRANT`。
2. 显式启用 RLS。
3. 默认没有访问策略。
4. 为 SELECT/INSERT/UPDATE/DELETE 分别定义策略。
5. 为 RLS 中使用的外键和状态字段建立索引。
6. 使用 `(select auth.uid())`，避免逐行重复执行。
7. UPDATE 同时具备 SELECT policy、`USING` 和 `WITH CHECK`。
8. 不使用用户可编辑的 `user_metadata` 进行授权。

RLS 核心判定：

- 当前 Auth 用户是否拥有调用 actor。
- actor 是否是目标房间的有效成员。
- 成员是否已 removed/banned。
- 房间是否允许对应读取。
- 操作是否要求非匿名用户。
- actor 是否为作者、负责人、Host 或 Admin。

复杂事务函数如确需 `SECURITY DEFINER`：

- 放入非暴露 schema。
- 固定安全的 `search_path`。
- 撤销 `PUBLIC EXECUTE`。
- 仅向所需 role 显式授权。
- 函数体内重新验证 `auth.uid()`。
- 运行 Database Security/Performance Advisors。

所有公开视图使用 `security_invoker = true`。

## 10. Realtime

私有主题：

```text
room:{room-id}:events
actor:{actor-id}:events
```

使用数据库触发的 Realtime Broadcast。事件仅携带：

- `event_id`
- `entity_type`
- `entity_id`
- `operation`
- `revision`
- `occurred_at`

客户端收到事件后更新权威 DTO 或重新查询。Broadcast 不发送完整聊天、举报正文或长期媒体 URL。

成员被移除时：

1. 向 actor 专属主题发送 `access_revoked`。
2. 事务更新成员状态。
3. 后续数据库读取立即被 RLS 拒绝。
4. 客户端清理缓存并退订房间频道。
5. 即使旧连接短时残留，也不会从事件中得到敏感正文。

## 11. 媒体与 Storage

私有 bucket：

- `media-quarantine`
- `media-processed`

上传流程：

1. Server Action 创建 `assets(status = pending)`。
2. 服务端签发限定 object path、大小和过期时间的上传授权。
3. 浏览器直接上传 quarantine。
4. 客户端通知上传完成，但不能自行将 asset 标记为可信。
5. 媒体 Worker 验证 magic number、MIME、大小、图片尺寸和解压风险。
6. 图片重新解码、移除 EXIF、限制最长边 2560，并生成 display/thumbnail。
7. 音频验证最长 60 秒并转为统一播放格式。
8. 成功对象写入 processed bucket，asset 变为 `ready`。
9. 业务 RPC 只允许关联当前 actor 拥有且状态为 ready 的 asset。
10. Cron 清理失败、过期和长期未引用对象。

数据库只保存 object key，不保存签名 URL。

读取策略：

- 普通房间图片使用 30–60 秒签名 URL。
- 需要立即撤销的高敏感下载使用 Next.js 授权代理。
- 不使用公开 bucket。
- 不保存原始图片。
- 已签发签名 URL 在到期前无法由应用立即撤销，这一窗口必须进入安全与产品说明。

生产级图片重新解码、恶意文件检测和音频转码由受控媒体 Worker 执行；Edge Function 负责鉴权、编排和状态回写。

## 12. 支付方案

### 12.1 选择

采用个人开发者最常见、维护成本较低的方案：

```text
Stripe-hosted Checkout
  + 一次性付款
  + Next.js Webhook
  + Supabase payment_events / room_entitlements
```

不在 MVP 中建设：

- 月度或年度订阅
- 自定义银行卡表单
- 保存卡号
- 站内钱包或余额
- 用户之间的分账
- Stripe Connect
- 多卖家 marketplace

Stripe Checkout 使用 Stripe 托管的支付页，应用不直接接触卡号，适合个人开发者控制 PCI 范围和实现复杂度。

### 12.2 MVP 商品

推荐先保持两种一次性房间商品：

| 商品 | 作用 | 购买时机 |
| --- | --- | --- |
| Event Upgrade | 提高当前房间成员、媒体、照片和最长活动时长 | 创建房间时或活动期间 |
| Permanent Archive | 将当前房间从免费限时归档升级为长期归档 | 创建时、活动期间或免费归档清理前 |

后续可以增加容量扩展包，但不在第一版支付闭环中实现。

价格和权益不可硬编码在前端。Stripe Price ID 与内部 entitlement code 通过 `prices` 表映射。数据库保存内部商品快照、币种和金额，避免 Stripe Dashboard 后续改价影响历史订单解释。

### 12.3 支付流程

1. 已登录房间成员发起购买；匿名访客不能购买。
2. Server Action 验证当前用户、房间、商品、当前权益和购买资格。
3. 服务端创建内部 `checkout_sessions(status = pending)`。
4. 服务端使用 Stripe secret key 创建 `mode = payment` 的 Checkout Session。
5. Stripe metadata 只保存内部 checkout id、room id 和 product code，不保存聊天或其他敏感内容。
6. 浏览器跳转到 Stripe-hosted Checkout。
7. Stripe Webhook 验证原始请求体和 `Stripe-Signature`。
8. Webhook 记录 `payment_events`，按 Stripe event id 去重。
9. 服务端重新从 Stripe 获取 Checkout Session，复核 payment status、金额、币种、Price ID 和 metadata。
10. 单个数据库事务写入付款结果并创建或升级 `room_entitlements`。
11. 成功页只展示状态；它可以请求一次对账，但不能单独解锁权益。
12. Realtime 向房间广播不含支付敏感信息的 `entitlement_changed` 事件。

### 12.4 权威性和幂等

- 前端 success redirect 不代表支付成功。
- Stripe Webhook 是主要权威来源。
- Webhook 可能重复或乱序，处理逻辑不得依赖接收顺序。
- `payment_events.stripe_event_id` 必须唯一。
- `checkout_sessions.stripe_checkout_session_id` 必须唯一。
- entitlement fulfillment 对同一 Checkout Session 只能成功一次。
- 支付事件原始 payload 不长期进入普通应用日志。
- Webhook 应快速返回；复杂通知进入 outbox 后异步处理。

需要处理的最小事件：

- `checkout.session.completed`
- `checkout.session.async_payment_succeeded`
- `checkout.session.async_payment_failed`
- `checkout.session.expired`
- 与退款策略对应的 refund/charge 事件

首发若只启用即时银行卡和钱包，可以减少异步支付状态，但数据模型仍应正确容纳 delayed payment，避免未来开启本地支付方式时重构。

### 12.5 退款和权益

- Event Upgrade 在房间仍处于可撤销业务阶段时可以由运营人工审核退款。
- Permanent Archive 一旦完成长期归档交付，默认按已确认产品规则不自动退款，但必须服从适用法律和支付争议处理。
- 退款不能直接删除历史支付记录。
- 全额退款是否撤销权益由服务端策略函数决定；如果撤销会导致当前数据超过免费额度，不立即破坏内容，而是冻结新增写入并进入人工/清理流程。
- 付款人删除账号不影响其他合格成员已经获得的房间级权益。
- Stripe dispute、退款和 webhook 处理都需要审计事件。

### 12.6 税务和收据

- MVP 使用单一结算币种，建议先根据实际注册主体和目标市场决定 USD 或本地币种。
- Stripe 自动邮件收据可以先满足基础付款凭证需求。
- Stripe Tax 是否开启必须依据销售主体所在地、销售地区和税务顾问意见决定，不能仅凭代码默认开启。
- 正式收费前必须补齐服务条款、退款政策、商品说明、价格展示和客服入口。
- Stripe 是否可以开户、支持哪些结算币种和实际交易费率取决于注册主体国家/地区，应在生产账号申请时核实，不能把其他国家的公开费率当作本项目成本。

### 12.7 支付测试

必须覆盖：

- Checkout Session 重复创建。
- 用户篡改 room id、product code 或 price id。
- 金额/币种与内部订单不一致。
- Webhook 签名错误。
- 相同 event 重复投递。
- 事件乱序。
- 成功付款但浏览器未返回 success page。
- success page 被直接访问。
- async payment success/failure。
- 全额退款、部分退款和争议。
- Webhook 数据库事务失败后的安全重试。
- 已升级房间再次购买相同权益。

## 13. 查询、分页和 DTO

不能继续一次加载整个 `MockSession`。

| 数据 | 推荐查询 |
| --- | --- |
| Rooms | 稳定 cursor，返回筛选结果和状态计数 |
| Messages | 按 `(created_at, id)` 向前分页 |
| Photos | 按创建顺序分页，列表只返回缩略图 |
| Comments | 按 photo 分页 |
| Itinerary | 按房间和时间范围查询 |
| Members | 按 `member_list_visibility` 返回不同 DTO |
| Reports | 仅举报人与授权 Host 可读取 |
| Archive | 独立个人入口查询 |

数据库 row 与页面 DTO 必须分离，禁止向客户端返回：

- invite hash
- device token
- 无权限举报数据
- Storage 内部敏感路径
- 审计内部字段
- secret/admin 配置

## 14. 前端改造范围

1. 移除根级 `MockSessionProvider` 作为生产数据源。
2. 保留 Mock adapter，用于单元测试和受控演示。
3. 新增 browser/server/admin Supabase client。
4. 新增 Next.js `proxy.ts` 和 Auth callback。
5. 将 Rooms、Account 和 Room 详情改为服务端初始查询。
6. 将全局 Context 收敛为轻量 viewer/session UI context。
7. 将每个 `dispatch(COMMAND)` 替换为领域 Mutation hook。
8. 将读取接口拆为 rooms、messages、photos、itineraries、members 等 query service。
9. 将 `AssetRepository.save(blob)` 替换为上传会话、上传完成确认和 asset resolution。
10. 为页面补充 pending、optimistic、retry、conflict、permission revoked、offline、pagination 和 reconnect 状态。
11. 删除或隔离投票、Book 和旧 Board 遗留代码。
12. 保留本地 draft，但绝不把恢复出来的 draft 当成可信数据库对象。

本机 Mock 数据默认不导入生产。若未来需要导入，必须由用户登录后显式触发，并逐项通过正式验证和媒体上传链路。

## 15. 验证与发布门槛

### 数据库

- migration 可从空库重复执行。
- schema diff 无漂移。
- 所有暴露表已启用 RLS。
- 所有权限列已建立索引。
- Database Advisors 无未处理 Security error。

### 安全

- 未登录请求无法读取私有业务数据。
- 匿名用户和正式用户权限区分正确。
- removed/banned 成员无法读取后续内容。
- 任意客户端伪造 actor、role、created_at、quota 或 room_id 均失败。
- secret key 不进入客户端 bundle、日志或错误响应。

### 事务

- 重复命令只产生一次结果。
- 并发加入不突破成员上限。
- 并发照片上传不突破配额。
- 房间过期与写入并发时，过期裁决始终获胜。
- 重复结束房间、行程和归档任务安全幂等。

### Realtime

- 未授权用户无法订阅私有主题。
- 重连后能够从数据库补齐遗漏事件。
- 乱序或重复事件不会覆盖较新 revision。
- 移除成员后客户端立即清理受保护缓存。

### 媒体

- 伪造 MIME、超大图片、畸形文件和未完成 asset 无法关联内容。
- 私有 object 不可通过公开 URL 获取。
- 删除业务内容后对象按保留与垃圾回收规则处理。

### 项目质量

- lint、typecheck、unit、integration、RLS 和 E2E 全部通过。
- Chrome、Edge、Safari 和移动端上传/录音完成真机验证。
- 日志不包含聊天、评论、语音、图片正文或访问令牌。

## 16. 实施阶段

### Phase 0 — 范围冻结

- 首期和当前产品仅支持 Host-led。
- 投票系统延后。
- Book 延后设计，但作为 MVP 候选且优先级高于投票。
- Chat 首期仅支持文本和语音。
- 支付进入 MVP，使用 Stripe Checkout 一次性房间收费。
- 清理当前文档中的历史状态冲突。
- 输出当前首期 capability matrix。

### Phase 1 — Supabase 工程底座

- 初始化 Supabase CLI 目录和本地环境。
- 添加并锁定 SSR/client 依赖。
- 建立环境变量 schema。
- 建立 browser/server/admin client。
- 建立 Next.js Proxy 和 Auth callback。
- 建立 migration、seed、generated types 和 CI 验证流程。

### Phase 2 — Auth、Actor 与 RLS

- Anonymous Sign-In。
- Email OTP/magic link。
- Google OAuth。
- profiles/actors/room_members。
- 默认拒绝的 RLS。
- RLS 自动化测试。
- 访客认领流程。

### Phase 3 — Rooms 与生命周期

- 创建、列表、详情。
- 邀请、审核和成员治理。
- 数据库时间到期。
- 归档状态机。
- 私有 Realtime。

### Phase 4 — Chat 与 Itinerary

- 文字、回复、撤回、置顶和反应。
- 语音上传。
- 行程 CRUD 和手动结束。
- 幂等与并发验证。

### Phase 5 — Photos 与媒体

- quarantine 和 processed bucket。
- 媒体处理 Worker。
- 缩略图。
- Photos 和评论。
- 配额与垃圾回收。

### Phase 6 — Stripe 支付与房间权益

- Event Upgrade 一次性付款。
- Permanent Archive 一次性付款。
- Checkout Session。
- 签名 Webhook、幂等 fulfillment 和退款事件。
- room entitlement、配额和归档保留策略联动。

### Phase 7 — Book MVP 候选设计

- 明确 Book 与 Photos 是同一份内容的阅读视图，还是独立编排聚合。
- 完成交互原型、ERD、分页、版本控制和多人并发方案。
- 通过范围评审后决定是否进入当前 MVP。
- Book 未确认前不提前创建生产表。

### Phase 8 — 生产化

- Cron、outbox、审计和限流。
- Turnstile、备份恢复、监控和预算告警。
- 邮件、通知和法律文档。
- 收费生产账号、税务、退款政策和客服流程检查。

## 17. 首批任务

首批任务的目标是冻结正确范围并建立可验证的 Supabase 云端开发项目底座，不改造业务页面、不直接连接生产项目，也不要求 Docker/WSL 或本地 Supabase 作为前置条件。

### BE-001 — 首期范围冻结

**状态**：已于 2026-07-27 完成。

**确认结果**

- 房间仅支持 Host-led。
- 投票系统延后。
- Book 延后设计，但优先级高于投票，并保留进入 MVP 的可能。
- 自由 Board 不进入当前产品后端。
- Chat 仅支持文本和语音。
- Photos 支持图片。
- 支付进入 MVP，采用 Stripe Checkout 一次性房间收费。
- Auth 沿用既有基线：Anonymous + Email OTP/magic link + Google。

**验收**

- [x] 每项能力明确为 `v1`、`deferred` 或 `removed`。
- [x] 数据库首批表不再依赖历史兼容功能。

### BE-002 — 文档基线校准

**状态**：已于 2026-07-27 完成。

**依赖**：BE-001。

**工作内容**

- 更新 `requirements-baseline.md`、`technical-architecture.md`、`task.md` 中与范围冻结冲突的当前状态。
- 历史记录保留，但明确标记为历史。
- 将本文件确定为后端接入主方案。

**验收**

- [x] 当前能力、目标能力和历史能力可以被清楚区分。
- [x] 不再同时把投票或 Book 描述为“当前功能”和“已移除功能”。
- [x] Host-led、Chat 文本/语音、Photos、Book、投票和 Stripe 范围已在需求基线、技术架构与任务记录中统一。
- [x] `npm run check`、`npm run build` 和 `git diff --check` 通过；9 个既有 ESLint warning 未因本任务扩大。

### BE-003 — Supabase 云端开发项目创建与连接

**状态**：已于 2026-07-27 完成。

**依赖**：BE-001。

**工作内容**

- 检查当前 Supabase CLI 版本及云端命令帮助。
- 初始化可提交的 `supabase/` migration/config 工程。
- 在用户确认的组织和区域创建独立的 `eventspace-dev` 云项目。
- 获取项目 URL 和现代 publishable key，建立不含真实凭据的 `.env.example`。
- 将仓库连接到云端开发项目，并确认 Auth、Database、Storage 和 Realtime 可用。
- 确认 CLI link state、本地环境文件和 secret 的 Git 忽略规则。

**验收**

- [x] Supabase CLI `2.107.0` 已作为项目 dev dependency 精确锁定，并通过 `npx supabase --version` 与命令帮助验证。
- [x] 已确认 Codex 环境中的 CLI agent auto-detection 会把交互命令切为 JSON/非交互模式；仓库 npm scripts 统一显式使用 `--agent no`。
- [x] `supabase/config.toml` 已初始化，后续 schema 变更可由 migration 管理。
- [x] `.env.example` 已改为云项目 URL/publishable key/server secret 占位符；仓库中没有真实密钥。
- [x] `supabase/.gitignore` 已忽略 `.temp`、`.branches` 与本地 dotenv 文件；配置和空 seed 可提交。
- [x] `npm run check`、`npm run build` 与 `git diff --check` 通过；9 个既有 ESLint warning 未增加，业务 UI 文件未被本任务修改。
- [x] 用户已确认组织 `mndzgvsjfzqrejuqldvm`、美国东部 `us-east-1` 和当前 0 美元/月项目费用。
- [x] 已创建 `eventspace-dev`（ref `boooesdlmaeckrvpyjwb`），状态为 `ACTIVE_HEALTHY`，并取得项目 URL 与有效现代 publishable key。
- [x] 当前仓库已 link 到 `eventspace-dev`；Auth 与 Storage 公开端点返回 HTTP 200，项目整体状态包含 Database/Realtime 为 healthy。
- [x] Supabase security advisors 与 performance advisors 基线均为 0 项。

**已知工具问题**

- 当前账号下只发现组织 `mndzgvsjfzqrejuqldvm` 及既有 `selfidbox` 项目；不会复用其他产品的项目。
- Supabase 连接器的 create/execute SQL 写入通道曾出现 Codex MCP transport error；项目最终通过已登录 CLI 创建。
- `supabase db query --linked` / `migration list --linked` 当前在 Management API `cli/login-role` 返回 EOF。项目 link 状态正常，此问题转入 `BE-007` migration 流水线处理；如果持续出现，再通过 Dashboard 重置数据库密码并配置本机 `SUPABASE_DB_PASSWORD`。

### BE-004 — Supabase 依赖与环境校验

**状态**：已于 2026-07-27 完成。

**依赖**：BE-003。

**工作内容**

- 固定并安装 `@supabase/supabase-js`、`@supabase/ssr` 和运行时 schema 校验依赖。
- 提交 lockfile 变更。
- 定义 publishable URL/key 与 server-only secret 的环境边界。
- 增加启动时环境变量校验。

**验收**

- [x] 精确锁定 `@supabase/supabase-js@2.110.8`、`@supabase/ssr@0.12.3`、`zod@4.4.3` 和 `server-only@0.0.1`，lockfile 已同步。
- [x] `env-public.ts` 只读取 `NEXT_PUBLIC_SUPABASE_URL` 与现代 `sb_publishable_` key。
- [x] `env-server.ts` 以 `import "server-only"` 建立边界，并且只有该模块读取现代 `sb_secret_` key。
- [x] `next.config.ts` 在 `dev/build/start` 读取配置阶段验证 public 环境；`instrumentation.ts` 在 Node 服务实例启动时验证已配置的 server secret。
- [x] 错误 HTTPS URL、legacy key 和 malformed secret 均被拒绝，错误信息不包含环境变量值。
- [x] server-only 模块在 Next 服务端模块图之外导入时测试失败；客户端无法通过 public 模块取得 secret。
- [x] 负向 build 使用错误 public 配置时退出码为 1；恢复 `.env.local` 后生产 build 退出码为 0。
- [x] `npm run check`、`npm test`、`npm run build` 和 `git diff --check` 通过；6 个测试文件共 26 个测试通过，保留 9 个既有 ESLint warning。
- [x] 本任务未修改页面、组件、样式、`MockSession` 或现有 UI 数据流。

**已知工具问题**

- `npm audit --omit=dev` 分别通过官方 registry 和当前镜像重试，均在 audit endpoint TLS 建连前断开。安装输出仍报告与 BE-003 时相同的 12 个 high severity 汇总，未运行会产生破坏性升级的 `npm audit fix --force`；详细依赖审计后续单独处理。

### BE-005 — Next.js 16 Supabase Client 边界

**状态**：已于 2026-07-27 完成。

**依赖**：BE-004。

**工作内容**

- 建立 browser client。
- 建立 request-scoped server client。
- 建立仅 server-only 可导入的 admin client。
- 建立 `proxy.ts` Auth token 刷新。
- 使用当前 Next.js 16 本地文档和 Supabase SSR 文档校验 cookie API。

**验收**

- [x] 已建立 `createSupabaseBrowserClient()`；仅使用 public URL 与 publishable key，`@supabase/ssr` 在浏览器中维持单例并使用 cookie 恢复 Auth 状态。
- [x] 已建立逐请求创建的 `createSupabaseServerClient()` 和 `getCurrentSupabaseClaims()`；使用 Next.js 16 异步 `cookies()` 与经过验证的 `auth.getClaims()`。
- [x] 已建立带 `server-only` 边界的 `createSupabaseAdminClient()`；secret 在调用时才读取，且 server-only 导入边界有负向测试。
- [x] 已建立根目录 `proxy.ts`；它将刷新后的 cookie 同时传给当前请求与浏览器，并转发 Supabase SSR 提供的防缓存响应头。
- [x] Proxy 只负责凭证刷新，不做 redirect、房间成员判断或最终业务授权；最终授权继续由 server code 与 Postgres RLS 承担。
- [x] Proxy matcher 覆盖页面与 API，同时排除 Next.js 内部资源、图片、字体、CSS 和 JS，未修改任何现有页面、组件、样式或 Mock UI 数据流。
- [x] `npm run lint` 通过且仅保留 9 个既有 UI warning；`npm run typecheck`、32 项单元测试、生产 build 和 `git diff --check` 通过。

**版本核对记录**

- Next.js `16.2.10` 使用根目录 `proxy.ts`，`cookies()` 为异步请求 API，Server Component 只能读取 cookie。
- `@supabase/ssr` `0.12.3` 使用 `getAll`/`setAll` Cookie API；`setAll` 的第二个参数包含必须写回响应的防缓存 headers。
- Next.js 本地 `proxy.md` 的测试示例写作 `unstable_doesProxyMatch`，但 `16.2.10` 实际包仍导出 `unstable_doesMiddlewareMatch`；自动化测试以已安装包的真实导出为准。

### BE-006 — Auth Callback 与最小登录闭环

**状态**：已于 2026-07-27 完成后端闭环；正式登录 UI 与指定测试邮箱的人工邮件点击验收延后。

**依赖**：BE-005。

**工作内容**

- 建立 PKCE Auth callback Route Handler。
- 接入云端开发项目的 Email OTP/magic link。
- 建立安全 redirect allowlist。
- 建立 sign-out Server Action。
- 暂不替换 Account 正式 UI，只提供可测试闭环。

**验收**

- [x] 已建立 `requestEmailSignIn()` Server Action；未来登录卡片可以直接发起 Email OTP/magic link PKCE，不需要重写 Auth 流程。
- [x] 已建立 `/auth/callback` Route Handler；使用逐请求 Supabase Server Client 交换 PKCE code，并由 BE-005 的 Cookie/Proxy 边界维持刷新后的 session。
- [x] 已建立 `signOutCurrentSession()` Server Action；显式使用 `scope: "local"`，只退出当前设备会话。
- [x] 应用内跳转采用明确 allowlist，仅允许 `/`、`/account`、`/rooms`、`/rooms/*`、`/join` 和 `/join/*`；绝对 URL、协议相对 URL、反斜杠、控制字符及未知路径均被拒绝。
- [x] Email 登录发起前校验浏览器 `Origin` 与 `Host` 一致；生产仅接受 HTTPS，本地开发仅额外接受 `localhost`/`127.0.0.1` HTTP。
- [x] callback 缺少 code、code 交换失败或非法 redirect 时只返回统一错误和防缓存 headers，不回显 code、provider error、token 或环境配置。
- [x] `eventspace-dev` 云端 Auth health 返回 HTTP 200；Email provider 已启用、signup 未禁用，Google 和 Phone provider 当前保持关闭。
- [x] 未新增登录页面，未替换 `/account`，未修改任何现有页面组件、样式或 Mock UI 数据流。
- [x] `npm run lint` 通过且仅保留 9 个既有 UI warning；`npm run typecheck`、12 个测试文件共 50 项测试、生产 build 和 `git diff --check` 通过。

**上线前配置边界**

- 当前无正式前端域名，因此不猜测生产 `SITE_URL`。
- 正式域名或 Preview 域名确定后，必须在托管项目 Auth URL Configuration 中加入相应的 `https://<domain>/auth/callback` Redirect URL；不使用覆盖任意外站的宽泛通配符。
- 新 Free 项目使用 Supabase 默认 SMTP 时不能自定义 Auth 邮件模板，且默认邮件服务不适合真实用户；按既有架构在上线前配置 Resend 自定义 SMTP。
- 因当前没有正式登录 UI 和用户指定的测试邮箱，本任务未发送真实邮件或创建假 Auth 用户；真实邮件点击、刷新恢复和退出的人工浏览器验收随正式登录卡片完成。

### BE-007 — Migration 与数据库类型流水线

**状态**：已于 2026-07-27 完成。

**依赖**：BE-003。

**工作内容**

- 建立 migration 命名与执行规范。
- 创建仅用于验证流水线的最小 schema/version 迁移。
- 建立 linked migration list、push dry-run、schema diff 和 TypeScript 类型生成命令。
- 规划 CI 中的 migration + type drift 检查。

**验收**

- [x] 使用 CLI `migration new` 创建 migration 文件，未手工编造初始时间戳；应用后将本地文件名校准为云端正式 history version。
- [x] 空白 `eventspace-dev` 已按顺序应用 `20260727092351_pipeline_baseline` 与 `20260727093047_deny_client_schema_version_access`。
- [x] 最小验证 schema 使用非 Data API 的 `private.schema_versions`；采用 text 主键、正数约束、`timestamptz`、RLS、FORCE RLS、最小权限和显式客户端全拒绝 policy。
- [x] 云端版本标记为 `migration_pipeline = 1`，表有 1 行；`anon`/`authenticated` 均无 private schema usage 和 table select 权限。
- [x] Supabase security advisors 与 performance advisors 在最终 migration 后均为 0 项。
- [x] 已提交 `data/supabase/database.types.ts`，只生成 `public` Data API schema；browser、request-scoped server、admin 和 Proxy client 均绑定 `Database` 泛型。
- [x] `npm run supabase:types:check` 从 `eventspace-dev` 重新生成类型并证明无漂移。
- [x] 已建立 migration new/list、push dry-run/push、schema drift 与类型 write/check 命令，所有 Supabase CLI 调用均显式使用 `--agent no`。
- [x] 已建立 `.github/workflows/backend-schema.yml`；CI 只验证 migration history、dry-run、schema drift 和 type drift，不自动 push。
- [x] migration 规范、CI secrets 和 cloud-first 工作流已写入 `docs/supabase-cloud-development.md`；未通过 Dashboard 手工修改 schema。
- [x] `npm run lint` 通过且仅保留 9 个既有 UI warning；`npm run typecheck`、12 个测试文件共 50 项测试、生产 build 和 `git diff --check` 通过。
- [x] 本任务未修改现有页面组件、样式、MockSession 或 UI 数据流。

**工具与网络记录**

- 关闭 CLI telemetry 后，本地 `migration new` 正常工作；沙箱外 CLI 能使用 `eventspace-codex` 登录凭据初始化临时 login role，不再出现 `NonInteractiveError`。
- 当前 Windows 网络直连 `db.boooesdlmaeckrvpyjwb.supabase.co:5432` 在 TLS 握手阶段返回 EOF，因此本机 linked migration list、dry-run 和 schema diff 无法完成数据库直连。
- 两条已审查 migration 通过 Supabase 官方连接器应用和验证；连接器间歇出现 transport error，但只在只读确认未应用后重试，最终 migration history、表结构、数据、policy 和 advisors 均已验证。
- Linux CI runner 将使用 `SUPABASE_ACCESS_TOKEN`、`SUPABASE_PROJECT_ID` 与 `SUPABASE_DB_PASSWORD` 执行 direct linked history/dry-run/drift 检查；本地不要求 Docker/WSL。

### BE-008 — 后端测试底座

**状态**：已于 2026-07-27 完成。
**依赖**：BE-005、BE-007。

**工作内容**

- 建立数据库 integration test 目录。
- 建立 anon、anonymous-authenticated、permanent-authenticated 和 admin 测试身份。
- 建立 RLS allow/deny 断言工具。
- 建立测试数据自动清理或数据库 reset 策略。

**验收**

- [x] 已建立 `supabase/tests/database` pgTAP integration test 目录和
  `npm run supabase:test:db` linked cloud 测试入口；所有 Supabase CLI
  调用继续显式使用 `--agent no`，不依赖 Docker、WSL 或本地 Supabase。
- [x] 已在一个短事务内分别模拟 `anon`、带
  `is_anonymous: true` 的 anonymous-authenticated、带
  `is_anonymous: false` 的 permanent-authenticated 和 `service_role`
  admin；不创建真实 Auth 用户、不发送邮件。
- [x] 云端验证结果为：anon 可见 0 行、anonymous-authenticated 可见
  0 行、permanent-authenticated 只可见自己的 1 行、admin 可见全部
  2 行。
- [x] 已通过 pgTAP `ok` / `results_eq` 建立 RLS allow/deny 断言范式；
  同时证明 `anon` 和 `authenticated` 均无 `private` schema usage，也
  无 `private.schema_versions` select 权限。
- [x] 每个数据库测试强制 `begin` / `rollback`、local timeout、确定性
  fixture ID 和独立数据；连接失败时 PostgreSQL 也会回滚未提交事务，
  禁止以 `db reset --linked` 清理开发项目。
- [x] 云端执行后确认 probe table 不存在、临时 pgTAP extension 安装已
  回滚，security advisors 与 performance advisors 均为 0 项。
- [x] `.github/workflows/backend-schema.yml` 已在 migration/drift 检查后
  对 `eventspace-dev` 运行数据库测试，且仍然不会自动 push migration。
- [x] `npm test`（12 个文件、50 项测试）、`npm run typecheck`、
  `npm run lint`、生产 build 和 `git diff --check` 均通过；lint 仅保留
  9 个既有 UI warning，本任务未修改任何页面、组件、样式或 Mock UI
  数据流。

**本机网络说明**

- 当前 Windows 机器通过 CLI 直连云端 Postgres 仍会在连接阶段失败；
  同一测试 SQL 已通过 Supabase 官方连接器在 `eventspace-dev` 验证。
- GitHub Actions 的 Linux runner 会使用既有三项 Supabase secrets 执行
  `supabase test db --linked`，这也是正式的 CI pgTAP/TAP 结果入口。

### BE-009 — Stripe 商品与生产账号前置确认

**状态**：延期；收费模式、商品权益和收费主体明确后再启动，不阻塞第二批
Supabase 业务数据接入。
**依赖**：BE-001。  
**性质**：设计和账号准备，不实现支付代码。

**工作内容**

- 确认实际收费主体可注册 Stripe 的国家/地区。
- 确认结算银行账户和首发结算币种。
- 定义 Event Upgrade 和 Permanent Archive 的内部 product code、权益和退款边界。
- 确认首发价格由 Stripe Price 管理，应用数据库保存映射与订单快照。
- 确认是否启用 Stripe 自动收据和 Stripe Tax。
- 建立 test/live key、Price ID 和 webhook secret 的环境隔离规则。

**验收**

- Stripe 测试账号和测试模式可以使用。
- 两个 MVP 商品的权益定义不含模糊项。
- 价格、币种、退款、税务和客服责任有明确负责人。
- 任何 live secret 都不写入仓库。

### BE-010 — 核心业务 Schema v1 与 Host-led RLS

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-007、BE-008。  
**范围**：只建立 `profiles / actors / rooms / room_members`，不替换现有
UI 数据源，不提前加入 Chat、Photos、Itinerary、Book、投票或支付表。

**已完成**

- [x] 已通过 migration 建立四张 public 核心表；全部使用 UUID 主键、
  `timestamptz`、显式约束、更新时间 trigger、外键覆盖索引和小写
  snake_case 标识符。
- [x] `profiles` 以 `auth.users.id` 为主键，允许用户在 RLS 下创建、
  读取和更新自己的 display name/theme；不允许读取他人资料。
- [x] `actors` 作为稳定内容身份，支持 `guest / account / deleted` 和
  后续认领语义；Auth 用户删除前必须先完成 actor 匿名化，避免历史作者
  外键被级联删除。
- [x] `rooms` 固定 `mode = host-led`，包含正式生命周期、15 分钟至
  24 小时时长、2 至 10 人容量、成员列表可见性、归档时间和 revision
  约束。
- [x] `room_members` 只允许 `host / member`，并建立 active、muted、
  removed、banned 状态约束和每房间最多一个 Host 的唯一索引。
- [x] 已建立非 Data API 的 `security` schema 和三个最小
  `SECURITY DEFINER` RLS helper；固定空 `search_path`、检查
  `auth.uid()`、撤销 PUBLIC/anon 执行权，只向 authenticated 显式授权。
- [x] 未登录 `anon` 对四张业务表拥有 0 项 table privilege；四表均
  `ENABLE RLS + FORCE RLS`。
- [x] 已登录用户只能读取自己的 actor 和自己所属的房间；普通成员只看
  active/muted 成员，Host 可以查看自己房间的 removed/banned 状态；
  outsider 无法枚举其他房间。
- [x] anonymous-authenticated 成员可以读取自己的活动房间，但即使
  `archive_eligible = true` 也不能读取归档房间；正式账号可以读取自己
  有资格保留的归档。
- [x] authenticated 浏览器角色不能直接写 `actors / rooms /
  room_members`。创建房间、加入、成员治理和生命周期变化必须由后续受控
  事务命令实现，不能由客户端伪造角色、状态、时间或 revision。
- [x] 两条正式云端 migration 为
  `20260727095922_core_identity_rooms_v1` 与
  `20260727100118_index_rooms_ended_by_actor`；内部组件版本
  `core_identity_rooms = 1`。
- [x] 已建立 21 项 pgTAP 集成测试，覆盖 Host、Member、Outsider、
  anonymous Auth、`anon` 和 `service_role`，并覆盖 profile 所有权、
  唯一 Host、host-led constraint 和禁止客户端直接创建房间。
- [x] 云端测试后四张业务表均为 0 行，没有残留 Auth user 或 fixture；
  Security Advisors 为 0。Performance Advisors 无缺失外键索引，只
  保留空库中新索引尚未产生查询统计的 3 项 `unused_index` INFO。
- [x] 已重新生成 `data/supabase/database.types.ts` 并确认与
  `eventspace-dev` 一致。
- [x] 50 项应用测试、typecheck、lint、生产 build 和
  `git diff --check` 通过；lint 仍只有 9 个既有 UI warning。本任务未
  修改任何页面、组件、样式、MockSession 或现有前端数据流。

### BE-011 — Identity Bootstrap 与 Host-led 创建房间事务命令

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-006、BE-010。  
**范围**：建立当前 Auth 用户的稳定 actor 初始化/升级流程，以及创建
Host-led 房间的原子、幂等命令；本任务只提供后端与服务端命令边界，不把
现有页面切换到 Supabase。

**已完成**

- [x] `bootstrap_identity` 可以幂等创建 profile 和唯一 primary actor；
  anonymous Auth 建立 guest actor，升级为正式账号时保留 actor UUID 并
  原地认领为 account，重试不会覆盖用户已经保存的资料。
- [x] `create_host_led_room` 只允许正式账号调用，并在一个短事务内创建
  room 与 active Host membership；客户端不能提交 actor、role、mode、
  status、服务端时间、revision 或 public ID。
- [x] 创建命令要求 UUID 幂等键，并使用事务级 advisory lock 与私有
  `command_receipts` 回执保证安全重试；同一 actor 与幂等键只返回首次
  已提交结果，不重复建房或篡改原结果。
- [x] privileged 实现位于非 Data API 的 `security` schema，使用
  `SECURITY DEFINER`、空 `search_path`、显式 schema qualification 和
  当前 JWT 复核；public wrapper 保持 `SECURITY INVOKER`，仅
  authenticated 拥有 execute 权限。
- [x] `private.command_receipts` 强制 RLS、撤销全部客户端 table 权限，
  并增加显式 deny-all restrictive policy；Supabase Security Advisor
  为 0。
- [x] 两条正式云端 migration 为
  `20260727101617_identity_bootstrap_create_room_command` 与
  `20260727102058_be011_command_receipts_deny_all`；内部组件版本
  `identity_room_commands = 1`。
- [x] 已生成与 `eventspace-dev` 一致的 public Database 类型，并新增
  server-only typed command service；输入在访问 Supabase 前校验，RPC
  原始错误不会泄漏给调用方。
- [x] 云端 30 项 pgTAP 测试全部通过，覆盖权限、匿名升级、并发边界、
  原子 Host membership、幂等重试和非法参数；事务回滚后 profiles、
  actors、rooms、room_members、command_receipts 均为 0 行。
- [x] 59 项应用测试、typecheck、lint、生产 build 与
  `git diff --check` 通过；lint 仍只有 9 个既有 UI warning。Performance
  Advisor 仅有空库中两个预期 `unused_index` INFO。本任务未修改页面、
  组件、样式、MockSession 或现有前端数据流。
- [x] 本机 schema drift 脚本仍依赖 Docker Desktop，当前 cloud-first
  工作站未运行 Docker；已用云端 migration history、事务 pgTAP、
  Security/Performance Advisor 与远端类型一致性检查完成等价验证，
  Linux CI 继续负责正式 drift gate。

### BE-012 — RLS 受控房间读取模型与 Supabase Repository

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-010、BE-011。  
**范围**：建立当前登录身份可读取的房间列表、基础详情、本人 membership
和准确成员数；保留现有 Mock UI，暂不把尚未建表的 Chat、Photos、
Itinerary 或旧 Board 字段伪装成生产数据。

**本轮完成后的预期**

后端已经可以根据真实 Supabase session 安全回答“我能看到哪些房间”和
“我在这个房间是什么角色”，并返回创建页面后续所需的真实房间 ID。当前
页面仍无视觉变化是刻意的隔离措施；下一轮可以在不重做卡片 UI 的前提下，
开始把创建/房间列表页面渐进接到这些已验证接口。

**已完成**

- [x] 新增 `list_current_user_rooms` 与 `get_current_user_room` 两个 public
  security-invoker RPC；privileged 实现位于 `security` schema，使用
  `SECURITY DEFINER`、空 `search_path`、显式当前用户检查和最小 execute
  grant。
- [x] 读取规则与 RLS 生命周期一致：active/muted membership 可读取活动
  房间；只有正式账号且 `archive_eligible = true` 才能读取归档；匿名
  Auth、无资格成员和 outsider 均无法枚举受限房间。
- [x] 列表一次返回准确 active/muted 成员数和当前 viewer 的 actor、
  nickname、role、state、archive eligibility，避免逐房间 N+1 查询。
- [x] 列表按 `(updated_at, room_id)` 使用稳定 keyset cursor，页大小限制
  1 至 50；不使用随页数增长而退化的 offset pagination。
- [x] 新增 server-only `SupabaseRoomReadRepository`、生产读取 contract、
  运行时响应校验和稳定错误码；数据库/provider 原始错误不会暴露给页面。
- [x] production actor UUID 已纳入现有 branded ActorId 解析，同时保留
  现有 `actor_*` Mock fixture 格式，未破坏本地原型。
- [x] 正式云端 migration 为
  `20260727121606_room_read_models`，内部组件版本
  `room_read_models = 1`；生成类型与 `eventspace-dev` 一致。
- [x] 云端 24 项 pgTAP 测试全部通过；测试事务回滚后 profiles、actors、
  rooms、room_members、command_receipts 均为 0 行。Security Advisor
  为 0，Performance Advisor 仅有一个空库预期 `unused_index` INFO。
- [x] 66 项应用测试、typecheck、lint、生产 build 与
  `git diff --check` 通过；lint 仍只有 9 个既有 UI warning。本任务未
  修改任何页面、组件、样式、MockSession 或现有前端数据流。

### BE-013 — Supabase Auth 登录页与身份激活闭环

**状态**：已于 2026-07-27 完成；真实邮件点击集中验收待第一批结束执行。  
**依赖**：BE-006、BE-011。  
**范围**：首期仅启用 Supabase Auth 邮箱 Magic Link/OTP，不接 Google
OAuth；新增登录 UI，并确保 PKCE 回调成功后一定完成后端 identity
bootstrap。

**本轮完成后的预期**

用户从 `/login` 提交邮箱并点击一次性登录链接后，会带着有效 Supabase
session 回到原目标页面；profile 与稳定 primary actor 已同步建立，因此
不会出现“Auth 已登录但业务身份不存在”的半完成账号。

**已完成**

- [x] 新增符合现有大圆角、卡片、暖灰/墨黑视觉语言的响应式 `/login`
  页面；支持 pending、发送成功、输入错误与通用 provider 失败状态。
- [x] 登录继续使用 BE-006 的受信 origin、allowlisted `next` 与 PKCE
  callback，不接受外部跳转地址，不向浏览器泄漏 provider 错误。
- [x] callback 在交换 session 后通过 Supabase `getUser()` 获取已验证
  邮箱，生成初始 display name，并执行 `bootstrap_identity`。
- [x] identity bootstrap 或用户验证失败时立即清理本地 session 并返回
  通用错误，不保留无法执行业务命令的不完整登录状态。
- [x] 首页登录入口与创建房间登录门槛已指向 `/login`；Google OAuth、
  密码和第三方身份平台均未提前接入。
- [x] Auth action/callback 8 项测试、typecheck 和针对性 lint 通过；仅
  保留创建房间组件中 1 个既有未使用类型 warning。
- [x] 2026-07-27 人工登录首次验收发现部分本地 Server Action 请求不携带
  `Origin`；已修复为优先验证 Origin、缺失时验证同 Host Referer、最后
  才从合法 Host/协议安全构造 callback origin。外部跳转和 Host 注入仍
  fail closed，Auth/redirect/callback 共 22 项定向测试通过。

### BE-014 — 创建房间页面接入云端事务命令

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-011、BE-012、BE-013。  
**范围**：保留现有三步创建向导和完成页视觉，只把最终提交从本地
MockSession 切换为 Supabase 事务命令；邀请链接在 BE-016 接入。

**本轮完成后的预期**

真实登录用户完成现有向导后，云端会原子创建 Host-led room 与 active
Host membership；只有数据库回读确认该用户可见房间后才显示成功。网络
失败时保留草稿与同一幂等键，安全重试不会重复建房。

**已完成**

- [x] `/rooms/new` 在 Server Component 边界验证 Supabase claims；未登录
  用户跳转 `/login?next=/rooms/new`，不再信任 Mock auth state。
- [x] 新增 create-room Server Action，使用 Zod 再次校验名称、描述、时区、
  时长、人数、法律确认和 UUID 幂等键。
- [x] 最终写入调用 BE-011 的 `create_host_led_room`，固定
  `requires_approval = true`，客户端仍不能提交 actor、Host role、mode、
  status、服务器时间、revision 或 public ID。
- [x] 命令成功后通过 BE-012 Repository 回读权威 starts/ends/public ID；
  ID 或可见性不一致时 fail closed，不展示虚假成功。
- [x] 创建向导移除 `createLocalRoom` 与 MockSession 写入；原视觉、草稿
  恢复、步骤校验和完成卡片保留。
- [x] Server Action 3 项测试、room command 回归、typecheck 与针对性 lint
  通过。

### BE-015 — 房间列表与基础详情接入真实 Repository

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-012、BE-014。  
**范围**：把 `/rooms` 与真实房间基础详情切换到 Supabase；保留现有卡片、
筛选、搜索、网格/杂志布局，不提前伪造 Chat、Photos 或 Itinerary 内容。

**本轮完成后的预期**

用户登录并创建房间后，返回 `/rooms` 即可看到真实云端房间；刷新或在另一
设备登录仍可通过账号恢复。点击卡片能读取真实名称、描述、时区、人数、
本人角色、审批设置和生命周期。

**已完成**

- [x] `/rooms` Server Component 验证 Supabase claims；未登录跳转到带安全
  `next` 的登录页。
- [x] 页面通过 `SupabaseRoomReadRepository` 读取最多 50 个真实房间，
  不再使用 MockSession 作为房间列表权威来源。
- [x] 新增纯 presenter，把后端生命周期映射到现有 active/read-only 卡片
  状态；Photos 尚未建表时明确返回 0 与空列表，不生成假照片或旧 Board
  业务数据。
- [x] 现有房间卡片、搜索、筛选、轮播和网格切换保持；尚无后端命令的
  收藏/删除编辑入口暂时隐藏，避免按钮看似成功却只修改本地 Mock。
- [x] 2026-07-27 已撤销 `/rooms/[roomId]` 对简化后端壳层的接管，恢复原
  `MockRoomRoute → RoomExperience` 页面与全部既有 UI/交互；Supabase
  详情 Repository 保留为未接 UI 的后端能力，后续必须通过不改变视觉的
  适配层渐进接入，并在接管路由前取得用户确认。
- [x] presenter/Repository 8 项针对性测试、typecheck 与针对性 lint 通过。

### BE-016 — 邀请链接、短码与 Host-led 加入事务后端

**状态**：已于 2026-07-27 完成。  
**依赖**：BE-010、BE-011、BE-014。  
**范围**：建立真实邀请密钥、8 位短码、邀请预览和加入/待审批事务；不提前
实现 Host 审批页面，也不改变现有页面视觉结构。

**本轮完成后的预期**

Host 创建房间后会获得真实可分享的私密链接与短码；后端只保存 SHA-256
哈希，不保存原始密钥。被邀请者只能用当前有效密钥看到最小房间预览，登录
后可幂等提交加入请求；审批房进入 pending，直入房只获得 member 角色。

**已完成**

- [x] 新增私有 `room_invites` 与 `room_join_requests`，均启用并强制 RLS、
  撤销客户端表权限，并使用显式 deny-all restrictive policy。
- [x] 邀请 raw token 与短码只在创建结果中返回一次，数据库仅保存哈希；
  Host 轮换邀请会撤销旧密钥，同一密钥重试不会增加 revision。
- [x] 新增 secret-backed 邀请预览和全局 8 位短码解析；无有效密钥时不会
  暴露房间名称、成员数或生命周期。
- [x] 加入命令从当前 JWT 推导稳定 actor，检查容量、封禁、昵称唯一性和
  房间状态；客户端不能提交 actor、role、membership state 或审批结果。
- [x] requires-approval 房间幂等 upsert 一条 pending request；直入房原子
  建立 member membership，重试不会重复成员。
- [x] 创建房间 Server Action 已同步创建真实邀请；现有完成卡片保留，并
  显示真实短码和可复制的私密链接。
- [x] 正式云端 migration 为
  `20260727124426_room_invites_and_join`，组件版本
  `room_invites_and_join = 1`；云端生成类型已同步。
- [x] 云端 32 项 pgTAP 事务断言全部通过；invite service 与创建 action
  7 项测试、typecheck 和针对性 lint 通过。

### BE-017 — 加入页面接入真实邀请、Supabase Auth 与成员流程

**状态**：已于 2026-07-27 完成；真实邮件点击集中验收待本批结束由用户
配合执行。  
**依赖**：BE-013、BE-016。  
**范围**：保留既有短码页与大卡片邀请页视觉，把 MockSession 查找、模拟
审批和本地成员写入替换为真实 Server Action 与 Supabase RPC。

**本轮完成后的预期**

用户可在 `/join` 输入 Host 分享的 8 位短码，打开真实邀请预览；未登录时
通过邮箱 Magic Link 登录并回到同一带密钥页面。提交后，Host-led 审批房会
得到真实 pending 回执，直入房会建立 member membership 并进入真实房间。

**已完成**

- [x] `/join` 不再扫描 MockSession，8 位短码通过匿名可执行、最小暴露的
  云端 RPC 解析并跳转到对应邀请页。
- [x] `/join/[roomId]` 在 Server Component 中验证 public ID 和 token/code，
  只渲染数据库返回的真实名称、描述、时区、成员数、容量和审批设置。
- [x] 无效、被轮换或过期邀请统一显示不可用，不泄漏房间是否存在；邀请页
  设置为动态渲染并禁止搜索引擎索引。
- [x] 未登录用户进入现有 `/login` 邮箱 Magic Link 流程，安全 `next`
  保留邀请 URL；登录 callback 完成 identity bootstrap 后返回原邀请。
- [x] 加入 Server Action 重新校验全部输入，并由数据库从 JWT 推导 actor；
  pending 与 joined 使用真实事务结果，不再提供本地“模拟批准并进入”。
- [x] 原有大卡片、圆角表单、响应式布局和视觉素材结构保留；文案明确真实
  pending 状态，尚未实现的 Host 审批不会伪装成已完成。
- [x] join actions、invite service 与 create action 共 10 项针对性测试、
  typecheck、针对性 lint 和 `git diff --check` 通过。
- [x] 正式已应用 schema 再跑云端 32 项 pgTAP 全部通过；事务回滚后
  profiles、actors、rooms、room_members、command receipts、invites 和
  join requests 均为 0 行，Security Advisor 为 0。
- [x] 全量 18 个测试文件共 79 项测试、typecheck、生产 build 和
  `git diff --check` 通过；lint 无 error，仅保留 8 个既有投票兼容
  warning，本任务未引入新 warning。

### BE-018 — Host 审批与成员治理事务

**状态**：已于 2026-07-27 完成；纯后端，未接入或修改任何前端 UI。  
**本轮完成后的预期**：后端可以安全列出 pending 请求，由 Host 原子批准
或拒绝，并对普通成员执行 active、muted、removed、banned 状态变更；Host
自身状态受保护，容量和昵称约束继续由数据库裁决。

**已完成**

- [x] 新增 pending request 列表、审批和成员状态三个最小权限 RPC。
- [x] 所有 Host 权限、房间状态、容量与目标成员都在事务内重新验证。
- [x] 正式 migration：`20260727131542_host_review_member_governance`；
  `member_governance = 1`。

### BE-019 — 房间到期、结束与归档状态机

**状态**：已于 2026-07-27 完成；纯后端，未接入或修改任何前端 UI。  
**本轮完成后的预期**：Host 可以幂等结束房间；数据库能够以短事务批量把
过期/结束房间推进 `freezing → archiving → archived`，并使用数据库时间
设置归档与清理窗口。

**已完成**

- [x] Host end command 使用 command receipt 与 advisory lock 保证重试安全。
- [x] service-role lifecycle worker 使用 `FOR UPDATE SKIP LOCKED`、批量上限
  和单向状态转换，归档时为有效正式成员写入 archive eligibility。
- [x] 正式 migration：`20260727131545_room_lifecycle_archive`；
  `room_lifecycle = 1`。

### BE-020 — 私有 Realtime 授权与最小事件广播

**状态**：已于 2026-07-27 完成；纯后端，未接入或修改任何前端 UI。  
**本轮完成后的预期**：只有仍有房间读取权的 authenticated 成员能订阅
`room:{uuid}:events` 私有频道；数据库提交后广播最小失效事件，不发送聊天
正文、成员备注或媒体 URL。

**已完成**

- [x] 在 Supabase 允许的边界内仅管理 `realtime.messages` RLS policy，
  未在受保护 realtime schema 创建自定义表或函数。
- [x] 广播函数位于 private schema，payload 仅含 event/entity/operation/
  revision/time；Rooms、members、join requests、messages、reactions、
  pins 和 itineraries 已挂接提交后 trigger。
- [x] 正式 migration：`20260727131548_private_realtime_events`；
  `private_realtime = 1`。

### BE-021 — Chat 文本、语音引用与互动事务后端

**状态**：已于 2026-07-27 完成；纯后端，未接入或修改任何前端 UI。  
**本轮完成后的预期**：后端可保存房间文本消息和最长 60 秒的 ready voice
asset 引用，支持回复、作者撤回、反应和 Host 置顶；写入均从 JWT 推导
actor，客户端不能伪造作者、服务器时间或系统消息。

**已完成**

- [x] 新增 assets、messages、message_reactions、message_pins，全部启用
  FORCE RLS、最小 SELECT 权限、外键索引和内容约束。
- [x] send 使用 actor + UUID 命令唯一约束幂等；voice 只能引用本人且状态
  ready 的 voice asset。Storage 上传/转码流水线仍属于后续媒体任务。
- [x] 新增 server-only typed capability service；没有导入任何 UI 组件。
- [x] 正式 migration：`20260727131551_chat_backend_v1`，并由
  `20260727133233_fix_chat_itinerary_rpc_argument_names` 修正 PostgREST
  参数名；`chat_backend = 1`。

### BE-022 — Itinerary CRUD、revision 与手动结束后端

**状态**：已于 2026-07-27 完成；纯后端，未接入或修改任何前端 UI。  
**本轮完成后的预期**：有效成员可以创建、修改和手动结束行程；负责人必须
是当前有效成员，时间模式由约束保证，更新必须携带 expected revision，
过期写入以稳定冲突失败而不是覆盖他人修改。

**已完成**

- [x] 新增 itineraries 表、RLS、时间/模式/长度约束和房间时间线索引。
- [x] create 使用 UUID 幂等；update/end 在锁定行后验证 membership 与
  revision，手动结束使用数据库时间。
- [x] RPC 已进入云端生成类型和 server-only capability service。
- [x] 正式 migration：`20260727131553_itinerary_backend_v1`，PostgREST
  wrapper 修复同 BE-021；`itinerary_backend = 1`。

### 首批完成门槛

基础任务完成时必须达到：

1. 首期产品范围唯一且无文档冲突。
2. 独立的 Supabase 云端开发项目已创建、连接并可由 migrations 重建。
3. Next.js 16 SSR Auth 最小闭环可用。
4. 环境变量和 secret 边界经过测试。
5. migration、类型生成和 RLS 测试流水线已经建立。
6. 尚未把当前业务 UI 强行接到不稳定 schema。

上述 Supabase 基础门槛以及 BE-010 至 BE-017 均已完成。真实邮件投递和
Magic Link 点击仍需使用获准邮箱做一次人工验收；Stripe 作为独立产品决策
流延期，不阻塞免费/封闭测试 MVP 的下一批业务接入。

## 15. 前端数据接线（DW-001～DW-010）

> 状态：10/10 已于 2026-07-27 完成。  
> 强制边界：本批只修改数据读取、命令适配、会话同步、Realtime 与测试，
> 未修改 Room 页面现有视觉组件、CSS、布局、文案或交互结构。

### DW-001 — Room UI 基线锁定

**状态**：已完成（2026-07-27）。

- [x] 建立 `docs/room-ui-baseline.md`，记录 Room、Chat、Photos、Itinerary 和
  Controls 十个关键视觉文件的 SHA-256。
- [x] 增加自动化哈希回归测试，保证本批接线没有改动现有 UI 文件。

**完成后的预期**：任何接线改动若触碰受保护的 Room UI 或 CSS，测试会直接失败。

### DW-002 — Supabase 登录会话接线

**状态**：已完成（2026-07-27）。

- [x] 房间 Server Component 使用现有 cookie-backed Supabase server client。
- [x] 服务端通过 `getClaims()` 读取已验证身份，浏览器端仅使用 publishable key。
- [x] Room 内层使用 server-backed session provider，不再把本地 Mock 身份当作
  云端房间的权威身份。

**完成后的预期**：Room 的 viewer actor、角色和状态来自当前 Supabase session；
会话失效继续由现有 Proxy/Auth 边界处理。

### DW-003 — 房间初始化数据接线

**状态**：已完成（2026-07-27）。

- [x] `/rooms/[roomId]` 读取真实房间、viewer membership、可见成员、消息、反应、
  置顶、行程和 Host pending requests。
- [x] RLS 返回的数据映射到现有 `RoomExperience` contract；Photos 未建后端时明确
  返回空数组，不伪造云端内容。
- [x] 不存在或无权读取的房间继续使用原 Room unavailable 视觉。

**完成后的预期**：刷新或换设备进入房间时，Room 页面由云端权威快照初始化。

### DW-004 — 创建及加入房间接线

**状态**：已完成（2026-07-27）。

- [x] 复核现有创建流程继续调用 `create_host_led_room` 和真实 invite RPC。
- [x] 复核邀请预览、短码解析、pending/joined 结果和加入后 Room 路由。
- [x] 新创建或新加入的房间现在可由 DW-003 的真实详情路由打开。

**完成后的预期**：创建、邀请、申请加入、直接加入和进入房间形成同一云端闭环。

### DW-005 — Host 成员管理接线

**状态**：已完成（2026-07-27）。

- [x] 原有审核按钮接入 `review_join_request`。
- [x] 原有 mute/unmute/remove/ban 操作接入 `change_room_member_state`。
- [x] 客户端提交的 actor/role 不被信任，权限和最终状态仍由数据库事务裁决。

**完成后的预期**：Host 操作会持久化并通过刷新/Realtime 对其他成员生效。

### DW-006 — 房间生命周期接线

**状态**：已完成（2026-07-27）。

- [x] 原有 End Room 操作接入幂等 `end_host_led_room`。
- [x] 页面读取 active/freezing/archiving/archived 权威状态并自动切换只读能力。
- [x] 非 Host 不获得结束房间能力；生命周期时间和 revision 不由浏览器提交。

**完成后的预期**：结束后的房间立即停止写入，后续归档状态由后端生命周期任务推进，
页面始终按数据库状态显示。

### DW-007 — 文本聊天接线

**状态**：已完成（2026-07-27）。

- [x] 原有文本 composer 接入幂等 `send_room_message`，回复引用同步写入。
- [x] 作者撤回、reaction 与 Host pin 接入对应 RPC。
- [x] 消息、reaction 和 pin 从 RLS 表读取；recalled/moderated 消息不进入页面快照。
- [x] 语音录制 UI 未修改；Storage 上传/转码尚未完成时不伪造 ready voice asset。

**完成后的预期**：文本消息及其核心互动可刷新恢复并在成员之间同步；语音文件链路仍
明确属于后续 Storage 媒体任务。

### DW-008 — 私有 Realtime 接线

**状态**：已完成（2026-07-27）。

- [x] 浏览器调用 `realtime.setAuth()` 后订阅
  `room:{room_uuid}:events` private channel。
- [x] Broadcast 到达后使用短 debounce 刷新 Server Component 权威快照，避免把
  事件 payload 当作业务真相。
- [x] Auth token 更新时同步 Realtime token；卸载时取消 Auth listener、timer 和
  channel，底层客户端负责断线重连。

**完成后的预期**：成员、消息、置顶、行程和生命周期提交后，在线成员页面会重新读取
同一份 RLS 权威数据。

### DW-009 — Itinerary 行程接线

**状态**：已完成（2026-07-27）。

- [x] 原有创建、编辑和手动结束操作分别接入 create/update/end RPC。
- [x] 更新与结束写入前读取当前 revision，RPC 在锁行后再次比较；冲突 fail closed。
- [x] 标题、说明、地点、时间模式、结束时间和负责人均重新经过服务端与数据库校验。

**完成后的预期**：行程可跨刷新、跨设备保存；并发修改不会静默覆盖其他成员结果。

### DW-010 — 集成验收与容错

**状态**：已完成（2026-07-27）。

- [x] 新增 Room command、云端快照映射和 UI 哈希保护测试。
- [x] 不支持或延期的旧命令返回 ignored 并刷新权威快照，不伪装为云端成功。
- [x] Server Action 只返回稳定错误码，数据库原始错误不泄漏到客户端。
- [x] 全量测试、typecheck、lint、生产 build、云端 schema 验证、Security Advisor
  与 UI 哈希复核纳入最终验收。

**完成后的预期**：Host/成员核心房间流程达到可进行封闭 MVP 测试的数据接线水准；
Photos/语音 Storage、支付、Book 和投票仍按既定范围延后。

## 16. 2026-07-28 五项线上接入修复

> 状态：代码、数据库迁移与自动验证已完成；移动端登录的最后一项云端域名配置需在
> 部署域名确定后由项目 Owner 填入，不能猜测或使用 localhost。

- [x] **FIX-001 Auth 移动端回调与登录页**：新增 EVENTSPACE_APP_ORIGIN，生产环境
  未配置时 fail closed；邮件回调及 callback 最终跳转使用该固定 HTTPS origin；登录页改为
  中央单卡片、邮件确认、会话检查后继续进入目标 Rooms 路径。
- [ ] **FIX-001-CLOUD Auth URL Configuration**：在 Supabase Dashboard 将正式 HTTPS
  域名设置为 Site URL，并将 https://domain/auth/callback 加入 Additional Redirect URLs；
  同时在部署平台设置同值的 EVENTSPACE_APP_ORIGIN。此项完成前不可在手机上验证邮件登录。
- [x] **FIX-002 Account 云端化**：/account 读取 Supabase Claims、profiles、当前用户
  房间与 Photos 统计；昵称和主题写回 profiles；移除 Local account/浏览器本地账号语义。
- [x] **FIX-003 Room 数据接线**：修正文字 Chat 的 nullable RPC 参数；语音与 Photos 通过
  私有 Storage、上传签名、assets/photos/photo_comments、RLS、Host 删除权限和 Realtime
  事件持久化；行程改为使用统一 Client Room snapshot，提交后立即显示。
- [x] **FIX-004 创建房间直达**：创建完成页沿用原有按钮样式与文案，目标改为刚创建房间的
  /rooms/{publicId}。
- [x] **FIX-005 Room UI 保护**：Room、Chat、Photos、Itinerary、Controls 的受保护视觉文件
  保持字节级基线不变；媒体与即时状态逻辑放入 adapter/provider 层。

**验收记录（2026-07-28）**：

- [x] 云端应用 room_media_photos_v1、room_media_photo_indexes_v1 两个迁移；
  photos 与 photo_comments 已启用 RLS，room-media 为私有 Storage Bucket。
- [x] npm test（89 项）、npm run typecheck、npm run lint、npm run build 和
  npm run supabase:types:check 均通过。
- [x] Supabase Security Advisor 无新增数据库/RLS风险；仅保留与密码登录无关的
  Leaked Password Protection 提示。

## 17. 2026-07-28 修复复核：照片上传与云端环境

- [x] 修复 Account 的 `list_current_user_rooms` RPC 调用：显式传入三个参数，避免
  PostgREST 因缺少 cursor 参数返回 400；补齐 Account client boundary，单个统计查询失败
  不再使整个 Account 页面失败。
- [x] Rooms 卡片现在从真实的 `photos` / `assets` 读取照片数和私有签名预览图；空白 preview
  不再被 presenter 硬编码。
- [x] Room Options 不再展示本地 reset、伪造的 QR/invite URL、admin 权限或延后的投票与 report
  操作。Host 创建的 invitation 会由数据库的 `create_room_invite` 轮换，并且浏览器只持有一次性
  明文 token。
- [x] Photos 上传签名改为：先以用户会话运行 `prepare_room_media_upload` 完成 RLS/成员/房间状态
  授权，再由服务器为该唯一 object key 创建短时 upload token；服务端 secret 不会发送到浏览器。
- [ ] **FIX-003-CLOUD-MEDIA-SECRET**：当前 `.env.local` 和部署环境均未提供
  `SUPABASE_SECRET_KEY`，因此上述安全签名器无法实际运行。这正是旧代码把上传签名失败折叠为
  “Media is unavailable right now.” 后未被发现的环境缺口。必须在 Supabase Dashboard 的
  Project Settings → API 复制 **secret key**，写入本机 `.env.local` 和 Vercel Production 的
  `SUPABASE_SECRET_KEY`（绝不能使用 `NEXT_PUBLIC_` 前缀或提交到 git）后，照片上传才可验收。
- [x] 验证：`npm run typecheck`、`npm test`（89 tests）与 `npm run build` 通过；云端已确认
  `room-media` 为 private bucket，含 image/audio MIME 限制，且 `storage.objects` 的
  `room_media_insert`、`room_media_select`、`room_media_delete` RLS policies 和两条媒体 migration
  均存在。
- [ ] `npm run supabase:types:check` 仍需要本机 Supabase CLI access token；当前 sandbox 无法写入
  CLI 的 `C:\\Users\\giaog\\.supabase` telemetry 文件，故未能重新生成并比对远端 types。现有生产构建和
  已提交 types 均通过 TypeScript 校验；待 CLI 认证环境可写时再执行此项。

## 18. 2026-07-30 头像、访客加入与真实邀请二维码

> 状态：代码、migration、类型和数据库测试文件已进入工作区；是否已推送到目标 Supabase 云项目仍需单独执行 CLI / Dashboard 验收。

- [x] **AVATAR-001 数据模型**：`profiles`、`room_members`、`private.room_join_requests` 新增 `avatar_variant` 与 `avatar_asset_id`；头像 asset 继续复用私有 `room-media` bucket 和 `assets` 表，不新增公开 bucket。
- [x] **AVATAR-002 RLS 读取边界**：新增 `security.can_read_avatar_asset`，允许头像拥有者、同房间可读成员，以及 Host 查看 pending request 头像；`assets_member_read` 与 `storage.objects` select policy 已补齐头像路径。
- [x] **AVATAR-003 上传事务**：新增 `prepare_profile_avatar_upload` / `finalize_profile_avatar_upload`，只允许非 anonymous 的 authenticated account 上传 JPEG/PNG/WebP，大小上限 5 MB；完成时确认 Storage object 存在并把 profile 指向 ready asset。
- [x] **AVATAR-004 房间同步**：profile avatar finalize 会同步到仍跟随 profile 的 `room_members`，保留已有自定义房间头像；新建 membership 默认继承当前 profile avatar。
- [x] **JOIN-001 带头像的加入事务**：`join_room_with_profile` 包装既有 invite 事务，写入 pending request 或 membership 的 avatar 选择；客户端不能伪造他人 avatar asset。
- [x] **JOIN-002 访客无登录加入**：`joinRoomAction` 在无 session 时执行 Supabase anonymous sign-in，再 bootstrap identity，避免把数据库 `anon` role 当作房间访客。
- [x] **JOIN-003 待审核轮询**：pending 加入返回 `requestId`；`/join/status` 调用 `get_join_request_status`，只允许 request owner 查看 pending/approved/rejected，并设置 `private, no-store`。
- [x] **JOIN-004 Host 审批展示**：Host pending request 列表改读 `list_pending_join_requests_with_avatar`，Room member list、Chat、Itinerary responsible、Rooms header 与 Account 使用签名头像 URL。
- [x] **INVITE-QR-001 真实 QR**：创建完成卡和 Room share 面板使用 `qrcode` 生成当前 private invite URL，不再展示假 QR 图案；下载 PNG 同步生成可扫描 QR 与短码。
- [x] **MEDIA-ERR-001 云端命令回滚**：`BackendSessionProvider.executeCommand` 为 voice/photo/comment/delete 返回明确错误，失败时回滚到服务器快照；Photos UI 不再把未持久化乐观更新静默留下。
- [x] **NEXT-IMAGE-001 签名媒体渲染**：`next.config.ts` 根据 `NEXT_PUBLIC_SUPABASE_URL` 放行当前项目的 `/storage/v1/object/sign/room-media/**` 远程图片，避免头像/媒体签名 URL 被 Image 组件阻断。
- [x] **TEST-001 数据库覆盖**：新增 `023-room-identity-avatars.test.sql` 与 `024-profile-avatar-room-sync.test.sql`，覆盖字段、execute 权限、security invoker wrapper、anonymous 禁止头像上传、审批头像复制和 profile avatar 同步。

**仍需云端/环境验收**：

- [ ] 确认四个 migration 已应用到目标 Supabase 云项目，并重新生成 / 比对 `data/supabase/database.types.ts`。
- [ ] 运行 `npm run supabase:test:db`，确认 023/024 在云端测试环境通过。
- [ ] 继续保留 `SUPABASE_SECRET_KEY`、Auth Site URL / Additional Redirect URLs、`EVENTSPACE_APP_ORIGIN` 的环境配置检查；头像和媒体签名上传都依赖 server secret。
- [ ] 在手机上扫描创建完成卡和 Room share QR，分别验证 logged-in、anonymous guest、pending approve、rejected 四条路径。
- [ ] 头像图片仍缺少服务端解码/重编码、EXIF 清理、恶意文件扫描和缩略图流水线；当前只完成 MIME/大小/RLS/Storage 对象归属边界。
