# Phase F3-T1 Typography Specimen Matrix

> 状态：F3-T2 runtime/specimen 已实现并通过自动化与本地浏览器技术检查；等待用户视觉 Gate。实现证据见 [F3-T2 Typography Runtime Reality Record](./f3-t2-typography-runtime-reality-record.md)。
> 目的：用相同内容和几何比较 S1/S2，而不是用各自最有利的 moodboard 文案比较。
> 关联：[Typography Art Direction](./typography-art-direction.md) · [Source Dossier](./typography-source-dossier.md)

## 1. 比较纪律

F3-T2 必须先锁字体 release 与 asset manifest，再用下表内容生成 Editor/Reader 同源 specimen。S1 与 S2 使用完全相同的 role、normalized size、weight、line-height、tracking、transform、slot rect 与照片；只改变受控 font routing。禁止为了让某候选通过而缩短文案、放大 Slot、改变照片或单独覆盖 CSS。

每个 cell 至少记录：system、preset、role、script、source string ID、canvas、computed family、实际 weight、font-ready 前/后行数、overflow、截图、Editor/Reader parity、结论。没有真实 font-ready 结果的 cell 只能记 `not-run`，不能记 PASS。

## 2. 固定内容库

以下文字为本项目自写测试内容，不复制任何参考出版物。

| ID | Script / 压力 | Role / 目标 | 固定内容 |
| --- | --- | --- | --- |
| T01 | 繁中短标题 | title，1–2 行 | 雨停之後，街角仍在發亮 |
| T02 | 繁中长标题 | title，压力至 60 字/3 行 | 港口最後一班車離站以前，我們沿著防波堤記下風向、潮聲與仍未熄滅的窗 |
| T03 | 简中短标题 | title，1–2 行 | 雨停之后，街角仍在发亮 |
| T04 | 简中长标题 | title，压力至 60 字/3 行 | 港口最后一班车离站以前，我们沿着防波堤记下风向、潮声与仍未熄灭的窗 |
| T05 | English display | title，大小写与高反差 | After the Rain, the Corner Kept Shining |
| T06 | 混排标题 | title，baseline/数字/标点 | 台北 05:40 — Notes Before First Light |
| T07 | 繁中 deck | deck，至 76 字/2 行 | 從清晨市場到末班渡輪，這組影像追蹤一座城市如何在潮濕、噪音與等待之間重新組織自己的節奏。 |
| T08 | 简中 deck | deck，至 76 字/2 行 | 从清晨市场到末班渡轮，这组影像追踪一座城市如何在潮湿、噪音与等待之间重新组织自己的节奏。 |
| T09 | English deck | deck，标点/长词 | A photographic index of thresholds, detours, and small negotiations before the city fully wakes. |
| T10 | 繁中 caption | caption，短事实 | 基隆，仁愛市場入口，05:43。 |
| T11 | 简中 caption | caption，短事实 | 基隆，仁爱市场入口，05:43。 |
| T12 | 混排 caption | caption，数字/符号 | Frame 07／ISO 800／1⁄125 sec／雨後 |
| T13 | 繁中 note 60 | note，Evidence 60/4 | 攤販把塑膠布往上捲，水沿著鐵架落下。照片右側的手只出現一瞬，卻標記了市場真正開始工作的時間。 |
| T14 | 简中 note 60 | note，Evidence 60/4 | 摊贩把塑料布往上卷，水沿着铁架落下。照片右侧的手只出现一瞬，却标记了市场真正开始工作的时间。 |
| T15 | 繁中 note 120 | note，Across 120/4 | 這一頁不是事件的總結，而是兩張照片之間的證詞：左頁記錄等待的人，右頁記錄離開後留下的椅子。閱讀順序可以往返，但人物、時間與地點的關係不能因換行而消失。 |
| T16 | 简中 note 120 | note，Across 120/4 | 这一页不是事件的总结，而是两张照片之间的证词：左页记录等待的人，右页记录离开后留下的椅子。阅读顺序可以往返，但人物、时间与地点的关系不能因换行而消失。 |
| T17 | English note | note，长词/标点 | The note connects two photographs without explaining them away: one records the waiting body; the other, the chair left behind. |
| T18 | 强制换行 | note，newline 计数 | 第一段證詞留在左頁。\n第二段只補充時間，不替照片下結論。 |
| T19 | Latin label | label，uppercase/wide | FIELD NOTE 07 |
| T20 | 繁中 label | label，不 uppercase/不逐字拉宽 | 現場筆記 07 |
| T21 | 简中 label | label，不 uppercase/不逐字拉宽 | 现场笔记 07 |
| T22 | folio | folio，最小数字 | 0048 — 0049 |
| T23 | Latin index | index，mono 压力 | KR-07 / 05:43 / N25°08′ |
| T24 | 繁中 index | index，18 字/1 行 | 市場入口／雨／手推車／清晨 |
| T25 | 简中 index | index，18 字/1 行 | 市场入口／雨／手推车／清晨 |
| T26 | 标点样张 | all，标点与括号 | 「潮汐」、《候車亭》——（05:40）… 30％／A–B |
| T27 | 易混字形 | all，辨识 | 0O 1Il 2Z 5S 8B；日曰、己已巳、未末、土士 |
| T28 | 缺字/emoji | fallback hard fail | 𠮷野家・髙島・臺灣・摄影・🚌 |

