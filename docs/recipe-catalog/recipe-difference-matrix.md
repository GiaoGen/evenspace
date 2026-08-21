# Recipe Difference Matrix — 35 formal and proposed designs

> 范围：15 项 active + 20 项 proposed-design；矩阵是对称的完整 35×35 矩阵，去除对角线后有 **595** 个唯一配对。最低分 **4/10**，无低于门槛项。

## 方法

每对按 12 项审计：scope、topology、photo count、scale hierarchy、density、reading path、whitespace/bleed、text responsibility、Photo Note relationship、Color Field responsibility、page-side behavior、spread evidence。评分为实质差异计数的归一化结果：scope/evidence/topology 的结构改变优先；名称、镜像、轻微边距或单纯换色不计分。p/s scope、对照数字和各 brief 的 topology 为审计输入。

## Key

| Code | Recipe |
| --- | --- |
| HF | Held Field |
| SE | Scale Echo |
| HB | Horizon Bridge |
| LS | Lead Story |
| EA | Evidence Aside |
| AR | Across Record |
| TR | Twin Register |
| TL | Twelve-up Ledger |
| CR | Cross Register |
| ET | Edge Thrust |
| DS | Drop Sequence |
| GS | Gutter Sweep |
| EF | Entry Field |
| FB | Four Beat |
| CF | Cross-field Note |
| CP | Center Pause |
| FC | Far Caption |
| BS | Bleed Silence |
| DW | Distant Witness |
| FCa | Fact Caption |
| VR | Vertical Report |
| EI | Evidence Index |
| GR | Gutter Report |
| QL | Quadrant Ledger |
| VS | Vertical Strip |
| SA | Specimen Atlas |
| CB | Contact Band |
| RC | Rise Column |
| SB | Switchback |
| CV | Converge |
| TN | Trajectory Note |
| TD | Title Dock |
| DZ | Dual Zone |
| VB | Vertical Beats |
| SS | Spectrum Sweep |

## Complete 35×35 matrix

