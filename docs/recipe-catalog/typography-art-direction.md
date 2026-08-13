# Phase F3-T1 Zine Typography Art Direction & Font System Decision

> Gate 状态：**等待用户裁决**。本文件是艺术指导与字体系统选择材料，不是 F3-T2 实现规格。
> 范围锁：未下载字体、未修改 TS/TSX/CSS/测试/Recipe Definition/Token、未启动服务器或浏览器、未激活 Recipe、未进入 F3-B4。
> 配套证据：[Typography Source Dossier](./typography-source-dossier.md) · [Typography Specimen Matrix](./typography-specimen-matrix.md)

## 1. 决策摘要

推荐主方向为 **S1 — Duplex Photo-Essay**：拉丁 display 使用现有 Bodoni Moda，CJK display 使用 Source Han Serif 的 locale 版本；支撑文字使用 Geist + Source Han Sans；索引/编号的拉丁字符有限使用 Geist Mono，CJK 继续由 Source Han Sans 承担。它让摄影书同时拥有“编辑声音”和“档案骨架”，但不把字体表情铺满每一个 Recipe。

保守 fallback 为 **S2 — Plex Unified Archive**：IBM Plex Sans SC/TC + IBM Plex Sans Latin + IBM Plex Mono。它的脚本一致性、官方 web subset 路径与工程可控性更好，代价是 Editorial 与 Quiet 之间的明暗反差较弱。

淘汰 **S3 — Moda-First Fashion Gloss**。它在拉丁大标题上最吸引人，也最容易在 moodboard 上胜出；但 Bodoni Moda 没有 CJK，小字号高反差 serif 不适合 caption/note/index，系统 fallback 会让中英文标题像两个品牌。它只能作为 S1 的受控 display 层，不能成为全局字体系统。

本 Gate 请求用户裁决 8 项 D01–D08；没有批准前，Grid/Contact visual Gate 保持暂停，F3-T2 与 F3-B4 都不开始。

## 2. 艺术指导命题

### 2.1 核心句

**照片负责发生，文字负责剪辑。** Typography 不在照片之上表演统一品牌，而是在 title、deck、caption、note、index、label、folio 七种职责之间控制阅读速度、证据距离和书页连续性。

### 2.2 三条可见原则

1. **Display 有限。** 高对比 serif 只在 Editorial 或明确的入场 title/deck 中出现；caption、note、index 不借 display 字体制造“高级感”。
2. **Metadata 成系统。** label、folio、index 可以通过 mono/sans、宽 tracking、数字形态建立摄影档案的连续骨架，但 CJK 不强制 uppercase，也不人为拉宽汉字。
3. **脚本同权。** 中英文不要求长得一样，但必须有相近的视觉重量、行距压力和角色尊严；不接受“英文设计字体 + 中文系统默认字”的隐性降级。

### 2.3 禁止做法

- 不把字体替换当成 Recipe 差异；family 仍由 topology、留白、图片关系和阅读路径成立。
- 不开放 recipe-level `fontFamily`、任意 `font-size`、任意 tracking 或 font feature。
- 不让 title 压照片、让 mono 承担长 Note、让 Bodoni 承担小号 caption，或让 uppercase 变换触碰 CJK。
- 不从 Adobe Fonts 服务、未知 CDN 或未锁版本的第三方转换站取得生产字体。
- 不在 F3-T1 先写 CSS 再让 specimen 为既成实现背书。

## 3. 当前默认系统审计

### 3.1 已存在字体资产（本地实测）

| 文件 | 当前字节数 | 当前声明 | 审计结论 |
| --- | ---: | --- | --- |
| `public/fonts/geist.woff2` | 29,288 B | Geist, variable `100 900` | 可继续作为 Latin support sans；不提供 CJK。 |
| `public/fonts/geist-mono.woff2` | 23,108 B | Geist Mono, variable `100 900` | 可承担 Latin labels/folio/index；不应用于长文，也不提供 CJK。 |
| `public/fonts/bodoni-moda.woff2` | 25,804 B | Bodoni Moda, variable `400 900` | 适合 Latin display；Google metadata 证明其 subset 不含 CJK，且 `opsz` 能力尚未在当前声明中审定。 |
| **合计** | **78,200 B / 76.37 KiB** | 本地 WOFF2 | 体量很轻，但脚本覆盖不完整。 |

