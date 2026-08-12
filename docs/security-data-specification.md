# EventSpace 第一版安全、数据与合规规格

> 这不是法律意见。正式条款、隐私政策和数据处理协议必须在上线前由适用法域律师审阅。

## 1. 安全定位

第一版采用托管加密，不是严格端到端加密（E2EE）。用户可正常跨设备登录和访问个人归档；服务端可在运营、安全、故障处理和依法合规的必要范围内处理内容。

产品不得声称 E2EE、不得声称服务端绝无内容访问能力。对外承诺应准确说明：不出售数据、不投放广告、不使用第三方行为追踪；员工不常规人工查看房间内容，例外访问必须遵循最小权限和审计流程。

## 2. 必须实施的技术控制

- 传输层：全站 HTTPS/TLS，实时连接使用安全 WebSocket。
- 静态数据：数据库、媒体对象、备份均加密存储；密钥由受控密钥管理系统管理并可轮换。
- 媒体：不可公开列举；仅通过短期、授权范围内的签名访问链接读取。
- 授权：所有写入、下载、归档、权限与冻结都由服务端按当前成员资格和服务器时间判断。
- 会话：邮箱 magic link/OTP 与 Google 登录；会话令牌安全存储、可撤销、过期并抵抗重放。
- 日志：不记录聊天正文、语音、照片、评论、行程正文或敏感访问令牌；日志仅保留必要的安全和运行事件。
- 审计：记录管理员权限变更、关键房间设置、付款权益、异常内容访问和支持人员的例外访问。
- 隔离：房间 ID、成员身份和媒体对象都必须进行逐项授权，不能依赖前端隐藏或可猜测链接。

## 3. 最小数据集

| 类型 | 收集内容 | 用途 |
| --- | --- | --- |
| 账户 | 邮箱或 Google 身份、显示名、头像 asset | 登录、归档、房间权限 |
| 访客 | Supabase anonymous user、actor、房间昵称、首字母头像或带入的账号头像 | 实时房间身份 |
| 房间 | 设置、成员资格、权限、行程、内容元数据 | 提供房间能力 |
| 内容 | 聊天、短语音、图片、评论、行程说明 | 按用户指令提供协作能力 |
| 设备限制 | 随机本地设备令牌 | 当前房间拉黑防重入；不是浏览器指纹 |
| 运行指标 | 聚合错误、性能、功能使用、创建量 | 稳定性与产品改进 |
| 支付 | Stripe 交易状态与必要对账标识 | 房间付费权益；不保存卡号 |

不收集手机号、出生日期、国家/地区；不使用广告 SDK 或第三方行为追踪。

## 4. 内容、权限与冻结

- Host/管理员操作、禁言、踢出、拉黑必须立刻在服务端生效。
- 被踢或拉黑后，实时连接应关闭，后续内容与媒体签名访问应失效。
- 房间到期以服务器时间冻结；客户端离线缓存不能绕过服务端写入检查。
- 内容发布者只能修改或删除自己有权限的内容；Host/管理员可删除但不能编辑他人内容。
- 访客升级为账户用户时，必须安全绑定该设备的临时身份与既有记录，避免他人劫持。

## 5. 媒体与隐私

- 原始图片最大 10 MB；上传后移除 EXIF 等隐私元数据。
- 服务端应验证真实文件类型、限制解压/图像处理资源、阻止 SVG/HTML 等可执行内容伪装为图片。
- 统一压缩并存储服务版本，最长边 2560px、目标质量约 85；不保存原图。
- 当前封闭 MVP 的图片重编码发生在浏览器端，并生成 display、thumbnail 和 placeholder；这能减少上传体积和大部分常见 EXIF 暴露，但不能替代服务端可信解码、扫描和转码。
- 上传前首次提示用户只分享拥有权利或已获授权的内容。
- 内容和上传文件不应进入应用日志、错误追踪正文或分析管道。

## 6. 数据保留与删除

- 免费归档保留 30 天；到期前 7 天提醒。
- 普通归档到期后，主存储在 7 天内删除；备份在额外 30 天内清理。
- 永久归档按已购房间容量长期保存；如收到有效法律删除请求，按适用法律评估、执行并记录。
- 用户从个人归档列表移除房间仅影响其个人入口，不会删除其他成员的归档。
- 账户删除：立即移除登录与头像，将显示名替换为 `Deleted member`；内容依房间保留政策处理，永久归档内容不再关联该账户。

## 7. 反滥用与隐私边界

