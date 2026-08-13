# Phase F3-B1 — Quiet Family Draft Implementation Record

> 实施日期：2026-08-13
> 状态：代码与自动化 Gate 完成；用户已完成 Quiet Preview Matrix 人工视觉检查并通过，F3-B1 Gate 正式通过。三个条目仍为 `draft`，未进入正式菜单。

## F3-B1 Gate — Quiet 用户视觉批准

- 用户已完成 Quiet Preview Matrix 的人工视觉检查并通过。
- `quiet-held-field-v1`、`quiet-scale-echo-v1` 与 `quiet-horizon-bridge-v1` 继续保持 `draft`，没有激活或加入正式菜单。
- Quiet 的自动化 Gate 结果保持不变：54 个测试文件 / 277 项测试、typecheck、零警告 lint、production build 与 `git diff --check` 全部通过。
- 当前 Anchor 实现进度为 **3/15**；本 Gate 授权进入 F3-B2 Editorial。

## 1. 实施范围

本批只把已获批准的三个 Quiet Anchor 转换为正式数据驱动实现：

- `quiet-held-field-v1`
- `quiet-scale-echo-v1`
- `quiet-horizon-bridge-v1`

没有修改已批准的 scope、照片数量、Slot ID、Slot rect、Note relation、Theme Palette 或 spread evidence；没有新增 Quiet 专用 Renderer JSX/CSS/className/组件分支；没有实现 Editorial、Grid/Contact、Dynamic、Chromatic 或 35/60 项扩展。

审计表中的临时 Slot 简称已修正为 Brief 的正式 ID：`photo-primary`、`photo-scene`、`photo-echo`、`photo-horizon`。

## 2. Definition 与 Registry 结构

### 2.1 文件职责

| 文件 | 单一职责 |
| --- | --- |
| [`quiet-recipe-definitions.ts`](../../features/zine/model/quiet-recipe-definitions.ts) | 三个 Quiet formal Definition、稳定 ID 与集中 Quiet neutral theme。 |
| [`recipe-definition-registry.ts`](../../features/zine/model/recipe-definition-registry.ts) | 单向汇总 Contract 内的 legacy/base/Phase D Definitions 与 formal family Definitions；提供 runtime exact-ref lookup。 |
| [`recipe-contract.ts`](../../features/zine/model/recipe-contract.ts) | 继续只拥有 schema、validator、Compatibility、Application 与通用函数；不反向导入 Quiet，避免循环依赖。 |
| [`recipe-catalog.ts`](../../features/zine/model/recipe-catalog.ts) | Catalog metadata 与 active/development resolver；定义只从 registry/Reference 来源读取，不复制 Definition。 |
| [`zine-draft.ts`](../../features/zine/model/zine-draft.ts) | 已应用 Recipe 的 page/spread refresh 使用统一 runtime registry 精确解析 id+version。 |

依赖方向为：

```text
recipe-contract
      ↑
quiet-recipe-definitions
      ↑
recipe-definition-registry ← zine-draft refresh
      ↑
recipe-catalog (+ development-only reference definitions)
```

`runtimeRecipeDefinitions` 当前包含 6 个既有 runtime Definition 与 3 个 Quiet formal Definition。Reference Definitions 继续独立存在，只在 development Catalog/Reference Gate 追加，不混入 runtime registry。

### 2.2 共享 Quiet Theme

三个 Definition 引用同一个 `quietRecipeTheme`：

| 语义 | 值 |
| --- | --- |
| paper / background | `#F4F0E8` |
| ink / foreground | `#17191C` |
| muted-ink / muted | `#55585D` |
| photo-mat / photoBackground | `#D7D3CA` |
| typography | `DEFAULT_RECIPE_TYPOGRAPHY` |

Theme 没有 accent token 或 Color Field。Scale Echo 的 `ink`/`paper` 组合通过现有普通文字 4.5:1 Validator。

## 3. 精确 Definition 表

所有 Definition 均为 `schemaVersion:1`、`version:1`、`familyId:"quiet"`、`status:"draft"`、`pageRatio:"3:4"`、`allowsEmptyDraft:false`，且不含 legacy 字段。所有 Photo Slot 都显式 `fit:"cover"`。