T28 不是要求 Zine 字体绘制 emoji。用户附加裁决禁止 Zine 文档使用随机系统字体 fallback，因此 T28 现在是预期的 `unsupported-glyph` hard fail：报告实际 code point，并阻止该 canvas 被当作视觉 PASS。

## 3. Preset × role 基础矩阵

每个 preset 的七 role 都要测，不得只测 title。`S1 × 3 presets × 7 roles × minimum scripts` 是最小核心；S2 使用同一 metrics 重复。S3 已在 F3-T1 因 CJK hard fail 淘汰，只保留一张失败说明，不进入全矩阵。

| Preset | Role | 必测内容 ID | 必测判断 |
| --- | --- | --- | --- |
| P1 `photoessay-display` | title | T01–T06、T26–T28 | Bodoni/Source Han Serif baseline、3 行上限、引号/破折号、font-ready reflow |
| P1 | deck | T07–T09、T26 | 2 行压力、serif 灰度、长英文与中文标点 |
| P1 | label | T19–T21 | uppercase 只触发 Latin；CJK tracking 不被 `.08em` 机械放大 |
| P1 | folio | T22、T26 | xs 可辨识、数字等宽感、破折号与页码对齐 |
| P1 | caption | T10–T12、T27 | 小号事实文本、数字/分数、易混字形 |
| P1 | note | T13–T18、T28 | 60/4、120/4、newline、罕见字 fallback；必须使用 sans 路由 |
| P1 | index | T23–T25、T27 | Latin mono 与 CJK sans 的 baseline、18 字/1 行 |
| P2 `photoessay-field` | title | T01–T06、T26 | sans title 仍有层级，但不靠过重字重堵塞留白 |
| P2 | deck | T07–T09 | 中英文两行容量与灰度 |
| P2 | label | T19–T21 | 同 P1；验证脚本 transform policy |
| P2 | folio | T22 | 最小字号与外角定位不变 |
| P2 | caption | T10–T12 | caption 不跳行、不侵入图片 |
| P2 | note | T13–T18 | open line-height 是否改善长 Note，且不突破 slot 高度 |
| P2 | index | T23–T25 | 扫描性与 CJK 紧凑性 |
| P3 `photoessay-register` | title | T01、T03、T05、T06 | `.024` 小标题不与 contact sheet 争入口 |
| P3 | deck | T07–T09 | 500 weight 在中英文中不过黑 |
| P3 | label | T19–T21 | Latin mono/CJK sans 接缝与宽 tracking |
| P3 | folio | T22 | Twelve-up/Cross Register 的最小页码 |
| P3 | caption | T10–T12 | 多格相邻 caption 的稳定节奏 |
| P3 | note | T13–T18 | Mono 绝不渗入长 Note；Cross Register 4 条 note 一致 |
| P3 | index | T23–T27 | 18 字/1 行、编号、坐标、易混字形与标点 |

## 4. Canvas 与设备矩阵