- 对访客设置消息、@ 与语音速率限制，出现异常时使用简易人机验证。
- 举报由用户私密描述违规者及位置，再由 Host 处理；平台不承诺自动内容审查。
- 拉黑使用随机本地令牌，清除网站数据会降低防重入效果；链接轮换、邀请码作废和审核应作为补强。
- 浏览器推送不含敏感内容正文。未登录用户只接收当前页面提示；只有登录用户主动开启后才请求推送权限。

## 8. 合规与公开文档

首发前必须提供并审阅：

1. 服务条款：付款、退款、内容许可、用户责任、可接受使用、服务限制与争议条款。
2. 隐私政策：数据类别、目的、处理者、跨境传输、保留期、用户权利、联系人及安全措施。
3. 社区规则：举报、Host 治理、禁言、踢出、拉黑与禁止内容。
4. Cookie 说明：仅必要 Cookie 与安全/登录用途；无广告或行为追踪 Cookie。
5. 数据主体请求流程：访问、更正、删除、反对/限制及身份验证。

产品统一 16+。注册或创建房间时必须完成年龄资格和条款/隐私政策确认。面向美国、欧盟和澳大利亚上线前，应针对支付税务、消费者退款、隐私权、跨境数据传输和儿童/青少年保护完成专业法律审阅。
## 2026-07-30 当前同步：真实后端接线后的安全与数据边界

当前版本已经具备真实 Supabase Auth、RLS、RPC、私有 Storage 和 Realtime 接线路径，但安全结论仍需保守表达：

- 账号头像、Photos 和 Voice 都写入私有 `room-media` bucket，并通过 `assets` 表记录 owner、kind、status、object key、MIME 和大小；浏览器只拿到短期 signed upload token 或 signed read URL。
- `profiles.avatar_asset_id` 是账号头像来源；`room_members.avatar_asset_id` 和 `private.room_join_requests.avatar_asset_id` 保存房间内展示快照。profile 更新只同步仍跟随 profile 的 membership，已有自定义房间头像不被覆盖。
- 头像读取不是公开资源：`security.can_read_avatar_asset` 只放行拥有者、可读同房间成员和可管理 pending request 的 Host。
- 未登录访客加入会创建 Supabase anonymous session，再通过 `bootstrap_identity` 建立 actor/profile 边界；数据库 `anon` role 仍不能直接执行加入、头像上传或房间写 RPC。
- 账号头像上传只允许非 anonymous 的 authenticated account，客户端限制 JPEG/PNG/WebP 与 5 MB；服务端仍必须继续补真实文件签名、解码/重编码、EXIF 清理、缩略图和恶意文件扫描。
- 待审核状态轮询只允许 request owner 读取自己的 pending/approved/rejected；响应设置 `private, no-store`，不泄露房间内容。
- 真实 QR 编码 private invite URL，因此邀请卡 PNG 和分享截图都应被视为敏感入口材料；轮换邀请后旧链接应失效，分享缓存和截图无法远程撤回。
- `SUPABASE_SECRET_KEY` 是媒体/头像签名上传的服务端必要 secret；不得使用 `NEXT_PUBLIC_` 前缀，不得提交 git，不得从客户端读取。

## 2026-08-02 当前同步：媒体变体与本地快照安全边界

- 图片 asset 当前除 display object 外，还可保存 thumbnail object、placeholder data URL、width/height 和 `media_revision`。这些字段是展示和缓存元数据，不降低照片本身的私密等级。
- display 与 thumbnail 都位于私有 `room-media` bucket；Storage select/insert/delete policy 必须同时覆盖 display object key 与 thumbnail object key，并继续按房间成员/头像读取策略授权。
- 浏览器 snapshot/cache 不得保存 signed read URL。`/rooms`、Room detail、Account 和 viewer avatar 缓存写入前会剥离 `remoteUrl` / `avatarUrl`，并以当前 viewer scope 隔离，避免同一浏览器中切换账号后直接复用他人短期链接。
- Cache Storage 与 IndexedDB 的 cloud image read-through cache 保存的是已授权下载过的 display/thumbnail Blob；这提升当前设备重开体验，但清除站点数据、换设备、权限变更或签名 URL 过期都需要重新经过服务端授权路径。
- `eventspace:room-photo-cache:v3` 使用 asset id、variant 和 revision 组成缓存键；当 revision 变化时旧缓存必须被视为 stale 并可清理，不能继续作为当前照片内容。
- `placeholder_data_url` 虽然体积小，仍可能泄露照片颜色/构图轮廓；它只能随授权房间快照返回，不应进入公开 HTML、日志或跨用户缓存。
- `list_room_card_media` 现在可返回房间全部 ready photos。UI 的有限渲染窗口只是性能策略，服务端仍应按房间权限、成员状态、照片状态和私有 Storage 签名控制每张照片读取。