### 3.1 Held Field

| 字段 | 实现值 |
| --- | --- |
| scope | `page` |
| photos / notes | exact 1；`none` |
| safeArea | `{x:.10,y:.10,width:.80,height:.80}` |
| `photo-primary` | photo；`{x:.14,y:.16,width:.72,height:.60}`；left；required；z10；无 bleed/gutter crossing |
| relations | `[]` |

### 3.2 Scale Echo

| Slot | kind | rect | side | required | z | 其他 |
| --- | --- | --- | --- | --- | ---: | --- |
| `photo-scene` | photo | `{x:.10,y:.13,width:.60,height:.40}` | left | 是 | 10 | cover；无 bleed/gutter crossing |
| `photo-echo` | photo | `{x:.52,y:.60,width:.38,height:.32}` | left | 是 | 10 | cover；无 bleed/gutter crossing |
| `note-echo` | note | `{x:.10,y:.70,width:.32,height:.18}` | left | 否 | 20 | ink；3 lines；non-repeatable；caption/start |

- scope：`page`；photos exact 2；notes optional，60 characters / 3 lines。
- safeArea：`{x:.10,y:.10,width:.80,height:.82}`。
- 唯一 relation：`photo-echo → note-echo / aligned`。第一张 `photo-scene` 不绑定该 Note。
- Note 缺失时 Render Plan 不输出 `note-echo`；两个 Photo rect 不移动、不放大、不回收。

### 3.3 Horizon Bridge

| 字段 | 实现值 |
| --- | --- |
| scope | 原子 `spread` |
| photos / notes | exact 1；`none` |
| safeArea | `{x:.10,y:.10,width:1.80,height:.80}` |
| gutter | `{start:.98,end:1.02}` |
| `photo-horizon` | photo；`{x:.28,y:.17,width:1.44,height:.66}`；cross-spread；required；z10；no bleed；gutter crossing allowed |
| relations | `[]` |
| derived evidence | 仅 `{kind:"cross-gutter-photo",photoSlotId:"photo-horizon"}` |

没有第二张照片、文字、Color Field 或伪造 spread evidence。

## 4. CatalogEntry 与发现边界

三个 CatalogEntry 与 Definition 的 status 都是 `draft`：

| Recipe | preferred / risky | topology / axis / direction | pace | subject / gutter risk |
| --- | --- | --- | --- | --- |
| Held Field | portrait, square / ultra-wide | single / center / top-down | slow | medium / low |
| Scale Echo | square, portrait, landscape / ultra-wide | diptych / diagonal / top-down | slow | high / low |
| Horizon Bridge | landscape / portrait, ultra-wide | cross-gutter / horizontal / ltr | slow | high / high |

Development resolver 能按精确 id+version 返回 Definition 与 valid Catalog Validator；production active resolver 对三项都返回 `null`。正式手动排版菜单读取的仍是有效 active 条目，因此 Quiet draft 不会出现。用户手动视觉批准之前不得通过改 status 绕过此边界。

## 5. Quiet Formal Preview Matrix

[`quiet-recipe-matrix.ts`](../../features/zine/model/quiet-recipe-matrix.ts) 是独立 formal Anchor fixture，不把 Quiet 伪装成 Reference Recipe。开发路由 [`/zine/preview-matrix`](../../app/zine/preview-matrix/page.tsx) 现在先显示原 Reference Gate，再显示 `Quiet Formal Draft Preview Matrix`；两者都只准备数据并调用通用 `RecipeRenderer` / `createRecipeRenderPlan`。

| Recipe | 场景组 | Editor/Reader cells | 关键覆盖 |
| --- | ---: | ---: | --- |
| Held Field | 12 | 24 | empty、exact/min/max、over-2、landscape/portrait/square/ultra-wide、hidden Note、left/right、off-center focus+scale |
| Scale Echo | 16 | 32 | empty、one、exact-2、over-3、no/short/60-char-3-line/over-char/over-line Note、三类 exact-2 ratio 组合、left/right、independent focus、echo binding |
| Horizon Bridge | 13 | 26 | empty、exact/min/max、over-2、landscape/square/portrait/ultra-wide、hidden Note、full spread、left/right plan、shared focus continuity |
| **总计** | **41** | **82** | 每个场景均有 Editor 与 Reader；spread 场景可有完整双页或指定单页环境。 |

