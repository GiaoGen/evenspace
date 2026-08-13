# Recipe Design Playbook

状态：Phase F2–F5 的设计与生产执行手册  
日期：2026-08-13  
适用范围：正式内页 Recipe Catalog；不包含封面、封底、书背、AI 排版实现或后端。  
上位文件：`phase-f-recipe-catalog-plan.md`。若二者冲突，以总计划的阶段边界、Contract Gate、数量目标和用户裁决为准。

---

## 1. 目标

本手册用于把“高审美、高度可用”转换成可以重复执行、比较、淘汰和验收的流程。最终目标不是凑满模板数量，而是建立五个结构可辨、内容适配稳定、可以由统一 Renderer 执行的 Recipe 家族。

首批范围：

- `editorial`
- `grid-contact`
- `quiet`
- `dynamic`
- `chromatic`

目标规模为每家族 12 个候选、共 60 个；去重与验收后每家族至少 11 个通过。数量不构成降低质量、伪造 spread 或保留近重复项的理由。

---

## 2. 不可突破的系统约束

1. 单页固定 `3:4`；标准双页物理比例 `3:2` 为派生事实。
2. 普通 Recipe 只作用当前单页。
3. `spread` 只能由真实 `cross-gutter-photo` 或合法的照片—Note `cross-page-pair` 证明；双图并置、共享网格、共享色域和视觉平衡都不能自证 spread。
4. 所有照片框使用 `cover`，不得出现未填充留边。
5. Photo Note 通过照片/placement 身份绑定；位置邻近不是绑定证据。
6. Note 是纯文字，无背景、卡片、胶囊或阴影。
7. 不支持 Note 的 Recipe 隐藏 Note，但不删除原始内容。
8. 现代文字 Slot 不与 Photo Slot 几何交叠，且必须具有唯一可解析承载面。
9. Color Field 不构成 spread evidence；不得携带任意 CSS、渐变、透明度、滤镜或混合模式。
10. Typography 只使用七个有限 role 和受控 Theme token。
11. Editor 与 Reader 共用 Renderer/Render Plan；Reader 不显示占位框和编辑控件。
12. Optional Note 缺失时，当前 Contract 不支持动态移动其他 Slot、收回几何或合并 Color Field。空白必须预先作为完整构图成立；若某区域只因 Note 存在才合理，应将 Note 设为 required，或拆成独立 Recipe。
13. 单个 Recipe 必须独立成立，不能依赖前后页一定采用某种密度。相邻页面缓冲只能是 sequencing 建议，不是运行时保证。

---

## 3. 页面与模型分工

建议整个 Phase F 固定使用四个 Codex 页面，避免上下文分裂和生成者自我确认。

| 页面 | 推荐模型 | 固定职责 | 写代码权限 |
| --- | --- | --- | --- |
| A：协调与 Gate | 当前协调页面 | 简单校验、汇总用户反馈、批准/拒绝 Gate、编写下一任务书 | 仅在用户明确要求时 |
| B：Recipe Art Director | GPT-5.6 Sol，F2/F3/关键淘汰优先 `max` | Family Bible、结构草图、Anchor Brief、审美与家族边界 | F2/F3-A 不写代码 |
| C：Implementation | Luna `high/xhigh` | 将已批准规格实现为 Definition/Catalog、补测试和静态门禁 | 可以，但不得重新发明视觉语法 |
| D：Independent Critic | GPT-5.6 Sol，优先 `max` | 独立审计近重复、家族漂移、内容脆弱性，建议淘汰 | 默认只写审计报告 |

纪律：

- 任意时刻只允许一个执行页面写工作区。
- 设计生成者不能担任唯一审计者。
- 审计页面必须有权建议删除，不以保留数量为目标。
- 用户是最终审美与激活批准者；模型评分不能替代人工视觉 Gate。
- “分发任务”指协调页面输出一份可复制到其他 Codex 页面的任务书，不在当前页面擅自启动子模型。

---

## 4. 设计批次大小

### 4.1 概念批次

在 F3 Anchor 阶段，每一轮只处理一个家族：

1. 先提出 5 个无色结构草图。
2. 用家族边界、差异性和内容风险淘汰至少 2 个。
3. 只把最强的 3 个扩展为完整 Recipe Brief。

