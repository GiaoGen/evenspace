# EventSpace 交互式 Mock 覆盖与边界

> 状态：2026-07-26。正式产品路由已经从静态高保真原型进入本地优先可操作 Mock。本文用于防止把“界面存在”“浏览器本地可操作”和“生产后端已安全实现”混为一谈。

## 1. Mock 会话模型

- 所有正式产品路由共享同一套类型化 `MockSession` 和纯 reducer 命令。
- fixture 只用于首次初始化；后续创建、消息、投票、回忆录、行程、成员与归档操作写入 `localStorage` 键 `eventspace:local-session:v1`，媒体 Blob 写入 IndexedDB，并兼容旧会话迁移。
- 刷新、关闭标签页和重新打开浏览器通常会恢复状态；清除站点数据或执行 `Reset Mock session` 会恢复 fixture。
- 从存储恢复前进行版本和基本结构检查；无效或旧版本数据被丢弃。
- Mock 数据不会写入服务器、数据库、Storage、支付或真实身份系统。
- 本地 `npm run build` 与 `npm start` 可直接验证 Mock。真实生产部署通过 Vercel/Netlify 的生产标记或 `EVENTSPACE_DEPLOYMENT=production` 识别，并默认拒绝固定 Mock 身份；只有受控预览显式设置 `EVENTSPACE_MODE=mock` 才放行。

## 2. 正式可操作路由

| 路由 | 当前可操作能力 |
| --- | --- |
| `/` | Landing、创建入口、样例邀请、账户与法律入口 |
| `/rooms` | All/Active/Achieved/Favorite、原位搜索、Magazine/Grid、真实横滑进度、编辑收藏/删除确认、真实 Board snapshot、打开新创建房间 |
| `/rooms/new` | 登录门槛、三步创建状态机、草稿恢复、校验、创建到列表/房间闭环和邀请卡 PNG 导出 |
| `/rooms/[roomId]` | Chat / Photos / Itinerary、Share / Members / More、照片上传/详情评论、归档与访问终止状态 |
| `/join` | 邀请码解析、失效反馈、跳转到当前有效邀请 |
| `/join/[roomId]` | 私密邀请、唯一昵称、头像选择、申请备注、免审核直入、Host 审核或 Community 多数表决闭环 |
| `/account` | 卡片内昵称编辑、头像缩写、访客/登录 Mock、主题预览、本地房间摘要、会话重置、法律入口 |
| `/legal/[document]` | Terms、Privacy、Community Rules、Cookie Notice 的结构草案与法律审阅警告 |

## 3. 房间交互覆盖

### Chat

- 文字发送、房内搜索、回复、表情回应、两分钟撤回；管理员删除与置顶。
- 按住录制、左滑取消、松开发送且最多 60 秒的真实浏览器本地录音；调用麦克风并把音频 Blob 存入 IndexedDB，但不上传服务器。
- 工具托盘当前只提供房内搜索；不提供 Camera、Photos 或当前位置发送。既有图片消息仍可查看、下载或加入 Photos。
- 每条普通消息以稳定随机色卡片呈现；支持回复、反应、两分钟撤回、管理员删除与置顶、长按操作和未读跳转。
- reducer 中保留投票与 Community-led 兼容命令，但 `RoomExperience` 当前传入 `canVote=false` 且不渲染聊天投票入口，不能宣称投票为当前 Room 可操作能力。

### Photos

- 以照片网格浏览现有 `BoardPhoto`；可从本机多选图片，浏览器压缩后写入 IndexedDB，并受 `maxPhotos` 配额限制。
- 短点击照片打开全屏详情与纵向评论；本人或管理员可删除，评论仍通过 `ADD_BOARD_COMMENT` 写入本地 session。
- 没有 Book、双页 spread、caption 提交层、相机入口、Chat 内容导入、纸张样式或复杂自由排版。
- `MockSession` v7 的 `boardItems` / `boardComments` 是当前本地兼容存储，而不是未来生产 API 的推荐命名。

### Itinerary

- Host/Admin 创建，Community-led 创建投票提案。
- 起止时间、地点文字、说明、负责人、重叠提醒与按日期排序。
- 灰色未开始位于顶部、绿色进行中位于中间、红色已结束位于底部；进入页面自动定位当前或下一行程。
- 创建/编辑支持 5 分钟步进 Duration 滑块和手动结束模式；手动行程由负责人或管理员从当前卡片结束。
- 负责人或管理者可编辑和删除；不提供参加/不参加/签到或容量报名。
- 仅允许固定的 Google/Apple Maps HTTPS 外链；不渲染地图、不调用 Places API。

### 治理与生命周期

- 邀请链接/邀请码复制反馈与轮换；入房申请批准/拒绝。
- 成员角色、管理员、禁言、移除、拉黑均要求明确确认。
- Host 延长时间、二次确认结束、`freezing → archiving → archived` 状态演示。
- 归档只读；每位用户只移除自己的归档入口，不改变其他人的共享归档资格。

