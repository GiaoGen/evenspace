"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import {
  joinRoomWithInvite,
  resolveRoomInviteCode,
  RoomInviteError,
} from "@/data/supabase/room-invites";

type JoinActionErrorCode =
  | "invalid_input"
  | "authentication_required"
  | "invalid_or_expired"
  | "capacity_reached"
  | "nickname_unavailable"
  | "access_denied"
  | "unavailable";

export type ResolveInviteCodeResult =
  | { readonly status: "resolved"; readonly publicId: string; readonly code: string }
  | { readonly status: "error"; readonly message: string };

export type JoinRoomActionResult =
  | { readonly status: "joined"; readonly publicId: string }
  | { readonly status: "pending"; readonly publicId: string }
  | { readonly status: "error"; readonly code: JoinActionErrorCode; readonly message: string };

const messages: Record<JoinActionErrorCode, string> = {
  invalid_input: "Review your name and invitation, then try again.",
  authentication_required: "Log in before joining this room.",
  invalid_or_expired: "This invitation is no longer active.",
  capacity_reached: "This room has reached its member limit.",
  nickname_unavailable: "That name is already used in this room.",
  access_denied: "This account cannot join the room.",
  unavailable: "The request could not be completed right now.",
};

export async function resolveInviteCodeAction(code: unknown): Promise<ResolveInviteCodeResult> {
  const parsed = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{8}$/).safeParse(code);
  if (!parsed.success) return { status: "error", message: "Enter the 8-character invite code." };

  try {
    const invite = await resolveRoomInviteCode(parsed.data);
    if (!invite) return { status: "error", message: "That invite code isn’t active." };
    return { status: "resolved", publicId: invite.public_id, code: parsed.data };
  } catch {
    return { status: "error", message: "That invite code could not be opened." };
  }
}

export async function joinRoomAction(input: unknown): Promise<JoinRoomActionResult> {
  const parsed = z.object({
    publicId: z.string().regex(/^room_[a-z0-9_]{3,40}$/),
    nickname: z.string().trim().min(1).max(60),
    note: z.string().trim().max(240),
    token: z.string().regex(/^[A-Za-z0-9_-]{43}$/).optional(),
    code: z.string().regex(/^[A-Z0-9]{8}$/).optional(),
  }).refine((value) => Number(Boolean(value.token)) + Number(Boolean(value.code)) === 1).safeParse(input);

  if (!parsed.success) {
    return { status: "error", code: "invalid_input", message: messages.invalid_input };
  }

  try {
    const result = await joinRoomWithInvite(parsed.data);
    revalidatePath("/rooms");
    if (result.outcome === "pending") {
      return { status: "pending", publicId: result.public_id };
    }
    revalidatePath(`/rooms/${result.public_id}`);
    return { status: "joined", publicId: result.public_id };
  } catch (error) {
    const code: JoinActionErrorCode =
      error instanceof RoomInviteError && error.code !== "host_required" && error.code !== "identity_required"
        ? error.code
        : error instanceof RoomInviteError && error.code === "identity_required"
          ? "authentication_required"
          : "unavailable";
    return { status: "error", code, message: messages[code] };
  }
}