不允许在家族语法尚未通过实际视觉验证前一次性完整设计 12 个。五个草图提供足够比较面，三个完整 Brief 则能保持坐标、内容状态和差异论证的质量。

### 4.2 家族扩展节奏与效率

Anchor 阶段严格采用每家族 5 选 3，共五轮、形成 15 个 Anchor。只有该家族 Anchor 已通过协调校验、用户视觉审批和 15 项独立审计后，扩展阶段才可提高批量。

建议完整 Catalog 使用以下节奏：

```text
F3：每家族 5 个结构草图 -> 3 个 Anchor（5 个家族共 5 轮）
F4 Wave 1：每家族提出 6–7 个方向 -> 完整保留 4 个，累计 7（5 轮）
F4 Wave 2：每家族提出 7–8 个方向 -> 完整保留 5 个，累计 12（5 轮）
```

因此正式设计预计为 15 个单家族批次，而不是按每三个 Recipe 机械拆成 20 批。扩展批次能提高到 4–5 个，是因为三项 Anchor 已锁定家族语法、视觉尺度和淘汰基线；如果某家族的 Anchor 审计未通过，仍回退到每批 3 个。被淘汰方向不得只换名称、镜像或配色后重新进入。

批次大小是提交上限，不是通过配额。Wave 1/2 可以只批准其中一部分；不足项必须在独立补充批中用新结构角色填补，不能降低 Difference 或 Usability Gate。

### 4.3 实现批次

- Anchor 阶段：每次实现同一家族 3 个。
- 规格稳定后：每次实现 4–6 个已经批准的 Recipe。
- 每批完成自动化 Gate 和用户抽查后，才能继续下一批。

### 4.4 推荐家族顺序

1. Quiet：先锁定尺度、留白和观看速度。
2. Editorial：在稳定基础上建立图文层级。
3. Grid/Contact：建立高密度、比较和索引能力。
4. Dynamic：验证在受控矩形 Contract 中的运动感。
5. Chromatic：最后加入功能性色彩，防止用颜色掩盖弱结构。

---

## 5. 四遍设计法

每个候选必须按固定顺序完成四遍，不得一开始就用颜色和命名包装概念。

### Pass 1：内容任务

先回答：这个 Recipe 解决哪种真实内容问题？

- 单图凝视、主次报道、比较、序列、索引、动作、图文对答或色彩分组只能选一个第一任务。
- 明确照片数、比例偏好、Note 状态和最常见失败内容。
- 无法说明用途的候选直接淘汰。

### Pass 2：无色结构

- 只使用黑、白、灰矩形。
- 锁定 topology、主图尺度、负空间、主轴、阅读入口和路径。
- 隐藏家族名称、Recipe 名称、文字内容和颜色后仍应能识别家族。
- 若只靠换色才能成立，不进入下一遍。

### Pass 3：文字与关系

- 添加必要的 Typography Role，而不是填满所有 role。
- 添加 Note relation，并验证照片身份绑定。
- 检查无 Note、短 Note、长 Note 和多 Note。
- optional Note 缺失时不能依赖动态 reflow；空状态必须本来就完整。

### Pass 4：颜色与细节

- 只有 Chromatic 可让功能色成为第一结构；其他家族的颜色必须保持辅助角色。
- 文字必须完整落于唯一承载面并通过对比初筛。
- 去色后再次验证 topology、主轴和阅读路径。
- 最后才产生名称和稳定 ID，避免名称先入为主。

---

## 6. Recipe Brief 必填字段

每个完整候选必须记录：

1. 暂定名称、稳定 `recipeId`、版本和 family。
2. 一句话内容用途。
3. `page` 或 `spread`；spread 必须列出机器可验证 evidence。
4. 最小/最大照片数、实际 Slot 数、required/optional 状态。
5. 偏好比例、可接受比例和风险比例。
6. 标准化 Slot 矩形、pageSide、z-index、bleed 与 gutter 策略。
7. 主图面积、照片覆盖率和负空间率。
8. 第一入口、composition axis、reading direction 和视觉路径。
9. Note mode、relation、绑定对象、字符/行数上限。
10. Typography Role、alignment、前景 token 和承载面。
11. Color Field 的唯一职责；无职责的色域必须删除。
12. 照片不足、最大容量、超容量和 `unplacedPhotoIds` 预期。
13. 无 Note、短 Note、长 Note 的行为。
14. 默认 `cover` 裁切风险、主体靠边风险和书脊风险。
15. Editor、Reader、左页、右页和单页聚焦视角预期。
16. 至少两项来源原则及其转化方式。
17. 与同家族现有候选的 Fingerprint 差异。
18. 自评、已知弱点和淘汰条件。

