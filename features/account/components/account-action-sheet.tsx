import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "@/components/ui/icon";
import type { MockViewer } from "@/features/mock-session/model/mock-session";
import styles from "./account-page.module.css";

export type AccountSheet = "mode" | "data";

export function AccountActionSheet({ sheet, authState, roomCount, close, switchMode, reset }: { readonly sheet: AccountSheet; readonly authState: MockViewer["authState"]; readonly roomCount: number; readonly close: () => void; readonly switchMode: () => void; readonly reset: () => void }) {
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const dismiss = useCallback(() => {
    if (closeTimer.current !== null) return;
    setClosing(true);
    closeTimer.current = window.setTimeout(close, 180);
  }, [close]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) { if (event.key === "Escape") dismiss(); }
    document.addEventListener("keydown", onKeyDown);
    document.body.classList.add(styles.sheetOpen);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.classList.remove(styles.sheetOpen);
      if (closeTimer.current !== null) window.clearTimeout(closeTimer.current);
    };
  }, [dismiss]);

  const signedIn = authState === "signed-in";
  return createPortal(
    <div className={`${styles.sheetBackdrop} ${closing ? styles.sheetBackdropClosing : ""}`} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) dismiss(); }}>
      <section className={`${styles.sheet} ${closing ? styles.sheetClosing : ""}`} role="dialog" aria-modal="true" aria-labelledby="account-sheet-title">
        <button className={styles.sheetClose} type="button" onClick={dismiss} aria-label="Close"><Icon name="close" /></button>
        {sheet === "mode" ? <>
          <span className={styles.sheetMark}><Icon name={signedIn ? "home" : "members"} size={22} /></span>
          <small>Account mode</small>
          <h2 id="account-sheet-title">{signedIn ? "Continue as a guest?" : "Use your local account?"}</h2>
          <p>{signedIn ? "You can still enter rooms, but voting, Board posting and archive access become limited on this device." : "Your rooms, votes and memories will be connected to this local identity again."}</p>
          <button className={styles.sheetPrimary} type="button" onClick={switchMode}>{signedIn ? "Use guest mode" : "Use local account"}<Icon name="arrow" size={16} /></button>
        </> : <>
          <span className={`${styles.sheetMark} ${styles.sheetMarkDanger}`}><Icon name="trash" size={22} /></span>
          <small>Local data</small>
          <h2 id="account-sheet-title">Clear this browser?</h2>
          <p>{roomCount} {roomCount === 1 ? "room" : "rooms"}, their messages and local media will be removed. This cannot be undone.</p>
          <button className={`${styles.sheetPrimary} ${styles.sheetDanger}`} type="button" onClick={reset}>Reset local data<Icon name="trash" size={16} /></button>
        </>}
        <button className={styles.sheetSecondary} type="button" onClick={dismiss}>Keep things as they are</button>
      </section>
    </div>,
    document.body,
  );
}
