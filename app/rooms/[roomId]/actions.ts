"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  BackendCapabilityError,
  changeRoomMemberState,
  createItinerary,
  endHostLedRoom,
  endItinerary,
  pinRoomMessage,
  reactToRoomMessage,
  recallRoomMessage,
  reviewJoinRequest,
  sendRoomMessage,
  updateItinerary,
} from "@/data/supabase/backend-capabilities";
import { createSupabaseServerClient } from "@/data/supabase/server-client";

const roomPublicId = z.string().regex(/^room_[a-z0-9_]{3,40}$/);
const uuid = z.uuid();
const commandBase = {
  roomPublicId,
  actorId: z.string(),
  nowIso: z.string(),
};
const itineraryItem = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  startsAt: z.string(),
  endMode: z.enum(["scheduled", "manual"]),
  endsAt: z.string().nullable(),
  locationLabel: z.string().nullable().optional(),
  responsible: z.object({ actorId: z.string() }),
});
const voiceContent = z.object({
  type: z.literal("voice"),
  durationSeconds: z.number().int().positive().max(60),
  asset: z.object({ id: uuid }),
});

const wiredCommand = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("POST_MESSAGE"),
    ...commandBase,
    message: z.object({
      id: z.string(),
      body: z.string(),
      replyToId: z.string().optional(),
      content: voiceContent.optional(),
    }),
  }),
  z.object({ type: z.enum(["RECALL_MESSAGE", "DELETE_OWN_MESSAGE", "DELETE_MESSAGE"]), ...commandBase, messageId: uuid }),
  z.object({ type: z.literal("REACT_MESSAGE"), ...commandBase, messageId: uuid, emoji: z.string().min(1).max(16) }),
  z.object({ type: z.literal("PIN_MESSAGE"), ...commandBase, messageId: uuid.nullable() }),
  z.object({ type: z.enum(["ADD_ITINERARY", "UPDATE_ITINERARY"]), ...commandBase, item: itineraryItem }),
  z.object({ type: z.enum(["END_ITINERARY", "DELETE_ITINERARY"]), ...commandBase, itemId: uuid }),
  z.object({ type: z.literal("REVIEW_JOIN"), ...commandBase, requestId: uuid, decision: z.enum(["approved", "rejected"]) }),
  z.object({ type: z.literal("SET_MEMBER_STATE"), ...commandBase, targetActorId: uuid, state: z.enum(["active", "muted", "removed", "banned"]) }),
  z.object({ type: z.literal("END_ROOM"), ...commandBase }),
]);

export type RoomCommandActionResult =
  | { readonly status: "ok" }
  | { readonly status: "ignored" }
  | {
      readonly status: "error";
      readonly code: "invalid_input" | "forbidden" | "conflict" | "unavailable";
    };

function commandUuid(value: string) {
  const candidate = value.slice(-36);
  return uuid.safeParse(candidate).success ? candidate : null;
}

async function currentItineraryRevision(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.from("itineraries")
    .select("revision").eq("id", id).maybeSingle();
  if (error || !data) throw new BackendCapabilityError("unavailable");
  return data.revision;
}

export async function roomCommandAction(input: unknown): Promise<RoomCommandActionResult> {
  if (!input || typeof input !== "object" || !("type" in input)) {
    return { status: "error", code: "invalid_input" };
  }
  const type = String((input as { type: unknown }).type);
  const supported = new Set([
    "POST_MESSAGE", "RECALL_MESSAGE", "DELETE_OWN_MESSAGE", "DELETE_MESSAGE",
    "REACT_MESSAGE", "PIN_MESSAGE", "ADD_ITINERARY", "UPDATE_ITINERARY",
    "END_ITINERARY", "DELETE_ITINERARY", "REVIEW_JOIN", "SET_MEMBER_STATE",
    "END_ROOM",
  ]);
  if (!supported.has(type)) return { status: "ignored" };

  const parsed = wiredCommand.safeParse(input);
  if (!parsed.success) return { status: "error", code: "invalid_input" };
  const command = parsed.data;

  try {
    if (command.type === "POST_MESSAGE") {
      const idempotencyKey = commandUuid(command.message.id);
      if (!idempotencyKey) return { status: "error", code: "invalid_input" };
      await sendRoomMessage({
        roomPublicId: command.roomPublicId,
        kind: command.message.content?.type === "voice" ? "voice" : "text",
        body: command.message.content ? undefined : command.message.body,
        assetId: command.message.content?.asset.id,
        replyToMessageId: command.message.replyToId,
        idempotencyKey,
      });
    } else if (command.type === "RECALL_MESSAGE" || command.type === "DELETE_OWN_MESSAGE" || command.type === "DELETE_MESSAGE") {
      await recallRoomMessage(command.messageId);
    } else if (command.type === "REACT_MESSAGE") {
      await reactToRoomMessage({ messageId: command.messageId, emoji: command.emoji, active: true });
    } else if (command.type === "PIN_MESSAGE") {
      if (!command.messageId) return { status: "ignored" };
      await pinRoomMessage({ roomPublicId: command.roomPublicId, messageId: command.messageId });
    } else if (command.type === "ADD_ITINERARY") {
      const idempotencyKey = commandUuid(command.item.id);
      if (!idempotencyKey) return { status: "error", code: "invalid_input" };
      await createItinerary({
        roomPublicId: command.roomPublicId,
        title: command.item.title,
        description: command.item.description,
        locationLabel: command.item.locationLabel ?? undefined,
        startsAt: command.item.startsAt,
        endMode: command.item.endMode,
        plannedEndsAt: command.item.endsAt ?? undefined,
        responsibleActorId: command.item.responsible.actorId,
        idempotencyKey,
      });
    } else if (command.type === "UPDATE_ITINERARY") {
      const revision = await currentItineraryRevision(command.item.id);
      await updateItinerary({
        itineraryId: command.item.id,
        expectedRevision: revision,
        title: command.item.title,
        description: command.item.description,
        locationLabel: command.item.locationLabel ?? undefined,
        startsAt: command.item.startsAt,
        endMode: command.item.endMode,
        plannedEndsAt: command.item.endsAt ?? undefined,
        responsibleActorId: command.item.responsible.actorId,
      });
    } else if (command.type === "END_ITINERARY" || command.type === "DELETE_ITINERARY") {
      const revision = await currentItineraryRevision(command.itemId);
      await endItinerary({ itineraryId: command.itemId, expectedRevision: revision });
    } else if (command.type === "REVIEW_JOIN") {
      await reviewJoinRequest({
        roomPublicId: command.roomPublicId,
        requestId: command.requestId,
        decision: command.decision,
      });
    } else if (command.type === "SET_MEMBER_STATE") {
      await changeRoomMemberState({
        roomPublicId: command.roomPublicId,
        actorId: command.targetActorId,
        state: command.state,
      });
    } else if (command.type === "END_ROOM") {
      await endHostLedRoom({
        roomPublicId: command.roomPublicId,
        idempotencyKey: crypto.randomUUID(),
      });
    }
    revalidatePath(`/rooms/${command.roomPublicId}`);
    revalidatePath("/rooms");
    return { status: "ok" };
  } catch (error) {
    if (error instanceof BackendCapabilityError) {
      return { status: "error", code: error.code };
    }
    return { status: "error", code: "unavailable" };
  }
}
