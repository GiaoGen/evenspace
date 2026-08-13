# Phase F3-T1 Typography Source Dossier

> 状态：research complete，等待 Phase F3-T1 用户裁决；不是字体采购、下载或实现记录。
> 调研日期：2026-08-14（Asia/Taipei）。所有链接均为本次直接访问的页面，不以搜索结果页代替。
> 计数：28 个直接来源；10 个 publisher / official project group；Adobe/Source Han 7 项；CJK 或许可 17 项；摄影书/编辑设计 6 项。

## 1. 研究边界与证据等级

本 dossier 只回答四件事：字体是否允许自托管、是否有可信 CJK 路径、它支持哪一种 Zine 阅读职责，以及哪些视觉做法只能提炼为原则而不能复制。优先级为官方许可证与官方仓库，其次为官方 design language，最后才是专业出版机构的访谈或编辑文章。本文不把 Adobe Fonts 订阅权限误写成字体文件的再分发权限，也不把 Google Fonts 页面可见等同于已经完成本地资产核验。

“不可复制”列是原创性边界：可借鉴的是节奏、层级、序列、职责分离等抽象原则；不可复制具体书页、封面、字体 specimen、品牌组合、文案与项目独有构图。

## 2. Adobe / Source Han 与许可直接来源（7）

| ID | 直接来源 / publisher | Access | 支持的具体决策 | 不可复制元素 |
| --- | --- | --- | --- | --- |
| A01 | [Source Han Serif README](https://github.com/adobe-fonts/source-han-serif) — Adobe Fonts | 2026-08-14 | Pan-CJK serif 可提供 SC/TC/HK/JP/KR、本地 OTF/OTC/variable/WOFF2 路径；支持把它列为 CJK display/text serif 候选。 | 仓库 specimen 图、Adobe/Google 品牌呈现与原文描述。 |
| A02 | [Source Han Serif OFL](https://github.com/adobe-fonts/source-han-serif/blob/master/LICENSE.txt) — Adobe Fonts | 2026-08-14 | 允许嵌入、再分发与修改，但派生/子集化必须逐条遵守 OFL 与 Reserved Font Name；支持“F3-T2 先做许可证清单再入库”。 | 许可证文本不得改写成自制许可证；字体名称与商标不可冒用。 |
| A03 | [Source Han Serif releases](https://github.com/adobe-fonts/source-han-serif/releases) — Adobe Fonts | 2026-08-14 | 官方 release 同时提供多种部署资产；支持未来只从固定 release/tag 取材并记录 hash，而不是从第三方 CDN 抓取。 | Release 页面截图、示例排版和第三方镜像结构。 |
| A04 | [Source Han Sans releases](https://github.com/adobe-fonts/source-han-sans/releases) — Adobe Fonts | 2026-08-14 | 官方 Pan-CJK sans release 有语言与格式选择；完整包体量很大，支持按 locale/字重/子集做预算 Gate。 | 官方下载页布局、完整家族包的再包装方式。 |
| A05 | [Adobe Fonts webfont licensing](https://helpx.adobe.com/uk/fonts/using/webfont-licensing.html) — Adobe | 2026-08-14 | Adobe Fonts Web Project 依赖 Adobe embed/CDN；不授予把服务字体文件抽出后自行托管的权利。支持排除“用订阅字体直接放进 `public/fonts`”。 | Adobe embed code、服务 UI、客户项目配置。 |
| A06 | [Add fonts to a website](https://helpx.adobe.com/fonts/using/add-fonts-website.html) — Adobe | 2026-08-14 | Adobe 明确说明服务字体不提供 self-host；East Asian web fonts 由服务动态子集。支持只把该服务当研究证据，不当产品资产来源。 | Adobe Web Project 操作流程、动态子集实现细节与 UI。 |
| A07 | [Adobe font licensing FAQ](https://helpx.adobe.com/in/fonts/using/font-licensing.html) — Adobe | 2026-08-14 | 桌面/印刷/PDF 权利与 web/app/server/custom hosting 权利不同；支持把 print mood 与产品自托管许可分开审计。 | FAQ 原文、Adobe 品牌字体样张与授权界面。 |

## 3. CJK、开放字体与候选家族直接来源（15）

| ID | 直接来源 / publisher | Access | 支持的具体决策 | 不可复制元素 |
| --- | --- | --- | --- | --- |
| C01 | [Noto CJK repository](https://github.com/notofonts/noto-cjk) — Noto Fonts | 2026-08-14 | Noto CJK 与 Source Han 共享核心工程但有 Noto 命名/分发；SC/TC/HK 必须按 `lang` 选择，不可假设“一个中文字形适合所有地区”。 | README specimen、项目 logo 与下载页编排。 |
| C02 | [Noto Serif CJK deployment README](https://github.com/googlefonts/noto-cjk/blob/main/Serif/README.md) — Google Fonts / Noto | 2026-08-14 | 官方列出 region-specific 与 variable 配置；支持 F3-T2 比较“locale 单文件”与“静态分片”而不是拍脑袋选格式。 | 官方文件树和 specimen 图。 |
| C03 | [Noto fonts OFL](https://github.com/notofonts/noto-fonts/blob/main/LICENSE) — Noto Fonts | 2026-08-14 | Noto 系列为 OFL；支持商业数字产品嵌入，但仍须随资产保留许可证与归属记录。 | 许可证原文及字体商标。 |
| C04 | [Using Noto](https://github.com/notofonts/noto-docs/blob/main/docs/website/use.md) — Noto Fonts | 2026-08-14 | 官方说明 Noto 可用于 app、商业与数字输出；支持 Noto/Source Han 作为合法自托管候选，而非 Adobe Fonts 服务字体。 | 官方示例 CSS、站点截图与示例文案。 |
| C05 | [Google Fonts developer overview](https://developers.google.com/fonts) — Google | 2026-08-14 | Google Fonts 中字体以开放许可证提供；支持把 Google Fonts 当来源目录，但最终仍需锁定具体 upstream license 和资产。 | Google Fonts API 代码、页面 UI 与品牌组合。 |
| C06 | [Geist repository](https://github.com/vercel/geist-font) — Vercel | 2026-08-14 | Geist Sans 面向界面可读性，Geist Mono 面向代码/图表；二者为 variable OFL。支持保留 Geist 作为拉丁 support sans/mono，而不是让它假装覆盖 CJK。 | Geist specimen、Vercel 品牌排版与样例页面。 |
| C07 | [Geist OFL](https://github.com/vercel/geist-font/blob/main/LICENSE.txt) — Vercel | 2026-08-14 | 支持继续本地嵌入现有 Geist 资产，并要求字体来源/版本记录进入 F3-T2 manifest。 | 许可证原文、字体名称与商标。 |
| C08 | [Bodoni Moda metadata](https://github.com/google/fonts/blob/main/ofl/bodonimoda/METADATA.pb) — Google Fonts | 2026-08-14 | Bodoni Moda 只有 Latin/Latin-ext 等 subset，variable axes 为 `opsz 6–96`、`wght 400–900`；支持只把它用于拉丁 display，而绝不声称原生 CJK。 | Google Fonts specimen、Bodoni 特定书页复刻与上游宣传文案。 |
| C09 | [Bodoni Moda OFL](https://github.com/google/fonts/blob/main/ofl/bodonimoda/OFL.txt) — Google Fonts | 2026-08-14 | 允许自托管现有 Bodoni Moda；F3-T2 仍需确认当前本地 WOFF2 的版本/来源。 | 许可证文本与 Reserved Font Name 的不当使用。 |
| C10 | [Bodoni Moda upstream](https://github.com/indestructible-type/Bodoni) — indestructible type* | 2026-08-14 | 支持追溯实际设计源而非只看聚合目录；其强烈粗细对比适合大号 editorial display，不适合全角色铺开。 | 上游 specimen、历史样张的具体重绘与项目品牌。 |
| C11 | [IBM Plex repository](https://github.com/IBM/plex) — IBM | 2026-08-14 | Plex 有 Sans/Serif/Mono，并提供 Sans SC/TC 的 web package；支持形成统一、工程感较强的保守候选。 | IBM Carbon/品牌现成组合与官方 specimen。 |
| C12 | [IBM Plex typeface](https://www.ibm.com/design/language/typography/typeface/) — IBM Design Language | 2026-08-14 | Plex 的自然/工程双重气质与多脚本覆盖支持 archive/editorial utility 方向；Mono 应承担数据职责而非装饰。 | IBM 品牌 hierarchy、产品截图和专属版式。 |
| C13 | [IBM type scale](https://www.ibm.com/design/language/typography/type-scale/) — IBM Design Language | 2026-08-14 | IBM 建议 CJK 相对 Latin 做约 95% 的视觉尺寸校正并保持行高；支持把 `0.95` 作为 specimen 假设，而不是未经验证直接写入 token。 | IBM 的完整 type scale、断点值与品牌实现。 |
| C14 | [IBM type basics](https://www.ibm.com/design/language/typography/type-basics/) — IBM Design Language | 2026-08-14 | Plex 需要呼吸空间、合理行长与清晰层级；支持拒绝把 tracking 一律压紧，尤其是正文与 CJK。 | IBM 页面样例、精确行长和品牌用字。 |
| C15 | [IBM Plex Sans SC web package](https://github.com/IBM/plex/tree/master/packages/plex-sans-sc) / [TC package](https://github.com/IBM/plex/tree/master/packages/plex-sans-tc) — IBM | 2026-08-14 | 官方 web 包把 WOFF/WOFF2 拆成 performant glyph subsets，并允许按 weight 启用；支持 Plex 方案的 payload 可控性优于完整 Pan-CJK variable 单文件。 | IBM 的 Sass/CSS 文件组织、包结构与示例代码不直接复制。 |

## 4. 摄影书与编辑设计直接来源（6）

| ID | 直接来源 / publisher | Access | 支持的具体决策 | 不可复制元素 |
| --- | --- | --- | --- | --- |
| E01 | [How to Produce a Photobook](https://aperture.org/editorial/how-to-produce-a-photobook/) — Aperture | 2026-08-14 | 书的尺寸、纸张、装订、图像 sequence 与设计互相制约；支持“字体是节奏编辑器，不是覆盖在照片上的品牌皮肤”。 | 文章照片、书页 spread、受访者项目与引语。 |
| E02 | [How Not to Design a Photobook](https://aperture.org/editorial/design-photobook/) — Aperture | 2026-08-14 | 编辑、图片选择、sequence、尺寸与 reproduction 先于表面造型；支持 typography 不得替弱 topology 制造差异。 | Martin Parr 等书页、受访者原话和具体设计解法。 |
| E03 | [What is a Photo-Text Book?](https://aperture.org/editorial/pbr-photo-text-book/) — Aperture | 2026-08-14 | 文字与摄影可具有同等叙事权，也可能缩窄或增加图像歧义；支持 Editorial preset 强、Quiet preset 弱，而非每页同一声量。 | 文章中的历史案例、图像与具体 photo-text 配对。 |
| E04 | [The Designer Translating Photographers’ Visions into Inventive Books](https://aperture.org/editorial/the-designer-translating-photographers-visions-into-inventive-books/) — Aperture | 2026-08-14 | Typography、材料、binding、layout 共同形成书的识别；支持用 spine/folio/index 等微型角色建立连续性。 | 受访设计师项目、cyan 处理、书脊与 spread 的具体外观。 |
| E05 | [Type as Image and Lettering as Message](https://eyeondesign.aiga.org/making-rules-breaking-rules-the-art-of-magazine-typography/) — AIGA Eye on Design | 2026-08-14 | 杂志字体可以成为图像，但这种高声量应只在明确 editorial/display 职责中出现；支持淘汰“所有角色都 Moda 化”。 | 杂志 masthead、定制字形、页面构图和品牌独占表达。 |
| E06 | [PhotoBook Awards shortlist selections](https://aperture.org/editorial/announcing-the-paris-photo-aperture-foundation-photobook-awards-shortlist-selections/) — Aperture | 2026-08-14 | 评审把 selection、sequence、scale、typography、materials 视为一个整体；支持最终 Gate 必须回到真实 recipe 内容矩阵，而不是孤立 font specimen。 | 入围书封、内页、摄影作品与评委原话。 |

## 5. 来源覆盖核算

| 要求 | 实际 | 结论 |
| --- | ---: | --- |
| 直接来源总数 ≥ 20 | 28 | PASS |
| domains / official projects ≥ 8 | Adobe Fonts、Adobe Help、Noto、Google Fonts、Vercel Geist、Bodoni upstream、IBM Plex、IBM Design Language、Aperture、AIGA，共 10 组 | PASS |
| Adobe ≥ 4 | A01–A07，共 7 | PASS |
| CJK / licensing ≥ 6 | A01–A07、C01–C05、C11–C15，共 17 | PASS |
| photography / editorial ≥ 5 | E01–E06，共 6 | PASS |

## 6. 直接影响 F3-T1 的结论

1. Adobe Fonts 订阅服务不是本产品的 self-host source；Source Han/Noto 与 Adobe Fonts 服务必须分开看待。
2. Bodoni Moda 是可信的拉丁 display 候选，但没有 CJK；若用它，必须显式指定 CJK serif partner，并在混排 specimen 中接受脚本差异审判。
3. Source Han 与 Noto CJK 本质上是同一核心工程的不同命名/分发路径。产品只应选择并记录一条 provenance，不应为了“覆盖”同时打包两套相同核心字形。
4. SC、TC、HK 是 locale 字形选择问题，不是单纯 Unicode coverage 问题；`lang` 路由是字体系统职责。
5. IBM Plex SC/TC 的官方 web subset 包使它成为 payload/工程风险更可控的保守方案，但其全 sans 气质不如 serif/sans duplex 具有摄影书的编辑张力。
6. 摄影书参考共同支持“先有编辑职责与图像节奏，再有字体表情”。字体 preset 只能强化 family 职责，不能把同一 topology 伪装成不同 Recipe。

## 7. 证据未覆盖与 F3-T2 必须实测项

- 本阶段未下载或解包任何候选字体，因此 Source Han/Noto 与 IBM Plex 的最终 WOFF2 文件名、压缩后字节数、glyph count、hash 仍未锁定。
- 本文给出的 payload 数字若出现，均是采购预算区间，不是实测结果；F3-T2 必须在选定固定 release 后生成 asset manifest。
- 需要用真实 Chrome/字体渲染确认 Bodoni Moda 与 CJK serif 的 baseline、标点挤压、数字、英文大写与汉字灰度；本文不以静态文献代替视觉检验。
- `opsz`、CJK 95% scale、font synthesis、fallback 顺序与 unicode-range 分片都只是下一阶段实验变量，未获用户批准前不进入产品 token。
