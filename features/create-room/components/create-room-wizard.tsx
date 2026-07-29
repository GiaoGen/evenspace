"use client";

import Link from "next/link";
import { useEffect, useReducer, useRef, useState, type FormEvent } from "react";
import { createRoomAction } from "@/app/rooms/new/actions";
import { Icon } from "@/components/ui/icon";
import { useBrowserOrigin } from "@/core/web/use-browser-origin";
import { clearCreateRoomDraft, loadCreateRoomDraft, saveCreateRoomDraft } from "../model/create-room-draft-storage";
import { createRoomReducer, initialCreateRoomState, validateDraft } from "../model/create-room-machine";
import { InvitationCard } from "./invitation-card";
import { DetailsStep } from "./steps/details-step";
import { ReviewStep } from "./steps/review-step";
import { TimingStep } from "./steps/timing-step";
import { WizardHeader, WizardShell } from "./wizard-shell";
import styles from "./create-room-wizard.module.css";

export function CreateRoomWizard() {
  const [state, dispatch] = useReducer(createRoomReducer, initialCreateRoomState);
  const [draftReady, setDraftReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const origin = useBrowserOrigin();
  const submittingRef = useRef(false);
  const idempotencyKeyRef = useRef<string | null>(null);
  const inviteSecretsRef = useRef<{ token: string; code: string } | null>(null);

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

  if (state.status === "complete") {
    const endTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(state.room.endsAt));
    const invitePath = `/join/${state.room.publicId}?token=${encodeURIComponent(state.room.inviteToken)}`;
    const inviteUrl = origin ? `${origin}${invitePath}` : "";
    return <div className={styles.page}><WizardHeader title="Room ready" returnLabel="Return to rooms" /><main className={styles.complete}>
      <header><span><Icon name="check" /></span><div><small>Room created</small><h1>{state.room.name}</h1></div></header>
      <InvitationCard name={state.room.name} draft={state.room.draft} endTime={endTime} inviteCode={state.room.inviteCode} inviteUrl={inviteUrl} />
      <div className={styles.inviteActions}><button type="button" onClick={() => navigator.clipboard.writeText(inviteUrl)} disabled={!inviteUrl}><Icon name="share" />Copy invite link</button><Link href={`/rooms/${state.room.publicId}`}>View in your rooms <Icon name="arrow" /></Link></div>
    </main></div>;
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "editing") return;
    if (state.step !== "review") { dispatch({ type: "NEXT" }); return; }
    if (Object.values(validateDraft(state.draft)).some(Boolean)) {
      dispatch({ type: "SUBMIT" });
      return;
    }
    if (submittingRef.current) return;
    submittingRef.current = true;
    setSubmitting(true);
    setSubmissionError("");
    idempotencyKeyRef.current ??= crypto.randomUUID();
    inviteSecretsRef.current ??= createInviteSecrets();
    const result = await createRoomAction({
      ...state.draft,
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
      idempotencyKey: idempotencyKeyRef.current,
      inviteToken: inviteSecretsRef.current.token,
      inviteCode: inviteSecretsRef.current.code,
    });

    if (result.status === "error") {
      setSubmissionError(result.message);
      setSubmitting(false);
      submittingRef.current = false;
      return;
    }

    clearCreateRoomDraft();
    dispatch({
      type: "COMPLETE",
      room: {
        id: result.room.id,
        publicId: result.room.publicId,
        name: result.room.name,
        createdAt: result.room.startsAt,
        endsAt: result.room.endsAt,
        inviteToken: result.room.inviteToken,
        inviteCode: result.room.inviteCode,
        inviteRevision: result.room.inviteRevision,
        draft: state.draft,
      },
    });
  }

  const content = state.step === "details"
    ? <DetailsStep draft={state.draft} nameError={state.errors.name} descriptionError={state.errors.description} setName={(value) => dispatch({ type: "SET_NAME", value })} setDescription={(value) => dispatch({ type: "SET_DESCRIPTION", value })} />
    : state.step === "timing"
        ? <TimingStep draft={state.draft} durationError={state.errors.durationMinutes} memberError={state.errors.memberLimit} setDuration={(value) => dispatch({ type: "SET_DURATION", value })} setLimit={(value) => dispatch({ type: "SET_MEMBER_LIMIT", value })} />
        : <ReviewStep draft={state.draft} termsError={state.errors.acceptedTerms} setTerms={(value) => dispatch({ type: "SET_TERMS", value })} onEdit={(step) => dispatch({ type: "GO_TO", step })} />;

  return <WizardShell step={state.step} submitting={submitting} onBack={() => dispatch({ type: "BACK" })} onSubmit={submit}>{content}{submissionError ? <p className={styles.error} role="alert">{submissionError}</p> : null}</WizardShell>;
}

function createInviteSecrets() {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const binary = Array.from(bytes, (value) => String.fromCharCode(value)).join("");
  const token = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const codeBytes = crypto.getRandomValues(new Uint8Array(8));
  const code = Array.from(codeBytes, (value) => alphabet[value % alphabet.length]).join("");
  return { token, code };
}
