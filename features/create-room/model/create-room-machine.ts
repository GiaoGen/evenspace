export type CreateRoomStep = "details" | "leadership" | "timing" | "access" | "review";
export type RoomLeadership = "host-led" | "community-led";
export type EntryPolicy = "link" | "invite-code";
export type MemberListVisibility = "members" | "moderators";

export interface CreateRoomDraft {
  readonly name: string;
  readonly description: string;
  readonly leadership: RoomLeadership;
  readonly durationMinutes: number;
  readonly memberLimit: number;
  readonly entryPolicy: EntryPolicy;
  readonly requiresApproval: boolean;
  readonly memberListVisibility: MemberListVisibility;
  readonly acceptedTerms: boolean;
}

export interface CreatedLocalRoom {
  readonly localId: string;
  readonly name: string;
  readonly createdAt: string;
  readonly endsAt: string;
  readonly inviteCode: string;
  readonly draft: CreateRoomDraft;
}

type DraftField = keyof CreateRoomDraft;
export type CreateRoomErrors = Partial<Record<DraftField, string>>;

export type CreateRoomState =
  | { readonly status: "editing"; readonly step: CreateRoomStep; readonly draft: CreateRoomDraft; readonly errors: CreateRoomErrors }
  | { readonly status: "complete"; readonly room: CreatedLocalRoom };

export type CreateRoomEvent =
  | { readonly type: "RESTORE_DRAFT"; readonly draft: CreateRoomDraft }
  | { readonly type: "SET_NAME"; readonly value: string }
  | { readonly type: "SET_DESCRIPTION"; readonly value: string }
  | { readonly type: "SET_LEADERSHIP"; readonly value: RoomLeadership }
  | { readonly type: "SET_DURATION"; readonly value: number }
  | { readonly type: "SET_MEMBER_LIMIT"; readonly value: number }
  | { readonly type: "SET_ENTRY_POLICY"; readonly value: EntryPolicy }
  | { readonly type: "SET_APPROVAL"; readonly value: boolean }
  | { readonly type: "SET_MEMBER_VISIBILITY"; readonly value: MemberListVisibility }
  | { readonly type: "SET_TERMS"; readonly value: boolean }
  | { readonly type: "NEXT" }
  | { readonly type: "BACK" }
  | { readonly type: "GO_TO"; readonly step: CreateRoomStep }
  | { readonly type: "SUBMIT"; readonly nowIso: string }
  | { readonly type: "RESET" };

export const createRoomSteps: readonly CreateRoomStep[] = ["details", "leadership", "timing", "access", "review"];

export const initialCreateRoomDraft: CreateRoomDraft = {
  name: "",
  description: "",
  leadership: "host-led",
  durationMinutes: 180,
  memberLimit: 10,
  entryPolicy: "link",
  requiresApproval: true,
  memberListVisibility: "members",
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
    memberListVisibility: draft.leadership === "community-led" ? "members" : draft.memberListVisibility,
  };
}

export function validateDraft(draft: CreateRoomDraft): CreateRoomErrors {
  const errors: CreateRoomErrors = {};
  const name = draft.name.trim();
  if (!name) errors.name = "Give the room a name.";
  else if (name.length > 80) errors.name = "Keep the name within 80 characters.";
  if (draft.description.trim().length > 500) errors.description = "Keep the description within 500 characters.";
  if (draft.leadership !== "host-led" && draft.leadership !== "community-led") errors.leadership = "Choose a valid decision model.";
  if (!Number.isInteger(draft.durationMinutes) || draft.durationMinutes < 15 || draft.durationMinutes > 1440) errors.durationMinutes = "Choose between 15 minutes and 24 hours.";
  if (!Number.isInteger(draft.memberLimit) || draft.memberLimit < 2 || draft.memberLimit > 10) errors.memberLimit = "Free local rooms support 2 to 10 people.";
  if (draft.entryPolicy !== "link" && draft.entryPolicy !== "invite-code") errors.entryPolicy = "Choose a valid private entry method.";
  if (draft.memberListVisibility !== "members" && draft.memberListVisibility !== "moderators") errors.memberListVisibility = "Choose a valid member-list setting.";
  if (draft.leadership === "community-led" && draft.memberListVisibility !== "members") errors.memberListVisibility = "Community-led rooms keep the member list visible to all members.";
  if (!draft.acceptedTerms) errors.acceptedTerms = "Confirm the age and legal terms before creating the room.";
  return errors;
}

