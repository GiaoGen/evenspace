import Link from "next/link";
import styles from "./route-state.module.css";

export default function ZineCoreNotFound() {
  return (
    <main className={styles.state}>
      <span>Empty proof</span>
      <h1>No zine pages were found.</h1>
      <p>Choose a valid, contract-checked proof before opening the reader.</p>
      <Link href="/prototype/zine-core/quiet-10">Open the ten-photo proof</Link>
    </main>
  );
}
