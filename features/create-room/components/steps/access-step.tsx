import { Icon } from "@/components/ui/icon";
import type { CreateRoomDraft } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";
import { ChoiceCard, Toggle } from "../wizard-controls";

export function AccessStep({ draft, update }: { readonly draft: CreateRoomDraft; readonly update: (patch: Partial<CreateRoomDraft>) => void }) {
  return <section className={styles.stepContent} aria-labelledby="access-title">
    <header className={styles.stepIntro}><span>Private access</span><h1 id="access-title">How do people join?</h1><p>The room never appears in public search.</p></header>
    <div className={styles.accessChoices}>
      <ChoiceCard active={draft.entryPolicy === "link"} icon={<Icon name="share" />} title="Private link" copy="Includes a QR invitation." onClick={() => update({ entryPolicy: "link" })} />
      <ChoiceCard active={draft.entryPolicy === "invite-code"} icon={<strong className={styles.codeIcon}>7K2P</strong>} title="Invite code" copy="A short revocable code." onClick={() => update({ entryPolicy: "invite-code" })} />
    </div>
    <div className={styles.settingCard}>
      <div className={styles.settingRow}><span><strong>Approve entry requests</strong><small>{draft.leadership === "host-led" ? "Host and admins review each request." : "Members approve requests by majority vote."}</small></span><Toggle active={draft.requiresApproval} label={draft.requiresApproval ? "Turn off entry approval" : "Turn on entry approval"} onClick={() => update({ requiresApproval: !draft.requiresApproval })} /></div>
      <div className={styles.memberListRow}><span><strong>Member list</strong><small>{draft.leadership === "community-led" ? "Community-led rooms keep this visible to everyone." : draft.memberListVisibility === "members" ? "Visible to everyone in the room." : "Visible only to moderators."}</small></span><div className={styles.memberVisibilityControl} aria-label="Member list visibility"><button type="button" className={draft.memberListVisibility === "moderators" ? styles.memberVisibilityActive : ""} disabled={draft.leadership === "community-led"} onClick={() => update({ memberListVisibility: "moderators" })}>Moderators</button><i /><button type="button" className={draft.memberListVisibility === "members" ? styles.memberVisibilityActive : ""} onClick={() => update({ memberListVisibility: "members" })}>Everyone</button></div></div>
    </div>
  </section>;
}
