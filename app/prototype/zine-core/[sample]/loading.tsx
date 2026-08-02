import styles from "./route-state.module.css";

export default function ZineCoreLoading() {
  return (
    <main className={styles.state} aria-busy="true" aria-live="polite">
      <span>Preparing proof</span>
      <h1>The pages are being gathered.</h1>
    </main>
  );
}
