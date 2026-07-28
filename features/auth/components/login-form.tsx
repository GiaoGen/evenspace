"use client";

import Link from "next/link";
import { useActionState, useState } from "react";

import {
  signInWithEmailPassword,
  signUpWithEmailPassword,
  type AuthActionState,
} from "@/app/auth/actions";
import { Icon } from "@/components/ui/icon";
import styles from "./login-page.module.css";

const initialState: AuthActionState = { status: "idle", message: "" };
export type AuthMode = "signin" | "signup";

export function LoginForm({
  mode,
  next,
}: {
  readonly mode: AuthMode;
  readonly next: string;
}) {
  const [activeMode, setActiveMode] = useState<AuthMode>(mode);
  const [signInState, signInAction, signInPending] = useActionState(
    signInWithEmailPassword,
    initialState,
  );
  const [signUpState, signUpAction, signUpPending] = useActionState(
    signUpWithEmailPassword,
    initialState,
  );
  const isSignUp = activeMode === "signup";
  const state = isSignUp ? signUpState : signInState;
  const pending = isSignUp ? signUpPending : signInPending;

  return (
    <section className={styles.card} aria-labelledby="login-title">
      <header>
        <Link href="/" className={styles.back} aria-label="Return home">
          <Icon name="arrow" size={16} />
        </Link>
        <span>EventSpace</span>
      </header>

      {state.status === "sent" ? (
        <div className={styles.confirmation}>
          <span className={styles.confirmMark}>
            <Icon name="check" size={18} />
          </span>
          <div className={styles.cardCopy}>
            <small>Verify your email</small>
            <h2 id="login-title">Finish creating your account.</h2>
            <p>
              Open the EventSpace verification link in your email, then sign in
              with your password.
            </p>
          </div>
          <button
            type="button"
            className={styles.primaryButton}
            onClick={() => setActiveMode("signin")}
          >
            Back to login
            <Icon name="arrow" size={16} />
          </button>
        </div>
      ) : (
        <>
          <div className={styles.modeSwitch} role="tablist" aria-label="Authentication mode">
            <button
              type="button"
              role="tab"
              aria-selected={!isSignUp}
              data-active={!isSignUp}
              onClick={() => setActiveMode("signin")}
            >
              Log in
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={isSignUp}
              data-active={isSignUp}
              onClick={() => setActiveMode("signup")}
            >
              Register
            </button>
          </div>
          <div className={styles.cardCopy}>
            <small>{isSignUp ? "Create account" : "Password access"}</small>
            <h2 id="login-title">
              {isSignUp ? "Register for EventSpace" : "Log in to EventSpace"}
            </h2>
            <p>
              {isSignUp
                ? "Create a password, then verify your email before using your account."
                : "Enter your email and password to continue."}
            </p>
          </div>
          <form action={isSignUp ? signUpAction : signInAction}>
            <input type="hidden" name="next" value={next} />
            <label htmlFor="login-email">Email address</label>
            <input
              id="login-email"
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              spellCheck={false}
              placeholder="you@example.com"
              maxLength={254}
              required
              disabled={pending}
            />
            <label htmlFor="login-password">Password</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={isSignUp ? 8 : undefined}
              maxLength={72}
              required
              disabled={pending}
            />
            {isSignUp ? (
              <>
                <label htmlFor="login-confirm-password">Confirm password</label>
                <input
                  id="login-confirm-password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                  disabled={pending}
                />
              </>
            ) : null}
            <button type="submit" disabled={pending}>
              {pending
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                  ? "Create account"
                  : "Log in"}
              <Icon name="arrow" size={16} />
            </button>
          </form>
        </>
      )}

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
