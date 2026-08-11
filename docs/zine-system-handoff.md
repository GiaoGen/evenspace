# Zine 系统完成情况与后续开发交接

## 文档目的

本文档记录 EventSpace 当前 Zine 系统已经完成的范围、实现结构、交互约束和已知边界，供新的开发模型继续开发 Recipe 模板时快速了解现有项目。

当前 Zine 是独立的、仅浏览器内存的前端创作与预览 vertical slice，不是 Room 内的 Book 功能，也不是已经接入 Supabase 的生产模块。Recipe 模板仍应先确认内容模型和步骤，再决定复用 Zine 的哪些基础能力。

## 当前完成的用户流程

Zine 页面入口为 `/zine`，创建器包含五个进度节点：

1. Name：命名 Zine。
2. Photos：添加图片、删除图片，并为每张图片编辑最多 120 个字符的 Photo Note。
3. Style：选择 5 种当前可用的页面样式。
4. Overview 或 Arrange：顶部 `AI layout` 开关关闭时进入 Arrange 手动排版；打开时进入 Overview。当前开关只改变流程分支，不调用 AI 服务或自动生成布局。
5. Reader：使用真实翻页效果阅读当前草稿。

创建器前四步使用统一外壳和进度导航。关闭 Reader 会回到进入 Reader 前的 Overview 或 Arrange，草稿内容在当前页面生命周期内保留。

## 已完成的界面设计

### Step 1：Name

- 不是普通的单输入框，而是具有纸页堆叠感的重点卡片。
- 标题输入拥有明显的视觉层级、聚焦效果和字数限制。
- 使用项目现有的无衬线字体和颜色变量。
- 名称上限为 48 个字符。

### Step 2：Photos

- 移动端竖屏优先。
- 初始状态显示独立的添加照片区域。
- 已载入照片后，不再保留左侧 `Add photos` 栏，只显示卡片容器右上角的 `Add more`。
- 照片以带容器的横向双行瀑布流展示，每张照片是一张卡片。
- 图片使用 `object-fit: contain`，始终显示完整比例，不裁切。
- 每张卡片下方都有文字输入，文字上限为 120 个字符。
- 支持删除照片、继续添加照片和拖放文件。
- 图片使用浏览器 Object URL 作为本地预览；删除照片或卸载创建器时会释放 URL。
- 已修复 React 异步文件处理后 `event.currentTarget` 为空的问题。

重要约束：Step 2 的卡片位置和瀑布流分行只负责视觉展示，绝不代表 Reader 的页面顺序。

### Step 3：Style

- 风格选项使用横向滚动的直角书页卡片，不使用圆角书页。
- 每种风格直接展示排版 Demo，而不是只展示风格名称。
- 当前包含五种风格：
  - `editorial`：单张主图、强标题、开放留白。
  - `contact`：四图 Contact Sheet。
  - `margin`：小照片和大面积留白。
  - `split`：每页两张照片。
  - `night`：深色、电影感页面。
- 风格定义集中在 `features/zine/model/zine-styles.ts`，新增或修改选项不需要改动步骤框架。

### Step 4A：Overview（AI layout 分支）

- 展示名称、照片数量、带 Note 的照片数量、样式和照片摘要。
- 每个信息区都可以返回对应步骤修改。
- 当前只提供创建结果总览，不提供 AI 生成、重新生成、布局解释或生成任务状态。

### Step 4B：Arrange（手动排版分支）

- 首次进入时根据所选样式和照片集合生成初始 `manualSpreads`；照片从集合两端向中间交替分配，Step 2 的视觉卡片行不决定 Reader 顺序。
- 中央书页使用真实 `page-flip@2.0.7` Reader 适配层预览，支持打开页面、双击/双触进入单页焦点模式、拖动或滑动浏览。
- 空白页提供 `Add page`，可以在 spread 的左侧或右侧新增页面；最后始终保留一个可继续添加的 trailing spread。
- 焦点模式下可以打开 Photo library，将照片放入当前页面或替换当前选中的照片；页面容量由样式决定：Editorial/Margin/Night 为 1 张，Split 为 2 张，Contact sheet 为 4 张。
- 焦点模式下可以打开 Recipe library，为当前 spread 的左右页面一起切换样式；样式改变时会按新样式容量截断该页照片。这里的 Recipe library 是当前 5 个样式的选择器，不是未来的 Recipe registry。
- 选中照片后可以直接拖动照片调整 `positionX` / `positionY`，Reader 使用 `object-fit: cover` 和该焦点位置渲染；这只改变裁切焦点，不改变照片顺序。
- 当前没有页面删除、页面拖拽重排、自由图层、文字页或空白停顿页编辑能力。