## 2026-08-10 当前同步：成员偏好与浏览器图片缓存

- `room_members.is_favorite` 与 `hidden_at` 是当前成员的个人集合偏好，不是共享房间设置。收藏/隐藏 RPC 只允许 `authenticated` 执行，并在服务端复核当前 primary actor、成员状态、房间可读权限和公开 ID。
- 隐藏只从当前成员的 Rooms collection 中排除房间，不删除 membership、不撤销直接房间访问，也不删除房间内容；隐藏时服务端清除该成员的收藏状态，避免个人集合状态不一致。
- Cache Storage `eventspace-cloud-images-v1` 与 IndexedDB 只保存已经通过授权读取的 display/thumbnail Blob。缓存命中不等同于当前授权，账号切换、权限变化、revision 变化和 signed URL 失效仍必须回到服务端读取路径。
- 缓存键包含 viewer scope、asset、variant 和 revision；不得以 signed URL 作为持久 key，也不得把 `placeholder_data_url` 放入公开 HTML、日志或跨用户缓存。

## 2026-08-11 当前同步：Zine 浏览器内存隐私边界

- `/zine` 当前只在浏览器组件内存中持有用户选择的 `File`、Object URL、Photo Note、手动页面和裁切焦点；没有上传到 Supabase Storage，也没有数据库、日志、分析或分享路径。
- 该边界不等同于正式隐私保护：浏览器扩展、同机用户、截图、下载或开发者工具仍可能读取/复制本地内容；产品文案不得声称 Zine 内容已加密或具有远程删除能力。
- 刷新、关闭页面或离开路由会丢失草稿；当前没有账号隔离、发布权限、导出权限或重新打开机制。
- 如果未来将 Zine 接入后端，照片、Photo Note 和页面结构都应按私密内容处理：使用私有 Storage、asset ownership、RLS、短期 signed URL、服务端 MIME/大小/解码/EXIF/恶意文件校验，并单独定义删除、版本、分享和审计策略。

## 2026-08-12 当前同步：Recipe 状态与未来后端信任边界

- Recipe Application、照片实例的 `focusX` / `focusY` / `scale`、未放置照片和隐藏 Note 目前都只在浏览器内存中存在；它们不是权限、发布状态、所有权或删除结果。
- development-only `/zine/preview-matrix` 使用固定 Reference fixtures，不应接收真实用户私有资产或被部署为生产公开入口；生产环境必须继续阻断该路径。
- 若未来持久化，服务端必须校验 Recipe ID/version 是否可用、Application 是否属于当前 draft/page、照片 asset 是否属于当前用户/房间、坐标与 Note 长度是否在 schema 范围内，并通过 RLS/Storage policy 保护原图和衍生资源。客户端 Compatibility 只用于 UX，不是授权。

### 仍待补齐的生产安全要求

1. Cloudflare Turnstile 或等价机制、服务端速率限制和匿名用户清理任务。
2. 媒体和头像的服务端 MIME magic number 校验、图像解码、EXIF 清理、转码、缩略图复核与恶意文件扫描。
3. Storage object 引用计数、删除/软删除、孤立 pending asset 清理和归档保留策略。
4. Auth Site URL / Additional Redirect URLs、`EVENTSPACE_APP_ORIGIN` 和移动端邮件回调的生产域名验收。
5. 支持人员例外访问、审计日志、举报、备份清理和正式法律文本。

## 2026-07-18 历史同步：本地 Mock 安全与数据边界

本节为历史同步，保留用于理解旧本地优先阶段；当前判断以 2026-08-02 同步为准。

- 当前没有真实认证、RLS、RPC、Realtime Authorization 或服务端 session。
- 当前所有写操作均在浏览器本地状态中完成，不能代表生产授权。
- 当前照片、语音和涂鸦 Blob 存入本机 IndexedDB，会话 JSON 只保存 `AssetReference`；这改善本地配额和后端映射，但不是生产媒体存储方案。
- 本地 asset id 不再强制依赖安全上下文的 `crypto.randomUUID()`；该兼容策略只服务本地 mock。生产 asset id 必须由服务端生成，客户端 fallback id 不能成为对象归属或授权依据。
- 当前 Chat 会调用浏览器麦克风并生成本地音频 Blob，但没有服务端上传、转码、扫描或跨设备授权访问。
- 当前投票、撤回、到期、归档等时间判断使用客户端时间或展示层判断；生产必须改为服务端时间。
- 当前生产环境 mock guard 可以防止固定 mock 身份被默认部署为生产产品，但不能替代后端安全。