`app/globals.css` 已声明三个 `@font-face`；全局 body 使用 Geist/Arial fallback。共享 Recipe renderer 的 canvas 当前统一使用 `var(--font-geist-sans), Arial, sans-serif`。结果是：Recipe 虽然已有七个语义 role 与 normalized metrics，但所有 role 的真实字形声音仍是一个 sans；Bodoni 与 Geist Mono 并未成为受控 Zine role。

### 3.2 当前受控 typography reality

Contract 已把 typography 限为 `xs/sm/md/lg/xl`、`400/500/600/700`、`tight/normal/open` line-height、`tight/normal/wide` tracking、`none/uppercase` transform。当前 page-width metrics 为 `xs .016`、`sm .022`、`md .024`、`lg .025`、`xl .050`；line-height 为 `1.10/1.25/1.45`；tracking 为 `-.015/0/.08em`。这套离散语义与 canvas-relative renderer 应保留。

当前默认 role 值为：title `xl/700/tight/tight`、deck `lg/500/normal/normal`、label `sm/700/tight/wide/uppercase`、folio `xs/700/tight/wide/uppercase`、caption `sm/400/normal`、note `sm/400/normal`、index `xs/500/open`。问题不是 token 不够多，而是：

- title/deck/label/folio 全靠粗细与字号区分，没有字形层的 editorial/archival 对位；
- CJK 实际由操作系统 fallback 决定，行数 estimator 却是 font-agnostic；
- `uppercase + wide` 对 Latin label 有意义，对 CJK 无意义甚至可能造成错误期望；
- `note` 当前 line-height 1.25，不足以稳定表现长 CJK photo note；推荐在 preset 中用 `open = 1.45`；
- 现有字体很轻量，但这个优点来自没有交付 CJK 一致性，而不是已经解决性能问题。

## 4. 候选字体家族审计

| 家族 | 合法来源 / license | 脚本与字重 | 最合适职责 | 主要风险 | 预期资产与采购预算 |
| --- | --- | --- | --- | --- | --- |
| Geist Sans | Vercel upstream / OFL | Latin，variable；当前 29,288 B | support sans、Latin caption/note/utility | CJK 必须 partner；单独使用会继续系统 fallback | 保留 `geist.woff2`，当前 28.60 KiB；F3-T2 核对版本/hash。 |
| Geist Mono | Vercel upstream / OFL | Latin，variable；当前 23,108 B | Latin index、folio、短 label、数字 | CJK 与长文不适配；不可把 mono 当“zine 装饰” | 保留 `geist-mono.woff2`，当前 22.57 KiB。 |
| Bodoni Moda | Google Fonts / upstream OFL | Latin/Latin-ext；`wght 400–900`、`opsz 6–96`；当前 25,804 B | 大号 Latin title，短 deck 的 display 对位 | 无 CJK；细线在小字号/低清屏脆弱；混排 baseline 与灰度需实测 | 保留 `bodoni-moda.woff2`，当前 25.20 KiB；不新增 italic。 |
| Source Han Sans 或 Noto Sans CJK（二选一 provenance） | Adobe Fonts / Noto official OFL | Pan-CJK，SC/TC/HK/JP/KR，多字重/variable | CJK support sans、caption、note、index partner | 完整 variable WOFF2 极大；locale 路由与子集命名复杂 | 预算名 `SourceHanSansSC/TC` 或 Noto 同源版本；**每 locale 约 7–12 MiB 的上限区间**，F3-T2 以固定 release 实测并争取静态分片。 |
| Source Han Serif 或 Noto Serif CJK（二选一 provenance） | Adobe Fonts / Noto official OFL | Pan-CJK，SC/TC/HK/JP/KR，多字重/variable | CJK title/deck、Editorial display partner | 与 Bodoni 的比例/标点/粗细不天然匹配；完整资产大 | 预算名 `SourceHanSerifSC/TC`；**每 locale 约 8–14 MiB 的上限区间**，不得把预算当最终字节数。 |
| IBM Plex Sans SC/TC | IBM official / OFL | Latin + SC/TC packages，多字重；官方 web glyph subsets | 全角色统一 sans、archive/editorial utility | 无对应 Plex CJK serif；全系统表达偏理性，Editorial 张力下降 | `@ibm/plex-sans-sc`、`@ibm/plex-sans-tc` 官方 WOFF2 shards；预算 **每 locale/所需 3 weights 2–6 MiB**，F3-T2 实测。 |
| IBM Plex Mono | IBM official / OFL | Latin，多字重 | index、folio、短 label、数字 | 与 Geist Mono 功能重叠；CJK 仍回退到 Plex Sans CJK | 若选 S2，仅取 400/500/600 或 variable web asset；预算 **80–200 KiB**。 |

