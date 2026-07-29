import { Icon } from "@/components/ui/icon";
import type { CreateRoomDraft, CreateRoomStep } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";
import { formatDuration } from "../invitation-card";

export function ReviewStep({ draft, termsError, setTerms, onEdit }: { readonly draft: CreateRoomDraft; readonly termsError?: string; readonly setTerms: (value: boolean) => void; readonly onEdit: (step: CreateRoomStep) => void }) {
  return <section className={styles.stepContent} aria-labelledby="review-title">
    <header className={styles.stepIntro}><span>Ready</span><h1 id="review-title">Create your room</h1></header>
    <div className={styles.reviewRows}>
      <button type="button" onClick={() => onEdit("details")}><span><small>Room</small><strong>{draft.name.trim()}</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("details")}><span><small>About</small><strong>{draft.description.trim() || "No description"}</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("timing")}><span><small>Duration</small><strong>{formatDuration(draft.durationMinutes)}</strong></span><Icon name="chevron" /></button>
      <button type="button" onClick={() => onEdit("timing")}><span><small>Capacity</small><strong>Up to {draft.memberLimit} people</strong></span><Icon name="chevron" /></button>
    </div>
    <button type="button" className={`${styles.consent} ${draft.acceptedTerms ? styles.consentChecked : ""}`} onClick={() => setTerms(!draft.acceptedTerms)}><span>{draft.acceptedTerms ? <Icon name="check" size={13} /> : null}</span><p>I&apos;m at least 16 and agree to the Terms and Privacy Policy.</p></button>
    {termsError ? <p className={styles.error}>{termsError}</p> : null}
  </section>;
}