| View ID | 条件 | 目的 | Hard fail |
| --- | --- | --- | --- |
| V01 | 3:4 page canvas，240 CSS px 宽 fallback | 对齐现行 normalized typography 最小基准 | 任一合法内容因字体切换越出 Slot；xs 无法辨识 |
| V02 | 3:4 page canvas，360 CSS px | 常见 mobile single-page focus | title/deck 入图；note 超行；font-ready 发生显著跳动 |
| V03 | 3:4 page canvas，768 CSS px | tablet/editor working size | Editor/Reader 行数或 baseline 不同 |
| V04 | two-page spread，mobile fit width | 验证 spread 缩放后的 folio/index 与装订区 | Cross Register 左右职责不可读；gutter 附近文字被裁 |
| V05 | two-page spread，desktop | 验证混排灰度、跨页连续性 | 两页 computed font routing 不一致 |
| V06 | 200% browser zoom / OS text scaling representative | 无障碍压力观察，不改变 recipe geometry | 关键信息消失且无可访问文本路径；渲染崩溃 |

V06 不要求固定画布在视觉上无限容纳放大文字，但必须记录产品的可访问文本读取路径；不能把文字裁掉而不提供等价内容。

## 5. Anchor 回归矩阵

| Anchor / 场景 | Preset | 固定压力 | 必须保持 |
| --- | --- | --- | --- |
| `editorial-lead-story-v1` | P1 | title 60/3（T02/T04）+ deck 76/2（T07/T08） | 不侵入照片；font-ready 前后仍在既有 max lines |
| `editorial-evidence-aside-v1` | P1 | note 60/4（T13/T14） | 窄 evidence 图仍可辨；note 不因 sans partner 改成 5 行 |
| `editorial-across-the-record-v1` | P1 | note 120/4（T15/T16） | 左右职责与装订关系不变；长 Note 不越界 |
| `quiet-scale-echo-v1` | P2 | 现有最长 Note + T15/T16 | Quiet 灰度不变黑；open line-height 不吃掉留白 |
| `grid-contact-twin-register-v1` | P3 | T19–T25 | A/B 与索引扫描成立；字体不把它变成 Editorial |
| `grid-contact-twelve-up-ledger-v1` | P3 | T22 + xs index T23–T25 | 12 格主体与最小 folio/index 仍可辨识 |
| `grid-contact-cross-register-v1` | P3 | 4 条 T24/T25，18 字/1 行；长 note T15/T16 | 每条绑定顺序与一行容量不变；note 仍用 sans |
| `dynamic-drop-sequence-v1` | P2 | T19/T22 | 10%/修订后动作切片的可辨性不由字体“补救” |
| `chromatic-four-beat-v1` | P2 | xs index T23–T25，color-on/off | 颜色关闭后 topology 可辨；文字对比与小号可读 |
| `chromatic-cross-field-note-v1` | P2 | 1/11/12/90 字与 T15/T16 | destination 几何、左右 focus 与短/长 note 职责不变 |

几何、photo area、文本容量上限都是不可移动基准。若候选系统要求缩小字体、扩大 Slot 或降低字符上限才能通过，应判候选失败，而不是回写旧 Anchor。

## 6. Font routing 与 locale 组合

| Locale ID | HTML lang | 文本 | S1 预期 | S2 预期 |
| --- | --- | --- | --- | --- |
| L01 | `en` | T05/T09/T17/T19/T23 | Bodoni 或 Geist/Geist Mono 按 role | Plex Sans/Plex Mono 按 role |
| L02 | `zh-Hant` | T01/T02/T07/T10/T13/T15/T20/T24 | Source Han Serif TC / Sans TC | Plex Sans TC |
| L03 | `zh-Hans` | T03/T04/T08/T11/T14/T16/T21/T25 | Source Han Serif SC / Sans SC | Plex Sans SC |
| L04 | `zh-Hant` + inline English | T06/T12/T26 | 每个 glyph 用预期 partner，baseline 连续 | Plex superfamily 路由连续 |
| L05 | 缺失 `lang` | T06/T26/T28 | 记录保守默认与 warning；不得随机随 OS | 同左 |
| L06 | nested `lang` override | 繁中段内一段简中/英文 | inline span 只切需要的 script/locale | 同左 |

L05 通过不代表缺失 `lang` 可以长期接受；它只是保证错误状态可诊断且不会按用户操作系统产生不可复现结果。

