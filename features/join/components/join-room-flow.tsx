"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";

import { joinRoomAction } from "@/app/join/actions";
import { Avatar } from "@/components/ui/avatar";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import { avatarTextFor } from "@/core/domain/avatar";
import type { RoomPublicId } from "@/core/domain/ids";
import type { RoomInvitePreview } from "@/data/supabase/room-invites";
import styles from "./join-room-flow.module.css";

export function JoinRoomFlow({
  publicId,
  token,
  code,
  invite,
  authenticated,
  initialName,
  initialAvatarAssetId,
  initialAvatarUrl,
}: {
  readonly publicId: RoomPublicId;
  readonly token?: string;
  readonly code?: string;
  readonly invite: RoomInvitePreview | null;
  readonly authenticated: boolean;
  readonly initialName: string;
  readonly initialAvatarAssetId?: string;
  readonly initialAvatarUrl?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [requestId, setRequestId] = useState<string | null>(null);
  const [requestRejected, setRequestRejected] = useState(false);
  const avatarText = avatarTextFor(name);

  useEffect(() => {
    if (!requestId) return;
    let cancelled = false;

    async function checkStatus() {
      const response = await fetch(
        `/join/status?publicId=${encodeURIComponent(publicId)}&requestId=${encodeURIComponent(requestId ?? "")}`,
        { cache: "no-store" },
      );
      if (!response.ok || cancelled) return;
      const result = await response.json() as { status?: string };
      if (result.status === "approved") router.push(`/rooms/${publicId}`);
      if (result.status === "rejected") {
        setRequestRejected(true);
        setRequestId(null);
      }
    }

    void checkStatus();
    const timer = window.setInterval(() => { void checkStatus(); }, 3000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [publicId, requestId, router]);

  if (!invite) {
    return (
      <main className={styles.unavailable}>
        <Wordmark />
        <p>Invitation unavailable</p>
        <h1>This private link is no longer active.</h1>
        <span>The Host may have replaced it, or the room may have ended.</span>
        <Link href="/">Return home</Link>
      </main>
    );
  }

  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: invite.time_zone,
  }).format(new Date(invite.ends_at));
  const invitePath = `/join/${publicId}?${token ? `token=${encodeURIComponent(token)}` : `code=${encodeURIComponent(code ?? "")}`}`;
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}`;
  const avatarUrl = initialAvatarAssetId ? initialAvatarUrl : undefined;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await joinRoomAction({
      publicId,
      nickname: name,
      note: "",
      token,
      code,
      avatarVariant: "initials",
      avatarAssetId: initialAvatarAssetId,
    });
    if (result.status === "error") {
      setError(result.message);
      setPending(false);
      return;
    }
    if (result.status === "pending") {
      setRequestId(result.requestId);
      setPending(false);
      return;
    }
    router.push(`/rooms/${result.publicId}`);
  }

  if (requestId || requestRejected) {
    const waitingAvatar = (
      <Avatar
        src={avatarUrl}
        text={avatarText}
        displayName={name}
        decorative
      />
    );
    return (
      <div className={styles.page}>
        <header>
          <Wordmark />
          <span>{requestRejected ? "Request declined" : "Request recorded"}</span>
        </header>
        <main className={styles.waiting}>
          <div className={requestRejected ? styles.rejectedAvatar : styles.pulse}>
            {waitingAvatar}
            {requestRejected ? null : <><i /><i /></>}
          </div>
          <p>{requestRejected ? "Not admitted" : "Request sent"}</p>
          <h1>
            {requestRejected
              ? <>The Host declined<br /><em>this request.</em></>
              : <>The Host will<br /><em>let you in.</em></>}
          </h1>
          <span>
            {requestRejected
              ? "You can return to the invitation and try again if the Host asks you to."
              : "This page checks the decision automatically. You will enter the room as soon as the Host approves."}
          </span>
          <div>
            <strong>{invite.name}</strong>
            <small>Private room &middot; Ends {end}</small>
          </div>
          {requestRejected
            ? <button type="button" onClick={() => setRequestRejected(false)}>Return to invitation</button>
            : <Link href="/rooms">View your rooms</Link>}
        </main>
      </div>
    );
  }

  return (
    <div className={styles.page}>
      <header>
        <Wordmark />
        <Link href={authenticated ? "/rooms" : loginHref}>
          {authenticated ? "Your rooms" : "Log in"}
        </Link>
      </header>
      <main className={styles.setup}>
        <form className={styles.form} onSubmit={submit} noValidate>
          <div className={styles.roomContext}>
            <span>Private invitation</span>
            <strong>{invite.name}</strong>
            <small>
              Ends {end} &middot; {invite.member_count} of {invite.member_limit} people
            </small>
          </div>
          <Avatar
            className={styles.identityAvatar}
            src={avatarUrl}
            text={avatarText}
            displayName={name || "Room member"}
          />
          <label className={styles.nameField}>
            <span>Nickname <small>{name.length} / 60</small></span>
            <input
              autoFocus
              value={name}
              onChange={(event) => setName(event.target.value.slice(0, 60))}
              placeholder="Your name"
              disabled={pending}
            />
          </label>
          {error ? <span className={styles.error} role="alert">{error}</span> : null}
          <button
            type="submit"
            className={styles.join}
            disabled={pending || !name.trim()}
          >
            {pending
              ? "Sending..."
              : invite.requires_approval
                ? "Request to join"
                : "Enter room"}
            <Icon name="arrow" />
          </button>
          <small>
            {authenticated
              ? "Your account identity is used for this room."
              : "No profile photo yet. Your initials will be used."}
          </small>
        </form>
      </main>
    </div>
  );
}
