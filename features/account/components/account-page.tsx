"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import styles from "./account-page.module.css";

export function AccountPage() {
  const { session, dispatch, reset } = useMockSession();
  const [name, setName] = useState(session.viewer.displayName);
  const [saved, setSaved] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const clean = name.trim(); if (!clean) return;
    const initials = clean.split(/\s+/).slice(0,2).map((part) => part[0]?.toLocaleUpperCase() ?? "").join("");
    dispatch({ type: "COMMAND", command: { type: "UPDATE_PROFILE", actorId: session.viewer.actorId, displayName: clean, initials, nowIso: new Date().toISOString() } }); setSaved(true);
  }
  return <div className={styles.page}><header><Link href="/rooms" aria-label="Return to rooms"><Icon name="arrow" /></Link><Wordmark /><span>Local account</span></header><main><section className={styles.intro}><p>Your place in EventSpace</p><h1>One identity,<br /><em>kept lightly.</em></h1><span>This local-first account is stored in this browser. It contains no real OAuth token, email delivery, payment or private cloud upload.</span></section><section className={styles.card}><div className={styles.profile}><b>{session.viewer.initials}</b><div><strong>{session.viewer.displayName}</strong><span>{session.viewer.authState === "signed-in" ? session.viewer.email : "Guest identity"}</span></div></div><form onSubmit={submit}><label>Display name <span>{name.length} / 60</span></label><input value={name} onChange={(event) => { setName(event.target.value.slice(0,60)); setSaved(false); }} /><button type="submit" disabled={!name.trim()}>Save profile</button>{saved ? <small>Saved to this browser. Rooms received a system message.</small> : null}</form><div className={styles.settings}><div><span><strong>Local account mode</strong><small>{session.viewer.authState === "signed-in" ? "Signed in on this device for local-first room actions" : "Guest: voting, Board posting and archives are restricted"}</small></span><button type="button" onClick={() => dispatch({ type: "COMMAND", command: { type: "SET_AUTH_STATE", actorId: session.viewer.actorId, authState: session.viewer.authState === "signed-in" ? "guest" : "signed-in", email: session.viewer.authState === "signed-in" ? null : "local@eventspace.invalid" } })}>{session.viewer.authState === "signed-in" ? "Use guest mode" : "Use local account"}</button></div><div><span><strong>Appearance</strong><small>System, light or dark. No event themes.</small></span><div className={styles.theme}>{(["system","light","dark"] as const).map((theme) => <button type="button" key={theme} className={session.viewer.theme === theme ? styles.selected : ""} onClick={() => dispatch({ type: "COMMAND", command: { type: "SET_THEME", theme } })}>{theme}</button>)}</div></div></div><nav><Link href="/legal/terms">Terms draft <Icon name="chevron" /></Link><Link href="/legal/privacy">Privacy draft <Icon name="chevron" /></Link><Link href="/legal/guidelines">Community rules <Icon name="chevron" /></Link><Link href="/legal/cookies">Cookie notice <Icon name="chevron" /></Link></nav><div className={styles.reset}><button type="button" onClick={() => setConfirmReset(true)}>Reset local data</button>{confirmReset ? <div><strong>Clear local rooms?</strong><p>Created rooms and interactions stored in this browser will be removed.</p><span><button type="button" onClick={() => setConfirmReset(false)}>Cancel</button><button type="button" onClick={() => { reset(); setName("You"); setConfirmReset(false); }}>Reset</button></span></div> : null}</div></section></main></div>;
}