## 7. 加载与布局稳定矩阵

| State | 操作 | 记录 | PASS |
| --- | --- | --- | --- |
| F01 cold | 清空字体缓存后进入单页 | 首次 paint family、行数、CLS/视觉位移、资产请求 | 照片先显示可接受；文本不越界；最终 family 正确 |
| F02 warm | 缓存命中后重载 | 行数与截图 | 与 cold final 完全同版 |
| F03 offline-after-install | 已缓存字体后断网 | 实际 family 与 missing requests | 已缓存 Reader 可复现；不偷偷落 OS CJK |
| F04 failed asset | 人为让一个 CJK asset 404 | diagnostic、fallback family、可读性 | 清楚失败且保持可读；不得静默通过视觉 Gate |
| F05 locale switch | SC↔TC↔EN | 加载资产、旧资产保留、reflow | 路由正确，无整页崩溃；最终 line-fit 重新诊断 |
| F06 Editor/Reader | 同一 Application 两视图 | computed family、line count、overflow | 版面数据与最终行数一致，Reader 无编辑层干扰 |

## 8. Asset manifest 模板

F3-T2 每个实际字体文件必须填写一行；本阶段禁止用预算区间冒充该表。

| field | required value |
| --- | --- |
| preset/system | S1 或 S2；P1/P2/P3 中的职责 |
| family/postscript name | 字体内部实际名称 |
| local filename | 固定且可审计的 `.woff2` 文件名 |
| upstream URL | 官方 release/tag 的直接 URL |
| upstream version/commit | 不用 `latest` |
| SHA-256 | 下载后计算 |
| license + bundled notice | OFL 文件路径、Reserved Font Name 处理 |
| locale/script | Latin / SC / TC / shared symbols |
| weight/style/axes | 只列真实提供的实例 |
| unicode-range/glyph shard | 明确分片职责；避免重复覆盖 |
| compressed bytes | 文件实测；同时给 locale/preset subtotal |
| preload/lazy rule | 哪个页面条件触发 |
| fallback order | 明确到 generic family；禁止含糊的“系统中文字体” |

## 9. 判定规则

### 9.1 Hard fail

- 许可或 provenance 不清；Adobe Fonts 服务文件被当作 self-host 资产。
- `zh-Hant`/`zh-Hans` 路由错误，或产品结果依赖用户 OS 的 CJK 默认字体。
- 合法既有内容超过 max lines、侵入照片或改变 Slot 几何。
- Editor/Reader 最终 computed font 或行数不同。
- xs folio/index 在 V01/V02 失去可辨识性。
- P1 的 Bodoni 被用于 caption/note/index，或 P3 的 mono 被用于长 CJK/Latin note。
- font-ready 后 title 从合法 3 行变 4 行、deck 从 2 行变 3 行，或 note 越界。
- S1 payload 无 manifest/加载策略，或只能通过删掉 CJK partner 才能达标。

### 9.2 评分（100）

通过 hard fail 后，按 Art 25、CJK 20、Roles 15、Read/fit 15、License 10、Payload 10、Contract 5 复评。每个扣分必须链接到具体 specimen cell 或 manifest 行。S1 若低于 80 或出现 hard fail，自动转测已锁定的 S2；不能临时引入第四字体系统。

### 9.3 用户视觉检查最小清单

用户至少比较 S1/S2 的 T02、T04、T06、T15、T16、T23–T26，在 V02/V04/V05 中查看 P1/P2/P3，并复核 Lead、Evidence、Across、Scale Echo、Twelve-up、Cross Register、Four Beat。重点不是“哪张标题图更漂亮”，而是七 role 是否各守职责、照片是否仍主导、繁简中英是否同权、长内容是否稳定。

## 10. F3-T2 当前 Gate

F3-T1 D01–D08 与 P1/P2/P3 已由用户批准。开发路由现生成 84 张 card / 336 个真实 Renderer canvas；自动化验证 Definition、coverage、line-fit 与 Editor/Reader Render Plan parity，本地浏览器验证 mobile/desktop final computed routing。T28 按新裁决显式失败。用户仍需完成第 9.3 节视觉检查，并复核 9 个已实现 Anchor。

**Phase F3-T2 Typography Reality 用户视觉 Gate：STOP。**
