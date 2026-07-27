import Link from "next/link";

import { Icon } from "@/components/ui/icon";
import type { RoomReadModel } from "@/data/contracts/room-read-repository";
import styles from "./backend-room-shell.module.css";

function formatEnd(room: RoomReadModel) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
    timeZone: room.timeZone,
  }).format(new Date(room.endsAt));
}

export function BackendRoomShell({ room }: { readonly room: RoomReadModel }) {
  const writable = room.status === "active";

  return (
    <div className={styles.page}>
      <header>
        <Link href="/rooms" aria-label="Return to rooms">
          <Icon name="arrow" size={17} />
        </Link>
        <span>
          <strong>{room.name}</strong>
          <small>{writable ? `Ends ${formatEnd(room)}` : "Read-only"}</small>
        </span>
        <span className={styles.role}>{room.viewer.role}</span>
      </header>
      <main>
        <section className={styles.hero}>
          <small>Private · Host-led</small>
          <h1>{room.name}</h1>
          <p>{room.description || "Your room is ready for the first shared moment."}</p>
          <div>
            <span><b>{room.memberCount}</b> people</span>
            <span><b>{room.memberLimit}</b> capacity</span>
            <span><b>{room.requiresApproval ? "On" : "Off"}</b> approval</span>
          </div>
        </section>
        <section className={styles.spaces} aria-label="Room spaces">
          <article><Icon name="chat" /><span><strong>Chat</strong><small>Text and voice will appear here.</small></span></article>
          <article><Icon name="image" /><span><strong>Photos</strong><small>No photos yet.</small></span></article>
          <article><Icon name="calendar" /><span><strong>Itinerary</strong><small>No plans yet.</small></span></article>
        </section>
      </main>
    </div>
  );
}
