import { ZINE_NAME_LIMIT } from "../../model/zine-draft";
import styles from "../zine-creator.module.css";

export function NameStep({
  name,
  showError,
  onChange,
}: {
  readonly name: string;
  readonly showError: boolean;
  readonly onChange: (value: string) => void;
}) {
  const trimmedName = name.trim();

  return (
    <section className={styles.nameStep} aria-labelledby="zine-name-heading">
      <header className={styles.stepIntro}>
        <span>01 / Name your zine</span>
        <h1 id="zine-name-heading">Give this moment a name.</h1>
        <p>Something you will recognize years from now.</p>
      </header>

      <div className={styles.nameCardStack}>
        <i className={styles.backPageOne} aria-hidden="true" />
        <i className={styles.backPageTwo} aria-hidden="true" />
        <article className={`${styles.nameCard} ${showError ? styles.nameCardInvalid : ""}`}>
          <div className={styles.nameCardMeta}>
            <span>Zine title</span>
            <b>{name.length} / {ZINE_NAME_LIMIT}</b>
          </div>
          <textarea
            autoFocus
            rows={3}
            maxLength={ZINE_NAME_LIMIT}
            value={name}
            aria-describedby={showError ? "zine-name-error" : "zine-name-help"}
            aria-invalid={showError}
            placeholder="Untitled moment"
            onChange={(event) => onChange(event.target.value)}
          />
          <p id="zine-name-help">The title can change later.</p>
          {showError ? <p id="zine-name-error" className={styles.fieldError}>Add a name before continuing.</p> : null}

          <div className={styles.spinePreview} aria-label="Live zine spine preview">
            <span>EventSpace Zine</span>
            <strong>{trimmedName || "Untitled moment"}</strong>
            <small>01</small>
          </div>
        </article>
      </div>
    </section>
  );
}
