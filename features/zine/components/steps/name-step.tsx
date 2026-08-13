import { ZINE_LOCALES, ZINE_NAME_LIMIT, type ZineLocale } from "../../model/zine-draft";
import styles from "../zine-creator.module.css";

export function NameStep({
  name,
  locale,
  showError,
  onChange,
  onLocaleChange,
}: {
  readonly name: string;
  readonly locale: ZineLocale;
  readonly showError: boolean;
  readonly onChange: (value: string) => void;
  readonly onLocaleChange: (locale: ZineLocale) => void;
}) {
  const trimmedName = name.trim();

  return (
    <section className={styles.nameStep} data-zine-locale={locale} lang={locale} aria-labelledby="zine-name-heading">
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
          <fieldset className={styles.localePicker}>
            <legend>Document language and glyph region</legend>
            {ZINE_LOCALES.map((value) => (
              <button
                type="button"
                aria-pressed={locale === value}
                data-selected={locale === value}
                key={value}
                onClick={() => onLocaleChange(value)}
              >
                {value === "en" ? "English" : value === "zh-Hans" ? "简体中文" : "繁體中文"}
              </button>
            ))}
          </fieldset>
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
