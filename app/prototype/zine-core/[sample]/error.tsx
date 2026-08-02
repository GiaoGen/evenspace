"use client";

import styles from "./route-state.module.css";

export default function ZineCoreError({ reset }: { readonly reset: () => void }) {
  return (
    <main className={styles.state}>
      <span>Proof unavailable</span>
      <h1>This zine could not be composed.</h1>
      <p>The layout source was not changed. Try loading the proof again.</p>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}
