"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { RoomPublicId } from "@/core/domain/ids";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { clearCreateRoomDraft, loadCreateRoomDraft, saveCreateRoomDraft } from "../model/create-room-draft-storage";
import { createRoomReducer, initialCreateRoomState, validateDraft, type CreateRoomDraft } from "../model/create-room-machine";
import { createLocalRoom } from "../services/create-room-service";
import { InvitationCard, downloadInvitationCard } from "./invitation-card";
import { AccessStep } from "./steps/access-step";
import { DetailsStep } from "./steps/details-step";
import { LeadershipStep } from "./steps/leadership-step";
import { ReviewStep } from "./steps/review-step";
import { TimingStep } from "./steps/timing-step";
import { WizardHeader, WizardShell } from "./wizard-shell";
import styles from "./create-room-wizard.module.css";

export function CreateRoomWizard() {
  const [state, dispatch] = useReducer(createRoomReducer, initialCreateRoomState);
  const { session, dispatch: dispatchSession } = useMockSession();
  const [createdPublicId, setCreatedPublicId] = useState<RoomPublicId | null>(null);
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const submittingRef = useRef(false);

  useEffect(() => {
    const restored = loadCreateRoomDraft();
    const restore = () => {
      if (restored) dispatch({ type: "RESTORE_DRAFT", draft: restored });
      setDraftReady(true);
    };
    if (typeof queueMicrotask === "function") queueMicrotask(restore);
    else void Promise.resolve().then(restore);
  }, []);

  useEffect(() => {
    if (draftReady && state.status === "editing") saveCreateRoomDraft(state.draft);
  }, [draftReady, state]);

  useEffect(() => {
    if (!draftReady || state.status !== "editing" || !state.draft.name.trim()) return;
    const preventAccidentalExit = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", preventAccidentalExit);
    return () => window.removeEventListener("beforeunload", preventAccidentalExit);
  }, [draftReady, state]);

  if (session.viewer.authState !== "signed-in") {
    return <div className={styles.page}><WizardHeader title="New room" returnLabel="Return to rooms" /><main className={styles.authRequired}><span><Icon name="members" /></span><h1>Sign in to host</h1><p>Room ownership needs a local account now and a verified account when the backend is connected.</p><Link href="/account">Open account <Icon name="arrow" /></Link></main></div>;
  }

  if (state.status === "complete") {
    const endTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(state.room.endsAt));
    return <div className={styles.page}><WizardHeader title="Room ready" returnLabel="Return to rooms" /><main className={styles.complete}>
      <header><span><Icon name="check" /></span><div><small>Room created</small><h1>{state.room.name}</h1></div></header>
      <InvitationCard name={state.room.name} draft={state.room.draft} inviteCode={state.room.inviteCode} endTime={endTime} />
      <div className={styles.inviteActions}><button type="button" onClick={() => downloadInvitationCard(state.room.name, state.room.draft, state.room.inviteCode, endTime)}><Icon name="image" />Save card</button>{createdPublicId ? <Link href={`/rooms/${createdPublicId}`}>Open this room <Icon name="arrow" /></Link> : null}</div>
    </main></div>;
  }

  function update(patch: Partial<CreateRoomDraft>) {
    if (patch.entryPolicy) dispatch({ type: "SET_ENTRY_POLICY", value: patch.entryPolicy });
    if (typeof patch.requiresApproval === "boolean") dispatch({ type: "SET_APPROVAL", value: patch.requiresApproval });
    if (patch.memberListVisibility) dispatch({ type: "SET_MEMBER_VISIBILITY", value: patch.memberListVisibility });
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "editing") return;
    if (state.step !== "review") { dispatch({ type: "NEXT" }); return; }
    if (submittingRef.current || Object.values(validateDraft(state.draft)).some(Boolean)) { dispatch({ type: "SUBMIT", nowIso: new Date().toISOString() }); return; }
    submittingRef.current = true;
    setSubmitting(true);
    const nowIso = new Date().toISOString();
    const created = createLocalRoom(state.draft, session.viewer, nowIso);
    dispatchSession({ type: "COMMAND", command: { type: "CREATE_ROOM", room: created.room, actorId: session.viewer.actorId } });
    setCreatedPublicId(created.publicId);
    clearCreateRoomDraft();
    dispatch({ type: "SUBMIT", nowIso });
  }

  const content = state.step === "details"
    ? <DetailsStep draft={state.draft} nameError={state.errors.name} descriptionError={state.errors.description} setName={(value) => dispatch({ type: "SET_NAME", value })} setDescription={(value) => dispatch({ type: "SET_DESCRIPTION", value })} />
    : state.step === "leadership"
      ? <LeadershipStep draft={state.draft} setLeadership={(value) => dispatch({ type: "SET_LEADERSHIP", value })} />
      : state.step === "timing"
        ? <TimingStep draft={state.draft} durationError={state.errors.durationMinutes} memberError={state.errors.memberLimit} setDuration={(value) => dispatch({ type: "SET_DURATION", value })} setLimit={(value) => dispatch({ type: "SET_MEMBER_LIMIT", value })} />
        : state.step === "access"
          ? <AccessStep draft={state.draft} update={update} />
          : <ReviewStep draft={state.draft} termsError={state.errors.acceptedTerms} setTerms={(value) => dispatch({ type: "SET_TERMS", value })} onEdit={(step) => dispatch({ type: "GO_TO", step })} />;

  return <WizardShell step={state.step} submitting={submitting} onBack={() => dispatch({ type: "BACK" })} onSubmit={submit}>{content}</WizardShell>;
}
