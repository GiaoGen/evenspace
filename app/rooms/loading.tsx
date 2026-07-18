import styles from "./route-states.module.css";

export default function RoomsLoading() {
  return <main className={styles.state}><span className={styles.pulse} /><p>Opening your rooms…</p></main>;
}
