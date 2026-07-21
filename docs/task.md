# EventSpace 当前任务记录

> 最后更新：2026-07-21
> 用途：记录最近任务做了什么、当前真实进度、验证结果、遗留事项和下一步。  
> 规则：本文件保持为当前阶段活文档；更早阶段摘要迁移到 [`history_taks.md`](./history_taks.md)。  
> 本次同步范围：Git 基线 `328e760` 之后的提交 `c83225e`、`665a4bd`、`9af63f0`，以及当前文档同步改动。

## 项目当前状态

- 当前阶段：移动端优先的本地优先 Mock / 静态真实数据版本，尚未接入后端。
- 正式产品路由已经从静态原型进入可操作状态，主要页面共享一套 `MockSession` 本地状态。
- 结构化会话使用 `localStorage` 键 `eventspace:local-session:v1`；图片、语音和涂鸦 Blob 使用 IndexedDB `eventspace-local-assets`，并兼容迁移旧 data URL 会话。
- 当前已经支持创建房间、房间列表、聊天、投票、画板、行程、成员治理、归档、账号本地身份与法律草稿页面。
- 图片、语音和涂鸦已抽象为 `AssetReference`，会话 JSON 不再保存媒体正文；本地 Blob repository 可直接映射未来私有 Storage，但仍不具备跨设备与生产授权能力。
- 生产构建不再依赖远程 Google Fonts / `next/font` 拉取；字体资源已通过 `public/fonts` 的本地 `@font-face` 加载，保留 Bodoni 衬线标题风格。
- `/prototype` 系列路由只作为视觉历史参考，不再代表当前功能完成度。

## 最近完成任务

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

### 已经具备的本地能力

- 本地创建房间、进入房间、Rooms 列表展示、筛选、收藏、删除个人入口。
- 本地聊天、回复、反应、撤回、置顶、搜索，以及真实浏览器本地照片、位置和录音消息。
- Chat/Board 媒体 Blob 已存入 IndexedDB，会话只保存 asset reference；它仍是单设备本地方案，不是生产媒体存储。
- 本地投票创建、投票、结果进度、投票历史、行程型投票通过后添加行程。
- 本地画板照片上传、压缩、拖动、缩放、删除、评论弹幕、文本标注、涂鸦。
- Board 与 Rooms 卡片共享画板 item 的真实位置/大小预览逻辑。
- 本地行程创建、编辑、删除、负责人、起止时间、地点、说明、自动状态和重叠提示。
- 成员审核、禁言、移除、拉黑、社区投票准入等 mock 治理状态。
- 房间 active / freezing / archiving / archived 生命周期 mock。

### 尚未具备的真实后端能力

- Supabase Auth、匿名身份认领、真实 session、RLS、RPC、Realtime。
- Postgres schema、迁移、唯一约束、事务、幂等键、服务端时间。
- 私有 Storage、图片 Blob 上传、EXIF 清理、转码、缩略图、签名 URL。
- 浏览器本地录音已经可用；真实音频上传、服务端转码、恶意文件检查和跨设备授权访问尚未实现。
- Stripe Checkout、webhook、退款、永久归档权益。
- PWA 安装、离线缓存、推送通知、邮件、Google Places / Maps API。
- 真实限流、设备封禁、审计日志、备份、数据清理任务和正式法律文本。

## 后端接入前必须解决

- 把本地 asset repository 映射为私有 Storage 与服务端 asset 表，并设计上传授权、衍生图、引用提交和废弃对象清理协议。
- 把客户端 reducer 中的权限、投票、归档、成员资格校验映射为服务端事务和数据库约束。
- 为每类命令定义稳定 DTO：创建房间、发消息、创建投票、投票、上传媒体、移动画板 item、改行程、成员治理、归档。
- 明确 server time 规则，所有到期、投票关闭、撤回窗口、归档状态推进都不能信任客户端时间。
- 为移动端 Safari / Chromium 建立真机验收清单，尤其是文件上传、相机、键盘、viewport、Pointer Events、双指手势。
- 继续拆分 `chat-panel.tsx`；Board 已完成组件化，但 Chat 仍混合媒体权限、录音、Poll 和界面状态。

### 已知实现与规范偏差

- 当前 Board CSS 的 Dock 使用了 `backdrop-filter`，Linen 背景使用轻微 `linear-gradient` 网格；这与设计系统 v1 的“禁止毛玻璃/渐变”原则不完全一致。当前效果已通过视觉回归，但后续需要明确将其收编为受限例外，或改为纯色/静态纹理实现。

## 下一步建议

1. 做移动端真机回归：iOS Safari / Android Chromium 的照片、录音、定位、键盘、Board 双指手势和全屏 Portal。
2. 为 Chat / Board 的 asset reference 定义后端上传 DTO、私有读取授权、缩略图与删除/回收状态机。
3. 拆分 `chat-panel.tsx` 的媒体控制、消息列表、附件托盘和 Poll 编排。
4. 为 `POST_MESSAGE`、`ADD_BOARD_COMMENT`、`SET_BOARD_BACKGROUND` 等命令建立服务端 DTO 和运行时 schema；当前 reducer 对新消息 content 的写入校验仍主要依赖 TypeScript/UI。
5. 补充 reducer、媒体结构恢复、Board 手势/fit、Poll 和房间到期的最小测试。