所有 MiB 数字都是 F3-T1 的 capacity envelope，不是下载实测。Dossier 已明确要求 F3-T2 固定 release、文件名、hash、license、glyph/locale 与压缩字节数后才能采购。Source Han 与 Noto 不得重复打包。

## 5. 三套完整方向

### S1 — Duplex Photo-Essay（推荐）

**声音：** serif 是编辑者的长呼吸，sans 是照片旁的事实，mono 是档案坐标。
**家族：** Bodoni Moda Latin + Source Han Serif CJK；Geist Latin + Source Han Sans CJK；Geist Mono 只覆盖 Latin metadata。
**为什么适合：** Editorial title/deck 有明显书刊声量；Quiet 可退回纯 sans/弱层级；Grid/Contact 获得数字与 index 骨架；Dynamic 通过 weight/scale 而非斜体或旋转获得推进；Chromatic 不再同时用颜色和 display 字体争夺入口。
**关键风险：** 最大 payload；Bodoni/Source Han Serif 混排不是原生 superfamily；line estimator 必须按真实 font/script 校准。
**采用条件：** F3-T2 的 SC/TC 混排、最长文本与移动端 specimen 全部通过；首屏字体策略不阻断照片；CJK 文件采购有明确 budget。

### S2 — Plex Unified Archive（保守 fallback）

**声音：** 一套中性、人文但有工程骨架的无衬线系统，mono 只负责元数据。
**家族：** IBM Plex Sans Latin/SC/TC + IBM Plex Mono；title 通过尺度和 weight 而非 serif 切换。
**为什么适合：** 同一项目下的多脚本与官方 web subset 方案降低 provenance、fallback、灰度和 payload 风险；Grid/Contact 尤其自然。
**关键风险：** Editorial、Quiet、Grid 之间主要靠 preset metrics 区分，摄影书独特性弱于 S1；IBM 品牌联想需要通过本项目自己的留白与角色系统消解。
**采用条件：** 用户更看重脚本一致性、性能与较低实现风险，或 S1 在任一 hard fail 上失守。

### S3 — Moda-First Fashion Gloss（淘汰）

**声音：** 所有主标题、deck、caption 甚至 folio 都围绕 Bodoni 高对比建立。
**吸引力：** 拉丁 specimen 立刻有 fashion/editorial 气质，当前资产已经存在且只有 25.20 KiB。
**淘汰原因：** 中文会落到无控制系统 serif/sans；caption/note 的细线与窄空间不稳；Grid/Contact 的证据职责被时装杂志声音吞没；Latin-only moodboard 会系统性高估它。它最多是 S1 的 title 层，不能独立成为产品系统。

## 6. 100 分量化评分

