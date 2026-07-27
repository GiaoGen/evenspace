export type CreateRoomStep = "details" | "timing" | "review";

export interface CreateRoomDraft {
  readonly name: string;
  readonly description: string;
  readonly durationMinutes: number;
  readonly memberLimit: number;
  readonly acceptedTerms: boolean;
}

export interface CreatedRoom {
  readonly id: string;
  readonly publicId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly endsAt: string;
  readonly inviteToken: string;
  readonly inviteCode: string;
  readonly inviteRevision: number;
  readonly draft: CreateRoomDraft;
}

type DraftField = keyof CreateRoomDraft;
export type CreateRoomErrors = Partial<Record<DraftField, string>>;

export type CreateRoomState =
  | { readonly status: "editing"; readonly step: CreateRoomStep; readonly draft: CreateRoomDraft; readonly errors: CreateRoomErrors }
  | { readonly status: "complete"; readonly room: CreatedRoom };

export type CreateRoomEvent =
  | { readonly type: "RESTORE_DRAFT"; readonly draft: CreateRoomDraft }
  | { readonly type: "SET_NAME"; readonly value: string }
  | { readonly type: "SET_DESCRIPTION"; readonly value: string }
  | { readonly type: "SET_DURATION"; readonly value: number }
  | { readonly type: "SET_MEMBER_LIMIT"; readonly value: number }
  | { readonly type: "SET_TERMS"; readonly value: boolean }
  | { readonly type: "NEXT" }
  | { readonly type: "BACK" }
  | { readonly type: "GO_TO"; readonly step: CreateRoomStep }
  | { readonly type: "SUBMIT" }
  | { readonly type: "COMPLETE"; readonly room: CreatedRoom }
  | { readonly type: "RESET" };

export const createRoomSteps: readonly CreateRoomStep[] = ["details", "timing", "review"];

export const initialCreateRoomDraft: CreateRoomDraft = {
  name: "",
  description: "",
  durationMinutes: 180,
  memberLimit: 10,
  acceptedTerms: false,
};

export const initialCreateRoomState: CreateRoomState = { status: "editing", step: "details", draft: initialCreateRoomDraft, errors: {} };

function normalizeDraft(draft: CreateRoomDraft): CreateRoomDraft {
  return {
    ...draft,
    name: draft.name.trim(),
    description: draft.description.trim(),
    durationMinutes: Math.round(draft.durationMinutes),
    memberLimit: Math.round(draft.memberLimit),
  };
}

export function validateDraft(draft: CreateRoomDraft): CreateRoomErrors {
  const errors: CreateRoomErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the room a name.";
  else if (name.length > 80) errors.name = "Keep the name within 80 characters.";
  if (draft.description.trim().length > 500) errors.description = "Keep the description within 500 characters.";
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 15 || draft.durationMinutes > 1440) errors.durationMinutes = "Choose between 15 minutes and 24 hours.";
  if (!Number.isInteger(draft.memberLimit) || draft.memberLimit < 2 || draft.memberLimit > 10) errors.memberLimit = "Free local rooms support 2 to 10 people.";
  if (!draft.acceptedTerms) errors.acceptedTerms = "Confirm the age and legal terms before creating the room.";
  return errors;
}

function errorsForStep(step: CreateRoomStep, errors: CreateRoomErrors): CreateRoomErrors {
  if (step === "details") return { name: errors.name, description: errors.description };
  if (step === "timing") return { durationMinutes: errors.durationMinutes, memberLimit: errors.memberLimit };
  if (step === "review") return { acceptedTerms: errors.acceptedTerms };
  return {};
}

function hasErrors(errors: CreateRoomErrors) {
  return Object.values(errors).some(Boolean);
}

function updateDraft(state: Extract<CreateRoomState, { status: "editing" }>, patch: Partial<CreateRoomDraft>): CreateRoomState {
  return { ...state, draft: { ...state.draft, ...patch }, errors: {} };
}

export function createRoomReducer(state: CreateRoomState, event: CreateRoomEvent): CreateRoomState {
  if (event.type === "RESET") return initialCreateRoomState;
  if (state.status === "complete") return state;
  if (event.type === "COMPLETE") return { status: "complete", room: event.room };

  if (event.type === "RESTORE_DRAFT") return { ...state, draft: normalizeDraft({ ...event.draft, acceptedTerms: false }), errors: {} };
  if (event.type === "SET_NAME") return updateDraft(state, { name: event.value.slice(0, 80) });
  if (event.type === "SET_DESCRIPTION") return updateDraft(state, { description: event.value.slice(0, 500) });
  if (event.type === "SET_DURATION") return updateDraft(state, { durationMinutes: event.value });
  if (event.type === "SET_MEMBER_LIMIT") return updateDraft(state, { memberLimit: Math.min(Math.max(Math.round(event.value), 2), 10) });
  if (event.type === "SET_TERMS") return updateDraft(state, { acceptedTerms: event.value });

  if (event.type === "BACK") {
    const index = createRoomSteps.indexOf(state.step);
    return index > 0 ? { ...state, step: createRoomSteps[index - 1], errors: {} } : state;
  }

  if (event.type === "GO_TO") return { ...state, step: event.step, errors: {} };

  if (event.type === "NEXT") {
    const errors = errorsForStep(state.step, validateDraft(state.draft));
    if (hasErrors(errors)) return { ...state, errors };
    const index = createRoomSteps.indexOf(state.step);
    return index < createRoomSteps.length - 1 ? { ...state, step: createRoomSteps[index + 1], errors: {} } : state;
  }

  if (event.type === "SUBMIT" && state.step === "review") {
    const errors = validateDraft(state.draft);
    if (hasErrors(errors)) {
      const invalidStep: CreateRoomStep = errors.name || errors.description ? "details" : errors.durationMinutes || errors.memberLimit ? "timing" : "review";
      return { ...state, step: invalidStep, errors };
    }
    return state;
  }

  return state;
}
