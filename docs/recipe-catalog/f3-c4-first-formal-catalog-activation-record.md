# Phase F3-C4 — First Formal Recipe Catalog Activation

> 实施日期：2026-08-21
> 状态：完成。首批15个 formal Recipe 已由 Catalog 发布为 `active`；本批停止在 F3-C4，不进入 F4。

## Scope and authorization

用户已完成 F3-C3 的真实手动排版流程验证，结果符合预期，并授权首批15个 formal Recipe 进入生产激活。剩余45个候选 Recipe 尚未完成正式设计，本批不新增、不设计、不激活它们。

## Activated RecipeRefs

| Family | RecipeRef |
| --- | --- |
| Quiet | `quiet-held-field-v1@1` |
| Quiet | `quiet-scale-echo-v1@1` |
| Quiet | `quiet-horizon-bridge-v1@1` |
| Editorial | `editorial-lead-story-v1@1` |
| Editorial | `editorial-evidence-aside-v1@1` |
| Editorial | `editorial-across-the-record-v1@1` |
| Grid/Contact | `grid-contact-twin-register-v1@1` |
| Grid/Contact | `grid-contact-twelve-up-ledger-v1@1` |
| Grid/Contact | `grid-contact-cross-register-v1@1` |
| Dynamic | `dynamic-edge-thrust-v1@1` |
| Dynamic | `dynamic-drop-sequence-v1@1` |
| Dynamic | `dynamic-gutter-sweep-v1@1` |
| Chromatic | `chromatic-entry-field-v1@1` |
| Chromatic | `chromatic-four-beat-v1@1` |
| Chromatic | `chromatic-cross-field-note-v1@1` |

Recipe ID 和 version 均未改变。五个家族各有3个 formal active Catalog Entry；Reference-only fixture、deprecated、invalid 和未知版本均未激活。

## Source-of-truth and compatibility handling

Catalog Entry 的 `status` 是唯一发布权威。生产与手动 Runtime Policy 通过精确 `recipeId + recipeVersion` 查找 Catalog Entry、Catalog Validator 和 Definition Validator；只有 Catalog 为 `active`、定义存在且版本精确匹配时才可进入产品策略。

formal Recipe Definition 中保留迁移期兼容字段 `status: "draft"`。这是旧数据读取兼容输入，不是发布状态；Definition 字段不能覆盖 Catalog，`resolveActiveRecipe` 不会因为 Definition 的 draft 值拒绝 Catalog 的 active 条目，也不会把 Definition 自行提升为 active。没有新增 legacy 映射，Legacy registry 和旧 Style 读取入口保持不变。

## Runtime policy and product paths

- `productionRecipeRuntimePolicy`：21项，即原有6项 active runtime Recipe 加本批15项。
- `developmentManualRecipeRuntimePolicy`：同样为21项有效 runtime Recipe。
- Reference-only Definition 不在 runtime registry，因而不进入生产或开发手动策略；Preview 仍可通过独立 development 查询显示其 draft 与诊断。
- 原有6项 active Recipe 保留，旧 draft 和 legacy Style 读取路径保留。
- active resolver 继续拒绝 deprecated、invalid、未知版本、缺失 Definition 及版本不匹配的条目。

Manual Layout 菜单继续从注入的 Runtime Policy 读取；本批激活后15项不再显示 Draft 标识，active 数量由21项策略动态派生。没有改变 Drawer、动画、瀑布流、page/spread 应用、photo tolerance、空 Slot 补图、移除、Photo Note、authored text、Undo/Redo 或 Editor/Reader Render Plan。

## Non-goals

本批没有修改 Recipe Definition 的 Slot 几何、scope、照片能力、颜色、字体、Theme、Note relation 或任何 Renderer/Contract 逻辑；没有新增 Recipe、legacy 映射、正式 Recipe 专用 UI 分支、字体载荷、封面/封底/书背，也没有进入 AI、后端或 F4。

## Verification

自动化覆盖精确15项 active、五家族各3项、生产/开发均21项、Reference draft 隔离、exact id/version resolver、旧6项和 Legacy 读取、Manual applicability、Lead Story Prepare text、Photo tolerance/removal、page/spread/Undo/Redo、Editor/Reader parity、Catalog/Definition Validator 与 Renderer/Render Plan 无正式 Recipe 专用分支。

本批运行结果：

- targeted activation regression：7 files / 63 tests passed。
- `npm run typecheck`：通过。
- `npm run lint -- --max-warnings=0`：通过，0 warnings。
- `npm test`：通过，66 test files / 379 tests。
- `npm run build`：通过，Next.js 16.2.10 production build，15 routes generated。
- `git diff --check`：通过；仅有既存工作区的 CRLF normalization warnings，无 diff whitespace error。

未启动开发服务器，未打开浏览器，未执行浏览器自动化。F3-C4 完成后停止，下一步如需继续必须由用户另行授权；不得自动进入 F4。
