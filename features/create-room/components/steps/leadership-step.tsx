import { Icon } from "@/components/ui/icon";
import type { CreateRoomDraft } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";
import { ChoiceCard } from "../wizard-controls";

export function LeadershipStep({ draft, setLeadership }: { readonly draft: CreateRoomDraft; readonly setLeadership: (value: CreateRoomDraft["leadership"]) => void }) {
  return <section className={styles.stepContent} aria-labelledby="leadership-title">
    <header className={styles.stepIntro}><span>Decision model</span><h1 id="leadership-title">Who decides?</h1><p>This choice stays with the room after it opens.</p></header>
    <div className={styles.choiceList}>
      <ChoiceCard active={draft.leadership === "host-led"} icon={<Icon name="members" />} title="Host-led" copy="The Host and admins guide room decisions." onClick={() => setLeadership("host-led")} />
      <ChoiceCard active={draft.leadership === "community-led"} icon={<Icon name="heart" />} title="Community-led" copy="Members decide room changes through votes." onClick={() => setLeadership("community-led")} />
    </div>
    <details className={styles.explainer}><summary>What changes?</summary><p>Host-led rooms move quickly with clear moderators. Community-led rooms keep member visibility open and use majority votes for shared decisions.</p></details>
  </section>;
}
