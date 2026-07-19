import Link from "next/link";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import styles from "./account-page.module.css";

export function AccountHeader() {
  return (
    <header className={styles.header}>
      <Link className={styles.back} href="/rooms" aria-label="Return to rooms"><Icon name="arrow" /></Link>
      <div className={styles.brand}><Wordmark /></div>
      <span aria-hidden="true" />
    </header>
  );
}
