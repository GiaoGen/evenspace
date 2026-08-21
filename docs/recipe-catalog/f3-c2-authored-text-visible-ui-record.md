# Phase F3-C2 — Authored Text Visible Editing UI

> 实施日期：2026-08-21  
> 状态：完成。F3-C2 只完成真实 Manual Layout 路径中的 authored static-text 可见编辑；15 个 formal Recipe 仍为 `draft`，未激活，也未进入 F3-C3 或 45 项扩展。

## Product entry and commit flow

Manual Layout 的既有底部 **Layout** 抽屉现在从当前 Recipe Definition 的 `static-text` / `textSource: "authored"` Slot 派生字段。若卡片仅因 authored text 不兼容，点击不会产生无效 Apply，而是将该卡片标为 `Prepare text` 并在同一抽屉中显示字段；已应用的 authored Recipe 重新打开 Layout 时也会显示相同字段。

字段显示 role、required/optional、实际字符数/上限、共享行数估计/上限及精确的 missing、too-long 或 too-many-lines 原因。没有新增主按钮、抽屉、弹窗或全屏编辑器；Photos 抽屉、StPageFlip、单页视角、手势和裁切路径均未改变。

输入先保存在组件本地；失焦或关闭抽屉时才按一次实体变更提交。没有 `maxLength`、省略、截断或缩小字体。非法内容只显示 Contract 诊断，保留原有有效实体与 Application。optional 空值通过既有 DELETE action 删除；其余创建/更新分别使用 UPSERT/UPDATE action，因此进入既有 Undo/Redo history。全局 zine name 不参与此编辑路径。

## Shared data and validation boundary

`getAuthoredTextEditorFields` 只以 `owner + contentKey` 识别持久化实体，Slot ID 从不写入 Draft。page owner 只能读取当前 page；spread owner 仍保持 anchor page 与有序两个 `targetPageIds` 的原子身份，不把 spread 文字猜测拆到单页，也不会向相邻页泄漏。

Contract 新增 `validateAuthoredTextSlot`，由 `evaluateRecipeCompatibility` 和可见编辑字段共同调用；其内部继续使用相同 `estimateRecipeTextLayout`。因此 Lead Story title 保持 required **60 characters / 3 lines**，deck 保持 optional **76 / 2**，Latin、CJK 和显式换行都遵循同一保守行数语义。

`ZineCreator` 继续是唯一的环境组合层：development 注入 21（6 active + 15 formal draft）resolver，production 注入 6 active resolver。文字 action 重算、Manual Editor 和 Reader 仍使用 F3-C1 的同一个 exact `RecipeRef` resolver；Reader 仅渲染共享 Render Plan，不渲染输入、计数或编辑控件。

## Regression coverage

新增 `authored-text-editor.test.ts` 覆盖：

- Lead Story title/deck 字段派生、role、required 与 60/3、76/2 限制；
- page/spread exact owner、相邻页和不同 spread identity 不泄漏；
- required title 缺失、合法 title、61 字符拒绝、显式四行拒绝；
- CJK shared line-estimator 路径与 optional deck 清空语义。

既有 authored Contract/reducer tests 同时继续覆盖 Apply 前后 Compatibility、deck create/update/delete、duplicate owner+contentKey 拒绝、page/spread Application、Undo/Redo、更新后重算、Editor/Reader shared Render Plan、Reader 无编辑环境，以及 active legacy 与 development/prod runtime policy 的回归。

## Explicit limits and next step

Preview Matrix 仍不能验证真实用户在 Manual Layout 打开抽屉、提交文字、写入 history、重新应用并通过 Reader page-flip 渲染的产品路径；本批关闭的是该 visible authored-text 路径，而不是 Preview Matrix 的视觉替代。

没有改 Recipe 几何、字体、颜色、审美规格或后端；没有启动开发服务器、打开浏览器或进行浏览器自动化。F3-C3（照片数量容忍、解除/补图与 unplaced 回归）仍未实施。下一阶段只能是 **F3-C3**，不得自动继续。
