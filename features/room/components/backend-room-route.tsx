"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

import { roomCommandAction } from "@/app/rooms/[roomId]/actions";
import { Icon } from "@/components/ui/icon";
import type { BackendRoomSession } from "@/data/supabase/backend-room-session";
import { createSupabaseBrowserClient } from "@/data/supabase/browser-client";
import { BackendSessionProvider } from "@/features/mock-session/components/mock-session-provider";
import { useMockSession } from "@/features/mock-session/components/mock-session-provider";
import type { MockCommand } from "@/features/mock-session/model/mock-session";
import { RoomExperience } from "./room-experience";
import styles from "./room-experience.module.css";

export function BackendRoomRoute({
  payload,
}: {
  readonly payload: BackendRoomSession | null;
}) {
  const router = useRouter();
  const refreshTimer = useRef<number | null>(null);
  const refresh = useCallback(() => {
    if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
    refreshTimer.current = window.setTimeout(() => {
      refreshTimer.current = null;
      router.refresh();
    }, 80);
  }, [router]);
  const execute = useCallback(async (command: MockCommand) => {
    return roomCommandAction(command);
  }, []);

  useEffect(() => {
    if (!payload) return;
    const supabase = createSupabaseBrowserClient();
    let channel = supabase.channel(payload.realtimeTopic, {
      config: { private: true },
    });
    let active = true;
    void supabase.realtime.setAuth()
      .then(() => {
        if (!active) return;
        channel = channel
          .on("broadcast", { event: "*" }, refresh)
          .subscribe();
      })
      .catch(() => undefined);
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (active && session?.access_token) {
          void supabase.realtime.setAuth(session.access_token);
        }
      },
    );
    return () => {
      active = false;
      if (refreshTimer.current !== null) window.clearTimeout(refreshTimer.current);
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [payload, refresh]);

  if (!payload) {
    return <main className={styles.unavailable}><Icon name="close" size={24} /><p>Private room</p><h1>This room isn&apos;t available.</h1><span>It may have ended or been removed from your rooms.</span><Link href="/rooms">Return to rooms</Link></main>;
  }

  return (
    <BackendSessionProvider
      initialSession={payload.session}
      onCommand={execute}
      onSettled={refresh}
    >
      <LiveRoomExperience
        initialRoom={payload.room}
        capabilities={payload.capabilities}
        viewerActorId={payload.session.viewer.actorId}
      />
    </BackendSessionProvider>
  );
}
function LiveRoomExperience({
  initialRoom,
  capabilities,
  viewerActorId,
}: {
  readonly initialRoom: NonNullable<BackendRoomSession>["room"];
  readonly capabilities: NonNullable<BackendRoomSession>["capabilities"];
  readonly viewerActorId: NonNullable<BackendRoomSession>["session"]["viewer"]["actorId"];
}) {
  const { session } = useMockSession();
  const room = session.rooms.find((candidate) => candidate.publicId === initialRoom.publicId) ?? initialRoom;
  return <RoomExperience room={room} capabilities={capabilities} viewerActorId={viewerActorId} />;
}
