import styles from "../route-states.module.css";

export default function NewRoomLoading() {
  return <main className={styles.state} aria-busy="true"><span className={styles.pulse} /><p>Preparing your room editor…</p></main>;
}