所有比例夹具使用自制 data-URL SVG；Scale Echo 的比例压力始终提供两张照片，不复用“一张照片”的通用 fixture 冒充 exact-2。

Preview application 先生成稳定 `contentItemId/placementId`；需要持久化焦点的场景用 previous Application 再建 Application，验证 focusX/focusY/scale 来自 placement 而不是 Definition 默认值。

## 6. 自动化覆盖

新增：

- [`quiet-recipe-definitions.test.ts`](../../features/zine/model/quiet-recipe-definitions.test.ts)
- [`quiet-recipe-matrix.test.ts`](../../features/zine/model/quiet-recipe-matrix.test.ts)

测试覆盖：

1. 三个 Definition 的 schema/id/version/family/status/scope/capabilities/Slot/rect/theme 与 Brief 一致，且全部通过 Validator。
2. runtime registry 精确 id+version 查找；既有 6 个 runtime Definition 保持存在。
3. Catalog metadata、development valid、active rejection 与完整 Catalog validation。
4. Held Field 的 0/1/2 照片状态、unplaced、hidden Note 与源 caption 保留。
5. Scale Echo 的 1/2/3 照片状态、无 Note fixed geometry、第二张 echo 绑定、60/3 边界、超字符和超行数。
6. Horizon Bridge 的唯一 evidence、两页 target、超量 unplaced、同一 placementId、两侧不同 local crop 与连续 focus。
7. Editor 空 Slot 走通用 placeholder；Reader `showPhotoPlaceholder:false`，计划中没有 selection/edit control 状态。
8. placement focusX/focusY/scale 在重新 Application 后保留。
9. Reference Matrix、Legacy registry、既有 active Catalog 与原 Preview Matrix 全量回归。
10. `recipe-renderer.tsx` 与 `recipe-renderer-plan.ts` 没有 Quiet ID/Slot 判断或专用分支。

## 7. 自动化结果

| 门禁 | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过：54 test files / 277 tests |
| `npm run build` | 通过：Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |
| `git diff --check` | 通过 |

本任务没有启动开发服务器、没有打开浏览器、没有运行浏览器自动化。

## 8. 用户手动视觉 Gate

由用户自行启动本地开发环境后访问：`/zine/preview-matrix`，定位标题 **Quiet Formal Draft Preview Matrix**。建议按以下顺序裁决：

1. **Held Field**：landscape/portrait/square/ultra-wide 与 off-center focus；确认 Reader 始终 cover-fill、无 Note、无 placeholder/控制层，43.2% 图像仍是安静停留而非普通小图居中。
2. **Scale Echo**：`no-note` 对比 `short-note` 与 `max-60-three-lines`；确认两图几何完全不变，Note 只对应 `photo-echo`；再检查 exact-2 的 landscape+portrait、square pair、ultra-wide risk 与 distinct-focus。
3. **Horizon Bridge**：`full-spread`、`left-plan`、`right-plan`、`focus-continuity`；确认两页来自同一张照片/placement、局部裁切连续且各自可理解，主体、脸、眼睛、文字和唯一关键物体不落在 gutter 风险带。
4. 在每个 empty 场景对比 Editor/Reader：Editor 可见通用空照片 placeholder；Reader 不输出空框、选中框或编辑控件。
5. 确认 Gate 标记为 `catalog:draft` 且 Catalog Validator valid；正式手动排版菜单不应出现三个 Quiet 条目。

Horizon Bridge 的装订损失无法由静态代码测试替代。若真实装订或目标 Reader 尺寸下左右任一侧持续不可理解，应保持 draft 并返回设计 Gate，不能通过专用 Renderer 或自动镜像补救。

## 9. 停止点

Phase F3-B1 的代码、文档和自动化门禁完成后，明确停止在 **Quiet 用户视觉 Gate**。没有进入 F3-B2 Editorial，没有把 Quiet 条目设为 active，也没有开始 F4 或 35/60 项扩展。
