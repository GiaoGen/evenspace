# F4-W1 Research Addendum — Formal Recipe Catalog Expansion

> 状态：Wave 1 设计研究完成；不包含 Definition、CatalogEntry、Renderer 或产品实现。日期：2026-08-21。

## 直接研究与原创转化

| 来源机构 | 直接 URL | 观察到的原则 | Wave 1 的原创转化 | 版权边界 |
| --- | --- | --- | --- | --- |
| Adobe InDesign | https://helpx.adobe.com/indesign/desktop/layout-and-grid-tools/grids/use-a-baseline-grid.html | 基线网格让跨栏、跨页文字保持稳定节奏；文字框可有独立但受控的基线。 | Editorial 的标题、deck、Note 以固定、独立承载面和受控 role 分工；不以视觉挤压照片换取“杂志感”。 | 未复制页面、字体、截图或版式坐标；只转化“稳定文字节奏”原则。 |
| Adobe InDesign | https://helpx.adobe.com/indesign/using/create-new-documents-cjk.html | Facing pages 是阅读/装订语境；bleed 是为裁切预留的对象延伸，不能代替内容结构。 | 所有 page 仍是 3:4；spread 只在 cross-gutter photo 或 required cross-page-pair 时成立；出血只用于 Quiet 04、Editorial 10、Dynamic 和 Chromatic 11 的明确职责。 | 不复制 Adobe UI、模板或坐标。 |
| Adobe InDesign | https://helpx.adobe.com/uk/indesign/using/layout-grids.html | inside/outside 是面向实体书页的确定性概念，不能把左右页当作无方向的镜像画布。 | 只有明确标为 left/right 的 Recipe 使用该页侧；其余 page Recipe 不假装可以自动镜像。 | 只采用页侧约束这一抽象。 |
| Aperture | https://aperture.org/curricpart/on-sight-part-ii/ | 图像的顺序和邻接会改变意义；编辑与修订是摄影书的核心工作。 | Quiet 的慢节奏、Dynamic 的动作序列、Grid 的可比较索引均有不同且可描述的阅读路径。 | 未复用教学图像、作品或排序。 |
| Aperture | https://aperture.org/editorial/pbr-photo-text-book/ | 图文关系应增加语境或复杂度，不能机械重复图片信息。 | 所有 Note 只承担可绑定的事实、索引或远距对答；不支持 Note 的 Recipe 让照片独立成立。 | 未复制文章文本、书页或品牌资产。 |
| Aperture | https://aperture.org/workshops/smith2016/ | 摄影书设计从选择、删减与整体概念出发，而非把每张照片平均展示。 | Editorial 采用主图—证据、标题—图像、跨脊报道；过量图片统一进入 unplaced，而非挤压结构。 | 未复制作者的书籍或版面。 |
| Magnum Photos | https://www.magnumphotos.com/theory-and-practice/contact-sheet-mother-child-elliott-erwitt-portrait/ | Contact sheet 让拍摄过程中的微小变化成为可比较的编辑证据。 | Grid/Contact 的四象限、竖向条、样本—细节 atlas 与跨脊 band 都以扫描、比较和分组为第一职责。 | 未复制 Magnum 联系表、照片、标识或排列。 |

## 共同转化规则

1. 本批所有几何为原创 normalized rect，不是对任何来源页面的描摹；没有使用外部照片、字体、Logo、品牌色或具体页面坐标。
2. 研究只提供原则，最终设计以现有 Contract v1.1 runtime 为上限：cover-fill、固定几何、稳定 owner + contentKey、有限 role/preset/token、无专用 Renderer 分支。
3. 色彩不是唯一信息通道：Chromatic 在 color-off 后仍保留编号、分组、尺度和阅读顺序；其色域仍不构成 spread evidence。
4. 所有文字在 `paper` 或单一 accent field 上；本批只采用已验证的 `ink/paper`、`muted-ink/paper`、`inverse-ink/accent-1` 与 `ink/accent-3` 组合（均不低于 4.5:1）。

