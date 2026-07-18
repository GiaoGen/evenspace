import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui/wordmark";
import styles from "./app-header.module.css";

export function AppHeader({ actions, wordmarkHref = "/rooms" }: { readonly actions?: ReactNode; readonly wordmarkHref?: string }) {
  return <header className={styles.header}><Wordmark href={wordmarkHref} /><div>{actions}</div></header>;
}
