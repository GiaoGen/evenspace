import type { ReactNode } from "react";
import styles from "./create-room-wizard.module.css";

export function ChoiceCard({ active, icon, title, copy, onClick }: { readonly active: boolean; readonly icon: ReactNode; readonly title: string; readonly copy: string; readonly onClick: () => void }) {
  return <button type="button" className={`${styles.choiceCard} ${active ? styles.choiceCardActive : ""}`} onClick={onClick} aria-pressed={active}>
    <span className={styles.choiceIcon}>{icon}</span>
    <span><strong>{title}</strong><small>{copy}</small></span>
    <i aria-hidden="true">{active ? "✓" : ""}</i>
  </button>;
}

export function Toggle({ active, label, onClick }: { readonly active: boolean; readonly label: string; readonly onClick: () => void }) {
  return <button type="button" className={`${styles.toggle} ${active ? styles.toggleOn : ""}`} onClick={onClick} role="switch" aria-checked={active} aria-label={label}><i /></button>;
}
