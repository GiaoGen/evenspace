"use client";

import Link from "next/link";
import type { RoomPublicId } from "@/core/domain/ids";
import { Icon } from "@/components/ui/icon";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import { deriveMockCapabilities } from "@/features/mock-session/model/mock-session";
import { RoomExperience } from "./room-experience";
import styles from "./room-experience.module.css";

export function MockRoomRoute({ publicId }: { readonly publicId: RoomPublicId }) {
  const { session } = useMockSession();
  const room = session.rooms.find((item) => item.publicId === publicId);
  const nowIso = new Date().toISOString();
  const capabilities = room ? deriveMockCapabilities(session, room, nowIso) : null;
  if (!room || !capabilities?.canRead) return <main className={styles.unavailable}><Icon name="close" size={24} /><p>Private room</p><h1>This room isn&apos;t available in this local data set.</h1><span>It may have been removed, archived from your list, or cleared from this browser.</span><Link href="/rooms">Return to rooms</Link></main>;
  return <RoomExperience room={room} capabilities={capabilities} viewerActorId={session.viewer.actorId} />;
}
