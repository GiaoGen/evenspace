"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, type FormEvent } from "react";

import { joinRoomAction } from "@/app/join/actions";
import { PinnedPhoto } from "@/components/pinboard/pinned-photo";
import { Icon } from "@/components/ui/icon";
import { Wordmark } from "@/components/ui/wordmark";
import type { RoomPublicId } from "@/core/domain/ids";
import type { RoomInvitePreview } from "@/data/supabase/room-invites";
import styles from "./join-room-flow.module.css";

const initialsFor = (name: string) =>
  name.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "").join("");

export function JoinRoomFlow({
  publicId,
  token,
  code,
  invite,
  authenticated,
}: {
  readonly publicId: RoomPublicId;
  readonly token?: string;
  readonly code?: string;
  readonly invite: RoomInvitePreview | null;
  readonly authenticated: boolean;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [note, setNote] = useState("");
  const [avatarStyle, setAvatarStyle] = useState<"initials" | "single" | "ring">("initials");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const initials = useMemo(() => initialsFor(name) || "?", [name]);
  const avatarInitials = avatarStyle === "single" ? initials.slice(0, 1) : avatarStyle === "ring" ? `○${initials.slice(0, 1)}` : initials;

  if (!invite) {
    return <main className={styles.unavailable}><Wordmark /><p>Invitation unavailable</p><h1>This private link is no longer active.</h1><span>The Host may have replaced it, or the room may have ended.</span><Link href="/">Return home</Link></main>;
  }

  const end = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: invite.time_zone,
  }).format(new Date(invite.ends_at));
  const invitePath = `/join/${publicId}?${token ? `token=${encodeURIComponent(token)}` : `code=${encodeURIComponent(code ?? "")}`}`;
  const loginHref = `/login?next=${encodeURIComponent(invitePath)}`;

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!authenticated) {
      router.push(loginHref);
      return;
    }
    setPending(true);
    setError("");
    const result = await joinRoomAction({ publicId, nickname: name, note, token, code });
    if (result.status === "error") {
      setError(result.message);
      setPending(false);
      return;
    }
    if (result.status === "pending") {
      setRequestSent(true);
      setPending(false);
      return;
    }
    router.push(`/rooms/${result.publicId}`);
  }

  if (requestSent) {
    return <div className={styles.page}><header><Wordmark /><span>Request recorded</span></header><main className={styles.waiting}><div className={styles.pulse}><b>{avatarInitials}</b><i /><i /></div><p>Request sent</p><h1>The Host will<br /><em>let you in.</em></h1><span>Your request is safely stored. When Host approval is added, this page can surface the decision without recreating the request.</span><div><strong>{invite.name}</strong><small>Private room · Ends {end}</small></div><Link href="/rooms">View your rooms</Link></main></div>;
  }

  return <div className={styles.page}><header><Wordmark /><Link href={authenticated ? "/rooms" : loginHref}>{authenticated ? "Your rooms" : "Log in"}</Link></header><main className={styles.layout}><section className={styles.invite}><div className={styles.inviteMeta}><span>Private invitation</span><time>Ends {end}</time></div><div className={styles.art} aria-hidden="true"><PinnedPhoto variant="one" className={styles.photoOne} /><PinnedPhoto variant="three" className={styles.photoTwo} /><span>EventSpace</span></div><p>You&apos;re invited to</p><h1>{invite.name}</h1><div className={styles.description}>{invite.description || "A private Host-led room."}</div><footer><span>{invite.member_count} of {invite.member_limit} people</span><span>{invite.requires_approval ? "Host approval required" : "Private room"}</span></footer></section><form className={styles.form} onSubmit={submit} noValidate><p>Step inside</p><h2>How should everyone<br /><em>know you?</em></h2><label>Name <span>{name.length} / 60</span></label><input autoFocus value={name} onChange={(event) => setName(event.target.value.slice(0, 60))} placeholder="Avery Morgan" disabled={!authenticated || pending} /><label>Avatar preview</label><div className={styles.avatarRow}><b>{avatarInitials}</b><button type="button" aria-pressed={avatarStyle === "initials"} onClick={() => setAvatarStyle("initials")}>{initials}</button><button type="button" aria-pressed={avatarStyle === "single"} onClick={() => setAvatarStyle("single")}>{initials.slice(0, 1)}</button><button type="button" aria-pressed={avatarStyle === "ring"} onClick={() => setAvatarStyle("ring")}>○</button></div><label>Note for the room <span>Optional</span></label><textarea value={note} onChange={(event) => setNote(event.target.value.slice(0, 240))} placeholder="Who invited you, or what should they know?" rows={3} disabled={!authenticated || pending} />{error ? <span className={styles.error} role="alert">{error}</span> : null}<button type="submit" className={styles.join} disabled={pending || (authenticated && !name.trim())}>{!authenticated ? "Log in to continue" : pending ? "Sending…" : invite.requires_approval ? "Request to join" : "Enter room"} <Icon name="arrow" /></button><small>{authenticated ? "Your name and note are only used for this private room." : "A secure email link will return you to this invitation."}</small></form></main></div>;
}