评分维度：Zine 艺术方向 25；CJK/混排同权 20；七角色区分 15；可读性与 line-fit 稳定 15；self-host/license/provenance 10；payload/加载 10；现有 contract 适配 5。80 分是进入 F3-T2 的建议门槛，任何 license、CJK fallback、最小字号可读性 hard fail 都可直接淘汰，不由总分抵消。

| 系统 | Art 25 | CJK 20 | Roles 15 | Read/fit 15 | License 10 | Payload 10 | Contract 5 | 总分 | 裁决 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| S1 Duplex Photo-Essay | 24 | 17 | 15 | 12 | 10 | 3 | 5 | **86** | 推荐；payload 与混排必须在 F3-T2 关闭。 |
| S2 Plex Unified Archive | 19 | 19 | 12 | 14 | 10 | 7 | 5 | **86** | 保守 fallback；独特性较弱但风险最低。 |
| S3 Moda-First Fashion Gloss | 24 | 4 | 10 | 7 | 10 | 10 | 4 | **69** | 淘汰；CJK hard fail，不进入下一轮。 |

S1 与 S2 同分不是回避选择：主方向用 Art/role 上限取胜，fallback 用脚本/工程稳定性取胜。用户若批准 S1，同时批准 S2 作为明确回退线；不能在 F3-T2 遇到困难后临时混成第四套系统。

## 7. 受控 preset（最多 3 个）

数值全部沿用现行 Contract 的离散 tokens；F3-T1 不新增 token。Size 为 page-width fraction；line-height 为 multiplier；tracking 为 `em`。`uppercase` 只作用有大小写的 Latin；CJK 原样。Font routing 是未来 product-owned preset 的职责，Recipe 未来最多选择 preset ID，不拥有 font-family。

### P1 `photoessay-display` — serif 入场，sans 支撑

| Role | Size | Weight | Line-height | Tracking | Transform | 字体职责 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| title | `.050` | 700 | 1.10 | `-.015em` | none | Bodoni Moda Latin / Source Han Serif locale CJK |
| deck | `.025` | 400 | 1.25 | `0` | none | 同上；仅短 deck，长文回 sans |
| label | `.022` | 600 | 1.10 | `.08em` | uppercase | Geist / Source Han Sans；CJK tracking 需脚本钳制 |
| folio | `.016` | 600 | 1.10 | `.08em` | uppercase | Geist Mono Latin / Source Han Sans CJK |
| caption | `.022` | 400 | 1.25 | `0` | none | Geist / Source Han Sans |
| note | `.022` | 400 | 1.45 | `0` | none | Geist / Source Han Sans |
| index | `.016` | 500 | 1.25 | `0` | none | Geist Mono Latin/数字 / Source Han Sans CJK |

### P2 `photoessay-field` — 低声量通用 sans

| Role | Size | Weight | Line-height | Tracking | Transform | 字体职责 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| title | `.050` | 600 | 1.10 | `-.015em` | none | Geist / Source Han Sans |
| deck | `.025` | 400 | 1.25 | `0` | none | Geist / Source Han Sans |
| label | `.022` | 600 | 1.10 | `.08em` | uppercase | Geist / Source Han Sans |
| folio | `.016` | 600 | 1.10 | `.08em` | uppercase | Geist Mono Latin / Source Han Sans CJK |
| caption | `.022` | 400 | 1.25 | `0` | none | Geist / Source Han Sans |
| note | `.022` | 400 | 1.45 | `0` | none | Geist / Source Han Sans |
| index | `.016` | 500 | 1.25 | `0` | none | Geist / Source Han Sans；数字可 mono |

### P3 `photoessay-register` — 档案索引优先

