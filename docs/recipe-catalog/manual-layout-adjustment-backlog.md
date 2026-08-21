# Manual Layout Adjustment Backlog

> 状态：**C3-01 / C3-02 已于 Phase F3-C3 完成**；原始要求保留作回归依据。必须在用户真实手动验证通过前保持 draft，不得把本次状态语义误作 Recipe 激活。
> 日期：2026-08-21

## C3-01：Recipe 应用允许照片数量不足或超量

> 完成：manual applicability 与 strict Compatibility 已分层；缺图/超量可以在 Manual Layout 应用，其他 Contract 诊断不放宽。

- 手动排版时，照片数量与 Recipe Slot 数量不一致，不应阻止应用 Recipe。
- 照片少于 Recipe 容量：仍应用 Recipe，未填充的 Photo Slot 显示可交互占位。
- 点击空 Photo Slot：打开现有 Photos 顶部悬浮菜单，用于选择并填入该 Slot。
- 照片多于 Recipe 容量：按稳定阅读顺序保留前 N 张，末位超出照片从当前 Application 中移除并回到未使用照片集合；不得删除 Draft 照片或 Photo Note。
- 当前 `needs-content` / `too-much-content` 仍可作为诊断信息，但在手动编辑模式下不得作为照片数量不匹配时的 Recipe 应用阻断条件。
- required Photo Note、authored text、owner、非法 spread evidence、Definition/Catalog invalid 等语义错误仍可阻止完成态，不得因本调整被一并放宽。

## C3-02：从 spread/page 的排版中移除照片

> 完成：已提供精确 assignment 移除、Editor 空 Slot 补图、usage/Undo/Redo 与 page/spread 原子回归。

- 为已排版照片提供明确的“从当前版面移除”操作；只解除当前 placement/application assignment，不删除 Draft 中的照片文件。
- 移除后，对应 Photo Slot 显示与 C3-01 相同的可交互占位。
- 点击占位打开现有 Photos 菜单，并将新照片填入该明确 Slot。
- 被移除照片回到未使用照片集合，Photos 菜单 usage 数量立即更新。
- Photo Note 保留在照片数据上；重新放置或切换支持 Note 的 Recipe 后仍可恢复绑定展示。
- page Recipe 只修改当前页；atomic spread Recipe 必须保持左右页共享同一 Application。
- 操作必须支持 Undo/Redo，Editor 与 Reader 继续使用同一 Render Plan；Reader 不显示占位或删除控件。

## 实施顺序

1. Phase F3-C2：完成 authored-text 可见编辑 UI。
2. Phase F3-C3：一起实现 C3-01、C3-02，并集中处理用户反馈的非阻断视觉/易用性调整。
3. 用户在真实手动排版流程中验证首批 15 个 Recipe。
4. 通过后再分批激活，并进入 Phase F4。
