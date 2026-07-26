import { initialCreateRoomDraft, type CreateRoomDraft } from "./create-room-machine";

const STORAGE_KEY = "eventspace:create-room-draft:v2";

function isDraft(value: unknown): value is CreateRoomDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<CreateRoomDraft>;
  return typeof draft.name === "string"
    && typeof draft.description === "string"
    && Number.isInteger(draft.durationMinutes)
    && Number.isInteger(draft.memberLimit)
    && typeof draft.acceptedTerms === "boolean";
}

export function loadCreateRoomDraft(): CreateRoomDraft | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const value: unknown = JSON.parse(raw);
    if (!isDraft(value)) return null;
    return {
      ...initialCreateRoomDraft,
      ...value,
      name: value.name.slice(0, 80),
      description: value.description.slice(0, 500),
      durationMinutes: Math.min(1440, Math.max(15, value.durationMinutes)),
      memberLimit: Math.min(10, Math.max(2, value.memberLimit)),
      acceptedTerms: false,
    };
  } catch {
    return null;
  }
}

export function saveCreateRoomDraft(draft: CreateRoomDraft) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...draft, acceptedTerms: false })); }
  catch { /* Safari private mode or quota failure should not block room creation. */ }
}

export function clearCreateRoomDraft() {
  try { window.localStorage.removeItem(STORAGE_KEY); }
  catch { /* The completed in-memory flow remains valid. */ }
}