## 4. 明确暂缓、禁止伪造的能力

以下能力不能因为 Mock 中有入口就被视为完成：

- Supabase Auth、匿名身份认领、RLS、RPC、Realtime 权威事件和服务器时间冻结；
- 真实照片/语音上传、MIME 与文件签名验证、EXIF 清理、转码、私有 bucket 和签名 URL；
- Stripe Checkout、webhook、退款、永久归档权益与真实价格；
- Browser Push、PWA 安装、Resend 邮件、Google Places、Cron 归档和删除任务；
- 真实速率限制、设备封禁、审计日志、备份清理与法律文本。

这些项目继续以技术架构、安全规格和开发前审计登记册为生产实现门槛。Mock 文案不得宣称端到端加密、真实付款、真实邀请发送、真实媒体处理或生产级权限已经完成。

## 5. 后续真实后端接入原则

1. UI 继续调用领域命令，不直接写 Supabase 表。
2. 为服务端建立独立 DTO/schema，不复用可信度不足的客户端 draft 或 session 数据。
3. Mock reducer 负责演示和交互回归；生产授权以数据库事务、RLS、RPC 和服务器时间为准。
4. 每替换一个 Mock 命令，都先补无权限、过期、重复、乱序和失败路径测试，再移除对应 Mock 边界文案。
## 2026-07-18 历史同步：旧本地优先 Mock 覆盖

> 本节保留当时的 Board 覆盖记录；当前正式入口以本文开头和 2026-07-23 同步为准。

本文件仍用于区分“界面存在”“浏览器本地 Mock 可操作”和“生产后端已安全实现”。当前代码已经从早期 `sessionStorage` 单标签 mock 推进到 `localStorage` 本地优先 session：主键为 `eventspace:local-session:v1`，同时兼容读取旧键 `eventspace:mock-session:v3`。这提升了刷新和重新打开浏览器后的恢复能力，但仍不是多设备、多人实时或服务端持久化。

### 当前已经覆盖的正式路由

- `/`：正式 Landing、创建入口、邀请/加入入口、账号与法律入口。
- `/rooms`：All / Active / Achieved / Favorite 筛选、搜索、单列横滑/双列网格、编辑模式、收藏、删除个人入口、真实画板快照预览、到期房间展示层归档。
- `/rooms/new`：本地账号门槛、三步创建、小时/分钟纵向滚轮、独立本地草稿恢复、创建后写入本地 session、邀请卡片 PNG 导出、mock QR / 邀请码、Open this room。
- `/rooms/[roomId]`：Chat / Board / Itinerary 主体验，Board/Sequence 由顶部 Board tab 的下拉切换承载。
- `/join` 与 `/join/[roomId]`：邀请码解析、私密邀请、昵称唯一性、头像/备注、审核等待、Host 审核或 Community 多数准入。
- `/account`：本地身份、卡片内昵称编辑、头像缩写、三态主题、本地房间/画板摘要、Mock 登录状态、二次确认后重置本地 session。
- `/legal/[document]`：Terms、Privacy、Community Rules、Cookie Notice 草稿结构。

### Chat 当前覆盖

- 底部输入栏、右侧自己的消息、发送后滚动到最新消息、搜索、回复、反应、撤回、置顶、管理员删除。
- 加号工具托盘承载 Search、Poll、Votes；语音按钮在输入框内部，支持 `hold to record`、左滑取消和最长 60 秒的真实浏览器本地录音。
- Poll 创建器支持 yes/no、选项、行程三类；支持 open minutes、匿名/公开、负责人、时间和地点。
- 投票卡支持投票后百分比进度条和票数；当前访问中投票后继续显示结果，再次进入房间时隐藏已经投过的内联卡。
- Votes 全屏覆盖层展示全部投票历史，最新投票在最顶部。

### Board 当前覆盖

- 无限画布式交互：单指平移、双指缩放、进入时自动 fit 到当前全部画板内容。
- 双指落在照片/文本/涂鸦上也优先触发画布缩放；单指滑动画布碰到内容不阻断。
- 相机、相册、文本、画线、画布背景拆成独立工具入口；图片读取后先进入 Pin / Gallery / Instant / Tape / Dark 横滑相框选择。
- 相机/相册读取真实图片文件，使用 canvas 压缩成 Blob 并写入 IndexedDB，保留 aspect ratio、文件名和画板宽度元数据。
- 图片按原图比例显示，Rooms 卡片也按真实 Board item 的位置和尺寸预览。
- 短点击照片打开全屏大图，照片下方显示作者、纵向评论和底部评论输入框；评论只保存在当前本地 session。
- 文本标注支持预览、添加、按内容自适应初始尺寸、选中后拖动角点调整大小。
- 全屏涂鸦板支持画笔、颜色、橡皮、清空、双指缩放/平移、brush 尺寸预览、添加为画板 drawing item；涂鸦 item 不支持旋转。
- 本人内容或管理员权限下可以删除画板 item；点击画布空白处会结束当前编辑状态。

