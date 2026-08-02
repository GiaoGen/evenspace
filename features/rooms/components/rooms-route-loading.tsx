"use client";

import { useSyncExternalStore } from "react";

import { readRoomsRouteSnapshot, subscribeRoomsRouteSnapshot } from "@/features/room-performance/model/route-snapshots";
import { RoomsPage } from "./rooms-page";

export function RoomsRouteLoading() {
  const snapshot = useSyncExternalStore(subscribeRoomsRouteSnapshot, readRoomsRouteSnapshot, () => null);

  if (snapshot) {
    return <RoomsPage
      initialRooms={snapshot.rooms}
      viewerInitials={snapshot.viewerInitials}
      viewerAvatarUrl={null}
      viewerCacheScope={snapshot.scope}
      viewerAccountScope={snapshot.viewerAccountScope}
    />;
  }

  return <RoomsPage initialRooms={[]} viewerInitials="ES" viewerAvatarUrl={null} loading />;
}