| Role | Size | Weight | Line-height | Tracking | Transform | 字体职责 |
| --- | ---: | ---: | ---: | ---: | --- | --- |
| title | `.024` | 700 | 1.10 | `0` | none | Geist / Source Han Sans；避免 XL 抢走 contact sheet |
| deck | `.025` | 500 | 1.25 | `0` | none | Geist / Source Han Sans |
| label | `.022` | 600 | 1.10 | `.08em` | uppercase | Geist Mono Latin / Source Han Sans CJK |
| folio | `.016` | 600 | 1.10 | `.08em` | uppercase | Geist Mono Latin/数字 / Source Han Sans CJK |
| caption | `.022` | 400 | 1.25 | `0` | none | Geist / Source Han Sans |
| note | `.022` | 400 | 1.45 | `0` | none | Geist / Source Han Sans；Mono 禁止进入长 note |
| index | `.016` | 500 | 1.25 | `.08em` | uppercase | Geist Mono Latin/数字 / Source Han Sans CJK |

若选择 S2，三个 preset 的 metrics 不变，只把 P1/P2 的 serif/sans routing 合并到 IBM Plex Sans SC/TC，把 P3 metadata routing 改为 IBM Plex Mono + Plex Sans CJK。这样 specimen 比较的是字体系统，而不是同时改变字号与布局。

## 8. 五家族映射

| Family | 主 preset | 可接受例外 | 字体如何服务而不伪造 Recipe 差异 |
| --- | --- | --- | --- |
| Quiet | P2 `photoessay-field` | 极少数真正有 title 的 opening 可用 P1，但不能因“更美”普遍升级 | 低重量 sans、open note 与弱 folio 保持凝视；结构仍由留白/比例成立。 |
| Editorial | P1 `photoessay-display` | Evidence Aside 的 note/caption 仍走 sans；无 title 页面不强插 serif | Serif 只标记叙事入口，证据与注释保持事实声调。 |
| Grid/Contact | P3 `photoessay-register` | Cross Register 长 note 自动使用 P3 的 sans note，不用 mono | Mono/宽 label 建扫描骨架，contact topology 才是家族身份证。 |
| Dynamic | P2 `photoessay-field` | 只在已有 title slot 时允许 600/700；不用 italic、rotation 或 display serif 制造运动 | 推进来自 bleed、尺度跳变与方向，字体只保证短促清楚。 |
| Chromatic | P2 `photoessay-field` | 有明确 editorial title slot 时可 P1；同一页面不能让高声量色彩与高声量 serif 双重抢入口 | 颜色承担策略，字体维持对比与可读性；color-off 后 topology 仍可辨。 |

## 9. Line-fit、fallback 与资产策略

### 9.1 必须保持的 contract 边界

- 保留七 role、五 size、四 weight、三 line-height、三 tracking、两 transform 的受控枚举。
- 不在 Recipe Slot 中加入 `fontFamily`；未来只允许 Definition/Catalog 选择由产品拥有的 preset ID，并另走 F3-T2 contract review。
- Editor 与 Reader 继续共享同一 render plan；font readiness 不得造成两端不同布局。

### 9.2 F3-T2 必须解决的真实问题

1. `lang=zh-Hant/zh-Hans/en` 的明确路由与页面缺失 `lang` 时的保守默认。
2. 禁止 synthetic bold/italic；所选 weight 必须有实际字形或明确 variable axis。
3. 现有 Unicode-aware estimator 的 role width coefficient 必须按 preset × script 实测，不能只换 CSS font stack。
4. CJK tracking 钳制：Latin `.08em uppercase` 不应无条件扩散到逐字汉字。
5. Bodoni/Source Han Serif 混排的 baseline、标点、数字与 `opsz`；`0.95 CJK scale` 只能作为 A/B 假设。
6. 字体加载前后 layout shift；Reader 首次加载不得让 title 从 3 行跳成 4 行或 note 越界。

### 9.3 Payload Gate

- 本阶段不设虚假的精确 KB 目标；先要求 F3-T2 manifest 给出每个实际 WOFF2 的文件名、来源 tag、hash、license、locale、weight、unicode-range 和 bytes。
- 首屏只加载当前 locale 与当前页面实际 preset 所需资产；不能一次把 SC+TC+serif+sans 全部阻塞加载。
- 任一完整 CJK variable 文件若超过预算，必须比较官方/合规静态分片、unicode-range 或按 locale 延迟加载；不得从未知 CDN 临时绕过。
- S1 若无法在不破坏 line-fit 的前提下控制加载，直接回退 S2，而不是删除 CJK serif 后让系统字体补位。