### Itinerary 与治理当前覆盖

- Host/Admin 可创建行程；Community-led 可通过投票提案创建行程。
- 行程支持负责人、起止时间、地点、说明、时间自动状态、重叠提示、编辑和删除。
- 成员审核、禁言、移除、拉黑、邀请轮换、个人归档移除、房间结束与归档生命周期均有本地 mock 状态。

### 仍然不能宣称完成的能力

- 没有 Supabase Auth、真实访客认领、RLS、RPC、Realtime Authorization。
- 没有多设备同步、多人并发冲突处理、服务端时间、事务或数据库唯一约束。
- 媒体已通过 asset reference 与本地 JSON 分离，Blob 存入 IndexedDB；仍没有私有 Storage、服务端 asset 表、EXIF 清理、签名 URL 或服务端转码。
- Chat 已有浏览器麦克风采集和本地回放，但没有音频上传、服务端转码或跨设备播放保证。
- `Save card` 可在浏览器本地导出 PNG；其中 QR 图案仍是视觉 mock，不保证可扫描或对应真实邀请链接。
- 到期归档在 Rooms 展示层可见，但生产仍需要服务端定时任务或查询层统一裁决。

## 2026-07-19 历史同步：Chat 媒体与旧 Board 重构

> 旧 Board 能力保留为历史实现记录；当前正式 Room 覆盖以本文开头和 2026-07-26 同步为准。

### Chat 新增本地可操作能力

- 消息列表支持连续消息分组、日期分隔、置顶跳转、未读计数与回到最新消息。
- 长按消息打开操作卡，可回复、复制、回应、置顶和按权限删除；图片消息还可保存或添加到 Board。
- Camera / Photos 会读取真实文件并在浏览器 canvas 中压缩，发送前显示预览和说明输入；点击消息图片进入全屏查看。
- Location 调用 `navigator.geolocation` 并保存坐标，消息使用 OpenStreetMap 外链打开。
- Voice 调用 `getUserMedia` 与 `MediaRecorder` 生成真实本地录音，最长 60 秒，支持左滑取消和消息内播放。
- image / location / voice 通过 `POST_MESSAGE` 写入 `MockSession`，刷新和重新进入后随本地 session 恢复。

### Board 新增本地可操作能力

- Board 已拆为编排器、无限画布、手势 hook、Sequence、控制 Dock、Note Studio、Doodle Studio、照片评论和图片处理模块。
- 三键 Dock 负责 fit、背景和创建；创建卡提供 Camera / Photos / Note / Doodle，背景卡提供 Stone / Linen / Night / Herbarium / Clover / Bluebell。
- Note 支持 paper / ink / sage；Doodle 为覆盖整个视口的工作台，支持撤销/重做、橡皮、笔刷档位和双指平移缩放。
- 照片评论通过 `ADD_BOARD_COMMENT` 写入 photo `comments`，不再只存在组件 state。
- Board 背景和便签样式会同步到 `/rooms` 的真实 Board snapshot。

### 当前边界

- Chat/Board 已有本地 Blob asset 层和引用清理；仍没有服务端上传、EXIF 保证、私有访问控制和生产删除流水线。
- Geolocation 是精确敏感数据，当前没有后端同意记录、坐标降精度、保留策略或成员级下载审计。
- `MediaRecorder` 编码取决于浏览器，尚未进行转码、恶意文件检查和跨浏览器播放保证。
- Board 尚未以 100/200 张真实图片进行性能和存储压力验收。

## 2026-07-23 历史同步：Photos/Book 回忆录

- 正式 Room 已隐藏旧 Board/Sequence 入口，但旧组件和底层 `boardItems` 数据仍存在，供现有资产、评论和 Rooms snapshot 过渡复用。
- `ADD_MEMOIR_PHOTO` 原子写入照片与可选 caption；`ADD_MEMOIR_SPREAD` 固定增加双页；`SET_MEMOIR_PAGE_STYLE` 只允许修改存在页且校验稳定枚举。
- Book 的 StPageFlip 实例只在客户端初始化，等待字体和稳定尺寸后再揭示；ResizeObserver/visualViewport 更新尺寸，并在卸载时清理实例。
- 已验证 390 x 844 的封面、单双页视角和翻页侧规则；尚未完成 iOS Safari/Android Chromium 真机长时间翻页、横竖屏切换与大书页压力测试。
- Rooms 仍展示旧 Board snapshot/background；这不是最终回忆录卡片设计。

## 2026-07-26 当前实现优先级

- 本文之前标记为“当前同步”的 Photos/Book、Chat Camera/Location 与五步创建描述已被代码删除或收敛；以本文第 2、3 节为准。
- Chat 的图片、位置和投票联合类型可因旧 session 留存而被渲染，但新 UI 不创建这些内容。兼容读取不等于继续支持发送。
- Board/回忆录兼容字段仍会出现在 session 和 Rooms 摘要中；它们不是正式编辑画布，也没有跨端协作语义。
