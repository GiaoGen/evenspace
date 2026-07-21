# EventSpace 本地优先静态实现计划

> 状态：2026-07-15 起执行。  
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

### Phase D — Board 与本地媒体

目标：
- 画板完全以本地真实照片和注释驱动。
- IndexedDB 保存压缩后图片 Blob、尺寸、缩略图和引用 ID；JSON 状态只保存元数据。
- 实现移动端单指平移、双指缩放、长按选中、本人内容移动/旋转/缩放/编辑、评论和表情。
- Sequence 使用稳定上传顺序流，不使用会打乱阅读顺序的瀑布算法。

验收：
- 手机相册/拍照上传可用；不支持的格式给出明确说明。
- 双指缩放在手指落在照片上时也生效。
- 200 张上限内仍保持可操作；默认渲染缩略图，详情再读大图。

后端替换点：
- 本地媒体记录未来对应私有 Storage object + signed URL；本地 Blob ID 对应未来 storage path/asset id。

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
4. 保持 Board 当前组件边界；下一轮复杂交互优先进入专用 hook/子组件，不再回填到编排器。

## 2026-07-20 执行状态补充

- `MockSession` 已升级到 v5，并为旧 v3/v4 行程补齐结束模式、计划/实际结束时间、所有者和时间戳；迁移仍是客户端兼容逻辑，不等于数据库 migration。
- `/rooms/new` 草稿恢复已形成独立存储边界 `eventspace:create-room-draft:v1`，但 UI draft 仍不能直接作为未来创建接口 DTO。
- Board 照片新增相框选择元数据，背景扩展为六套；轻量枚举和 asset reference 均可映射到后端字段，媒体正文已与房间 JSON 分离。
- Room extension 已使用 5 分钟步进和本地上限校验；生产必须由服务端根据套餐、当前结束时间和总时长再次裁决。
