"use client";

import { useParams } from "next/navigation";
import { useState } from "react";

import { readRoomRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import { BackendRoomRoute } from "./backend-room-route";
import styles from "./room-route-loading.module.css";

export function RoomRouteLoading() {
  const params = useParams<{ roomId?: string }>();
  const roomId = typeof params.roomId === "string" ? params.roomId : "";
  const [snapshot] = useState(() => roomId ? readRoomRouteSnapshot(roomId) : null);

  if (snapshot) return <BackendRoomRoute payload={snapshot.payload} />;

  return <main className={styles.room} aria-label="Loading room" aria-busy="true">
    <header><i /><span /><i /></header>
    <section className={styles.photoGrid}>{Array.from({ length: 12 }, (_, index) => <i key={index} />)}</section>
  </main>;
}
