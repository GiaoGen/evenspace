"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { parseRoomPublicId } from "@/core/domain/ids";
import { SupabaseRoomReadRepository } from "@/data/supabase/supabase-room-read-repository";
import {
  BackendCommandError,
  createHostLedRoom,
} from "@/data/supabase/room-commands";
import {
  createRoomInvite,
  RoomInviteError,
} from "@/data/supabase/room-invites";

const createRoomActionSchema = z.object({
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500),
  durationMinutes: z.number().int().min(15).max(1440),
  memberLimit: z.number().int().min(2).max(10),
  timeZone: z.string().trim().min(1).max(64),
  idempotencyKey: z.uuid(),
  inviteToken: z.string().regex(/^[A-Za-z0-9_-]{43}$/),
  inviteCode: z.string().regex(/^[A-Z0-9]{8}$/),
  acceptedTerms: z.literal(true),
});

export type CreateRoomActionResult =
  | {
      readonly status: "created";
      readonly room: {
        readonly id: string;
        readonly publicId: string;
        readonly name: string;
        readonly startsAt: string;
        readonly endsAt: string;
        readonly inviteToken: string;
        readonly inviteCode: string;
        readonly inviteRevision: number;
      };
    }
  | {
      readonly status: "error";
      readonly code:
        | "invalid_input"
        | "authentication_required"
        | "identity_required"
        | "unavailable";
      readonly message: string;
    };

const safeErrors: Record<
  Extract<CreateRoomActionResult, { status: "error" }>["code"],
  string
> = {
  invalid_input: "Review the room details and try again.",
  authentication_required: "Log in again before creating this room.",
  identity_required: "Finish setting up your account before creating a room.",
  unavailable: "The room could not be created right now. Please try again.",
};

function failure(
  code: Extract<CreateRoomActionResult, { status: "error" }>["code"],
): CreateRoomActionResult {
  return { status: "error", code, message: safeErrors[code] };
}

export async function createRoomAction(
  input: unknown,
): Promise<CreateRoomActionResult> {
  const parsed = createRoomActionSchema.safeParse(input);
  if (!parsed.success) return failure("invalid_input");

  try {
    const command = await createHostLedRoom({
      name: parsed.data.name,
      description: parsed.data.description,
      timeZone: parsed.data.timeZone,
      durationMinutes: parsed.data.durationMinutes,
      memberLimit: parsed.data.memberLimit,
      requiresApproval: true,
      idempotencyKey: parsed.data.idempotencyKey,
    });
    const publicId = parseRoomPublicId(command.public_id);

    if (!publicId) return failure("unavailable");

    const repository = new SupabaseRoomReadRepository();
    const room = await repository.findCurrentViewerRoom(publicId);
    if (!room || room.id !== command.room_id) return failure("unavailable");
    const invite = await createRoomInvite({
      publicId,
      token: parsed.data.inviteToken,
      code: parsed.data.inviteCode,
    });
    if (invite.room_id !== room.id || invite.public_id !== publicId) {
      return failure("unavailable");
    }

    revalidatePath("/rooms");

    return {
      status: "created",
      room: {
        id: room.id,
        publicId: room.publicId,
        name: room.name,
        startsAt: room.startsAt,
        endsAt: room.endsAt,
        inviteToken: parsed.data.inviteToken,
        inviteCode: parsed.data.inviteCode,
        inviteRevision: invite.invite_revision,
      },
    };
  } catch (error) {
    if (error instanceof BackendCommandError) {
      if (error.code === "invalid_input") return failure("invalid_input");
      if (error.code === "authentication_required") {
        return failure("authentication_required");
      }
      if (error.code === "identity_bootstrap_required") {
        return failure("identity_required");
      }
    }
    if (error instanceof RoomInviteError) {
      if (error.code === "authentication_required") return failure("authentication_required");
      if (error.code === "invalid_input") return failure("invalid_input");
    }

    return failure("unavailable");
  }
}
