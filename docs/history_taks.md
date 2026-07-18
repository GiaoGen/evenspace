# EventSpace 历史任务归档

> 本文件保存从 `task.md` 迁出的旧任务摘要。只记录阶段结果，不复制完整规格；详细规则继续以对应专项文档为准。  
> 文件名 `history_taks.md` 按项目约定保留。

## TASK-001 — 产品需求与规则基线

- 状态：已完成
- 完成内容：
  - 确定 EventSpace 是移动端优先、兼容 Chromium/Safari 的临时活动房间 Web 产品。
  - 确定房间核心为 Chat、Board、Itinerary。
  - 确定 Host-led 与 Community-led 两种不可互相切换的治理模式。
  - 明确访客、登录门槛、角色、投票、邀请、归档、举报和数据安全规则。
  - 明确首版服务英语国家地区并处理时区。
  - 端到端加密方案最终调整为托管加密、非严格 E2EE。
- 详细文档：
  - [`requirements-baseline.md`](./requirements-baseline.md)
  - [`product-specification.md`](./product-specification.md)
  - [`security-data-specification.md`](./security-data-specification.md)

## TASK-002 — 技术架构与实施计划

- 状态：已完成
- 完成内容：
  - 确定 Next.js、TypeScript、Supabase 为主要技术方向。
  - 规划身份、房间、Realtime、媒体、归档、付费和发布阶段。
  - 建立安全边界、领域权限、Mock repository 和后续 Supabase 替换原则。
  - 建立开发阶段验收门槛。
- 详细文档：
  - [`technical-architecture.md`](./technical-architecture.md)
  - [`mock-mvp-architecture.md`](./mock-mvp-architecture.md)
  - [`implementation-plan.md`](./implementation-plan.md)
  - [`pre-implementation-audit-register.md`](./pre-implementation-audit-register.md)

## TASK-003 — 视觉设计语言与页面规划

- 状态：已完成
- 完成内容：
  - 确定高级、轻盈、克制、流畅的黑白灰视觉语言。
  - 禁止渐变、纸张纹理、木纹和高成本高斯模糊。
  - 确定大圆角、克制阴影、杂志排版和快速 iOS 弹性动效。
  - 确定移动端 Rooms 默认单卡横向浏览，可切换双列纵向浏览。
  - 确定 Room 顶部返回、居中房间名、三项固定导航且不使用滑动切页。
  - 确定画板图钉、小白条、随机微倾斜和中心区域自然散布。
- 详细文档：
  - [`visual-design-brief.md`](./visual-design-brief.md)
  - [`design-system-specification.md`](./design-system-specification.md)
  - [`page-wireframes.md`](./page-wireframes.md)

## TASK-004 — 静态高保真原型

- 状态：已完成并归档
- 完成内容：
  - 第一批：Landing、Rooms、Room 核心视觉。
  - 第二批：创建、邀请、归档、画板顺序显示等流程。
  - 第三批：登录、审核、分享、成员、举报、投票、行程、设置、账户和法律页面。
  - 根据审阅移除 Landing 与正式 Rooms/Room 的同级关系。
  - 删除 Rooms 页冗余标题区，直接展示归档卡片。
  - Room 最终采用返回按钮、房间名和固定 Chat/Board/Itinerary 导航。
  - `/prototype` 路由仅保留为历史视觉参考，不再代表正式功能完成度。
- 详细文档：
  - [`prototype-coverage.md`](./prototype-coverage.md)

## TASK-007 - Codebase audit for backend integration readiness

- Status: completed on 2026-07-18.
- Summary:
  - Audited the current local-first mock implementation without changing business code.
  - Confirmed that the codebase has reasonable backend migration foundations: domain types, board layout helpers, centralized mock commands, and runtime mock safeguards.
  - Recorded backend-readiness risks around media storage, server authority, permissions, realtime synchronization, poll/vote transactions, archive lifecycle jobs, and duplicated capability policy.
  - Noted the existing lint hygiene issue in `features/create-room/components/create-room-wizard.tsx` for the unused `TimingStep` component.
  - Git commit was blocked because this workspace currently is not a valid Git repository; `.git` exists but contains no repository metadata.
