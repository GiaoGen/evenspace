# Authored Static Text Core Implementation Record

## Phase F0.7-A

This record covers only the core authored static-text data and rendering chain. It does not design a formal Recipe, add a Catalog entry, or add visible text-editing UI.

### Contract

- `AuthoredTextItem` is a Draft-owned plain Unicode text entity with stable `id`, page/spread `owner`, kebab-case `contentKey`, and `roleHint` (`title`, `deck`, `label`, or `index`).
- A `static-text` slot uses `textSource: "authored"`, a unique Definition-local `contentKey`, positive `maxCharacters`, and positive `maxLines`.
- Authored fields are rejected on non-authored static slots; literal text is rejected on authored slots. `role` and `slotId` are not identity.
- Invalid entity shape, duplicate owner/key, missing content, owner mismatch, character overflow, and line overflow are explicit Compatibility diagnostics.

### Draft and Application

- `ZineDraft.authoredTextItems` is optional for backward compatibility; absent data behaves as an empty list.
- `RecipeApplication.textAssignments` and `unplacedTextContentIds` are optional for old applications and are emitted as arrays by new application creation.
- `UPSERT_AUTHORED_TEXT`, `UPDATE_AUTHORED_TEXT`, and `DELETE_AUTHORED_TEXT` are explicit immutable reducer actions and use the existing layout Undo/Redo path.
- Recipe switching matches authored content by the same owner and `contentKey`; missing target slots remain unplaced and A -> B -> A restores the entity without role or slot-order matching.

### Renderer chain

Draft entity -> `RecipeApplication.textAssignments` -> page model -> shared `createRecipeRenderPlan` -> Editor/Reader. Authored text is never read from `textBySlotId`; optional empty text produces no render-plan slot and no reflow. Reader mode keeps the existing no-placeholder behavior.

### Explicit non-goals

- No visible authored-text editor UX, HTML/Markdown/CSS/font/AI behavior, backend or serialization work.
- No formal Recipe or Catalog entry was created. Lead Story remains a draft design direction and is not active or in the formal menu.
- No F3-A3 or F3-B work was started.

### Files

- `features/zine/model/recipe-contract.ts`
- `features/zine/model/zine-draft.ts`
- `features/zine/model/zine-manual-layout.ts`
- `features/zine/model/zine-pages.ts`
- `features/zine/components/recipe-renderer-plan.ts`
- `features/zine/components/reader/zine-reader-page.tsx`
- `features/zine/model/authored-static-text.test.ts`

The editorial Across the Record pressure state is recorded as 120 characters in the anchor brief and board.

### Verification

The F0.7-A verification completed without starting a server or browser:

- `npm run typecheck` passed.
- `npm run lint -- --max-warnings=0` passed with zero warnings.
- `npm test` passed: 52 test files, 263 tests.
- `npm run build` passed.
- `git diff --check` passed; Git emitted only existing line-ending normalization warnings.

## Phase F0.7-A.1 — State Integrity Closure

### Reducer write validation

- `UPSERT_AUTHORED_TEXT` validates the prospective complete Draft collection before writing. It rejects malformed entities, invalid IDs/owners/contentKeys/roleHints, duplicate entity IDs, duplicate owner/contentKey pairs, and unknown fields while preserving the original state.
- `UPDATE_AUTHORED_TEXT` accepts only ordinary strings and validates the prospective collection before writing. Invalid actions return the exact original state and therefore cannot create an Undo entry.
- `DELETE_AUTHORED_TEXT` is explicit and validates the existing collection before rebuilding affected Applications.

### Applied Recipe refresh and protection

- UPSERT, UPDATE, and DELETE rebuild each affected page/spread Application from the prospective Draft content through the same Compatibility and Application creation path.
- Optional authored content can become assigned after a Recipe is already applied; updates are read by both Editor and Reader from the same Draft entity.
- Optional deletion removes only the text assignment; photo assignments and slot geometry remain unchanged.
- Required missing/owner-mismatched/over-limit content referenced by the current Application rejects the action and preserves the old text and Application.
- Unplaced content remains editable and is not constrained by an unused Recipe slot; a future valid match is decided by Compatibility.

### Owner and identity semantics

- Page owners require the same `pageId`.
- Spread owners require exactly two distinct `targetPageIds`, an included `anchorPageId`, and ordered identity equality.
- Page → spread assignment is allowed only when the target page explicitly matches the authored Slot `pageSide`.
- Spread → page does not infer a side or duplicate the entity; it remains unplaced unless a valid explicit page identity exists.
- Both sides of a spread continue to reference one shared Application object and one `textContentId`.
- `contentKey` selects the content meaning, Slot `role` selects current layout responsibility, and Draft `roleHint` is only an authoring hint. A Recipe may render `story-title` with a `label` role without changing identity.

### F0.7-A.1 test coverage

Added regression coverage for invalid reducer writes/history, duplicate identity, integer limits, owner cardinality/order, optional add/update/delete, required protection, unplaced editing, A → B → A restoration, page/spread mapping, old Draft/Application compatibility, shared spread Application identity, Reader unassigned-content suppression, and plain HTML-looking text.

F0.7-A.1 is complete pending collaborative review. No visible editor UX, formal Recipe/Catalog entry, F3-A3, or F3-B work was started.

F3-B2.2 keeps authored text identity and fixed geometry unchanged. The shared typography estimator now measures authored `title` and `deck` slots against each Recipe canvas, so compatibility and Render Plan diagnostics use the same role/token/line-box source. This is a generic renderer foundation change, not an Editorial-specific branch; the Editorial drafts remain draft and still require user visual verification.
