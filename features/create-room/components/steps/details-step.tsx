import type { CreateRoomDraft } from "../../model/create-room-machine";
import styles from "../create-room-wizard.module.css";

export function DetailsStep({ draft, nameError, descriptionError, setName, setDescription }: { readonly draft: CreateRoomDraft; readonly nameError?: string; readonly descriptionError?: string; readonly setName: (value: string) => void; readonly setDescription: (value: string) => void }) {
  return <section className={styles.stepContent} aria-labelledby="details-title">
    <header className={styles.stepIntro}><span>Room identity</span><h1 id="details-title">Name this room</h1><p>Give people a clear sense of the moment before they enter.</p></header>
    <div className={`${styles.identityCard} ${nameError || descriptionError ? styles.cardInvalid : ""}`}>
      <label htmlFor="room-name">Room name</label>
      <input id="room-name" value={draft.name} onChange={(event) => setName(event.target.value)} placeholder="After the rain" maxLength={80} aria-invalid={Boolean(nameError)} />
      <label htmlFor="room-description">A short note <span>Optional</span></label>
      <textarea id="room-description" value={draft.description} onChange={(event) => setDescription(event.target.value)} placeholder="Rain stopped. Nobody wanted to go home yet." maxLength={500} rows={3} aria-invalid={Boolean(descriptionError)} />
      <small className={styles.characterCount}>{draft.name.length > 64 ? `${draft.name.length}/80` : ""}</small>
    </div>
    {nameError ? <p className={styles.error}>{nameError}</p> : null}
    {descriptionError ? <p className={styles.error}>{descriptionError}</p> : null}
  </section>;
}
