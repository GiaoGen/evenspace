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
          <h2 id="account-sheet-title">{signedIn ? "Sign out of this device?" : "Sign in to EventSpace?"}</h2>
          <p>{signedIn ? "Your private rooms and memories stay in EventSpace. You can sign back in whenever you need them." : "Sign in with your email to reconnect your EventSpace account."}</p>
          <button className={styles.sheetPrimary} type="button" onClick={switchMode}>{signedIn ? "Sign out" : "Go to sign in"}<Icon name="arrow" size={16} /></button>
        </> : <>
          <span className={`${styles.sheetMark} ${styles.sheetMarkDanger}`}><Icon name="trash" size={22} /></span>
          <small>Private cloud</small>
          <h2 id="account-sheet-title">Your room data is connected.</h2>
          <p>{roomCount} {roomCount === 1 ? "room is" : "rooms are"} available through your signed-in EventSpace account.</p>
          <button className={styles.sheetPrimary} type="button" onClick={reset}>Done<Icon name="check" size={16} /></button>
        </>}
        <button className={styles.sheetSecondary} type="button" onClick={dismiss}>Keep things as they are</button>
      </section>
    </div>,
    document.body,
  );
}
