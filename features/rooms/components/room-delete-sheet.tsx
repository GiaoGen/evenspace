import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import styles from "./rooms-page.module.css";

export function RoomDeleteSheet({ roomName, close, confirm }: { readonly roomName: string; readonly close: () => void; readonly confirm: () => void }) {
  const [closing, setClosing] = useState(false);
  const timerRef = useRef<number | null>(null);
  const dismiss = useCallback(() => {
    if (timerRef.current !== null) return;
    setClosing(true);
    timerRef.current = window.setTimeout(close, 180);
  }, [close]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") dismiss(); }
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add(styles.sheetOpen);
    return () => { document.removeEventListener("keydown", onKeyDown); document.body.classList.remove(styles.sheetOpen); if (timerRef.current !== null) window.clearTimeout(timerRef.current); };
  }, [dismiss]);

  return createPortal(<div className={`${styles.sheetBackdrop} ${closing ? styles.sheetBackdropClosing : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}><section className={`${styles.deleteSheet} ${closing ? styles.sheetClosing : ""}`} role="dialog" aria-modal="true" aria-labelledby="delete-room-title"><button type="button" className={styles.sheetClose} onClick={dismiss} aria-label="Close"><Icon name="close" /></button><span className={styles.deleteMark}><Icon name="trash" /></span><small>Remove from your rooms</small><h2 id="delete-room-title">Leave “{roomName}” behind?</h2><p>This only removes the room from your local list. Other members and shared room data are not changed.</p><button type="button" className={styles.deleteConfirm} onClick={confirm}>Remove room<Icon name="trash" size={16} /></button><button type="button" className={styles.deleteCancel} onClick={dismiss}>Keep this room</button></section></div>, document.body);
}
