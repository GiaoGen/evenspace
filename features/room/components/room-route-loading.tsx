"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { readRoomRouteSnapshot, readRoomsRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import { BackendRoomRoute } from "./backend-room-route";
import styles from "./room-route-loading.module.css";

export function RoomRouteLoading() {
  const params = useParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === "string" ? params.roomId : "";
  const [snapshot] = useState(() => roomId ? readRoomRouteSnapshot(roomId) : null);
  const [roomsSnapshot] = useState(readRoomsRouteSnapshot);

  if (snapshot) return <BackendRoomRoute payload={snapshot.payload} />;

  const preview = roomsSnapshot?.rooms.find((item) => item.room.publicId === roomId);
  if (preview && roomsSnapshot) {
    return <main className={styles.room} aria-label={`Opening ${preview.room.name}`} aria-busy="true">
      <header className={styles.previewHeader}><i /><strong>{preview.room.name}</strong><i /></header>
      <div className={styles.body}>
        <section className={styles.photoGrid} />
        <aside />
      </div>
    </main>;
  }

  return <main className={styles.room} aria-label="Loading room" aria-busy="true">
    <header><i /><span /><i /></header>
    <div className={styles.body}>
      <section className={styles.photoGrid}>{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</section>
      <aside />
    </div>
  </main>;
}
