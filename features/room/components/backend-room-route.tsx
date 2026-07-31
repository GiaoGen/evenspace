"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
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
import { rememberViewerCacheScope, saveRoomRouteSnapshot } from "@/features/room-performance/model/route-snapshots";

const SECONDARY_ENTITIES = new Set([
  "messages",
  "message_reactions",
  "message_pins",
  "itineraries",
  "photo_comments",
  "room_join_requests",
]);

const SECONDARY_COMMANDS = new Set<MockCommand["type"]>([
  "POST_MESSAGE",
  "RECALL_MESSAGE",
  "DELETE_OWN_MESSAGE",
  "DELETE_MESSAGE",
  "REACT_MESSAGE",
  "PIN_MESSAGE",
  "ADD_BOARD_COMMENT",
  "ADD_ITINERARY",
  "UPDATE_ITINERARY",
  "DELETE_ITINERARY",
  "END_ITINERARY",
]);

function broadcastEntityType(message: unknown): string | null {
  if (!message || typeof message !== "object" || Array.isArray(message)) return null;
  const body = (message as { readonly payload?: unknown }).payload;
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const entityType = (body as { readonly entity_type?: unknown }).entity_type;
  return typeof entityType === "string" ? entityType : null;
}

export function BackendRoomRoute({
  payload,
}: {
  readonly payload: BackendRoomSession | null;
}) {
  const router = useRouter();
  const payloadKey = payload ? `${payload.room.id}:${payload.room.inviteRevision}` : null;
  const [resolvedPayload, setResolvedPayload] = useState<{ readonly key: string; readonly payload: BackendRoomSession } | null>(null);
  const secondaryPayload = resolvedPayload?.key === payloadKey ? resolvedPayload.payload : null;
  const primaryRefreshTimer = useRef<number | null>(null);
  const secondaryRefreshTimer = useRef<number | null>(null);
  const secondaryRequestId = useRef(0);
  const refreshPrimary = useCallback(() => {
    if (primaryRefreshTimer.current !== null) window.clearTimeout(primaryRefreshTimer.current);
    primaryRefreshTimer.current = window.setTimeout(() => {
      primaryRefreshTimer.current = null;
      router.refresh();
    }, 80);
  }, [router]);
  const loadSecondary = useCallback(async () => {
    if (!payload || !payloadKey) return;
    const requestId = secondaryRequestId.current + 1;
    secondaryRequestId.current = requestId;
    try {
      const response = await fetch(`/api/rooms/${encodeURIComponent(payload.room.publicId)}/details`, {
        cache: "no-store",
      });
      const next = response.ok ? await response.json() as BackendRoomSession : null;
      if (
        requestId === secondaryRequestId.current
        && next?.room.publicId === payload.room.publicId
      ) {
        setResolvedPayload({ key: payloadKey, payload: next });
      }
    } catch {
      // The primary photo-first payload remains usable while a live detail refresh retries.
    }
  }, [payload, payloadKey]);
  const refreshSecondary = useCallback(() => {
    if (secondaryRefreshTimer.current !== null) window.clearTimeout(secondaryRefreshTimer.current);
    secondaryRefreshTimer.current = window.setTimeout(() => {
      secondaryRefreshTimer.current = null;
      void loadSecondary();
    }, 80);
  }, [loadSecondary]);
  const handleRoomBroadcast = useCallback((message: unknown) => {
    const entityType = broadcastEntityType(message);
    if (entityType && SECONDARY_ENTITIES.has(entityType)) refreshSecondary();
    else refreshPrimary();
  }, [refreshPrimary, refreshSecondary]);
  const handleSettled = useCallback((command: MockCommand) => {
    if (SECONDARY_COMMANDS.has(command.type)) refreshSecondary();
    else refreshPrimary();
  }, [refreshPrimary, refreshSecondary]);
  const execute = useCallback(async (command: MockCommand) => {
    return roomCommandAction(command);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadSecondary();
    }, 0);
    return () => {
      window.clearTimeout(timer);
      secondaryRequestId.current += 1;
    };
  }, [loadSecondary]);

  useEffect(() => {
    if (!payload) return;
    rememberViewerCacheScope(payload.session.viewer.actorId);
    saveRoomRouteSnapshot(payload);
  }, [payload]);

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
          .on("broadcast", { event: "room_changed" }, handleRoomBroadcast)
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
      if (primaryRefreshTimer.current !== null) window.clearTimeout(primaryRefreshTimer.current);
      if (secondaryRefreshTimer.current !== null) window.clearTimeout(secondaryRefreshTimer.current);
      authListener.subscription.unsubscribe();
      void supabase.removeChannel(channel);
    };
  }, [handleRoomBroadcast, payload]);

  if (!payload) {
    return <main className={styles.unavailable}><Icon name="close" size={24} /><p>Private room</p><h1>This room isn&apos;t available.</h1><span>It may have ended or been removed from your rooms.</span><Link href="/rooms">Return to rooms</Link></main>;
  }

  return (
    <BackendSessionProvider
      initialSession={payload.session}
      onCommand={execute}
      onSettled={handleSettled}
    >
      <LiveRoomExperience
        initialRoom={payload.room}
        secondaryRoom={secondaryPayload?.room}
        capabilities={payload.capabilities}
        viewerActorId={payload.session.viewer.actorId}
      />
    </BackendSessionProvider>
  );
}
function LiveRoomExperience({
  initialRoom,
  secondaryRoom,
  capabilities,
  viewerActorId,
}: {
  readonly initialRoom: NonNullable<BackendRoomSession>["room"];
  readonly secondaryRoom?: NonNullable<BackendRoomSession>["room"];
  readonly capabilities: NonNullable<BackendRoomSession>["capabilities"];
  readonly viewerActorId: NonNullable<BackendRoomSession>["session"]["viewer"]["actorId"];
}) {
  const { session } = useMockSession();
  const baseRoom = session.rooms.find((candidate) => candidate.publicId === initialRoom.publicId) ?? initialRoom;
  const room = secondaryRoom ? {
    ...baseRoom,
    members: secondaryRoom.members,
    messages: mergeMessages(secondaryRoom.messages, baseRoom.messages),
    pinnedMessageId: secondaryRoom.pinnedMessageId,
    boardComments: mergeById(secondaryRoom.boardComments, baseRoom.boardComments),
    itinerary: mergeById(secondaryRoom.itinerary, baseRoom.itinerary),
    joinRequests: mergeById(secondaryRoom.joinRequests, baseRoom.joinRequests),
  } : baseRoom;
  return <RoomExperience room={room} capabilities={capabilities} viewerActorId={viewerActorId} />;
}

function mergeById<T extends { readonly id: string }>(secondary: readonly T[], local: readonly T[]) {
  return [...new Map([...secondary, ...local].map((item) => [item.id, item])).values()];
}

function mergeMessages(
  secondary: NonNullable<BackendRoomSession>["room"]["messages"],
  local: NonNullable<BackendRoomSession>["room"]["messages"],
) {
  return mergeById(secondary, local).toSorted((left, right) =>
    Date.parse(left.sentAt) - Date.parse(right.sentAt),
  );
}