| # | HF | SE | HB | LS | EA | AR | TR | TL | CR | ET | DS | GS | EF | FB | CF | CP | FC | BS | DW | FCa | VR | EI | GR | QL | VS | SA | CB | RC | SB | CV | TN | TD | DZ | VB | SS |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| HF | — | 5 | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 10 | 8 | 8 | 10 | 4 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| SE | 5 | — | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 8 | 8 | 10 | 6 | 4 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| HB | 7 | 7 | — | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 10 | 8 | 8 | 8 | 8 | 6 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 |
| LS | 7 | 7 | 9 | — | 5 | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 10 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 4 | 8 | 8 | 10 |
| EA | 7 | 7 | 9 | 5 | — | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| AR | 9 | 9 | 7 | 7 | 7 | — | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 10 | 10 | 8 | 8 | 8 | 8 | 6 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 |
| TR | 7 | 7 | 9 | 7 | 7 | 9 | — | 5 | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 8 | 10 | 8 | 8 | 8 | 10 | 4 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| TL | 7 | 7 | 9 | 7 | 7 | 9 | 5 | — | 7 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 7 | 10 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| CR | 9 | 9 | 7 | 9 | 9 | 7 | 7 | 7 | — | 9 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 10 | 10 | 10 | 8 | 8 | 8 | 8 | 6 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 |
| ET | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | — | 5 | 7 | 7 | 7 | 9 | 7 | 7 | 4 | 9 | 7 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 | 8 | 8 | 8 | 10 |
| DS | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 5 | — | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 8 | 10 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 | 8 | 8 | 8 | 10 |
| GS | 10 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 7 | 7 | 7 | — | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 8 | 10 | 10 | 10 | 8 | 8 | 8 | 8 | 6 | 10 | 10 | 10 | 8 |
| EF | 8 | 8 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | — | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 4 | 6 | 6 | 8 |
| FB | 8 | 8 | 10 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 5 | — | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 6 | 6 | 6 | 8 |
| CF | 10 | 10 | 8 | 10 | 9 | 7 | 9 | 9 | 7 | 9 | 9 | 7 | 7 | 7 | — | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 9 | 9 | 10 | 8 | 10 | 10 | 10 | 8 | 8 | 8 | 8 | 6 |
| CP | 4 | 6 | 8 | 8 | 8 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | — | 5 | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 10 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| FC | 6 | 4 | 8 | 8 | 8 | 10 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 9 | 5 | — | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| BS | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 7 | 9 | 4 | 7 | 9 | 7 | 7 | 9 | 5 | 5 | — | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 8 | 8 | 10 | 8 | 8 | 8 | 10 |
| DW | 8 | 8 | 6 | 10 | 10 | 8 | 10 | 10 | 7 | 9 | 9 | 7 | 9 | 9 | 7 | 7 | 7 | 7 | — | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 9 | 9 | 10 | 8 | 10 | 10 | 10 | 8 |
| FCa | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 7 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | — | 5 | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 10 | 8 | 8 | 8 | 10 |
| VR | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 7 | 9 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | — | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 8 | 8 | 8 | 10 |
| EI | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 9 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | 5 | — | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 8 | 8 | 10 |
| GR | 10 | 10 | 8 | 8 | 8 | 6 | 10 | 10 | 8 | 10 | 10 | 8 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 7 | 7 | 7 | — | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 9 | 9 | 10 | 8 |
| QL | 8 | 8 | 10 | 8 | 8 | 10 | 4 | 6 | 8 | 8 | 8 | 10 | 8 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | — | 5 | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 10 |
| VS | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | — | 5 | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 |
| SA | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 10 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | 5 | — | 7 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 |
| CB | 10 | 10 | 8 | 10 | 10 | 8 | 8 | 8 | 6 | 10 | 10 | 8 | 10 | 10 | 8 | 10 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 7 | 7 | 7 | — | 9 | 9 | 9 | 7 | 9 | 9 | 9 | 7 |
| RC | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | — | 5 | 5 | 7 | 7 | 7 | 7 | 9 |
| SB | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | — | 5 | 7 | 7 | 7 | 7 | 9 |
| CV | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | 5 | — | 7 | 7 | 7 | 7 | 9 |
| TN | 10 | 10 | 8 | 10 | 10 | 8 | 10 | 10 | 8 | 8 | 8 | 6 | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 7 | 7 | 7 | — | 9 | 9 | 9 | 7 |
| TD | 8 | 8 | 10 | 4 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 4 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 7 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | — | 5 | 5 | 7 |
| DZ | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 9 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | — | 5 | 7 |
| VB | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 8 | 8 | 10 | 6 | 6 | 8 | 8 | 8 | 8 | 10 | 8 | 8 | 8 | 10 | 7 | 7 | 7 | 9 | 7 | 7 | 7 | 9 | 5 | 5 | — | 7 |
| SS | 10 | 10 | 8 | 10 | 10 | 8 | 10 | 10 | 8 | 10 | 10 | 8 | 8 | 8 | 6 | 10 | 10 | 10 | 8 | 10 | 10 | 10 | 8 | 10 | 9 | 9 | 7 | 9 | 9 | 9 | 7 | 7 | 7 | 7 | — |

## All threshold-critical pairs (score 4)

| Pair | Distinguishing dimensions that keep it at 4, not a cosmetic difference |
| --- | --- |
| HF ↔ CP | Both Quiet, single-image, low-density page; CP has a materially smaller square frame, symmetrical four-sided pause and no auxiliary lane, while HF is a larger 3:4 field with different scale/whitespace and ratio responsibility. |
| SE ↔ FC | Both Quiet page with optional caption relation; SE is diagonal two-photo scale echo, FC is one-photo far-distance caption with a dedicated remote text destination—count/topology/route/negative-space are all different. |
| LS ↔ TD | Both one-image authored-entry page; LS is paper-led editorial title/deck above photograph, TD makes a two-zone accent dock the entry and retains a color-off positional hierarchy—family, color responsibility, surface topology and entry order differ. |
| ET ↔ BS | Both one-photo high-coverage page; ET is one-sided horizontal edge thrust with a terminal paper endpoint, BS is four-edge non-directional full-bleed stillness—path, bleed responsibility, pace and family identity differ. |
| EF ↔ TD | Both single photo plus upper field; EF has a non-text single accent threshold and photo-first reading, TD has title/deck as required author-owned entry in a two-zone system—text responsibility, color responsibility, scale and reading order differ. |
| TR ↔ QL | Both Grid/Contact page and exact four photos; TR is a vertical 2-item stack for A/B comparison while QL is a 2×2 matrix for four-way scan—topology, row/column count, reading path and index responsibility differ. |

## Gate result

- 595/595 unique pairs are present.
- 595/595 scores are ≥4; minimum = 4.
- Grayscale and No-label review uses topology, scale, whitespace and path; Chromatic has an additional color-off review in its brief/boards.
- The six score-4 pairs above were retained because each has at least four independently observable, non-cosmetic distinctions; all other pairs score 5–10.

