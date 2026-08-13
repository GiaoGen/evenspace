# Phase F3-T2 Typography Asset, Specimen & Runtime Reality Record

> 状态：实现与自动化/浏览器技术验证完成；等待用户完成 S1/S2 specimen 与 9 个既有 Anchor 的视觉 Gate。未恢复 F3-B4，未激活任何 Recipe。
> 日期：2026-08-14

## 1. 用户裁决

- F3-T1 D01–D08 与 P1/P2/P3 已批准。
- 附加裁决已编码为硬边界：P1 只有 `title` 使用 serif；`deck` 固定使用 support sans。
- `locale` 是 `ZineDraft` 与每个 Reader page 的文档级语义，合法值只有 `en`、`zh-Hans`、`zh-Hant`。
- Zine canvas 的 font stack 只含仓库内字体；覆盖不足会生成 `unsupported-glyph`，不会静默落到 OS CJK/emoji 字体。

## 2. 固定资产与 provenance

### S1 Duplex Photo-Essay（产品主路由）

| 资产组 | 固定 upstream | 实际 WOFF2 bytes | 运行职责 |
| --- | --- | ---: | --- |
| Geist + Geist Mono + Bodoni Moda | 既有仓库资产，SHA-256 已锁入 manifest | 78,200 | Latin sans / mono / P1 title display |
| Noto Sans SC + Noto Serif SC | Google Fonts commit `73fc2ff52147e34a74804b500cf89ca219eac55d` | 18,814,500 | `zh-Hans` sans + P1 title serif |
| Noto Sans TC + Noto Serif TC | 同上 | 13,081,440 | `zh-Hant` 与 `en` 文档中的 CJK sans + P1 title serif |
| **S1 全部仓库资产** | OFL-1.1 | **31,974,140** | 浏览器按实际 locale/preset/family 使用，不做全量 preload |

Noto 原始 variable TTF 经 fontTools 4.63.0 + Brotli 1.2.0 转成 WOFF2；源码 bytes/hash 与产物 bytes/hash 均在 [`ZINE_FONT_ASSETS`](../../features/zine/model/zine-typography.ts) 中。OFL notice 为 `public/fonts/OFL-Noto-CJK.txt`。

### S2 Plex Unified Archive（唯一锁定 fallback / 开发 specimen）

| 资产组 | 固定 upstream | 实际 WOFF2 bytes | 运行职责 |
| --- | --- | ---: | --- |
| Plex Sans Latin 400/500/600/700 + Plex Mono 500/600 | IBM Plex commit `bf260093582f04622aacc1e9f9ca604d7ccd0c42` | 360,832 | Latin support / metadata |
| Plex Sans SC 400/500/600/700 | 同上 | 15,665,560 | `zh-Hans` fallback candidate |
| Plex Sans TC 400/500/600/700 | 同上 | 10,280,168 | `zh-Hant` fallback candidate |
| **S2 全部仓库资产** | OFL-1.1 | **26,306,560** | 只在 S2 specimen 或未来显式切换时使用 |

S2 的 CJK 不提供本方案所需 variable weight，因此同一完整角色页可能请求四个静态实例。P2/P3 中 S1 单一 Noto Sans variable 只需 7,782,256 B（SC）或 5,424,076 B（TC）；这项实测不支持把 S2 因“统一家族”误判为必然更轻。S2 notice 为 `public/fonts/plex-fallback/OFL-IBM-Plex.txt`。

## 3. Runtime 结构

- Recipe 只能选择 `typographyPreset`，不能注入 `fontFamily` 或 CSS。
- P1/P2/P3 的七 role 矩阵由 `RECIPE_TYPOGRAPHY_PRESETS` 拥有；Quiet→P2、Editorial→P1、Grid/Contact→P3。
- Render Plan 输出 `presetId`、`fontRole`、`locale` 与同源 layout metrics；CSS 使用同一份 metrics。
- CJK tracking 固定钳制为 `0`，CJK 不执行 uppercase；`font-synthesis: none` 禁止伪粗体/伪斜体。
- 字体覆盖由 `scripts/generate-zine-font-coverage.py` 从实际 WOFF2 生成紧凑 range index。当前 index 覆盖 S1 与 S2 的 21 个 WOFF2 文件。
- `NameStep` 提供文档语言/地区字形选择；locale 进入 Draft、manual structure key、Reader page、`lang` 与 Renderer environment。

## 4. Specimen reality

开发路由：`/zine/typography-specimen`。

- 固定 28 条 T01–T28 内容、3 个 preset、S1/S2、Editor/Reader，共 84 张 specimen card、336 个真实 Renderer canvas。
- S1/S2 使用相同文案、slot geometry、role、size、weight、line-height、tracking 与 transform。
- 60 个测试文件 / 315 项测试通过；其中矩阵测试逐项验证 28 × 3 × 2 systems 的 Definition、coverage、line estimate 与 Editor/Reader Render Plan parity。
- 360px 浏览器 viewport：`scrollWidth === clientWidth`，无横向溢出；84 cards / 336 canvases；无 framework overlay 或 console warning/error。
- 1440px viewport：168 个 system/preset specimen pair 的 computed family、font-size、line-height、letter-spacing 与实际 line rect 数 Editor/Reader 零差异。
- P1 实测路由：繁中 `title` → `Noto Serif TC`；繁中 `deck` → `Noto Sans TC`。S2 同一 title → `IBM Plex Sans` + `IBM Plex Sans TC`。
- T28 在三套 preset、两系统、两模式形成 12 个预期 invalid canvas；缺字 code point 被显示，系统字体 fallback 禁止。

## 5. 自动化 Gate

- `npm run typecheck`：PASS
- `npm run lint -- --max-warnings=0`：PASS
- `npm test`：60 files / 315 tests PASS
- `npm run build`：PASS；`/zine/typography-specimen` 静态生成
- 本地真实浏览器：mobile/desktop layout、font-ready final routing、Editor/Reader parity、error overlay/console 检查 PASS

## 6. 尚未由自动化替代的用户视觉 Gate

用户仍需在开发页比较 S1/S2 的 T02、T04、T06、T15、T16、T23–T26，并回到 `/zine/preview-matrix` 复核 Quiet、Editorial、Grid/Contact 的 9 个已实现 Anchor。重点是照片主导、繁简字形、title/deck 灰度、xs folio/index 与长 Note；不是再次开放任意选字。

在用户通过上述 Gate 前：F3-T2 不标记最终视觉完成，Grid/Contact Typography Gate 不重开，F3-B4/F3-B5 保持暂停。

**Phase F3-T2 Typography Reality 用户视觉 Gate：STOP。**
