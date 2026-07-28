import "server-only";

import { z } from "zod";

import { createSupabaseServerClient } from "@/data/supabase/server-client";

const publicId = z.string().regex(/^room_[a-z0-9_]{3,40}$/);
const uuid = z.uuid();

export class BackendCapabilityError extends Error {
  constructor(readonly code: "invalid_input" | "forbidden" | "conflict" | "unavailable") {
    super(code);
    this.name = "BackendCapabilityError";
  }
}

async function rpc<Name extends Parameters<Awaited<ReturnType<typeof createSupabaseServerClient>>["rpc"]>[0]>(
  name: Name,
  args: Parameters<Awaited<ReturnType<typeof createSupabaseServerClient>>["rpc"]>[1],
) {
  const client = await createSupabaseServerClient();
  const { data, error } = await client.rpc(name, args as never);
  if (error) {
    if (error.code === "42501") throw new BackendCapabilityError("forbidden");
    if (error.code === "40001") throw new BackendCapabilityError("conflict");
    if (error.code === "22023" || error.code === "23514") {
      throw new BackendCapabilityError("invalid_input");
    }
    throw new BackendCapabilityError("unavailable");
  }
  return data;
}

export async function listPendingJoinRequests(roomPublicId: string) {
  const room = publicId.safeParse(roomPublicId);
  if (!room.success) throw new BackendCapabilityError("invalid_input");
  return rpc("list_pending_join_requests", { requested_room_public_id: room.data });
}

export async function reviewJoinRequest(input: {
  roomPublicId: string; requestId: string; decision: "approved" | "rejected";
}) {
  const parsed = z.object({ roomPublicId: publicId, requestId: uuid, decision: z.enum(["approved", "rejected"]) }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("review_join_request", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_request_id: parsed.data.requestId,
    requested_decision: parsed.data.decision,
  });
}

export async function changeRoomMemberState(input: {
  roomPublicId: string; actorId: string; state: "active" | "muted" | "removed" | "banned";
}) {
  const parsed = z.object({ roomPublicId: publicId, actorId: uuid, state: z.enum(["active", "muted", "removed", "banned"]) }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("change_room_member_state", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_actor_id: parsed.data.actorId,
    requested_state: parsed.data.state,
  });
}

export async function endHostLedRoom(input: { roomPublicId: string; idempotencyKey: string }) {
  const parsed = z.object({ roomPublicId: publicId, idempotencyKey: uuid }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("end_host_led_room", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function sendRoomMessage(input: {
  roomPublicId: string; kind: "text" | "voice"; body?: string;
  assetId?: string; replyToMessageId?: string; idempotencyKey: string;
}) {
  const parsed = z.object({
    roomPublicId: publicId, kind: z.enum(["text", "voice"]),
    body: z.string().max(4000).optional(), assetId: uuid.optional(),
    replyToMessageId: uuid.optional(), idempotencyKey: uuid,
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("send_room_message", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_kind: parsed.data.kind,
    requested_body: parsed.data.body ?? null,
    requested_asset_id: parsed.data.assetId ?? null,
    requested_reply_to_message_id: parsed.data.replyToMessageId ?? null,
    requested_idempotency_key: parsed.data.idempotencyKey,
  } as never);
}

export async function recallRoomMessage(messageId: string) {
  const parsed = uuid.safeParse(messageId);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("recall_room_message", { requested_message_id: parsed.data });
}

export async function reactToRoomMessage(input: {
  messageId: string;
  emoji: string;
  active: boolean;
}) {
  const parsed = z.object({
    messageId: uuid,
    emoji: z.string().min(1).max(16),
    active: z.boolean(),
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("react_to_room_message", {
    requested_message_id: parsed.data.messageId,
    requested_emoji: parsed.data.emoji,
    requested_active: parsed.data.active,
  });
}

export async function pinRoomMessage(input: {
  roomPublicId: string;
  messageId: string;
}) {
  const parsed = z.object({
    roomPublicId: publicId,
    messageId: uuid,
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("pin_room_message", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_message_id: parsed.data.messageId,
  });
}

export async function createItinerary(input: {
  roomPublicId: string; title: string; description?: string; locationLabel?: string;
  startsAt: string; endMode: "scheduled" | "manual"; plannedEndsAt?: string;
  responsibleActorId?: string; idempotencyKey: string;
}) {
  const parsed = z.object({
    roomPublicId: publicId, title: z.string().trim().min(1).max(120),
    description: z.string().max(1000).optional().default(""),
    locationLabel: z.string().max(160).optional().default(""),
    startsAt: z.iso.datetime({ offset: true }), endMode: z.enum(["scheduled", "manual"]),
    plannedEndsAt: z.iso.datetime({ offset: true }).optional(),
    responsibleActorId: uuid.optional(), idempotencyKey: uuid,
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("create_itinerary", {
    requested_room_public_id: parsed.data.roomPublicId,
    requested_title: parsed.data.title,
    requested_description: parsed.data.description,
    requested_location_label: parsed.data.locationLabel,
    requested_starts_at: parsed.data.startsAt,
    requested_end_mode: parsed.data.endMode,
    requested_planned_ends_at: parsed.data.plannedEndsAt,
    requested_responsible_actor_id: parsed.data.responsibleActorId,
    requested_idempotency_key: parsed.data.idempotencyKey,
  });
}

export async function updateItinerary(input: {
  itineraryId: string;
  expectedRevision: number;
  title: string;
  description?: string;
  locationLabel?: string;
  startsAt: string;
  endMode: "scheduled" | "manual";
  plannedEndsAt?: string;
  responsibleActorId?: string;
}) {
  const parsed = z.object({
    itineraryId: uuid,
    expectedRevision: z.number().int().positive(),
    title: z.string().trim().min(1).max(120),
    description: z.string().max(1000).optional().default(""),
    locationLabel: z.string().max(160).optional().default(""),
    startsAt: z.iso.datetime({ offset: true }),
    endMode: z.enum(["scheduled", "manual"]),
    plannedEndsAt: z.iso.datetime({ offset: true }).optional(),
    responsibleActorId: uuid.optional(),
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("update_itinerary", {
    requested_itinerary_id: parsed.data.itineraryId,
    requested_expected_revision: parsed.data.expectedRevision,
    requested_title: parsed.data.title,
    requested_description: parsed.data.description,
    requested_location_label: parsed.data.locationLabel,
    requested_starts_at: parsed.data.startsAt,
    requested_end_mode: parsed.data.endMode,
    requested_planned_ends_at: parsed.data.plannedEndsAt,
    requested_responsible_actor_id: parsed.data.responsibleActorId,
  });
}

export async function endItinerary(input: {
  itineraryId: string;
  expectedRevision: number;
}) {
  const parsed = z.object({
    itineraryId: uuid,
    expectedRevision: z.number().int().positive(),
  }).safeParse(input);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return rpc("end_itinerary", {
    requested_itinerary_id: parsed.data.itineraryId,
    requested_expected_revision: parsed.data.expectedRevision,
  });
}

export function roomRealtimeTopic(roomId: string) {
  const parsed = uuid.safeParse(roomId);
  if (!parsed.success) throw new BackendCapabilityError("invalid_input");
  return `room:${parsed.data}:events` as const;
}
