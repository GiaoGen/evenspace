# Phase F3-C1 — Development Draft Catalog Bridge & Manual Application Reality

> 实施日期：2026-08-21  
> 状态：完成。真实手动排版产品路径在 development 允许 21 个 runtime Recipe；production 继续严格为 6 个 active Recipe。15 个 formal Anchor 均保持 `draft`，没有进入激活或 45 项扩展。

## Runtime policy boundary

`recipe-catalog.ts` 新增确定性的 `RecipeRuntimePolicy`。它只接受 exact `RecipeRef`，再通过 Catalog validator、Definition validator 与 runtime Definition registry 解析；Action 仍只传 `recipeRef`，不能携带任意 Definition 绕过验证。

- Production policy：只接受 status 为 `active` 的 runtime Catalog/Definition 精确组合，结果为 **6**。`resolveActiveRecipe` 的既有严格语义未被放宽；draft、deprecated、invalid、未知版本与 Reference-only fixture 均拒绝。
- Development manual policy：只接受 status 为 `active` 或 `draft`、且位于 `runtimeRecipeDefinitions` 的精确有效组合，结果为 **21**（**6 active + 15 formal draft**）。Reference Preview fixtures 不在 runtime registry，因此不能进入真实菜单或被 reducer 应用。

环境选择只在 Client Component `ZineCreator` 的产品组合层发生：development 注入 development manual policy，其他环境注入 production policy。model、Contract、Reducer、Reader 与 Catalog 内没有散落的环境判断。

## Real manual path, not Preview Matrix

Preview Matrix 能验证 Definition、Application、Renderer 和压力情境，但它不是用户从 Manual Layout 菜单选择 Recipe 后经过 history、page/spread target、Reader page-flip 的真实产品路径。因此 F3-C1 让同一 resolver 贯通：

```text
ZineCreator environment selection
  -> Manual Layout menu / Compatibility
  -> APPLY_RECIPE + History + authored-text refresh
  -> Manual Editor page render
  -> Reader page render
```

Menu 的横向瀑布流、顶部/底部抽屉运动、StPageFlip、单页视角、手势和裁切交互均未改变。development 中 formal 条目在名称后显示克制的 `Draft` 标识，header 显示实际总数 21；production 不会显示 draft 或该标识。

## Shared content and Compatibility semantics

`createManualRecipeApplicationContext` 与 `createRecipeContentForManualPages` 统一 page/spread target、`targetPageIds`、owner、photoIds、notesByPhotoId、contentItemIds、focus defaults 与 selected authored text。Manual menu 与 reducer 因此使用同一 content/owner 语义。

结果是：required Lead Story title 仍报告 `authored-text-missing`/needs-content 并不能应用；Cross-field Note 缺 Photo Note、缺一侧 spread page、照片超量、Note 超限或 authored owner 不匹配都会保留真实 Compatibility 诊断。hidden Photo Note 仍保存在 Draft 的 photo caption，不会被 Recipe 删除。

authored text 的 UPSERT/UPDATE/DELETE 重算，以及照片变更导致的 page/spread application refresh，也接收同一 resolver。Editor 和 Reader 页面均按注入 resolver 对同一个 exact Application ref 解析，不会在 Reader 回退 active-only 或空白。

## Regression coverage

新增/扩展自动化覆盖：

- production policy 恰为 6 active；development policy 恰为 6 active + 15 formal draft；Reference-only、deprecated、invalid、未知版本排除；
- production 直接 dispatch formal draft 保持 state 与 Undo history 不变；development resolver 可应用 page 与 spread draft，spread 两侧共享同一 Application；Undo/Redo 重放 draft；
- exact id/version resolution、legacy active 路径、unplaced/usage 与 hidden Note 的既有回归保持；
- shared manual content builder 驱动 Lead Story required authored title 的菜单/reducer同源拒绝；
- authored text 更新的 resolver-injection、Editor/Reader shared render-plan 与 Application identity 既有回归继续运行。

## Explicit stopping point

Lead Story 仍没有 visible authored-text 编辑 UI；F3-C1 只准确显示其 needs-content 诊断，未伪造任何文字。没有激活任何 Recipe、没有修改几何/字体/颜色/审美规格、没有后端或 AI 排版工作，也没有进入 F4/45 项扩展。

下一阶段只能是 **F3-C2 authored-text 可见编辑 UI**。
