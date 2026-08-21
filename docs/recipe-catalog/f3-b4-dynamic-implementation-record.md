# Phase F3-B4 — Dynamic Family Draft Implementation Record

> 实施日期：2026-08-14  
> 状态：Edge Thrust、Drop Sequence 与 Gutter Sweep 的 formal draft Definition、Catalog、Registry 和独立 Preview Matrix 已实现；静态自动化 Gate 全部通过。本批按用户明确授权停在静态实施完成点，不进行字体审美裁决，不进入 Chromatic。

## 1. 范围与边界

本批只实现：

1. `dynamic-edge-thrust-v1`
2. `dynamic-drop-sequence-v1`
3. `dynamic-gutter-sweep-v1`

三项均为 `schemaVersion: 1`、`version: 1`、`familyId: "dynamic"`、`status: "draft"`、`allowsEmptyDraft: false`。它们共享 neutral Theme 与已批准 P2 `photoessay-field` preset，但 Definition 没有 Note、static-text 或 Color Field，因此本批没有字体内容压力，也不作字体审美结论。

本批没有修改 Recipe Contract，没有新增 legacy 映射，没有激活 Recipe，没有修改 active/menu，没有新增 Dynamic 专用 JSX/CSS/Renderer 分支，没有启动服务器、浏览器或浏览器自动化，也没有实现 Chromatic。

## 2. Formal Definitions

### 2.1 Edge Thrust

- `scope: page`，exact 1，Note mode `none`。
- safe area `{x:.04,y:.05,width:.92,height:.90}`。
- `thrust-photo`：`{x:0,y:.07,width:.92,height:.86}`、left、required、z 10、cover、`allowBleed:true`、`allowGutterCrossing:false`。
- 照片覆盖率 79.12%；只有 x=0 为主动 bleed，上下边与 x=.92 的纸面终点保持固定。
- 右页 scenario 保留同一 x=0 几何，不静默镜像；实际物理外边是否匹配仍是应用侧选择 Gate。

### 2.2 Drop Sequence

- `scope: page`，exact 3，Note mode `none`。
- safe area `{x:.05,y:.05,width:.90,height:.90}`；全部框内，无 bleed、无 gutter crossing。
- `phase-01`：`{x:.05,y:.06,width:.40,height:.25}`。
- `phase-02`：`{x:.55,y:.06,width:.40,height:.25}`。
- `impact-photo`：`{x:.05,y:.41,width:.90,height:.54}`。
- assignment 顺序固定为 `phase-01 → phase-02 → impact-photo`。两张切片各占 10%，impact 占 48.6%，面积跳变为 4.86:1；切片底边 `.31` 到 impact 顶边 `.41` 的 `.10` 方向间距固定。

### 2.3 Gutter Sweep

- `scope: spread`，exact 1，Note mode `none`。
- safe area `{x:.04,y:.05,width:1.92,height:.90}`，gutter `.94..1.06`。
- `sweep-photo`：`{x:0,y:.08,width:2,height:.84}`、cross-spread、required、z 10、cover、`allowBleed:true`、`allowGutterCrossing:true`。
- full-spread 照片覆盖率 84%；左右外边均主动 bleed，上下各保留 8% 纸边。
- 唯一 spread evidence 为 `{kind:"cross-gutter-photo", photoSlotId:"sweep-photo"}`。左右 Render Plan 消费同一个 photoId、placementId 与 persisted focus；没有拆成两个 assignments。

## 3. Catalog、Registry 与 Renderer

- `dynamic-recipe-definitions.ts` 是三个 Dynamic Definition 的唯一数据源，并提供 exact `recipeId + version` resolver。
- formal registry 由 9 增至 12，runtime registry 由 15 增至 18；旧 runtime Definitions 保持不变。
- Edge Catalog：single / edge / LTR / fast / high subject-edge risk / low gutter risk。
- Drop Catalog：mosaic / vertical / top-down / fast / high subject-edge risk / low gutter risk。
- Gutter Catalog：cross-gutter / horizontal / LTR / fast / high subject-edge risk / high gutter risk。
- 三项 Development resolver 与 Catalog Validator 均 valid；active resolver 均返回 `null`，active/menu 仍为 6。
- 通用 Renderer、Render Plan 与 CSS 中不存在 Dynamic recipeId 或 `thrust-photo`、`phase-01/02`、`impact-photo`、`sweep-photo` 专用判断。

## 4. Dynamic Preview Matrix

`/zine/preview-matrix` 新增独立标题 **Dynamic Formal Draft Preview Matrix**。它沿用同一 Preview cell、Application、Render Plan、Renderer 与外部诊断结构，不新增 Dynamic 样式分支。

| Recipe | 场景组 | Editor/Reader cells | 静态覆盖 |
| --- | ---: | ---: | --- |
| Edge Thrust | 12 | 24 | 0/1/2 photos、ratio risk、左右页不镜像、focus、终点压力、hidden Note |
| Drop Sequence | 15 | 30 | 0/1/2/3/4 photos、ratio、稳定顺序、4.86:1、固定 gap、三项独立 focus、左右页 |
| Gutter Sweep | 13 | 26 | 0/1/2 photos、ratio/gutter risk、完整/左右 plan、原子 placement、focus continuity、hidden Note |
| **总计** | **40** | **80** | 每个场景均有 Editor 与 Reader |

静态测试精确验证：

- Reader 隐藏空照片 placeholder，Editor 保留空 Slot 诊断。
- Edge 在 right-page scenario 中不发生运行时镜像。
- Drop 的 photoId/Slot 顺序、unplaced 与每张 placement focus 稳定。
- Gutter 左页 crop 为 `imageStartPercent:0`，右页为 `50`，两侧 `imageWidthPercent:200`，且共享一个 placement。
- 所有 Dynamic Plan 无 typography issue；这只说明三项无文字依赖，不构成字体审美批准。

## 5. 自动化 Gate

| Gate | 结果 |
| --- | --- |
| `npm run typecheck` | 通过 |
| `npm run lint -- --max-warnings=0` | 通过，0 warnings |
| `npm test` | 通过，62 test files / 331 tests |
| `npm run build` | 通过，Next.js 16.2.10 production build；`/zine/preview-matrix` 静态生成 |
| `git diff --check` | 通过（见本轮最终校验） |

## 6. 停止点

F3-B4 到此停止。三项继续为 `draft`；本记录只确认规格、数据链与静态回归成立，不对真实动作照片、10% 切片可辨性、物理外边方向或 gutter 装订风险作视觉裁决。未获得后续明确授权前，不进入 F3-B5 Chromatic。
