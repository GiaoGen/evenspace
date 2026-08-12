# Phase F1：Recipe Catalog Research Dossier

状态：F1 研究门禁完成；仅提炼可迁移原则，不包含 Recipe 设计、坐标草图或代码。  
研究日期：2026-08-12  
访问日期：2026-08-12（所有条目均为可直接访问的来源链接）

## 1. 研究边界与方法

本档案研究的是摄影书、艺术书、zine、编辑设计与排版工具资料中的结构原则，不复制任何来源的页面、照片、字体、纹理、品牌或命名。来源优先使用 Adobe 官方资料、Aperture、Magnum Photos、LensCulture、Eye Magazine、AIGA Eye on Design、DesignObserver 与 Design Museum 等专业出版或编辑机构。

研究结果只形成：

- 网格、基线、尺度、序列、留白、层级、出血、色彩与书脊安全原则；
- 这些原则与五个家族的证据关联；
- 对当前 `3:4` 单页、`3:2` 物理跨页和现有 Contract 的适配判断。

研究结果**不**形成：

- Recipe 名称、slot 坐标、具体 Definition；
- 某一本书的逐页临摹方案；
- 60 个候选 Recipe 的目录或实现计划。

## 2. 规模核验

| 门槛 | 结果 |
| --- | ---: |
| 可追溯专业资料条目 | 31 |
| 不同域名/出版机构 | 8 |
| Adobe 条目 | 8 |
| Aperture 条目 | 6 |
| 每个家族的关联条目 | 至少 7 条 |
| 每个家族覆盖的不同域名 | 至少 3 个 |

域名覆盖：`helpx.adobe.com`、`aperture.org`、`magnumphotos.com`、`lensculture.com`、`eyemagazine.com`、`eyeondesign.aiga.org`、`designobserver.com`、`designmuseum.org`。

## 3. Research Ledger

说明：`影响家族`只是研究证据的归档标签，不是 Recipe 设计或候选列表。每条来源最多关联两个家族，避免目录被单一案例牵引。

