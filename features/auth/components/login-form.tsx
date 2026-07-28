"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";

import { requestEmailSignIn, type EmailSignInState } from "@/app/auth/actions";
import { Icon } from "@/components/ui/icon";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import styles from "./login-page.module.css";

const initialState: EmailSignInState = { status: "idle", message: "" };

export function LoginForm({ next }: { readonly next: string }) {
  const [state, action, pending] = useActionState(requestEmailSignIn, initialState);
  const [checking, setChecking] = useState(false);
  const router = useRouter();

  async function continueToRooms() {
    setChecking(true);
    const supabase = createSupabaseBrowserClient();
    const { data } = await supabase.auth.getClaims();
    if (data?.claims?.sub) router.replace(next);
    setChecking(false);
  }

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header>
        <Link href="/" className={styles.back} aria-label="Return home"><Icon name="arrow" size={16} /></Link>
        <span>EventSpace</span>
      </header>

      {state.status === "sent" ? <div className={styles.confirmation}>
        <span className={styles.confirmMark}><Icon name="check" size={18} /></span>
        <div className={styles.cardCopy}>
          <small>Check your email</small>
          <h2 id="login-title">Confirm your sign-in.</h2>
          <p>Open the secure EventSpace link in your email, then return here to continue.</p>
        </div>
        <button type="button" className={styles.primaryButton} onClick={() => void continueToRooms()} disabled={checking}>
          {checking ? "Checking…" : "I’ve confirmed — continue"}<Icon name="arrow" size={16} />
        </button>
        <form action={action}><input type="hidden" name="next" value={next} /><button type="submit" className={styles.textButton} disabled={pending}>Send another email</button></form>
      </div> : <>
        <div className={styles.cardCopy}>
          <small>Passwordless access</small>
          <h2 id="login-title">Log in to EventSpace</h2>
          <p>Enter your email and we’ll send a secure sign-in link.</p>
        </div>
        <form action={action}>
          <input type="hidden" name="next" value={next} />
          <label htmlFor="login-email">Email address</label>
          <input id="login-email" name="email" type="email" inputMode="email" autoComplete="email" spellCheck={false} placeholder="you@example.com" maxLength={254} required disabled={pending} />
          <button type="submit" disabled={pending}>{pending ? "Sending…" : "Send sign-in email"}<Icon name="arrow" size={16} /></button>
        </form>
      </>}

      {state.message ? <p className={`${styles.notice} ${state.status === "error" ? styles.noticeError : ""}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p> : null}
      <footer>By continuing, you confirm you are at least 16 and agree to the <Link href="/legal/terms">Terms</Link> and <Link href="/legal/privacy">Privacy Policy</Link>.</footer>
    </section>
  );
}
