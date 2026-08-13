# Phase F3-B2.2 — Typography Reality Record

Status: implementation complete; stopped at the Editorial Typography Reality user visual Gate. This record does not approve the Editorial visuals and does not enter F3-B3.

## Reality Audit

The user’s mobile/Preview screenshots exposed two different layers of truth:

1. Evidence Aside `max-60-four-lines` was reported as compatible at four estimated lines, while the browser produced about six lines and rewrapped some preset lines.
2. Lead Story `max-76-deck-two-lines` was reported as compatible at two estimated lines, while the browser produced about four lines and the last line entered the photo area. The text was the authored Lead deck, not a Photo Note; its approved fixed band is above the photo.

Before this phase, `estimateRecipeTextLines()` trimmed the text, split explicit newlines, and used `floor(slot.rect.width * 72)` as a fixed character count per line. It did not read Typography Role, size token, line height, tracking, glyph width, CJK/full-width characters, or the Renderer’s `overflow-wrap:anywhere` behavior. The Renderer independently used `clamp(...vw...)` for page text, and the Note CSS had another viewport-dependent font-size rule. Therefore the estimator and browser were measuring different coordinate systems.

The same 3:4 Recipe canvas could consequently receive different text sizes in desktop side-by-side Preview, mobile Preview, a focused single page, and Reader. A two-cell Preview also allowed both cells to inherit the browser viewport rather than their own page canvas. Character capacity, estimated line capacity, and actual visual capacity were therefore not equivalent.

The applicable Next CSS guidance was also respected: the page renderer continues to use a CSS Module, and the local Canvas is the component boundary for its layout styles. No global or Recipe-specific CSS branch was added.

## General solution

`recipe-contract.ts` now exposes read-only `RecipeTypographyLayoutMetrics` and `RecipeTextLayout` derivations. They are not persisted in a Definition or Catalog. The source is the resolved product Typography token plus the text Slot’s role and normalized geometry.

| size | normalized font size | px fallback | line-height | tracking source |
| --- | ---: | ---: | --- | --- |
| xs | 0.016 canvas widths | 3.84px | token | token |
| sm | 0.022 canvas widths | 5.28px | token | token |
| md | 0.024 canvas widths | 5.76px | token | token |
| lg | 0.025 canvas widths | 6.00px | token | token |
| xl | 0.050 canvas widths | 12.00px | token | token |

Role width coefficients remain semantic and generic: title `.98`, deck `1`, label `1.12`, folio `1.08`, caption `.98`, note `1`, index `.96`. Existing line-height tokens remain tight `1.1`, normal `1.25`, open `1.45`; tracking remains tight `-.015em`, normal `0`, wide `.08em`.

Each `.recipeCanvas` is `container-type: size` and is the nearest named `recipe-canvas` query container. Preview cells, Reader pages, and focused pages therefore resolve `cqw` against their own Canvas. The inline custom property has a normalized `cqw` value and a deterministic px fallback. There is no page-text `vw` rule. Image `sizes` hints may still use viewport units because they are image loading hints, not typography metrics.

The estimator uses the same resolved token and role as the Render Plan. It accounts for explicit `\n`, whitespace and punctuation, ASCII lower/upper case, digits, CJK/full-width glyphs, tracking, long indivisible words, and `overflow-wrap:anywhere`. It returns estimated lines, horizontal fit, normalized line-box height, Slot height, and overall geometry fit. Compatibility rejects a text value independently for `maxCharacters`, `maxLines`, or geometry fit; a value can be within the character limit and still receive a `*-too-many-lines` diagnostic.

Renderer text remains visible (`overflow: visible`, no line clamp, ellipsis, truncation, or runtime font shrinking). Static text and Note use `pre-wrap` so explicit newlines are represented consistently. The Render Plan carries the same layout diagnostics to the development Preview, where they are shown outside the actual Recipe page and include `slotId`.

## Editorial capacity audit

The approved geometry, roles, line heights, tracking, relations, photo area, and Theme were not changed. With the shared metrics and readable text fixtures, the final limits remain:

| Recipe content | max characters | max lines | result |
| --- | ---: | ---: | --- |
| Evidence Aside Note | 60 | 4 | compatible maximum fixture |
| Lead Story deck | 76 | 2 | compatible maximum fixture |
| Lead Story title | 60 | 3 | compatible maximum fixture |
| Across the Record Note | 120 | 4 | compatible maximum fixture |

New pressure fixtures cover normal Latin, numeric text, CJK/full-width text, and an indivisible Latin word. The maximum fixtures are ordinary readable editorial text, not repeated digits or narrow-character padding. Newlines count toward `maxCharacters`.

## Evidence and limits

Automated tests prove that:

- typography metrics are canvas-relative and do not use viewport-sized page text;
- role, size, tracking, explicit newlines, CJK/full-width glyphs, and long words affect deterministic fitting;
- maximum fixtures meet their configured line counts and Slot line-box geometry;
- Editor and Reader use identical text, geometry, Typography token, and derived layout;
- Reader has no photo placeholder or editing control in the tested plan;
- Quiet, Reference, Color Field, Typography Role, Catalog draft isolation, and active menu count regressions remain covered;
- Renderer/Render Plan contains no Editorial Recipe ID or Slot ID branch.

Unit tests cannot prove the exact line breaks of the browser’s installed font at every device pixel density. The remaining required check is manual: inspect the actual Preview Matrix at mobile width, desktop two-cell width, focused single-page width, and Reader size. This phase therefore fixes the shared coordinate and estimator mismatch but does not claim that the Editorial visual Gate has passed.

No server, browser, or browser automation was started for this phase.
