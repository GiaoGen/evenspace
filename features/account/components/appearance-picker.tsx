import { Icon } from "@/components/ui/icon";
import type { MockViewer } from "@/features/mock-session/model/mock-session";
import styles from "./account-page.module.css";

const themes = ["system", "light", "dark"] as const;

export function AppearancePicker({ value, onChange }: { readonly value: MockViewer["theme"]; readonly onChange: (theme: MockViewer["theme"]) => void }) {
  return (
    <section className={`${styles.appearance} ${styles.reveal}`} aria-labelledby="appearance-title">
      <div className={styles.sectionHeading}><div><span>Appearance</span><h2 id="appearance-title">Choose your light.</h2></div><small>Follows this device</small></div>
      <div className={styles.themeGrid}>
        {themes.map((theme) => <button type="button" key={theme} className={value === theme ? styles.themeSelected : ""} onClick={() => onChange(theme)} aria-pressed={value === theme}>
          <span className={`${styles.themePreview} ${styles[`themePreview${theme[0].toUpperCase()}${theme.slice(1)}`]}`}><i /><i /><i /></span>
          <span>{theme}</span>
          <b><Icon name="check" size={12} /></b>
        </button>)}
      </div>
    </section>
  );
}
