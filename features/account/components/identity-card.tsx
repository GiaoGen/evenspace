import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import type { MockViewer } from "@/features/mock-session/model/mock-session";
import type { AccountSummary } from "../model/account-summary";
import styles from "./account-page.module.css";

export function IdentityCard({ viewer, summary, cacheScope, nameAvailable, saveName, uploadAvatar }: { readonly viewer: MockViewer; readonly summary: AccountSummary; readonly cacheScope: string; readonly nameAvailable: (name: string) => boolean; readonly saveName: (name: string) => void; readonly uploadAvatar: (file: File) => Promise<{ readonly ok: boolean; readonly message?: string }> }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(viewer.displayName);
  const [feedback, setFeedback] = useState<"saved" | "unavailable" | null>(null);
  const [avatarFeedback, setAvatarFeedback] = useState("");
  const [avatarPending, setAvatarPending] = useState(false);
  const avatarInput = useRef<HTMLInputElement>(null);

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

  async function selectAvatar(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setAvatarPending(true);
    setAvatarFeedback("");
    const result = await uploadAvatar(file);
    setAvatarPending(false);
    setAvatarFeedback(result.ok ? "Avatar saved" : result.message ?? "Avatar upload failed");
  }

  return (
    <section className={`${styles.identityCard} ${styles.reveal}`} aria-labelledby="account-name">
      <div className={styles.identityTop}>
        <div className={styles.avatarShell}>
          <Avatar
            className={styles.avatar}
            src={viewer.avatarUrl}
            asset={viewer.avatarAsset}
            cacheScope={cacheScope}
            text={viewer.initials}
            displayName={viewer.displayName}
          />
          {editing && viewer.authState === "signed-in" ? (
            <>
              <input
                ref={avatarInput}
                className={styles.avatarInput}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(event) => { void selectAvatar(event); }}
                tabIndex={-1}
              />
              <button
                className={styles.avatarEdit}
                type="button"
                aria-label="Upload profile avatar"
                title="Upload profile avatar"
                disabled={avatarPending}
                onClick={() => avatarInput.current?.click()}
              >
                <Icon name="edit" size={13} />
              </button>
            </>
          ) : null}
        </div>
        <div className={styles.identityCopy}>
          <span>{viewer.authState === "signed-in" ? "EventSpace account" : "Guest identity"}</span>
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
      {avatarFeedback ? <p className={styles.avatarFeedback} role="status">{avatarFeedback}</p> : null}
      <div className={styles.identityStats}>
        <span><strong>{summary.activeRooms}</strong>Active</span>
        <span><strong>{summary.memories}</strong>Memories</span>
        <span><strong>{summary.boardItems}</strong>Board items</span>
      </div>
      <div className={`${styles.savedNotice} ${feedback === "saved" ? styles.savedNoticeVisible : ""}`} aria-live="polite"><Icon name="check" size={14} />Saved to your EventSpace account</div>
    </section>
  );
}
