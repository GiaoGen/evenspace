"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { resolveInviteCodeAction } from "@/app/join/actions";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import styles from "./join-by-code.module.css";

export function JoinByCode() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const [pending, setPending] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toLocaleUpperCase();
    setPending(true);
    const result = await resolveInviteCodeAction(normalized);
    if (result.status === "error") {
      setError(result.message);
      setPending(false);
      return;
    }
    router.push(`/join/${result.publicId}?code=${encodeURIComponent(result.code)}`);
  }

  return (
    <div className={styles.page}>
      <header><Wordmark /><Link href="/">Close</Link></header>
      <main>
        <p>Private entry</p>
        <h1>A small code,<br /><em>one shared room.</em></h1>
        <span>Codes do not expire on their own. Replacing a room invitation invalidates the previous code and link together.</span>
        <form onSubmit={submit} noValidate>
          <label htmlFor="invite-code">Invite code</label>
          <input id="invite-code" autoFocus autoCapitalize="characters" autoComplete="off" value={code} onChange={(event) => { setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0,8).toLocaleUpperCase()); setError(""); }} placeholder="8 characters" />
          {error ? <small role="alert">{error}</small> : <small>Use the code shared by the room Host.</small>}
          <button type="submit" disabled={code.length !== 8 || pending}>{pending ? "Opening…" : "Open invitation"} <Icon name="arrow" /></button>
        </form>
      </main>
    </div>
  );
}
