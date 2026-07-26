import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import styles from "./app-header.module.css";

export function AppHeader({ actions, leading, wordmarkHref = "/rooms" }: { readonly actions?: ReactNode; readonly leading?: ReactNode; readonly wordmarkHref?: string }) {
  return <header className={`${styles.header} ${leading ? styles.headerCentered : ""}`}>{leading ? <div className={styles.leading}>{leading}</div> : null}<Wordmark href={wordmarkHref} /><div className={styles.actions}>{actions}</div></header>;
}