## Reader 已完成的能力

Reader 基于 Nodlik/StPageFlip 的 npm 包 `page-flip@2.0.7`，不是自制的 CSS 假翻页。

### 阅读状态

- 初始状态只显示位于屏幕正中央的单张封面。
- 点击封面后打开为居中的双页。
- 最后一张封底以单页居中展示。
- 支持鼠标拖动、移动端滑动、上一页按钮和下一页按钮。
- Reader 背景直接使用项目的纯色 `var(--canvas)`，不增加舞台渐变或独立背景。
- 封面、内容页和 Reader 控件均使用项目现有的无衬线字体。

### 移动端翻页

- StPageFlip 的 `swipeDistance` 当前为 20px。
- 翻页动画时间为 560ms。
- `touch-action: pan-y` 保留页面纵向手势，同时允许横向翻页。
- 内页禁用整页单击翻页，避免和双击放大冲突；滑动和拖动仍可翻页。

### 单页镜头模式

- 双击桌面端页面或双触移动端页面，会直接把镜头推近到当前 StPageFlip 真实页面。
- 单页状态不是弹窗，也不会渲染第二份书页 DOM。
- 目标页被缩放并移动到 Reader 中央，另一页同步淡出。
- 退出时镜头拉回，另一页与拉回动画同步恢复，不再延迟出现。
- 移动端在第二次触点按下时立即触发，不等待第二次触点抬起。
- 触摸双击成功后会暂时屏蔽浏览器补发的原生 `dblclick`，避免刚放大就立即退出。
- 镜头状态明确分为：`spread → zooming-in → focused → zooming-out → spread`。过渡期间不会被同一个手势反向触发。
- 可通过双击、双触或键盘 `Esc` 退出单页状态。
- 已按要求移除 `Return to spread` 浮动按钮。

### Reader 页面生成

Reader 页面由纯数据函数 `createZineReaderPages` 生成，不直接依赖 UI 卡片 DOM。

- 封面和封底为 `hard` 页面。
- 内容页为 `soft` 页面。
- 必要时自动加入 Colophon 页面，保证封面之后的内容可以组成完整双页，封底保持单页。
- 不同风格通过 `photosPerPage` 控制每页照片数量。
- Reader 使用独立的 `pacePhotosForReader` 排序逻辑，从照片集合两端向中间交替取图。
- 因此 Reader 顺序和 Step 2 瀑布流顺序是两套完全独立的概念。
- 照片说明显示在图片的外侧角落；没有填写说明时使用文件名作为回退文本。

## 状态与数据模型

主要草稿类型为 `ZineDraft`：

```ts
type ZineDraft = {
  readonly name: string;
  readonly photos: readonly ZinePhoto[];
  readonly styleId: ZineStyleId | null;
  readonly manualSpreads: readonly ZineManualSpread[] | null;
};
```

照片包含 `File`、Object URL、文件名、原始尺寸、说明文字和焦点坐标。`manualSpreads` 包含左右页面、页面样式和照片 ID。创建流程使用 `useReducer` 与 `zineCreatorReducer` 管理，支持以下操作：

- `SET_NAME`
- `ADD_PHOTOS`
- `REMOVE_PHOTO`
- `SET_CAPTION`
- `SET_PHOTO_POSITION`
- `SET_STYLE`
- `ADD_MANUAL_PAGE`
- `PLACE_MANUAL_PHOTO`
- `SET_MANUAL_SPREAD_STYLE`
- `GO_TO`

目前草稿只存在于当前客户端组件内存中，尚未保存到数据库、Local Storage 或服务端。刷新 `/zine` 页面会清空草稿。

## 关键实现结构

