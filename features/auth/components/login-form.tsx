"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  requestEmailSignIn,
  type EmailSignInState,
} from "@/app/auth/actions";
import { Icon } from "@/components/ui/icon";
import styles from "./login-page.module.css";

const initialState: EmailSignInState = {
  status: "idle",
  message: "",
};

export function LoginForm({ next }: { readonly next: string }) {
  const [state, action, pending] = useActionState(
    requestEmailSignIn,
    initialState,
  );

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header>
        <Link href="/" className={styles.back} aria-label="Return home">
          <Icon name="arrow" size={16} />
        </Link>
        <span>EventSpace</span>
      </header>
      <div className={styles.cardCopy}>
        <small>Passwordless access</small>
        <h2 id="login-title">Log in with email</h2>
        <p>We&apos;ll send a one-time secure link. No password to remember.</p>
      </div>
      <form action={action}>
        <input type="hidden" name="next" value={next} />
        <label htmlFor="login-email">Email address</label>
        <input
          id="login-email"
          name="email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="you@example.com"
          maxLength={254}
          required
          disabled={pending || state.status === "sent"}
        />
        <button type="submit" disabled={pending || state.status === "sent"}>
          {pending ? "Sending…" : state.status === "sent" ? "Link sent" : "Email me a login link"}
          <Icon name={state.status === "sent" ? "check" : "arrow"} size={16} />
        </button>
      </form>
      {state.message ? (
        <p
          className={`${styles.notice} ${
            state.status === "error" ? styles.noticeError : ""
          }`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
      <footer>
        By continuing, you confirm you are at least 16 and agree to the{" "}
        <Link href="/legal/terms">Terms</Link> and{" "}
        <Link href="/legal/privacy">Privacy Policy</Link>.
      </footer>
    </section>
  );
}
