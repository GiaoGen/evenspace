"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import styles from "./join-by-code.module.css";

export function JoinByCode() {
  const { session } = useMockSession();
  const router = useRouter();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toLocaleUpperCase();
    const room = session.rooms.find((item) => item.lifecycle === "active" && item.inviteCode.toLocaleUpperCase() === normalized);
    if (!room) { setError("That invite code is not active in this browser's local data."); return; }
    router.push(`/join/${room.publicId}?revision=${room.inviteRevision}`);
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
          <input id="invite-code" autoFocus autoCapitalize="characters" autoComplete="off" value={code} onChange={(event) => { setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0,40).toLocaleUpperCase()); setError(""); }} placeholder="RAIN7" />
          {error ? <small role="alert">{error}</small> : <small>For the seeded demo, try RAIN7.</small>}
          <button type="submit" disabled={!code.trim()}>Open invitation <Icon name="arrow" /></button>
        </form>
      </main>
    </div>
  );
}
