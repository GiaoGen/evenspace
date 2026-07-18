import Link from "next/link";
import styles from "./wordmark.module.css";

export function Wordmark({ href = "/rooms" }: { readonly href?: string }) {
  return <Link className={styles.wordmark} href={href}>EventSpace</Link>;
}