---

## 7. 每个候选的六状态草图

在实现前至少绘制或结构化描述以下状态：

1. 理想内容。
2. 横图为主。
3. 竖图或方图为主。
4. 无 Note。
5. 最长合法 Note。
6. 左/右页与单页聚焦视角；spread 还需完整双页。

高风险候选追加：

- ultra-wide。
- 主体靠边。
- 混合比例多图。
- 最大照片数与超容量。
- 深色、多色或反色文字。
- 书脊附近主体与跨页 placement 连续性。

---

## 8. 专业参考来源与职责

正式设计允许并鼓励联网补充研究，但来源必须用于提炼原则，不得逐坐标临摹。

### 8.1 网格、基线和文字秩序

- Adobe InDesign Baseline Grid  
  https://helpx.adobe.com/indesign/desktop/layout-and-grid-tools/grids/use-a-baseline-grid.html
- Adobe InDesign Layout Grids  
  https://helpx.adobe.com/indesign/desktop/layout-and-grid-tools/grids/create-customize-layout-grids.html

用于：网格、栏沟、对象对齐、文字基线和左右页共同轴线。Adobe 资料不负责摄影 sequencing 判断。

### 8.2 摄影编辑、配对与序列

- Aperture, How Not to Design a Photobook  
  https://aperture.org/editorial/design-photobook/
- Aperture, Stuart Smith Workshop  
  https://aperture.org/workshops/smith2016/
- Aperture, The Self-Published Photobook  
  https://aperture.org/workshops/bruno-ceschel-the-self-published-photobook-workshop/

用于：图片编辑、pairing、sequencing、观看节奏和书本形式。不能只从单张漂亮 spread 推导通用模板。

### 8.3 Contact Sheet 与摄影选择

- Magnum, The Coast  
  https://www.magnumphotos.com/theory-and-practice/the-coast-sohrab-hura/
- Magnum Contact Sheets  
  https://store.magnumphotos.com/collections/contact-sheets

用于：重复、微差、选择痕迹、高密度扫描和书页速度。商品列表只能作为视觉案例入口，不代替理论证据。

### 8.4 当代摄影书实验

- MACK Submissions / editorial framing  
  https://mackbooks.co.uk/pages/submissions
- Printed Matter archival activities  
  https://staging.printedmatter.org/what-we-do/archival-activities

用于：image-text、draft sequence、艺术家书、zine 和 ephemera 语境。不得复制作品身份、素材或独特装帧。

### 8.5 已落地的编辑与书籍系统

- Pentagram, Irving Penn: Small Trades  
  https://www.pentagram.com/work/irving-penn-small-trades
- Pentagram, Hair  
  https://www.pentagram.com/work/hair
- Pentagram, The Work of Art  
  https://www.pentagram.com/work/the-work-of-art/story
- Pentagram, The Baffler  
  https://www.pentagram.com/work/the-baffler
- Pentagram, Cecily Brown at Blenheim Palace  
  https://www.pentagram.com/work/cecily-brown-at-blenheim-palace
- Design Museum, Penguin Books  
  https://designmuseum.org/penguin-books

用于：系统一致性、复杂内容层级、留白、全页图像、栏目变化与功能性色彩。案例项目不能成为 Recipe 名称或品牌联想。

### 8.6 来源使用规则

1. 每个正式 Recipe 至少组合一个结构来源和一个摄影书/序列来源。
2. 一个来源最多直接影响两个 Recipe。
3. 记录“提取的原则”“本系统中的转化”和“不复制的识别元素”。
4. 不下载或复用来源照片、纹理、字体、图标和品牌资产。
5. Pinterest、SEO 模板农场和无作者模板聚合页不能作为正式证据。
6. Behance 只作为案例索引；关键结论应回到作者、工作室、出版社或机构页面。

---

## 9. 差异性 Gate

每个候选建立 Fingerprint：