## 10. 必过 specimen 与回归点

完整内容见 [Typography Specimen Matrix](./typography-specimen-matrix.md)。最低 Gate 包括：繁中、简中、英文、混排、数字/标点；短/长/强制换行；3:4 canvas 与 mobile single-page focus；三套 preset；Editor/Reader 同版；font-ready 前后无越界。

必须回归已有真实压力点：Lead Story title 60/3、deck 76/2；Evidence Aside note 60/4；Across the Record note 120/4；Quiet Scale Echo 最长 note；Cross Register 每条 index note 18 字/1 行；Twelve-up folio 与 Four Beat xs index 的最小字号。字体系统不得以降低这些既有容量上限或改变照片几何来换取通过。

## 11. D01–D08 用户裁决表

| ID | 推荐裁决 | 备选 | 成本 / 风险 | 不批准的影响 |
| --- | --- | --- | --- | --- |
| D01 Source policy | 只接受官方 upstream + OFL/明确 self-host 权利；Adobe Fonts 服务仅作研究 | 另购商业 self-host license，另开采购阶段 | 需要 asset manifest 与 attribution；商业方案增加法务/费用 | 来源不清，F3-T2 不得下载或入库。 |
| D02 主系统 | 批准 S1 Duplex Photo-Essay 进入 F3-T2 specimen | 直接选择 S2 | S1 payload 最大，混排需校准 | 无主系统，不能定义真实 specimen 或 font routing。 |
| D03 回退线 | 同时锁定 S2 Plex Unified Archive 为唯一 fallback | 无 fallback，S1 失败即返回 F3-T1 | 需研究 Plex 实际分片，但避免临时混搭 | S1 失败时项目再次开放式选字，延迟不可控。 |
| D04 Presets | 批准 P1/P2/P3 三个受控 preset；不超过 3 | 只用 P2/P3 两个 sans preset | 三 preset 增加 matrix；但角色边界最清楚 | 不能进行 family-aware typography，现行单 sans 继续。 |
| D05 Script policy | 批准 locale-aware SC/TC + Latin partner；CJK 不 uppercase，wide tracking 脚本钳制 | 单一 CJK region 默认 | 需要 `lang` 与 fallback 审计 | 中英文视觉同权无法保证，可能出现地区错误字形。 |
| D06 Metrics | 保留现行离散 tokens；F3-T2 重测 preset × script estimator，不先新增自由值 | 仅做视觉 CSS，沿用旧 estimator | 测量矩阵较大；但保护容量真实性 | font-ready 后换行可能与 Compatibility/diagnostic 不一致。 |
| D07 Payload | 要求按 locale/preset lazy load；S1 超预算或 layout shift hard fail 时回退 S2 | 接受一次性全 CJK 下载 | 分片/预加载策略复杂；数字需 F3-T2 实测 | 无预算纪律，移动端首屏和 Reader 稳定性不可判定。 |
| D08 Gate | 只有 specimen matrix、Editor/Reader parity、既有压力点与 asset manifest 全通过才允许 F3-T2 完成 | 只审 moodboard/标题样张 | 用户视觉检查时间增加 | 容易批准一个只在拉丁大标题上好看的系统。 |

## 12. 推荐裁决与停止点

推荐一次性批准 **D01–D08（S1 主方向 + S2 唯一 fallback + P1/P2/P3）**。批准只授权进入 F3-T2：固定 release、下载候选资产、建立真实 specimen、校准 estimator 与提出最小 contract 变更；不等于批准产品实现、不等于 Grid/Contact 视觉通过、不等于 Recipe activation。

**Phase F3-T1 Typography Art Direction 用户裁决 Gate：STOP。**
