import { Icon } from "@/components/ui/icon";
import type { MockViewer } from "@/features/mock-session/model/mock-session";
import styles from "./account-page.module.css";

export function AccountModeCard({ authState, onOpen }: { readonly authState: MockViewer["authState"]; readonly onOpen: () => void }) {
  const signedIn = authState === "signed-in";
  return (
    <button className={`${styles.modeCard} ${styles.reveal}`} type="button" onClick={onOpen} aria-label={`Open ${signedIn ? "account session" : "guest mode"}`}>
      <span className={styles.modeIcon}><Icon name={signedIn ? "home" : "members"} /></span>
      <span className={styles.modeCopy}><small>Account</small><strong>{signedIn ? "EventSpace account" : "Guest mode"}</strong><em>{signedIn ? "Rooms and memories are private and connected across devices." : "Posting and archive access are limited."}</em></span>
      <Icon name="chevron" size={17} />
    </button>
  );
}