```text
app/zine/page.tsx
features/zine/
├─ components/
│  ├─ zine-creator.tsx              创建流程状态与步骤调度
│  ├─ zine-shell.tsx                顶部进度、表单外壳和底部操作
│  ├─ zine-creator.module.css       Step 1–4 统一设计
│  ├─ style-page-preview.tsx        风格书页 Demo
│  ├─ steps/
│  │  ├─ name-step.tsx
│  │  ├─ photos-step.tsx
│  │  ├─ style-step.tsx
│  │  ├─ overview-step.tsx
│  │  └─ manual-layout-step.tsx      手动 spread/page 编辑和焦点相机
│  └─ reader/
│     ├─ zine-reader.tsx            StPageFlip 生命周期、翻页与镜头手势
│     ├─ zine-reader-page.tsx       封面、内容页、Colophon、封底排版
│     └─ zine-reader.module.css     Reader 与页面样式
└─ model/
   ├─ zine-draft.ts                 草稿、步骤、Reducer、瀑布流分行
   ├─ zine-manual-layout.ts         手动 spread/page 模型和初始分配
   ├─ zine-draft.test.ts
   ├─ zine-styles.ts                风格配置
   ├─ zine-pages.ts                 Reader 排序与分页
   └─ zine-pages.test.ts
types/page-flip.d.ts                第三方包的本地类型声明
```

## StPageFlip 集成边界

StPageFlip 会直接修改传入的 DOM。当前实现专门隔离了 React 与第三方库的 DOM 所有权：

1. React 在屏幕外渲染源书页。
2. Reader 克隆这些源页面。
3. 克隆页面被放入单独创建的命令式 DOM 根节点。
4. StPageFlip 只接管这个命令式根节点。
5. Reader 卸载时调用 `destroy()`，清理事件和 DOM。

后续不得把 StPageFlip 直接指向 React 正在维护的页面节点，否则可能造成卸载错误、重复节点或 hydration/DOM 不一致。

## 设计与实现约束

后续修改 Zine 或开发 Recipe 时，应保持以下项目规则：

- 移动端竖屏优先，再扩展桌面布局。
- 卡片设计、边框、间距、背景和按钮应复用项目现有设计语言。
- 禁止引入衬线体大标题；主标题统一使用 Geist Sans 或现有无衬线字体变量。
- 书页本体保持直角矩形。
- Step 2 的照片卡保持完整比例；Reader 和 Arrange 的书页照片允许按页面容器裁切，并通过 `positionX` / `positionY` 保留焦点。
- 业务数据顺序不能通过瀑布流位置、CSS Grid 位置或 DOM 顺序隐式表达。
- 数据模型、分页规则、展示组件和第三方 Reader 适配层保持分离。
- 不修改无关功能和现有用户改动。

## 当前未实现的范围

以下能力目前不属于已完成的 Zine 前端：

- 草稿持久化。
- 上传照片到远程存储。
- 页面删除、页面拖拽重排、自由图层和文字页编辑。
- AI 自动排版、Recipe registry、Recipe 选择与生成任务。
- 导出 PDF、图片或印刷文件。
- 发布、分享和权限控制。
- 从已发布数据重新打开 Reader。
- Recipe 模板及其内容模型。

如果后续需求涉及以上能力，应先扩展领域模型和数据边界，不要把持久化、排序或 Recipe 字段直接塞进现有 UI 组件。

## Recipe 模板开发建议

Recipe 的详细需求尚未给出，因此不应预先假设它与 Zine 使用同一字段结构。建议新的开发模型按以下顺序推进：

1. 先确认 Recipe 的核心内容：名称、封面、材料、步骤、照片、备注、份量等字段是否需要。
2. 确认 Recipe 是独立创建流程、Zine 的一种 Style，还是可以被 Zine Reader 消费的内容模板。
3. 如果同样是多步骤创建器，可复用 Zine 的移动端优先布局原则和 Shell 交互，但应建立独立的 Recipe Draft 与 Reducer。
4. 如果 Recipe 最终进入翻页 Reader，应把 Recipe 数据转换为通用页面模型，不要让 Reader 直接读取 Recipe 表单 DOM。
5. 先开发数据模型和前端预览，再决定持久化与发布方案。

不建议直接复制整个 `zine-creator.tsx` 后修改字段。更合理的方向是在 Recipe 需求稳定后，识别真正通用的创建器外壳、步骤导航、媒体卡片和页面渲染接口，再进行小范围抽取。

## 验证状态

2026-08-11 对 `42d0519`、`45b460d` 的同步验证：

- `npm run check`
- Zine model 测试已覆盖 reducer、手动 spread、照片放置/替换和 Reader 页面生成；完整测试数量以命令输出为准。
- `npm run build`
- `git diff --check`

按项目协作约定，最近的 Reader 手势修改没有进行浏览器自动验证，由用户自行进行真实移动端交互检验。因此新的开发模型在修改双触、滑动、StPageFlip 生命周期或镜头动画时，应优先保留现有状态机和事件抑制逻辑，并等待用户的设备验证反馈。
