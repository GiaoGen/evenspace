import type { CSSProperties } from "react";
import styles from "./rooms-page.module.css";

export function RoomProgress({ activeIndex, total, progress }: { readonly activeIndex: number; readonly total: number; readonly progress: number }) {
  const width = 100 / Math.max(1, total);
  const style = { "--thumb-width": `${width}%`, "--thumb-left": `${progress * (100 - width)}%` } as CSSProperties;
  return <div className={styles.progress} aria-label={`Room ${activeIndex + 1} of ${total}`}><span key={activeIndex}>{String(activeIndex + 1).padStart(2, "0")}</span><i style={style}><b /></i><span>{String(total).padStart(2, "0")}</span></div>;
}
