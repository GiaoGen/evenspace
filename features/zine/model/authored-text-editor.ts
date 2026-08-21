import {
  AUTHORED_TEXT_ROLE_HINTS,
  validateAuthoredTextSlot,
  type AuthoredTextItem,
  type AuthoredTextOwner,
  type AuthoredTextRoleHint,
  type RecipeDefinition,
  type RecipeStaticTextSlot,
} from "./recipe-contract";
import type { ZineLocale } from "./zine-draft";

export type AuthoredTextEditorField = {
  readonly contentKey: string;
  readonly role: AuthoredTextRoleHint;
  readonly required: boolean;
  readonly maxCharacters: number;
  readonly maxLines: number;
  readonly owner: AuthoredTextOwner;
  readonly item: AuthoredTextItem | null;
  readonly slot: RecipeStaticTextSlot;
};

/**
 * Derives visible editor fields from authored slots only.  Slot IDs never
 * become persisted identity; owner + contentKey remains the entity key.
 */
export function getAuthoredTextEditorFields({
  recipe,
  owner,
  authoredTextItems,
}: {
  readonly recipe: RecipeDefinition;
  readonly owner: AuthoredTextOwner;
  readonly authoredTextItems: readonly AuthoredTextItem[];
}): readonly AuthoredTextEditorField[] {
  return recipe.slots.flatMap((slot) => {
    if (slot.kind !== "static-text" || slot.textSource !== "authored" || !slot.contentKey) return [];
    if (!isAuthoredTextRole(slot.role)) return [];
    return [{
      contentKey: slot.contentKey,
      role: slot.role,
      required: slot.required,
      maxCharacters: slot.maxCharacters ?? 0,
      maxLines: slot.maxLines ?? 0,
      owner,
      item: authoredTextItems.find((item) => (
        item.contentKey === slot.contentKey && ownersMatchExactly(item.owner, owner)
      )) ?? null,
      slot,
    }];
  });
}

export function getAuthoredTextEditorValidation(
  recipe: RecipeDefinition,
  field: AuthoredTextEditorField,
  text: string,
  locale: ZineLocale,
) {
  return validateAuthoredTextSlot(recipe, field.slot, text, locale);
}

function isAuthoredTextRole(role: RecipeStaticTextSlot["role"]): role is AuthoredTextRoleHint {
  return (AUTHORED_TEXT_ROLE_HINTS as readonly string[]).includes(role ?? "");
}

function ownersMatchExactly(left: AuthoredTextOwner, right: AuthoredTextOwner) {
  if (left.kind !== right.kind) return false;
  if (left.kind === "page" && right.kind === "page") return left.pageId === right.pageId;
  return left.kind === "spread"
    && right.kind === "spread"
    && left.anchorPageId === right.anchorPageId
    && left.targetPageIds.length === right.targetPageIds.length
    && left.targetPageIds.every((pageId, index) => pageId === right.targetPageIds[index]);
}
