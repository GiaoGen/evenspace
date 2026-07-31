"use client";

import { useState } from "react";

import { readRoomsRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import { RoomsPage } from "./rooms-page";

export function RoomsRouteLoading() {
  const [snapshot] = useState(readRoomsRouteSnapshot);

  if (snapshot) {
    return <RoomsPage
      initialRooms={snapshot.rooms}
      viewerInitials={snapshot.viewerInitials}
      viewerAvatarUrl={null}
      viewerCacheScope={snapshot.scope}
    />;
  }

  return <RoomsPage initialRooms={[]} viewerInitials="ES" viewerAvatarUrl={null} loading />;
}
