import { useEffect, useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import type { MockViewer } from "@/features/mock-session/model/mock-session";
import type { AccountSummary } from "../model/account-summary";
import styles from "./account-page.module.css";

export function IdentityCard({ viewer, summary, nameAvailable, saveName }: { readonly viewer: MockViewer; readonly summary: AccountSummary; readonly nameAvailable: (name: string) => boolean; readonly saveName: (name: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(viewer.displayName);
  const [feedback, setFeedback] = useState<"saved" | "unavailable" | null>(null);

  useEffect(() => {
    if (feedback !== "saved") return;
    const timer = window.setTimeout(() => setFeedback(null), 1800);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clean = draft.trim();
    if (!nameAvailable(clean)) {
      setFeedback("unavailable");
      return;
    }
    saveName(clean);
    setEditing(false);
    setFeedback("saved");
  }

  function toggleEditing() {
    if (!editing) setDraft(viewer.displayName);
    setEditing(!editing);
    setFeedback(null);
  }

  return (
    <section className={`${styles.identityCard} ${styles.reveal}`} aria-labelledby="account-name">
      <div className={styles.identityTop}>
        <div className={styles.avatar}>{viewer.initials}</div>
        <div className={styles.identityCopy}>
          <span>{viewer.authState === "signed-in" ? "Local account" : "Guest identity"}</span>
          <h1 id="account-name">{viewer.displayName}</h1>
          <p>{viewer.authState === "signed-in" ? viewer.email : "Kept on this device"}</p>
        </div>
        <button className={styles.editButton} type="button" onClick={toggleEditing} aria-label={editing ? "Close name editor" : "Edit display name"}><Icon name={editing ? "close" : "edit"} size={17} /></button>
      </div>
      <div className={`${styles.inlineEditor} ${editing ? styles.inlineEditorOpen : ""}`} aria-hidden={!editing}>
        <form onSubmit={submit}>
          <label htmlFor="account-display-name">Display name <span>{draft.length}/60</span></label>
          <div><input id="account-display-name" value={draft} maxLength={60} onChange={(event) => { setDraft(event.target.value); setFeedback(null); }} tabIndex={editing ? 0 : -1} /><button type="submit" disabled={!draft.trim()} aria-label="Save display name"><Icon name="check" /></button></div>
          {feedback === "unavailable" ? <p role="alert">That name is already used in one of your active rooms.</p> : null}
        </form>
      </div>
      <div className={styles.identityStats}>
        <span><strong>{summary.activeRooms}</strong>Active</span>
        <span><strong>{summary.memories}</strong>Memories</span>
        <span><strong>{summary.boardItems}</strong>Board items</span>
      </div>
      <div className={`${styles.savedNotice} ${feedback === "saved" ? styles.savedNoticeVisible : ""}`} aria-live="polite"><Icon name="check" size={14} />Saved on this device</div>
    </section>
  );
}
