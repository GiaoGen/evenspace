"use client";

import styles from "./route-states.module.css";

export default function RoomsError({ reset }: { readonly reset: () => void }) {
  return <main className={styles.state}><p>We couldn&apos;t open your rooms.</p><button onClick={reset}>Try again</button></main>;
}
