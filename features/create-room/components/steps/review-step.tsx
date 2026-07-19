import { Icon } from "@/components/ui/icon";
import type { CreateRoomDraft, CreateRoomStep } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";
import { InvitationCard, formatDuration } from "../invitation-card";

export function ReviewStep({ draft, termsError, setTerms, onEdit }: { readonly draft: CreateRoomDraft; readonly termsError?: string; readonly setTerms: (value: boolean) => void; readonly onEdit: (step: CreateRoomStep) => void }) {
  return <section className={styles.stepContent} aria-labelledby="review-title">
    <header className={styles.stepIntro}><span>Review</span><h1 id="review-title">Ready to open</h1><p>Check the invitation and room rules before it goes live.</p></header>
    <InvitationCard name={draft.name.trim()} draft={draft} endTime="After creation" compact />
    <div className={styles.reviewRows}>
      <button type="button" onClick={() => onEdit("details")}><span><small>Room</small><strong>{draft.name.trim()}</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("leadership")}><span><small>Decisions</small><strong>{draft.leadership === "host-led" ? "Host-led" : "Community-led"}</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("timing")}><span><small>Time</small><strong>{formatDuration(draft.durationMinutes)} · {draft.memberLimit} people</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("access")}><span><small>Access</small><strong>{draft.entryPolicy === "link" ? "Private link + QR" : "Invite code"}</strong></span><Icon name="chevron" /></button>
    </div>
    <button type="button" className={`${styles.consent} ${draft.acceptedTerms ? styles.consentChecked : ""}`} onClick={() => setTerms(!draft.acceptedTerms)}><span>{draft.acceptedTerms ? <Icon name="check" size={13} /> : null}</span><p>I&apos;m at least 16 and agree to the Terms and Privacy Policy.</p></button>
    {termsError ? <p className={styles.error}>{termsError}</p> : null}
  </section>;
}
