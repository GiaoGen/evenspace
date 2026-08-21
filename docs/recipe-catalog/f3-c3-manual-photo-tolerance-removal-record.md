# Phase F3-C3 — Manual Photo Tolerance, Empty Slot Interaction & Photo Removal

> 实施日期：2026-08-21  
> 状态：完成。此批只关闭 C3-01/C3-02 的真实 Manual Layout 状态与交互路径；15 个 formal Recipe 保持 `draft`，没有激活或进入 F4。

## Strict Compatibility versus manual applicability

`evaluateRecipeCompatibility` 保持严格：Definition、照片完整性、required Photo Note、Note 容量、authored text、owner 与最终诊断都没有放宽。新增的 `evaluateRecipeCompatibilityWithManualPhotoTolerance` 只在真实手动编辑中免除 photo-count 阻断，并继续拒绝其余 Contract 问题。

`getManualRecipeApplicability` 是菜单与 `APPLY_RECIPE` 共用的边界。它公开 strict `completionCompatibility`、manual compatibility、`photoDeficit`、`photoExcess` 与 `emptyPhotoSlotIds`。因此缺图/超量卡片可应用，required authored text 继续进入 F3-C2 Prepare text，缺 Photo Note（除零图自然尚未出现的 Note）、超限、owner/Definition/Resolver 错误及缺失 spread 另一页继续阻断。

## Photo behavior

- 缺图：Application 使用 exact `recipeId + version`，只为已有照片创建 assignment；空 Slot 没有伪造 photoId。Editor Render Plan 显示通用加号占位，Reader 不显示空框。
- 超量：稳定保留页面/ spread 阅读顺序的前 N 张；尾部进入 `unplacedPhotoIds`，保留在 `ZineDraft.photos`，其 Photo Note 也保留。Photos 菜单 usage 仍从实际 assignment 计算。
- 空 Slot：在 Editor 触摸/点击抬起后记录 page、exact recipe ref、slot ID 和 shared Application identity，并打开既有顶部 Photos 菜单。选择照片后精确填入该 Slot、使用默认 focus、关闭菜单并清除目标；同一 Application 中已有该照片时移动而不复制。
- 移除：仅选中照片时出现 “Remove photo from layout” 控制。它按 pageId + placementId + photoSlotId 移除 assignment，留下原 Slot 的 Editor 占位；不删除 Draft photo、caption/Photo Note 或 authored text。page 仅更新当前 Application；spread/cross-gutter 两侧继续共享一个原子 Application。

## Stable assignments and history

明确 Slot 填图与移除直接更新当前 Application，而不是把余下照片按数组重排。未删除 assignment 保留原 `photoSlotId`、`placementId`、`contentItemId`、focus 和 scale；删除中间 Slot 不会让后续照片前移。Recipe 切换仍按新 Recipe 的稳定阅读顺序创建新的 Application。

两项新 action 都进入既有 Undo/Redo history；无效 page/placement/slot 保持 state 和 history 不变。Photo usage 仍仅按 assignment 统计，所以移除或超量照片即时回到未使用集合。

## Regression coverage

新增 `manual-photo-tolerance.test.ts` 覆盖 strict/manual 边界、零图/缺图/超量 Application、authored/spread 阻断、Editor/Reader 空 Slot 差异、指定 Slot 补图、删除中间 assignment 的 placement 稳定性、同 Application 移动、防重复、Undo、非法 action、cross-gutter spread 原子移除、Photo Note 保留，以及所有 15 个 formal draft 的空/超量 Application 建立。

没有修改任何 Recipe 几何、字体、颜色、Catalog status、后端或 AI；没有启动服务器、浏览器或浏览器自动化。下一步需由用户执行真实手动验证与后续明确授权，不能自动进入激活或 F4。
