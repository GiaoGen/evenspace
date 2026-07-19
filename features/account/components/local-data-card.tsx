import { Icon } from "@/components/ui/icon";
import type { AccountSummary } from "../model/account-summary";
import styles from "./account-page.module.css";

export function LocalDataCard({ summary, onManage }: { readonly summary: AccountSummary; readonly onManage: () => void }) {
  return (
    <button className={`${styles.dataCard} ${styles.reveal}`} type="button" onClick={onManage}>
      <span className={styles.dataMark}><i /><i /><i /></span>
      <span><small>On this device</small><strong>{summary.storedRooms} {summary.storedRooms === 1 ? "room" : "rooms"} stored locally</strong><em>Messages and media have not been uploaded to a private cloud.</em></span>
      <span className={styles.manageLabel}>Manage <Icon name="chevron" size={15} /></span>
    </button>
  );
}
