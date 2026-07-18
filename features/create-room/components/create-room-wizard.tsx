"use client";

import Link from "next/link";
import { useEffect, useMemo, useReducer, useRef, useState, type FormEvent, type ReactNode } from "react";
import { Icon } from "@/components/ui/icon";
import { roomId, roomPublicId, type RoomPublicId } from "@/core/domain/ids";
import { createCompactId, createUuid } from "@/core/domain/uuid";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { createRoomFromDraft } from "@/features/mock-session/model/mock-session";
import { createRoomReducer, createRoomSteps, initialCreateRoomState, validateDraft, type CreateRoomDraft, type CreateRoomStep } from "../model/create-room-machine";
import styles from "./create-room-wizard.module.css";

const stepLabels: Record<CreateRoomStep, string> = { details: "Room identity", leadership: "Decision model", timing: "Time and capacity", access: "Private access", review: "Review" };
const durationHours = Array.from({ length: 25 }, (_, hour) => hour);
const durationMinutes = Array.from({ length: 12 }, (_, index) => index * 5);
const wheelRepeatCount = 9;
const wheelCenterSegment = Math.floor(wheelRepeatCount / 2);

function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} min`;
  if (rest === 0) return `${hours} ${hours === 1 ? "hour" : "hours"}`;
  return `${hours}h ${rest}m`;
}

function Choice({ active, icon, title, copy, onClick }: { readonly active: boolean; readonly icon: ReactNode; readonly title: string; readonly copy: string; readonly onClick: () => void }) {
  return <button type="button" className={`${styles.choice} ${active ? styles.choiceActive : ""}`} onClick={onClick}><span className={styles.choiceIcon}>{icon}</span><span><strong>{title}</strong><small>{copy}</small></span><i /></button>;
}

function Toggle({ active, onClick }: { readonly active: boolean; readonly onClick: () => void }) {
  return <button type="button" className={`${styles.toggle} ${active ? styles.toggleOn : ""}`} onClick={onClick} aria-label={active ? "Turn off" : "Turn on"}><i /></button>;
}

function DetailsStep({ draft, nameError, descriptionError, setName, setDescription }: { readonly draft: CreateRoomDraft; readonly nameError?: string; readonly descriptionError?: string; readonly setName: (value: string) => void; readonly setDescription: (value: string) => void }) {
  return <><p className={styles.eyebrow}>Start with the feeling</p><h1>Give the moment<br /><em>a name.</em></h1><p className={styles.intro}>People will see this before they enter. Keep it short enough to feel like an invitation.</p><label>Room name <span>{draft.name.length} / 80</span></label><input className={nameError ? styles.invalid : ""} autoFocus value={draft.name} onChange={(event) => setName(event.target.value)} placeholder="After the rain" maxLength={80} />{nameError ? <p className={styles.error}>{nameError}</p> : null}<label>Description 路 Optional <span>{draft.description.length} / 500</span></label><textarea className={descriptionError ? styles.invalid : ""} value={draft.description} onChange={(event) => setDescription(event.target.value)} placeholder="Rain stopped. Nobody wanted to go home yet." maxLength={500} rows={3} />{descriptionError ? <p className={styles.error}>{descriptionError}</p> : null}</>;
}

function LeadershipStep({ draft, setLeadership }: { readonly draft: CreateRoomDraft; readonly setLeadership: (value: CreateRoomDraft["leadership"]) => void }) {
  return <><p className={styles.eyebrow}>How decisions get made</p><h1>Who should lead<br /><em>this moment?</em></h1><p className={styles.intro}>This choice stays with the room and cannot be changed after creation.</p><div className={styles.choiceList}><Choice active={draft.leadership === "host-led"} icon={<Icon name="members" />} title="Host-led" copy="A host and admins guide the room." onClick={() => setLeadership("host-led")} /><Choice active={draft.leadership === "community-led"} icon={<Icon name="heart" />} title="Community-led" copy="Members make room decisions by vote." onClick={() => setLeadership("community-led")} /></div></>;
}
function WheelColumn({ label, values, selected, format, disabled, onSelect }: { readonly label: string; readonly values: readonly number[]; readonly selected: number; readonly format: (value: number) => string; readonly disabled?: (value: number) => boolean; readonly onSelect: (value: number) => void }) {
  const scrollerRef = useRef<HTMLDivElement | null>(null);
  const settleRef = useRef<number | null>(null);
  const repeatedValues = useMemo(() => Array.from({ length: wheelRepeatCount }, (_, segment) => values.map((value, index) => ({ value, index, segment, wheelIndex: segment * values.length + index }))).flat(), [values]);
  const selectedIndex = values.indexOf(selected);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || selectedIndex < 0) return;
    const target = scroller.querySelector<HTMLButtonElement>(`button[data-wheel-index="${wheelCenterSegment * values.length + selectedIndex}"]`);
    target?.scrollIntoView({ block: "center" });
  }, [selectedIndex, values.length]);

  function settleOnCenter() {
    if (settleRef.current !== null) window.clearTimeout(settleRef.current);
    settleRef.current = window.setTimeout(() => {
      const scroller = scrollerRef.current;
      if (!scroller) return;
      const center = scroller.getBoundingClientRect().top + scroller.clientHeight / 2;
      const buttons = [...scroller.querySelectorAll<HTMLButtonElement>("button[data-wheel-index]")].filter((button) => !button.disabled);
      const closest = buttons.reduce<HTMLButtonElement | null>((best, button) => {
        const rect = button.getBoundingClientRect();
        const distance = Math.abs(rect.top + rect.height / 2 - center);
        if (!best) return button;
        const bestRect = best.getBoundingClientRect();
        return distance < Math.abs(bestRect.top + bestRect.height / 2 - center) ? button : best;
      }, null);
      if (!closest) return;
      const value = Number(closest.dataset.value);
      const index = Number(closest.dataset.index);
      const segment = Number(closest.dataset.segment);
      if (Number.isFinite(value) && value !== selected) onSelect(value);
      if (Number.isFinite(index) && Number.isFinite(segment) && segment !== wheelCenterSegment) {
        const target = scroller.querySelector<HTMLButtonElement>(`button[data-wheel-index="${wheelCenterSegment * values.length + index}"]`);
        target?.scrollIntoView({ block: "center" });
      }
    }, 90);
  }

  return <div><span>{label}</span><div ref={scrollerRef} className={styles.durationWheel} onScroll={settleOnCenter}>{repeatedValues.map((item) => <button type="button" key={item.wheelIndex} data-value={item.value} data-index={item.index} data-segment={item.segment} data-wheel-index={item.wheelIndex} className={selected === item.value ? styles.durationWheelActive : ""} disabled={disabled?.(item.value)} onClick={() => onSelect(item.value)}>{format(item.value)}</button>)}</div></div>;
}
function TimingWheelStep({ draft, durationError, memberError, setDuration, setLimit }: { readonly draft: CreateRoomDraft; readonly durationError?: string; readonly memberError?: string; readonly setDuration: (value: number) => void; readonly setLimit: (value: number) => void }) {
  const selectedHour = Math.floor(draft.durationMinutes / 60);
  const selectedMinute = draft.durationMinutes % 60;
  const updateDuration = (hour: number, minute: number) => setDuration(Math.min(1440, Math.max(15, hour * 60 + minute)));
  return <><p className={styles.eyebrow}>Temporary by design</p><h1>How long should<br /><em>it stay live?</em></h1><p className={styles.intro}>Local rooms use the free first-version limits. The backend will enforce the same rules with server time later.</p><label>Room duration <span>{formatDuration(draft.durationMinutes)}</span></label><div className={styles.durationWheels}><WheelColumn label="Hours" values={durationHours} selected={selectedHour} format={(hour) => String(hour).padStart(2, "0")} onSelect={(hour) => updateDuration(hour, selectedMinute)} /><WheelColumn label="Minutes" values={durationMinutes} selected={selectedMinute} format={(minute) => String(minute).padStart(2, "0")} disabled={(minute) => selectedHour === 24 && minute > 0 || selectedHour === 0 && minute < 15} onSelect={(minute) => updateDuration(selectedHour, minute)} /></div>{durationError ? <p className={styles.error}>{durationError}</p> : null}<label>Maximum people</label><div className={styles.stepper}><button type="button" onClick={() => setLimit(draft.memberLimit - 1)} disabled={draft.memberLimit <= 2}>-</button><strong>{draft.memberLimit}</strong><button type="button" onClick={() => setLimit(draft.memberLimit + 1)} disabled={draft.memberLimit >= 10}>+</button><span>Default itinerary capacity follows this limit.</span></div>{memberError ? <p className={styles.error}>{memberError}</p> : null}</>;
}

function AccessStep({ draft, update }: { readonly draft: CreateRoomDraft; readonly update: (patch: Partial<CreateRoomDraft>) => void }) {
  return <><p className={styles.eyebrow}>Private from the start</p><h1>Choose how people<br /><em>step inside.</em></h1><p className={styles.intro}>Rooms are never publicly discoverable. Invitations only control how invited people enter.</p><div className={styles.choiceList}><Choice active={draft.entryPolicy === "link"} icon={<Icon name="share" />} title="Invitation link" copy="The QR code opens this same private link." onClick={() => update({ entryPolicy: "link" })} /><Choice active={draft.entryPolicy === "invite-code"} icon={<strong className={styles.codeIcon}>7K2P</strong>} title="Invite code" copy="Guests enter a code you can revoke later." onClick={() => update({ entryPolicy: "invite-code" })} /></div><div className={styles.settingRows}><div><span><strong>Approve entry requests</strong><small>{draft.leadership === "host-led" ? "Host and admins review the avatar, name and note." : "Existing members decide each request by majority vote."}</small></span><Toggle active={draft.requiresApproval} onClick={() => update({ requiresApproval: !draft.requiresApproval })} /></div><div className={styles.memberListRow}><span><strong>Member list</strong><small>{draft.leadership === "community-led" ? "Always visible to members in a Community-led room" : draft.memberListVisibility === "members" ? "Visible to everyone in the room" : "Visible only to Host and admins"}</small></span><div className={styles.memberVisibilityControl} aria-label="Member list visibility"><button type="button" className={draft.memberListVisibility === "moderators" ? styles.memberVisibilityActive : ""} disabled={draft.leadership === "community-led"} onClick={() => update({ memberListVisibility: "moderators" })}>Moderators</button><i /><button type="button" className={draft.memberListVisibility === "members" ? styles.memberVisibilityActive : ""} onClick={() => update({ memberListVisibility: "members" })}>Everyone</button></div></div></div></>;
}

function ReviewStep({ draft, termsError, setTerms }: { readonly draft: CreateRoomDraft; readonly termsError?: string; readonly setTerms: (value: boolean) => void }) {
  const duration = formatDuration(draft.durationMinutes);
  return <><p className={styles.eyebrow}>Ready when you are</p><h1>One last look,<br /><em>then it&apos;s live.</em></h1><p className={styles.intro}>This room is saved to this browser&apos;s local EventSpace data. No backend server is connected yet.</p><div className={styles.review}><div><span>Room</span><strong>{draft.name.trim()}</strong><small>{draft.description.trim() || "No description"}</small></div><div><span>Leadership</span><strong>{draft.leadership === "host-led" ? "Host-led" : "Community-led"}</strong><small>Cannot be changed later</small></div><div><span>Time</span><strong>{duration}</strong><small>Up to {draft.memberLimit} people</small></div><div><span>Access</span><strong>{draft.entryPolicy === "link" ? "Private link + QR" : "Invite code"}</strong><small>{draft.requiresApproval ? "Approval required" : "No entry approval"}</small></div></div><button type="button" className={`${styles.consent} ${draft.acceptedTerms ? styles.consentChecked : ""}`} onClick={() => setTerms(!draft.acceptedTerms)}><span>{draft.acceptedTerms ? <Icon name="check" size={13} /> : null}</span><p>I&apos;m at least 16 and agree to the Terms and Privacy Policy.</p></button>{termsError ? <p className={styles.error}>{termsError}</p> : null}</>;
}

function InvitationCard({ room, endTime }: { readonly room: { readonly name: string; readonly inviteCode: string; readonly draft: CreateRoomDraft }; readonly endTime: string }) {
  const qrCells = Array.from({ length: 49 }, (_, index) => index % 2 === 0 || index % 11 === 0 || [3, 5, 17, 23, 31, 41].includes(index));
  return <div className={styles.inviteCard}><header><strong>{room.name}</strong><span>{room.draft.leadership === "host-led" ? "Host-led" : "Community-led"}</span></header><div className={styles.inviteCenter}>{room.draft.entryPolicy === "link" ? <div className={styles.fakeQr} aria-label="Mock invitation QR code">{qrCells.map((filled, index) => <i key={index} className={filled ? styles.qrFilled : ""} />)}</div> : <strong className={styles.inviteCode}>{room.inviteCode}</strong>}</div><footer><span><small>Duration</small>{formatDuration(room.draft.durationMinutes)}</span><span><small>Ends</small>{endTime}</span><span><small>People</small>Up to {room.draft.memberLimit}</span></footer></div>;
}

export function CreateRoomWizard() {
  const [state, dispatch] = useReducer(createRoomReducer, initialCreateRoomState);
  const { session, dispatch: dispatchSession } = useMockSession();
  const [createdPublicId, setCreatedPublicId] = useState<RoomPublicId | null>(null);

  if (session.viewer.authState !== "signed-in") {
    return <div className={styles.page}><header className={styles.header}><Link href="/rooms" aria-label="Return to rooms"><Icon name="close" /></Link><strong>Create a room</strong><span>Sign-in required</span></header><main className={styles.complete}><span className={styles.completeMark}><Icon name="members" size={27} /></span><p className={styles.eyebrow}>Keep ownership clear</p><h1>Sign in before<br /><em>you host.</em></h1><p>Room creation requires an account. In this local-first build, account mode is stored on this browser and no real authentication occurs.</p><div className={styles.completeActions}><Link href="/account">Open local account <Icon name="arrow" /></Link><Link href="/rooms">Back to rooms</Link></div></main></div>;
  }

  if (state.status === "complete") {
    const endTime = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(state.room.endsAt));
    return <div className={styles.page}><header className={styles.header}><Link href="/rooms" aria-label="Return to rooms"><Icon name="arrow" /></Link><strong>Room ready</strong><span>Local data</span></header><main className={styles.complete}><span className={styles.completeMark}><Icon name="check" size={27} /></span><p className={styles.eyebrow}>Room created</p><h1>{state.room.name}<br /><em>is ready.</em></h1><p>This invitation card is saved locally for now. Backend sharing and real QR generation can attach to the same room payload later.</p><InvitationCard room={state.room} endTime={endTime} /><div className={styles.inviteActions}><button type="button"><Icon name="image" size={15} />Save card</button>{createdPublicId ? <Link href={`/rooms/${createdPublicId}`}>Open this room <Icon name="arrow" /></Link> : null}</div></main></div>;
  }

  const index = createRoomSteps.indexOf(state.step);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.status !== "editing") return;
    if (state.step !== "review") { dispatch({ type: "NEXT" }); return; }
    const nowIso = new Date().toISOString();
    dispatch({ type: "SUBMIT", nowIso });
    if (Object.values(validateDraft(state.draft)).some(Boolean)) return;
    const publicId = roomPublicId(`room_${createCompactId(12)}`);
    const room = createRoomFromDraft(state.draft, session.viewer, { id: roomId(createUuid()), publicId }, nowIso);
    setCreatedPublicId(publicId);
    dispatchSession({ type: "COMMAND", command: { type: "CREATE_ROOM", room, actorId: session.viewer.actorId } });
  }
  const update = (patch: Partial<CreateRoomDraft>) => { if (patch.entryPolicy) dispatch({ type: "SET_ENTRY_POLICY", value: patch.entryPolicy }); if (typeof patch.requiresApproval === "boolean") dispatch({ type: "SET_APPROVAL", value: patch.requiresApproval }); if (patch.memberListVisibility) dispatch({ type: "SET_MEMBER_VISIBILITY", value: patch.memberListVisibility }); };

  return <div className={styles.page}><header className={styles.header}><Link href="/rooms" aria-label="Cancel room creation"><Icon name="close" /></Link><strong>Create a room</strong><span>Local data</span></header><main className={styles.layout}><aside className={styles.progress}><strong>0{index + 1}<small>/ 05</small></strong><div>{createRoomSteps.map((step, stepIndex) => <i key={step} className={stepIndex <= index ? styles.progressActive : ""} />)}</div><span>{stepLabels[state.step]}</span><p>Your draft stays on this device while you create the room.</p></aside><form className={styles.card} onSubmit={submit} noValidate>{state.step === "details" ? <DetailsStep draft={state.draft} nameError={state.errors.name} descriptionError={state.errors.description} setName={(value) => dispatch({ type: "SET_NAME", value })} setDescription={(value) => dispatch({ type: "SET_DESCRIPTION", value })} /> : state.step === "leadership" ? <LeadershipStep draft={state.draft} setLeadership={(value) => dispatch({ type: "SET_LEADERSHIP", value })} /> : state.step === "timing" ? <TimingWheelStep draft={state.draft} durationError={state.errors.durationMinutes} memberError={state.errors.memberLimit} setDuration={(value) => dispatch({ type: "SET_DURATION", value })} setLimit={(value) => dispatch({ type: "SET_MEMBER_LIMIT", value })} /> : state.step === "access" ? <AccessStep draft={state.draft} update={update} /> : <ReviewStep draft={state.draft} termsError={state.errors.acceptedTerms} setTerms={(value) => dispatch({ type: "SET_TERMS", value })} />}<footer className={styles.cardFooter}><button type="button" className={styles.back} onClick={() => dispatch({ type: "BACK" })} disabled={index === 0}>Back</button><button type="submit" className={styles.continue}>{state.step === "review" ? "Create room" : "Continue"}<Icon name="arrow" /></button></footer></form></main></div>;
}