- scope
- photo count range / slot count
- slot topology
- dominant image scale
- composition axis
- reading direction
- density / negative space
- bleed pattern
- Note mode / relation
- color strategy
- typography role emphasis

同家族任意一对差异分数必须 `>= 4`，且至少一项来自 scope、topology、主图尺度、主轴或出血/留白结构。

下列变化不能单独构成新 Recipe：

- 换颜色。
- 左右镜像。
- 少量坐标或间距移动。
- 只改变 Typography Role。
- 相同照片数、相同比例、相同 Note 能力和相同阅读路径下的重新命名。

跨家族发生近重复时，只保留更可用、更能代表家族第一识别层的一项。

---

## 10. 审美与可用性评分

| 维度 | 分值 |
| --- | ---: |
| 服务照片内容与裁切鲁棒性 | 20 |
| 视觉层级和阅读清晰度 | 15 |
| 平衡、节奏与留白 | 15 |
| 家族识别度 | 15 |
| 相对其他 Recipe 的差异性 | 15 |
| 不同比例/数量下的适配性 | 10 |
| Photo Note 关系质量 | 5 |
| 色彩、书脊和输出安全 | 5 |

判定：

- `<82`：淘汰。
- `82–85`：保留 draft，但必须修改。
- `86–89`：可进入用户激活评审。
- `90+`：可作为家族代表候选。

前五项任何一项不得低于该项满分的 70%。硬性失败优先于总分。

硬性失败包括：

- 照片框出现未填充留边。
- 只能在一种理想比例下成立。
- Note 与错误照片绑定，或只能依靠距离猜测。
- 长 Note 静默截断。
- 重要主体默认必然进入书脊损失区。
- page Recipe 改动配对页。
- spread 缺少合法 evidence 或不能原子撤销/重做。
- Reader 出现占位框、选中框或编辑控件。
- optional Note 缺失后留下无法解释的残缺区域。
- 只靠换色、镜像或轻微坐标变化制造差异。
- Chromatic 去色后完全没有结构。
- Quiet 只是“小图居中”的重复。
- Dynamic 依赖 Contract 不支持的旋转、贴纸、随机重叠或任意 CSS。

---

## 11. 阶段与审计节点

1. F2：五份 Family Bible 与 60 个角色位地图。
2. F3-A：15 个 Anchor Brief；不写代码。
3. 独立审计 15 个 Anchor；用户批准后进入实现。
4. F3-B：按家族每批 3 个实现为 draft。
5. F4 Wave 1：扩展至 35 个候选并审计。
6. F4 Wave 2：扩展至 60 个候选并最终去重。
7. F5：自动化 Gate、用户视觉 Gate、分批激活。

实现后固定运行：

```text
npm run typecheck
npm run lint -- --max-warnings=0
npm test
npm run build
```

执行模型不得启动浏览器。用户在 Preview Matrix、实际 Editor 和 Reader 中完成视觉验证。

---

## 12. 人工视觉 Gate

用户至少检查：

1. 黑白结构下的家族辨识。
2. 横、竖、方、超宽和主体靠边照片的裁切。
3. 无/短/长/多 Note，绑定关系和无静默截断。
4. 左页、右页、完整 spread 和单页聚焦视角。
5. Editor/Reader 的位置、尺寸、层级、颜色和 Typography 一致。
6. Reader 无编辑控制层。
7. spread 从任一侧应用、撤销和重做。
8. 超量照片仍在 unplaced 状态且 used 计数正确。
9. Chromatic 的对比、灰度第二线索与真实照片色彩冲突。
10. `xs` folio/index 在移动端和单页聚焦下仍可读。

只有用户明确批准的候选才能从 `draft` 变为 `active`。

---

## 13. 固定任务书格式

协调页面给其他页面的任务必须包含：

1. 只执行哪个 Phase/批次。
2. 必须阅读的权威文件。
3. 允许和禁止的文件修改。
4. 是否允许联网与来源要求。
5. 明确停止点，不自动进入下一阶段。
6. 自动化门禁和用户人工验证边界。
7. 交付文件、报告字段和待用户裁决。

执行页面完成后必须报告：

- 修改文件。
- 完成范围。
- 未完成/未验证项。
- Contract Gap 或偏离。
- 自动化结果。
- 用户人工验证清单。
- 明确声明已经停止，没有自动进入下一阶段。