| ID / 标题 / 发布者与作者 | 类别；观察到的排版原则 | 可迁移结构 | 不应复制的独特元素 | 影响家族 | `3:4` 单页 / `3:2` spread / Contract 适配 |
| --- | --- | --- | --- | --- | --- |
| **A01 — [Layout grids in InDesign](https://helpx.adobe.com/uk/indesign/using/layout-grids.html)**；Adobe | 网格由页边距、列、栏沟和起始方向组成；网格既服务单页，也可服务 spread。 | 用 margin/column/gutter 建立可重复的对齐骨架，并把视觉例外当作可说明的偏离。 | Adobe 的界面、示例参数与品牌视觉。 | editorial；grid-contact | 单页先验证列与文字边界；spread 需要明确中心线和双页边距；Contract 需要 canvas、rect、pageSide，不能把网格写成 Renderer 特例。访问：2026-08-12。 |
| **A02 — [Use a document grid](https://helpx.adobe.com/indesign/desktop/layout-and-grid-tools/grids/use-a-document-grid.html)**；Adobe | 主网格与 subdivisions 提供稳定的水平/垂直对齐点，帮助对象持续保持间距。 | 把“密度”和“重复”拆成主间距与细分间距，适合比较阅读与节奏控制。 | Adobe 的具体网格颜色、数值和工作区截图。 | grid-contact；dynamic | `3:4` 可形成模块化单页；`3:2` 要避免中心跨越破坏重复单位；Contract 需能表达 slot 拓扑和安全区。访问：2026-08-12。 |
| **A03 — [Use grids in Adobe InDesign](https://helpx.adobe.com/uk/indesign/using/grids.html)**；Adobe | baseline grid 服务文字列线，document grid 服务对象对齐；两者作用不同。 | 将文字节奏与图像对象节奏分层，避免用一个“万能网格”同时承担两种任务。 | Adobe 的网格外观、默认值和 UI 操作。 | editorial；quiet | 单页中 Note 与标题可共享基线逻辑但不必共享图像列；spread 要验证左右页文字线是否连续；Contract 当前只能部分表达，字体/基线字段仍需未来 Gap 评估。访问：2026-08-12。 |
| **A04 — [Set up a magazine layout](https://www.adobe.com/nz/learn/indesign/web/design-magazine-layout)**；Adobe | 杂志工作流把页面/跨页、bleed、页边距、列和行 guides 作为一组系统处理。 | 先确立页面边界与印刷安全，再处理图文层级；页面不是孤立卡片。 | Adobe 教程的示例版面、照片与参数。 | editorial；dynamic | 单页可用列与行保持阅读进入点；spread 要把内外边距及中心安全区分开；Contract 能表达 page/spread 和 allowGutterCrossing，但比例语义仍受 GAP-F0-01 影响。访问：2026-08-12。 |
| **A05 — [Frame grid properties in InDesign](https://helpx.adobe.com/indesign/using/frame-grid-properties.html)**；Adobe | frame grid 把字号、字符间距、行距和行对齐作为可复用的文字框系统。 | 文字的尺寸关系应由可复用规则控制，而不是每个页面手调。 | Adobe 的 CJK frame-grid 参数和界面。 | grid-contact；editorial | 单页适合 Note/索引等稳定行高；spread 需检查两侧文字框的基线延续；现有 `maxLines` 可表达数量上限，但字体/行距元数据尚不完整。访问：2026-08-12。 |
| **A06 — [Lay out frames and pages](https://helpx.adobe.com/in/indesign/using/laying-out-frames-pages.html)**；Adobe | 以 margins、columns、guides 为依据时，布局调整更可预测；脱离系统的对象会带来不可预测变化。 | 任何可变内容都应先落到稳定骨架，再允许局部变化；结构变化必须可定位。 | Adobe 的具体布局调整算法和界面。 | grid-contact；dynamic | 单页要让比例变化只影响允许的局部；spread 不能因一侧内容变化而隐式改动另一页；Contract 需要明确 scope 与 placement identity。访问：2026-08-12。 |
| **A07 — [Align or justify text](https://helpx.adobe.com/in/indesign/using/aligning-text.html)**；Adobe | baseline grid 可让不同文字框的基线对齐；“向书脊/远离书脊”是相对于跨页方向的语义。 | 文字对齐方向是阅读结构的一部分，不只是左右 CSS 属性。 | Adobe 的具体字体、字号和排版示例。 | quiet；editorial | `3:4` 中可使用 page-side-aware 对齐；`3:2` 需分别验证靠脊/离脊；Contract 目前有 `pageSide` 与 maxLines，但没有完整 typography role 字段。访问：2026-08-12。 |
| **A08 — [Set a print bleed](https://www.adobe.com/learn/indesign/web/set-print-bleed?locale=en)**；Adobe | 出血是为裁切误差准备的延伸区域，不等于把重要内容放到不可控边缘。 | 将 full-bleed、局部 bleed 和安全边界作为不同节奏工具，并分别验证主体与文字。 | Adobe 教程中的印刷数值、裁切标记与示例图。 | dynamic；chromatic | 单页必须确认边缘主体仍可读；spread 必须额外检查中心裁切/书脊；Contract 有 `allowBleed`，但物理输出安全仍需 Gap/视觉 Gate。访问：2026-08-12。 |
| **P01 — [How Not to Design a Photobook](https://aperture.org/editorial/design-photobook/)**；Aperture；Stuart Smith / Chris Boot | 摄影书设计依赖 editing、sequencing、pairing；紧编辑后仍要保留更宽的备选编辑。 | 单张图的质量不替代序列关系；照片数量与顺序应服务观看节奏。 | 访谈中的人物、项目、书名、示例照片和作者观点的措辞。 | editorial；dynamic | 单页要能独立闭合；spread 应验证左右图是否构成真正不可拆分的语义关系；Contract 可表达 photoId/placement 与 scope，但不能把编辑顺序硬编码进 Renderer。访问：2026-08-12。 |
| **P02 — [Design Books to Know](https://aperture.org/editorial/design-books-know/)**；Aperture；Aperture Editorial | 复杂图像集合可通过内边小图、文字和主图建立多层阅读；形式与内容互相强化。 | 同一页面可以有主阅读层与索引/辅助层，但必须有清楚的层级。 | 文中具体书目、书籍页面、出版社与设计师的识别方式。 | quiet；grid-contact | `3:4` 先保证主图/辅助信息的优先级；`3:2` 要防止辅助层跨脊造成误读；Contract 可用 slot、zIndex、indexed/aligned relation 表达，不能复制具体页面。访问：2026-08-12。 |
| **P03 — [How to Produce a Photobook](https://aperture.org/editorial/how-to-produce-a-photobook/)**；Aperture；Diane Smyth | 摄影书受 format、paper、binding、section 和 physical dummy 影响；翻阅纸书与看 PDF 不同。 | 设计必须同时考虑单页停留与连续翻页，且每种规则都要通过物理节奏检查。 | 文章所述项目、纸张、装订案例与出版细节。 | quiet；dynamic | `3:4` 需要单页聚焦仍成立；`3:2` 不能只把两页并排看作一张宽卡片；现有 Contract 只能表达应用 scope，物理装订安全仍不在本阶段 Contract。访问：2026-08-12。 |
| **P04 — [What Makes a Successful Photobook?](https://aperture.org/editorial/successful-photobook-photobook-awards/)**；Aperture；Aperture Editorial | 成功的摄影书依赖 sequence、pairing、dummy 与外部复核，而非一次确定布局。 | 用低成本顺序试验发现节奏问题；关系质量需要在相邻页和连续序列中复核。 | 奖项名称、候选作品、设计师与出版物的专属识别。 | editorial；dynamic | 单页闭合不应破坏连续序列；spread 只在 pairing 事实足够强时使用；Contract 的 application/migration 必须保留 photo placement identity。访问：2026-08-12。 |
| **P05 — [Stuart Smith: How Not to Design a Photobook](https://aperture.org/workshops/smith2016/)**；Aperture Foundation；Stuart Smith | 通过实体照片反复 review、edit、sequence，并把不能服务序列的图暂时移出。 | “暂不放置”是编辑决策，不是删除；内容过量需要可见的降级状态。 | 工作坊参与者、项目案例与实体照片。 | grid-contact；quiet | `3:4` 要保留 unplaced 的可见语义；`3:2` 要验证一项 assignment 在两页渲染仍只计一次；Contract 已有 `unplacedPhotoIds` 与 placement identity。访问：2026-08-12。 |
| **P06 — [PhotoBook Review Issue 003](https://aperture.org/pbr/photobook-review-issue-003/)**；Aperture；PhotoBook Review | 书的形式、材料与呈现方式参与内容，不只是信息容器；章节与序列共同塑造意义。 | 视觉语言可由材料/色彩/节奏共同构成，但每一层都要有内容职责。 | 具体评论、书名、作者、图片和刊物版式。 | chromatic；editorial | 单页要明确色彩是信息层还是氛围层；spread 要确认色彩变化是否跨脊连续；Contract 的 theme 可表达基础颜色，但功能色/对比规则需后续 Gap。访问：2026-08-12。 |
| **M01 — [The Coast: Sohrab Hura](https://www.magnumphotos.com/theory-and-practice/the-coast-sohrab-hura/)**；Magnum Photos；Magnum Editorial | 电影式素材不能直接搬进书；书本翻页节奏需要重新排序和精确控制。 | 同一组照片在连续媒介中要重新计算速度、停顿和转场。 | 摄影师、作品标题、照片内容与文章原句。 | dynamic；quiet | `3:4` 要能单页停顿；`3:2` 只有在跨页关系不可拆时才共享构图；Contract 可记录 scope 与 sequence metadata 的需求，但不应让 Renderer 推断排序。访问：2026-08-12。 |
| **M02 — [Zine It: Your Take on the Sacred Valley of Cusco](https://www.magnumphotos.com/event/events/workshop/zine-it-your-take-on-the-sacred-valley-of-cusco/)**；Magnum Photos；Workshop team | zine 制作包含 edit、select、sequence、打印小册子和协作反馈；纸面顺序会改变照片关系。 | 用少量可复核的内容矩阵检查顺序、数量和页面转场。 | 活动名称、地点、摄影任务和活动照片。 | dynamic；grid-contact | 单页要在小屏仍有清楚进入点；spread 要验证 physical pair，而非单纯双页预览；Contract 已有 page/spread、assignment 与 Preview Matrix 场景。访问：2026-08-12。 |
| **M03 — [The Sickness of Cities](https://www.magnumphotos.com/arts-culture/society-arts-culture/sickness-of-cities/)**；Magnum Photos；Magnum Editorial | 序列、pairing、视觉主题和颜色可以共同提供书的内部凝聚力。 | 色彩可成为跨页/章节的连接线，但必须服务主题和节奏，不能只作为换肤。 | 具体项目、艺术家、城市和照片。 | chromatic；editorial | `3:4` 需检查色彩不会压过照片与 Note；`3:2` 需检查跨脊色块是否诱发错误配对；Contract 的 theme/slot 可以承载基础主题，功能性色彩需后续元数据。访问：2026-08-12。 |
| **L01 — [Fotomarket: The First Crowdfunded Photobook Store](https://www.lensculture.com/articles/fotografia-magazine-fotomarket-the-first-crowdfunded-photobook-store)**；LensCulture；Fotomarket / Fotografia | 摄影书可把 sequence/layout 当作纸上的时间与叙事，而非相册式逐张陈列。 | 通过尺度、空隙和顺序制造变化；重复结构也需要叙事差异。 | 具体书目、摄影师、商店与引用的作品页面。 | dynamic；grid-contact | 单页需要独立的层级起点；spread 需要确认两侧关系是否比拆开更强；Contract 可表达拓扑与关系，但不能复制书籍编排。访问：2026-08-12。 |
| **L02 — [Making a Photobook to Say One Last Goodbye](https://www.lensculture.com/articles/jehsong-baak-making-a-photobook-to-say-one-last-goodbye)**；LensCulture；Jehsong Baak | 通过 A4 maquette、打印、摆放与多次改版检验页面关系；外部视角能发现顺序问题。 | 视觉验收应使用真实图片比例和跨页上下文，而不是只看抽象 Definition。 | 摄影项目、个人叙事、maquette 图片与作者素材。 | quiet；editorial | `3:4` 先验证主体与 Note 的独立可读性；`3:2` 要检查折叠/跨脊风险；Contract 已要求 Editor/Reader 同 Renderer，视觉 Gate 仍不可由单测替代。访问：2026-08-12。 |
| **L03 — [LensCulture Editors’ Favorite Photobooks of 2020](https://www.lensculture.com/articles/lensculture-editors-favorite-photobooks-of-2020)**；LensCulture；Editors | 评价同时关注 page layout、image/text balance、sequence/story 和 material。 | 版面差异应同时观察结构、文本比例、材料感和阅读顺序，不能只看单页装饰。 | 具体获选书目、封面、照片和评论措辞。 | chromatic；quiet | 单页需把色彩/文字层级与照片比例一起测试；spread 需避免色彩对跨脊主体造成干扰；Contract 需要主题与 Note/readability 约束，当前字段不足。访问：2026-08-12。 |
| **L04 — [LensCulture Photobook Competition](https://www.lensculture.com/photo-competitions/photobook)**；LensCulture；Competition team | 作品选择、sequence 与最终书籍设计由摄影师、编辑和设计团队共同完成；数量要服务整体作品。 | 不把“更多照片”当作自动更丰富；容量和超量行为应先可见、可编辑。 | 比赛品牌、具体获奖作品、投稿规则和参赛图片。 | grid-contact；dynamic | `3:4` 用内容数量矩阵验证密度；`3:2` 用连续 spread 验证序列；Contract 已有 `min/max` 与 `unplacedPhotoIds`，但正式 Catalog 元数据仍需 Gap。访问：2026-08-12。 |
| **E01 — [Alchemy of Layout](https://eyemagazine.com/feature/article/alchemy-of-layout)**；Eye Magazine；Eye Editorial | 构图不是装饰，而是组织意义；grid 可以作为隐形结构，也可以在有内容理由时显露或偏离。 | 先定义信息关系，再决定哪些元素对齐、哪些元素有意冲突。 | 文章中的作品、设计师、版面截图和刊物标识。 | editorial；quiet | 单页要让偏离仍可读；spread 要让跨脊变化具有语义；Contract 可用 slot geometry/relations 表达显式结构，不能靠随机 CSS 偏移。访问：2026-08-12。 |
| **E02 — [Town Shaped the Sixties](https://eyemagazine.com/feature/article/town-shaped-the-sixties)**；Eye Magazine；Eye Editorial | 网格、裁切、三栏轴线和跨双页的大图共同制造流动；图像与文字同样参与结构。 | 裁切不仅填框，也会改变叙事方向；跨页出血必须是明确的构图行为。 | 具体刊物、设计师、图片与历史案例识别。 | dynamic；grid-contact | `3:4` 要避免裁切让主体默认偏离；`3:2` 要区分真正跨脊与只是大图；Contract 的 `fit: cover`、focus、`allowGutterCrossing` 能表达部分能力。访问：2026-08-12。 |
| **E03 — [Editorial Eye 41](https://eyemagazine.com/opinion/article/editorial-eye-41)**；Eye Magazine；Eye Editorial | 稳定网格提供可控范围，设计者可以在其内作变化；创新来自系统中的发现而非无规则破坏。 | 家族语言应由可重复的规则和有限例外共同构成。 | 刊物编号、案例作品、排版截图和设计师身份。 | grid-contact；dynamic | 单页要能从结构识别而非颜色识别；spread 要说明变化是否跨页必需；Contract 可表达 page/spread/slot topology，不能用每个 Recipe 专用 Renderer 分支。访问：2026-08-12。 |
| **E04 — [Overloading the Page](https://www.eyemagazine.com/feature/article/overloading-the-page)**；Eye Magazine；Eye Editorial | 过近的图文关系会让读者误判关联；拥挤的留白、caption 和页面元素会造成视觉混淆。 | 留白与间距要承担关系标记；临近不应自动等于绑定。 | 文章案例、刊物与具体版面截图。 | editorial；quiet | `3:4` 要验证 Note 与照片的关系可被明确识别；`3:2` 要防止中心两侧的 Note 被误读为跨页绑定；Contract 的 `photoId` relation 是硬约束，不能用距离代替。访问：2026-08-12。 |
| **G01 — [Candid Photography, Even More Candid Interviews](https://eyeondesign.aiga.org/candid-photography-even-more-candid-interviews-in-the-great-discontent-3/)**；AIGA Eye on Design；AIGA Editorial | 清晰网格可以容纳大图、空白、pull quote 与文字；不同阅读层级并存但入口要明确。 | 用主视觉、文字层和辅助信息形成可预测阅读路径。 | 杂志项目、采访对象、照片、标题与版面截图。 | editorial；chromatic | 单页需保证文字对比与主图层级；spread 要检查大视觉是否侵入书脊；Contract 可用 zIndex、text slot、theme，功能色和 typography constraints 仍需后续 Gap。访问：2026-08-12。 |
| **G02 — [Flaneur Magazine](https://eyeondesign.aiga.org/flaneur-magazine-is-studio-yukikos-typographic-love-letter-to-a-different-street-with-each-issue/)**；AIGA Eye on Design；Studio Yukiko | 片段、情绪和连续流动可以组成页面系统；结构可流动，但并非随机。 | 通过重复的阅读方向/片段尺度保持整体身份，再允许页面之间变化。 | 杂志名称、街道主题、设计工作室和版面素材。 | dynamic；quiet | `3:4` 要保持单页入口清晰；`3:2` 只在片段关系跨脊不可拆时使用；Contract 需要稳定 slot topology 和 reading-direction 元数据，当前还没有完整字段。访问：2026-08-12。 |
| **G03 — [David Benski on the Mood of Magazines](https://eyeondesign.aiga.org/david-benski-on-the-mood-of-magazines-and-the-virtues-of-change/)**；AIGA Eye on Design；David Benski | 网格、字体和系统提供稳定工具，同时保留适度变化；仅改变表面并不构成新结构。 | 家族差异应来自结构、节奏和阅读路径；色彩/字体只能在结构差异之上工作。 | 设计师采访、刊物名称与案例版面。 | grid-contact；chromatic | 单页需保持可预测阅读；spread 需判断变化是否真的跨页必要；Contract 应承载可比较的 fingerprint 元数据，而非把差异藏在 CSS。访问：2026-08-12。 |
| **D01 — [The Design Police](https://designobserver.com/the-design-police/)**；Design Observer；Design Observer Editorial | 裁切与完整画面会产生不同叙事；系列排列可以制造第二层叙事。 | 统一的照片处理方式可以形成秩序，局部裁切则应有叙事理由。 | 文章案例、作品、作者和版面图像。 | quiet；grid-contact | `3:4` 要分别测试完整框和 cover 裁切；`3:2` 要避免主体裁切跨脊；Contract 已有 focus/scale/cover，视觉 Gate 仍需确认主体安全。访问：2026-08-12。 |
| **D02 — [Looking Down: An Interview with Bryon Darby](https://designobserver.com/looking-down-an-interview-with-photographer-bryon-darby/)**；Design Observer；Design Observer Editorial | 图像分组与块状结构可以把照片看成节奏单元；组合关系决定阅读速度。 | 先定义组与节奏，再决定单图/多图的面积比例；不要仅以数量命名结构。 | 摄影师、采访、作品及网页设计。 | grid-contact；dynamic | `3:4` 需要分组单元在单页中可辨；`3:2` 需要确认组是否跨页不可拆；Contract 可用 repeatable slot 与 scope，仍需正式 metadata 描述组结构。访问：2026-08-12。 |
| **DM01 — [i-D: The First 25 Years](https://designmuseum.org/asset/download?id=0292fc63-0fb3-436f-bfef-7b2566f787cd)**；Design Museum；Design Museum Archive | zine/杂志的复制、手工装订、街头摄影和版面演变说明物理媒介本身会影响节奏与身份。 | 低成本物理感可以来自节奏、纸面边界和信息密度，不应依赖复用原品牌素材。 | i-D 的品牌、封面、照片、字体、标志和历史物件。 | dynamic；chromatic | `3:4` 要保证小屏文字和高密度图像仍可读；`3:2` 要检查装订/书脊边界；Contract 可表达主题与 slot 层级，但印刷材料和 spine 仍是后续边界。访问：2026-08-12。 |

## 4. 从资料提炼的可执行原则

这些是 F1 的研究结论，不是 Recipe 规格。

### R-01：系统先于变化

网格、边距、列、栏沟和基线先提供稳定坐标；变化应是可解释的局部偏离。家族辨识不能只来自颜色或字体。Adobe 对 document grid、baseline grid 与 layout adjustment 的资料共同支持这一点；Eye Magazine 进一步说明有意义的变化可以发生在系统内部。

### R-02：图像网格与文字基线是两套相关但不同的节奏

照片对象对齐解决密度与比较，基线系统解决文字行列的一致性。两者混为一套会让 Photo Note 既挤压照片又失去层级。后续任何支持文字的方向，都必须分别检查图像尺度、Note 行数、标题层级与基线节奏。

### R-03：尺度是观看速度控制，不只是占比

大图提供停留和闭合，小图提供比较、索引或转场；图片配对和 sequence 决定相邻页面的意义。Aperture、Magnum 和 LensCulture 的证据都指向同一结论：照片数量本身不是结构，尺度和顺序才是结构。

### R-04：cover 解决填框，不解决主体安全

满框裁切必须与 placement focus 一起验证。横图、竖图、方图和主体靠边的照片不能依赖默认中心焦点。重要主体、Note 与文字应避开书脊损失区；裁切方向若要参与叙事，必须是明确的结构原则而不是偶然副作用。

### R-05：Photo Note 的邻近不等于关系

研究显示拥挤页面容易让读者误判图文关系；本系统因此必须把 Note 关系保留在 `photoId` 和 placement 语义中。`adjacent`、`aligned`、`indexed`、`cross-page-pair` 代表不同阅读关系，不能仅用几何距离替代。

### R-06：留白改变阅读速度

大留白可形成停顿、主体权重和章节间隔；紧密留白可形成比较、档案和速度。留白不能通过“把所有内容缩小并居中”自动得到；它必须和主图尺度、进入点、文字层级一起形成结构。

### R-07：出血与框内节奏必须可辨识且可控

全出血、局部出血和完整框内图像可以构成节奏差异，但出血不等于把关键主体/文字推到边缘。Adobe 的 bleed 资料与 Eye Magazine 的裁切案例支持“延伸区域”和“叙事裁切”必须分开审查。当前 Contract 有 `allowBleed`，但物理输出与 `3:2` spread 安全仍受 F0 Gap 限制。

### R-08：层级要由职责区分

标题、页码、静态文字和 Photo Note 不能只靠字号区分。它们的绑定对象、阅读顺序和对齐方向不同：标题服务页面叙事，页码服务导航，静态文字服务章节/上下文，Photo Note 服务某个照片实例。后续必须在 Definition 元数据中保持这些职责可检验。

### R-09：色彩是组织信息的能力，不是换肤

色彩可以连接序列、区分章节、强调入口或建立对比，但必须维持照片、文字和 Note 的可读性。Chromatic 家族后续至少需要比较不同的功能色逻辑；在 F1 阶段只记录这种研究轴，不确定任何配色、坐标或 Recipe。

### R-10：书脊是结构边界，不是普通间距

实体跨页的中心区域会影响主体、文字和色块的连续性。单页页面可以属于同一 spread，但只有两侧关系确实不可拆时才有理由使用 spread scope。数字单页放大和实体跨页打开是两个观察状态，必须分别检查。

### R-11：超量内容应成为可解释状态

Aperture 的编辑/排序资料与 LensCulture 的 photobook 工作流都强调选择和删减是编辑过程的一部分。系统中的超额照片不能被静默丢弃；应通过 `unplacedPhotoIds`、兼容性诊断和后续降级策略让用户知道发生了什么。

### R-12：视觉 Gate 必须使用真实比例与连续上下文

纸面 maquette、实体照片和反复 review 的资料说明，抽象矩形或单张截图不足以验证版面。正式进入后续阶段时，必须在真实 `3:4` 单页、真实 `3:2` spread、不同照片比例、Note 长度和 Editor/Reader 对照下验收；F1 本身不启动此验证。

## 5. 五个家族的证据边界

以下是“可辨识视觉语言”的研究边界，不是 Family Bible，也不是 Recipe 设计。

| 家族 | 可从研究中继承的语言 | 需要避免的伪差异 | 证据覆盖 |
| --- | --- | --- | --- |
| `editorial` | 图像、标题、页码、静态文字与 Photo Note 有明确职责；序列和图文层级共同叙事 | 均匀 Contact Grid；只换标题或颜色 | A01/A03/A04/A05/A07/P01/P04/P06/E01/E04/G01；Adobe、Aperture、Eye、AIGA 共 4 域 |
| `grid-contact` | 重复、模块、索引、比较阅读、稳定基线和可预测密度 | 任意拼贴后称作网格；只改变列数或颜色 | A01/A02/A05/A06/P02/P05/L01/L04/E02/E03/G03/D01/D02；Adobe、Aperture、LensCulture、Eye、AIGA、DesignObserver 共 6 域 |
| `quiet` | 单图凝视、尺度控制、停顿、大留白、少量而有职责的文字 | 所有版本都只是缩小并居中；把空白当作未填充 | A03/A07/P02/P03/P05/M01/L02/L03/E01/E04/G02/D01；Adobe、Aperture、Magnum、LensCulture、Eye、AIGA、DesignObserver 共 7 域 |
| `dynamic` | 方向、尺度跳变、非对称、序列转场和受控裁切 | 随机旋转、随机重叠、失去单页入口 | A02/A04/A06/A08/P01/P03/P04/M01/M02/L01/L04/E02/E03/G02/D02/DM01；Adobe、Aperture、Magnum、LensCulture、Eye、AIGA、DesignObserver、DesignMuseum 共 8 域 |
| `chromatic` | 色彩分组、节奏连接、强调入口和受控对比；色彩参与信息组织 | 同一结构只换背景色；颜色压过照片或 Note | A08/P06/M03/L03/G01/G03/DM01；Adobe、Aperture、Magnum、LensCulture、AIGA、DesignMuseum 共 6 域 |

## 6. 适配当前系统的研究结论

1. `3:4` 单页必须作为独立可读单位检查：主图焦点、文字层级、Note 绑定和边缘安全不能依赖另一页补救。
2. `3:2` spread 不是简单把两个单页横向拼接；它需要单独的中心安全、跨页关系、连续节奏和从左右任一侧应用的验证。
3. 统一 Renderer 可以承载这些原则，但只有现有 Contract 能表达的部分才能进入后续 Definition。F0 已记录的 GAP-F0-01 至 GAP-F0-04 不得被视觉偏好绕过。
4. `Photo Note` 的非边缘关系是关系数据与几何布局的共同问题；不能把“看起来靠近”当成数据关系。
5. 所有后续视觉候选必须支持真实照片比例、最小/最大/超量内容、无/短/长 Note 和 Editor/Reader 对照；这些是后续阶段的验证输入，不是本档案中的 Recipe 设计。

## 7. F1 Gate 结论

- **来源规模：通过。** 31 条直接来源，8 个域名/出版机构；Adobe 8 条、Aperture 6 条。
- **可追溯性：通过。** 每条记录包含标题、发布者/作者、直接 URL、访问日期、类别、具体观察、可迁移结构、不可复制元素、家族关联和三种画布/Contract 适配判断。
- **五家族证据：通过。** 每个家族至少 4 条关联资料，并覆盖至少 3 个不同域名。
- **原创性边界：通过。** 文档没有整页临摹、坐标草图、来源作品命名的产品化方案，也没有复用来源资产的计划。
- **Recipe 设计门禁：保持关闭。** F1 只允许进入后续 Family Bible 的研究输入；在 Contract Gap Report 获批准前，不进入 F2/F3 的正式布局设计。

