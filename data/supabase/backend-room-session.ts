import "server-only";

import type { ActorId } from "@/core/domain/ids";
import { parseActorId } from "@/core/domain/ids";
import type { AssetReference } from "@/core/domain/asset";
import type { BoardComment, BoardPhoto, ChatMessage, ItineraryItem, PersonSummary, RoomCapabilities } from "@/core/domain/room";
import type { MembershipState } from "@/core/domain/room";
import { SupabaseRoomReadRepository } from "@/data/supabase/supabase-room-read-repository";
import { createSupabaseServerClient } from "@/data/supabase/server-client";
import {
  MOCK_SESSION_VERSION,
  type MockJoinRequest,
  type MockRoom,
  type MockSession,
} from "@/features/mock-session/model/mock-session";

export interface BackendRoomSession {
  readonly session: MockSession;
  readonly room: MockRoom;
  readonly capabilities: RoomCapabilities;
  readonly realtimeTopic: `room:${string}:events`;
}

function initialsFor(value: string) {
  return value.trim().split(/\s+/).slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? "").join("") || "?";
}

function actorId(value: string): ActorId {
  const parsed = parseActorId(value);
  if (!parsed) throw new Error("Invalid backend actor identifier");
  return parsed;
}

export async function getBackendRoomSession(
  publicId: Parameters<SupabaseRoomReadRepository["findCurrentViewerRoom"]>[0],
): Promise<BackendRoomSession | null> {
  const repository = new SupabaseRoomReadRepository();
  const roomRead = await repository.findCurrentViewerRoom(publicId);
  if (!roomRead) return null;

  const supabase = await createSupabaseServerClient();
  const [
    membersResult,
    messagesResult,
    reactionsResult,
    pinResult,
    itinerariesResult,
    photosResult,
    photoCommentsResult,
    assetsResult,
    pendingRequestsResult,
    claimsResult,
  ] = await Promise.all([
    supabase.from("room_members").select("actor_id,nickname,role,state,archive_eligible").eq("room_id", roomRead.id),
    supabase.from("messages").select("id,author_actor_id,kind,body,asset_id,reply_to_message_id,created_at,recalled_at,moderated_at").eq("room_id", roomRead.id).order("created_at", { ascending: true }).limit(500),
    supabase.from("message_reactions").select("message_id,actor_id,emoji"),
    supabase.from("message_pins").select("message_id").eq("room_id", roomRead.id).maybeSingle(),
    supabase.from("itineraries").select("id,title,description,starts_at,end_mode,planned_ends_at,ended_at,location_label,responsible_actor_id,created_by_actor_id,created_at,updated_at,revision").eq("room_id", roomRead.id).order("starts_at", { ascending: true }),
    supabase.from("photos").select("id,asset_id,owner_actor_id,original_name,aspect_ratio,note,created_at").eq("room_id", roomRead.id).order("created_at", { ascending: true }),
    supabase.from("photo_comments").select("id,photo_id,actor_id,body,created_at").eq("room_id", roomRead.id).order("created_at", { ascending: true }),
    supabase.from("assets").select("id,kind,status,object_key,mime_type,byte_size,duration_ms"),
    roomRead.viewer.role === "host"
      ? supabase.rpc("list_pending_join_requests", { requested_room_public_id: publicId })
      : Promise.resolve({ data: [], error: null }),
    supabase.auth.getClaims(),
  ]);

  const firstError = [
    membersResult.error,
    messagesResult.error,
    reactionsResult.error,
    pinResult.error,
    itinerariesResult.error,
    photosResult.error,
    photoCommentsResult.error,
    assetsResult.error,
    pendingRequestsResult.error,
    claimsResult.error,
  ].find(Boolean);
  if (firstError) throw new Error("Backend room snapshot unavailable");

  const memberRows = membersResult.data ?? [];
  const viewerActorId = actorId(roomRead.viewer.actorId);
  const members: PersonSummary[] = memberRows.map((member) => ({
    actorId: actorId(member.actor_id),
    displayName: member.nickname,
    initials: initialsFor(member.nickname),
    role: member.role === "host" ? "host" : "member",
    isGuest: false,
  }));
  if (!members.some((member) => member.actorId === viewerActorId)) {
    members.push({
      actorId: viewerActorId,
      displayName: roomRead.viewer.nickname,
      initials: initialsFor(roomRead.viewer.nickname),
      role: roomRead.viewer.role,
      isGuest: false,
    });
  }
  const membersByActor = new Map(members.map((member) => [member.actorId, member]));
  const assetUrls = new Map<string, string>();
  await Promise.all((assetsResult.data ?? [])
    .filter((asset) => asset.status === "ready" && asset.object_key)
    .map(async (asset) => {
      const { data } = await supabase.storage.from("room-media").createSignedUrl(asset.object_key!, 60 * 30);
      if (data?.signedUrl) assetUrls.set(asset.id, data.signedUrl);
    }));
  const assetsById = new Map((assetsResult.data ?? []).map((asset) => [asset.id, asset]));
  const assetReference = (id: string | null): AssetReference | null => {
    if (!id) return null;
    const asset = assetsById.get(id);
    if (!asset || asset.status !== "ready" || !asset.mime_type || asset.byte_size === null) return null;
    const remoteUrl = assetUrls.get(id);
    if (!remoteUrl) return null;
    return {
      id: asset.id,
      kind: asset.kind === "voice" ? "audio" : "image",
      mimeType: asset.mime_type,
      byteSize: asset.byte_size,
      remoteUrl,
    };
  };

  const reactionCounts = new Map<string, Map<string, number>>();
  for (const reaction of reactionsResult.data ?? []) {
    const byEmoji = reactionCounts.get(reaction.message_id) ?? new Map<string, number>();
    byEmoji.set(reaction.emoji, (byEmoji.get(reaction.emoji) ?? 0) + 1);
    reactionCounts.set(reaction.message_id, byEmoji);
  }

  const messages: ChatMessage[] = (messagesResult.data ?? [])
    .filter((message) => !message.recalled_at && !message.moderated_at)
    .map((message) => {
      const authorActorId = actorId(message.author_actor_id);
      const author = membersByActor.get(authorActorId) ?? {
        actorId: authorActorId,
        displayName: "Room member",
        initials: "?",
        role: "member" as const,
        isGuest: false,
      };
      const voiceAsset = message.kind === "voice" ? assetReference(message.asset_id) : null;
      return {
        id: message.id,
        kind: message.kind === "system" ? "system" : "message",
        author: message.kind === "system" ? null : author,
        body: message.body ?? (message.kind === "voice" ? "Voice message" : ""),
        sentAt: message.created_at,
        isOwn: authorActorId === viewerActorId,
        reactions: [...(reactionCounts.get(message.id) ?? new Map())]
          .map(([emoji, count]) => ({ emoji, count })),
        ...(message.reply_to_message_id ? { replyToId: message.reply_to_message_id } : {}),
        ...(voiceAsset ? { content: { type: "voice" as const, durationSeconds: Math.max(1, Math.round((assetsById.get(message.asset_id!)?.duration_ms ?? 0) / 1000)), asset: voiceAsset } } : {}),
      };
    });

  const photos: BoardPhoto[] = (photosResult.data ?? []).flatMap((photo, index) => {
    const asset = assetReference(photo.asset_id);
    if (!asset) return [];
    return [{
      id: photo.id,
      kind: "photo" as const,
      ownerActorId: actorId(photo.owner_actor_id),
      variant: (["one", "two", "three", "four"] as const)[index % 4],
      asset,
      imageName: photo.original_name,
      aspectRatio: photo.aspect_ratio,
      note: photo.note,
      x: 0,
      y: 0,
      rotation: 0,
      width: 24,
    }];
  });
  const photoComments: BoardComment[] = (photoCommentsResult.data ?? []).map((comment) => ({
    id: comment.id,
    photoId: comment.photo_id,
    actorId: actorId(comment.actor_id),
    body: comment.body,
    createdAt: comment.created_at,
  }));

  const itineraries: ItineraryItem[] = (itinerariesResult.data ?? []).map((item) => {
    const responsibleId = actorId(item.responsible_actor_id ?? item.created_by_actor_id);
    const responsible = membersByActor.get(responsibleId) ?? {
      actorId: responsibleId,
      displayName: "Room member",
      initials: "?",
      role: "member" as const,
      isGuest: false,
    };
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      startsAt: item.starts_at,
      endMode: item.end_mode === "manual" ? "manual" : "scheduled",
      endsAt: item.planned_ends_at,
      endedAt: item.ended_at,
      locationLabel: item.location_label,
      mapsUrl: item.location_label
        ? `https://maps.google.com/?q=${encodeURIComponent(item.location_label)}`
        : null,
      responsible,
      createdByActorId: actorId(item.created_by_actor_id),
      createdAt: item.created_at,
      updatedAt: item.updated_at,
    };
  });

  const joinRequests: MockJoinRequest[] = (pendingRequestsResult.data ?? []).map((request) => ({
    id: request.request_id,
    actorId: actorId(request.actor_id),
    displayName: request.nickname,
    initials: initialsFor(request.nickname),
    note: request.note,
    requestedAt: request.requested_at,
    state: "pending",
  }));
  const lifecycle: MockRoom["lifecycle"] =
    roomRead.status === "active" ? "active"
      : roomRead.status === "freezing" ? "freezing"
        : roomRead.status === "archiving" ? "archiving"
          : "archived";
  const membershipStates: Record<string, MembershipState | "banned"> =
    Object.fromEntries(memberRows.map((member) => {
      const state: MembershipState | "banned" =
        member.state === "muted" ? "muted"
          : member.state === "removed" ? "removed"
            : member.state === "banned" ? "banned"
              : "active";
      return [member.actor_id, state];
    }));
  membershipStates[viewerActorId] = roomRead.viewer.state;

  const room: MockRoom = {
    id: roomRead.id,
    publicId: roomRead.publicId,
    name: roomRead.name,
    description: roomRead.description,
    mode: "host-led",
    status: lifecycle === "active" ? "active" : "archived",
    lifecycle,
    timeZone: roomRead.timeZone,
    createdAt: roomRead.startsAt,
    endsAt: roomRead.endsAt,
    archivedAt: roomRead.archivedAt,
    memberCount: roomRead.memberCount,
    photoCount: photos.length,
    boardPreview: [],
    boardNote: "",
    boardBackground: "stone",
    isFavorite: false,
    memberListVisibility: roomRead.memberListVisibility === "host" ? "moderators" : "members",
    members,
    messages,
    activePoll: null,
    pollHistory: [],
    boardItems: photos,
    boardComments: photoComments,
    itinerary: itineraries,
    inviteCode: "",
    inviteRevision: roomRead.revision,
    requiresApproval: roomRead.requiresApproval,
    membershipStates,
    archiveActorIds: memberRows.filter((member) => member.archive_eligible).map((member) => actorId(member.actor_id)),
    archiveRemovedBy: [],
    joinRequests,
    pinnedMessageId: pinResult.data?.message_id ?? null,
    memberLimit: roomRead.memberLimit,
    maxPhotos: 25,
    mediaLimitMb: 25,
    reports: [],
  };

  const writable = lifecycle === "active" && Date.parse(roomRead.endsAt) > Date.now();
  const host = roomRead.viewer.role === "host";
  const capabilities: RoomCapabilities = {
    canRead: true,
    canChat: writable && roomRead.viewer.state === "active",
    canVote: false,
    canAddBoardItem: writable && roomRead.viewer.state === "active",
    canCreateItinerary: writable && host,
    canModerate: writable && host,
    canChangeDuration: false,
    canEndRoom: writable && host,
  };
  const claims = claimsResult.data?.claims;
  const email = typeof claims?.email === "string" ? claims.email : null;
  const session: MockSession = {
    version: MOCK_SESSION_VERSION,
    sessionId: `supabase:${roomRead.id}`,
    viewer: {
      actorId: viewerActorId,
      displayName: roomRead.viewer.nickname,
      initials: initialsFor(roomRead.viewer.nickname),
      email,
      authState: "signed-in",
      theme: "system",
    },
    rooms: [room],
  };

  return {
    session,
    room,
    capabilities,
    realtimeTopic: `room:${roomRead.id}:events`,
  };
}