### 当时的后端前数据安全要求

1. Auth user、guest actor、room member 必须分离建模，并支持访客认领。
2. 所有写操作必须在服务端校验 room membership、role、membership state、ownership、lifecycle、quota。
3. 媒体必须进入私有 bucket，保存 object key、owner、room、mime、尺寸、hash、创建时间和删除状态。
4. 图片上传必须进行 MIME / magic number 校验、尺寸限制、EXIF 清理、压缩/转码和签名 URL 过期控制。
5. 投票必须有唯一 voter 约束、幂等键和事务化结果结算。
6. 归档、删除、举报、封禁、成员移除需要审计事件。

## 2026-07-19 历史同步：本地媒体与位置隐私

- Photos 上传和 Chat Voice 已能采集真实设备数据；因此即使仍是本地 Mock，也必须视为隐私敏感能力，而不是纯视觉入口。Chat 当前不再提供 Camera、相册或精确 Location 发送。
- 当前照片、语音、位置都进入共享 `localStorage` session；同一浏览器 profile 下能访问该站点存储的脚本均可能读取，不能描述为加密私有存储。
- 图片 canvas 重编码通常会移除多数 EXIF，但这不是可验证的 EXIF 清理保证；生产端仍需服务端重新解码与清理。
- 历史 session 可能仍含 Location 消息；当前 UI 不产生新的精确经纬度。生产恢复位置功能前，应默认降低精度或让用户确认分享内容，并明确房间成员可见范围、保留期限和删除影响。
- `MediaRecorder` 输出必须在上传端限制大小，服务端校验文件签名/MIME、病毒扫描、转码，并在删除消息/房间归档策略中处理对应对象。
- Board 评论当前已从 photo 内嵌字段拆为房间级独立实体，使用 `photoId` / `actorId` 关联目标与作者；但仍保存在本地 session JSON。生产端需要外键完整性、服务端授权、限流、分页、审计和明确的删除/级联策略，不能信任客户端关联 ID。

## 2026-07-20 历史同步：创建草稿与邀请信息边界

- 创建中的房间名称、说明、时长、成员上限、治理和入口设置会写入 `localStorage` 键 `eventspace:create-room-draft:v1`。这些内容未加密，同一浏览器 profile 下可访问站点存储的脚本可能读取；用户清除站点数据前也可能持续存在。
- 草稿恢复会把条款同意重置为 `false`，成功创建后清理；异常退出后的草稿保留属于本地便利能力，正式产品需要在隐私说明中明确用途、保留方式和清除入口。
- 邀请卡 PNG 在浏览器 Canvas 生成并由用户主动下载；当前 QR 已编码真实 invite URL。QR 或邀请码不得包含内部数据库 ID、长期 bearer token 或可绕过成员校验的静态凭据。
- 相框、Board 背景和延时时长都只是客户端元数据/输入。服务端必须重新校验枚举、房间成员资格、角色、生命周期、套餐上限和服务器时间。
- Itinerary 的手动结束属于权限和审计事件；生产端必须记录操作者与服务器时间，并防止负责人变更、重复请求或客户端编辑 DTO 绕过结束权限。

## 2026-07-23 历史同步：回忆录内容与 caption 边界

- Photos 没有改变媒体敏感等级：照片 Blob、评论和作者关联都属于房间私密内容，不得进入分析日志或公开 CDN。当前不存在 Book caption 或 Chat 内容导入链路。
- `sourceMessageId` / `sourceActorId` 只能作为来源关联提示。生产端添加 Chat 内容到回忆录时必须重新确认调用者仍可读取源消息，并决定源消息删除后采用快照保留还是关联失效策略。
- caption 当前与照片在同一本地 reducer 命令中写入。生产端必须使用事务保证两者一致，并由服务端设置作者、时间、目标 photo id；客户端提交的 actor、createdAt 和关联 ID 均不可信。
- 删除照片时应事务级联或软删除 caption/评论，并与 Storage asset 引用计数、保留期和审计事件协调；不能只删除页面上的 item。
- Host/管理员可以删除他人回忆录内容但不能改写作者文本。RLS/RPC 必须区分创建者编辑、管理员删除和普通成员读取。
- 页数、纸张样式和 placement 也是不可信输入；服务端需限制页码范围、枚举、配额和 payload 大小，并使用版本控制避免多人编辑覆盖。
