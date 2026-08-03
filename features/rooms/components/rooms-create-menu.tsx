"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { resolveInviteCodeAction } from "@/app/join/actions";
import { Icon } from "@/components/ui/icon";
import styles from "./rooms-page.module.css";

export function RoomsCreateMenu() {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    if (!menuOpen && !inviteOpen) return;
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (inviteOpen && pending) return;
      setMenuOpen(false);
      setInviteOpen(false);
    }
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [inviteOpen, menuOpen, pending]);

  function openInvite() {
    setMenuOpen(false);
    setInviteOpen(true);
    setCode("");
    setError("");
  }

  function closeInvite() {
    if (pending) return;
    setInviteOpen(false);
    setCode("");
    setError("");
  }

  async function submitInvite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalized = code.trim().toUpperCase();
    setPending(true);
    try {
      const result = await resolveInviteCodeAction(normalized);
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      router.push(`/join/${result.publicId}?code=${encodeURIComponent(result.code)}`);
    } catch {
      setError("That invite code could not be opened.");
    } finally {
      setPending(false);
    }
  }

  const inviteDialog = inviteOpen ? (
    <div className={styles.inviteBackdrop} role="presentation" onPointerDown={(event) => { if (event.target === event.currentTarget) closeInvite(); }}>
      <section className={styles.inviteDialog} role="dialog" aria-modal="true" aria-labelledby="rooms-invite-title">
        <header>
          <div><small>Join a room</small><h2 id="rooms-invite-title">Invite code</h2></div>
          <button type="button" onClick={closeInvite} disabled={pending} aria-label="Close invite code"><Icon name="close" /></button>
        </header>
        <form onSubmit={submitInvite} noValidate>
          <label htmlFor="rooms-invite-code">Enter the 8-character code</label>
          <input
            id="rooms-invite-code"
            autoFocus
            autoCapitalize="characters"
            autoComplete="off"
            inputMode="text"
            value={code}
            onChange={(event) => {
              setCode(event.target.value.replace(/[^a-z0-9]/gi, "").slice(0, 8).toUpperCase());
              setError("");
            }}
            placeholder="XXXXXXXX"
          />
          <small className={error ? styles.inviteError : ""} role={error ? "alert" : undefined}>{error || "Use the code shared by the room host."}</small>
          <button type="submit" disabled={code.length !== 8 || pending}>{pending ? "Opening..." : "Continue"}<Icon name="arrow" /></button>
        </form>
      </section>
    </div>
  ) : null;

  return (
    <>
      <div className={styles.createMenuWrap}>
        <button type="button" className={styles.topCreateAction} aria-label="Open room actions" aria-haspopup="menu" aria-expanded={menuOpen} onClick={() => setMenuOpen((open) => !open)}><Icon name={menuOpen ? "close" : "plus"} size={17} /></button>
        {menuOpen ? (
          <>
            <div className={styles.createMenuDismiss} aria-hidden="true" onClick={() => setMenuOpen(false)} />
            <div className={styles.createMenu} role="menu" aria-label="Room actions">
              <Link href="/rooms/new" role="menuitem"><span><Icon name="plus" size={16} /></span><strong>Room</strong></Link>
              <button type="button" role="menuitem" onClick={openInvite}><span><Icon name="copy" size={16} /></span><strong>Invite code</strong></button>
              <Link href="/books/new" role="menuitem"><span><Icon name="board" size={16} /></span><strong>Book</strong></Link>
            </div>
          </>
        ) : null}
      </div>
      {inviteDialog && typeof document !== "undefined" ? createPortal(inviteDialog, document.body) : null}
    </>
  );
}