function errorsForStep(step: CreateRoomStep, errors: CreateRoomErrors): CreateRoomErrors {
  if (step === "details") return { name: errors.name, description: errors.description };
  if (step === "leadership") return { leadership: errors.leadership };
  if (step === "timing") return { durationMinutes: errors.durationMinutes, memberLimit: errors.memberLimit };
  if (step === "access") return { entryPolicy: errors.entryPolicy, memberListVisibility: errors.memberListVisibility };
  if (step === "review") return { acceptedTerms: errors.acceptedTerms };
  return {};
}

function hasErrors(errors: CreateRoomErrors) {
  return Object.values(errors).some(Boolean);
}

function updateDraft(state: Extract<CreateRoomState, { status: "editing" }>, patch: Partial<CreateRoomDraft>): CreateRoomState {
  return { ...state, draft: { ...state.draft, ...patch }, errors: {} };
}

function createResult(draft: CreateRoomDraft, nowIso: string): CreatedLocalRoom | null {
  const now = Date.parse(nowIso);
  if (!Number.isFinite(now)) return null;
  const safeDraft = normalizeDraft(draft);
  return {
    localId: `local_${Math.floor(now / 1000).toString(36)}`,
    name: safeDraft.name,
    createdAt: new Date(now).toISOString(),
    endsAt: new Date(now + safeDraft.durationMinutes * 60_000).toISOString(),
    inviteCode: `M${Math.floor(now / 1000).toString(36).slice(-5).toUpperCase()}`,
    draft: safeDraft,
  };
}

export function createRoomReducer(state: CreateRoomState, event: CreateRoomEvent): CreateRoomState {
  if (event.type === "RESET") return initialCreateRoomState;
  if (state.status === "complete") return state;

  if (event.type === "RESTORE_DRAFT") return { ...state, draft: normalizeDraft({ ...event.draft, acceptedTerms: false }), errors: {} };
  if (event.type === "SET_NAME") return updateDraft(state, { name: event.value.slice(0, 80) });
  if (event.type === "SET_DESCRIPTION") return updateDraft(state, { description: event.value.slice(0, 500) });
  if (event.type === "SET_LEADERSHIP") return updateDraft(state, { leadership: event.value, ...(event.value === "community-led" ? { memberListVisibility: "members" as const } : {}) });
  if (event.type === "SET_DURATION") return updateDraft(state, { durationMinutes: event.value });
  if (event.type === "SET_MEMBER_LIMIT") return updateDraft(state, { memberLimit: Math.min(Math.max(Math.round(event.value), 2), 10) });
  if (event.type === "SET_ENTRY_POLICY") return updateDraft(state, { entryPolicy: event.value });
  if (event.type === "SET_APPROVAL") return updateDraft(state, { requiresApproval: event.value });
  if (event.type === "SET_MEMBER_VISIBILITY") return updateDraft(state, { memberListVisibility: state.draft.leadership === "community-led" ? "members" : event.value });
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
      const invalidStep: CreateRoomStep = errors.name || errors.description ? "details" : errors.leadership ? "leadership" : errors.durationMinutes || errors.memberLimit ? "timing" : errors.entryPolicy || errors.memberListVisibility ? "access" : "review";
      return { ...state, step: invalidStep, errors };
    }
    const room = createResult(state.draft, event.nowIso);
    return room ? { status: "complete", room } : state;
  }

  return state;
}
